import express from 'express';
import getTaskEnabler from '../utils/getTaskEnabler';
import logger from '../logger';

const router = express.Router();

router.get('/', async (req: express.Request, res: express.Response) => {
    const zone = req.query.zone as string | undefined;
  
    if (!zone) {
      logger.warn('Missing required parameter: zone');
      res.status(400).send('Missing required parameter: zone');
      return;
    }
  
    try {
      const state = await getTaskEnabler(zone);
      logger.info(`Task enabler status for zone ${zone}: ${state}`);

      res.status(200).json({ state });
    } catch (error) {
      logger.error('Error while getting task enabler status:', error);
      res.status(500).send('Internal server error');
    }
  });

export default router;
