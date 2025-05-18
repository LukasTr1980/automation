// src/services/cloudCoverRecorder.ts
// -----------------------------------------------------------------------------
//  Holt alle 10 min den aktuellen Bewölkungsgrad per One-Call 3.0
//  und schreibt ihn als Measurement "clouds" in InfluxDB
// -----------------------------------------------------------------------------

import fetch from 'node-fetch';
import { writeToInflux } from '../clients/influxdb-client';
import { getOpenWeatherMapApiKey } from '../configs';
import logger from '../logger';

// ───────── Standort & Konstanten ──────────────────────────────────────────────
const LAT = Number(process.env.LAT);
const LON = Number(process.env.LON);
const MEAS_CL = 'openweather.clouds';          //  Mess-Name Influx

// ───────── Hauptfunktion (1 Aufruf = 1 Write) ────────────────────────────────
export async function recordCurrentCloudCover() {
    const key = await getOpenWeatherMapApiKey();
    const url =
        `https://api.openweathermap.org/data/3.0/onecall` +
        `?lat=${LAT}&lon=${LON}` +
        `&exclude=minutely,hourly,daily,alerts` +   //  nur "current"
        `&units=metric&appid=${key}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`OneCall HTTP ${res.status}`);

    const j = await res.json();
    const cloud = j.current?.clouds;
    if (!isFinite(cloud)) throw new Error('clouds-Feld fehlt in OneCall-Antwort');

    await writeToInflux('', cloud.toFixed(0), MEAS_CL);
    logger.info(`CloudCover ${cloud}% → Influx (${MEAS_CL})`);
    return cloud;
}
