const { connectToRedis } = require('../shared/build/redisClient');
const logger = require('../shared/build/logger').default; // Import your logger

const authMiddlewareSocket = async (socket, next) => {
  try {
    const authHeader = socket.handshake.headers['authorization'];
    let sessionId = authHeader && authHeader.split(' ')[1];

    if (!sessionId) {
      // Try getting sessionId from query parameters
      sessionId = socket.handshake.query.session;
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
    logger.error(`Socket authentication error: ${error.message}`);
    next(error);
  }
};

module.exports = authMiddlewareSocket;
