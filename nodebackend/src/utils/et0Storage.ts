import { connectToRedis } from "../clients/redisClient.js";
import logger from "../logger.js";

// Centralized Redis storage for weekly ET₀
// Keys:
//  - et0:weekly:YYYY-MM-DD -> numeric string (mm)
//  - et0:weekly:latest     -> numeric string (mm)

const keyForDate = (d: Date) => {
  const day = d.toISOString().slice(0, 10);
  return `et0:weekly:${day}`;
};

export async function writeWeeklyET0ToRedis(value: number, date: Date = new Date()): Promise<void> {
  try {
    const client = await connectToRedis();
    const dayKey = keyForDate(date);
    await client.set(dayKey, String(value));
    await client.set("et0:weekly:latest", String(value));
    logger.info(`Stored weekly ET0 ${value.toFixed(2)} mm in Redis under ${dayKey}`);
  } catch (err) {
    logger.error("Failed to store weekly ET0 in Redis", err as Error);
  }
}

export async function readLatestWeeklyET0FromRedis(lookbackDays = 7): Promise<number | null> {
  try {
    const client = await connectToRedis();
    const latest = await client.get("et0:weekly:latest");
    if (latest !== null) {
      const v = parseFloat(latest);
      return Number.isFinite(v) ? v : null;
    }

    // Fallback: probe today back to lookbackDays
    for (let i = 0; i <= lookbackDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const vStr = await client.get(keyForDate(d));
      if (vStr !== null) {
        const v = parseFloat(vStr);
        if (Number.isFinite(v)) return v;
      }
    }
  } catch (err) {
    logger.error("Failed to read weekly ET0 from Redis", err as Error);
  }
  return null;
}

export async function isTodayEt0PresentInRedis(): Promise<boolean> {
  try {
    const client = await connectToRedis();
    const todayKey = keyForDate(new Date());
    const v = await client.get(todayKey);
    return v !== null;
  } catch (err) {
    logger.error("Failed checking today's ET0 presence in Redis", err as Error);
    return false;
  }
}

export { keyForDate as et0WeeklyKeyForDate };

