const express = require('express');
const router = express.Router();
const { connectToRedis } = require('../../shared/redisClient');
const bcrypt = require('bcrypt');

router.post('/', async (req, res) => {
    try {
      const { influxDbAiToken, influxDbAutomationToken, openAiApiToken, newPassword } = req.body;
      const client = await connectToRedis();
      let updatedFields = [];
  
      if (influxDbAiToken) {
        await client.set('influxdb_ai:token', influxDbAiToken);
        updatedFields.push('InfluxDB AI Token');
      }
  
      if (influxDbAutomationToken) {
        await client.set('influxdb_automation:token', influxDbAutomationToken);
        updatedFields.push('InfluxDB Automation Token');
      }
  
      if (openAiApiToken) {
        await client.set('openaiapi:token', openAiApiToken);
        updatedFields.push('OpenAI API Token');
      }
  
      if (newPassword) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await client.set('user:automation', hashedPassword);
        updatedFields.push('Password');
      }
  
      if (updatedFields.length === 0) {
        res.status(400).send('No fields to update.');
        return;
      }
  
      res.status(200).send(`Successfully updated: ${updatedFields.join(', ')}`);
    } catch (error) {
      console.error('Error while updating secrets', error);
      res.status(500).send('Internal server error');
    }
  });

module.exports = router;