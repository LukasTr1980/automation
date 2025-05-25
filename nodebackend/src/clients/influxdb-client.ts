import { ParameterizedQuery, Point } from "@influxdata/influxdb-client";
import logger from "../logger";
import { getInfluxDbClientAI, getInfluxDbClientAutomation } from "../configs";
import {
    outTempQuery,
    windQuery,
    humidityQuery,
    constructRainSumQuery,
    rainTodayQuery,
    rainRateQuery,
    et0WeekQuery,
    rainForecast24hQuery,     // ⬅︎ neu
} from "../utils/fluxQueries";

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

    logger.info(`Executing query: ${fluxQuery.toString()}`);

    return new Promise((resolve, reject) => {
        queryApi.queryRows(fluxQuery, {
            next(row, meta) {
                rows.push(meta.toObject(row) as DataRow);
            },
            error(err) {
                logger.error(`Error executing query: ${fluxQuery.toString()}`, err);
                reject(err);
            },
            complete() {
                logger.info(`Query complete: ${fluxQuery.toString()}`);
                resolve(rows);
            },
        });
    });
}

/* ---------- Public API ----------------------------------------------------- */
export interface WeatherData {
    outTemp: number;
    wind: number;
    humidity: number;
    rainSum: number;
    rainToday: number;
    rainRate: number;
    et0_week: number;
    rainForecast24: number;   // ⬅︎ neu
}

export async function queryAllData(): Promise<WeatherData> {
    logger.info("Querying all data from InfluxDB");

    const [
        outTempRes,
        windRes,
        humidityRes,
        rainSumRes,
        rainTodayRes,
        rainRateRes,
        et0WeekRes,
        rainFc24Res,            // ⬅︎ neu
    ] = await Promise.all([
        querySingleData(outTempQuery),
        querySingleData(windQuery),
        querySingleData(humidityQuery),
        querySingleData(constructRainSumQuery),
        querySingleData(rainTodayQuery),
        querySingleData(rainRateQuery),
        querySingleData(et0WeekQuery),
        querySingleData(rainForecast24hQuery), // ⬅︎ neu
    ]);

    return {
        outTemp: outTempRes[0]?._value ?? 0,
        wind: windRes[0]?._value ?? 0,
        humidity: humidityRes[0]?._value ?? 0,
        rainSum: rainSumRes[0]?._value ?? 0,
        rainToday: rainTodayRes[0]?._value ?? 0,
        rainRate: (rainRateRes[0]?._value ?? 0) / 10,
        et0_week: et0WeekRes[0]?._value ?? 0,
        rainForecast24: rainFc24Res[0]?._value ?? 0,   // ⬅︎ neu
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
        logger.info("Data written to InfluxDB");
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
