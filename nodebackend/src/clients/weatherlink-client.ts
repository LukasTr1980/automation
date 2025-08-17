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
export interface RainRateOptions { units?: 'metric' | 'imperial' }

// ===================== RAINFALL TOTALS =====================

export interface RainTotalChunk {
  start: number;
  end: number;
  total: number; // rain total within chunk (mm or inches)
  count: number; // contributing records
}

export interface RainTotalRangeOptions {
  end?: Date | number;
  windowSeconds?: number; // total range length
  chunkSeconds?: number; // max 86400 due to API
  units?: 'metric' | 'imperial'; // metric: mm, imperial: inches
}

export interface RainTotalRangeResult {
  ok: boolean;
  total: number; // total rain over the full window (mm or inches)
  chunks: RainTotalChunk[]; // typically daily chunks if chunkSeconds=86400
  units: 'metric' | 'imperial';
}

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

// Simple sliding-window rate limiter: max 10 req/sec and 1000 req/hour
class SlidingWindowRateLimiter {
  private perSecond: number;
  private perHour: number;
  private recentSecond: number[] = [];
  private recentHour: number[] = [];
  private queue: Array<{
    fn: () => Promise<unknown>;
    resolve: (v: unknown) => void;
    reject: (e: unknown) => void;
  }> = [];
  private timer: NodeJS.Timeout | null = null;
  private processing = false;

  constructor(perSecond: number, perHour: number) {
    this.perSecond = perSecond;
    this.perHour = perHour;
  }

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Wrap resolve/reject to match our stored callback types (unknown)
      const wrappedResolve = (v: unknown) => resolve(v as T);
      const wrappedReject = (e: unknown) => reject(e as any);
      this.queue.push({ fn: fn as () => Promise<unknown>, resolve: wrappedResolve, reject: wrappedReject });
      if (this.queue.length > 5) {
        logger.info(`[WEATHERLINK] Queue building up: ${this.queue.length} requests pending`);
      }
      this.schedule();
    });
  }

  private schedule(): void {
    if (this.processing) return;
    // If a wake-up is already scheduled, let it fire
    if (this.timer) return;
    this.process();
  }

  private prune(now: number): void {
    const secAgo = now - 1000;
    while (this.recentSecond.length && this.recentSecond[0] <= secAgo) this.recentSecond.shift();
    const hourAgo = now - 3600000;
    while (this.recentHour.length && this.recentHour[0] <= hourAgo) this.recentHour.shift();
  }

  private allowed(now: number): boolean {
    this.prune(now);
    return this.recentSecond.length < this.perSecond && this.recentHour.length < this.perHour;
  }

  private nextWait(now: number): number {
    // Compute time until a slot frees up in either window
    this.prune(now);
    let waitSec = 0;
    if (this.recentSecond.length >= this.perSecond) {
      const oldest = this.recentSecond[0];
      waitSec = Math.max(0, 1000 - (now - oldest));
    }
    let waitHour = 0;
    if (this.recentHour.length >= this.perHour) {
      const oldest = this.recentHour[0];
      waitHour = Math.max(0, 3600000 - (now - oldest));
    }
    return Math.max(waitSec, waitHour);
  }

  private reserve(now: number): void {
    this.recentSecond.push(now);
    this.recentHour.push(now);
  }

  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      // Drain as many tasks as allowed, one at a time
      while (this.queue.length) {
        const now = Date.now();
        if (!this.allowed(now)) {
          const wait = this.nextWait(now);
          const limitType = this.recentSecond.length >= this.perSecond ? 'per-second' : 'per-hour';
          logger.warn(`[WEATHERLINK] Rate limit hit (${limitType}): delaying ${wait}ms, queue length: ${this.queue.length}`);
          // Schedule resume and exit loop
          this.timer = setTimeout(() => {
            this.timer = null;
            this.process().catch((e) => logger.error('[WEATHERLINK] Rate limiter process error', e));
          }, wait + 30);
          break;
        }

        const task = this.queue.shift()!;
        this.reserve(now);
        logger.debug(`[WEATHERLINK] Processing request, ${this.queue.length} remaining in queue`);
        try {
          const val = await task.fn();
          task.resolve(val);
        } catch (err) {
          task.reject(err);
        }
        // loop continues; windows will be re-evaluated next iteration
      }
    } finally {
      this.processing = false;
      // If queue still has items and we're not scheduled, schedule again
      if (this.queue.length && !this.timer) {
        const now = Date.now();
        const wait = this.nextWait(now);
        this.timer = setTimeout(() => {
          this.timer = null;
          this.process().catch((e) => logger.error('[WEATHERLINK] Rate limiter process error', e));
        }, wait + 30);
      }
    }
  }
}

// Shared limiter across the module (API key scope)
const weatherlinkLimiter = new SlidingWindowRateLimiter(10, 1000);

