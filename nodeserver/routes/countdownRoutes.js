// countdownRoutes.js
const express = require('express');
const authMiddleware = require('../authMiddleware');
const { initiateCountdown, updateCountdowns } = require('../countdown');
const { connectToRedis } = require('../redisClient');
const { apiLimiter } = require('../rateLimiter');

module.exports = (app) => {
    const router = express.Router();

    router.get('/currentCountdowns', apiLimiter, authMiddleware, async (req, res) => {
        const client = await connectToRedis();
        const keys = await client.keys('countdown:*:value');  // Get keys for all countdown values
        const countdowns = {};
        for (let key of keys) {
            const topic = key.split(':')[1];
            const valueKey = `countdown:${topic}:value`;
            const hoursKey = `countdown:${topic}:countdownHours`;
            const minutesKey = `countdown:${topic}:countdownMinutes`;
            const controlKey = `countdown:${topic}:countdownControl`;
            
            // Fetch all relevant values from Redis
            const [value, hours, minutes, control] = await Promise.all([
                client.get(valueKey),
                client.get(hoursKey),
                client.get(minutesKey),
                client.get(controlKey)
            ]);

            const numericValue = parseInt(value, 10);
            
            // Construct a countdown object for each topic
            countdowns[topic] = {
                value: numericValue,
                hours,
                minutes,
                control
            };
        }
        res.json(countdowns);  // Send the countdowns as a JSON object
    });

    router.post('/setCountdown', apiLimiter, authMiddleware, async (req, res) => {
        const { topic, hours, minutes, action } = req.body;

        if (!topic || (action !== 'start' && action !== 'stop' && action !== 'reset')) {
            return res.status(400).send('Invalid parameters: topic and action are required, action must be start, stop, or reset');
        }

        const countdownPrefix = 'countdown:';
        const client = await connectToRedis();
        const controlKey = countdownPrefix + topic + ':countdownControl';
        const hoursKey = countdownPrefix + topic + ':countdownHours';
        const minutesKey = countdownPrefix + topic + ':countdownMinutes';

        // Set the hours and minutes values in Redis
        if (hours !== undefined) await client.set(hoursKey, hours.toString());
        if (minutes !== undefined) await client.set(minutesKey, minutes.toString());

        // Set the control signal in Redis
        await client.set(controlKey, action);

        if (action === 'start' || action === 'reset') {
            initiateCountdown(topic, hours, minutes, action);
        }

        await updateCountdowns(topic);

        let responseMessage;
        switch(action) {
            case 'start':
                responseMessage = 'Countdown gestartet';
                break;
            case 'stop':
                responseMessage = 'Countdown gestoppt';
                break;
            case 'reset':
                responseMessage = 'Countdown resettet';
                break;
            default:
                responseMessage = 'Aktion ausgeführt';
                break;
        }

        res.status(200).send(responseMessage);
    });

    app.use('/countdown', router);
};
