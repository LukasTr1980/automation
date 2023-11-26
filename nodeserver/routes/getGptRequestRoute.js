const express = require('express');
const router = express.Router();
const { connectToRedis } = require('../../nodebackend/build/clients/redisClient');
const logger = require('../../nodebackend/build/logger').default;

router.get('/', async (req, res) => {
    try {
      const client = await connectToRedis();
      const gptRequest = await client.get("gptRequestKey");
      res.status(200).json({ gptRequest });
    } catch (error) {
      logger.error('Error while fetching GPT request:', error);
      res.status(500).send('Internal server error');
    }
  });

module.exports = router;