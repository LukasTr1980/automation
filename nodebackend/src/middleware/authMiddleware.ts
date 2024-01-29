import { Request, Response, NextFunction } from 'express';
import { connectToRedis } from '../clients/redisClient';
import logger from '../logger';

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const clientIp = req.ip;
  const authHeader = req.headers['authorization'];
  let sessionId = authHeader && authHeader.split(' ')[1];

  if (!sessionId) {
    sessionId = req.query.session as string | undefined;
  }

  if (!sessionId) {
    logger.warn(`Authentication failed from IP ${clientIp}: No session ID provided`);
    return res.status(401).json({ message: 'sessionExpired', severity: 'warning' });
  }

  const redis = await connectToRedis();

  const session = await redis.get(`session:${sessionId}`);
  
  if (!session) {
    logger.warn(`Authentication failed from IP ${clientIp}: Invalid session ID [${sessionId}]`);
    return res.status(401).json({ message: 'sessionExpired', severity: 'warning' });
  }
  
  next();
}

export default authMiddleware;
