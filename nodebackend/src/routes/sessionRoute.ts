import express from 'express';
import { connectToRedis } from '../clients/redisClient';
import logger from '../logger';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const sessionId = authHeader?.split(' ')[1];
    if (!sessionId) {
      logger.warn('No session ID provided');
      return res.status(401).json({ message: 'No session ID provided' });
    }

    // Get the Redis client
    const redis = await connectToRedis();

    // Check if sessionId exists in Redis
    const sessionData = await redis.get(`session:${sessionId}`);
    if (!sessionData) {
      logger.warn('Invalid or expired session');
      return res.status(401).json({ message: 'Invalid or expired session' });
    }

    const { username, role } = JSON.parse(sessionData);
    const requiredRole = req.query.requiredRole;
    if (requiredRole && role !== requiredRole) {
      logger.warn('Access denied: role mismatch');
      return res.status(403).json({ message: 'Access denied: role mismatch' });
    }

    res.status(200).json({ username, role });
  } catch (error) {
    const message = (error instanceof Error) ? error.message : 'Unknown error';
    logger.error(`An error occurred: ${message}`);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
