const express = require('express');
const router = express.Router();
const { connectToRedis } = require('../redisClient');
const namespaces = require('../namespace');

const markiseStatusNamespace = namespaces.markiseStatus;

router.get('/currentMarkiseStatus', async (req, res) => {
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

module.exports = router;