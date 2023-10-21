// countdownRoutes.js
const express = require('express');
const authMiddleware = require('./authMiddleware');
const { initiateCountdown, updateCountdowns } = require('./countdown');
const connectToRedis = require('../redisClient');

module.exports = (app) => {
    const router = express.Router();

    router.post('/setCountdown', authMiddleware, async (req, res) => {
        const { topic, hours, minutes, action } = req.body;

        if (!topic || (action !== 'start' && action !== 'stop' && action !== 'reset')) {
            return res.status(400).send('Invalid parameters: topic and action are required, action must be start, stop, or reset');
        }

        const client = await connectToRedis();
        const controlKey = topic + ':countdownControl';
        const hoursKey = topic + ':countdownHours';
        const minutesKey = topic + ':countdownMinutes';

        // Set the hours and minutes values in Redis
        if (hours !== undefined) await client.set(hoursKey, hours.toString());
        if (minutes !== undefined) await client.set(minutesKey, minutes.toString());

        // Set the control signal in Redis
        await client.set(controlKey, action);

        if (action === 'start' || action === 'reset') {
            initiateCountdown(topic, hours, minutes);
        }

        // Optionally, you may want to trigger an update of all countdowns
        // updateCountdowns();

        res.status(200).send('Countdown updated successfully');
    });

    app.use('/countdown', router);
};
