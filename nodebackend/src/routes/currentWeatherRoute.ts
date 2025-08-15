import express from 'express';
import { getWeatherlinkMetrics } from '../clients/weatherlink-client.js';
import logger from '../logger.js';

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
    // Try multiple possible field names for current temperature
    const { ok, metrics } = await getWeatherlinkMetrics<{ tempC?: number }>([
      {
        name: 'tempC',
        sensorType: 37, // ISS sensor
        field: 'temp', // Try simple 'temp' first
        fallbacks: [
          { field: 'temp_f' },  // Maybe temp_f for Fahrenheit
          { field: 'temp_c' },  // Maybe temp_c for Celsius
          { field: 'temp_out' }, // Outside temperature
          { field: 'outside_temp' }, // Another possible name
          { field: 'temp_last' }, // Archive-style field name
        ],
        transform: (v) => {
          if (typeof v === 'number' && isFinite(v)) {
            // Assume input is Fahrenheit and convert to Celsius
            return Math.round(((v - 32) * (5 / 9)) * 10) / 10;
          }
          return undefined;
        },
        defaultValue: undefined,
      }
    ]);

    if (!ok) {
      logger.warn('Failed to fetch current temperature from WeatherLink', { label: 'CurrentWeatherRoute' });
      return res.status(503).json({ 
        error: 'Failed to fetch temperature data',
        temperature: null,
        unit: 'C'
      });
    }

    const temperature = metrics.tempC;
    
    if (temperature === undefined || temperature === null) {
      logger.warn('No temperature data available from WeatherLink - tried multiple field names', { label: 'CurrentWeatherRoute' });
      return res.status(404).json({ 
        error: 'No current temperature data available',
        temperature: null,
        unit: 'C'
      });
    }

    logger.info(`Retrieved current temperature: ${temperature}°C`, { label: 'CurrentWeatherRoute' });
    
    res.json({ 
      temperature,
      unit: 'C',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching current temperature', error as Error, { label: 'CurrentWeatherRoute' });
    res.status(500).json({ 
      error: 'Failed to fetch current temperature',
      temperature: null,
      unit: 'C'
    });
  }
});

export default router;