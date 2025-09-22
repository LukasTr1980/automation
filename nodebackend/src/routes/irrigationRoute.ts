import express, { Request, Response } from 'express';
import logger from '../logger.js';
import { execute } from '../clients/questdbClient.js';
import { irrigationSwitchTopics, irrigationSwitchDescriptions } from '../utils/constants.js';
import { QUESTDB_TABLE_IRRIGATION_START_EVENTS } from '../utils/irrigationStartRecorder.js';

const router = express.Router();

function mapZoneLabel(zoneKey: string | undefined): string | null {
  if (!zoneKey) return null;
  const idx = irrigationSwitchTopics.findIndex((topic) => topic.endsWith(`/${zoneKey}`));
  return idx >= 0 ? irrigationSwitchDescriptions[idx] : null;
}

// Normalization is no longer needed here because the pg type parser
// returns QuestDB timestamps as strings (UTC with 'Z').

router.get('/last', async (_req: Request, res: Response) => {
  try {
    const result = await execute(
      `SELECT event_ts, zone, source
         FROM "${QUESTDB_TABLE_IRRIGATION_START_EVENTS}"
         WHERE started = true
         ORDER BY event_ts DESC
         LIMIT 1`
    );

    if (!result.rowCount) {
      return res.json({ last: null, source: 'questdb' });
    }

    const row = result.rows[0] as Record<string, unknown>;
    const zoneKey = typeof row.zone === 'string' ? row.zone : undefined;
    const zoneLabel = mapZoneLabel(zoneKey);
    const recordedVia = typeof row.source === 'string' ? row.source : null;
    const timestampValue = row.event_ts;
    let timestamp: string | null = null;
    if (timestampValue instanceof Date) {
      timestamp = timestampValue.toISOString();
    } else if (typeof timestampValue === 'number') {
      const parsed = new Date(timestampValue);
      timestamp = Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    } else if (typeof timestampValue === 'string') {
      // QuestDB returns UTC with 'Z' via HTTP; pg type parser is configured to return strings
      // so preserve the server-provided value as-is.
      timestamp = timestampValue.trim() || null;
    }

    if (!timestamp) {
      logger.warn('QuestDB returned irrigation start without parsable timestamp', row);
      return res.json({ last: null, source: 'questdb' });
    }

    return res.json({
      last: {
        timestamp,
        zone: zoneKey ?? null,
        zoneLabel,
        recordedVia,
      },
      source: 'questdb',
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('table does not exist')) {
      logger.info('irrigation_start_events missing in QuestDB; returning empty last irrigation payload');
      return res.json({ last: null, source: 'questdb' });
    }
    logger.error('Failed to fetch last irrigation from QuestDB', error);
    return res.status(500).json({ error: 'failedToFetchLastIrrigation' });
  }
});

export default router;
