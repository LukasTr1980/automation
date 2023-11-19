const express = require('express');
const router = express.Router();
const { loginValidation } = require('../inputValidation');
const { connectToRedis } = require('../../shared/build/redisClient');
const crypto = require('crypto');
const vaultClient = require('../../shared/build/vaultClient'); // Import your Vault client
const logger = require('../../shared/build/logger');

router.post('/', async (req, res) => {
    const clientIp = req.ip;

    const { error } = loginValidation(req.body);
    if (error) {
        logger.error(`Login validation error from IP ${clientIp}: ${error.details[0].message}`);
        return res.status(400).json({ status: 'error', message: error.details[0].message });
    }

    const { username, password } = req.body;

    try {
        // Log in to Vault if not already logged in
        if (!vaultClient.clientToken) {
            await vaultClient.login();
        }
        
        // Fetch user's password from Vault
        const secretPath = `kv/data/automation/login/${username}`;
        const credentialsResponse = await vaultClient.getSecret(secretPath);

        if (!credentialsResponse) {
            logger.warn(`Login failed for username: ${username} from IP ${clientIp} - User not found in Vault`);
            return res.status(401).json({ status: 'error', message: 'Incorrect username or password.' });
        }

        // Extract the password from the Vault response
        const storedPassword = credentialsResponse.data.password;

        // Check if the password from Vault matches the input password
        if (password !== storedPassword) {
            logger.warn(`Login failed for username: ${username} from IP ${clientIp} - Incorrect password`);
            return res.status(401).json({ status: 'error', message: 'Incorrect username or password.' });
        }
        
        // Password correct, generate a session ID
        const sessionId = crypto.randomBytes(16).toString('hex');

        // Store the session ID in Redis
        const redis = await connectToRedis();
        await redis.set(`session:${sessionId}`, username, 'EX', 86400);

        logger.info(`User ${username} logged in successfully from IP ${clientIp}`);

        // Send the session ID back to the client
        res.status(200).json({ status: 'success', session: sessionId });
    } catch (error) {
        logger.error(`Error during user login for username: ${username} from IP ${clientIp} - ${error.message}`);
        res.status(500).json({ status: 'error', message: 'An error occurred while processing your request.' });
    }
});

module.exports = router;
