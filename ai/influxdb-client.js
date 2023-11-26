const logger = require('../nodebackend/build/logger').default;
const config = require('../nodebackend/build/configs');
const {
    outTempQuery,
    windQuery,
    humidityQuery,
    rainsumQuery,
    rainTodayQuery,
    rainrate
} = require('../nodebackend/build/utils/fluxQueries');

const org = 'villaanna';

async function querySingleData(fluxQuery) {
  const queryApi = (await config.getInfluxDbClient()).getQueryApi(org);
  const result = [];
  return new Promise((resolve, reject) => {
    queryApi.queryRows(fluxQuery, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);
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

async function queryAllData() {
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

module.exports = queryAllData;
