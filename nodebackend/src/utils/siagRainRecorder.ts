// src/utils/siagRainRecorder.ts
// -----------------------------------------------------------------------------
//  Holt die Regen-Vorhersage für den *nächsten* Tag aus dem SIAG-District-API
//  und speichert die aufsummierte Menge (mm) in InfluxDB.
//  API-Doku:  GET https://weather.services.siag.it/api/v2/district/{id}/bulletin
//  Felder: rainTimespan1-4 (mm je Tagesviertel)               :contentReference[oaicite:0]{index=0}
//
//  Default-District 7 = Ladinien-Dolomiten; über ENV anpassbar.
// -----------------------------------------------------------------------------

import fetch, { RequestInit } from "node-fetch";
import https from "https";
import { writeToInflux } from "../clients/influxdb-client";
import logger from "../logger";

// ───────── Standort / District ───────────────────────────────────────────────
const DISTRICT_ID = Number(process.env.SIAG_DISTRICT ?? 7);

// ───────── Influx-Messung ────────────────────────────────────────────────────
const MEAS_RAIN_NEXTDAY = "siag.rainNextDay";

// ───────── Helper: IPv4-Agent & Retry-Fetch ─────────────────────────────────
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
import { toZonedTime } from "date-fns-tz";
import { addDays, formatISO } from "date-fns";

export async function siagRecordNextDayRain() {
    const url = `https://weather.services.siag.it/api/v2/district/${DISTRICT_ID}/bulletin`;
    const j = await fetchWithRetry(url);

    const fc = j.forecasts as any[];
    if (!Array.isArray(fc) || !fc.length) throw new Error('forecast array missing');

    // ---------- Morgen in Europe/Rome ----------------------------------------
    const tomorrowIso = formatISO(
        addDays(toZonedTime(new Date(), 'Europe/Rome'), 1),
        { representation: 'date' }
    );

    const next = fc.find(d => d.date?.startsWith(tomorrowIso));
    if (!next) throw new Error('Tomorrow not found in forecast');

    // ---------- Regen summieren ----------------------------------------------
    const rainSum =
        (next.rainTimespan1 ?? 0) +
        (next.rainTimespan2 ?? 0) +
        (next.rainTimespan3 ?? 0) +
        (next.rainTimespan4 ?? 0);

    await writeToInflux('', rainSum.toFixed(2), MEAS_RAIN_NEXTDAY);

    const result = {
        date: next.date,
        rainSum,
        rainFrom: next.rainFrom,
        rainTo: next.rainTo,
        storms: next.storms,
        reliability: next.reliability,
    };

    logger.info(`siagRecordNextDayRain → ${JSON.stringify(result)}`);
    return result;
}
