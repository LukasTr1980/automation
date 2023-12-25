import express from 'express';
import { apiLimiter, loginLimiter } from '../middleware/rateLimiter';
import authMiddleware from '../middleware/authMiddleware';

// Import the routers
import loginRouter from './loginRoute';
import mqttRouter from './mqttRoute';
import simpleapiRouter from './simpleapiRoute';
import sessionRouter from './sessionRoute';
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

const router = express.Router();

// Configure the routes
router.use('/login', loginLimiter, loginRouter);
router.use(apiLimiter, authMiddleware);
router.use('/mqtt', mqttRouter);
router.use('/simpleapi', simpleapiRouter);
router.use('/session', sessionRouter);
router.use('/scheduler', schedulerRouter);
router.use('/scheduledTasks', scheduledTasksRouter);
router.use('/switchTaskEnabler', switchTaskEnablerRouter);
router.use('/getTaskEnabler', getTaskEnablerRouter);
router.use('/getGptRequest', getGptRequestRouter);
router.use('/updateGptRequest', updateGptRequestRouter);
router.use('/deleteTask', deleteTaskRouter);
router.use('/getSecrets', getSecretsRouter);
router.use('/updateSecrets', updateSecretsRouter);
router.use('/countdown', countdownRouter);
router.use('/markiseStatus', markiseStatusRouter);

export default router;
