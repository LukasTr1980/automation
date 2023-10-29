const express = require('express');
const router = express.Router();
const { getScheduledTasks } = require('../scheduler');

router.get('/', async (req, res) => {
    try {
      const tasks = await getScheduledTasks();
      res.json(tasks);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching scheduled tasks');
    }
  });

module.exports = router;