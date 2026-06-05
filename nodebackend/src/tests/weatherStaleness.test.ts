import assert from 'node:assert';
import type { SensorActivity } from '@lukastr1980/davis';
import {
  buildLatestWeatherSnapshotFromSensorData,
  type SensorBlock,
} from '../utils/weatherSnapshot.js';
import {
  type LatestWeather,
} from '../utils/weatherLatestStorage.js';
import { isLatestWeatherFresh } from '../utils/weatherFreshness.js';
import logger from '../logger.js';

const NOW_MS = Date.parse('2026-06-05T12:00:00.000Z');
const FIVE_MINUTES_AGO_SECONDS = Math.floor((NOW_MS - 5 * 60 * 1000) / 1000);
const THREE_DAYS_AGO_SECONDS = Math.floor((NOW_MS - 3 * 24 * 60 * 60 * 1000) / 1000);

function issSensor(data: Record<string, unknown>): SensorBlock {
  return {
    lsid: 123,
    sensor_type: 37,
    data,
  };
}

function activity(timeRecorded: number): SensorActivity {
  return {
    lsid: 123,
    time_recorded: timeRecorded,
    time_received: timeRecorded,
  };
}

function run(): void {
  const fresh = buildLatestWeatherSnapshotFromSensorData(
    [issSensor({ temp: 68, hum: 55, rain_rate_last_in: 0.01 })],
    [activity(FIVE_MINUTES_AGO_SECONDS)],
    NOW_MS,
  );

  assert.equal(fresh.ok, true);
  assert.equal(fresh.stale, false);
  assert.equal(fresh.staleMinutes, 5);
  assert.equal(fresh.temperatureC, 20);
  assert.equal(fresh.humidity, 55);
  assert.equal(fresh.rainRateMmPerHour, 0.3);

  const stale = buildLatestWeatherSnapshotFromSensorData(
    [issSensor({ temp_c: 12.3, hum: 70, rain_rate_last_mm: 0 })],
    [activity(THREE_DAYS_AGO_SECONDS)],
    NOW_MS,
  );

  assert.equal(stale.ok, true);
  assert.equal(stale.stale, true);
  assert.equal(stale.staleMinutes, 3 * 24 * 60);
  assert.equal(stale.temperatureC, 12.3);

  const cachedNowButObservedOld: LatestWeather = {
    temperatureC: stale.temperatureC,
    humidity: stale.humidity,
    rainRateMmPerHour: stale.rainRateMmPerHour,
    timestamp: stale.observedAt!,
    observedAt: stale.observedAt!,
    cachedAt: new Date(NOW_MS).toISOString(),
    stale: stale.stale,
  };

  assert.equal(isLatestWeatherFresh(cachedNowButObservedOld, NOW_MS), false);

  const missingTimestamp = buildLatestWeatherSnapshotFromSensorData(
    [issSensor({ temp: 68, hum: 55, rain_rate_last_in: 0 })],
    [],
    NOW_MS,
  );

  assert.equal(missingTimestamp.ok, false);
  assert.equal(missingTimestamp.stale, true);
  assert.equal(missingTimestamp.reason, 'sensor_timestamp_missing');

  logger.info('[Weather Staleness Tests] OK');
}

run();
