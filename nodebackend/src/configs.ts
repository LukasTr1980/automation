import * as vaultClient from './clients/vaultClient.js';
import logger from './logger.js';
import fs from 'fs';
import { isDev } from './envSwitcher.js';

let openWeatherMapApiKey: string | undefined;
let vaultRoleId: string;
let vaultSecretId: string;

async function initializeOpenWeatherMapConfig(): Promise<void> {
    try {
        await vaultClient.login();
        const secret = await vaultClient.getSecret('kv/data/automation/openweathermap');
        openWeatherMapApiKey = secret.data.apikey;
        if (!openWeatherMapApiKey) throw new Error('Failed to retrieve OpenWeatherMap API key from Vault.');
    }
    catch (error) {
        logger.error('Could not fetch OpenWeatherMap credentials from Vault', error);
        throw error;
    }
}

async function getOpenWeatherMapApiKey(): Promise<string> {
    if (!openWeatherMapApiKey) {
        await initializeOpenWeatherMapConfig();
    }
    if (!openWeatherMapApiKey) {
        logger.error('OpenWeatherMap API key is not initialized');
        throw new Error('OpenWeatherMap API key is not initialized');
    }
    return openWeatherMapApiKey;
}

if (!isDev) {
    try {
        vaultRoleId = fs.readFileSync('/run/secrets/automation_vault_role_id', 'utf-8').trim();
        vaultSecretId = fs.readFileSync('/run/secrets/automation_vault_secret_id', 'utf-8').trim();
    } catch (error) {
        logger.error('Error reading Vault credentials from Docker secrets:', error);
        throw error;
    }
} else {
    vaultRoleId = process.env.VAULT_ROLE_ID || '';
    vaultSecretId = process.env.VAULT_SECRET_ID || '';
}

export {
    getOpenWeatherMapApiKey,
    vaultRoleId,
    vaultSecretId,
};
