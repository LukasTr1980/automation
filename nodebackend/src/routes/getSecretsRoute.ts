import express, { Request, Response } from 'express';
import * as vaultClient from '../clients/vaultClient'; // Ensure the path is correct
import logger from '../logger';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        // Attempt to login to Vault if not already logged in
        await vaultClient.login();

        // Fetch the secret data from Vault
        const influxSecret = await vaultClient.getSecret('kv/data/automation/influxdb');
        const openAiApiTokenData = await vaultClient.getSecret('kv/data/automation/openai');
        const passwordData = await vaultClient.getSecret('kv/data/automation/login/admin');

        // Ensure that we got a response and that the data property exists
        const influxSecretData = influxSecret ? influxSecret.data : {};
        const openAiSecretData = openAiApiTokenData ? openAiApiTokenData.data : {};
        const passwordSecretData = passwordData ? passwordData.data : {};

        // Check if specific keys within the secret exist and convert to Boolean
        const influxDbAiTokenExists = Boolean('aitoken' in influxSecretData);
        const influxDbAutomationTokenExists = Boolean('automationtoken' in influxSecretData);
        const openAiApiTokenExists = Boolean('apikey' in openAiSecretData);
        const passwordExists = Boolean('password' in passwordSecretData);

        // Send the existence status of each token
        res.status(200).json({
            influxDbAiTokenExists,
            influxDbAutomationTokenExists,
            openAiApiTokenExists,
            passwordExists
        });
    } catch (error) {
        logger.error('Error while fetching secrets from Vault:', error);
        res.status(500).send('internalServerError');
    }
});

export default router;
