import { OpenAI } from 'openai';
import { InfluxDB } from '@influxdata/influxdb-client';
import * as envSwitcher from './envSwitcher';
import * as vaultClient from './clients/vaultClient';
import logger from './logger';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

let openai: OpenAI | undefined;
let influxDbClientAI: InfluxDB | undefined;
let influxDbClientAutomation: InfluxDB | undefined;
let openaiApiKey: string | undefined;
let influxDbTokenAI: string | undefined;
let influxDbTokenAutomation: string | undefined;

async function initializeOpenAIConfig(): Promise<void> {
    try {
        await vaultClient.login();
        const openaiCredentials = await vaultClient.getSecret('kv/data/automation/openai');
        openaiApiKey = openaiCredentials.data.apikey;

        if (!openaiApiKey) {
            throw new Error('Failed to retrieve Openai Api Key from Vault.');
        }

        openai = new OpenAI({
            apiKey: openaiApiKey,
        });
    } catch (error) {
        logger.error('Could not fetch OpenAI credentials from Vault', error);
        throw error;
    }
}

async function initializeInfluxDbConfigAI(): Promise<void> {
    try {
        await vaultClient.login();
        const credentials = await vaultClient.getSecret('kv/data/automation/influxdb');
        influxDbTokenAI = credentials.data.aitoken;

        if (!influxDbTokenAI) {
            throw new Error('Failed to retrieve InfluxDB AI token from Vault.');
        }

        const influxDbConfigAI = {
            url: envSwitcher.influxDbUrl,
            token: influxDbTokenAI,
        };
        influxDbClientAI = new InfluxDB(influxDbConfigAI);
    } catch (error) {
        logger.error('Could not fetch InfluxDB AI credentials from Vault', error);
        throw error;
    }
}

async function initializeInfluxDbConfigAutomation(): Promise<void> {
    try {
        await vaultClient.login();
        const credentials = await vaultClient.getSecret('kv/data/automation/influxdb');
        influxDbTokenAutomation = credentials.data.automationtoken;

        if (!influxDbTokenAutomation) {
            throw new Error('Failed to retrieve InfluxDB Automation token from Vault.');
        }

        const influxDbConfigAutomation = {
            url: envSwitcher.influxDbUrl,
            token: influxDbTokenAutomation,
        };
        influxDbClientAutomation = new InfluxDB(influxDbConfigAutomation);
    } catch (error) {
        logger.error('Could not fetch InfluxDB Automation credentials from Vault', error);
        throw error;
    }
}

async function getOpenAI(): Promise<OpenAI> {
    if (!openai) {
        await initializeOpenAIConfig();
    }
    if (!openai) {
        logger.error('OpenAI client is not initialized');
        throw new Error('OpenAI client is not initialized');
    }
    return openai;
}

async function getInfluxDbClientAI(): Promise<InfluxDB> {
    if (!influxDbClientAI) {
        await initializeInfluxDbConfigAI();
    }
    if (!influxDbClientAI) {
        logger.error('InfluxDB AI client is not initialized');
        throw new Error('InfluxDB AI client is not initialized');
    }
    return influxDbClientAI;
}

async function getInfluxDbClientAutomation(): Promise<InfluxDB> {
    if (!influxDbClientAutomation) {
        await initializeInfluxDbConfigAutomation();
    }
    if (!influxDbClientAutomation) {
        logger.error('InfluxDB Automation client is not initialized');
        throw new Error('InfluxDB Automation client is not initialized');
    }
    return influxDbClientAutomation;
}

export const vaultRoleId = process.env.VAULT_ROLE_ID!;
export const vaultSecretId = process.env.VAULT_SECRET_ID!;

export {
    getOpenAI,
    getInfluxDbClientAI,
    getInfluxDbClientAutomation
};