async function runLimited<T>(fn: () => Promise<T>): Promise<T> {
  return weatherlinkLimiter.enqueue(fn) as Promise<T>;
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
  const stations = await runLimited(() => client.getStations());
  if (!stations.length) {
    logger.warn('[WEATHERLINK] No station found');
    return undefined;
  }
  return stations[0].station_id_uuid;
}

async function getCurrentSensorBlocks(client: WeatherlinkClient, stationUUID: string): Promise<SensorBlock[]> {
  const current = await runLimited(() => client.getCurrent(stationUUID));
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
export async function getRainRateFromWeatherlink(options: RainRateOptions = {}): Promise<RainRateResult> {
  try {
    const units = options.units ?? 'metric';
    const { ok, metrics } = await getWeatherlinkMetrics<{ rateIn?: number; rateMm?: number }>([
      {
        name: 'rateIn',
        sensorType: 37, // ISS
        field: 'rain_rate_last_in',
        transform: (v) => (typeof v === 'number' && isFinite(v) ? v : undefined), // inches/hour
        defaultValue: undefined,
      },
      {
        name: 'rateMm',
        sensorType: 37, // ISS
        field: 'rain_rate_last_mm',
        transform: (v) => (typeof v === 'number' && isFinite(v) ? v : undefined), // mm/hour
        defaultValue: undefined,
      },
    ]);

    let rate: number = 0;
    const mm = typeof metrics.rateMm === 'number' ? metrics.rateMm : undefined;
    const inch = typeof metrics.rateIn === 'number' ? metrics.rateIn : undefined;

    if (units === 'metric') {
      if (mm !== undefined) rate = mm; else if (inch !== undefined) rate = inch * 25.4; else rate = 0;
    } else {
      if (inch !== undefined) rate = inch; else if (mm !== undefined) rate = mm / 25.4; else rate = 0;
    }

    return { rate, ok };
  } catch (e) {
    logger.error('[WEATHERLINK] Error while fetching rain rate', e);
    return { rate: 0, ok: false };
  }
}

// =============== Latest (current) Weather snapshot for Redis cache ===============
export interface LatestWeatherSnapshot {
  temperatureC: number | null;
  humidity: number | null;
}

export async function fetchLatestWeatherSnapshot(): Promise<LatestWeatherSnapshot> {
  try {
    const { ok, metrics } = await getWeatherlinkMetrics<{ tempC?: number; hum?: number }>([
      {
        name: 'tempC',
        sensorType: 37, // ISS sensor
        field: 'temp',
        fallbacks: [
          { field: 'temp_f' },
          { field: 'temp_c' },
          { field: 'temp_out' },
          { field: 'outside_temp' },
          { field: 'temp_last' },
        ],
        transform: (v) => {
          if (typeof v === 'number' && isFinite(v)) {
            // Assume Fahrenheit by default; convert to Celsius
            return Math.round(((v - 32) * (5 / 9)) * 10) / 10;
          }
          return undefined;
        },
        defaultValue: undefined,
      },
      {
        name: 'hum',
        sensorType: 37,
        field: 'hum',
        fallbacks: [ { field: 'hum_out' } ],
        transform: (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v) : undefined),
        defaultValue: undefined,
      }
    ]);

    if (!ok) {
      logger.warn('[WEATHERLINK] fetchLatestWeatherSnapshot: metrics fetch not ok');
    }

    const temperatureC = typeof metrics.tempC === 'number' ? metrics.tempC : null;
    const humidity = typeof metrics.hum === 'number' ? metrics.hum : null;
    return { temperatureC, humidity };
  } catch (e) {
    logger.error('[WEATHERLINK] Error while fetching latest snapshot', e);
    return { temperatureC: null, humidity: null };
  }
}

// Rain size mapping for fallback from clicks
function rainClicksToMm(clicks: number, rainSizeCode?: number): number | undefined {
  if (typeof clicks !== 'number' || !isFinite(clicks) || clicks <= 0) return 0;
  switch (rainSizeCode) {
    case 2: return clicks * 0.2;       // 0.2 mm per click
    case 3: return clicks * 0.1;       // 0.1 mm per click
    case 1: return clicks * 0.01 * 25.4; // 0.01 inch → mm
    case 4: return clicks * 0.001 * 25.4; // 0.001 inch → mm
    default: return undefined;
  }
}

function mmToInches(mm: number): number { return mm / 25.4; }
function inchesToMm(inches: number): number { return inches * 25.4; }

