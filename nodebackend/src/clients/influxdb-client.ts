import { ParameterizedQuery, Point } from "@influxdata/influxdb-client";
import logger from "../logger.js";
import { getInfluxDbClientAI, getInfluxDbClientAutomation } from "../configs.js";
import { rainNextDayQuery, rainProbNextDayQuery } from "../utils/fluxQueries.js";
import { readLatestJsonlNumber } from "../utils/localDataWriter.js";

const ORG = "villaanna";
const BUCKET = "automation"; // Default bucket for writing data

/* ---------- Low-level helper ------------------------------------------------ */
interface DataRow {
    _value: number;
}

async function querySingleData(
    fluxQuery: ParameterizedQuery
): Promise<DataRow[]> {
    const queryApi = (await getInfluxDbClientAI()).getQueryApi(ORG);
    const rows: DataRow[] = [];

    return new Promise((resolve, reject) => {
        queryApi.queryRows(fluxQuery, {
            next(row: unknown, meta: any) {
                rows.push(meta.toObject(row as any) as DataRow);
            },
            error(err: unknown) {
                logger.error(`Error executing query: ${fluxQuery.toString()}`, err);
                reject(err);
            },
            complete() {
                resolve(rows);
            },
        });
    });
}

/* ---------- Public API ----------------------------------------------------- */
export interface WeatherData {
    et0_week: number;
    rainNextDay: number;
    rainProbNextDay: number;
}

export async function queryAllData(): Promise<WeatherData> {
    logger.info("Querying all data from InfluxDB");

    const [rainNextDayRes, rainProbNextDayRes] = await Promise.all([
        querySingleData(rainNextDayQuery),
        querySingleData(rainProbNextDayQuery),
    ]);

    let et0_week = 0;
    try {
        const latest = await readLatestJsonlNumber('evapotranspiration_weekly', 'et0_week', 3);
        if (typeof latest === 'number' && isFinite(latest)) et0_week = latest;
        else logger.warn('Weekly ET₀ JSONL not found or invalid; using 0');
    } catch (e) {
        logger.warn('Failed reading weekly ET₀ JSONL; using 0', e);
    }

    return {
        et0_week,
        rainNextDay: rainNextDayRes[0]?._value ?? 0,
        rainProbNextDay: rainProbNextDayRes[0]?._value ?? 0,
    };
}

/* ---------- Write helper --------------------------------------------------- */
async function writeToInflux(
    topic: string,
    message: string,
    measurement = "mqtt_data",
    bucket = "automation"
): Promise<void> {
    const writeApi = (await getInfluxDbClientAutomation()).getWriteApi(ORG, bucket);
    const point = new Point(measurement);

    if (topic) point.tag("topic", topic);

    const lower = message.toLowerCase();
    if (lower === "true" || lower === "false") {
        point.booleanField("value_boolean", lower === "true");
    } else {
        const num = Number(message);
        if (isFinite(num)) {
            point.floatField("value_numeric", num);
        } else {
            logger.error(`Invalid data type received for message: ${message}`);
            return;
        }
    }

    writeApi.writePoint(point);
    try {
        await writeApi.flush();
        logger.info(`Data written to InfluxDB: ${point.toLineProtocol()}`);
    } catch (err) {
        logger.error("Error writing data to InfluxDB", err);
    }
}

export async function recordIrrigationStartInflux (zone: string): Promise<void> {
    try {
        const influxClient = await getInfluxDbClientAutomation();
        const writeApi = influxClient.getWriteApi(ORG, BUCKET);
        const point = new Point("irrigation_start")
            .tag("zone", zone)
            .booleanField("started", true)

        writeApi.writePoint(point);
        await writeApi.flush();
        logger.info(`InfluxDB: Irrigation started for zone ${zone} recorded.`);
    }
    catch (err) {
        logger.error(`Error recording irrigation start for zone ${zone} in InfluxDB`, err);
    }
}

export { writeToInflux, querySingleData };
