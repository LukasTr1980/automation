import express, { Request, Response } from 'express';
import * as vaultClient from '../clients/vaultClient.js'; // Ensure the path is correct
import logger from '../logger.js';

const router = express.Router();

interface UpdateRequestBody {
    influxDbAiToken?: string;
    influxDbAutomationToken?: string;
    openAiApiToken?: string;
}

const fieldToTranslationKeyMap: { [key: string]: string } = {
    'InfluxDB AI Token': 'updateSuccessInfluxDBAIToken',
    'InfluxDB Automation Token': 'updateSuccessInfluxDBAutomationToken',
    'OpenAI API Token': 'updateSuccessOpenAIAPIToken'
};

router.post('/', async (req: Request<Record<string, never>, unknown, UpdateRequestBody>, res: Response) => {
    try {
        const { influxDbAiToken, influxDbAutomationToken, openAiApiToken } = req.body;
        await vaultClient.login();

        const updatedFields: string[] = [];

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

        if (updatedFields.length === 0) {
            res.status(400).send('noFieldsToUpdate');
            return;
        }
        
        const translationKeys = updatedFields.map(field => fieldToTranslationKeyMap[field]);
        res.status(200).send(translationKeys);
    } catch (error) {
        logger.error('Error while updating secrets in Vault', error);
        res.status(500).send('internalServerError');
    }
});

export default router;
