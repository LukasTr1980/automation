const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'ai', '.env') });
const { Configuration, OpenAIApi } = require('openai');
const { InfluxDB } = require('@influxdata/influxdb-client');
const envSwitcher = require('./envSwitcher');

const openaiConfiguration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(openaiConfiguration);

const influxDbConfig = {
    url: envSwitcher.influxDbUrl, // Added the URL here
    token: process.env.INFLUXDB_TOKEN
}
const influxDbClient = new InfluxDB(influxDbConfig);

module.exports = {
    openai,
    influxDbClient
};
