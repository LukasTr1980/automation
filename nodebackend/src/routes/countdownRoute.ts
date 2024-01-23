// countdownRoutes.ts
import express, { Request, Response } from 'express';
import { initiateCountdown, updateCountdowns } from '../utils/countdown';
import { connectToRedis } from '../clients/redisClient';
import logger from '../logger';

interface Countdown {
    value: number;
    hours: string | null;
    minutes: string | null;
    control: string | null;
}

const router = express.Router();

router.get('/currentCountdowns', async (req: Request, res: Response) => {
    const client = await connectToRedis();
    const keys = await client.keys('countdown:*:value'); // Get keys for all countdown values
    const countdowns: { [key: string]: Countdown } = {};
    for (const key of keys) {
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

        const numericValue = value !== null ? parseInt(value, 10) : 0;

        // Construct a countdown object for each topic
        countdowns[topic] = {
            value: numericValue,
            hours,
            minutes,
            control
        };
    }
    res.json(countdowns); // Send the countdowns as a JSON object
});

router.post('/setCountdown', async (req: Request, res: Response) => {
    const { topic, hours, minutes, action } = req.body;

    if (!topic || (action !== 'start' && action !== 'stop' && action !== 'reset')) {
        logger.warn('Invalid parameters: topic and action are required, action must be start, stop, or reset');
        return res.status(400).send('anErrorOccurred');
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
    switch (action) {
        case 'start':
            responseMessage = 'countdownStarted';
            break;
        case 'stop':
            responseMessage = 'countdownStopped';
            break;
        case 'reset':
            responseMessage = 'countdownReset';
            break;
        default:
            responseMessage = 'actionExecuted';
            break;
    }

    res.status(200).send(responseMessage);
});

export default router;
