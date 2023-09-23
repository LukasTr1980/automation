const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'ai', '.env') });
const OpenAI = require('openai');
const { InfluxDB } = require('@influxdata/influxdb-client');
const envSwitcher = require('./envSwitcher');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const influxDbConfig = {
    url: envSwitcher.influxDbUrl, // Added the URL here
    token: process.env.INFLUXDB_TOKEN
}
const influxDbClient = new InfluxDB(influxDbConfig);

module.exports = {
    openai,
    influxDbClient
};
