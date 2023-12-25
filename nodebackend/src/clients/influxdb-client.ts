import { ParameterizedQuery } from '@influxdata/influxdb-client';
import logger from '../logger';
import { getInfluxDbClientAI } from '../configs';
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
  return new Promise((resolve, reject) => {
    queryApi.queryRows(fluxQuery, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row) as DataRow;
        result.push(o);
      },
      error(error) {
        reject(error);
      },
      complete() {
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
    const outTempResults = await querySingleData(outTempQuery);
    const windResults = await querySingleData(windQuery);
    const humidityResults = await querySingleData(humidityQuery);
    const rainsumResults = await querySingleData(rainsumQuery);
    const rainTodayResults = await querySingleData(rainTodayQuery);
    const rainrateResults = await querySingleData(rainrate);

    return {
      outTemp: outTempResults.length > 0 ? +outTempResults[0]._value.toFixed(2) : 0,
      wind: windResults.length > 0 ? +windResults[0]._value.toFixed(2) : 0,
      humidity: humidityResults.length > 0 ? +humidityResults[0]._value.toFixed(2) : 0,
      rainSum: rainsumResults.length > 0 ? +rainsumResults[0]._value.toFixed(2) : 0,
      rainToday: rainTodayResults.length > 0 ? +rainTodayResults[0]._value.toFixed(2) : 0,
      rainRate: rainrateResults.length > 0 ? +(rainrateResults[0]._value / 10).toFixed(2) : 0
    };
  } catch (error) {
    logger.error('Error querying data from InfluxDB', error);
    throw error;
  }
}

export { queryAllData, WeatherData };
