import express from 'express';
import { getWeatherlinkMetrics } from '../clients/weatherlink-client.js';
import { readLatestWeatherFromRedis } from '../utils/weatherLatestStorage.js';
import logger from '../logger.js';
import { readWeatherAggregatesFromRedis } from '../utils/weatherAggregatesStorage.js';

const router = express.Router();

// Debug endpoint to see what the current API actually returns
router.get('/debug', async (req, res) => {
  try {
    // Try to get common current weather fields - these might be named differently than archive fields
    const { ok, metrics } = await getWeatherlinkMetrics<Record<string, any>>([
      { name: 'temp', sensorType: 37, field: 'temp' },
      { name: 'temp_f', sensorType: 37, field: 'temp_f' },
      { name: 'temp_c', sensorType: 37, field: 'temp_c' },
      { name: 'temp_last', sensorType: 37, field: 'temp_last' },
      { name: 'temp_out', sensorType: 37, field: 'temp_out' },
      { name: 'outside_temp', sensorType: 37, field: 'outside_temp' },
      { name: 'hum', sensorType: 37, field: 'hum' },
      { name: 'hum_out', sensorType: 37, field: 'hum_out' },
      { name: 'wind_speed', sensorType: 37, field: 'wind_speed' },
      { name: 'wind_speed_last', sensorType: 37, field: 'wind_speed_last' },
    ]);

    logger.info('Current weather debug data:', { ok, metrics }, { label: 'CurrentWeatherRoute' });
    res.json({ ok, metrics });
  } catch (error) {
    logger.error('Error in debug endpoint', error as Error, { label: 'CurrentWeatherRoute' });
    res.status(500).json({ error: 'Debug failed', details: (error as Error).message });
  }
});

router.get('/temperature', async (req, res) => {
  try {
    const latest = await readLatestWeatherFromRedis();
    if (latest && typeof latest.temperatureC === 'number') {
      logger.info(`Temperature from Redis latest: ${latest.temperatureC}°C`, { label: 'CurrentWeatherRoute' });
      return res.json({
        temperature: latest.temperatureC,
        unit: 'C',
        timestamp: latest.timestamp,
        source: 'redis'
      });
    }
    logger.warn('No cached temperature in Redis', { label: 'CurrentWeatherRoute' });
    return res.status(503).json({ 
      error: 'No cached temperature data in Redis',
      temperature: null,
      unit: 'C'
    });
  } catch (error) {
    logger.error('Error reading cached temperature', error as Error, { label: 'CurrentWeatherRoute' });
    res.status(500).json({ 
      error: 'Failed to read cached temperature',
      temperature: null,
      unit: 'C'
    });
  }
});

// Cache-only endpoint exposing Redis snapshot and aggregates
router.get('/latest', async (req, res) => {
  try {
    const [latest, aggregates] = await Promise.all([
      readLatestWeatherFromRedis(),
      readWeatherAggregatesFromRedis(),
    ] as const);

    if (!latest && !aggregates) {
      return res.status(503).json({ error: 'No cached weather data in Redis' });
    }

    res.json({ latest, aggregates });
  } catch (error) {
    logger.error('Error fetching cached latest weather from Redis', error as Error, { label: 'CurrentWeatherRoute' });
    res.status(500).json({ error: 'Failed to fetch cached weather data' });
  }
});

export default router;
