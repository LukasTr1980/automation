import express from 'express';
import { Request, Response } from 'express';
import { connectToRedis } from '../clients/redisClient';
import logger from '../logger';

const router = express.Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
      const client = await connectToRedis();
      const gptRequest = await client.get("gptRequestKey");
      res.status(200).json({ gptRequest });
    } catch (error) {
      logger.error('Error while fetching GPT request:', error);
      res.status(500).send('internalServerError');
    }
});

export default router;
