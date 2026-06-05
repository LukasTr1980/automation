import type { SensorActivity } from '@lukastr1980/davis';
import { CURRENT_WEATHER_STALE_MINUTES } from './weatherFreshness.js';

export type SensorTypeCode = number;

export interface SensorBlock {
  lsid?: number;
  sensor_type: SensorTypeCode;
  data?: Record<string, unknown>;
}

export interface LatestWeatherSnapshot {
  ok: boolean;
  temperatureC: number | null;
  humidity: number | null;
  rainRateMmPerHour: number | null;
  observedAt: string | null;
  stale: boolean;
  staleMinutes: number | null;
  reason?: string;
}

const ISS_SENSOR_TYPE = 37;

function toIsoTimestamp(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const millis = value > 1e11 ? value : value * 1000;
  const date = new Date(millis);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getFirstTimestamp(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  for (const field of ['ts', 'timestamp', 'time_recorded', 'time_received', 'last_report_time']) {
    const timestamp = toIsoTimestamp(data[field]);
    if (timestamp) return timestamp;
  }
  return null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getSensorActivityTimestamp(activity: SensorActivity | undefined): string | null {
  return toIsoTimestamp(activity?.time_recorded) ?? toIsoTimestamp(activity?.time_received);
}

export function buildLatestWeatherSnapshotFromSensorData(
  sensors: SensorBlock[],
  activities: SensorActivity[],
  nowMs = Date.now(),
): LatestWeatherSnapshot {
  const iss = sensors.find((sensor) => sensor.sensor_type === ISS_SENSOR_TYPE);
  const data = iss?.data;
  const activity = activities.find((item) => item.lsid === iss?.lsid);
  const observedAt = getFirstTimestamp(data) ?? getSensorActivityTimestamp(activity);

  if (!iss || !data) {
    return {
      ok: false,
      temperatureC: null,
      humidity: null,
      rainRateMmPerHour: null,
      observedAt,
      stale: true,
      staleMinutes: null,
      reason: 'sensor_data_missing',
    };
  }

  if (!observedAt) {
    return {
      ok: false,
      temperatureC: null,
      humidity: null,
      rainRateMmPerHour: null,
      observedAt: null,
      stale: true,
      staleMinutes: null,
      reason: 'sensor_timestamp_missing',
    };
  }

  const temperatureCelsiusRaw = finiteNumber(data.temp_c);
  const temperatureFahrenheitRaw = finiteNumber(data.temp) ?? finiteNumber(data.temp_f) ?? finiteNumber(data.temp_out) ?? finiteNumber(data.outside_temp) ?? finiteNumber(data.temp_last);
  const humidityRaw = finiteNumber(data.hum) ?? finiteNumber(data.hum_out);
  const rainRateMmRaw = finiteNumber(data.rain_rate_last_mm);
  const rainRateInRaw = finiteNumber(data.rain_rate_last_in);
  const temperatureC = temperatureCelsiusRaw !== null
    ? Math.round(temperatureCelsiusRaw * 10) / 10
    : temperatureFahrenheitRaw !== null
      ? Math.round(((temperatureFahrenheitRaw - 32) * (5 / 9)) * 10) / 10
      : null;
  const humidity = humidityRaw !== null ? Math.round(humidityRaw) : null;
  const rainRateMmPerHour = rainRateMmRaw !== null
    ? Math.round(rainRateMmRaw * 10) / 10
    : rainRateInRaw !== null
      ? Math.round(rainRateInRaw * 25.4 * 10) / 10
      : null;
  const staleMinutes = Math.max(0, Math.floor((nowMs - new Date(observedAt).getTime()) / 60000));
  const stale = staleMinutes >= CURRENT_WEATHER_STALE_MINUTES;

  if (temperatureC === null && humidity === null && rainRateMmPerHour === null) {
    return {
      ok: false,
      temperatureC,
      humidity,
      rainRateMmPerHour,
      observedAt,
      stale,
      staleMinutes,
      reason: 'metric_values_missing',
    };
  }

  return {
    ok: true,
    temperatureC,
    humidity,
    rainRateMmPerHour,
    observedAt,
    stale,
    staleMinutes,
  };
}
