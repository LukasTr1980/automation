import logger from "./logger.js";
import { readLatestWeatherFromRedis } from "./utils/weatherLatestStorage.js";
import { readWeatherAggregatesFromRedis } from "./utils/weatherAggregatesStorage.js";
import { ensureSoilBucket, getTawMm } from "./utils/soilBucket.js";
import { readLatestOdhRainForecast } from "./utils/odhRainRecorder.js";

// ---------- Frontend Contract (structured metrics) ---------------------------
export interface DecisionMetrics {
  outTemp: number;
  humidity: number;
  rainToday: number;
  rainRate: number;
  rainNextDay: number | null;
  rainProbNextDay: number | null;
  tawMm: number;                    // total available water (TAW)
  soilStorageMm?: number;           // current soil storage (S)
  depletionMm?: number;             // TAW - S
  triggerMm?: number;               // trigger threshold for depletion
  soilUpdatedAt?: string;           // last update timestamp for soil bucket
  effectiveForecast: number | null;
  blockers: string[];
}

export interface CompletionResponse {
  result: boolean;             // irrigation decision (true = proceed)
  response: DecisionMetrics;   // structured values for the frontend
}

// ---------- Helpers ---------------------------------------------------------
const fmt = (n: number, d = 1) => n.toFixed(d);

type DecisionContext = {
  rainNextDay: number | null;
  rainProbNextDay: number | null;
  rainRate: number;
  rainToday: number;
  outTemp: number;
  humidity: number;
};

// ---------- Decision logic ---------------------------------------------------
export async function createIrrigationDecision(): Promise<CompletionResponse> {
  // 1) Gather current metrics plus weekly irrigation depth
  const zoneName = "lukasSued";
  const odhForecast = await readLatestOdhRainForecast();
  if (!odhForecast) {
    logger.warn("[ODH] No next-day rain forecast found in QuestDB; returning null payload");
  }
  const rainNextDay = odhForecast?.rainTotalMm ?? null;
  const rainProbNextDay = odhForecast?.rainProbabilityMaxPct ?? null;
  // Read rain rate from Redis latest cache
  let rainRateWL = 0;
  let wlOk = false;
  try {
    const latest = await readLatestWeatherFromRedis();
    if (latest && typeof latest.rainRateMmPerHour === 'number') {
      rainRateWL = latest.rainRateMmPerHour;
      wlOk = true;
    }
  } catch {}

  // Rainfall now sourced exclusively from WeatherLink
  let rainToday = 0;
  try {
    const agg = await readWeatherAggregatesFromRedis();
    if (agg) {
      if (typeof agg.rain24hMm === 'number') rainToday = agg.rain24hMm;
    }
  } catch {}
  // No WeatherLink API calls here; rely on Redis values

  // Fetch 7-day outdoor temperature average from WeatherLink (daily mean over daily chunks)
  let outTemp7 = 0;
  let humidity7 = 0;
  try {
    const agg = await readWeatherAggregatesFromRedis();
    if (agg) {
      if (typeof agg.temp7dAvgC === 'number') outTemp7 = agg.temp7dAvgC;
      if (typeof agg.humidity7dAvgPct === 'number') humidity7 = agg.humidity7dAvgPct;
    }
  } catch {}
  // No WeatherLink API calls here; rely on Redis values

  // 2) Build typed, immutable data object
  const d: DecisionContext = {
    rainNextDay,
    rainProbNextDay,
    rainToday,
    outTemp: outTemp7,
    humidity: humidity7,
    rainRate: wlOk ? rainRateWL : 0,
  };

  if (wlOk) {
    logger.info(`[WEATHERLINK] rainRate OK: ${fmt(rainRateWL)} mm/h`);
  } else {
    logger.warn(`[WEATHERLINK] rainRate failed - using 0 mm/h as fallback`);
  }

  // 3) Unified deficit calculation (German-only values are in FE)
  const effectiveForecast =
    d.rainNextDay !== null && d.rainProbNextDay !== null
      ? d.rainNextDay * (d.rainProbNextDay / 100)
      : null;

  // Diagnostic weekly deficit removed; rely on soil-bucket depletion for decisions

  // 4) Soil bucket decision logic (preferred)
  const bucket = await ensureSoilBucket(zoneName);
  const tawMm = getTawMm() || bucket.tawMm;
  const depletion = Math.max(0, tawMm - bucket.sMm);
  const TRIGGER_MM = Number(process.env.IRR_BUCKET_TRIGGER_MM ?? NaN);
  const TRIGGER_FRAC = Number(process.env.IRR_BUCKET_TRIGGER_FRAC ?? 0.50);
  const triggerMm = Number.isFinite(TRIGGER_MM) ? TRIGGER_MM : (tawMm * TRIGGER_FRAC);

  /* ---------- Hard rules ----------------------------------------------------
   * If any rule matches, block irrigation (result=false).
   * -------------------------------------------------------------------------*/
  const blockers: string[] = [];

  if (d.outTemp <= 10) blockers.push(`7d avg temperature ≤ 10 °C (${fmt(d.outTemp)} °C)`);
  if (d.humidity >= 80) blockers.push(`7d avg humidity ≥ 80 % (${fmt(d.humidity)} %)`);
  if (d.rainToday >= 3) blockers.push(`Rain (24h) ≥ 3 mm (${fmt(d.rainToday)} mm)`);
  if (d.rainRate > 0) blockers.push(`Rain rate > 0 mm/h (${fmt(d.rainRate)} mm/h)`);

  // Soil bucket depletion is the sole water-balance blocker
  if (depletion < triggerMm) blockers.push(`Boden nicht trocken genug: Entzug < ${fmt(triggerMm)} mm (aktuell ${fmt(depletion)} mm)`);

  if (blockers.length) {
    const msg = `Blocked: ${blockers.join("; ")}`;
    logger.info(msg);
    return {
      result: false,
      response: {
        outTemp: d.outTemp,
        humidity: d.humidity,
        rainToday: d.rainToday,
        rainRate: d.rainRate,
        rainNextDay: d.rainNextDay,
        rainProbNextDay: d.rainProbNextDay,
        tawMm,
        soilStorageMm: bucket.sMm,
        depletionMm: depletion,
        triggerMm: triggerMm,
        effectiveForecast,
        soilUpdatedAt: bucket.updatedAt,
        blockers,
      }
    };
  }

  // ---------- Rule-only decision (no AI) ------------------------------------
  const result: CompletionResponse = {
    result: true,
    response: {
      outTemp: d.outTemp,
      humidity: d.humidity,
      rainToday: d.rainToday,
      rainRate: d.rainRate,
      rainNextDay: d.rainNextDay,
      rainProbNextDay: d.rainProbNextDay,
      tawMm,
      soilStorageMm: bucket.sMm,
      depletionMm: depletion,
      triggerMm: triggerMm,
      effectiveForecast,
      soilUpdatedAt: bucket.updatedAt,
      blockers,
    }
  };
  logger.info(`[IRRIGATION DECISION] Allowing irrigation for ${zoneName}: depletion ${fmt(depletion)} mm ≥ trigger ${fmt(triggerMm)} mm; no blockers`);
  return result;
}
