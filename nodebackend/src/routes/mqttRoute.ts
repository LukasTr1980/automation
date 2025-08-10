import express, { Request, Response } from 'express';
import { addSseClient, latestStates } from '../utils/mqttHandler.js';
import isIrrigationNeeded from '../gptChatIrrigation.js';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    addSseClient(res);
    res.write(`data: ${JSON.stringify({ type: 'switchState', latestStates })}\n\n`);

    if (req.query.checkIrrigation !== 'false') {
        const data = await isIrrigationNeeded();
        if (data.result !== null) {
            const irrigationNeededData = {
                type: 'irrigationNeeded',
                state: data.result,
                response: data.response,
                formattedEvaluation: data.formattedEvaluation
            };
            res.write(`data: ${JSON.stringify(irrigationNeededData)}\n\n`);
        }
    } else {
        // When AI verification is disabled, send a default irrigationNeeded event
        // to unblock the frontend loader.
        const irrigationNeededData = {
            type: 'irrigationNeeded',
            state: false,
            response: '',
            formattedEvaluation: ''
        };
        res.write(`data: ${JSON.stringify(irrigationNeededData)}\n\n`);
    }
});

export default router;
