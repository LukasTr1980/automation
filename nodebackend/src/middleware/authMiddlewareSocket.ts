import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../logger.js';
import { getJwtAccessTokenSecret } from '../configs.js';

const authMiddlewareSocket = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const authHeader = socket.handshake.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      token = socket.handshake.auth.token;
      if (token && token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
      }
    }

    if (!token) {
      logger.warn('Socket authentication failed: No JWT token provided');
      return next(new Error('Authentication error: No JWT token'));
    }

    const jwtSecret = await getJwtAccessTokenSecret();
    jwt.verify(token, jwtSecret, (err: unknown) => {
      if (err) {
        logger.warn(`Socket authentication failed: Invalid JWT token`);
        socket.emit('auth_error', 'Authentication error: Invalid JWT token');
        return next(new Error('Authentication error: Invalid JWT token'));
      }
      next();
    });
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
