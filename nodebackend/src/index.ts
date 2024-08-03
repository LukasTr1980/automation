//ATTENTION TO IMPORT ORDER, MAY BREAK APPLICATION
import './dotenvConfig'; // To make env variables immediately available
import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cookie from 'cookie';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { subscribeToRedisKey } from './clients/redisClient';
import helmet from 'helmet';
import contentSecurityPolicy from 'helmet-csp';
import { isDev } from './envSwitcher';
import apiRouter from './routes/api';
import logger from './logger';
import { apiLimiter } from './middleware/rateLimiter';
import configureSocket from './socketConfig';
import authMiddlewareSocket from './middleware/authMiddlewareSocket';
import { loadScheduledTasks } from './scheduler';
import './utils/markiseBlock';
import { nonceMiddleware } from './middleware/nonceMiddleware';
import { IncomingMessage, ServerResponse } from 'http';

const app = express();
const port = 8523;
const clientAppDistPath = isDev ? path.join(__dirname, '..', 'viteclientts', 'dist') : '/usr/src/viteclientts/dist/';

app.set('trust proxy', 1);

app.use((req: Request, res: Response, next: NextFunction) => {
  req.cookies = cookie.parse(req.headers.cookie || '');
  next();
});

app.use(bodyParser.json());

app.use(nonceMiddleware);

const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'", 
    (req: IncomingMessage, res: ServerResponse) => {
      const nonce = (res as Response).locals.cspNonce;
      logger.debug(`Using CSP nonce for script-src: ${nonce}`);
      return `'nonce-${nonce}'`;
    }
  ],
  styleSrc: [
    "'self'", 
    (req: IncomingMessage, res: ServerResponse) => {
      const nonce = (res as Response).locals.cspNonce;
      logger.debug(`Using CSP nonce for style-src: ${nonce}`);
      return `'nonce-${nonce}'`;
    }
  ],
  imgSrc: ["'self'"],
  connectSrc: ["'self'"],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  upgradeInsecureRequests: [],
  reportUri: '/api/csp-violation-report'
};

if (isDev) {
  logger.debug('CSP Directives:', cspDirectives);
}

app.use(
  contentSecurityPolicy({
    useDefaults: false,
    directives: cspDirectives,
  })
);

app.use(helmet({
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
    const allowedOrigins = [
      'http://192.168.1.185:5173', 
      'http://localhost:5173', 
      'https://automation.charts.cx', 
      'http://localhost:8523', 
      'https://charts.cx'
    ];
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
  const nonce = res.locals.cspNonce;

  fs.readFile(path.join(clientAppDistPath, 'index.html'), 'utf8', (err, data) => {
    if (err) {
      logger.error('Error reading index.html file:', err);
      return res.status(500).send('Internal Server Error');
    }

    const modifiedHtml = data.replace(/nonce="PLACEHOLDER"/g, `nonce="${nonce}"`);
    logger.debug('Serving modified index.html with nonce:', nonce);
    res.status(200).send(modifiedHtml);
  });
});

if (isDev) {
  httpServer.listen(port, '192.168.1.185', async () => {
    logger.info(`APIs are listening on port ${port}`);
    loadScheduledTasks().catch(logger.error);

    await subscribeToRedisKey(io);
  });
} else {
  httpServer.listen(port, async () => {
    logger.info(`APIs are listening on port ${port}`);
    loadScheduledTasks().catch(logger.error);

    await subscribeToRedisKey(io);
  });
}
