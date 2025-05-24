// src/utils/cloudCoverRecorder.ts
// -----------------------------------------------------------------------------
//  Holt aktuelle Bewölkung (15‑min) + 24‑h‑Regen via DWD‑ICON‑D2 (Open‑Meteo)
//  und schreibt sie mit IPv4‑erzwingendem Agent + Retry‑Logik in InfluxDB.
// -----------------------------------------------------------------------------

import fetch, { RequestInit } from "node-fetch";
import https from "https";
import { writeToInflux } from "../clients/influxdb-client";
import logger from "../logger";

// ───────── Standort ─────────────────────────────────────────────────────────
const LAT = Number(process.env.LAT ?? 46.5668);
const LON = Number(process.env.LON ?? 11.5599);

// ───────── Influx‑Messungen ─────────────────────────────────────────────────
const MEAS_CL = "dwd.clouds";
const MEAS_RAIN = "dwd.rain24h";

// ───────── Helper: IPv4‑Agent & Retry‑Fetch ────────────────────────────────
const ipv4Agent = new https.Agent({ family: 4 });

async function fetchWithRetry(url: string, opts: RequestInit = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const r = await fetch(url, { ...opts, agent: ipv4Agent, timeout: 10_000 });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        } catch (e) {
            if (i === retries - 1) throw e;
            logger.warn(`Fetch failed (${e}). Retry ${i + 1}/${retries - 1}`);
            await new Promise(res => setTimeout(res, 1_500 * (i + 1)));
        }
    }
    throw new Error("Unreachable");
}

// ───────── Hauptfunktion ────────────────────────────────────────────────────
export async function recordCurrentCloudCover() {
    const url =
        `https://api.open-meteo.com/v1/dwd-icon` +
        `?latitude=${LAT}&longitude=${LON}` +
        `&minutely_15=cloud_cover&forecast_minutely_15=1` +
        `&hourly=precipitation&forecast_hours=24` +
        `&timezone=Europe%2FRome`;

    const j = await fetchWithRetry(url);

    // -------- clouds ----------------------------------------------------------
    const cloudArr = j.minutely_15?.cloud_cover as number[] | undefined;
    if (!cloudArr?.length) throw new Error("cloud_cover missing in response");
    // Erstes (einzige) Element ist der Wert für das aktuelle 15‑min‑Intervall
    const cloud = cloudArr[0]!;
    await writeToInflux("", cloud.toFixed(0), MEAS_CL);
    logger.info(`CloudCover ${cloud}% → Influx (${MEAS_CL})`);

    // -------- rain forecast (24 h) -------------------------------------------
    const rainArr = j.hourly?.precipitation as number[] | undefined;
    const rain24 = rainArr?.reduce((sum, v) => sum + v, 0) ?? 0;
    await writeToInflux("", rain24.toFixed(2), MEAS_RAIN);
    logger.info(`Rain24h ${rain24.toFixed(2)} mm → Influx (${MEAS_RAIN})`);

    return { cloud, rain24 };
}
