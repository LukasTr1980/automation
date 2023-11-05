const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const http = require('http');
const configureSocket = require('./socketConfig');
const authMiddlewareSocket = require('./authMiddlewareSocket');
const { subscribeToRedisKey } = require('../shared/redisClient')
const { loadScheduledTasks } = require('./scheduler');
const { apiLimiter } = require('./rateLimiter');
const apiRouter = require('./routes/api');
require('./markiseBlock');

const app = express();
const port = 8523;

app.set('trust proxy', 1);
app.use(cookieParser());
app.use(bodyParser.json());
app.use(cors());
app.use('/api', apiRouter);

const httpServer = http.createServer(app);
const io = configureSocket(httpServer);
io.use(authMiddlewareSocket);

app.use(apiLimiter, express.static(path.join('/usr/src/viteclient/dist/')));
app.get('*', apiLimiter, function (req, res) {
  res.sendFile(path.join('/usr/src/viteclient/dist/', 'index.html'));
});

httpServer.listen(port, async () => {
  console.log(`APIs are listening on port ${port}`);
  loadScheduledTasks().catch(console.error);

  await subscribeToRedisKey(io);
});