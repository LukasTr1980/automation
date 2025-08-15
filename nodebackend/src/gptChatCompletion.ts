import { queryAllData } from "./clients/influxdb-client.js";
import type { WeatherData } from "./clients/influxdb-client.js";
import logger from "./logger.js";
import { getWeeklyIrrigationDepthMm } from "./utils/irrigationDepthService.js"; // <-- import service
import { readLatestJsonlNumber } from "./utils/localDataWriter.js";
import { getRainRateFromWeatherlink, getOutdoorTempAverageRange, getOutdoorHumidityAverageRange, getDailyRainTotal, getSevenDayRainTotal } from "./clients/weatherlink-client.js";

// ---------- FE-Interface -----------------------------------------------------
export interface CompletionResponse {
  result: boolean;          // = irrigationNeeded
  response: string;         // kurze Erklaerung inkl. confidence
  formattedEvaluation: string; // Bullet-Liste der geprueften Fakten
}

// ---------- Ausgabe huebsch formatiert --------------------------------------
const fmt = (n: number, d = 1) => n.toFixed(d);
const tick = (v: boolean) => (v ? "✓" : "✗");

type EnrichedWeatherData = WeatherData & { et0_week: number; irrigationDepthMm: number; rainRate: number; rainToday: number; rainSum: number; outTemp: number; humidity: number };

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
    `7-T-Regen ${fmt(d.rainSum)} mm`,
    `7-T-Bewaesserung ${fmt(d.irrigationDepthMm)} mm`,
    `ET0 7 T    ${fmt(d.et0_week)} mm`,
    `ET0-Defizit ${fmt(deficit)} mm`,
  ].join("\n");
}

// ---------- Hauptlogik -------------------------------------------------------
export async function createIrrigationDecision(): Promise<CompletionResponse> {
  // 1) Sensordaten & woechentliche Bewaesserung separat holen
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

  // 2) Typsicheres, unveraenderliches Objekt zusammenbauen
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

  // 3) einheitliche Defizit-Berechnung
  const effectiveForecast = d.rainNextDay * (d.rainProbNextDay / 100);
  // Integrate 7-day rainfall into current weekly water balance
  const effectiveRain = d.rainSum + effectiveForecast + d.irrigationDepthMm;
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

  // ---------- Rule-only decision (no AI) ------------------------------------
  const result: CompletionResponse = {
    result: true,
    response: `Kein Blocker aktiv; Defizit ${fmt(deficitNow)} mm – Bewässerung ein.`,
    formattedEvaluation: buildFormattedEvaluation(d, effectiveForecast, deficitNow)
  };

  // Transparenter Hinweis fuer Frontend-User
  result.response += ' - Forecast mit realer Wahrscheinlichkeit gewichtet';

  logger.debug(`DefizitNow mit Wahrscheinlichkeits-Forecast: ${fmt(deficitNow)}`);
  logger.info(`${result.result ? "ON" : "OFF"} | ${result.response}\n${result.formattedEvaluation}`);
  return result;
}
