import { describe, expect, it } from 'vitest';
import {
  getWeatherStationStatus,
  WEATHER_STATION_ERROR_MINUTES,
  WEATHER_STATION_REFETCH_MS,
  type WeatherLatestResponse,
} from './useWeatherStationStatus';

const NOW_MS = new Date('2026-06-28T12:00:00.000Z').getTime();

function weatherAt(minutesAgo: number, stale = false): WeatherLatestResponse {
  const observedAt = new Date(NOW_MS - minutesAgo * 60 * 1000).toISOString();
  return {
    latest: {
      observedAt,
      timestamp: observedAt,
      stale,
    },
  };
}

describe('getWeatherStationStatus', () => {
  it('does not report a fault while the initial weather query is pending', () => {
    const status = getWeatherStationStatus(undefined, false, NOW_MS, { isPending: true });

    expect(status.hasError).toBe(false);
    expect(status.errorReason).toBeNull();
  });

  it('does not flash a stale fault while an expired client cache is being verified', () => {
    const status = getWeatherStationStatus(
      weatherAt(WEATHER_STATION_ERROR_MINUTES + 1),
      false,
      NOW_MS,
      {
        isFetching: true,
        dataUpdatedAt: NOW_MS - WEATHER_STATION_REFETCH_MS - 1,
      },
    );

    expect(status.hasError).toBe(false);
    expect(status.errorReason).toBeNull();
  });

  it('reports stale when old weather data is not being refreshed', () => {
    const status = getWeatherStationStatus(weatherAt(WEATHER_STATION_ERROR_MINUTES), false, NOW_MS);

    expect(status.hasError).toBe(true);
    expect(status.errorReason).toBe('stale');
  });

  it('keeps server-marked stale data as a fault even during refetch', () => {
    const status = getWeatherStationStatus(
      weatherAt(1, true),
      false,
      NOW_MS,
      {
        isFetching: true,
        dataUpdatedAt: NOW_MS - WEATHER_STATION_REFETCH_MS - 1,
      },
    );

    expect(status.hasError).toBe(true);
    expect(status.errorReason).toBe('stale');
  });
});
