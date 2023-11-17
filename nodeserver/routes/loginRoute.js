const express = require('express');
const router = express.Router();
const { loginValidation } = require('../inputValidation');
const { connectToRedis } = require('../../shared/redisClient');
const crypto = require('crypto');
const vaultClient = require('../../shared/vaultClient'); // Import your Vault client
const logger = require('../../shared/logger');

router.post('/', async (req, res) => {
    const { error } = loginValidation(req.body);
    if (error) return res.status(400).json({ status: 'error', message: error.details[0].message });

    const { username, password } = req.body;

    try {
        // Log in to Vault if not already logged in
        if (!vaultClient.clientToken) {
            await vaultClient.login();
        }
        
        // Fetch user's password from Vault using the username to construct the path
        const secretPath = `kv/data/automation/login/${username}`; // Vault path structure
        const credentialsResponse = await vaultClient.getSecret(secretPath);

        if (!credentialsResponse) {
            return res.status(401).json({ status: 'error', message: 'Falscher Benutzername oder Password.' });
        }

        // Extract the password from the Vault response
        const storedPassword = credentialsResponse.data.password;

        // Check if the password from Vault matches the input password
        if (password !== storedPassword) {
            return res.status(401).json({ status: 'error', message: 'Falscher Benutzername oder Password.' });
        }
        
        // If the password is correct, generate a session ID
        const sessionId = crypto.randomBytes(16).toString('hex');

        // Get the Redis client and store the session ID
        const redis = await connectToRedis();
        await redis.set(`session:${sessionId}`, username, 'EX', 86400);

        // Send the session ID back to the client
        res.status(200).json({ status: 'success', session: sessionId });
    } catch (error) {
        logger.error('Error during user login:', error);
        // This should be a generic error message, not revealing the nature of the error
        res.status(500).json({ status: 'error', message: 'An error occurred while processing your request.' });
    }
});

module.exports = router;
