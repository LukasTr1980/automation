// src/utils/evapotranspiration.ts
// -----------------------------------------------------------------------------
//  WEEKLY ET₀ (FAO‑56)
//  – Inputs: Tmin/Tmax/Tavg, RH, Wind, Pressure from WeatherLink (24h chunks)
//  – Cloud cover daily means from Influx (measurement "dwd.clouds")
//  – Computes daily ET₀ for last 7 full days and stores the sum in Redis
// -----------------------------------------------------------------------------

import { querySingleData } from "../clients/influxdb-client.js";
import { getOutdoorTempAverageRange, getOutdoorHumidityAverageRange, getOutdoorWindSpeedAverageRange, getOutdoorTempExtremaRange, getOutdoorPressureAverageRange } from "../clients/weatherlink-client.js";
import logger from "../logger.js";
import { writeWeeklyET0ToRedis } from "./et0Storage.js";

// ───────────── Standort & Konstanten ─────────────────────────────────────────
const LAT = Number(process.env.LAT ?? 46.5668);
const ELEV = Number(process.env.ELEV ?? 1060);    // m NN
const ALBEDO = Number(process.env.ALBEDO ?? 0.23);    // Gras‑Reflexion
const K_RS = Number(process.env.K_RS ?? 0.19);    // Hargreaves (Inland)

// Standard‑Buckets
const CLOUD_BUCKET = process.env.CLOUD_BUCKET ?? "automation"; // Wolken‑Recorder

// Measurements (clouds from Influx; temps, RH, wind, pressure from WeatherLink)
const MEAS_CLOUDS = "dwd.clouds";

// ───────────── FAO‑Hilfsfunktionen ──────────────────────────────────────────
const svp = (T: number) => 0.6108 * Math.exp((17.27 * T) / (T + 237.3));
const svpSlope = (T: number) => 4098 * svp(T) / Math.pow(T + 237.3, 2);
const psychro = (P: number) => 0.665e-3 * P;          // P [kPa]
const rad = (deg: number) => (deg * Math.PI) / 180;
function Ra(latDeg: number, doy: number) {
    const G = 0.0820, lat = rad(latDeg);
    const dr = 1 + 0.033 * Math.cos((2 * Math.PI * doy) / 365);
    const d = 0.409 * Math.sin((2 * Math.PI * doy) / 365 - 1.39);
    const ws = Math.acos(-Math.tan(lat) * Math.tan(d));
    return (24 * 60 / Math.PI) * G * dr *
        (ws * Math.sin(lat) * Math.sin(d) + Math.cos(lat) * Math.cos(d) * Math.sin(ws));
}

// ───────────── Flux‑Query‑Builder ───────────────────────────────────────────

const fluxDailySeriesLast7 = (bucket: string, m: string, field: string, fn: "min" | "max" | "mean") => `import "date"
import "timezone"
option location = timezone.location(name: "Europe/Rome")
stop = date.truncate(t: now(), unit: 1d)
start = date.sub(d: 7d, from: stop)
from(bucket: "${bucket}")
  |> range(start: start, stop: stop)
  |> filter(fn: (r) => r._measurement == "${m}")
  |> filter(fn: (r) => r._field == "${field}")
  |> aggregateWindow(every: 1d, fn: ${fn}, createEmpty: true)
  |> keep(columns: ["_time", "_value"])`;

// Sensor-Queries for weekly computation only

