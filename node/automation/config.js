const path = require('path');
require('dotenv').config(); // This will use the .env file in the root of the automation project
const { InfluxDB } = require('@influxdata/influxdb-client');

const influxDbConfig = {
    url: 'http://influxdb_container:8086',
    token: process.env.INFLUXDB_AUTOMATION_TOKEN  // Use a distinct name for clarity and to avoid potential conflicts
};
const influxDbClient = new InfluxDB(influxDbConfig);

module.exports = {
    influxDbClient
};
