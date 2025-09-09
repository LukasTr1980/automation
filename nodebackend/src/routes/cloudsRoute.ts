import express from 'express';
import logger from '../logger.js';
import { flux, ParameterizedQuery } from '@influxdata/influxdb-client';
import { querySingleData } from '../clients/influxdb-client.js';

const router = express.Router();

// GET /api/clouds/current – latest cloud cover percentage from Influx (measurement: dwd.clouds)
router.get('/current', async (req, res) => {
  try {
    const q: ParameterizedQuery = flux`
      from(bucket: "automation")
        |> range(start: -3h)
        |> filter(fn: (r) => r._measurement == "dwd.clouds")
        |> filter(fn: (r) => r._field == "value_numeric")
        |> last()
    `;
    const rows = await querySingleData(q);
    const v = rows?.[0]?.['_value'];
    if (typeof v !== 'number' || !isFinite(v)) {
      return res.status(503).json({ error: 'No recent cloud cover available', cloud: null });
    }
    // Return as integer percent (0..100)
    const cloud = Math.max(0, Math.min(100, Math.round(v)));
    return res.json({ cloud });
  } catch (err) {
    logger.error('Error querying cloud cover from Influx', err as Error, { label: 'CloudsRoute' });
    res.status(500).json({ error: 'Failed to fetch cloud cover' });
  }
});

export default router;

