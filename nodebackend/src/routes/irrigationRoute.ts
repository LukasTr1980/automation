import express, { Request, Response } from 'express';
import logger from '../logger.js';
import { execute } from '../clients/questdbClient.js';
import { irrigationSwitchTopics, irrigationSwitchDescriptions } from '../utils/constants.js';
import { QUESTDB_TABLE_IRRIGATION_EVENTS } from '../utils/irrigationEventsRecorder.js';
import {
  CALIBRATED_MM_PER_MIN,
  CUP_TEST_SAMPLES,
  DEFAULT_RUN_DEPTH_MM,
  DEFAULT_RUN_DURATION_MIN,
} from '../utils/irrigationDepthService.js';
import { readPendingIrrigationForDate } from '../utils/soilBucket.js';
import { getScheduledIrrigationDepthPreview } from '../scheduler.js';

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
      `SELECT event_ts, zone, recorded_via
         FROM "${QUESTDB_TABLE_IRRIGATION_EVENTS}"
         WHERE state_boolean = true AND recorded_via = 'scheduler'
         ORDER BY event_ts DESC
         LIMIT 1`
    );

    if (!result.rowCount) {
      return res.json({ last: null, source: 'questdb' });
    }

    const row = result.rows[0] as Record<string, unknown>;
    const zoneKey = typeof row.zone === 'string' ? row.zone : undefined;
    const zoneLabel = mapZoneLabel(zoneKey);
    const recordedVia = typeof row.recorded_via === 'string' ? row.recorded_via : null;
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
      logger.info('irrigation_events missing in QuestDB; returning empty last irrigation payload');
      return res.json({ last: null, source: 'questdb' });
    }
    logger.error('Failed to fetch last irrigation from QuestDB', error);
    return res.status(500).json({ error: 'failedToFetchLastIrrigation' });
  }
});

router.get('/depth-calibration', async (_req: Request, res: Response) => {
  try {
    const [scheduled, pendingToday] = await Promise.all([
      getScheduledIrrigationDepthPreview(),
      readPendingIrrigationForDate(),
    ]);

    return res.json({
      source: 'cup-test',
      mmPerMin: CALIBRATED_MM_PER_MIN,
      defaultDurationMin: DEFAULT_RUN_DURATION_MIN,
      defaultDepthMm: DEFAULT_RUN_DEPTH_MM,
      samples: CUP_TEST_SAMPLES,
      scheduled,
      pendingToday,
    });
  } catch (error) {
    logger.error('Failed to fetch irrigation depth calibration', error);
    return res.status(500).json({ error: 'failedToFetchIrrigationDepthCalibration' });
  }
});

export default router;
