// vaultClient.js
const envSwitcher = require('./envSwitcher');
require('dotenv').config();

const vault = require('node-vault')({
    endpoint: envSwitcher.vaultUrl,
});

let clientToken;
let tokenExpiry;

async function login(roleId, secretId) {
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
            await login(process.env.VAULT_ROLE_ID, process.env.VAULT_SECRET_ID);
        }

        const secretResponse = await vault.read(path);
        return secretResponse.data;
    } catch (error) {
        console.error('Error fetching secret:', error);
        throw error;
    }
}

module.exports = { login, getSecret };
