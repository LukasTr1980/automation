import express, { Request, Response } from 'express';
import setTaskEnabler from '../utils/switchTaskEnabler';
import logger from '../logger';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
    const { zone, state } = req.body;
  
    if (!zone || state === undefined) {
      res.status(400).send('Missing required parameters: zone, state');
      return;
    }
  
    try {
      await setTaskEnabler(zone, state);
      res.status(200).send('Task enabler status updated successfully');
    } catch (error) {
      logger.error('Error while updating task enabler status:', error);
      res.status(500).send('Internal server error');
    }
});

export default router;
