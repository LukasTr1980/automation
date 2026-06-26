import assert from 'node:assert';
import { reasonFromIrrigationBlockers } from '../utils/irrigationBlockerReason.js';
import logger from '../logger.js';

function run(): void {
  assert.equal(
    reasonFromIrrigationBlockers(['Wetterstation: aktuelle Daten fehlen oder sind veraltet']),
    'weather_station_error',
  );
  assert.equal(
    reasonFromIrrigationBlockers(['Rain (24h) ≥ 3 mm (4.1 mm)']),
    'rain_24h',
  );
  assert.equal(
    reasonFromIrrigationBlockers(['Boden nicht trocken genug: Entzug < 15.0 mm (aktuell 10.0 mm)']),
    'soil_wet',
  );

  logger.info('[Irrigation Blocker Reason Tests] OK');
}

run();
