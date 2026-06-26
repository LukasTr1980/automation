import express from 'express';
import { getTawMm, readSoilBucket } from '../utils/soilBucket.js';
import logger from '../logger.js';

const router = express.Router();
const DEFAULT_SOIL_BUCKET_ZONE = 'lukasSued';

router.get('/', async (_req, res) => {
  try {
    const bucket = await readSoilBucket(DEFAULT_SOIL_BUCKET_ZONE);
    if (!bucket) {
      return res.status(503).json({ error: 'soil_bucket_unavailable' });
    }

    const tawMm = getTawMm() || bucket.tawMm;
    res.json({
      zone: DEFAULT_SOIL_BUCKET_ZONE,
      soilStorageMm: bucket.sMm,
      tawMm,
      depletionMm: Math.max(0, tawMm - bucket.sMm),
      updatedAt: bucket.updatedAt,
    });
  } catch (error) {
    logger.error('Error fetching soil bucket from Redis', error as Error, { label: 'SoilBucketRoute' });
    res.status(500).json({ error: 'failed_to_fetch_soil_bucket' });
  }
});

export default router;
