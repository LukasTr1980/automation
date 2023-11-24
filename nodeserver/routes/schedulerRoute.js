const express = require('express');
const router = express.Router();
const { scheduleTask } = require('../scheduler');
const logger = require('../../nodebackend/build/logger').default;

router.post('/', async (req, res) => {
    const { topic, state, days, months, hour, minute } = req.body;
  
    if (!topic || state === undefined || !days || !months || !hour || !minute) {
      res.status(400).send('Missing required parameters: topic, state, days, months, hour, minute');
      return;
    }
  
    // Create recurrence rule
    const recurrenceRule = {
      hour: Number(hour),
      minute: Number(minute),
      dayOfWeek: days,
      month: months,
    };
  
    try {
      await scheduleTask(topic, state, recurrenceRule);
      res.status(200).send('Zeitplan erstellt');
    } catch (error) {
      logger.error('Error while scheduling task:', error);
      res.status(500).send('Internal server error');
    }
  });

module.exports = router;