async function computeChunkRainTotal(
  client: WeatherlinkClient,
  stationUUID: string,
  start: number | Date,
  end: number | Date,
  toMetric: boolean,
): Promise<{ sum: number; count: number; start: number; end: number }> {
  const historic = await runLimited(() => client.getHistoric(stationUUID, start, end));
  const startTs = typeof start === 'number' ? start : start.getTime();
  const endTs = typeof end === 'number' ? end : end.getTime();
  if (!historic) return { sum: 0, count: 0, start: startTs, end: endTs };

  const iss = (historic as any).sensors?.find((s: any) => s?.sensor_type === 37);
  const dataArray: any[] = Array.isArray(iss?.data) ? (iss!.data as any[]) : [];

  let sumMm = 0;
  let count = 0;
  for (const entry of dataArray) {
    const rMm = entry?.rainfall_mm;
    const rIn = entry?.rainfall_in;
    const clicks = entry?.rainfall_clicks;
    const size = entry?.rain_size; // 1,2,3,4 per docs

    let mm: number | undefined;
    if (typeof rMm === 'number' && isFinite(rMm)) {
      mm = rMm;
    } else if (typeof rIn === 'number' && isFinite(rIn)) {
      mm = inchesToMm(rIn);
    } else if (typeof clicks === 'number' && isFinite(clicks)) {
      const est = rainClicksToMm(clicks, size);
      if (typeof est === 'number' && isFinite(est)) mm = est;
    }

    if (typeof mm === 'number' && isFinite(mm)) {
      sumMm += mm;
      count += 1;
    }
  }

  const sum = toMetric ? sumMm : mmToInches(sumMm);
  return { sum, count, start: startTs, end: endTs };
}

export async function getRainTotalRange(options: RainTotalRangeOptions = {}): Promise<RainTotalRangeResult> {
  const end = options.end instanceof Date ? options.end.getTime() : typeof options.end === 'number' ? options.end : Date.now();
  const windowSeconds = options.windowSeconds ?? 24 * 3600; // default last 24h
  const chunkCap = 24 * 3600; // API max seconds per request
  const chunkSeconds = Math.min(options.chunkSeconds ?? chunkCap, chunkCap);
  const units = options.units ?? 'metric';
  const toMetric = units === 'metric';

  const res = await withWeatherlinkClient(async (client) => {
    const stationUUID = await getFirstStationUUID(client);
    if (!stationUUID) return null as any;

    const start = end - windowSeconds * 1000;
    const chunks: RainTotalChunk[] = [];
    let cursorEnd = end;

    while (cursorEnd > start) {
      const cursorStart = Math.max(start, cursorEnd - chunkSeconds * 1000);
      const { sum, count, start: s, end: e } = await computeChunkRainTotal(client, stationUUID, cursorStart, cursorEnd, toMetric);
      chunks.push({ start: s, end: e, total: sum, count });
      cursorEnd = cursorStart;
    }

    chunks.reverse();
    return { chunks } as { chunks: RainTotalChunk[] };
  });

  if (!res.ok || !res.value) return { ok: false, total: 0, chunks: [], units };

  const chunks = res.value.chunks;
  let total = 0;
  for (const c of chunks) total += c.total;
  return { ok: true, total, chunks, units };
}

export async function getDailyRainTotal(endDate: Date = new Date(), units: 'metric' | 'imperial' = 'metric'): Promise<{ ok: boolean; total: number; count: number; units: 'metric' | 'imperial' }> {
  const { ok, total, chunks } = await getRainTotalRange({ end: endDate, windowSeconds: 24 * 3600, chunkSeconds: 24 * 3600, units });
  const count = chunks.length ? chunks[0].count : 0; // single 24h chunk
  return { ok, total, count, units };
}

export async function getSevenDayRainTotal(endDate: Date = new Date(), units: 'metric' | 'imperial' = 'metric'): Promise<{ ok: boolean; total: number; daily: RainTotalChunk[]; units: 'metric' | 'imperial' }> {
  const SEVEN_DAYS = 7 * 24 * 3600;
  const { ok, total, chunks } = await getRainTotalRange({ end: endDate, windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, units });
  return { ok, total, daily: chunks, units };
}

// Compute average outdoor temperature for a given local day
export interface DailyTempAvgResult { ok: boolean; avg: number; count: number }

export interface OutdoorTempAverageOptions {
  end?: Date | number;
  windowSeconds?: number; // total range length
  chunkSeconds?: number; // max 86400 due to API
  combineMode?: 'dailyMean' | 'sampleWeighted';
  units?: 'metric' | 'imperial'; // metric: Celsius, imperial: Fahrenheit
}

export interface OutdoorTempAverageChunk {
  start: number;
  end: number;
  avg: number;
  count: number;
}

export interface OutdoorTempAverageResult {
  ok: boolean;
  avg: number;
  chunks: OutdoorTempAverageChunk[];
  combineMode: 'dailyMean' | 'sampleWeighted';
}

function fToC(f: number): number { return (f - 32) * (5 / 9); }

