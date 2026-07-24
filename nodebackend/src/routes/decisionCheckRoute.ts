import express, { Request, Response } from 'express';
import {
  readDecisionCheckSkipped,
  writeDecisionCheckSkipped,
} from '../utils/decisionCheckState.js';

const router = express.Router();

// GET current decision-check skip state
router.get('/', async (_req: Request, res: Response) => {
  res.json({ skip: await readDecisionCheckSkipped() });
});

// POST { skip: boolean } to set the flag
router.post('/', async (req: Request, res: Response) => {
  const { skip } = req.body ?? {};
  if (typeof skip !== 'boolean') {
    return res.status(400).json({ error: 'Expected boolean "skip" in body' });
  }

  await writeDecisionCheckSkipped(skip);
  res.json({ skip });
});

export default router;
