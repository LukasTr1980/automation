import { queryAllData } from "./clients/influxdb-client.js";
import type { WeatherData } from "./clients/influxdb-client.js";
import logger from "./logger.js";
import { getWeeklyIrrigationDepthMm } from "./utils/irrigationDepthService.js";
import { readLatestJsonlNumber } from "./utils/localDataWriter.js";
import { getRainRateFromWeatherlink, getOutdoorTempAverageRange, getOutdoorHumidityAverageRange, getDailyRainTotal, getSevenDayRainTotal } from "./clients/weatherlink-client.js";

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
  // Override ET₀ with latest weekly value from JSONL (file-based source of truth)
  let et0WeeklyFromFile = 0;
  try {
    const latest = await readLatestJsonlNumber('evapotranspiration_weekly', 'et0_week', 7);
    if (typeof latest === 'number' && isFinite(latest)) {
      et0WeeklyFromFile = latest;
      logger.info(`[ET0] Using weekly ET₀ from JSONL: ${et0WeeklyFromFile.toFixed(2)} mm`);
    } else {
      logger.warn('[ET0] No valid weekly ET₀ in JSONL; falling back to 0');
    }
  } catch (e) {
    logger.warn('[ET0] Failed to read weekly ET₀ from JSONL; falling back to 0', e);
  }
  const zoneName = "lukasSued";
  const irrigationDepthMm = await getWeeklyIrrigationDepthMm(zoneName);
  const { rate: rainRateWL, ok: wlOk } = await getRainRateFromWeatherlink();

  // Rainfall now sourced exclusively from WeatherLink
  let rainToday = 0;
  let rainSum7 = 0;
  try {
    const day = await getDailyRainTotal(new Date(), 'metric');
    if (day.ok) {
      rainToday = day.total;
      logger.info(`[WEATHERLINK] Using last 24h rain from WeatherLink: ${rainToday.toFixed(1)} mm`);
    }
  } catch (e) {
    logger.error("[WEATHERLINK] Error computing 24h rain; using 0 mm", e);
  }
  try {
    const week = await getSevenDayRainTotal(new Date(), 'metric');
    if (week.ok) {
      rainSum7 = week.total;
      logger.info(`[WEATHERLINK] Using 7-day rain total from WeatherLink: ${rainSum7.toFixed(1)} mm`);
    }
  } catch (e) {
    logger.error("[WEATHERLINK] Error computing 7-day rain; using 0 mm", e);
  }

  // Fetch 7-day outdoor temperature average from WeatherLink (daily mean over daily chunks)
  const SEVEN_DAYS = 7 * 24 * 3600;
  let outTemp7 = 0;
  let humidity7 = 0;
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
    }
  } catch (e) {
    logger.error("[WEATHERLINK] Error computing 7-day temp avg; using 0 °C", e);
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
    }
  } catch (e) {
    logger.error("[WEATHERLINK] Error computing 7-day humidity avg; using 0%", e);
  }

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
