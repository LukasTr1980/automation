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
      return res.status(401).json({ message: 'anErrorOccurred' });
    }

    // Get the Redis client
    const redis = await connectToRedis();

    // Check if sessionId exists in Redis
    const sessionData = await redis.get(`session:${sessionId}`);
    if (!sessionData) {
      logger.warn('Invalid or expired session');
      return res.status(401).json({ message: 'anErrorOccurred' });
    }

    const { username, role } = JSON.parse(sessionData);
    const requiredRole = req.query.requiredRole;
    if (requiredRole && role !== requiredRole) {
      logger.warn('Access denied: role mismatch');
      return res.status(403).json({ message: 'forbiddenYouDontHavePermission' });
    }

    res.status(200).json({ username, role });
  } catch (error) {
    const message = (error instanceof Error) ? error.message : 'unknownError';
    logger.error(`An error occurred: ${message}`);
    res.status(500).json({ message: 'internalServerError' });
  }
});

export default router;
