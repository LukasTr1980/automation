// src/utils/cloudCoverRecorder.ts
// -----------------------------------------------------------------------------
//  Holt alle 5 min Bewölkungsgrad + 24-h-Regen­summe (One-Call 3.0)
//  Schreibt beides in InfluxDB.
// -----------------------------------------------------------------------------

import fetch from "node-fetch";
import { writeToInflux } from "../clients/influxdb-client";
import { getOpenWeatherMapApiKey } from "../configs";
import logger from "../logger";

// ───────── Standort & Konstanten ─────────────────────────────────────────────
const LAT = Number(process.env.LAT);
const LON = Number(process.env.LON);

const MEAS_CL = "openweather.clouds";
const MEAS_RAIN = "openweather.rain24h";     // neue Messung

// ───────── Hauptfunktion ────────────────────────────────────────────────────
export async function recordCurrentCloudCover() {
    const key = await getOpenWeatherMapApiKey();
    const url =
        `https://api.openweathermap.org/data/3.0/onecall` +
        `?lat=${LAT}&lon=${LON}` +
        `&exclude=minutely,daily,alerts` +          // wir brauchen current + hourly
        `&units=metric&appid=${key}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`OneCall HTTP ${res.status}`);

    const j = await res.json();

    // -------- clouds ----------------------------------------------------------
    const cloud = j.current?.clouds;
    if (!isFinite(cloud)) throw new Error("clouds-Feld fehlt in OneCall-Antwort");
    await writeToInflux("", cloud.toFixed(0), MEAS_CL);
    logger.info(`CloudCover ${cloud}% → Influx (${MEAS_CL})`);

    // -------- rain forecast (24 h) -------------------------------------------
    const rain24 = (j.hourly as any[])
        .slice(0, 24)                               // nächste 24 Stunden
        .reduce((sum, h) => sum + (h.rain?.["1h"] ?? 0), 0);

    await writeToInflux("", rain24.toFixed(2), MEAS_RAIN);
    logger.info(`Rain24h ${rain24.toFixed(2)} mm → Influx (${MEAS_RAIN})`);

    return { cloud, rain24 };
}
