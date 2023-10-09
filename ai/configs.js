const path = require('path');
const OpenAI = require('openai');
const { InfluxDB } = require('@influxdata/influxdb-client');
const envSwitcher = require('./envSwitcher');
const connectToRedis = require('./redisClient');

let openai;
let influxDbClient;

async function initializeConfig() {
    const redis = await connectToRedis();

    const openaiApiKey = await redis.get('openaiapi:token');

    openai = new OpenAI({
        apiKey: openaiApiKey,
    });

    const influxDbToken = await redis.get('influxdb_ai:token');

    const influxDbConfig = {
        url: envSwitcher.influxDbUrl,
        token: influxDbToken
    };
    influxDbClient = new  InfluxDB(influxDbConfig);
}

async function getOpenAI() {
    if (!openai) {
        await initializeConfig();
    }
    return openai;
}

async function getInfluxDbClient() {
    if(!influxDbClient) {
        await initializeConfig();
    }
    return influxDbClient;
}

module.exports = {
    getOpenAI,
    getInfluxDbClient
};
