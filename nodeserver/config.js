const { InfluxDB } = require('@influxdata/influxdb-client');
const envSwitcher = require ('./envSwitcher');
const {connectToRedis } = require('./redisClient');

let influxDbConfig;
let influxDbClient;

async function initializeInfluxDbConfig() {
    const redis = await connectToRedis();

    const influxDbToken = await redis.get('influxdb_automation:token');

    influxDbConfig = {
        url: envSwitcher.influxDbUrl,
        token: influxDbToken
    };
    influxDbClient = new InfluxDB(influxDbConfig);
}

async function getInfluxDbClient() {
    if (!influxDbClient) {
        await initializeInfluxDbConfig();
    }
    return influxDbClient;
}

module.exports = {
    getInfluxDbClient
};
