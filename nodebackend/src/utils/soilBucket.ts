import { connectToRedis } from "../clients/redisClient.js";
import logger from "../logger.js";
import { readEt0DailyLast7FromRedis } from "./et0DailyStorage.js";
import { readWeatherAggregatesFromRedis } from "./weatherAggregatesStorage.js";

export interface SoilBucketState {
  sMm: number;       // current storage in mm
  tawMm: number;     // total available water in mm
  updatedAt: string; // ISO timestamp
}

export interface PendingIrrigationRun {
  zone: string;
  durationMin: number;
  depthMm: number;
  recordedAt: string;
}

export interface PendingIrrigationPayload {
  runs: PendingIrrigationRun[];
  updatedAt: string;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const keyForZone = (zone: string) => `soil:bucket:${zone}`;

function localDateKey(value = new Date()): string {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, '0');
  const dd = String(value.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function pendingKeyForDate(dayKey: string): string {
  return `soil:bucket:pending:${dayKey}`;
}

function averageDepthFromRuns(runs: PendingIrrigationRun[]): number {
  if (!runs.length) return 0;
  const sum = runs.reduce((total, run) => total + Math.max(0, run.depthMm), 0);
  return Math.round((sum / runs.length) * 100) / 100;
}

function isLegacyPendingIrrigation(value: unknown): value is { depthMm: number; recordedAt?: string } {
  return !!value
    && typeof value === 'object'
    && 'depthMm' in value
    && typeof (value as { depthMm?: unknown }).depthMm === 'number';
}

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

export async function queueIrrigationRunForDailyAverage(
  zone: string,
  durationMin: number,
  depthMm: number,
  recordedAt = new Date(),
): Promise<boolean> {
  try {
    const client = await connectToRedis();
    const dayKey = localDateKey(recordedAt);
    const pendingKey = pendingKeyForDate(dayKey);
    const raw = await client.get(pendingKey);
    const parsedPayload = raw ? JSON.parse(raw) as PendingIrrigationPayload | { depthMm?: number; recordedAt?: string } : null;
    const payload: PendingIrrigationPayload = isLegacyPendingIrrigation(parsedPayload)
      ? {
          runs: [{ zone: 'legacy', durationMin: 0, depthMm: parsedPayload.depthMm, recordedAt: parsedPayload.recordedAt ?? recordedAt.toISOString() }],
          updatedAt: parsedPayload.recordedAt ?? recordedAt.toISOString(),
        }
      : parsedPayload as PendingIrrigationPayload ?? { runs: [], updatedAt: recordedAt.toISOString() };
    const runs = Array.isArray(payload.runs) ? payload.runs : [];
    const existingIndex = runs.findIndex((run) => run.zone === zone);
    const nextRun: PendingIrrigationRun = {
      zone,
      durationMin,
      depthMm,
      recordedAt: recordedAt.toISOString(),
    };

    if (existingIndex >= 0 && runs[existingIndex].depthMm >= depthMm) {
      logger.info(`[Soil] Keeping existing irrigation run for ${zone} on ${dayKey}: ${runs[existingIndex].depthMm.toFixed(2)} mm >= ${depthMm.toFixed(2)} mm`);
      return false;
    }

    if (existingIndex >= 0) {
      runs[existingIndex] = nextRun;
    } else {
      runs.push(nextRun);
    }

    const nextPayload: PendingIrrigationPayload = {
      runs,
      updatedAt: new Date().toISOString(),
    };
    await client.set(pendingKey, JSON.stringify(nextPayload));
    await client.expire(pendingKey, 72 * 3600);

    logger.info(`[Soil] Queued irrigation run zone=${zone} duration=${durationMin.toFixed(0)} min depth=${depthMm.toFixed(2)} mm for ${dayKey}; daily average=${averageDepthFromRuns(runs).toFixed(2)} mm`);
    return true;
  } catch (err) {
    logger.error('[Soil] Failed to queue irrigation run for daily average', err as Error);
    return false;
  }
}

export async function readPendingIrrigationForDate(dayKey = localDateKey()): Promise<(PendingIrrigationPayload & { averageDepthMm: number }) | null> {
  try {
    const client = await connectToRedis();
    const raw = await client.get(pendingKeyForDate(dayKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingIrrigationPayload | { depthMm?: number; recordedAt?: string };
    if (isLegacyPendingIrrigation(parsed)) {
      return {
        runs: [{ zone: 'legacy', durationMin: 0, depthMm: parsed.depthMm, recordedAt: parsed.recordedAt ?? new Date().toISOString() }],
        updatedAt: parsed.recordedAt ?? new Date().toISOString(),
        averageDepthMm: parsed.depthMm,
      };
    }
    const runs = Array.isArray((parsed as PendingIrrigationPayload).runs) ? (parsed as PendingIrrigationPayload).runs : [];
    return {
      runs,
      updatedAt: (parsed as PendingIrrigationPayload).updatedAt,
      averageDepthMm: averageDepthFromRuns(runs),
    };
  } catch (err) {
    logger.error('[Soil] Failed reading pending irrigation runs', err as Error);
    return null;
  }
}

// Daily balance using yesterday's ET0 and rolling 24h rain (approx)
export async function dailySoilBalance(zone: string): Promise<void> {
  try {
    const current = await ensureSoilBucket(zone);
    const taw = getTawMm() || current.tawMm;

    let irrigationQueuedMm = 0;
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dayKey = localDateKey(yesterday);
      const pendingKey = pendingKeyForDate(dayKey);
      const client = await connectToRedis();
      const raw = await client.get(pendingKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as PendingIrrigationPayload | { depthMm?: number };
          if (isLegacyPendingIrrigation(parsed) && !Number.isNaN(parsed.depthMm)) {
            irrigationQueuedMm = parsed.depthMm;
          } else if (parsed && Array.isArray((parsed as PendingIrrigationPayload).runs)) {
            irrigationQueuedMm = averageDepthFromRuns((parsed as PendingIrrigationPayload).runs);
          }
        } catch {
          const fallback = Number(raw);
          if (Number.isFinite(fallback)) irrigationQueuedMm = fallback;
        }
        await client.del(pendingKey);
        logger.info(`[Soil] Consumed queued irrigation daily average ${irrigationQueuedMm.toFixed(2)} mm for ${pendingKey}`);
      }
    } catch (err) {
      logger.error('[Soil] Failed to consume queued irrigation amount', err as Error);
    }

    const et0Last7 = await readEt0DailyLast7FromRedis();
    let et0_yesterday = 0;
    if (et0Last7?.days?.length) {
      // Pick the last entry (most recent full local day)
      const latestEt0 = et0Last7.days[et0Last7.days.length - 1].et0mm;
      if (typeof latestEt0 === 'number' && Number.isFinite(latestEt0)) {
        et0_yesterday = latestEt0;
      } else {
        logger.warn('[Soil] Daily ET0 unavailable; skipping evapotranspiration debit for this balance run');
      }
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
