import { getOpenAI } from "./configs";
import { queryAllData } from "./clients/influxdb-client";
import type { WeatherData } from "./clients/influxdb-client";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import logger from "./logger";
import { getWeeklyIrrigationDepthMm } from "./utils/irrigationDepthService"; // <-- import service

// ---------- FE-Interface -----------------------------------------------------
export interface CompletionResponse {
  result: boolean;          // = irrigationNeeded
  response: string;         // kurze Erklärung inkl. confidence
  formattedEvaluation: string; // Bullet-Liste der geprüften Fakten
}

// ---------- LLM-Schema -------------------------------------------------------
interface LlmDecision {
  irrigationNeeded: boolean;
  confidence: number;      // 0–1
  reasoning: string;       // max. ~280 Zeichen
  recommended_mm: number;  // 0 falls irrigationNeeded=false
}

// ---------- Few-shot-Beispiele (gekürzt) -------------------------------------
const EXAMPLES = [
  {
    metrics: {
      outTemp_avg7: 12,
      humidity_avg7: 55,
      rainSum7: 8,
      rainToday: 0,
      rainRate: 0,
      et0_week: 32,
      rainForecast24: 0
    },
    answer: {
      irrigationNeeded: true,
      confidence: 0.83,
      reasoning: "Wasserdefizit ~24 mm (32 – 8), keine Regenprognose.",
      recommended_mm: 15
    }
  },
  {
    metrics: {
      outTemp_avg7: 8,
      humidity_avg7: 85,
      rainSum7: 42,
      rainToday: 4,
      rainRate: 2,
      et0_week: 18,
      rainForecast24: 12
    },
    answer: {
      irrigationNeeded: false,
      confidence: 0.9,
      reasoning: "Boden gesättigt: 42 mm + 6 mm (50% von 12mm Forecast) > 18 mm ET₀.",
      recommended_mm: 0
    }
  }
];

// ---------- Prompt-Builder ---------------------------------------------------
function buildSystemPrompt(): string {
  return `You are an agronomic irrigation advisor for a short-cut lawn.\n` +
    `Return ONLY valid JSON with this exact shape:\n` +
    `{ irrigationNeeded:boolean, confidence:number, reasoning:string, recommended_mm:number }\n` +
    `recommended_mm = 0 if irrigationNeeded is false, else round(clamp(deficit_mm*1.2,0,20)).\n` +
    `deficit_mm = et0_week - (rainSum7 + 0.5*rainForecast24 + irrigationDepthMm)`; // include irrigation
}

function exampleMessages(): ChatCompletionMessageParam[] {
  return EXAMPLES.flatMap<ChatCompletionMessageParam>(ex => [
    { role: "user", content: JSON.stringify(ex.metrics) },
    { role: "assistant", content: JSON.stringify(ex.answer) }
  ]);
}

// ---------- Ausgabe hübsch formatiert ---------------------------------------
const fmt = (n: number, d = 1) => n.toFixed(d);
const tick = (v: boolean) => (v ? "✓" : "✗");

function buildFormattedEvaluation(d: WeatherData & { irrigationDepthMm: number }) {
  const effectiveForecast = d.rainForecast24 * 0.5;
  const effectiveRain = d.rainSum + effectiveForecast + d.irrigationDepthMm;
  const deficit = d.et0_week != null ? d.et0_week - effectiveRain : undefined;
  return [
    `7-T-Temp   ${fmt(d.outTemp)} °C  > 10 °C?  ${tick(d.outTemp > 10)}`,
    `7-T-RH     ${fmt(d.humidity)} %   < 80 %?  ${tick(d.humidity < 80)}`,
    `7-T-Regen  ${fmt(d.rainSum)} mm`,
    `Regen heute ${fmt(d.rainToday)} mm < 3 mm?  ${tick(d.rainToday < 3)}`,
    `Regenrate  ${fmt(d.rainRate)} mm/h == 0?  ${tick(d.rainRate === 0)}`,
    `Fc 24 h    ${fmt(effectiveForecast)} mm (50% gewichtet)`,
    `7-T-Bewässerung ${fmt(d.irrigationDepthMm)} mm`,
    `ET₀ 7 T    ${fmt(d.et0_week)} mm`,
    deficit != null && `ET₀-Defizit ${fmt(deficit)} mm`
  ].filter(Boolean).join("\n");
}

