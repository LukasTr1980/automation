export interface LatestWeatherFreshnessData {
  timestamp: string;
  observedAt?: string;
  stale?: boolean;
}

export const CURRENT_WEATHER_STALE_MINUTES = 30;

export function getLatestWeatherObservedAt(data: LatestWeatherFreshnessData): string {
  return data.observedAt ?? data.timestamp;
}

export function isLatestWeatherFresh(data: LatestWeatherFreshnessData | null | undefined, nowMs = Date.now()): boolean {
  if (!data || data.stale === true) return false;
  const observedMs = new Date(getLatestWeatherObservedAt(data)).getTime();
  if (Number.isNaN(observedMs)) return false;
  return nowMs - observedMs < CURRENT_WEATHER_STALE_MINUTES * 60 * 1000;
}
