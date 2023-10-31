const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const devEnvPath = path.join(__dirname, '.env.dev');
const isDev = fs.existsSync(devEnvPath);

if (isDev) {
    dotenv.config({ path: devEnvPath });
}

const devConfig = {
    influxDbUrl: 'http://10.25.159.4:8086',
    mqttBrokerUrl: 'mqtt://192.168.1.2:1883',
    baseUrl: 'http://192.168.1.2:8087',
    redisHost: '10.25.159.4',
    mongoDbHost: '10.25.159.4:27017',
    mosquittoUrl: 'mqtt://10.25.159.4:1883'
}

const prodConfig = {
    influxDbUrl: 'http://influxdb_container:8086',
    mqttBrokerUrl: 'mqtt://10.25.159.1:1883',
    baseUrl: 'http://10.25.159.1:8087',
    redisHost: 'redis_container',
    mongoDbHost: 'mongo_container:27017',
    mosquittoUrl: 'mqtt://mosquitto_container:1883'
}

const selectedConfig = isDev ? devConfig : prodConfig;

module.exports = {
    influxDbUrl: selectedConfig.influxDbUrl,
    mqttBrokerUrl: selectedConfig.mqttBrokerUrl,
    baseUrl: selectedConfig.baseUrl,
    redisHost: selectedConfig.redisHost,
    mongoDbHost: selectedConfig.mongoDbHost,
    mosquittoUrl: selectedConfig.mosquittoUrl
};