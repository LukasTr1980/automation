//ATTENTION TO IMPORT ORDER, MAY BREAK APPLICATION
import './dotenvConfig'; //To make env variables immediately available
import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cookie from 'cookie';
import cors from 'cors';
import path from 'path';
import http from 'http';
import { subscribeToRedisKey } from './clients/redisClient';
import configureSocket from './socketConfig';
import authMiddlewareSocket from './middleware/authMiddlewareSocket';
import { loadScheduledTasks } from './scheduler';
import { apiLimiter } from './middleware/rateLimiter';
import apiRouter from './routes/api';
import logger from './logger';
import './utils/markiseBlock';
import helmet from 'helmet';
import { expressHost, isDev } from './envSwitcher';

const app = express();
const host = expressHost;
const port = 8523;
const clientAppDistPath = isDev ? path.join(__dirname, '..', 'viteclientts', 'dist') : '/usr/src/viteclientts/dist/';

app.set('trust proxy', 1);
app.use((req: Request, res: Response, next: NextFunction) => {
  req.cookies = cookie.parse(req.headers.cookie || '');
  next();
});
app.use(bodyParser.json());

app.use(helmet({
  contentSecurityPolicy: false,
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

httpServer.listen(port, host, async () => {
  logger.info(`APIs are listening on port ${port}`);
  loadScheduledTasks().catch(logger.error);

  await subscribeToRedisKey(io);
});
