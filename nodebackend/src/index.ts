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

const app = express();
const port = 8523;

app.set('trust proxy', 1);
app.use((req: Request, res: Response, next: NextFunction) => {
  req.cookies = cookie.parse(req.headers.cookie || '');
  next();
});
app.use(bodyParser.json());
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['http://localhost:5173', 'https://automation.charts.cx', 'http://localhost:8523'];
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

app.use(apiLimiter, express.static(path.join('/usr/src/viteclientts/dist/')));

app.get('*', apiLimiter, (req: Request, res: Response) => {
  res.sendFile(path.join('/usr/src/viteclientts/dist/', 'index.html'));
});

httpServer.listen(port, async () => {
  logger.info(`APIs are listening on port ${port}`);
  loadScheduledTasks().catch(logger.error);

  await subscribeToRedisKey(io);
});
