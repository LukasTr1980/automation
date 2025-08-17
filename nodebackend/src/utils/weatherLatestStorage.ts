import { connectToRedis } from "../clients/redisClient.js";
import logger from "../logger.js";

export interface LatestWeather {
  temperatureC: number | null;
  humidity: number | null;
  rainRateMmPerHour: number | null;
  timestamp: string; // ISO string
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
    logger.info(`[WEATHERLINK] Stored latest weather in Redis at ${data.timestamp}`);
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

