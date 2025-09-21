import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devEnvPath = path.join(__dirname, '..', '.env.dev');
const isDev = fs.existsSync(devEnvPath);

if (isDev) {
    // Suppress the informational runtime log introduced in dotenv v17
    dotenv.config({ path: devEnvPath, quiet: true });
}

interface Config {
    baseUrl: string;
    redisHost: string;
    mongoDbHost: string;
    mosquittoUrl: string;
    vaultUrl: string;
    questDbHost: string;
    questDbPort: number;
}

const devConfig: Config = {
    baseUrl: 'http://192.168.1.2:8087',
    redisHost: '10.25.159.4',
    mongoDbHost: '10.25.159.4:27017',
    mosquittoUrl: 'mqtt://10.25.159.4:1883',
    vaultUrl: 'http://10.25.159.4:8200',
    questDbHost: '10.25.159.4',
    questDbPort: 8812,
}

const prodConfig: Config = {
    baseUrl: 'http://10.25.159.1:8087',
    redisHost: 'redis_container',
    mongoDbHost: 'mongo_container:27017',
    mosquittoUrl: 'mqtt://mosquitto_container:1883',
    vaultUrl: 'http://vault_container:8200',
    questDbHost: 'questdb_container',
    questDbPort: 8812,
}

const selectedConfig: Config = isDev ? devConfig : prodConfig;

export const {
    baseUrl,
    redisHost,
    mongoDbHost,
    mosquittoUrl,
    vaultUrl,
    questDbHost,
    questDbPort,
} = selectedConfig;

export { isDev };
