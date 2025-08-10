import express, { Request, Response } from 'express';
import { connectToRedis } from '../clients/redisClient.js';
import logger from '../logger.js';
import { jobs } from '../scheduler.js';

const router = express.Router();

interface RequestBody {
  taskId: string;
  zone: string;
}

router.delete('/', async (req: Request<Record<string, never>, unknown, RequestBody>, res: Response) => {
    logger.info("Received body:", req.body);
    const { taskId, zone } = req.body;
  
    if (!taskId || !zone) {
      logger.warn('Missing required parameters: taskId, zone');
      res.status(400).send('anErrorOccurred');
      return;
    }

    const jobKey = `${zone}_${taskId}`;

    if (jobs[jobKey]) {
      jobs[jobKey].cancel();
      delete jobs[jobKey];
      logger.info(`Scheduled job ${jobKey} cancelled successfully`);
    } else {
      logger.warn(`No scheduled job found for key ${jobKey}`);
    }
  
    // Construct the Redis key
    const redisKey = `${zone}_${taskId}`;
  
    // Get the Redis client
    const redis = await connectToRedis();
  
    // Delete the task from Redis
    redis.del(redisKey, function (err, reply) {
      if (err) {
        logger.error('Error while deleting task:', err);
        return res.status(500).send('internalServerError');
      }
  
      if (reply === 1) {
        logger.info(`Task ${redisKey} deleted successfully`);
        return res.status(200).send('scheduleDeleted');
      } else {
        logger.info(`Task ${redisKey} not found`);
        return res.status(404).send('taskNotFound');
      }
    });
  });

export default router;
