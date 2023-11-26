import * as envSwitcher from '../envSwitcher';
import { vaultRoleId, vaultSecretId } from '../configs';
import logger from '../logger';
import vault from 'node-vault';

const vaultClient = vault({
    endpoint: envSwitcher.vaultUrl,
});

let clientToken: string;
let tokenExpiry: number;

const roleId = vaultRoleId;
const secretId = vaultSecretId;

// Validate that role_id and secret_id are available
if (!roleId || !secretId) {
    throw new Error('Missing VAULT_ROLE_ID or VAULT_SECRET_ID environment variables');
}

async function login() {
    try {
        const loginResponse = await vaultClient.approleLogin({ role_id: roleId, secret_id: secretId });
        clientToken = loginResponse.auth.client_token;
        vaultClient.token = clientToken;

        tokenExpiry = Date.now() + (loginResponse.auth.lease_duration - 300) * 1000;
    } catch (error) {
        logger.error('Vault login failed:', error);
        throw error;
    }
}

async function getSecret(path: string) {
    try {
        if (!clientToken) throw new Error('Not logged in to Vault');

        if (Date.now() >= tokenExpiry) {
            logger.info('Token expired, refreshing...');
            await login();
        }

        const secretResponse = await vaultClient.read(path);
        return secretResponse.data;
    } catch (error: unknown) {
        if (error instanceof Error && 'response' in error && typeof error.response === 'object' && error.response !== null && 'statusCode' in error.response && error.response.statusCode === 404) {
            return null;
        } else {
            logger.error('Error fetching secret:', error);
            throw error;
        }
    }
}

async function writeSecret(path: string, data: Record<string, unknown>) {
    try {
        if (!clientToken) throw new Error('Not logged in to Vault')

        if (Date.now() >= tokenExpiry) {
            logger.info('Token expired, refreshing...');
            await login();
        }

        const payload = { data: data };

        await vaultClient.write(path, payload);
    } catch (error) {
        logger.error('Error writing secret to Vault:', error);
        throw error;
    }
}

export { login, getSecret, writeSecret };
