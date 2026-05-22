// src/utils/radiationRecorder.ts
// -----------------------------------------------------------------------------
//  Fetches measured global radiation from the official South Tyrol weather
//  station network and persists the raw observations in QuestDB.
// -----------------------------------------------------------------------------

import {
    insertRow as insertQuestDbRow,
    registerQuestDbTableSchema,
} from "../clients/questdbClient.js";
import logger from "../logger.js";

const STATIONS_URL = "https://dati.retecivica.bz.it/services/meteo/v1/stations";
const SENSORS_URL = "https://dati.retecivica.bz.it/services/meteo/v1/sensors";
const QUESTDB_TABLE_RADIATION = "weather_radiation_observations";
const QUESTDB_SOURCE_LABEL = "province_bz_meteo";
const PRIMARY_STATION_CODE = process.env.RADIATION_PRIMARY_STATION ?? "75600MS";
const RADIATION_STALE_MINUTES = Number(process.env.RADIATION_STALE_MINUTES ?? 45);

type StationProperties = {
    SCODE?: string;
    NAME_D?: string;
    NAME_E?: string;
    ALT?: number;
    LONG?: number;
    LAT?: number;
};

type StationsResponse = {
    features?: Array<{
        properties?: StationProperties;
    }>;
};

type SensorReading = {
    SCODE?: string;
    TYPE?: string;
    DESC_D?: string;
    UNIT?: string;
    DATE?: string;
    VALUE?: number;
};

registerQuestDbTableSchema(QUESTDB_TABLE_RADIATION, () => `
    CREATE TABLE IF NOT EXISTS "${QUESTDB_TABLE_RADIATION}" (
        observation_ts TIMESTAMP,
        station_code SYMBOL,
        station_name SYMBOL,
        latitude_deg DOUBLE,
        longitude_deg DOUBLE,
        altitude_m DOUBLE,
        global_radiation_w_m2 DOUBLE,
        sunshine_duration_s DOUBLE,
        data_source SYMBOL,
        quality_flag SYMBOL
    ) timestamp(observation_ts) PARTITION BY DAY
`);

async function fetchJsonRetry<T>(url: string, opts: RequestInit = {}, retries = 3): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            const r = await fetch(url, { ...opts });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return await r.json() as T;
        } catch (err) {
            if (i === retries - 1) throw err;
            logger.warn(`Fetch ${url} failed (${err}). Retry ${i + 1}/${retries - 1}`);
            await new Promise(res => setTimeout(res, 1_500 * (i + 1)));
        }
    }
    throw new Error("Unreachable");
}

function parseSouthTyrolTimestamp(raw: string | undefined): Date {
    if (!raw) throw new Error("Sensor timestamp missing");
    const match = raw.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(CEST|CET)$/);
    if (match) {
        const offset = match[2] === "CEST" ? "+02:00" : "+01:00";
        return new Date(`${match[1]}${offset}`);
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Invalid sensor timestamp: ${raw}`);
    }
    return parsed;
}

function finiteNumber(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

export async function recordCurrentGlobalRadiation(stationCode = PRIMARY_STATION_CODE) {
    const [stationsResponse, sensors] = await Promise.all([
        fetchJsonRetry<StationsResponse>(STATIONS_URL),
        fetchJsonRetry<SensorReading[]>(SENSORS_URL),
    ] as const);

    const station = stationsResponse.features
        ?.map(feature => feature.properties)
        .find(properties => properties?.SCODE === stationCode);
    if (!station) throw new Error(`Radiation station ${stationCode} not found`);

    const stationSensors = sensors.filter(sensor => sensor.SCODE === stationCode);
    const globalRadiation = stationSensors.find(sensor => sensor.TYPE === "GS");
    if (!globalRadiation) throw new Error(`Global radiation sensor GS missing for ${stationCode}`);

    const sunshineDuration = stationSensors.find(sensor => sensor.TYPE === "SD");
    const radiationWM2 = finiteNumber(globalRadiation.VALUE);
    if (radiationWM2 === null) {
        throw new Error(`Invalid global radiation value for ${stationCode}: ${globalRadiation.VALUE}`);
    }

    const sunshineDurationS = finiteNumber(sunshineDuration?.VALUE);
    const observationTimestamp = parseSouthTyrolTimestamp(globalRadiation.DATE);
    const now = Date.now();
    const ageMinutes = (now - observationTimestamp.getTime()) / 60_000;
    const qualityFlag = ageMinutes > RADIATION_STALE_MINUTES ? "stale" : "ok";

    await insertQuestDbRow(QUESTDB_TABLE_RADIATION, {
        observation_ts: observationTimestamp,
        station_code: stationCode,
        station_name: station.NAME_D ?? station.NAME_E ?? stationCode,
        latitude_deg: finiteNumber(station.LAT),
        longitude_deg: finiteNumber(station.LONG),
        altitude_m: finiteNumber(station.ALT),
        global_radiation_w_m2: Math.max(0, radiationWM2),
        sunshine_duration_s: sunshineDurationS,
        data_source: QUESTDB_SOURCE_LABEL,
        quality_flag: qualityFlag,
    });

    logger.info(
        `GlobalRadiation ${radiationWM2.toFixed(1)} W/m² (${stationCode}) → QuestDB (${QUESTDB_TABLE_RADIATION}, ${qualityFlag})`
    );

    return {
        stationCode,
        stationName: station.NAME_D ?? station.NAME_E ?? stationCode,
        globalRadiationWM2: Math.max(0, radiationWM2),
        sunshineDurationS,
        timestamp: observationTimestamp.toISOString(),
        qualityFlag,
    };
}

export { QUESTDB_TABLE_RADIATION, PRIMARY_STATION_CODE as RADIATION_PRIMARY_STATION };
