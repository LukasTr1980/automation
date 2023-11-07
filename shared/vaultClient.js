const envSwitcher = require('./envSwitcher');
const { vaultRoleId, vaultSecretId } = require('./config');

const vault = require('node-vault')({
    endpoint: envSwitcher.vaultUrl,
});

let clientToken;
let tokenExpiry;

const roleId = vaultRoleId;
const secretId = vaultSecretId;

// Validate that role_id and secret_id are available
if (!roleId || !secretId) {
    throw new Error('Missing VAULT_ROLE_ID or VAULT_SECRET_ID environment variables');
}

async function login() {
    try {
        const loginResponse = await vault.approleLogin({ role_id: roleId, secret_id: secretId });
        clientToken = loginResponse.auth.client_token;
        vault.token = clientToken;

        tokenExpiry = Date.now() + (loginResponse.auth.lease_duration - 300) * 1000;
    } catch (error) {
        console.error('Vault login failed:', error);
        throw error;
    }
}

async function getSecret(path) {
    try {
        if (!clientToken) throw new Error('Not logged in to Vault');

        if (Date.now() >= tokenExpiry) {
            console.log('Token expired, refreshing...');
            await login();
        }

        const secretResponse = await vault.read(path);
        return secretResponse.data;
    } catch (error) {
        if (error.response && error.response.statusCode === 404) {
            return null;
        } else {
            console.error('Error fetching secret:', error);
            throw error;
        }
    }
}

async function writeSecret(path, data) {
    try {
        if (!clientToken) throw new Error('Not logged in to Vault')

        if (Date.now() >= tokenExpiry) {
            console.log('Token expired, refreshing...');
            await login();
        }

        const payload = { data: data };

        await vault.write(path, payload);
    } catch (error) {
        console.error('Error writing secret to Vault:', error);
        throw error;
    }
}

module.exports = { login, getSecret, writeSecret };
