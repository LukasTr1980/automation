const express = require('express');
const router = express.Router();
const { apiLimiter, loginLimiter } = require('../../nodebackend/build/middleware/rateLimiter');
const authMiddleware = require('../../nodebackend/build/middleware/authMiddleware').default;

//Place before authMiddleware
const loginRouter = require('./loginRoute');
router.use('/login', loginLimiter, loginRouter);

router.use(apiLimiter, authMiddleware);

const mqttRouter = require('./mqttRoute');
const simpleapiRouter = require('./simpleapiRoute');
const sessionRouter = require('./sessionRoute');
const schedulerRouter = require('./schedulerRoute');
const scheduledTasksRouter = require('./scheduledTasksRoute');
const switchTaskEnablerRouter = require('./switchTaskEnablerRoute');
const getTaskEnablerRouter = require('./getTaskEnablerRoute');
const getGptRequestRouter = require('./getGptRequestRoute');
const updateGptRequestRouter = require('./updateGptRequestRoute');
const deleteTaskRouter = require('./deleteTaskRoute');
const getSecretsRouter = require('./getSecretsRoute');
const updateSecretsRouter = require('../../nodebackend/build/routes/updateSecretsRoute').default;
const countdownRouter = require('./countdownRoute');
const markiseStatusRouter = require('./markiseStatusRoute');

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

module.exports = router;