import express from 'express';
import { getScheduledTasks } from '../scheduler';
import logger from '../logger';

const router = express.Router();

router.get('/', async (req: express.Request, res: express.Response) => {
    try {
      const tasks = await getScheduledTasks();
      res.json(tasks);
    } catch (err) {
      logger.error(err);
      res.status(500).send('Error fetching scheduled tasks');
    }
});

export default router;
