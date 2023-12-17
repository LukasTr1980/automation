import express from 'express';
import { connectToRedis } from '../clients/redisClient';

const router = express.Router();

router.get('/', async (req: express.Request, res: express.Response): Promise<void> => {
    const authHeader = req.headers['authorization'];
    const sessionId = authHeader?.split(' ')[1];
  
    // Get the Redis client
    const redis = await connectToRedis();
  
    // Check if sessionId exists in Redis
    const session = await redis.get(`session:${sessionId}`);
  
    if (session) {
      res.status(200).send();
    } else {
      res.status(401).send();
    }
});

export default router;
