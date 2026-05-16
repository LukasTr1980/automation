// src/utils/odhRainRecorder.ts
// -----------------------------------------------------------------------------
//  Summarizes rain amount and maximum rain probability for today remaining
//  and tomorrow (local Europe/Rome) from the 3-hour ODH forecast grid and
//  persists the values centrally in QuestDB.
//
//  Environment variables
//    ODH_FORECAST_ID   e.g. "forecast_021019" (Kastelruth)
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

interface OdhForecastSlot {
    Date?: unknown;
    Precipitation?: unknown;
    PrecipitationProbability?: unknown;
}

interface OdhForecastResponse {
    Forecast3HoursInterval?: OdhForecastSlot[];
}

type ForecastWindow = {
    key: "today" | "tomorrow";
    dateIso: string;
    start: Date;
    end: Date;
    forecastDateTs: Date;
};

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

// ───────── Helper: fetch with retry ─────────────────────────────────────────
async function fetchJsonRetry(
    url: string,
    opts: RequestInit = {},
    retries = 3
): Promise<unknown> {
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

// ───────── Main recorder ────────────────────────────────────────────────────
export async function odhRecordNextDayRain() {
    const observationTimestamp = new Date();
    const url = `https://tourism.api.opendatahub.com/v1/Weather/Forecast/${FC_ID}?language=${LANG}`;
    const data = await fetchJsonRetry(url) as OdhForecastResponse;

    const slots = Array.isArray(data.Forecast3HoursInterval) ? data.Forecast3HoursInterval : [];
    if (!Array.isArray(slots) || !slots.length) {
        throw new Error("3-h array missing in ODH payload");
    }

    // ---------- Forecast windows: today from now, and all of tomorrow -------
    const tzRome = "Europe/Rome";
    const now = new Date();
    const todayRome = toZonedTime(now, tzRome);
    const tomorrowRome = addDays(todayRome, 1);
    const todayIso = formatISO(todayRome, { representation: "date" });
    const tomorrowIso = formatISO(tomorrowRome, { representation: "date" });

    const forecastWindows: ForecastWindow[] = [
        {
            key: "today",
            dateIso: todayIso,
            start: now,
            end: endOfDay(todayRome),
            forecastDateTs: startOfDay(todayRome),
        },
        {
            key: "tomorrow",
            dateIso: tomorrowIso,
            start: startOfDay(tomorrowRome),
            end: endOfDay(tomorrowRome),
            forecastDateTs: startOfDay(tomorrowRome),
        },
    ];

    // ---------- Filter slots and calculate metrics --------------------------
    const summaries = await Promise.all(forecastWindows.map(async (window) => {
        const windowSlots = slots.filter(s => {
            if (typeof s.Date !== "string") return false;
            const t = parseISO(s.Date);               // API timestamp is UTC
            return !isBefore(t, window.start) && isBefore(t, window.end);
        });

        const rainSum = windowSlots.reduce(
            (sum, s) => sum + Number(s.Precipitation ?? 0),
            0
        );

        const probMax = windowSlots.reduce(
            (p, s) => Math.max(p, Number(s.PrecipitationProbability ?? 0)),
            0
        );

        await insertQuestDbRow(QUESTDB_TABLE_FORECASTS, {
            observation_ts: observationTimestamp,
            forecast_date_ts: window.forecastDateTs,
            rain_total_mm: rainSum,
            rain_probability_max_pct: probMax,
            forecast_id: FC_ID,
            language: LANG,
            data_source: QUESTDB_SOURCE_LABEL,
        });

        return { key: window.key, date: window.dateIso, rainSum, probMax };
    }));

    const today = summaries.find(s => s.key === "today");
    const tomorrow = summaries.find(s => s.key === "tomorrow");
    const result = {
        date: tomorrow?.date ?? tomorrowIso,
        rainSum: tomorrow?.rainSum ?? 0,
        probMax: tomorrow?.probMax ?? 0,
        today: {
            date: today?.date ?? todayIso,
            rainSum: today?.rainSum ?? 0,
            probMax: today?.probMax ?? 0,
        },
        tomorrow: {
            date: tomorrow?.date ?? tomorrowIso,
            rainSum: tomorrow?.rainSum ?? 0,
            probMax: tomorrow?.probMax ?? 0,
        },
    };
    logger.info(`odhRecordNextDayRain → ${JSON.stringify(result)} (QuestDB)`);
    return result;
}

export interface OdhNextDayRainForecast {
    observationTs: string;
    forecastDateTs: string | null;
    rainTotalMm: number;
    rainProbabilityMaxPct: number;
}

export interface OdhRainForecastPair {
    today: OdhNextDayRainForecast | null;
    tomorrow: OdhNextDayRainForecast | null;
}

function localDateKey(value: Date, timeZone = "Europe/Rome"): string {
    return formatISO(toZonedTime(value, timeZone), { representation: "date" });
}

function toIsoString(value: unknown): string | null {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "string" || typeof value === "number") {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
    return null;
}

function toNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
}

