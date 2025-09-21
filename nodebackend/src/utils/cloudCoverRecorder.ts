// src/utils/cloudCoverRecorder.ts
// -----------------------------------------------------------------------------
//  Holt aktuelle Bewölkung (15‑min) + 24‑h‑Regen via DWD‑ICON‑D2 (Open‑Meteo)
//  und persistiert sie mit IPv4‑erzwingendem Agent + Retry‑Logik in QuestDB.
// -----------------------------------------------------------------------------

import {
    insertRow as insertQuestDbRow,
    registerQuestDbTableSchema,
} from "../clients/questdbClient.js";
import logger from "../logger.js";

// ───────── Standort ─────────────────────────────────────────────────────────
const LAT = Number(process.env.LAT ?? 46.5668);
const LON = Number(process.env.LON ?? 11.5599);

// ───────── QuestDB‑Konstanten ───────────────────────────────────────────────
const QUESTDB_TABLE_OBSERVATIONS = "weather_dwd_icon_observations";
const QUESTDB_SOURCE_LABEL = "dwd_icon_d2";

registerQuestDbTableSchema(QUESTDB_TABLE_OBSERVATIONS, () => `
    CREATE TABLE IF NOT EXISTS "${QUESTDB_TABLE_OBSERVATIONS}" (
        observation_ts TIMESTAMP,
        latitude_deg DOUBLE,
        longitude_deg DOUBLE,
        cloud_cover_pct DOUBLE,
        rain_total_24h_mm DOUBLE,
        data_source SYMBOL
    ) timestamp(observation_ts) PARTITION BY DAY
`);

// ───────── Helper: IPv4‑Agent & Retry‑Fetch ────────────────────────────────
async function fetchWithRetry(url: string, opts: RequestInit = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const r = await fetch(url, { ...opts });
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
    const observationTimestamp = new Date();

    // -------- clouds ----------------------------------------------------------
    const cloudArr = j.minutely_15?.cloud_cover as number[] | undefined;
    if (!cloudArr?.length) throw new Error("cloud_cover missing in response");
    // Erstes (einzige) Element ist der Wert für das aktuelle 15‑min‑Intervall
    const cloud = cloudArr[0]!;
    // -------- rain forecast (24 h) -------------------------------------------
    const rainArr = j.hourly?.precipitation as number[] | undefined;
    const rain24 = rainArr?.reduce((sum, v) => sum + v, 0) ?? 0;

    await insertQuestDbRow(QUESTDB_TABLE_OBSERVATIONS, {
        observation_ts: observationTimestamp,
        latitude_deg: LAT,
        longitude_deg: LON,
        cloud_cover_pct: cloud,
        rain_total_24h_mm: rain24,
        data_source: QUESTDB_SOURCE_LABEL,
    });
    logger.info(
        `CloudCover ${cloud}% & Rain24h ${rain24.toFixed(2)} mm → QuestDB (${QUESTDB_TABLE_OBSERVATIONS})`
    );

    return { cloud, rain24 };
}
