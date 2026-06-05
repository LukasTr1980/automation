import { connectToRedis } from "../clients/redisClient.js";
import logger from "../logger.js";
import type { LatestWeatherFreshnessData } from "./weatherFreshness.js";

export interface LatestWeather extends LatestWeatherFreshnessData {
  temperatureC: number | null;
  humidity: number | null;
  rainRateMmPerHour: number | null;
  cachedAt?: string; // ISO cache write time
}

const LATEST_KEY = "weather:latest";

export async function writeLatestWeatherToRedis(data: LatestWeather): Promise<void> {
  try {
    const client = await connectToRedis();
    await client.set(LATEST_KEY, JSON.stringify(data));
    await client.set(`${LATEST_KEY}:temperatureC`, data.temperatureC !== null && data.temperatureC !== undefined ? String(data.temperatureC) : "");
    await client.set(`${LATEST_KEY}:humidity`, data.humidity !== null && data.humidity !== undefined ? String(data.humidity) : "");
    await client.set(`${LATEST_KEY}:rainRateMmPerHour`, data.rainRateMmPerHour !== null && data.rainRateMmPerHour !== undefined ? String(data.rainRateMmPerHour) : "");
    await client.set(`${LATEST_KEY}:timestamp`, data.timestamp);
    await client.set(`${LATEST_KEY}:observedAt`, data.observedAt ?? data.timestamp);
    await client.set(`${LATEST_KEY}:cachedAt`, data.cachedAt ?? "");
    await client.set(`${LATEST_KEY}:stale`, data.stale ? "true" : "false");
    logger.info(`[WEATHERLINK] Stored latest weather in Redis observed at ${data.observedAt ?? data.timestamp}`);
  } catch (err) {
    logger.error("Failed to store latest weather in Redis", err as Error);
  }
}

export async function readLatestWeatherFromRedis(): Promise<LatestWeather | null> {
  try {
    const client = await connectToRedis();
    const raw = await client.get(LATEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LatestWeather;
    // Basic shape validation
    if (!parsed || typeof parsed !== "object" || !parsed.timestamp) return null;
    return parsed;
  } catch (err) {
    logger.error("Failed to read latest weather from Redis", err as Error);
    return null;
  }
}
