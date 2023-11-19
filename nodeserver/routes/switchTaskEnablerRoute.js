const express = require('express');
const router = express.Router();
const setTaskEnabler = require('../switchTaskEnabler');
const logger = require('../../shared/build/logger');

router.post('/', async (req, res) => {
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

module.exports = router;