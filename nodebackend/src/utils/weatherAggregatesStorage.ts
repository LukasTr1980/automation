import { connectToRedis } from "../clients/redisClient.js";
import logger from "../logger.js";

export interface WeatherAggregates {
  rain24hMm: number | null;
  rain7dMm: number | null;
  temp7dAvgC: number | null;
  humidity7dAvgPct: number | null;
  timestamp: string; // ISO
}

const AGG_KEY = "weather:agg:latest";

export async function writeWeatherAggregatesToRedis(data: WeatherAggregates): Promise<void> {
  try {
    const client = await connectToRedis();
    await client.set(AGG_KEY, JSON.stringify(data));
    await client.set("weather:agg:rain24h:mm", data.rain24hMm !== null && data.rain24hMm !== undefined ? String(data.rain24hMm) : "");
    await client.set("weather:agg:rain7d:mm", data.rain7dMm !== null && data.rain7dMm !== undefined ? String(data.rain7dMm) : "");
    await client.set("weather:agg:temp7d:avgC", data.temp7dAvgC !== null && data.temp7dAvgC !== undefined ? String(data.temp7dAvgC) : "");
    await client.set("weather:agg:humidity7d:avgPct", data.humidity7dAvgPct !== null && data.humidity7dAvgPct !== undefined ? String(data.humidity7dAvgPct) : "");
    await client.set("weather:agg:timestamp", data.timestamp);
    logger.info(`[WEATHERLINK] Stored aggregates in Redis at ${data.timestamp}`);
  } catch (err) {
    logger.error("Failed to store weather aggregates in Redis", err as Error);
  }
}

export async function readWeatherAggregatesFromRedis(): Promise<WeatherAggregates | null> {
  try {
    const client = await connectToRedis();
    const raw = await client.get(AGG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherAggregates;
    if (!parsed || typeof parsed !== 'object' || !parsed.timestamp) return null;
    return parsed;
  } catch (err) {
    logger.error("Failed to read weather aggregates from Redis", err as Error);
    return null;
  }
}