async function computeChunkOutdoorTempAvg(
  client: WeatherlinkClient,
  stationUUID: string,
  start: number | Date,
  end: number | Date,
  toMetric: boolean,
): Promise<{ sum: number; count: number; start: number; end: number }> {
  const historic = await runLimited(() => client.getHistoric(stationUUID, start, end));
  const startTs = typeof start === 'number' ? start : start.getTime();
  const endTs = typeof end === 'number' ? end : end.getTime();
  if (!historic) return { sum: 0, count: 0, start: startTs, end: endTs };

  const iss = historic.sensors.find((s: any) => s?.sensor_type === 37);
  const dataArray: unknown[] = Array.isArray(iss?.data) ? (iss!.data as unknown[]) : [];

  let sum = 0;
  let count = 0;
  for (const entry of dataArray as any[]) {
    const tAvg = entry?.temp_avg;
    const tLast = entry?.temp_last;
    const tHi = entry?.temp_hi;
    const tLo = entry?.temp_lo;

    let val: number | undefined = undefined;
    if (typeof tAvg === 'number' && isFinite(tAvg)) {
      val = tAvg;
    } else if (typeof tLast === 'number' && isFinite(tLast)) {
      val = tLast;
    } else if (typeof tHi === 'number' && isFinite(tHi) && typeof tLo === 'number' && isFinite(tLo)) {
      val = (tHi + tLo) / 2;
    }

    if (typeof val === 'number' && isFinite(val)) {
      const v = toMetric ? fToC(val) : val;
      sum += v;
      count += 1;
    }
  }
  return { sum, count, start: startTs, end: endTs };
}

// Generic average over a range, chunked due to API limit
export async function getOutdoorTempAverageRange(options: OutdoorTempAverageOptions = {}): Promise<OutdoorTempAverageResult> {
  const end = options.end instanceof Date ? options.end.getTime() : typeof options.end === 'number' ? options.end : Date.now();
  const windowSeconds = options.windowSeconds ?? 24 * 3600; // default last 24h
  const chunkCap = 24 * 3600; // API max seconds per request
  const chunkSeconds = Math.min(options.chunkSeconds ?? chunkCap, chunkCap);
  const combineMode = options.combineMode ?? 'dailyMean';
  const units = options.units ?? 'metric';
  const toMetric = units === 'metric';

  const res = await withWeatherlinkClient(async (client) => {
    const stationUUID = await getFirstStationUUID(client);
    if (!stationUUID) return null as any;

    const start = end - windowSeconds * 1000;

    const chunks: OutdoorTempAverageChunk[] = [];
    let cursorEnd = end;

    while (cursorEnd > start) {
      const cursorStart = Math.max(start, cursorEnd - chunkSeconds * 1000);
      const { sum, count, start: s, end: e } = await computeChunkOutdoorTempAvg(client, stationUUID, cursorStart, cursorEnd, toMetric);
      const avg = count > 0 ? sum / count : 0;
      chunks.push({ start: s, end: e, avg, count });
      cursorEnd = cursorStart;
    }

    // We built chunks from end backwards; reverse to chronological
    chunks.reverse();
    return { chunks } as { chunks: OutdoorTempAverageChunk[] };
  });

  if (!res.ok || !res.value) return { ok: false, avg: 0, chunks: [], combineMode };

  const chunks = res.value.chunks;
  if (!chunks.length) return { ok: false, avg: 0, chunks: [], combineMode };

  let avg = 0;
  if (combineMode === 'sampleWeighted') {
    let totalSum = 0;
    let totalCount = 0;
    for (const c of chunks) {
      totalSum += c.avg * c.count;
      totalCount += c.count;
    }
    avg = totalCount > 0 ? totalSum / totalCount : 0;
  } else {
    // dailyMean (equal weight per chunk)
    let sumAvg = 0;
    let n = 0;
    for (const c of chunks) {
      if (c.count > 0) {
        sumAvg += c.avg;
        n += 1;
      }
    }
    avg = n > 0 ? sumAvg / n : 0;
  }

  return { ok: true, avg, chunks, combineMode };
}

export async function getDailyOutdoorTempAverage(endDate: Date = new Date()): Promise<DailyTempAvgResult> {
  // Last 24 hours ending at endDate
  const { ok, avg, chunks } = await getOutdoorTempAverageRange({ end: endDate, windowSeconds: 24 * 3600, chunkSeconds: 24 * 3600, combineMode: 'sampleWeighted', units: 'metric' });
  const count = chunks.length ? chunks[0].count : 0; // single chunk for 24h
  return { ok, avg, count };
}

// Temperature extrema (hi/lo) over a range, chunked due to API limit
export interface OutdoorTempExtremaOptions {
  end?: Date | number;
  windowSeconds?: number; // total range length
  chunkSeconds?: number; // max 86400 due to API
  units?: 'metric' | 'imperial'; // metric: Celsius, imperial: Fahrenheit
}

export interface OutdoorTempExtremaChunk {
  start: number;
  end: number;
  hiMax: number; // max of temp_hi within chunk
  loMin: number; // min of temp_lo within chunk
  count: number; // number of samples contributing
}

export interface OutdoorTempExtremaResult {
  ok: boolean;
  hiMax: number;
  loMin: number;
  chunks: OutdoorTempExtremaChunk[];
  units: 'metric' | 'imperial';
}

