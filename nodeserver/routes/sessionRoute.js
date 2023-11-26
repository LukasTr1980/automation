const express = require('express');
const router = express.Router();
const { connectToRedis } = require('../../nodebackend/build/clients/redisClient');

router.get('/', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const sessionId = authHeader && authHeader.split(' ')[1];
  
    // Get the Redis client
    const redis = await connectToRedis();
  
    // Check if sessionId exists in Redis
    const session = await redis.get(`session:${sessionId}`);
  
    if (session) {
      res.status(200).send();
    } else {
      res.status(401).send();
    }
  });

module.exports = router;