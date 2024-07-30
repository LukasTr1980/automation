import { ParameterizedQuery, Point } from '@influxdata/influxdb-client';
import logger from '../logger';
import { getInfluxDbClientAI, getInfluxDbClientAutomation } from '../configs';
import {
    outTempQuery,
    windQuery,
    humidityQuery,
    rainsumQuery,
    rainTodayQuery,
    rainrate
} from '../utils/fluxQueries';

const org: string = 'villaanna';

interface DataRow {
    _value: number;
}

async function querySingleData(fluxQuery: ParameterizedQuery): Promise<DataRow[]> {
    const queryApi = (await getInfluxDbClientAI()).getQueryApi(org);
    const result: DataRow[] = [];
    logger.info(`Executing query: ${fluxQuery.toString()}`);
    return new Promise((resolve, reject) => {
        queryApi.queryRows(fluxQuery, {
            next(row, tableMeta) {
                const o = tableMeta.toObject(row) as DataRow;
                result.push(o);
            },
            error(error) {
                logger.error(`Error executing query: ${fluxQuery.toString()}`, error);
                reject(error);
            },
            complete() {
                logger.info(`Query complete: ${fluxQuery.toString()}`);
                resolve(result);
            },
        });
    });
}

interface WeatherData {
    outTemp: number;
    wind: number;
    humidity: number;
    rainSum: number;
    rainToday: number;
    rainRate: number;
}

async function queryAllData(): Promise<WeatherData> {
    try {
        logger.info('Querying all data from InfluxDB');
        const outTempResults = await querySingleData(outTempQuery);
        const windResults = await querySingleData(windQuery);
        const humidityResults = await querySingleData(humidityQuery);
        const rainsumResults = await querySingleData(rainsumQuery);
        const rainTodayResults = await querySingleData(rainTodayQuery);
        const rainrateResults = await querySingleData(rainrate);

        const weatherData = {
            outTemp: outTempResults.length > 0 ? +outTempResults[0]._value.toFixed(2) : 0,
            wind: windResults.length > 0 ? +windResults[0]._value.toFixed(2) : 0,
            humidity: humidityResults.length > 0 ? +humidityResults[0]._value.toFixed(2) : 0,
            rainSum: rainsumResults.length > 0 ? +rainsumResults[0]._value.toFixed(2) : 0,
            rainToday: rainTodayResults.length > 0 ? +rainTodayResults[0]._value.toFixed(2) : 0,
            rainRate: rainrateResults.length > 0 ? +(rainrateResults[0]._value / 10).toFixed(2) : 0
        };

        logger.info('Successfully queried all data from InfluxDB');
        return weatherData;
    } catch (error) {
        logger.error('Error querying data from InfluxDB', error);
        throw error;
    }
}

async function writeToInflux(topic: string, message: string): Promise<void> {
    const influxDbClient = await getInfluxDbClientAutomation();
    const writeApi = influxDbClient.getWriteApi('villaanna', 'automation');

    const point = new Point('mqtt_data').tag('topic', topic);

    if (message.toLowerCase() === 'true' || message.toLowerCase() === 'false') {
        const booleanValue = message.toLowerCase() === 'true';
        point.booleanField('value_boolean', booleanValue);
    } else {
        const numValue = parseFloat(message);
        if (!isNaN(numValue)) {
            point.floatField('value_numeric', numValue);
        } else {
            logger.error(`Invalid data type received for message: ${message}`);
            return; // Exit if the message data type isn't supported
        }
    }

    writeApi.writePoint(point);

    try {
        await writeApi.flush();
        logger.info('Data written to InfluxDB');
    } catch (error) {
        logger.error('Error writing data to InfluxDB', error);
    }
}

export { queryAllData, WeatherData, writeToInflux };
