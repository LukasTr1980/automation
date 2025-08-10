import express, { Request, Response } from 'express';
import setTaskEnabler from '../utils/switchTaskEnabler.js';
import logger from '../logger.js';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
    const { zone, state } = req.body;
  
    if (!zone || state === undefined) {
      logger.warn('Missing required parameters: zone, state');
      res.status(400).send('anErrorOccurred');
      return;
    }
  
    try {
      await setTaskEnabler(zone, state);
      res.status(200).send('scheduleEnablerUpdated');
    } catch (error) {
      logger.error('Error while updating task enabler status:', error);
      res.status(500).send('internalServerError');
    }
});

export default router;
