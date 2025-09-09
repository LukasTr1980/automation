import express from 'express';
import { apiLimiter } from '../middleware/rateLimiter.js';

import mqttRouter from './mqttRoute.js';
import simpleapiRouter from './simpleapiRoute.js';
import schedulerRouter from './schedulerRoute.js';
import scheduledTasksRouter from './scheduledTasksRoute.js';
import decisionCheckRouter from './decisionCheckRoute.js';
import switchTaskEnablerRouter from './switchTaskEnablerRoute.js';
import getTaskEnablerRouter from './getTaskEnablerRoute.js';
import deleteTaskRouter from './deleteTaskRoute.js';
import countdownRouter from './countdownRoute.js';
import et0Router from './et0Route.js';
import currentWeatherRouter from './currentWeatherRoute.js';
import nextScheduleRouter from './nextScheduleRoute.js';
import irrigationRouter from './irrigationRoute.js';
import cloudsRouter from './cloudsRoute.js';

const router = express.Router();

router.use('/mqtt', apiLimiter, mqttRouter);
router.use('/simpleapi', apiLimiter, simpleapiRouter);
router.use('/scheduler', apiLimiter, schedulerRouter);
router.use('/scheduledTasks', apiLimiter, scheduledTasksRouter);
router.use('/decisionCheck', apiLimiter, decisionCheckRouter);
router.use('/switchTaskEnabler', apiLimiter, switchTaskEnablerRouter);
router.use('/getTaskEnabler', apiLimiter, getTaskEnablerRouter);
router.use('/deleteTask', apiLimiter, deleteTaskRouter);
router.use('/countdown', apiLimiter, countdownRouter);
router.use('/et0', apiLimiter, et0Router);
router.use('/weather', apiLimiter, currentWeatherRouter);
router.use('/schedule', apiLimiter, nextScheduleRouter);
router.use('/irrigation', apiLimiter, irrigationRouter);
router.use('/clouds', apiLimiter, cloudsRouter);

export default router;
