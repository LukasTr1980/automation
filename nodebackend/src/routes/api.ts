import express from 'express';
import { apiLimiter } from '../middleware/rateLimiter.js';

import mqttRouter from './mqttRoute.js';
import simpleapiRouter from './simpleapiRoute.js';
import schedulerRouter from './schedulerRoute.js';
import scheduledTasksRouter from './scheduledTasksRoute.js';
import skipAiRouter from './skipAiRoute.js';
import switchTaskEnablerRouter from './switchTaskEnablerRoute.js';
import getTaskEnablerRouter from './getTaskEnablerRoute.js';
import deleteTaskRouter from './deleteTaskRoute.js';
import countdownRouter from './countdownRoute.js';

const router = express.Router();

router.use('/mqtt', apiLimiter, mqttRouter);
router.use('/simpleapi', apiLimiter, simpleapiRouter);
router.use('/scheduler', apiLimiter, schedulerRouter);
router.use('/scheduledTasks', apiLimiter, scheduledTasksRouter);
router.use('/skipAi', apiLimiter, skipAiRouter);
router.use('/switchTaskEnabler', apiLimiter, switchTaskEnablerRouter);
router.use('/getTaskEnabler', apiLimiter, getTaskEnablerRouter);
router.use('/deleteTask', apiLimiter, deleteTaskRouter);
router.use('/countdown', apiLimiter, countdownRouter);

export default router;
