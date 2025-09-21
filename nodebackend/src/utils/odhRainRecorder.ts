// src/utils/odhRainRecorder.ts
// -----------------------------------------------------------------------------
//  Summiert die Regenmenge & max. Regen-Wahrscheinlichkeit für **morgen**
//  (lokal Europe/Rome) aus dem 3-h-Raster eines ODH-Forecasts
//  und persistiert beide Werte zentral in QuestDB.
//
//  ENV-Variablen
//    ODH_FORECAST_ID   z. B. “forecast_021019” (Kastelruth)
//    ODH_LANG          de | it | en …  (optional, default de)
// -----------------------------------------------------------------------------

import logger from "../logger.js";
import {
    insertRow as insertQuestDbRow,
    registerQuestDbTableSchema,
    execute,
} from "../clients/questdbClient.js";
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
const QUESTDB_TABLE_FORECASTS = "weather_odh_rain_forecasts";
const QUESTDB_SOURCE_LABEL = "odh_forecast";

registerQuestDbTableSchema(QUESTDB_TABLE_FORECASTS, () => `
    CREATE TABLE IF NOT EXISTS "${QUESTDB_TABLE_FORECASTS}" (
        observation_ts TIMESTAMP,
        forecast_date_ts TIMESTAMP,
        rain_total_mm DOUBLE,
        rain_probability_max_pct DOUBLE,
        forecast_id SYMBOL,
        language SYMBOL,
        data_source SYMBOL
    ) timestamp(observation_ts) PARTITION BY DAY
`);

// ───────── Helper: fetch mit IPv4 & Retry ───────────────────────────────────
async function fetchJsonRetry(
    url: string,
    opts: RequestInit = {},
    retries = 3
): Promise<any> {
    for (let i = 0; i < retries; i++) {
        try {
            const r = await fetch(url, { ...opts });
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
    const observationTimestamp = new Date();
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

    await insertQuestDbRow(QUESTDB_TABLE_FORECASTS, {
        observation_ts: observationTimestamp,
        forecast_date_ts: startRome,
        rain_total_mm: rainSum,
        rain_probability_max_pct: probMax,
        forecast_id: FC_ID,
        language: LANG,
        data_source: QUESTDB_SOURCE_LABEL,
    });

    const result = { date: tomorrowIso, rainSum, probMax };
    logger.info(`odhRecordNextDayRain → ${JSON.stringify(result)} (QuestDB)`);
    return result;
}

export interface OdhNextDayRainForecast {
    observationTs: string;
    forecastDateTs: string | null;
    rainTotalMm: number;
    rainProbabilityMaxPct: number;
}

export async function readLatestOdhRainForecast(): Promise<OdhNextDayRainForecast | null> {
    const query = `
        SELECT observation_ts, forecast_date_ts, rain_total_mm, rain_probability_max_pct
        FROM "${QUESTDB_TABLE_FORECASTS}"
        WHERE forecast_id = $1 AND language = $2
        ORDER BY observation_ts DESC
        LIMIT 1
    `;

    const result = await execute(query, [FC_ID, LANG]);
    if (!result.rowCount || !result.rows.length) {
        return null;
    }

    const row = result.rows[0] as Record<string, unknown>;

    const toIsoString = (value: unknown): string | null => {
        if (value instanceof Date) return value.toISOString();
        if (typeof value === "string" || typeof value === "number") {
            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
        }
        return null;
    };

    const toNumber = (value: unknown): number => {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string" && value.trim() !== "") {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
        }
        return 0;
    };

    return {
        observationTs: toIsoString(row.observation_ts) ?? new Date().toISOString(),
        forecastDateTs: toIsoString(row.forecast_date_ts),
        rainTotalMm: toNumber(row.rain_total_mm),
        rainProbabilityMaxPct: toNumber(row.rain_probability_max_pct),
    };
}
