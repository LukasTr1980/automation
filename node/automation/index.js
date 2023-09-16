const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const crypto = require('crypto');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
require ('./markiseBlock');

const authMiddleware = require('./authMiddleware');
const connectToRedis = require('./redisClient')
const { latestStates, addSseClient } = require('./mqttHandler'); 
const { scheduleTask } = require('./scheduler');
const { loadScheduledTasks } = require('./scheduler');
const { getScheduledTasks } = require('./scheduler');
const isIrrigationNeeded = require('ai');
const { loginValidation } = require('./inputValidation.js');
const setTaskEnabler = require('./switchTaskEnabler');
const getTaskEnabler = require('./getTaskEnabler');
const { urlMap } = require ('./constants');
const loginLimiter = require('./rateLimiter');

const app = express();
const port = 8523;

app.set('trust proxy', 1);
app.use(cookieParser());
app.use(bodyParser.json());
app.use(cors());

app.get('/mqtt', authMiddleware, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');  // This ensures the connection stays open

  // Add the current client to the list of SSE clients
  addSseClient(res);

  // Send the latest switch states for all MQTT topics to the connected client immediately
  res.write(`data: ${JSON.stringify({type: 'switchState', latestStates})}\n\n`);

  // Get and send the irrigation state
  const { result: irrigationNeeded, response: gptResponse } = await isIrrigationNeeded();
  if (irrigationNeeded !== null) {
    const irrigationNeededData = {
        type: 'irrigationNeeded',
        state: irrigationNeeded,
        gptResponse: gptResponse,
    };
    res.write(`data: ${JSON.stringify(irrigationNeededData)}\n\n`);
  }
});

app.post('/simpleapi', authMiddleware, async function(req, res) {
  const { topic, state } = req.body;
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
  if (error) return res.status(400).send(error.details[0].message);

  const { username, password } = req.body;

  // Read your JSON file
  const userData = JSON.parse(fs.readFileSync('pwd.json', 'utf-8'));

  // Check if the username exists
  if (username !== userData.username) {
    return res.status(401).json({ status: 'error', message: 'Invalid username or password.' });
  }

  // Compare input password with stored hashed password
  bcrypt.compare(password, userData.password, async function(err, result) {
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
      res.status(401).json({ status: 'error', message: 'Invalid username or password.' });
    }
  });
});

app.get('/session', authMiddleware, async (req, res) => {
  const authHeader = req.headers['authorization'];
  console.log(authHeader);
  const sessionId = authHeader && authHeader.split(' ')[1];
  console.log('Received session ID:', sessionId); // Add this line
  
  // Get the Redis client
  const redis = await connectToRedis();

  // Check if sessionId exists in Redis
  const session = await redis.get(`session:${sessionId}`);
  console.log('Redis session:', session);
  
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
    res.status(200).send('Task scheduled successfully');
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

//app.use(express.static(path.join('/home/smarthome/node/automation/client/build/')));

app.use(express.static(path.join('/usr/src/automation/client/build/'))); //For Docker Build

//app.get('*', function(req, res) {
//  res.sendFile(path.join('/home/smarthome/node/automation/client/build/', 'index.html'));
//});

app.get('*', function(req, res) {
  res.sendFile(path.join('/usr/src/automation/client/build/', 'index.html')); //For Docker Build
});


//Start server and start functions needed on systemstartup
app.listen(port, async () => {
  console.log(`APIs are listening on port ${port}`);
  loadScheduledTasks().catch(console.error);
});