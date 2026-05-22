import express from 'express';
import logger from '../logger.js';
import { execute as questDbQuery } from '../clients/questdbClient.js';
import { QUESTDB_TABLE_RADIATION, RADIATION_PRIMARY_STATION } from '../utils/radiationRecorder.js';

const router = express.Router();

function isMissingQuestDbTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /table does not exist|table not found|could not resolve table/i.test(message);
}

// GET /api/radiation/current – latest measured global radiation from QuestDB.
router.get('/current', async (_req, res) => {
  try {
    const { rows } = await questDbQuery(
      `SELECT observation_ts, station_code, station_name, global_radiation_w_m2, sunshine_duration_s, quality_flag
       FROM ${QUESTDB_TABLE_RADIATION}
       WHERE station_code = $1
       ORDER BY observation_ts DESC
       LIMIT 1`,
      [RADIATION_PRIMARY_STATION],
    );
    const row = rows?.[0];
    const radiation = Number(row?.global_radiation_w_m2);
    const ts = row?.observation_ts ? Date.parse(String(row.observation_ts)) : NaN;
    if (!row || !Number.isFinite(radiation) || !Number.isFinite(ts)) {
      return res.status(503).json({ error: 'No recent global radiation available', globalRadiationWM2: null });
    }

    const stale = Date.now() - ts > 30 * 60 * 1000 || row.quality_flag === 'stale';
    return res.json({
      globalRadiationWM2: Math.round(Math.max(0, radiation)),
      sunshineDurationS: Number.isFinite(Number(row.sunshine_duration_s)) ? Number(row.sunshine_duration_s) : null,
      stationCode: row.station_code ?? RADIATION_PRIMARY_STATION,
      stationName: row.station_name ?? row.station_code ?? RADIATION_PRIMARY_STATION,
      timestamp: new Date(ts).toISOString(),
      stale,
    });
  } catch (err) {
    if (isMissingQuestDbTable(err)) {
      return res.status(503).json({ error: 'No global radiation table available yet', globalRadiationWM2: null });
    }
    logger.error('Error querying global radiation from QuestDB', err as Error, { label: 'RadiationRoute' });
    res.status(500).json({ error: 'Failed to fetch global radiation' });
  }
});

export default router;
