import assert from 'node:assert';
import logger from '../logger.js';
import { createDecisionAwareIrrigationSummary } from '../utils/nextIrrigationStatus.js';

function run(): void {
  const nextTimestamp = '2026-07-24T19:00:00.000Z';
  const zone = 'Stefan Nord';

  const blocked = createDecisionAwareIrrigationSummary({
    inSeason: true,
    decisionCheckSkipped: false,
    decisionAvailable: true,
    blockerReason: 'soil_wet',
    blockerCount: 1,
    nextTimestamp,
    zone,
  });
  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.reasonKey, 'soil_wet');
  assert.equal(blocked.decisionCheckSkipped, false);

  const skipped = createDecisionAwareIrrigationSummary({
    inSeason: true,
    decisionCheckSkipped: true,
    decisionAvailable: true,
    blockerReason: 'soil_wet',
    blockerCount: 1,
    nextTimestamp,
    zone,
  });
  assert.equal(skipped.status, 'planned');
  assert.equal(skipped.reasonKey, 'decision_check_disabled');
  assert.equal(skipped.blockerCount, 1);
  assert.equal(skipped.decisionCheckSkipped, true);

  const skippedWithoutDecision = createDecisionAwareIrrigationSummary({
    inSeason: true,
    decisionCheckSkipped: true,
    decisionAvailable: false,
    nextTimestamp,
    zone,
  });
  assert.equal(skippedWithoutDecision.status, 'planned');
  assert.equal(skippedWithoutDecision.reasonKey, 'decision_check_disabled');

  const outOfSeason = createDecisionAwareIrrigationSummary({
    inSeason: false,
    decisionCheckSkipped: true,
    decisionAvailable: true,
    blockerReason: 'soil_wet',
    blockerCount: 1,
    nextTimestamp,
    zone,
  });
  assert.equal(outOfSeason.status, 'out_of_season');
  assert.equal(outOfSeason.reasonKey, 'out_of_season');
  assert.equal(outOfSeason.decisionCheckSkipped, true);

  logger.info('[Next Irrigation Status Tests] OK');
}

run();
