import { getOpenAI } from "./configs.js";
import { queryAllData } from "./clients/influxdb-client.js";
import type { WeatherData } from "./clients/influxdb-client.js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import logger from "./logger.js";
import { getWeeklyIrrigationDepthMm } from "./utils/irrigationDepthService.js"; // <-- import service
import { getRainRateFromWeatherlink, getOutdoorTempAverageRange, getOutdoorHumidityAverageRange } from "./clients/weatherlink-client.js";

// ---------- FE-Interface -----------------------------------------------------
export interface CompletionResponse {
  result: boolean;          // = irrigationNeeded
  response: string;         // kurze Erklaerung inkl. confidence
  formattedEvaluation: string; // Bullet-Liste der geprueften Fakten
}

// ---------- LLM-Schema -------------------------------------------------------
interface LlmDecision {
  irrigationNeeded: boolean;
  confidence: number;      // 0-1
  reasoning: string;       // max. ~280 Zeichen
  recommended_mm: number;  // 0 falls irrigationNeeded=false
}

// ---------- Few-shot-Beispiele (gekuerzt) -----------------------------------
const EXAMPLES = [
  {
    metrics: {
      outTemp_avg7: 12,
      humidity_avg7: 55,
      rainToday: 0,
      rainRate: 0,
      et0_week: 32,
      rainNextDay: 0,
      rainProbNextDay: 10,
      irrigationDepthMm: 0,
      deficit_mm: 24
    },
    answer: {
      irrigationNeeded: true,
      confidence: 0.83,
      reasoning: "Wasserdefizit ~24 mm, keine Regenprognose.",
      recommended_mm: 20
    }
  },
  {
    metrics: {
      outTemp_avg7: 8,
      humidity_avg7: 85,
      rainToday: 4,
      rainRate: 2,
      et0_week: 18,
      rainNextDay: 12,
      rainProbNextDay: 50,
      irrigationDepthMm: 0,
      deficit_mm: 6
    },
    answer: {
      irrigationNeeded: false,
      confidence: 0.9,
      reasoning: "Defizit 6 mm, 50% von Forecast 12 mm liefert 6 mm Regen -> Bedarf gedeckt.",
      recommended_mm: 0
    }
  }
];

// ---------- Prompt-Builder ---------------------------------------------------
function buildSystemPrompt(): string {
  return `
    You are an agronomic irrigation advisor for a short-cut lawn.

    Your job:
      - Decide whether irrigation is needed based primarily on "deficit_mm" (rule of thumb: > 5 mm => irrigation).
      - Provide a concise natural-language reasoning (<= 280 chars).
      - Suggest a reasonable "recommended_mm" to cover the deficit
        (typical range 15-20 mm). If no irrigation is needed set it to 0.

    Return ONLY valid JSON with this exact shape:
    { "irrigationNeeded": boolean,
      "confidence": number,
      "reasoning": string,
      "recommended_mm": number }
  `.trim();
}

function exampleMessages(): ChatCompletionMessageParam[] {
  return EXAMPLES.flatMap<ChatCompletionMessageParam>(ex => [
    { role: "user", content: JSON.stringify(ex.metrics) },
    { role: "assistant", content: JSON.stringify(ex.answer) }
  ]);
}

// ---------- Ausgabe huebsch formatiert --------------------------------------
const fmt = (n: number, d = 1) => n.toFixed(d);
const tick = (v: boolean) => (v ? "✓" : "✗");

type EnrichedWeatherData = WeatherData & { irrigationDepthMm: number; rainRate: number };

function buildFormattedEvaluation(
  d: EnrichedWeatherData,
  effectiveForecast: number,
  deficit: number
) {
  return [
    `7-T-Temp   ${fmt(d.outTemp)} °C  > 10 °C?  ${tick(d.outTemp > 10)}`,
    `7-T-RH     ${fmt(d.humidity)} %   < 80 %?  ${tick(d.humidity < 80)}`,
    `Regen heute ${fmt(d.rainToday)} mm < 3 mm?  ${tick(d.rainToday < 3)}`,
    `Regenrate  ${fmt(d.rainRate)} mm/h == 0?  ${tick(d.rainRate === 0)}`,
    `Fc morgen ${fmt(d.rainNextDay)} mm × ${fmt(d.rainProbNextDay)} % = ${fmt(effectiveForecast)} mm`,
    `7-T-Bewaesserung ${fmt(d.irrigationDepthMm)} mm`,
    `ET0 7 T    ${fmt(d.et0_week)} mm`,
    `ET0-Defizit ${fmt(deficit)} mm`,
  ].join("\n");
}

