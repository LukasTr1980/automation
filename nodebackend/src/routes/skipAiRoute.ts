import express, { Request, Response } from 'express';
import { connectToRedis } from '../clients/redisClient';
import { skipAiRedisKey } from '../utils/constants';

const router = express.Router();

// GET current skip-ai state
router.get('/', async (_req: Request, res: Response) => {
  const client = await connectToRedis();
  const value = await client.get(skipAiRedisKey);
  res.json({ skip: value === 'true' });
});

// POST { skip: boolean } to set the flag
router.post('/', async (req: Request, res: Response) => {
  const { skip } = req.body ?? {};
  if (typeof skip !== 'boolean') {
    return res.status(400).json({ error: 'Expected boolean "skip" in body' });
  }

  const client = await connectToRedis();
  await client.set(skipAiRedisKey, skip ? 'true' : 'false');
  res.json({ skip });
});

export default router;

