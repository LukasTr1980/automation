import { getOpenAI } from "./configs";
import { queryAllData } from "./clients/influxdb-client";
import type { WeatherData } from "./clients/influxdb-client";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// ---------- FE-Interface -----------------------------------------------------
export interface CompletionResponse {
  result: boolean;             // = irrigationNeeded
  response: string;            // kurze Erklärung inkl. confidence
  formattedEvaluation: string; // Bullet-Liste der geprüften Fakten
}

// ---------- LLM-Schema -------------------------------------------------------
interface LlmDecision {
  irrigationNeeded: boolean;
  confidence: number;      // 0–1
  reasoning: string;       // max. ~280 Zeichen
  recommended_mm: number;  // 0 falls irrigationNeeded=false
}

// ---------- Few-shot-Beispiele ----------------------------------------------
const EXAMPLES = [
  {
    metrics: {
      outTemp_avg7: 12,
      humidity_avg7: 55,
      rainSum7: 10,
      rainToday: 0,
      rainRate: 0,
      et0_week: 32,
      rainForecast24: 0,
      deficit_mm: 22
    },
    answer: {
      irrigationNeeded: true,
      confidence: 0.9,
      reasoning: "Defizit 22 mm, keine Regen­prognose.",
      recommended_mm: 20
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
      rainForecast24: 12,
      deficit_mm: -24
    },
    answer: {
      irrigationNeeded: false,
      confidence: 0.9,
      reasoning: "Boden gesättigt: Regen + Prognose decken ET₀ locker.",
      recommended_mm: 0
    }
  }
];

// ---------- Prompt-Builder ---------------------------------------------------
function buildSystemPrompt(): string {
  return `You are an agronomic irrigation advisor for a short‑cut lawn in South Tyrol.
Return ONLY valid JSON with this exact shape:
{ irrigationNeeded:boolean, confidence:number, reasoning:string, recommended_mm:number }
Input metrics:
- outTemp_avg7  (°C)
- humidity_avg7 (%)
- rainSum7      (mm, last 7 days)
- rainToday     (mm)
- rainRate      (mm/h)
- et0_week      (mm, last 7 days)
- rainForecast24 (mm, next 24 h)
- deficit_mm     (et0_week – rainSum7, mm)

Decision rules:
• If irrigationNeeded is false, recommended_mm MUST be 0.
• Otherwise recommended_mm = round(clamp(deficit_mm * 1.2, 0, 20)).`;
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

function buildFormattedEvaluation(d: WeatherData & { et0_week?: number }) {
  const deficit = d.et0_week != null ? d.et0_week - d.rainSum : undefined;
  return [
    `7-T-Temp    ${fmt(d.outTemp)} °C  > 10 °C?  ${tick(d.outTemp > 10)}`,
    `7-T-RH      ${fmt(d.humidity)} %   < 80 %?  ${tick(d.humidity < 80)}`,
    `7-T-Regen   ${fmt(d.rainSum)} mm < 25 mm?  ${tick(d.rainSum < 25)}`,
    `Regen heute ${fmt(d.rainToday)} mm < 3 mm?  ${tick(d.rainToday < 3)}`,
    `Regenrate   ${fmt(d.rainRate)} mm/h == 0?  ${tick(d.rainRate === 0)}`,
    `Fc 24 h     ${fmt(d.rainForecast24)} mm`,
    deficit != null && `ET₀-Defizit  ${fmt(deficit)} mm`
  ].filter(Boolean).join("\n");
}

// ---------- Hauptlogik -------------------------------------------------------
export async function createIrrigationDecision(): Promise<CompletionResponse> {
  // 1) aktuelle Daten holen
  const d = await queryAllData();   // enthält rainForecast24 & et0_week

  /* ---------- Hard‑Rules ----------------------------------------------------
   *  Wenn eine Regel zutrifft → Bewässerung blockieren (result=false).
   * -------------------------------------------------------------------------*/
  const blockers: string[] = [];

  const deficit = d.et0_week != null ? d.et0_week - d.rainSum : undefined;

  if (d.outTemp <= 10) blockers.push(`ØTemp 7 d ≤ 10 °C (${fmt(d.outTemp)} °C)`);
  if (d.humidity >= 80) blockers.push(`ØRH 7 d ≥ 80 % (${fmt(d.humidity)} %)`);
  if (d.rainSum >= 25) blockers.push(`Regen 7 d ≥ 25 mm (${fmt(d.rainSum)} mm)`);
  if (d.rainToday >= 3) blockers.push(`Regen heute ≥ 3 mm (${fmt(d.rainToday)} mm)`);
  if (d.rainRate > 0) blockers.push(`Aktuell Regen (${fmt(d.rainRate)} mm/h)`);
  if (d.rainForecast24 >= 5) blockers.push(`Regen­vorhersage 24 h ≥ 5 mm (${fmt(d.rainForecast24)} mm)`);
  if (deficit != null && deficit < 5)
    blockers.push(`Defizit < 5 mm (${fmt(deficit)} mm)`);

  if (blockers.length) {
    return {
      result: false,
      response: `Blockiert: ${blockers.join("; ")}`,
      formattedEvaluation: buildFormattedEvaluation(d)
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
    deficit_mm: deficit ?? 0
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
    // Bei Parse‑Fehler → Vorsichtshalber NICHT bewässern
    p = { irrigationNeeded: false, confidence: 0.25, reasoning: "LLM-Parse-Error", recommended_mm: 0 };
  }

  return {
    result: p.irrigationNeeded!,
    response:
      `${p.reasoning} (confidence ${(p.confidence! * 100).toFixed(0)} %, ` +
      `empfohlen ${p.recommended_mm} mm)`,
    formattedEvaluation: buildFormattedEvaluation(d)
  };
}