// ---------- Hauptlogik -------------------------------------------------------
export async function createIrrigationDecision(): Promise<CompletionResponse> {
  // 1) Sensordaten & woechentliche Bewaesserung separat holen
  const weatherData = await queryAllData();
  const zoneName = "lukasSued";
  const irrigationDepthMm = await getWeeklyIrrigationDepthMm(zoneName);
  const { rate: rainRateWL, ok: wlOk } = await getRainRateFromWeatherlink();

  // Fetch 7-day outdoor temperature average from WeatherLink (daily mean over daily chunks)
  const SEVEN_DAYS = 7 * 24 * 3600;
  let outTemp7 = weatherData.outTemp;
  let humidity7 = weatherData.humidity;
  try {
    const week = await getOutdoorTempAverageRange({
      windowSeconds: SEVEN_DAYS,
      chunkSeconds: 24 * 3600,
      combineMode: 'dailyMean',
      units: 'metric',
    });
    if (week.ok) {
      outTemp7 = week.avg;
      logger.info(`[WEATHERLINK] Using 7-day temp avg from WeatherLink: ${outTemp7.toFixed(2)} °C`);
    } else {
      logger.warn("[WEATHERLINK] 7-day temp avg not available; falling back to Influx value");
    }
  } catch (e) {
    logger.error("[WEATHERLINK] Error computing 7-day temp avg; falling back to Influx value", e);
  }

  // Fetch 7-day outdoor humidity average from WeatherLink
  try {
    const hWeek = await getOutdoorHumidityAverageRange({
      windowSeconds: SEVEN_DAYS,
      chunkSeconds: 24 * 3600,
      combineMode: 'dailyMean',
    });
    if (hWeek.ok) {
      humidity7 = hWeek.avg;
      logger.info(`[WEATHERLINK] Using 7-day humidity avg from WeatherLink: ${humidity7.toFixed(1)} %`);
    } else {
      logger.warn("[WEATHERLINK] 7-day humidity avg not available; falling back to Influx value");
    }
  } catch (e) {
    logger.error("[WEATHERLINK] Error computing 7-day humidity avg; falling back to Influx value", e);
  }

  // 2) Typsicheres, unveraenderliches Objekt zusammenbauen
  const d: EnrichedWeatherData = {
    ...weatherData,
    outTemp: outTemp7,
    humidity: humidity7,
    rainRate: wlOk ? rainRateWL : 0,
    irrigationDepthMm,
  }

  if (wlOk) {
    logger.info(`[WEATHERLINK] rainRate OK: ${fmt(rainRateWL)} mm/h`);
  } else {
    logger.warn(`[WEATHERLINK] rainRate failed - using 0 mm/h as fallback`);
  }

  // 3) einheitliche Defizit-Berechnung
  const effectiveForecast = d.rainNextDay * (d.rainProbNextDay / 100);
  const effectiveRain = effectiveForecast + d.irrigationDepthMm;
  const deficitNow = d.et0_week - effectiveRain;

  /* ---------- Hard-Rules ----------------------------------------------------
   *  Wenn eine Regel zutrifft -> Bewaesserung blockieren (result=false).
   * -------------------------------------------------------------------------*/
  const blockers: string[] = [];

  if (d.outTemp <= 10) blockers.push(`ØTemp 7 d <= 10 °C (${fmt(d.outTemp)} °C)`);
  if (d.humidity >= 80) blockers.push(`ØRH 7 d >= 80 % (${fmt(d.humidity)} %)`);
  if (d.rainToday >= 3) blockers.push(`Regen heute >= 3 mm (${fmt(d.rainToday)} mm)`);
  if (d.rainRate > 0) blockers.push(`Aktuell Regen (${fmt(d.rainRate)} mm/h)`);

  logger.debug(`DefizitNow mit Wahrscheinlichkeits-Forecast: ${fmt(deficitNow)}`);

  if (deficitNow < 5) blockers.push(`Defizit < 5 mm (${fmt(deficitNow)})`);

  if (blockers.length) {
    const msg = `Blockiert: ${blockers.join("; ")}`;
    logger.info(msg);
    return {
      result: false,
      response: msg,
      formattedEvaluation: buildFormattedEvaluation(d, effectiveForecast, deficitNow)
    };
  }

  /* ---------- KI-Entscheidung ---------------------------------------------*/
  const payload = {
    outTemp_avg7: d.outTemp,
    humidity_avg7: d.humidity,
    rainToday: d.rainToday,
    rainRate: d.rainRate,
    et0_week: d.et0_week ?? 0,
    rainNextDay: d.rainNextDay,
    rainProbNextDay: d.rainProbNextDay,
    irrigationDepthMm,
    deficit_mm: deficitNow
  };

  function ruleBasedFallback(deficit: number): LlmDecision {
    const irrigationNeeded = deficit >= 5;
    return {
      irrigationNeeded,
      confidence: 0.4,
      reasoning: irrigationNeeded
        ? "LLM nicht verfuegbar, Defizit >= 5 mm - Bewaesserung ein."
        : "LLM nicht verfuegbar, Defizit < 5 mm.",
      recommended_mm: irrigationNeeded
        ? Math.round(Math.min(deficit * 1.2, 20))
        : 0
    };
  }

  async function callOpenAIWithRetry(
    messages: ChatCompletionMessageParam[],
    tries = 3,
    delayMs = 2000
  ): Promise<string> {
    const openai = await getOpenAI();
    for (let i = 1; i <= tries; i++) {
      try {
        const resp = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
          response_format: { type: "json_object" },
          messages,
          temperature: 0.3,
          max_completion_tokens: 300,
        },
          { timeout: 15_000 }
        );
        return resp.choices[0]?.message?.content ?? "{}";
      } catch (err) {
        logger.warn(`ChatCompletion Try ${i}/${tries} failed: ${err}`);
        if (i === tries) throw err;
        await new Promise(r => setTimeout(r, delayMs * i));
      }
    }
    return "{}";
  }

  let raw: string;
  try {
    raw = await callOpenAIWithRetry(
      [
        { role: "system", content: buildSystemPrompt() },
        ...exampleMessages(),
        { role: "user", content: JSON.stringify(payload) }
      ]
    );
  } catch (err) {
    logger.error("OpenAI unreachable - using rule-based fallback", err);
    raw = JSON.stringify(ruleBasedFallback(deficitNow));
  }

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

  const normalizedConfidence = Math.max(0, Math.min(1, p.confidence! / (p.confidence! > 1 ? 100 : 1)));
  const recommendedClamped = Math.round(Math.max(0, Math.min(20, p.recommended_mm!)));
  const result: CompletionResponse = {
    result: p.irrigationNeeded!,
    response: `${p.reasoning} (confidence ${(normalizedConfidence * 100).toFixed(0)} %, empfohlen ${recommendedClamped} mm)`,
    formattedEvaluation: buildFormattedEvaluation(d, effectiveForecast, deficitNow)
  };

  /*----------- Override safety ---------------------------------
    * Wenn die LLM irrigationNeeded=false sagt, obwohl
    * - Defizit > 5 mm (nach 50 % Forecast-Gewichtung) und
    * - keine Hard-Blocker aktiv sind,
    * dann erzwingen wir eine Bewaesserung.
    * ---------------------------------------------------------*/
  if (!result.result && deficitNow >= 5 && blockers.length === 0) {
    result.result = true;
    result.response += ' - Override: Defizit > 5 mm, Bewaesserung eingeschaltet';
    logger.warn('LLM-Override: Defizit hoch, LLM antwortete false');
  }

  // Transparenter Hinweis fuer Frontend-User
  result.response += ' - Forecast mit realer Wahrscheinlichkeit gewichtet';

  logger.debug(`DefizitNow mit Wahrscheinlichkeits-Forecast: ${fmt(deficitNow)}`);
  logger.info(`${result.result ? "ON" : "OFF"} | ${result.response}\n${result.formattedEvaluation}`);
  return result;
}
