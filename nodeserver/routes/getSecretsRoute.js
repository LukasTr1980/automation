const express = require('express');
const router = express.Router();
const { connectToRedis } = require('../redisClient');

router.get('/', async (req, res) => {
    try {
      const client = await connectToRedis();
      const influxDbAiTokenExists = Boolean(await client.get("influxdb_ai:token"));
      const influxDbAutomationTokenExists = Boolean(await client.get("influxdb_automation:token"));
      const openAiApiTokenExists = Boolean(await client.get("openaiapi:token"));
      const passwordExists = Boolean(await client.get("user:automation"))
      res.status(200).json({
        influxDbAiTokenExists,
        influxDbAutomationTokenExists,
        openAiApiTokenExists,
        passwordExists
      });
    } catch (error) {
      console.error('Error while fetching secrets:', error);
      res.status(500).send('Internal server error');
    }
  });

module.exports = router;