import express from 'express';
import { readEt0DailyLast7FromRedis } from '../utils/et0DailyStorage.js';
import logger from '../logger.js';

const router = express.Router();

// New: Yesterday's daily ET0 (mm) for UI
router.get('/yesterday', async (_req, res) => {
  try {
    const payload = await readEt0DailyLast7FromRedis();
    const days = payload?.days || [];
    if (!days.length) {
      logger.warn('No daily ET₀ data found in Redis', { label: 'ET0Route' });
      return res.status(404).json({ error: 'No ET0 daily data found', et0mm: null });
    }
    const yesterday = days[days.length - 1];
    res.json({ date: yesterday.date, et0mm: yesterday.et0mm, unit: 'mm' });
  } catch (error) {
    logger.error('Error fetching ET₀ daily data', error as Error, { label: 'ET0Route' });
    res.status(500).json({ error: 'Failed to fetch ET0 daily data', et0mm: null });
  }
});

export default router;
