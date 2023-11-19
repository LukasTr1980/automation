const express = require('express');
const router = express.Router();
const { connectToRedis } = require('../../shared/build/redisClient');
const logger = require('../../shared/build/logger');

router.post('/', async (req, res) => {
    try {
      const { newGptRequest } = req.body;
      const client = await connectToRedis();
      await client.set("gptRequestKey", newGptRequest);
      res.status(200).send('GPT request updated successfully');
    } catch (error) {
      logger.error('Error while updating GPT request:', error);
      res.status(500).send('Internal server error');
    }
  });

module.exports = router;