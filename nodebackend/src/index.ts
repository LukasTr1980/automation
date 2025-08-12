//ATTENTION TO IMPORT ORDER, MAY BREAK APPLICATION
import './dotenvConfig.js'; //To make env variables immediately available
import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import { parse as cookieParse } from 'cookie';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { subscribeToRedisKey } from './clients/redisClient.js';
import configureSocket from './socketConfig.js';
import authMiddlewareSocket from './middleware/authMiddlewareSocket.js';
import { loadScheduledTasks } from './scheduler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import apiRouter from './routes/api.js';
import logger from './logger.js';
import helmet from 'helmet';
import { computeTodayET0 } from './utils/evapotranspiration.js';
import { isDev } from './envSwitcher.js';

const app = express();
const port = 8523;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientAppDistPath = isDev ? path.join(__dirname, '..', 'viteclientts', 'dist') : '/usr/src/viteclientts/dist/';

app.set('trust proxy', 1);
app.use((req: Request, res: Response, next: NextFunction) => {
  req.cookies = cookieParse(req.headers.cookie || '');
  next();
});
app.use(bodyParser.json());

const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'"],
  connectSrc: ["'self'", "ws:", "wss:"],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  upgradeInsecureRequests: [],
  reportUri: '/api/csp-violation-report'
};

if (isDev) {
  logger.debug('CSP Directives: ' + JSON.stringify(cspDirectives));
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: cspDirectives,
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  originAgentCluster: false,
  referrerPolicy: false,
  xContentTypeOptions: false,
  xDnsPrefetchControl: false,
  xDownloadOptions: false,
  xPermittedCrossDomainPolicies: false
}));

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['http://192.168.1.185:5173', 'http://localhost:5173', 'https://automation.charts.cx', 'http://localhost:8523', 'https://charts.cx'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
}));
app.use('/api', apiRouter);

const httpServer = http.createServer(app);
const io = configureSocket(httpServer);
io.use(authMiddlewareSocket);

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
      const val = await computeTodayET0();
      logger.info(`ET₀ (Dev-Run): ${val} mm`, { label: 'Index' });
    } catch (error) {
      logger.error('Error computing ET₀', error);	
    }
  });
} else {
  httpServer.listen(port, async () => {
    logger.info(`APIs are listening on port ${port}`);
    loadScheduledTasks().catch(logger.error);

    await subscribeToRedisKey(io);
  });
}
