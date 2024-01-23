import express, { Request, Response } from 'express';
import { connectToRedis } from '../clients/redisClient';
import logger from '../logger';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
    try {
        const { newGptRequest } = req.body;
        const client = await connectToRedis();
        await client.set("gptRequestKey", newGptRequest);
        res.status(200).send('GptRequestUpdated');
    } catch (error: unknown) {
        if (error instanceof Error) {
            logger.error('Error while updating GPT request:', error);
        } else {
            logger.error('An unexpected error occurred while updating GPT request');
        }
        res.status(500).send('internalServerError');
    }
});

export default router;