async function computeChunkOutdoorTempExtrema(
  client: WeatherlinkClient,
  stationUUID: string,
  start: number | Date,
  end: number | Date,
  toMetric: boolean,
): Promise<{ hiMax: number; loMin: number; count: number; start: number; end: number }> {
  const historic = await runLimited(() => client.getHistoric(stationUUID, start, end));
  const startTs = typeof start === 'number' ? start : start.getTime();
  const endTs = typeof end === 'number' ? end : end.getTime();
  if (!historic) return { hiMax: Number.NEGATIVE_INFINITY, loMin: Number.POSITIVE_INFINITY, count: 0, start: startTs, end: endTs };

  const iss = historic.sensors.find((s: any) => s?.sensor_type === 37);
  const dataArray: unknown[] = Array.isArray(iss?.data) ? (iss!.data as unknown[]) : [];

  let hi = Number.NEGATIVE_INFINITY;
  let lo = Number.POSITIVE_INFINITY;
  let count = 0;
  for (const entry of dataArray as any[]) {
    const tHi = entry?.temp_hi;
    const tLo = entry?.temp_lo;

    if (typeof tHi === 'number' && isFinite(tHi)) {
      const v = toMetric ? fToC(tHi) : tHi;
      if (v > hi) hi = v;
      count += 1;
    }
    if (typeof tLo === 'number' && isFinite(tLo)) {
      const v = toMetric ? fToC(tLo) : tLo;
      if (v < lo) lo = v;
      count += 1;
    }
  }
  return { hiMax: hi, loMin: lo, count, start: startTs, end: endTs };
}

export async function getOutdoorTempExtremaRange(options: OutdoorTempExtremaOptions = {}): Promise<OutdoorTempExtremaResult> {
  const end = options.end instanceof Date ? options.end.getTime() : typeof options.end === 'number' ? options.end : Date.now();
  const windowSeconds = options.windowSeconds ?? 24 * 3600; // default last 24h
  const chunkCap = 24 * 3600; // API max seconds per request
  const chunkSeconds = Math.min(options.chunkSeconds ?? chunkCap, chunkCap);
  const units = options.units ?? 'metric';
  const toMetric = units === 'metric';

  const res = await withWeatherlinkClient(async (client) => {
    const stationUUID = await getFirstStationUUID(client);
    if (!stationUUID) return null as any;

    const start = end - windowSeconds * 1000;
    const chunks: OutdoorTempExtremaChunk[] = [];
    let cursorEnd = end;

    while (cursorEnd > start) {
      const cursorStart = Math.max(start, cursorEnd - chunkSeconds * 1000);
      const { hiMax, loMin, count, start: s, end: e } = await computeChunkOutdoorTempExtrema(client, stationUUID, cursorStart, cursorEnd, toMetric);
      chunks.push({ start: s, end: e, hiMax, loMin, count });
      cursorEnd = cursorStart;
    }

    chunks.reverse();
    return { chunks } as { chunks: OutdoorTempExtremaChunk[] };
  });

  if (!res.ok || !res.value) return { ok: false, hiMax: 0, loMin: 0, chunks: [], units };

  const chunks = res.value.chunks;
  // Consider only chunks that had at least one contributing sample
  const valid = chunks.filter((c: OutdoorTempExtremaChunk) => isFinite(c.hiMax) || isFinite(c.loMin));
  if (!valid.length) return { ok: false, hiMax: 0, loMin: 0, chunks: [], units };

  let hiMax = Number.NEGATIVE_INFINITY;
  let loMin = Number.POSITIVE_INFINITY;
  for (const c of valid) {
    if (isFinite(c.hiMax) && c.hiMax > hiMax) hiMax = c.hiMax;
    if (isFinite(c.loMin) && c.loMin < loMin) loMin = c.loMin;
  }

  if (!isFinite(hiMax)) hiMax = 0;
  if (!isFinite(loMin)) loMin = 0;

  return { ok: true, hiMax, loMin, chunks, units };
}

export interface DailyTempExtremaResult { ok: boolean; tHi: number; tLo: number; count: number }

export async function getDailyOutdoorTempExtrema(endDate: Date = new Date()): Promise<DailyTempExtremaResult> {
  const { ok, hiMax, loMin, chunks } = await getOutdoorTempExtremaRange({ end: endDate, windowSeconds: 24 * 3600, chunkSeconds: 24 * 3600, units: 'metric' });
  const count = chunks.length ? chunks[0].count : 0; // single chunk for 24h
  return { ok, tHi: hiMax, tLo: loMin, count };
}

// ===================== HUMIDITY AVERAGES (analogous to temperature) =====================

export interface DailyHumidityAvgResult { ok: boolean; avg: number; count: number }

export interface OutdoorHumidityAverageOptions {
  end?: Date | number;
  windowSeconds?: number;
  chunkSeconds?: number; // max 86400 due to API
  combineMode?: 'dailyMean' | 'sampleWeighted';
}

export interface OutdoorHumidityAverageChunk {
  start: number;
  end: number;
  avg: number;
  count: number;
}