async function influxSeriesNumbers(flux: string): Promise<number[]> {
    const rows: any[] = await querySingleData(flux);
    return rows.map(r => parseFloat(r._value));
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// ───────────── Hauptfunktion ────────────────────────────────────────────────
// No daily ET0 computation anymore — weekly only

export async function computeWeeklyET0(): Promise<number> {
    try {
        const endDate = new Date();
        // Align to local midnight (today 00:00) to cover the previous 7 full days
        const localMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        const SEVEN_DAYS = 7 * 24 * 3600;

        const [tempAvgW, rhW, windAvgW, tempExtW, pAvgW, cloudsW] = await Promise.all([
            getOutdoorTempAverageRange({ end: localMidnight, windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, combineMode: 'dailyMean', units: 'metric' }),
            getOutdoorHumidityAverageRange({ end: localMidnight, windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, combineMode: 'dailyMean' }),
            getOutdoorWindSpeedAverageRange({ end: localMidnight, windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, combineMode: 'dailyMean', units: 'metric' }),
            getOutdoorTempExtremaRange({ end: localMidnight, windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, units: 'metric' }),
            getOutdoorPressureAverageRange({ end: localMidnight, windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, combineMode: 'sampleWeighted', units: 'metric' }),
            influxSeriesNumbers(fluxDailySeriesLast7(CLOUD_BUCKET, MEAS_CLOUDS, 'value_numeric', 'mean')),
        ] as const);

        const n = 7;
        const chunks = Array.from({ length: n }, (_, i) => i);

        if (!tempAvgW.ok || !rhW.ok || !windAvgW.ok || !tempExtW.ok || !pAvgW.ok) {
            throw new Error('Weekly ET0: Missing WeatherLink data');
        }

        const et0s: number[] = [];
        for (const i of chunks) {
            const Tavg = tempAvgW.chunks[i]?.avg;
            const RH = rhW.chunks[i]?.avg;
            const wind10 = windAvgW.chunks[i]?.avg; // m/s at 10 m
            const Tmin = tempExtW.chunks[i]?.loMin;
            const Tmax = tempExtW.chunks[i]?.hiMax;
            const P_hPa = pAvgW.chunks[i]?.avg;
            let cloud = cloudsW[i];

            if ([Tavg, RH, wind10, Tmin, Tmax, P_hPa].some(v => typeof v !== 'number' || !isFinite(v))) {
                throw new Error(`Weekly ET0: incomplete data for day index ${i}`);
            }

            cloud = clamp(cloud, 0, 100);

            // Day-of-year from the chunk start (approx)
            const startTs = tempAvgW.chunks[i].start;
            const d = new Date(startTs);
            const doy = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);

            const RaMJ = Ra(LAT, doy);
            let Rs = K_RS * Math.sqrt(Math.max(0.1, Tmax - Tmin)) * RaMJ;
            Rs *= 1 - 0.75 * Math.pow(cloud / 100, 3);
            const Rso = (0.75 + 2e-5 * ELEV) * RaMJ;
            let Rs_Rso = Rs / Rso;
            Rs_Rso = Math.min(Rs_Rso, 1.0);
            const Rns = (1 - ALBEDO) * Rs;
            const ea = svp(Tavg) * RH / 100;
            const es = (svp(Tmax) + svp(Tmin)) / 2;
            const emissivity = Math.max(0.34 - 0.14 * Math.sqrt(ea), 0.05);
            const cloudCorr = Math.max(1.35 * Rs_Rso - 0.35, 0.05);
            const Rnl = 4.903e-9 * ((Math.pow(Tmax + 273.15, 4) + Math.pow(Tmin + 273.15, 4)) / 2) * emissivity * cloudCorr;
            const Rn = Rns - Rnl;
            const Δ = svpSlope(Tavg);
            const γ = psychro(P_hPa / 10);
            const u2 = wind10 * 0.748;
            const et0 = (0.408 * Δ * Rn + γ * 900 / (Tavg + 273.15) * u2 * (es - ea)) / (Δ + γ * (1 + 0.34 * u2));
            et0s.push(Math.max(0, +et0.toFixed(2)));
        }

        const et0Sum = +et0s.reduce((a, b) => a + b, 0).toFixed(2);

        await writeWeeklyET0ToRedis(et0Sum);
        logger.info(`ET₀ weekly sum (last 7 days): ${et0Sum.toFixed(2)} mm`, { label: 'Evapotranspiration' });
        return et0Sum;
    } catch (err) {
        logger.error('Error computing weekly ET₀', err as Error, { label: 'Evapotranspiration' });
        throw err;
    }
}
