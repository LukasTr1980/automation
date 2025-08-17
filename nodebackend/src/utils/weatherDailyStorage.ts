import { connectToRedis } from "../clients/redisClient.js";
import logger from "../logger.js";

export interface DailyWeatherEntry {
  // Local date label (YYYY-MM-DD) for the 24h window [00:00..24:00) local time
  date: string;
  tMinC: number | null;
  tMaxC: number | null;
  tAvgC: number | null;
  rhMeanPct: number | null;
  windMeanMS: number | null; // at sensor height
  pressureMeanHPa: number | null;
}

export interface DailyLast7Payload {
  days: DailyWeatherEntry[]; // ordered oldest → newest (7 full local days)
  timestamp: string; // ISO write time
}

const KEY_LAST7 = "weather:daily:last7";

export async function writeDailyLast7ToRedis(payload: DailyLast7Payload): Promise<void> {
  try {
    const client = await connectToRedis();
    await client.set(KEY_LAST7, JSON.stringify(payload));
    logger.info(`[WEATHERLINK] Stored last-7 daily aggregates in Redis at ${payload.timestamp}`);
  } catch (err) {
    logger.error("Failed to store last-7 daily aggregates in Redis", err as Error);
  }
}

export async function readDailyLast7FromRedis(): Promise<DailyLast7Payload | null> {
  try {
    const client = await connectToRedis();
    const raw = await client.get(KEY_LAST7);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyLast7Payload;
    if (!parsed || !Array.isArray(parsed.days) || parsed.days.length === 0) return null;
    return parsed;
  } catch (err) {
    logger.error("Failed to read last-7 daily aggregates from Redis", err as Error);
    return null;
  }
}

