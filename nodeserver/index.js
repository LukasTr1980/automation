const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('./markiseBlock');

const authMiddleware = require('./authMiddleware');
const { connectToRedis, subscribeToRedisKey } = require('./redisClient')
const { latestStates, addSseClient } = require('./mqttHandler');
const { scheduleTask } = require('./scheduler');
const { loadScheduledTasks } = require('./scheduler');
const { getScheduledTasks } = require('./scheduler');
const isIrrigationNeeded = require('ai');
const { loginValidation } = require('./inputValidation.js');
const setTaskEnabler = require('./switchTaskEnabler');
const getTaskEnabler = require('./getTaskEnabler');
const { buildUrlMap } = require('./buildUrlMap');
const loginLimiter = require('./rateLimiter');
const setupCountdownRoutes = require('./routes/countdownRoutes');

const app = express();
const port = 8523;

app.set('trust proxy', 1);
app.use(cookieParser());
app.use(bodyParser.json());
app.use(cors());

const httpServer = http.createServer(app);
const io = socketIo(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST']
  }
});

app.get('/mqtt', authMiddleware, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');  // This ensures the connection stays open

  // Add the current client to the list of SSE clients
  addSseClient(res);

  // Send the latest switch states for all MQTT topics to the connected client immediately
  res.write(`data: ${JSON.stringify({ type: 'switchState', latestStates })}\n\n`);

  // Get and send the irrigation state
  const data = await isIrrigationNeeded();
  if (data.result !== null) {
    const irrigationNeededData = {
      type: 'irrigationNeeded',
      state: data.result,
      response: data.response,
      formattedEvaluation: data.formattedEvaluation
    };
    res.write(`data: ${JSON.stringify(irrigationNeededData)}\n\n`);
  }
});

app.post('/simpleapi', authMiddleware, async function (req, res) {
  const { topic, state } = req.body;
  const urlMap = await buildUrlMap();
  const url = urlMap[topic];

  // Add 'state' as a query parameter to the URL
  const apiUrl = new URL(url);
  apiUrl.searchParams.append('value', state);

  try {
    const response = await axios.get(apiUrl.toString());
    res.send(response.data);
  } catch (error) {
    console.error('Error while sending request:', error);
    res.status(500).send('Error while sending request to the API.');
  }
});

app.post('/login', loginLimiter, async (req, res) => {
  const { error } = loginValidation(req.body);
  if (error) return res.status(400).json({ status: 'error', message: error.details[0].message });

  const { username, password } = req.body;

  const redis = await connectToRedis();

  const storedHashedPassword = await redis.get(`user:${username}`);

  // Check if the username exists
  if (!storedHashedPassword) {
    return res.status(401).json({ status: 'error', message: 'Falscher Benutzername oder Password.' });
  }

  // Compare input password with stored hashed password
  bcrypt.compare(password, storedHashedPassword, async function (err, result) {
    if (result) {
      // If the password is correct, generate a session ID
      const sessionId = crypto.randomBytes(16).toString('hex');

      // Get the Redis client
      const redis = await connectToRedis();

      // Store it in Redis with the username as the key and the session ID as the value
      await redis.set(`session:${sessionId}`, username, 'EX', 86400);

      // Send it back to the client
      res.status(200).json({ status: 'success', session: sessionId });
    } else {
      res.status(401).json({ status: 'error', message: 'Falscher Benutzername oder Password.' });
    }
  });
});

app.get('/session', authMiddleware, async (req, res) => {
  const authHeader = req.headers['authorization'];
  const sessionId = authHeader && authHeader.split(' ')[1];

  // Get the Redis client
  const redis = await connectToRedis();

  // Check if sessionId exists in Redis
  const session = await redis.get(`session:${sessionId}`);

  if (session) {
    res.status(200).send();
  } else {
    res.status(401).send();
  }
});

