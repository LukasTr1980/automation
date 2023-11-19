const { connectToRedis } = require('../shared/redisClient');
const logger = require('../shared/build/logger'); // Import your logger

const authMiddleware = async (req, res, next) => {
  const clientIp = req.ip; // Get client's IP address
  const authHeader = req.headers['authorization'];
  let sessionId = authHeader && authHeader.split(' ')[1];

  if (!sessionId) {
      // Try getting sessionId from query parameters
      sessionId = req.query.session;
  }

  if (!sessionId) {
      logger.warn(`Authentication failed from IP ${clientIp}: No session ID provided`);
      res.status(401).send();
      return;
  }

  // Get the Redis client
  const redis = await connectToRedis();

  // Check if sessionId exists in Redis
  const session = await redis.get(`session:${sessionId}`);
  
  if (!session) {
    logger.warn(`Authentication failed from IP ${clientIp}: Invalid session ID [${sessionId}]`);
    res.status(401).send();
    return;
  }
  
  // if session is valid, proceed to next middleware
  next();
}

module.exports = authMiddleware;
