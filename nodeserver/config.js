const { InfluxDB } = require('@influxdata/influxdb-client');
const envSwitcher = require('../shared/build/envSwitcher');
const vaultClient = require('../shared/build/vaultClient'); // Make sure this path is correct

let influxDbConfig;
let influxDbClient;

async function initializeInfluxDbConfig() {
    // Ensure you're logged in to Vault
    await vaultClient.login();

    // Fetch the InfluxDB token from Vault
    const credentials = await vaultClient.getSecret('kv/data/automation/influxdb'); // Update the path as necessary
    const influxDbToken = credentials.data.automationtoken; // Use the correct key for the token

    if (!influxDbToken) {
        throw new Error('Failed to retrieve InfluxDB token from Vault.');
    }

    influxDbConfig = {
        url: envSwitcher.influxDbUrl,
        token: influxDbToken,
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
