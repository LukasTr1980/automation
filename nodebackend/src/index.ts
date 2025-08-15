//ATTENTION TO IMPORT ORDER, MAY BREAK APPLICATION
import './dotenvConfig.js'; //To make env variables immediately available
import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { subscribeToRedisKey } from './clients/redisClient.js';
import configureSocket from './socketConfig.js';
import { loadScheduledTasks } from './scheduler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import apiRouter from './routes/api.js';
import logger from './logger.js';
import { computeWeeklyET0 } from './utils/evapotranspiration.js';
import { readLatestJsonlNumber } from './utils/localDataWriter.js';
import { isDev } from './envSwitcher.js';

const app = express();
const port = 8523;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientAppDistPath = isDev ? path.join(__dirname, '..', 'viteclientts', 'dist') : '/usr/src/viteclientts/dist/';

app.set('trust proxy', 1);
app.use(bodyParser.json());

// CSP and security headers are handled by Traefik ForwardAuth; no app-level CSP here.

// CORS is handled by Traefik; no app-level CORS configuration.
app.use('/api', apiRouter);

const httpServer = http.createServer(app);
const io = configureSocket(httpServer);

// Graceful shutdown and clearer EADDRINUSE handling
const host = isDev ? '192.168.1.185' : undefined;
httpServer.on('error', (err: NodeJS.ErrnoException) => {
  if (err && err.code === 'EADDRINUSE') {
    logger.error(`Port ${port} ${host ? `on ${host} ` : ''}already in use. Stop the existing server before starting a new one.`);
    process.exit(1);
  }
  logger.error('HTTP server error', err);
  process.exit(1);
});

const shutdown = () => {
  logger.info('Shutting down HTTP server...');
  httpServer.close(() => process.exit(0));
  // Fallback exit if close hangs
  setTimeout(() => process.exit(0), 2000).unref();
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

app.use(apiLimiter, express.static(path.join(clientAppDistPath)));

app.get('*', apiLimiter, (req: Request, res: Response) => {
  res.sendFile(path.join(clientAppDistPath, 'index.html'));
});

if (isDev) {
  httpServer.listen(port, host, async () => {
    logger.info(`APIs are listening on port ${port}`);
    loadScheduledTasks().catch(logger.error);
    await subscribeToRedisKey(io);

    try {
      const sum = await computeWeeklyET0();
      logger.info(`ET₀ Weekly (Dev-Run): ${sum} mm`, { label: 'Index' });
    } catch (error) {
      logger.error('Error computing weekly ET₀', error);	
    }
  });
} else {
  httpServer.listen(port, async () => {
    logger.info(`APIs are listening on port ${port}`);
    loadScheduledTasks().catch(logger.error);

    await subscribeToRedisKey(io);

    try {
      const latest = await readLatestJsonlNumber('evapotranspiration_weekly', 'et0_week', 7);
      if (typeof latest !== 'number' || !isFinite(latest)) {
        const sum = await computeWeeklyET0();
        logger.info(`ET₀ Weekly (First-Run): ${sum} mm`, { label: 'Index' });
      } else {
        logger.info(`ET₀ Weekly present on boot: ${latest.toFixed(2)} mm`, { label: 'Index' });
      }
    } catch (error) {
      logger.error('Error ensuring weekly ET₀ on boot', error);
    }
  });
}
