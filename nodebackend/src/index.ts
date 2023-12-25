import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cookie from 'cookie';
import cors from 'cors';
import path from 'path';
import http from 'http';
import configureSocket from './socketConfig';
import authMiddlewareSocket from './middleware/authMiddlewareSocket';
import { subscribeToRedisKey } from './clients/redisClient';
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
app.use(cors());
app.use('/api', apiRouter);

const httpServer = http.createServer(app);
const io = configureSocket(httpServer);
io.use(authMiddlewareSocket);

app.use(apiLimiter, express.static(path.join('/usr/src/viteclient/dist/')));

// Handle all GET requests that do not match the defined routes
app.get('*', apiLimiter, (req: Request, res: Response) => {
  res.sendFile(path.join('/usr/src/viteclient/dist/', 'index.html'));
});

httpServer.listen(port, async () => {
  logger.info(`APIs are listening on port ${port}`);
  loadScheduledTasks().catch(logger.error);

  await subscribeToRedisKey(io);
});
