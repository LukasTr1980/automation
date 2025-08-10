import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devEnvPath = path.join(__dirname, '..', '.env.dev');
const isDev = fs.existsSync(devEnvPath);

if (isDev) {
    dotenv.config({ path: devEnvPath });
}

interface Config {
    influxDbUrl: string;
    baseUrl: string;
    redisHost: string;
    mongoDbHost: string;
    mosquittoUrl: string;
    vaultUrl: string;
    isSecureCookie: boolean;
    jwtTokenExpiry: number;
    isDomainCookie: string;
    isSubDomainCookie: string;
}

const devConfig: Config = {
    influxDbUrl: 'http://10.25.159.4:8086',
    baseUrl: 'http://192.168.1.2:8087',
    redisHost: '10.25.159.4',
    mongoDbHost: '10.25.159.4:27017',
    mosquittoUrl: 'mqtt://10.25.159.4:1883',
    vaultUrl: 'http://10.25.159.4:8200',
    isSecureCookie: false,
    jwtTokenExpiry: 60,
    isSubDomainCookie: '192.168.1.185',
    isDomainCookie: '192.168.1.185'
}

const prodConfig: Config = {
    influxDbUrl: 'http://influxdb_container:8086',
    baseUrl: 'http://10.25.159.1:8087',
    redisHost: 'redis_container',
    mongoDbHost: 'mongo_container:27017',
    mosquittoUrl: 'mqtt://mosquitto_container:1883',
    vaultUrl: 'http://vault_container:8200',
    isSecureCookie: true,
    jwtTokenExpiry: 60 * 60 * 24,
    isSubDomainCookie: 'automation.charts.cx',
    isDomainCookie: 'charts.cx'
}

const selectedConfig: Config = isDev ? devConfig : prodConfig;

export const {
    influxDbUrl,
    baseUrl,
    redisHost,
    mongoDbHost,
    mosquittoUrl,
    vaultUrl,
    isSecureCookie,
    jwtTokenExpiry,
    isDomainCookie,
    isSubDomainCookie
} = selectedConfig;

export { isDev };