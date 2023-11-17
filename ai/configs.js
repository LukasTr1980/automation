const OpenAI = require('openai');
const { InfluxDB } = require('@influxdata/influxdb-client');
const envSwitcher = require('../shared/envSwitcher');
const vaultClient = require('../shared/vaultClient');
const logger = require('../shared/logger');

let openai;
let influxDbClient;
let openaiApiKey;
let influxDbToken;

async function initializeConfig() {
    try {
        await vaultClient.login();
        const credentials = await vaultClient.getSecret('kv/data/automation/openai');
        openaiApiKey = credentials.data.apikey;

        if (!openaiApiKey) {
            throw new Error('Failed to retrieve Openai Api Key from Vault.');
        }
    } catch (error) {
        logger.error('Could not fetch credentials from Vault', error);
        throw error;
    }

    openai = new OpenAI({
        apiKey: openaiApiKey,
    });

    try {
        await
         vaultClient.login();
         const credentials = await vaultClient.getSecret('kv/data/automation/influxdb');
         influxDbToken = credentials.data.aitoken;

         if (!influxDbToken) {
            throw new Error('Failed to retrieve influxdb AI token from Vault.');
        }
    } catch (error) {
        logger.error('Could not fetch credentials from Vault', error);
        throw error;
    }

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
