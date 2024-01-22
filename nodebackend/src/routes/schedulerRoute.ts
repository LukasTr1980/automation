import express from 'express';
import { scheduleTask } from '../scheduler';
import logger from '../logger';

const router = express.Router();

// Define the RecurrenceRule interface as per your scheduler's expectations
interface RecurrenceRule {
  hour: number;
  minute: number;
  dayOfWeek: number[];
  month: number[];
}

router.post('/', async (req: express.Request, res: express.Response) => {
    const { topic, state, days, months, hour, minute } = req.body;
  
    if (!topic || state === undefined || !days || !months || !hour || !minute) {
      logger.warn('Missing required parameters: topic, state, days, months, hour, minute');
      res.status(400).send('anErrorOccurred');
      return;
    }
  
    // Create recurrence rule as an object
    const recurrenceRule: RecurrenceRule = {
      hour: Number(hour),
      minute: Number(minute),
      dayOfWeek: days,
      month: months,
    };
  
    try {
      await scheduleTask(topic, state, recurrenceRule);
      res.status(200).send('scheduleCreated');
    } catch (error) {
      logger.error('Error while scheduling task:', error);
      res.status(500).send('internalServerError');
    }
});

export default router;
