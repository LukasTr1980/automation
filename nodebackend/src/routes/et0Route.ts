import express from 'express';
import { readLatestJsonlNumber } from '../utils/localDataWriter.js';
import logger from '../logger.js';

const router = express.Router();

router.get('/latest', async (req, res) => {
  try {
    const latestEt0 = await readLatestJsonlNumber('evapotranspiration_weekly', 'et0_week', 2);
    
    if (latestEt0 === null) {
      logger.warn('No ET₀ data found in recent files', { label: 'ET0Route' });
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