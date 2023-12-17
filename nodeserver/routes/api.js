const express = require('express');
const router = express.Router();
const { apiLimiter, loginLimiter } = require('../../nodebackend/build/middleware/rateLimiter');
const authMiddleware = require('../../nodebackend/build/middleware/authMiddleware').default;

//Place before authMiddleware
const loginRouter = require('../../nodebackend/build/routes/loginRoute').default;
router.use('/login', loginLimiter, loginRouter);

router.use(apiLimiter, authMiddleware);

const mqttRouter = require('./mqttRoute');
const simpleapiRouter = require('../../nodebackend/build/routes/simpleapiRoute').default;
const sessionRouter = require('../../nodebackend/build/routes/sessionRoute').default;
const schedulerRouter = require('./schedulerRoute');
const scheduledTasksRouter = require('./scheduledTasksRoute');
const switchTaskEnablerRouter = require('../../nodebackend/build/routes/switchTaskEnablerRoute').default;
const getTaskEnablerRouter = require('./getTaskEnablerRoute');
const getGptRequestRouter = require('../../nodebackend/build/routes/getGptRequestRoute').default;
const updateGptRequestRouter = require('../../nodebackend/build/routes/updateGptRequestRoute').default;
const deleteTaskRouter = require('../../nodebackend/build/routes/deleteTaskRoute').default;
const getSecretsRouter = require('../../nodebackend/build/routes/getSecretsRoute').default;
const updateSecretsRouter = require('../../nodebackend/build/routes/updateSecretsRoute').default;
const countdownRouter = require('../../nodebackend/build/routes/countdownRoute').default;
const markiseStatusRouter = require('../../nodebackend/build/routes/markiseStatusRoute').default;

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