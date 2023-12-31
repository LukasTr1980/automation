import express from 'express';
import { loginValidation } from '../utils/inputValidation';
import { connectToRedis } from '../clients/redisClient';
import crypto from 'crypto';
import * as vaultClient from '../clients/vaultClient'; // Import your Vault client
import logger from '../logger';

const router = express.Router();

router.post('/', async (req: express.Request, res: express.Response) => {
    const clientIp: string | undefined = req.ip;

    const { error } = loginValidation(req.body);
    if (error) {
        logger.error(`Login validation error from IP ${clientIp}: ${error.details[0].message}`);
        return res.status(400).json({ status: 'error', message: error.details[0].message });
    }

    const { username, password } = req.body;

    try {
        await vaultClient.login();

        // Fetch user's password from Vault
        const secretPath: string = `kv/data/automation/login/${username}`;
        const credentialsResponse = await vaultClient.getSecret(secretPath);

        if (!credentialsResponse) {
            logger.warn(`Login failed for username: ${username} from IP ${clientIp} - User not found in Vault`);
            return res.status(401).json({ status: 'error', message: 'Incorrect username or password.' });
        }

        // Extract the password from the Vault response
        const storedPassword: string = credentialsResponse.data.password;

        // Check if the password from Vault matches the input password
        if (password !== storedPassword) {
            logger.warn(`Login failed for username: ${username} from IP ${clientIp} - Incorrect password`);
            return res.status(401).json({ status: 'error', message: 'Incorrect username or password.' });
        }

        // Password correct, generate a session ID
        const sessionId: string = crypto.randomBytes(16).toString('hex');

        // Store the session ID in Redis
        const redis = await connectToRedis();
        await redis.set(`session:${sessionId}`, username, 'EX', 86400);

        logger.info(`User ${username} logged in successfully from IP ${clientIp}`);

        // Send the session ID back to the client
        res.status(200).json({ status: 'success', session: sessionId });
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error during user login for username: ${username} from IP ${clientIp} - ${error.message}`);
            res.status(500).json({ status: 'error', message: 'An error occurred while processing your request.' });
        } else {
            logger.error(`An unexpected error occurred during user login for username: ${username} from IP ${clientIp}`);
            res.status(500).json({ status: 'error', message: 'An unexpected error occurred.' });
        }
    }
});

export default router;
