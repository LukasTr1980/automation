const express = require('express');
const router = express.Router();
const vaultClient = require('../../shared/vaultClient'); // Ensure the path is correct
const logger = require('../../shared/build/logger');

router.post('/', async (req, res) => {
    try {
        const { influxDbAiToken, influxDbAutomationToken, openAiApiToken, newPassword } = req.body;

        // Ensure you're logged in to Vault
        await vaultClient.login();

        let updatedFields = [];

        if (influxDbAiToken) {
            await vaultClient.writeSecret('kv/data/automation/influxdb', { aitoken: influxDbAiToken });
            updatedFields.push('InfluxDB AI Token');
        }

        if (influxDbAutomationToken) {
            await vaultClient.writeSecret('kv/data/automation/influxdb', { automationtoken: influxDbAutomationToken });
            updatedFields.push('InfluxDB Automation Token');
        }

        if (openAiApiToken) {
            await vaultClient.writeSecret('kv/data/automation/openai', { apikey: openAiApiToken });
            updatedFields.push('OpenAI API Token');
        }

        if (newPassword) {
            // Directly save the new password without hashing
            await vaultClient.writeSecret('kv/data/automation/login/admin', { password: newPassword });
            updatedFields.push('Password');
        }

        if (updatedFields.length === 0) {
            res.status(400).send('No fields to update.');
            return;
        }

        res.status(200).send(`Successfully updated: ${updatedFields.join(', ')}`);
    } catch (error) {
        logger.error('Error while updating secrets in Vault', error);
        res.status(500).send('Internal server error');
    }
});

module.exports = router;
