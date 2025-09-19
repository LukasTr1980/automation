import { connectToRedis } from "../clients/redisClient.js";
import logger from "../logger.js";
import { readEt0DailyLast7FromRedis } from "./et0DailyStorage.js";
import { readWeatherAggregatesFromRedis } from "./weatherAggregatesStorage.js";

export interface SoilBucketState {
  sMm: number;       // current storage in mm
  tawMm: number;     // total available water in mm
  updatedAt: string; // ISO timestamp
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const keyForZone = (zone: string) => `soil:bucket:${zone}`;

export function getTawMm(): number {
  const ROOT_DEPTH_M = Number(process.env.IRR_ROOT_DEPTH_M ?? 0.30);
  const AWC_MM_PER_M = Number(process.env.IRR_AWC_MM_PER_M ?? 100);
  const TAW = ROOT_DEPTH_M * AWC_MM_PER_M;
  return Number.isFinite(TAW) && TAW > 0 ? TAW : 0;
}

export async function readSoilBucket(zone: string): Promise<SoilBucketState | null> {
  try {
    const client = await connectToRedis();
    const raw = await client.get(keyForZone(zone));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SoilBucketState;
    if (!parsed || typeof parsed.sMm !== 'number' || typeof parsed.tawMm !== 'number') return null;
    return parsed;
  } catch (err) {
    logger.error(`Failed reading soil bucket for ${zone}`, err as Error);
    return null;
  }
}

export async function writeSoilBucket(zone: string, state: SoilBucketState): Promise<void> {
  try {
    const client = await connectToRedis();
    await client.set(keyForZone(zone), JSON.stringify(state));
  } catch (err) {
    logger.error(`Failed writing soil bucket for ${zone}`, err as Error);
  }
}

export async function ensureSoilBucket(zone: string): Promise<SoilBucketState> {
  const existing = await readSoilBucket(zone);
  if (existing) return existing;
  const tawMm = getTawMm();
  const init = clamp(tawMm * 0.5, 0, tawMm); // start at 50% if unknown
  const state: SoilBucketState = { sMm: init, tawMm, updatedAt: new Date().toISOString() };
  await writeSoilBucket(zone, state);
  logger.info(`[Soil] Initialized bucket for ${zone}: S=${init.toFixed(1)} mm, TAW=${tawMm.toFixed(1)} mm`);
  return state;
}

// Apply irrigation immediately on start events (depthMm from pump specs)
export async function addIrrigationToBucket(zone: string, depthMm: number): Promise<void> {
  try {
    const taw = getTawMm();
    const current = await ensureSoilBucket(zone);
    const newS = clamp(current.sMm + Math.max(0, depthMm), 0, taw || current.tawMm);
    const state: SoilBucketState = {
      sMm: newS,
      tawMm: taw || current.tawMm,
      updatedAt: new Date().toISOString(),
    };
    await writeSoilBucket(zone, state);
    logger.info(`[Soil] +Irrigation ${depthMm.toFixed(2)} mm → S=${newS.toFixed(2)} mm (zone=${zone})`);
  } catch (err) {
    logger.error(`[Soil] Failed to apply irrigation to bucket for ${zone}`, err as Error);
  }
}

// Idempotent application: ensure irrigation is only counted once across zones within a time window
export async function addIrrigationToGlobalBucketOnce(depthMm: number): Promise<boolean> {
  try {
    const client = await connectToRedis();
    // Daily idempotency key (local date)
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dayKey = `${yyyy}-${mm}-${dd}`;
    const dailyKey = `soil:bucket:applied:${dayKey}`;
    const pendingKey = `soil:bucket:pending:${dayKey}`;
    // Try to set once per day; expire after 36h to avoid key buildup
    const appliedToday = await client.setnx(dailyKey, '1');
    if (appliedToday === 0) {
      logger.info(`[Soil] Skipping irrigation queue: already captured for ${dayKey}`);
      return false;
    }
    await client.expire(dailyKey, 36 * 3600);

    const payload = {
      depthMm,
      recordedAt: now.toISOString(),
    };
    await client.set(pendingKey, JSON.stringify(payload));
    await client.expire(pendingKey, 72 * 3600);

    logger.info(`[Soil] Queued irrigation ${depthMm.toFixed(2)} mm for ${dayKey}`);
    return true;
  } catch (err) {
    logger.error('[Soil] Failed to apply idempotent irrigation to global bucket', err as Error);
    return false;
  }
}

// Daily balance using yesterday's ET0 and rolling 24h rain (approx)
export async function dailySoilBalance(zone: string): Promise<void> {
  try {
    const current = await ensureSoilBucket(zone);
    const taw = getTawMm() || current.tawMm;

    let irrigationQueuedMm = 0;
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const d = now.getDate();
      const yesterday = new Date(y, m, d - 1);
      const yyyy = yesterday.getFullYear();
      const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
      const dd = String(yesterday.getDate()).padStart(2, '0');
      const pendingKey = `soil:bucket:pending:${yyyy}-${mm}-${dd}`;

      const client = await connectToRedis();
      const raw = await client.get(pendingKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { depthMm?: number };
          if (parsed && typeof parsed.depthMm === 'number' && !Number.isNaN(parsed.depthMm)) {
            irrigationQueuedMm = parsed.depthMm;
          }
        } catch {
          const fallback = Number(raw);
          if (Number.isFinite(fallback)) irrigationQueuedMm = fallback;
        }
        await client.del(pendingKey);
        logger.info(`[Soil] Consumed queued irrigation ${irrigationQueuedMm.toFixed(2)} mm for ${pendingKey}`);
      }
    } catch (err) {
      logger.error('[Soil] Failed to consume queued irrigation amount', err as Error);
    }

    const et0Last7 = await readEt0DailyLast7FromRedis();
    let et0_yesterday = 0;
    if (et0Last7?.days?.length) {
      // Pick the last entry (most recent full local day)
      et0_yesterday = Number(et0Last7.days[et0Last7.days.length - 1].et0mm) || 0;
    }

    const agg = await readWeatherAggregatesFromRedis();
    const rain24h = Number(agg?.rain24hMm ?? 0) || 0;

    let sInterim = current.sMm;
    let irrigationEff = 0;
    if (irrigationQueuedMm > 0) {
      irrigationEff = Math.min(irrigationQueuedMm, Math.max(0, taw - sInterim));
      sInterim += irrigationEff;
    }

    // Simple infiltration with saturation: only fill up to TAW
    let rainEff = 0;
    if (rain24h > 0) {
      rainEff = Math.min(rain24h, Math.max(0, taw - sInterim));
      sInterim += rainEff;
    }

    const sAfter = clamp(sInterim - Math.max(0, et0_yesterday), 0, taw);
    const state: SoilBucketState = { sMm: sAfter, tawMm: taw, updatedAt: new Date().toISOString() };
    await writeSoilBucket(zone, state);
    logger.info(`[Soil] Daily balance (zone=${zone}): +irr=${irrigationEff.toFixed(2)} mm, +rainEff=${rainEff.toFixed(2)} mm, -ET0=${et0_yesterday.toFixed(2)} mm → S=${sAfter.toFixed(2)} mm / TAW=${taw.toFixed(1)} mm`);
  } catch (err) {
    logger.error(`[Soil] Failed daily soil balance for ${zone}`, err as Error);
  }
}
