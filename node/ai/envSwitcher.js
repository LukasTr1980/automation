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
}

const prodConfig = {
    influxDbUrl: 'http://influxdb_container:8086',
}

const selectedConfig = isDev ? devConfig : prodConfig;

module.exports = {
    influxDbUrl: selectedConfig.influxDbUrl
};