function rowToForecast(row: Record<string, unknown>): OdhNextDayRainForecast {
    return {
        observationTs: toIsoString(row.observation_ts) ?? new Date().toISOString(),
        forecastDateTs: toIsoString(row.forecast_date_ts),
        rainTotalMm: toNumber(row.rain_total_mm),
        rainProbabilityMaxPct: toNumber(row.rain_probability_max_pct),
    };
}

export async function readLatestOdhRainForecasts(): Promise<OdhRainForecastPair> {
    const query = `
        SELECT observation_ts, forecast_date_ts, rain_total_mm, rain_probability_max_pct
        FROM "${QUESTDB_TABLE_FORECASTS}"
        WHERE forecast_id = $1 AND language = $2
        ORDER BY observation_ts DESC
        LIMIT 48
    `;

    let result;
    try {
        result = await execute(query, [FC_ID, LANG]);
    } catch (error) {
        if (error instanceof Error && error.message.includes('table does not exist')) {
            logger.info('QuestDB table weather_odh_rain_forecasts missing; returning empty forecast payload');
            return { today: null, tomorrow: null };
        }
        throw error;
    }
    if (!result.rowCount || !result.rows.length) {
        return { today: null, tomorrow: null };
    }

    const now = new Date();
    const todayKey = localDateKey(now);
    const tomorrowKey = localDateKey(addDays(toZonedTime(now, "Europe/Rome"), 1));
    const forecasts: OdhRainForecastPair = { today: null, tomorrow: null };

    for (const row of result.rows as Record<string, unknown>[]) {
        const forecastDateTs = toIsoString(row.forecast_date_ts);
        if (!forecastDateTs) continue;

        const rowDateKey = localDateKey(new Date(forecastDateTs));
        if (!forecasts.today && rowDateKey === todayKey) {
            forecasts.today = rowToForecast(row);
        }
        if (!forecasts.tomorrow && rowDateKey === tomorrowKey) {
            forecasts.tomorrow = rowToForecast(row);
        }
        if (forecasts.today && forecasts.tomorrow) break;
    }

    return forecasts;
}

export async function readLatestOdhRainForecast(): Promise<OdhNextDayRainForecast | null> {
    const forecasts = await readLatestOdhRainForecasts();
    if (forecasts.tomorrow) return forecasts.tomorrow;

    const query = `
        SELECT observation_ts, forecast_date_ts, rain_total_mm, rain_probability_max_pct
        FROM "${QUESTDB_TABLE_FORECASTS}"
        WHERE forecast_id = $1 AND language = $2
        ORDER BY observation_ts DESC
        LIMIT 1
    `;

    let result;
    try {
        result = await execute(query, [FC_ID, LANG]);
    } catch (error) {
        if (error instanceof Error && error.message.includes('table does not exist')) {
            logger.info('QuestDB table weather_odh_rain_forecasts missing; returning empty forecast payload');
            return null;
        }
        throw error;
    }
    if (!result.rowCount || !result.rows.length) {
        return null;
    }

    return rowToForecast(result.rows[0] as Record<string, unknown>);
}
