import express from 'express';
import { apiLimiter, loginLimiter } from '../middleware/rateLimiter.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requiredRole from '../middleware/roleMiddleware.js';
import authMiddlewareForwardAuth from '../middleware/authMiddlewareForwardAuth.js';

import loginRouter from './loginRoute.js';
import mqttRouter from './mqttRoute.js';
import simpleapiRouter from './simpleapiRoute.js';
import schedulerRouter from './schedulerRoute.js';
import scheduledTasksRouter from './scheduledTasksRoute.js';
import skipAiRouter from './skipAiRoute.js';
import switchTaskEnablerRouter from './switchTaskEnablerRoute.js';
import getTaskEnablerRouter from './getTaskEnablerRoute.js';
import deleteTaskRouter from './deleteTaskRoute.js';
import getSecretsRouter from './getSecretsRoute.js';
import updateSecretsRouter from './updateSecretsRoute.js';
import countdownRouter from './countdownRoute.js';
import refreshTokenRouter from './refreshTokenRoute.js';
import logoutRouter from './logoutRoute.js';
import verifyTokenRouter from './verifyTokenRoute.js';
import userDataRouter from './userDataRoute.js';
import forwardAuthRouter from './forwardAuthRoute.js';
import cspReportRouter from './cspReportRoute.js';

const router = express.Router();

router.use('/login', loginLimiter, loginRouter);
router.use('/refreshToken', apiLimiter, refreshTokenRouter);
router.use('/verifyToken', apiLimiter, verifyTokenRouter);
router.use('/logout', apiLimiter, logoutRouter);
router.use('/mqtt', apiLimiter, authMiddleware, mqttRouter);
router.use('/simpleapi', apiLimiter, authMiddleware, simpleapiRouter);
router.use('/scheduler', apiLimiter, authMiddleware, schedulerRouter);
router.use('/scheduledTasks', apiLimiter, authMiddleware, scheduledTasksRouter);
router.use('/skipAi', apiLimiter, authMiddleware, skipAiRouter);
router.use('/switchTaskEnabler', apiLimiter, authMiddleware, switchTaskEnablerRouter);
router.use('/getTaskEnabler', apiLimiter, authMiddleware, getTaskEnablerRouter);
router.use('/deleteTask', apiLimiter, authMiddleware, deleteTaskRouter);
router.use('/getSecrets', apiLimiter, [authMiddleware, requiredRole(['admin'])], getSecretsRouter);
router.use('/updateSecrets', apiLimiter, [authMiddleware, requiredRole(['admin'])], updateSecretsRouter);
router.use('/countdown', apiLimiter, authMiddleware, countdownRouter);
router.use('/userData', apiLimiter, authMiddleware, userDataRouter);
router.use('/forwardAuth', apiLimiter, [authMiddlewareForwardAuth, requiredRole(['admin', 'stefan'])], forwardAuthRouter);
router.use('/csp-violation-report', apiLimiter, cspReportRouter);

export default router;
