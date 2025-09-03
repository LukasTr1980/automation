import { connectToRedis } from "../clients/redisClient.js";
import logger from "../logger.js";

export interface Et0DailyEntry {
  date: string; // YYYY-MM-DD (local)
  et0mm: number; // mm for that local day
}

export interface Et0DailyLast7Payload {
  days: Et0DailyEntry[]; // ordered oldest → newest (7 full local days)
  timestamp: string; // ISO write time
}

const KEY_ET0_DAILY_LAST7 = "et0:daily:last7";

export async function writeEt0DailyLast7ToRedis(payload: Et0DailyLast7Payload): Promise<void> {
  try {
    const client = await connectToRedis();
    await client.set(KEY_ET0_DAILY_LAST7, JSON.stringify(payload));
    logger.info(`[ET0] Stored ET0 daily last-7 in Redis at ${payload.timestamp}`);
  } catch (err) {
    logger.error("Failed to store ET0 daily last-7 in Redis", err as Error);
  }
}

export async function readEt0DailyLast7FromRedis(): Promise<Et0DailyLast7Payload | null> {
  try {
    const client = await connectToRedis();
    const raw = await client.get(KEY_ET0_DAILY_LAST7);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Et0DailyLast7Payload;
    if (!parsed || !Array.isArray(parsed.days) || parsed.days.length === 0) return null;
    return parsed;
  } catch (err) {
    logger.error("Failed to read ET0 daily last-7 from Redis", err as Error);
    return null;
  }
}

