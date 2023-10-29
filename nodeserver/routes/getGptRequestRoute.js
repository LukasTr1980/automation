const express = require('express');
const router = express.Router();
const { connectToRedis } = require('../redisClient');

router.get('/', async (req, res) => {
    try {
      const client = await connectToRedis();
      const gptRequest = await client.get("gptRequestKey");
      res.status(200).json({ gptRequest });
    } catch (error) {
      console.error('Error while fetching GPT request:', error);
      res.status(500).send('Internal server error');
    }
  });

module.exports = router;