export interface OutdoorHumidityAverageResult {
  ok: boolean;
  avg: number;
  chunks: OutdoorHumidityAverageChunk[];
  combineMode: 'dailyMean' | 'sampleWeighted';
}

async function computeChunkOutdoorHumidityAvg(
  client: WeatherlinkClient,
  stationUUID: string,
  start: number | Date,
  end: number | Date,
): Promise<{ sum: number; count: number; start: number; end: number }> {
  const historic = await runLimited(() => client.getHistoric(stationUUID, start, end));
  const startTs = typeof start === 'number' ? start : start.getTime();
  const endTs = typeof end === 'number' ? end : end.getTime();
  if (!historic) return { sum: 0, count: 0, start: startTs, end: endTs };

  const iss = historic.sensors.find((s: any) => s?.sensor_type === 37);
  const dataArray: unknown[] = Array.isArray(iss?.data) ? (iss!.data as unknown[]) : [];

  let sum = 0;
  let count = 0;
  for (const entry of dataArray as any[]) {
    const hAvg = entry?.hum_avg;
    const hLast = entry?.hum_last;
    const hHi = entry?.hum_hi;
    const hLo = entry?.hum_lo;

    let val: number | undefined = undefined;
    if (typeof hAvg === 'number' && isFinite(hAvg)) {
      val = hAvg;
    } else if (typeof hLast === 'number' && isFinite(hLast)) {
      val = hLast;
    } else if (typeof hHi === 'number' && isFinite(hHi) && typeof hLo === 'number' && isFinite(hLo)) {
      val = (hHi + hLo) / 2;
    }

    if (typeof val === 'number' && isFinite(val)) {
      sum += val;
      count += 1;
    }
  }
  return { sum, count, start: startTs, end: endTs };
}

export async function getOutdoorHumidityAverageRange(options: OutdoorHumidityAverageOptions = {}): Promise<OutdoorHumidityAverageResult> {
  const end = options.end instanceof Date ? options.end.getTime() : typeof options.end === 'number' ? options.end : Date.now();
  const windowSeconds = options.windowSeconds ?? 24 * 3600; // default last 24h
  const chunkCap = 24 * 3600; // API max seconds per request
  const chunkSeconds = Math.min(options.chunkSeconds ?? chunkCap, chunkCap);
  const combineMode = options.combineMode ?? 'dailyMean';

  const res = await withWeatherlinkClient(async (client) => {
    const stationUUID = await getFirstStationUUID(client);
    if (!stationUUID) return null as any;

    const start = end - windowSeconds * 1000;

    const chunks: OutdoorHumidityAverageChunk[] = [];
    let cursorEnd = end;

    while (cursorEnd > start) {
      const cursorStart = Math.max(start, cursorEnd - chunkSeconds * 1000);
      const { sum, count, start: s, end: e } = await computeChunkOutdoorHumidityAvg(client, stationUUID, cursorStart, cursorEnd);
      const avg = count > 0 ? sum / count : 0;
      chunks.push({ start: s, end: e, avg, count });
      cursorEnd = cursorStart;
    }

    chunks.reverse();
    return { chunks } as { chunks: OutdoorHumidityAverageChunk[] };
  });

  if (!res.ok || !res.value) return { ok: false, avg: 0, chunks: [], combineMode };

  const chunks = res.value.chunks;
  if (!chunks.length) return { ok: false, avg: 0, chunks: [], combineMode };

  let avg = 0;
  if (combineMode === 'sampleWeighted') {
    let totalSum = 0;
    let totalCount = 0;
    for (const c of chunks) {
      totalSum += c.avg * c.count;
      totalCount += c.count;
    }
    avg = totalCount > 0 ? totalSum / totalCount : 0;
  } else {
    let sumAvg = 0;
    let n = 0;
    for (const c of chunks) {
      if (c.count > 0) {
        sumAvg += c.avg;
        n += 1;
      }
    }
    avg = n > 0 ? sumAvg / n : 0;
  }

  return { ok: true, avg, chunks, combineMode };
}

export async function getDailyOutdoorHumidityAverage(endDate: Date = new Date()): Promise<DailyHumidityAvgResult> {
  const { ok, avg, chunks } = await getOutdoorHumidityAverageRange({ end: endDate, windowSeconds: 24 * 3600, chunkSeconds: 24 * 3600, combineMode: 'sampleWeighted' });
  const count = chunks.length ? chunks[0].count : 0; // single chunk for 24h
  return { ok, avg, count };
}

// ===================== WIND SPEED AVERAGES =====================

export interface DailyWindAvgResult { ok: boolean; avg: number; count: number }

export interface OutdoorWindAverageOptions {
  end?: Date | number;
  windowSeconds?: number;
  chunkSeconds?: number; // max 86400 due to API
  combineMode?: 'dailyMean' | 'sampleWeighted';
  units?: 'metric' | 'imperial'; // metric: m/s, imperial: mph
}

export interface OutdoorWindAverageChunk {
  start: number;
  end: number;
  avg: number;
  count: number;
}

