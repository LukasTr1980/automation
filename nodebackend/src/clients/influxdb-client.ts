import { ParameterizedQuery } from '@influxdata/influxdb-client';
import logger from '../logger';
import { getInfluxDbClient } from '../configs';
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
  const queryApi = (await getInfluxDbClient()).getQueryApi(org);
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
  outTemp: number | null;
  wind: number | null;
  humidity: number | null;
  rainSum: number | null;
  rainToday: number | null;
  rainRate: number | null;
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
      outTemp: outTempResults.length > 0 ? +outTempResults[0]._value.toFixed(2) : null,
      wind: windResults.length > 0 ? +windResults[0]._value.toFixed(2) : null,
      humidity: humidityResults.length > 0 ? +humidityResults[0]._value.toFixed(2) : null,
      rainSum: rainsumResults.length > 0 ? +rainsumResults[0]._value.toFixed(2) : null,
      rainToday: rainTodayResults.length > 0 ? +rainTodayResults[0]._value.toFixed(2) : null,
      rainRate: rainrateResults.length > 0 ? +(rainrateResults[0]._value / 10).toFixed(2) : null
    };
  } catch (error) {
    logger.error('Error querying data from InfluxDB', error);
    throw error;
  }
}

export default queryAllData;
