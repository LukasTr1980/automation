import express, { Request, Response } from 'express';
import { flux as fluxTag } from '@influxdata/influxdb-client';
import logger from '../logger.js';
import { getInfluxDbClientAutomation } from '../configs.js';
import { irrigationSwitchTopics, irrigationSwitchDescriptions } from '../utils/constants.js';

const router = express.Router();

// Helper: map zone key (e.g., 'stefanNord') to human-readable label (e.g., 'Stefan Nord')
function mapZoneLabel(zoneKey: string | undefined): string | null {
  if (!zoneKey) return null;
  const idx = irrigationSwitchTopics.findIndex(t => t.endsWith('/' + zoneKey));
  return idx >= 0 ? irrigationSwitchDescriptions[idx] : null;
}

router.get('/last', async (_req: Request, res: Response) => {
  try {
    const influx = await getInfluxDbClientAutomation();
    const queryApi = influx.getQueryApi('villaanna');

    // Find most recent irrigation_start across zones (looks back 365d)
    const flux = fluxTag`
      from(bucket: "automation")
        |> range(start: -365d)
        |> filter(fn: (r) => r["_measurement"] == "irrigation_start")
        |> filter(fn: (r) => r["_field"] == "started")
        |> keep(columns: ["_time", "_value", "zone"]) 
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 1)
    `;

    const rows: any[] = [];
    await new Promise<void>((resolve, reject) => {
      queryApi.queryRows(flux, {
        next(row: unknown, tableMeta: any) {
          rows.push(tableMeta.toObject(row as any));
        },
        error(err: unknown) {
          logger.error('Error querying last irrigation from InfluxDB', err);
          reject(err);
        },
        complete() {
          resolve();
        },
      });
    });

    if (!rows.length) {
      return res.json({ last: null, source: 'influx' });
    }

    const row = rows[0];
    const zoneKey = row.zone as string | undefined;
    const zoneLabel = mapZoneLabel(zoneKey);
    const timestamp = row._time as string; // ISO timestamp

    return res.json({ last: { timestamp, zone: zoneKey ?? null, zoneLabel }, source: 'influx' });
  } catch (e) {
    logger.error('Failed to fetch last irrigation from InfluxDB', e);
    return res.status(500).json({ error: 'failedToFetchLastIrrigation' });
  }
});

export default router;
