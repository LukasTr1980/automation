import express from 'express';
import { apiLimiter, loginLimiter } from '../middleware/rateLimiter';
import authMiddleware from '../middleware/authMiddleware';
import requiredRole from '../middleware/roleMiddleware';
import authMiddlewareForwardAuth from '../middleware/authMiddlewareForwardAuth';

import loginRouter from './loginRoute';
import mqttRouter from './mqttRoute';
import simpleapiRouter from './simpleapiRoute';
import schedulerRouter from './schedulerRoute';
import scheduledTasksRouter from './scheduledTasksRoute';
import switchTaskEnablerRouter from './switchTaskEnablerRoute';
import getTaskEnablerRouter from './getTaskEnablerRoute';
import getGptRequestRouter from './getGptRequestRoute';
import updateGptRequestRouter from './updateGptRequestRoute';
import deleteTaskRouter from './deleteTaskRoute';
import getSecretsRouter from './getSecretsRoute';
import updateSecretsRouter from './updateSecretsRoute';
import countdownRouter from './countdownRoute';
import markiseStatusRouter from './markiseStatusRoute';
import refreshTokenRouter from './refreshTokenRoute';
import logoutRouter from './logoutRoute';
import verifyTokenRouter from './verifyTokenRoute';
import userDataRouter from './userDataRoute';
import forwardAuthRouter from './forwardAuthRoute';

const router = express.Router();

router.use('/login', loginLimiter, loginRouter);
router.use('/refreshToken', apiLimiter, refreshTokenRouter);
router.use('/verifyToken', apiLimiter, verifyTokenRouter);
router.use('/logout', apiLimiter, logoutRouter);
router.use('/mqtt', apiLimiter, authMiddleware, mqttRouter);
router.use('/simpleapi', apiLimiter, authMiddleware, simpleapiRouter);
router.use('/scheduler', apiLimiter, authMiddleware, schedulerRouter);
router.use('/scheduledTasks', apiLimiter, authMiddleware, scheduledTasksRouter);
router.use('/switchTaskEnabler', apiLimiter, authMiddleware, switchTaskEnablerRouter);
router.use('/getTaskEnabler', apiLimiter, authMiddleware, getTaskEnablerRouter);
router.use('/getGptRequest', apiLimiter, [authMiddleware, requiredRole(['admin'])], getGptRequestRouter);
router.use('/updateGptRequest', apiLimiter, [authMiddleware, requiredRole(['admin'])], updateGptRequestRouter);
router.use('/deleteTask', apiLimiter, authMiddleware, deleteTaskRouter);
router.use('/getSecrets', apiLimiter, [authMiddleware, requiredRole(['admin'])], getSecretsRouter);
router.use('/updateSecrets', apiLimiter, [authMiddleware, requiredRole(['admin'])], updateSecretsRouter);
router.use('/countdown', apiLimiter, authMiddleware, countdownRouter);
router.use('/markiseStatus', apiLimiter, authMiddleware, markiseStatusRouter);
router.use('/userData', apiLimiter, authMiddleware, userDataRouter);
router.use('/forwardAuth', apiLimiter, [authMiddlewareForwardAuth, requiredRole(['admin', 'stefan'])], forwardAuthRouter);

export default router;
