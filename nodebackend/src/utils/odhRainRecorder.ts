// src/utils/odhRainRecorder.ts
// -----------------------------------------------------------------------------
//  Summiert die Regenmenge & max. Regen-Wahrscheinlichkeit für **morgen**
//  (lokal Europe/Rome) aus dem 3-h-Raster eines ODH-Forecasts
//  und schreibt beide Werte als separate Measurements in InfluxDB.
//
//  ENV-Variablen
//    ODH_FORECAST_ID   z. B. “forecast_021019” (Kastelruth)
//    ODH_LANG          de | it | en …  (optional, default de)
// -----------------------------------------------------------------------------

import fetch, { RequestInit } from "node-fetch";
import https from "https";
import { writeToInflux } from "../clients/influxdb-client.js";
import logger from "../logger.js";
import {
    addDays,
    formatISO,
    parseISO,
    startOfDay,
    endOfDay,
    isBefore
} from "date-fns";
import { toZonedTime } from "date-fns-tz";

// ───────── Config ───────────────────────────────────────────────────────────
const FC_ID = process.env.ODH_FORECAST_ID ?? "forecast_021019";
const LANG = process.env.ODH_LANG ?? "de";
const MEAS_RAIN = "odh.rainNextDay";
const MEAS_PROB = "odh.rainProbNextDay";

// ───────── Helper: fetch mit IPv4 & Retry ───────────────────────────────────
const ipv4 = new https.Agent({ family: 4 });

async function fetchJsonRetry(
    url: string,
    opts: RequestInit = {},
    retries = 3
): Promise<any> {
    for (let i = 0; i < retries; i++) {
        try {
            const r = await fetch(url, { ...opts, agent: ipv4, timeout: 10_000 });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        } catch (err) {
            if (i === retries - 1) throw err;
            logger.warn(`Fetch ${url} failed (${err}). Retry ${i + 1}/${retries - 1}`);
            await new Promise(res => setTimeout(res, 1_500 * (i + 1)));
        }
    }
    throw new Error("Unreachable");
}

// ───────── Hauptfunktion ────────────────────────────────────────────────────
export async function odhRecordNextDayRain() {
    const url = `https://tourism.api.opendatahub.com/v1/Weather/Forecast/${FC_ID}?language=${LANG}`;
    const data = await fetchJsonRetry(url);

    const slots: any[] = data.Forecast3HoursInterval;
    if (!Array.isArray(slots) || !slots.length) {
        throw new Error("3-h array missing in ODH payload");
    }

    // ---------- Zeitfenster: ganzer morgiger Tag in Europe/Rome --------------
    const tzRome = "Europe/Rome";
    const tomorrowRome = addDays(toZonedTime(new Date(), tzRome), 1);
    const tomorrowIso = formatISO(tomorrowRome, { representation: "date" });

    const startRome = startOfDay(tomorrowRome);   // 00:00 lokal
    const endRome = endOfDay(tomorrowRome);   // 23:59:59 lokal

    // ---------- Slots filtern & Kennwerte berechnen --------------------------
    const slotsTomorrow = slots.filter(s => {
        const t = parseISO(s.Date);               // API-Zeitstempel = UTC
        return !isBefore(t, startRome) && isBefore(t, endRome);
    });

    const rainSum = slotsTomorrow.reduce(
        (sum, s) => sum + Number(s.Precipitation ?? 0),
        0
    );

    const probMax = slotsTomorrow.reduce(
        (p, s) => Math.max(p, Number(s.PrecipitationProbability ?? 0)),
        0
    );

    // ---------- InfluxDB: zwei Measurements -----------------------------------
    await writeToInflux("", rainSum.toFixed(2), MEAS_RAIN);
    await writeToInflux("", probMax.toFixed(0), MEAS_PROB);

    const result = { date: tomorrowIso, rainSum, probMax };
    logger.info(`odhRecordNextDayRain → ${JSON.stringify(result)}`);
    return result;
}
