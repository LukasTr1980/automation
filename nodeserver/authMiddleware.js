const { connectToRedis } = require('./redisClient')

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let sessionId = authHeader && authHeader.split(' ')[1];

  if (!sessionId) {
      // Try getting sessionId from query parameters
      sessionId = req.query.session;
  }

  // Get the Redis client
  const redis = await connectToRedis();

  // Check if sessionId exists in Redis
  const session = await redis.get(`session:${sessionId}`);
  
  if (!session) {
    res.status(401).send();
    return;
  }

  // if session is valid, proceed to next middleware
  next();
}

module.exports = authMiddleware;
