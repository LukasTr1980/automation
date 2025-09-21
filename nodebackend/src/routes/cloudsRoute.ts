import express from 'express';
import logger from '../logger.js';
import { execute as questDbQuery } from '../clients/questdbClient.js';

const router = express.Router();

// GET /api/clouds/current – latest cloud cover percentage from Influx (measurement: dwd.clouds)
router.get('/current', async (req, res) => {
  try {
    const { rows } = await questDbQuery(
      'SELECT cloud_cover_pct FROM weather_dwd_icon_observations WHERE observation_ts >= now() - interval \'3\' hour ORDER BY observation_ts DESC LIMIT 1'
    );
    const v = rows?.[0]?.cloud_cover_pct;
    if (typeof v !== 'number' || !isFinite(v)) {
      return res.status(503).json({ error: 'No recent cloud cover available', cloud: null });
    }
    const cloud = Math.max(0, Math.min(100, Math.round(v)));
    return res.json({ cloud });
  } catch (err) {
    logger.error('Error querying cloud cover from QuestDB', err as Error, { label: 'CloudsRoute' });
    res.status(500).json({ error: 'Failed to fetch cloud cover' });
  }
});

export default router;
