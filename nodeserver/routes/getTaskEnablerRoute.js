const express = require('express');
const router = express.Router();
const getTaskEnabler = require('../getTaskEnabler');
const logger = require('../../shared/build/logger').default;

router.get('/', async (req, res) => {
    const { zone } = req.query;
  
    if (!zone) {
      res.status(400).send('Missing required parameter: zone');
      return;
    }
  
    try {
      const state = await getTaskEnabler(zone);
      // Return the state
      res.status(200).json({ state });
    } catch (error) {
      logger.error('Error while getting task enabler status:', error);
      res.status(500).send('Internal server error');
    }
  });

module.exports = router;