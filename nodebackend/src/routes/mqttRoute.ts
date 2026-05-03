import express, { Request, Response } from 'express';
import { addSseClient, latestStates } from '../utils/mqttHandler.js';
import { createIrrigationDecision } from '../irrigationDecision.js';
import logger from '../logger.js';

const router = express.Router();
const HEARTBEAT_INTERVAL_MS = 25_000;

router.get('/', async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const heartbeat = setInterval(() => {
        res.write(`: heartbeat ${Date.now()}\n\n`);
    }, HEARTBEAT_INTERVAL_MS);
    req.on('close', () => {
        clearInterval(heartbeat);
    });

    addSseClient(res);
    res.write(`data: ${JSON.stringify({ type: 'switchState', latestStates })}\n\n`);

    if (req.query.checkIrrigation !== 'false') {
        try {
            const data = await createIrrigationDecision();
            if (data.result !== null) {
                const irrigationNeededData = {
                    type: 'irrigationNeeded',
                    state: data.result,
                    response: data.response
                };
                res.write(`data: ${JSON.stringify(irrigationNeededData)}\n\n`);
            }
        } catch (error) {
            logger.error('Failed to create irrigation decision for SSE stream', error);
            const irrigationNeededData = {
                type: 'irrigationNeeded',
                state: false,
                response: null
            };
            res.write(`data: ${JSON.stringify(irrigationNeededData)}\n\n`);
        }
    } else {
        // When AI verification is disabled, send a default irrigationNeeded event
        // to unblock the frontend loader.
        const irrigationNeededData = {
            type: 'irrigationNeeded',
            state: false,
            response: null
        };
        res.write(`data: ${JSON.stringify(irrigationNeededData)}\n\n`);
    }
});

export default router;
