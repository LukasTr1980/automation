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

export async function getRainRateFromWeatherlink(): Promise<RainRateResult> {
  try {
    await vaultClient.login();
  } catch (e) {
    logger.error('[WEATHERLINK] Vault login failed', e);
    return { rate: 0, ok: false };
  }

  let apiKey: string | undefined;
  let apiSecret: string | undefined;
  try {
    const secret = (await vaultClient.getSecret('kv/data/automation/weatherlink')) as WeatherlinkSecret | null;
    apiKey = secret?.data?.API_KEY;
    apiSecret = secret?.data?.API_SECRET;
  } catch (e) {
    logger.error('[WEATHERLINK] Failed to fetch credentials from Vault', e);
    return { rate: 0, ok: false };
  }

  if (!apiKey || !apiSecret) {
    logger.error('[WEATHERLINK] API_KEY/API_SECRET missing in Vault secret kv/data/automation/weatherlink');
    return { rate: 0, ok: false };
  }

  try {
    const client = new WeatherlinkClient({ apiKey, apiSecret, axiosConfig: { timeout: 15_000 } });

    const stations = await client.getStations();
    if (!stations.length) {
      logger.warn('[WEATHERLINK] No station found');
      return { rate: 0, ok: false };
    }

    const station = stations[0];
    const current = await client.getCurrent(station.station_id_uuid);
    if (!current) return { rate: 0, ok: false };

    // Find the ISS sensor block (sensor_type 37) containing rain metrics
    const iss = current.sensors.find(s => s && (s as any).sensor_type === 37) as any | undefined;
    const data = Array.isArray(iss?.data) ? iss!.data[0] : undefined;
    const mm = typeof data?.rain_rate_last_mm === 'number' ? data.rain_rate_last_mm : undefined;

    if (typeof mm === 'number' && isFinite(mm)) {
      return { rate: mm, ok: true }; // already in mm/h
    }

    // Fallbacks: try inches if mm absent
    const inches = typeof data?.rain_rate_last_in === 'number' ? data.rain_rate_last_in : undefined;
    if (typeof inches === 'number' && isFinite(inches)) {
      return { rate: inches * 25.4, ok: true }; // convert in/h to mm/h
    }
  } catch (e) {
    logger.error('[WEATHERLINK] Error while fetching rain rate', e);
  }

  return { rate: 0, ok: false };
}
