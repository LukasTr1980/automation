import { WeatherlinkClient } from '@lukastr1980/davis';
import logger from '../logger.js';
import * as vaultClient from './vaultClient.js';

interface WeatherlinkSecret {
  data?: {
    API_KEY?: string;
    API_SECRET?: string;
  };
}

export interface RainRateResult { rate: number; ok: boolean }

// Generic types for future metrics
export type SensorTypeCode = number;
export interface SensorBlock {
  sensor_type: SensorTypeCode;
  data?: Record<string, unknown>;
}

export interface MetricSpec<T = unknown> {
  // Name of the metric in the returned object
  name: string;
  // WeatherLink sensor_type that holds the metric (e.g., 37 for ISS)
  sensorType: SensorTypeCode;
  // Field to read from the sensor data
  field: string;
  // Optional fallbacks, e.g., inches when mm not present
  fallbacks?: {
    field: string;
    transform?: (v: unknown, data?: Record<string, unknown>) => T;
  }[];
  // Transform from raw value to desired type/units
  transform?: (v: unknown, data?: Record<string, unknown>) => T;
  // Default value when not found
  defaultValue?: T;
}

export interface MetricsResult<T extends Record<string, unknown>> {
  ok: boolean;
  metrics: T;
}

async function withWeatherlinkClient<T>(fn: (client: WeatherlinkClient) => Promise<T>): Promise<{ ok: boolean; value?: T }> {
  try {
    await vaultClient.login();
  } catch (e) {
    logger.error('[WEATHERLINK] Vault login failed', e);
    return { ok: false };
  }

  let apiKey: string | undefined;
  let apiSecret: string | undefined;
  try {
    const secret = (await vaultClient.getSecret('kv/data/automation/weatherlink')) as WeatherlinkSecret | null;
    apiKey = secret?.data?.API_KEY;
    apiSecret = secret?.data?.API_SECRET;
  } catch (e) {
    logger.error('[WEATHERLINK] Failed to fetch credentials from Vault', e);
    return { ok: false };
  }

  if (!apiKey || !apiSecret) {
    logger.error('[WEATHERLINK] API_KEY/API_SECRET missing in Vault secret kv/data/automation/weatherlink');
    return { ok: false };
  }

  try {
    const client = new WeatherlinkClient({ apiKey, apiSecret, axiosConfig: { timeout: 15_000 } });
    const value = await fn(client);
    return { ok: true, value };
  } catch (e) {
    logger.error('[WEATHERLINK] Client operation failed', e);
    return { ok: false };
  }
}

async function getFirstStationUUID(client: WeatherlinkClient): Promise<string | undefined> {
  const stations = await client.getStations();
  if (!stations.length) {
    logger.warn('[WEATHERLINK] No station found');
    return undefined;
  }
  return stations[0].station_id_uuid;
}

async function getCurrentSensorBlocks(client: WeatherlinkClient, stationUUID: string): Promise<SensorBlock[]> {
  const current = await client.getCurrent(stationUUID);
  if (!current) return [];
  return current.sensors
    .map((s: any) => {
      const first = Array.isArray(s?.data) ? s.data[0] : undefined;
      return { sensor_type: s?.sensor_type as number, data: first } as SensorBlock;
    })
    .filter(Boolean);
}

export async function getWeatherlinkMetrics<T extends Record<string, unknown>>(
  specs: MetricSpec[],
): Promise<MetricsResult<T>> {
  const res = await withWeatherlinkClient(async (client) => {
    const stationUUID = await getFirstStationUUID(client);
    if (!stationUUID) return { sensors: [] };
    const sensors = await getCurrentSensorBlocks(client, stationUUID);
    return { sensors } as { sensors: SensorBlock[] };
  });

  if (!res.ok || !res.value) return { ok: false, metrics: {} as T };
  const sensors = res.value.sensors;

  const metrics = Object.create(null) as Record<string, unknown>;
  for (const spec of specs) {
    const block = sensors.find((b) => b.sensor_type === spec.sensorType);
    const data = block?.data ?? {};

    let raw: unknown = (data as any)?.[spec.field];
    let value: unknown = undefined;
    if (raw !== undefined) {
      value = spec.transform ? spec.transform(raw, data) : raw;
    } else if (spec.fallbacks && spec.fallbacks.length) {
      for (const fb of spec.fallbacks) {
        const fbRaw: unknown = (data as any)?.[fb.field];
        if (fbRaw !== undefined) {
          value = fb.transform ? fb.transform(fbRaw, data) : fbRaw;
          break;
        }
      }
    }
    if (value === undefined) value = spec.defaultValue;
    metrics[spec.name] = value;
  }

  return { ok: true, metrics: metrics as T };
}

// Backwards-compatible helper focused on rain rate
export async function getRainRateFromWeatherlink(): Promise<RainRateResult> {
  try {
    const { ok, metrics } = await getWeatherlinkMetrics<{ rainRate?: number }>([
      {
        name: 'rainRate',
        sensorType: 37, // ISS
        field: 'rain_rate_last_mm',
        transform: (v) => (typeof v === 'number' && isFinite(v) ? v : 0), // mm/h already
        fallbacks: [
          { field: 'rain_rate_last_in', transform: (v) => (typeof v === 'number' && isFinite(v) ? v * 25.4 : 0) },
        ],
        defaultValue: 0,
      },
    ]);

    const rate = typeof metrics.rainRate === 'number' ? metrics.rainRate : 0;
    return { rate, ok };
  } catch (e) {
    logger.error('[WEATHERLINK] Error while fetching rain rate', e);
    return { rate: 0, ok: false };
  }
}
