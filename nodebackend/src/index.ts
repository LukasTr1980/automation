//ATTENTION TO IMPORT ORDER, MAY BREAK APPLICATION
import './dotenvConfig.js'; //To make env variables immediately available
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { subscribeToRedisKey } from './clients/redisClient.js';
import { closePool as closeQuestDbPool, verifyConnection as verifyQuestDbConnection } from './clients/questdbClient.js';
import configureSocket from './socketConfig.js';
import { loadScheduledTasks } from './scheduler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import apiRouter from './routes/api.js';
import logger from './logger.js';
// Weekly ET0 computation removed; daily ET0 is computed by scheduler.
import { isDev } from './envSwitcher.js';

const app = express();
const port = 8523;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientAppDistPath = isDev ? path.join(__dirname, '..', 'viteclientts', 'dist') : '/usr/src/viteclientts/dist/';

app.set('trust proxy', 1);
// Use built-in body parsing provided by Express 5
app.use(express.json());

// CSP and security headers are handled by Traefik ForwardAuth; no app-level CSP here.

// CORS is handled by Traefik; no app-level CORS configuration.
app.use('/api', apiRouter);

const httpServer = http.createServer(app);
const io = configureSocket(httpServer);

// Graceful shutdown and clearer EADDRINUSE handling
// In dev, optionally bind to DEV_HOST; otherwise bind all interfaces (WireGuard/LAN friendly)
const host = isDev ? (process.env.DEV_HOST || undefined) : undefined;
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
  void closeQuestDbPool().catch((error) => {
    logger.error('Error closing QuestDB pool during shutdown', error);
  });
  httpServer.close(() => process.exit(0));
  // Fallback exit if close hangs
  setTimeout(() => process.exit(0), 2000).unref();
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

app.use(apiLimiter, express.static(path.join(clientAppDistPath)));

// Catch-all for SPA routes. In Express 5 (path-to-regexp v3+), use a RegExp.
// Exclude API paths explicitly to avoid hijacking unknown API routes.
app.get(/^(?!\/api(?:$|\/)).*/, apiLimiter, (req: Request, res: Response) => {
  res.sendFile(path.join(clientAppDistPath, 'index.html'));
});

async function runStartupTasks(): Promise<void> {
  try {
    await verifyQuestDbConnection();
  } catch (error) {
    logger.error('QuestDB connectivity check failed during startup', error);
    throw error;
  }

  loadScheduledTasks().catch(logger.error);
  await subscribeToRedisKey(io);
}

if (isDev) {
  httpServer.listen(port, host, async () => {
    logger.info(`APIs are listening on port ${port}${host ? ` (host ${host})` : ''}`);
    try {
      await runStartupTasks();
    } catch (error) {
      logger.error('Startup tasks failed', error);
      process.exit(1);
    }

    // No ET₀ compute on boot; daily job handles it.
  });
} else {
  httpServer.listen(port, async () => {
    logger.info(`APIs are listening on port ${port}`);
    try {
      await runStartupTasks();
    } catch (error) {
      logger.error('Startup tasks failed', error);
      process.exit(1);
    }

    // No ET₀ compute on boot; daily job handles it.
  });
}
