const express = require('express');
const authMiddleware = require('../authMiddleware');
const { connectToRedis } = require('../redisClient');
const namespaces = require('../namespace');
const { apiLimiter } = require('../rateLimiter');

module.exports = (app) => {
    const router = express.Router();
    const markiseStatusNamespace = namespaces.markiseStatus;

    router.get('/currentMarkiseStatus', apiLimiter, authMiddleware, async (req, res) => {
        const client = await connectToRedis();

        const keys = await client.keys(`${markiseStatusNamespace}:markise:*`);
        
        const markiseStatus = {};
        for (let key of keys) {
            const subKey = key.split(':').slice(2).join(':'); 
            const value = await client.get(key);
            markiseStatus[subKey] = value;
        }
        res.json(markiseStatus);
    });

    app.use('/markiseStatus', router);
};
