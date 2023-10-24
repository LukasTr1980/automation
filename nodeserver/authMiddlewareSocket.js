// authMiddlewareSocket.js
const { connectToRedis } = require('./redisClient');

const authMiddlewareSocket = async (socket, next) => {
  try {
    const authHeader = socket.handshake.headers['authorization'];
    let sessionId = authHeader && authHeader.split(' ')[1];

    if (!sessionId) {
      // Try getting sessionId from query parameters
      sessionId = socket.handshake.query.session;
    }

    if (!sessionId) {
      return next(new Error('Authentication error: No session ID'));
    }

    const redis = await connectToRedis();
    const session = await redis.get(`session:${sessionId}`);

    if (!session) {
      return next(new Error('Authentication error: Invalid session ID'));
    }

    // if session is valid, proceed to next middleware or connection handler
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authMiddlewareSocket;