export interface OutdoorWindAverageResult {
  ok: boolean;
  avg: number;
  chunks: OutdoorWindAverageChunk[];
  combineMode: 'dailyMean' | 'sampleWeighted';
}

function mphToMps(mph: number): number { return mph * 0.44704; }

async function computeChunkOutdoorWindAvg(
  client: WeatherlinkClient,
  stationUUID: string,
  start: number | Date,
  end: number | Date,
  toMetric: boolean,
): Promise<{ sum: number; count: number; start: number; end: number }> {
  const historic = await runLimited(() => client.getHistoric(stationUUID, start, end));
  const startTs = typeof start === 'number' ? start : start.getTime();
  const endTs = typeof end === 'number' ? end : end.getTime();
  if (!historic) return { sum: 0, count: 0, start: startTs, end: endTs };

  const iss = historic.sensors.find((s: any) => s?.sensor_type === 37);
  const dataArray: unknown[] = Array.isArray(iss?.data) ? (iss!.data as unknown[]) : [];

  let sum = 0;
  let count = 0;
  for (const entry of dataArray as any[]) {
    const wAvg = entry?.wind_speed_avg; // mph
    const windRun = entry?.wind_run;    // miles in period
    const archInt = entry?.arch_int;    // seconds per record

    let mph: number | undefined = undefined;
    if (typeof wAvg === 'number' && isFinite(wAvg)) {
      mph = wAvg;
    } else if (typeof windRun === 'number' && isFinite(windRun) && typeof archInt === 'number' && isFinite(archInt) && archInt > 0) {
      mph = windRun / (archInt / 3600);
    }

    if (typeof mph === 'number' && isFinite(mph)) {
      const v = toMetric ? mphToMps(mph) : mph;
      sum += v;
      count += 1;
    }
  }
  return { sum, count, start: startTs, end: endTs };
}

export async function getOutdoorWindSpeedAverageRange(options: OutdoorWindAverageOptions = {}): Promise<OutdoorWindAverageResult> {
  const end = options.end instanceof Date ? options.end.getTime() : typeof options.end === 'number' ? options.end : Date.now();
  const windowSeconds = options.windowSeconds ?? 24 * 3600; // default last 24h
  const chunkCap = 24 * 3600; // API max seconds per request
  const chunkSeconds = Math.min(options.chunkSeconds ?? chunkCap, chunkCap);
  const combineMode = options.combineMode ?? 'dailyMean';
  const units = options.units ?? 'metric';
  const toMetric = units === 'metric';

  const res = await withWeatherlinkClient(async (client) => {
    const stationUUID = await getFirstStationUUID(client);
    if (!stationUUID) return null as any;

    const start = end - windowSeconds * 1000;
    const chunks: OutdoorWindAverageChunk[] = [];
    let cursorEnd = end;

    while (cursorEnd > start) {
      const cursorStart = Math.max(start, cursorEnd - chunkSeconds * 1000);
      const { sum, count, start: s, end: e } = await computeChunkOutdoorWindAvg(client, stationUUID, cursorStart, cursorEnd, toMetric);
      const avg = count > 0 ? sum / count : 0;
      chunks.push({ start: s, end: e, avg, count });
      cursorEnd = cursorStart;
    }

    chunks.reverse();
    return { chunks } as { chunks: OutdoorWindAverageChunk[] };
  });

  if (!res.ok || !res.value) return { ok: false, avg: 0, chunks: [], combineMode };

  const chunks = res.value.chunks;
  if (!chunks.length) return { ok: false, avg: 0, chunks: [], combineMode };

  let avg = 0;
  if (combineMode === 'sampleWeighted') {
    let totalSum = 0;
    let totalCount = 0;
    for (const c of chunks) {
      totalSum += c.avg * c.count;
      totalCount += c.count;
    }
    avg = totalCount > 0 ? totalSum / totalCount : 0;
  } else {
    let sumAvg = 0;
    let n = 0;
    for (const c of chunks) {
      if (c.count > 0) {
        sumAvg += c.avg;
        n += 1;
      }
    }
    avg = n > 0 ? sumAvg / n : 0;
  }

  return { ok: true, avg, chunks, combineMode };
}

export async function getDailyOutdoorWindSpeedAverage(endDate: Date = new Date()): Promise<DailyWindAvgResult> {
  const { ok, avg, chunks } = await getOutdoorWindSpeedAverageRange({ end: endDate, windowSeconds: 24 * 3600, chunkSeconds: 24 * 3600, combineMode: 'sampleWeighted', units: 'metric' });
  const count = chunks.length ? chunks[0].count : 0; // single chunk for 24h
  return { ok, avg, count };
}

// ===================== PRESSURE AVERAGES (barometer sensor_type 242) =====================

export interface DailyPressureAvgResult { ok: boolean; avg: number; count: number }

