import express, { Request, Response } from 'express';
import { sharedState } from '../utils/sharedState';

const router = express.Router();

// GET current skip-ai state
router.get('/', (_req: Request, res: Response) => {
  res.json({ skip: !!sharedState.skipAiVerification });
});

// POST { skip: boolean } to set the flag
router.post('/', (req: Request, res: Response) => {
  const { skip } = req.body ?? {};
  if (typeof skip !== 'boolean') {
    return res.status(400).json({ error: 'Expected boolean "skip" in body' });
  }

  sharedState.skipAiVerification = skip;
  res.json({ skip: sharedState.skipAiVerification });
});

export default router;

