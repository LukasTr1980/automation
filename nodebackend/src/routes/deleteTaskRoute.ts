import express, { Request, Response } from 'express';
import { connectToRedis } from '../clients/redisClient';
import logger from '../logger';

const router = express.Router();

interface RequestBody {
  taskId: string;
  zone: string;
}

router.delete('/', async (req: Request<Record<string, never>, unknown, RequestBody>, res: Response) => {
    logger.info("Received body:", req.body);
    const { taskId, zone } = req.body;
  
    if (!taskId || !zone) {
      return res.status(400).send('Missing required parameters: taskId, zone');
    }
  
    // Construct the Redis key
    const redisKey = `${zone}_${taskId}`;
  
    // Get the Redis client
    const redis = await connectToRedis();
  
    // Delete the task from Redis
    redis.del(redisKey, function (err, reply) {
      if (err) {
        logger.error('Error while deleting task:', err);
        return res.status(500).send('Internal server error');
      }
  
      if (reply === 1) {
        logger.info(`Task ${redisKey} deleted successfully`);
        return res.status(200).send('Zeitplan gelöscht');
      } else {
        logger.info(`Task ${redisKey} not found`);
        return res.status(404).send('Task not found');
      }
    });
  });

export default router;
