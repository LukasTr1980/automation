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

app.use(apiLimiter, express.static(path.join(clientAppDistPath)));

app.get('*', apiLimiter, (req: Request, res: Response) => {
  res.sendFile(path.join(clientAppDistPath, 'index.html'));
});

if (isDev) {
  httpServer.listen(port, '192.168.1.185', async () => {
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
  });
}
