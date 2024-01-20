import express from 'express';
import { connectToRedis } from '../clients/redisClient';
import logger from '../logger';

const router = express.Router();

router.get('/', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const sessionId = authHeader?.split(' ')[1];
  const requiredRole = req.query.requiredRole;

  // Get the Redis client
  const redis = await connectToRedis();

  // Check if sessionId exists in Redis
  const sessionData = await redis.get(`session:${sessionId}`);

  if (sessionData) {
    const { username, role } = JSON.parse(sessionData);

    if (requiredRole && role !== requiredRole) {
      logger.warn('Access denied: role mismatch')
      return res.status(403).json({ message: 'Access denied: role mismatch' });
    }

    res.status(200).json({ username, role });
  } else {
    res.status(401).send();
  }
});

export default router;
