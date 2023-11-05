// shared/config.js
const dotenv = require('dotenv');
const path = require('path');

// Load .env file from the shared folder
dotenv.config({ path: path.resolve(__dirname, '.env') });

module.exports = {
  vaultRoleId: process.env.VAULT_ROLE_ID,
  vaultSecretId: process.env.VAULT_SECRET_ID,
};
