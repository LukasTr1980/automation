const express = require('express');
const router = express.Router();
const { connectToRedis } = require('../../shared/redisClient');
const logger = require('../../shared/build/logger');

router.delete('/', async (req, res) => {
    logger.info("Received body:", req.body);
    const { taskId, zone } = req.body;
  
    if (!taskId || !zone) {
      return res.status(400).send('Missing required parameters: taskId, zone');
    }
  
    // Construct the Redis key
    const redisKey = `${zone}_${taskId}`;
  
    // Get the Redis client
    const redis = await connectToRedis();
  
    // Delete the task from Redis
    redis.del(redisKey, function (err, reply) {
      if (err) {
        logger.error('Error while deleting task:', err);
        return res.status(500).send('Internal server error');
      }
  
      if (reply === 1) {
        logger.info(`Task ${redisKey} deleted successfully`);
        return res.status(200).send('Zeitplan gelöscht');
      } else {
        logger.info(`Task ${redisKey} not found`);
        return res.status(404).send('Task not found');
      }
    });
  });

module.exports = router;