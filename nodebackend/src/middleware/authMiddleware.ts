import { Request, Response, NextFunction } from 'express';
import { connectToRedis } from '../clients/redisClient';
import logger from '../logger';

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const clientIp = req.ip; // Get client's IP address
  const authHeader = req.headers['authorization'];
  let sessionId = authHeader && authHeader.split(' ')[1];

  if (!sessionId) {
    // Try getting sessionId from query parameters
    sessionId = req.query.session as string | undefined;
  }

  if (!sessionId) {
    logger.warn(`Authentication failed from IP ${clientIp}: No session ID provided`);
    res.status(401).send('authenticationFailed');
    return;
  }

  // Get the Redis client
  const redis = await connectToRedis();

  // Check if sessionId exists in Redis
  const session = await redis.get(`session:${sessionId}`);
  
  if (!session) {
    logger.warn(`Authentication failed from IP ${clientIp}: Invalid session ID [${sessionId}]`);
    res.status(401).send('authenticationFailed');
    return;
  }
  
  // if session is valid, proceed to next middleware
  next();
}

export default authMiddleware;
