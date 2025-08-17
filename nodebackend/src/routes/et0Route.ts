import express from 'express';
import { readLatestWeeklyET0FromRedis } from '../utils/et0Storage.js';
import logger from '../logger.js';

const router = express.Router();

router.get('/latest', async (req, res) => {
  try {
    const latestEt0 = await readLatestWeeklyET0FromRedis(2);
    
    if (latestEt0 === null) {
      logger.warn('No ET₀ data found in Redis (recent days)', { label: 'ET0Route' });
      return res.status(404).json({ 
        error: 'No recent evapotranspiration data found',
        et0_week: null 
      });
    }

    logger.info(`Retrieved latest weekly ET₀: ${latestEt0} mm`, { label: 'ET0Route' });
    
    res.json({ 
      et0_week: latestEt0,
      unit: 'mm',
      period: 'last 7 days'
    });
  } catch (error) {
    logger.error('Error fetching latest ET₀ data', error as Error, { label: 'ET0Route' });
    res.status(500).json({ 
      error: 'Failed to fetch evapotranspiration data',
      et0_week: null 
    });
  }
});

export default router;