// ---------- Hauptlogik -------------------------------------------------------
export async function createIrrigationDecision(): Promise<CompletionResponse> {
  // 1) aktuelle Daten holen
  const d = await queryAllData();

  // 2) Bewässerungstiefe berechnen
  const zoneName = "lukasSued";
  const irrigationDepthMm = await getWeeklyIrrigationDepthMm(zoneName);
  (d as any).irrigationDepthMm = irrigationDepthMm;

  /* ---------- Hard-Rules ----------------------------------------------------
   *  Wenn eine Regel zutrifft → Bewässerung blockieren (result=false).
   * -------------------------------------------------------------------------*/
  const blockers: string[] = [];

  if (d.outTemp <= 10) blockers.push(`ØTemp 7 d ≤ 10 °C (${fmt(d.outTemp)} °C)`);
  if (d.humidity >= 80) blockers.push(`ØRH 7 d ≥ 80 % (${fmt(d.humidity)} %)`);
  // Removed blocker for 7-day rain sum >= 25 mm
  if (d.rainToday >= 3) blockers.push(`Regen heute ≥ 3 mm (${fmt(d.rainToday)} mm)`);
  if (d.rainRate > 0) blockers.push(`Aktuell Regen (${fmt(d.rainRate)} mm/h)`);
  if (d.rainForecast24 >= 5) blockers.push(`Regen­vorhersage 24 h ≥ 5 mm (${fmt(d.rainForecast24)} mm)`);

  // Forecast nur noch zu 50 % gewichten
  const effectiveForecast = d.rainForecast24 * 0.5;
  const effectiveRain = d.rainSum + effectiveForecast + irrigationDepthMm;
  const deficitNow = d.et0_week - effectiveRain;

  logger.debug(`DefizitNow nach 50%-Forecast: ${fmt(deficitNow)}`);

  if (deficitNow < 5) blockers.push(`Defizit < 5 mm (${fmt(deficitNow)})`);

  if (blockers.length) {
    const msg = `Blockiert: ${blockers.join("; ")}`;
    logger.info(msg);
    return {
      result: false,
      response: msg,
      formattedEvaluation: buildFormattedEvaluation(d as any)
    };
  }

  /* ---------- KI-Entscheidung ---------------------------------------------*/
  const payload = {
    outTemp_avg7: d.outTemp,
    humidity_avg7: d.humidity,
    rainSum7: d.rainSum,
    rainToday: d.rainToday,
    rainRate: d.rainRate,
    et0_week: d.et0_week ?? 0,
    rainForecast24: d.rainForecast24,
    irrigationDepthMm
  };

  const openai = await getOpenAI();
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt() },
    ...exampleMessages(),
    { role: "user", content: JSON.stringify(payload) }
  ];

  const raw = (await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages,
    temperature: 0.3,
    max_tokens: 300
  })).choices[0]?.message?.content ?? "{}";

  let p: Partial<LlmDecision>;
  try { p = JSON.parse(raw); } catch { p = {}; }

  const valid =
    typeof p.irrigationNeeded === "boolean" &&
    typeof p.confidence === "number" &&
    typeof p.reasoning === "string" &&
    typeof p.recommended_mm === "number";

  if (!valid) {
    p = { irrigationNeeded: false, confidence: 0.25, reasoning: "LLM-Parse-Error", recommended_mm: 0 };
  }

  const result = {
    result: p.irrigationNeeded!,
    response: `${p.reasoning} (confidence ${(p.confidence! * 100).toFixed(0)} %, ` +
      `empfohlen ${p.recommended_mm} mm)`,
    formattedEvaluation: buildFormattedEvaluation(d as any)
  } satisfies CompletionResponse;

  /*----------- Override safety ---------------------------------
    * Wenn die LLM irrigationNeeded=false sagt, obwohl
    * - Defizit > 5 mm (nach 50 % Forecast-Gewichtung) und
    * - keine Hard-Blocker aktiv sind,
    * dann erzwingen wir eine Bewässerung.
    * ---------------------------------------------------------*/
  if (!result.result && deficitNow >= 5 && blockers.length === 0) {
    result.result = true;
    result.response += ' - Override: Defizit > 5 mm, Bewässerung eingeschaltet';
    logger.warn('LLM-Override: Defizit hoch, LLM antwortete false');
  }

  // Transparenter Hinweis für Frontend-User
  result.response += ' - Forecast nur zu 50% gewichtet';

  logger.debug('Rain Forecast only 50% weighted due to high uncertainty');
  logger.info(`${result.result ? "ON" : "OFF"} | ${result.response}\n${result.formattedEvaluation}`);
  return result;
}