app.post('/scheduler', authMiddleware, async (req, res) => {
  const { topic, state, days, months, hour, minute } = req.body;

  if (!topic || state === undefined || !days || !months || !hour || !minute) {
    res.status(400).send('Missing required parameters: topic, state, days, months, hour, minute');
    return;
  }

  // Create recurrence rule
  const recurrenceRule = {
    hour: Number(hour),
    minute: Number(minute),
    dayOfWeek: days,
    month: months,
  };

  try {
    await scheduleTask(topic, state, recurrenceRule);
    res.status(200).send('Zeitplan erstellt');
  } catch (error) {
    console.error('Error while scheduling task:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/scheduledTasks', authMiddleware, async (req, res) => {
  try {
    const tasks = await getScheduledTasks();
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching scheduled tasks');
  }
});

app.post('/switchTaskEnabler', authMiddleware, async (req, res) => {
  const { zone, state } = req.body;

  if (!zone || state === undefined) {
    res.status(400).send('Missing required parameters: zone, state');
    return;
  }

  try {
    await setTaskEnabler(zone, state);
    res.status(200).send('Task enabler status updated successfully');
  } catch (error) {
    console.error('Error while updating task enabler status:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/getTaskEnabler', authMiddleware, async (req, res) => {
  const { zone } = req.query;

  if (!zone) {
    res.status(400).send('Missing required parameter: zone');
    return;
  }

  try {
    const state = await getTaskEnabler(zone);
    // Return the state
    res.status(200).json({ state });
  } catch (error) {
    console.error('Error while getting task enabler status:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/getGptRequest', authMiddleware, async (req, res) => {
  try {
    const client = await connectToRedis();
    const gptRequest = await client.get("gptRequestKey");
    res.status(200).json({ gptRequest });
  } catch (error) {
    console.error('Error while fetching GPT request:', error);
    res.status(500).send('Internal server error');
  }
});

app.post('/updateGptRequest', authMiddleware, async (req, res) => {
  try {
    const { newGptRequest } = req.body;
    const client = await connectToRedis();
    await client.set("gptRequestKey", newGptRequest);
    res.status(200).send('GPT request updated successfully');
  } catch (error) {
    console.error('Error while updating GPT request:', error);
    res.status(500).send('Internal server error');
  }
});

app.delete('/deleteTask', authMiddleware, async (req, res) => {
  console.log("Received body:", req.body);
  const { taskId, zone } = req.body;

  if (!taskId || !zone) {
    return res.status(400).send('Missing required parameters: taskId, zone');
  }

  // Construct the Redis key
  const redisKey = `${zone}_${taskId}`;

  // Get the Redis client
  const redis = await connectToRedis();

  // Delete the task from Redis
  redis.del(redisKey, function (err, reply) {
    if (err) {
      console.error('Error while deleting task:', err);
      return res.status(500).send('Internal server error');
    }

    if (reply === 1) {
      console.log(`Task ${redisKey} deleted successfully`);
      return res.status(200).send('Zeitplan gelöscht');
    } else {
      console.log(`Task ${redisKey} not found`);
      return res.status(404).send('Task not found');
    }
  });
});

app.get('/getSecrets', authMiddleware, async (req, res) => {
  try {
    const client = await connectToRedis();
    const influxDbAiTokenExists = Boolean(await client.get("influxdb_ai:token"));
    const influxDbAutomationTokenExists = Boolean(await client.get("influxdb_automation:token"));
    const openAiApiTokenExists = Boolean(await client.get("openaiapi:token"));
    const passwordExists = Boolean(await client.get("user:automation"))
    res.status(200).json({
      influxDbAiTokenExists,
      influxDbAutomationTokenExists,
      openAiApiTokenExists,
      passwordExists
    });
  } catch (error) {
    console.error('Error while fetching secrets:', error);
    res.status(500).send('Internal server error');
  }
});

app.post('/updateSecrets', authMiddleware, async (req, res) => {
  try {
    const { influxDbAiToken, influxDbAutomationToken, openAiApiToken, newPassword } = req.body;
    const client = await connectToRedis();
    let updatedFields = [];

    if (influxDbAiToken) {
      await client.set('influxdb_ai:token', influxDbAiToken);
      updatedFields.push('InfluxDB AI Token');
    }

    if (influxDbAutomationToken) {
      await client.set('influxdb_automation:token', influxDbAutomationToken);
      updatedFields.push('InfluxDB Automation Token');
    }

    if (openAiApiToken) {
      await client.set('openaiapi:token', openAiApiToken);
      updatedFields.push('OpenAI API Token');
    }

    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      await client.set('user:automation', hashedPassword);
      updatedFields.push('Password');
    }

    if (updatedFields.length === 0) {
      res.status(400).send('No fields to update.');
      return;
    }

    res.status(200).send(`Successfully updated: ${updatedFields.join(', ')}`);
  } catch (error) {
    console.error('Error while updating secrets', error);
    res.status(500).send('Internal server error');
  }
});

setupCountdownRoutes(app);

app.use(express.static(path.join('/usr/src/viteclient/dist/'))); //For Docker Build

app.get('*', function (req, res) {
  res.sendFile(path.join('/usr/src/viteclient/dist/', 'index.html')); //For Docker Build
});


//Start server and start functions needed on systemstartup
httpServer.listen(port, async () => {
  console.log(`APIs are listening on port ${port}`);
  loadScheduledTasks().catch(console.error);

  await subscribeToRedisKey(io);
});