export interface OutdoorPressureAverageOptions {
  end?: Date | number;
  windowSeconds?: number;
  chunkSeconds?: number; // max 86400 due to API
  combineMode?: 'dailyMean' | 'sampleWeighted';
  units?: 'metric' | 'imperial'; // metric: hPa, imperial: inHg
}

export interface OutdoorPressureAverageChunk {
  start: number;
  end: number;
  avg: number;
  count: number;
}

export interface OutdoorPressureAverageResult {
  ok: boolean;
  avg: number;
  chunks: OutdoorPressureAverageChunk[];
  combineMode: 'dailyMean' | 'sampleWeighted';
  units: 'metric' | 'imperial';
}

function inHgToHpa(inHg: number): number {
  return inHg * 33.8638866667;
}

async function computeChunkOutdoorPressureAvg(
  client: WeatherlinkClient,
  stationUUID: string,
  start: number | Date,
  end: number | Date,
  toMetric: boolean,
): Promise<{ sum: number; count: number; start: number; end: number }> {
  const historic = await runLimited(() => client.getHistoric(stationUUID, start, end));
  const startTs = typeof start === 'number' ? start : start.getTime();
  const endTs = typeof end === 'number' ? end : end.getTime();
  if (!historic) return { sum: 0, count: 0, start: startTs, end: endTs };

  const bar = (historic as any).sensors?.find((s: any) => s?.sensor_type === 242);
  const dataArray: any[] = Array.isArray(bar?.data) ? (bar!.data as any[]) : [];

  // ► CHOICE: wenn irgendwo bar_absolute vorhanden ist, nutze im ganzen Chunk NUR bar_absolute,
  //   sonst NUR bar_sea_level (keine Mischung).
  const useAbsolute =
    dataArray.some(e => typeof e?.bar_absolute === 'number' && isFinite(e.bar_absolute));

  let sum = 0;
  let count = 0;

  for (const entry of dataArray) {
    const inHg = useAbsolute ? entry?.bar_absolute : entry?.bar_sea_level;
    if (typeof inHg === 'number' && isFinite(inHg)) {
      const v = toMetric ? inHgToHpa(inHg) : inHg; // metric: hPa, imperial: inHg
      sum += v;
      count += 1;
    }
  }
  return { sum, count, start: startTs, end: endTs };
}

export async function getOutdoorPressureAverageRange(options: OutdoorPressureAverageOptions = {}): Promise<OutdoorPressureAverageResult> {
  const end = options.end instanceof Date ? options.end.getTime() : typeof options.end === 'number' ? options.end : Date.now();
  const windowSeconds = options.windowSeconds ?? 24 * 3600; // default last 24h
  const chunkCap = 24 * 3600; // API max seconds per request
  const chunkSeconds = Math.min(options.chunkSeconds ?? chunkCap, chunkCap);
  const combineMode = options.combineMode ?? 'dailyMean';
  const units = options.units ?? 'metric';
  const toMetric = units === 'metric';

  const res = await withWeatherlinkClient(async (client) => {
    const stationUUID = await getFirstStationUUID(client);
    if (!stationUUID) return null as any;

    const start = end - windowSeconds * 1000;
    const chunks: OutdoorPressureAverageChunk[] = [];
    let cursorEnd = end;

    while (cursorEnd > start) {
      const cursorStart = Math.max(start, cursorEnd - chunkSeconds * 1000);
      const { sum, count, start: s, end: e } = await computeChunkOutdoorPressureAvg(client, stationUUID, cursorStart, cursorEnd, toMetric);
      const avg = count > 0 ? sum / count : 0;
      chunks.push({ start: s, end: e, avg, count });
      cursorEnd = cursorStart;
    }

    chunks.reverse();
    return { chunks } as { chunks: OutdoorPressureAverageChunk[] };
  });

  if (!res.ok || !res.value) return { ok: false, avg: 0, chunks: [], combineMode, units };

  const chunks = res.value.chunks;
  if (!chunks.length) return { ok: false, avg: 0, chunks: [], combineMode, units };

  let avg = 0;
  if (combineMode === 'sampleWeighted') {
    let totalSum = 0;
    let totalCount = 0;
    for (const c of chunks) {
      totalSum += c.avg * c.count;
      totalCount += c.count;
    }
    avg = totalCount > 0 ? totalSum / totalCount : 0;
  } else {
    let sumAvg = 0;
    let n = 0;
    for (const c of chunks) {
      if (c.count > 0) {
        sumAvg += c.avg;
        n += 1;
      }
    }
    avg = n > 0 ? sumAvg / n : 0;
  }

  return { ok: true, avg, chunks, combineMode, units };
}

export async function getDailyOutdoorPressureAverage(endDate: Date = new Date()): Promise<DailyPressureAvgResult> {
  const { ok, avg, chunks } = await getOutdoorPressureAverageRange({ end: endDate, windowSeconds: 24 * 3600, chunkSeconds: 24 * 3600, combineMode: 'sampleWeighted', units: 'metric' });
  const count = chunks.length ? chunks[0].count : 0; // single chunk for 24h
  return { ok, avg, count };
}
