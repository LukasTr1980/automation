import { OpenAI } from 'openai';
import { InfluxDB } from '@influxdata/influxdb-client';
import * as envSwitcher from './envSwitcher';
import * as vaultClient from './vaultClient';
import logger from './logger';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

let openai: OpenAI | undefined;
let influxDbClient: InfluxDB | undefined;
let openaiApiKey: string | undefined;
let influxDbToken: string | undefined;

async function initializeConfig(): Promise<void> {
    try {
        await vaultClient.login();
        const credentials = await vaultClient.getSecret('kv/data/automation/openai');
        openaiApiKey = credentials.data.apikey;

        if (!openaiApiKey) {
            throw new Error('Failed to retrieve Openai Api Key from Vault.');
        }
    } catch (error) {
        logger.error('Could not fetch credentials from Vault', error);
        throw error;
    }

    openai = new OpenAI({
        apiKey: openaiApiKey,
    });

    try {
        await vaultClient.login();
        const credentials = await vaultClient.getSecret('kv/data/automation/influxdb');
        influxDbToken = credentials.data.aitoken;

        if (!influxDbToken) {
            throw new Error('Failed to retrieve influxdb AI token from Vault.');
        }
    } catch (error) {
        logger.error('Could not fetch credentials from Vault', error);
        throw error;
    }

    const influxDbConfig = {
        url: envSwitcher.influxDbUrl,
        token: influxDbToken
    };
    influxDbClient = new InfluxDB(influxDbConfig);
}

async function getOpenAI(): Promise<OpenAI> {
    if (!openai) {
        await initializeConfig();
    }
    if (openai === undefined) {
        logger.error('Openai client is not initialized')
        throw new Error('Openai client is not initialized')
    }
    return openai;
}

async function getInfluxDbClient(): Promise<InfluxDB> {
    if (!influxDbClient) {
        await initializeConfig();
    }
    if (influxDbClient === undefined) {
        logger.error('Influxdb client is not initialized')
        throw new Error('Influxdb client is not initialized')
    }
    return influxDbClient;
}

export const vaultRoleId = process.env.VAULT_ROLE_ID!;
export const vaultSecretId = process.env.VAULT_SECRET_ID!;

export {
    getOpenAI,
    getInfluxDbClient
};
