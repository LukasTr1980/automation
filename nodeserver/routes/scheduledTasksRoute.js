const express = require('express');
const router = express.Router();
const { getScheduledTasks } = require('../scheduler');
const logger = require('../../nodebackend/build/logger').default;

router.get('/', async (req, res) => {
    try {
      const tasks = await getScheduledTasks();
      res.json(tasks);
    } catch (err) {
      logger.error(err);
      res.status(500).send('Error fetching scheduled tasks');
    }
  });

module.exports = router;