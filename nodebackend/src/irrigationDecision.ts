import { queryAllData } from "./clients/influxdb-client.js";
import type { WeatherData } from "./clients/influxdb-client.js";
import logger from "./logger.js";
import { getWeeklyIrrigationDepthMm } from "./utils/irrigationDepthService.js";
import { readLatestWeeklyET0FromRedis } from "./utils/et0Storage.js";
import { readLatestWeatherFromRedis } from "./utils/weatherLatestStorage.js";
import { readWeatherAggregatesFromRedis } from "./utils/weatherAggregatesStorage.js";

// ---------- Frontend Contract (structured metrics) ---------------------------
export interface DecisionMetrics {
  outTemp: number;
  humidity: number;
  rainToday: number;
  rainRate: number;
  rainNextDay: number;
  rainProbNextDay: number;
  rainSum: number;
  irrigationDepthMm: number;
  et0_week: number;
  effectiveForecast: number;
  deficitNow: number;
  blockers: string[];
}

export interface CompletionResponse {
  result: boolean;             // irrigation decision (true = proceed)
  response: DecisionMetrics;   // structured values for the frontend
}

// ---------- Helpers ---------------------------------------------------------
const fmt = (n: number, d = 1) => n.toFixed(d);

type EnrichedWeatherData = WeatherData & { et0_week: number; irrigationDepthMm: number; rainRate: number; rainToday: number; rainSum: number; outTemp: number; humidity: number };

// ---------- Decision logic ---------------------------------------------------
export async function createIrrigationDecision(): Promise<CompletionResponse> {
  // 1) Gather current metrics plus weekly irrigation depth
  const weatherData = await queryAllData();
  // Override ET₀ with latest weekly value from Redis (source of truth)
  let et0WeeklyFromFile = 0;
  try {
    const latest = await readLatestWeeklyET0FromRedis(7);
    if (typeof latest === 'number' && isFinite(latest)) {
      et0WeeklyFromFile = latest;
      logger.info(`[ET0] Using weekly ET₀ from Redis: ${et0WeeklyFromFile.toFixed(2)} mm`);
    } else {
      logger.warn('[ET0] No valid weekly ET₀ in Redis; falling back to 0');
    }
  } catch (e) {
    logger.warn('[ET0] Failed to read weekly ET₀ from Redis; falling back to 0', e);
  }
  const zoneName = "lukasSued";
  const irrigationDepthMm = await getWeeklyIrrigationDepthMm(zoneName);
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
  let rainSum7 = 0;
  try {
    const agg = await readWeatherAggregatesFromRedis();
    if (agg) {
      if (typeof agg.rain24hMm === 'number') rainToday = agg.rain24hMm;
      if (typeof agg.rain7dMm === 'number') rainSum7 = agg.rain7dMm;
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
  const d: EnrichedWeatherData = {
    ...weatherData,
    et0_week: et0WeeklyFromFile,
    rainToday,
    rainSum: rainSum7,
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

  // 3) Unified deficit calculation (German-only values are in FE)
  const effectiveForecast = d.rainNextDay * (d.rainProbNextDay / 100);
  // Integrate 7-day rainfall into current weekly water balance
  const effectiveRain = d.rainSum + effectiveForecast + d.irrigationDepthMm;
  const deficitNow = d.et0_week - effectiveRain;

  /* ---------- Hard rules ----------------------------------------------------
   * If any rule matches, block irrigation (result=false).
   * -------------------------------------------------------------------------*/
  const blockers: string[] = [];

  if (d.outTemp <= 10) blockers.push(`7d avg temperature ≤ 10 °C (${fmt(d.outTemp)} °C)`);
  if (d.humidity >= 80) blockers.push(`7d avg humidity ≥ 80 % (${fmt(d.humidity)} %)`);
  if (d.rainToday >= 3) blockers.push(`Rain (24h) ≥ 3 mm (${fmt(d.rainToday)} mm)`);
  if (d.rainRate > 0) blockers.push(`Rain rate > 0 mm/h (${fmt(d.rainRate)} mm/h)`);

  logger.debug(`DeficitNow with probability-weighted forecast: ${fmt(deficitNow)} mm`);

  if (deficitNow < 5) blockers.push(`Deficit < 5 mm (${fmt(deficitNow)} mm)`);

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
        rainSum: d.rainSum,
        irrigationDepthMm: d.irrigationDepthMm,
        et0_week: d.et0_week,
        effectiveForecast,
        deficitNow,
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
      rainSum: d.rainSum,
      irrigationDepthMm: d.irrigationDepthMm,
      et0_week: d.et0_week,
      effectiveForecast,
      deficitNow,
      blockers,
    }
  };

  logger.debug(`DeficitNow with probability-weighted forecast: ${fmt(deficitNow)} mm`);
  logger.info(`${result.result ? "ON" : "OFF"} | Deficit ${fmt(deficitNow)} mm`);
  return result;
}
