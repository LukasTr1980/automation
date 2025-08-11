// src/services/evapotranspiration.ts
// -----------------------------------------------------------------------------
//  DAILY ET₀  (FAO‑56)
//  – Sensorwerte   (Tmin/Tmax/Tavg, RH, Wind, Pressure)   aus Bucket "iobroker"
//  – Tages‑Ø‑Bewölkung (cloud cover)                      aus Bucket "automation"
//      (Wolken‑Recorder schreibt unter _field="value_numeric")
//  – Ergebnis → Influx‑Write (Measurement "et0") + Logging
//
//  ✱ 2025‑05‑19 – Physik‑Fixes:
//    • Luftdruck hPa → kPa in γ
//    • Rso‑Klammerung korrigiert, Rs/Rso ≤ 1 geclippt
//    • Rnl‑Term auf FAO‑56 gebracht (+ optionale Clips)
// -----------------------------------------------------------------------------

import { querySingleData, writeToInflux } from "../clients/influxdb-client.js";
import { getDailyOutdoorTempAverage, getDailyOutdoorHumidityAverage, getDailyOutdoorWindSpeedAverage, getDailyOutdoorTempExtrema, getDailyOutdoorPressureAverage } from "../clients/weatherlink-client.js";
import logger from "../logger.js";
import { isDev } from "../envSwitcher.js";

// ───────────── Standort & Konstanten ─────────────────────────────────────────
const LAT = Number(process.env.LAT ?? 46.5668);
const ELEV = Number(process.env.ELEV ?? 1060);    // m NN
const ALBEDO = Number(process.env.ALBEDO ?? 0.23);    // Gras‑Reflexion
const K_RS = Number(process.env.K_RS ?? 0.19);    // Hargreaves (Inland)

// Standard‑Buckets
const BUCKET = process.env.BUCKET ?? "iobroker";   // Sensoren
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
const fluxDaily = (bucket: string, m: string, fn: "min" | "max" | "mean") => `import "timezone"
option location = timezone.location(name: "Europe/Rome")
from(bucket:"${bucket}")
  |> range(start: today())
  |> filter(fn: (r) => r._measurement == "${m}")
  |> filter(fn: (r) => r._field == "value")
  |> aggregateWindow(every: 1d, fn: ${fn})
  |> last()`;

const fluxDailyField = (bucket: string, m: string, field: string, fn: "min" | "max" | "mean") => `import "timezone"
option location = timezone.location(name: "Europe/Rome")
from(bucket: "${bucket}")
  |> range(start: today())
  |> filter(fn: (r) => r._measurement == "${m}")
  |> filter(fn: (r) => r._field == "${field}")
  |> aggregateWindow(every: 1d, fn: ${fn})
  |> last()`;

// Sensor‑Queries
// Tmin/Tmax, Tavg, RH, Wind, Pressure are sourced from WeatherLink helpers, not Influx
// Wolken
const qCloud = fluxDailyField(CLOUD_BUCKET, MEAS_CLOUDS, "value_numeric", "mean");

async function influxNumber(flux: string): Promise<number> {
    const rows: any[] = await querySingleData(flux);
    return rows.length ? parseFloat(rows[0]._value) : NaN;
}

// ───────────── Hauptfunktion ────────────────────────────────────────────────
export async function computeTodayET0() {
    try {
        const [pAvgRes, cloud, tempAvgRes, rhAvgRes, windAvgRes, tempExtRes] = await Promise.all([
            getDailyOutdoorPressureAverage(),
            influxNumber(qCloud),
            getDailyOutdoorTempAverage(),
            getDailyOutdoorHumidityAverage(),
            getDailyOutdoorWindSpeedAverage(),
            getDailyOutdoorTempExtrema(),
        ] as const);

        const P_hPa = pAvgRes.ok ? pAvgRes.avg : NaN;
        const Tmin = tempExtRes.ok ? tempExtRes.tLo : NaN;
        const Tmax = tempExtRes.ok ? tempExtRes.tHi : NaN;
        const Tavg = tempAvgRes.ok ? tempAvgRes.avg : NaN;
        const RH = rhAvgRes.ok ? rhAvgRes.avg : NaN;
        const wind10 = windAvgRes.ok ? windAvgRes.avg : NaN; // m/s

        logger.debug(`Inputs – Tmin:${Tmin}°C Tmax:${Tmax}°C Tavg:${Tavg}°C RH:${RH}% Wind10:${wind10}m/s P:${P_hPa}hPa CloudØ:${cloud}%`);

        if (!isFinite(cloud)) {
            logger.warn("Noch kein Cloud‑Datensatz heute – ET₀ wird in 15 min erneut versucht");
            setTimeout(computeTodayET0, 5 * 60 * 1000);
            return;
        }
        if ([Tmin, Tmax, Tavg, RH, wind10, P_hPa].some(v => !isFinite(v))) {
            throw new Error("Unvollständige Sensordaten – ET₀‑Sprung übersprungen");
        }

        // Datum / Astronomie
        const doy = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000);
        const RaMJ = Ra(LAT, doy);

        // Kurzwellige Strahlung (Hargreaves + Wolkenfaktor)
        let Rs = K_RS * Math.sqrt(Math.max(0.1, Tmax - Tmin)) * RaMJ;
        Rs *= 1 - 0.75 * Math.pow(cloud / 100, 3); // projektspezifische Wolkenkorrektur

        // Klarhimmel‑Strahlung & Rs/Rso‑Clip
        const Rso = (0.75 + 2e-5 * ELEV) * RaMJ;
        let Rs_Rso = Rs / Rso;
        Rs_Rso = Math.min(Rs_Rso, 1.0);

        // Netto‑Kurz‑/Langwelle
        const Rns = (1 - ALBEDO) * Rs;
        const ea = svp(Tavg) * RH / 100;
        const emissivity = Math.max(0.34 - 0.14 * Math.sqrt(ea), 0.05);
        const cloudCorr = Math.max(1.35 * Rs_Rso - 0.35, 0.05);
        const Rnl = 4.903e-9 * ((Math.pow(Tmax + 273.16, 4) + Math.pow(Tmin + 273.16, 4)) / 2) * emissivity * cloudCorr;
        const Rn = Rns - Rnl;

        // ET₀ (Penman‑Monteith)
        const Δ = svpSlope(Tavg);
        const γ = psychro(P_hPa / 10);              // hPa → kPa
        const u2 = wind10 * 0.748;                  // 10 m → 2 m

        const et0 = (0.408 * Δ * Rn + γ * 900 / (Tavg + 273.15) * u2 * (svp(Tavg) - ea)) /
            (Δ + γ * (1 + 0.34 * u2));

        if (!isDev) {
            // ET₀ nur in Produktion in InfluxDB schreiben
            await writeToInflux("", et0.toFixed(2), "et0");   // (measurement, value, field)
            logger.info(`ET₀: ${et0.toFixed(2)} mm | Rs:${Rs.toFixed(2)} MJ | ØCloud:${cloud}% | P:${P_hPa} hPa`);
        } else {
            // Debug‑Log in Dev
            logger.debug(`ET₀: ${et0.toFixed(2)} mm | Rs:${Rs.toFixed(2)} MJ | ØCloud:${cloud}% | P:${P_hPa} hPa`);
        }
        return +et0.toFixed(2);

    } catch (err) {
        logger.error("Error computing ET₀", err as Error);
        throw err;
    }
}

// Scheduler‑Beispiel (täglich um 23:55)
// schedule.scheduleJob("55 23 * * *", computeTodayET0);
