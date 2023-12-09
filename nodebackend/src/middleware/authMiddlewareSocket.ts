import { connectToRedis } from '../clients/redisClient';
import logger from '../logger'; // Import your logger
import { Socket } from 'socket.io';

const authMiddlewareSocket = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const authHeader = socket.handshake.headers['authorization'];
    let sessionId = authHeader && authHeader.split(' ')[1];

    if (!sessionId) {
      // Try getting sessionId from query parameters
      sessionId = socket.handshake.query.session as string;
    }

    if (!sessionId) {
      logger.warn('Socket authentication failed: No session ID provided');
      return next(new Error('Authentication error: No session ID'));
    }

    const redis = await connectToRedis();
    const session = await redis.get(`session:${sessionId}`);

    if (!session) {
      logger.warn(`Socket authentication failed: Invalid session ID [${sessionId}]`);
      return next(new Error('Authentication error: Invalid session ID'));
    }

    // if session is valid, proceed to next middleware or connection handler
    next();
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Socket authentication error: ${error.message}`);
      next(error);
    } else {
      logger.error(`Socket authentication error: An unknown error occurred`);
      next(new Error('An unknown error occurred'));
    }
  }
};

export default authMiddlewareSocket;
