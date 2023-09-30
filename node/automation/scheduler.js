const schedule = require('node-schedule');
const axios = require('axios');
const { promisify } = require('util');
const connectToRedis = require('./redisClient');
const { topicToTaskEnablerKey } = require('./constants');
const isIrrigationNeeded = require('ai');
const getTaskEnabler = require('./getTaskEnabler');
const sharedState = require('./sharedState');
const { response } = require('express');
const { error } = require('console');
const envSwitcher = require('./envSwitcher');
const generateUniqueId = require('./generateUniqueId');

let jobs = {};

const baseUrl = envSwitcher.baseUrl;
const urlMap = {
  'bewaesserung/switch/stefanNord': `${baseUrl}/set/tuya.0.51050522600194fed14c.1`,
  'bewaesserung/switch/stefanOst': `${baseUrl}/set/tuya.0.51050522600194fed14c.2`,
  'bewaesserung/switch/lukasSued': `${baseUrl}/set/tuya.0.51050522600194fed14c.3`,
  'bewaesserung/switch/lukasWest': `${baseUrl}/set/tuya.0.51050522600194fed14c.4`,
  'markise/switch/haupt': `${baseUrl}/set/tuya.0.8407060570039f7fa6d2.1`,
  // add other mappings
};

function createTask(topic, state) {
  return async function () {
    try {
      // Extract the zone name from the topic
      const zoneName = topic.split('/')[2];

      // Get the corresponding task enabler key
      const taskEnablerKey = topicToTaskEnablerKey[zoneName];

      // Get the state of the task enabler for the given key
      const taskEnablerState = await getTaskEnabler(taskEnablerKey);

      // If the state is false, return without executing the task
      if (!taskEnablerState) {
        console.log(`Task enabler status for key "${taskEnablerKey}" is false. Skipping task execution.`);
        return;
      }

      const url = urlMap[topic];
      const apiUrl = new URL(url);

      // Special logic for markise
      if (topic.startsWith('markise/switch/haupt')) {
        if (!sharedState.timeoutOngoing) {
          // Send initial state (from Redis key)
          apiUrl.searchParams.append('value', state);
          axios.get(apiUrl.toString())
            .then(response => {
              console.log('Request sent successfully:', response.data);

              // Send state 3 after 40 seconds
              setTimeout(() => {
                apiUrl.searchParams.set('value', 3);
                axios.get(apiUrl.toString())
                  .then(response => {
                    console.log('Second request sent successfully:', response.data);
                  })
                  .catch(error => {
                    console.error('Error while sending second request:', error);
                  });
              }, 40000); // 40 seconds delay

            })
            .catch(error => {
              console.error('Error while sending request:', error);
            });
        } else {
          console.log("The timeout is ongoing in markiseblock, skipping tasks.");
        }
      } else {
        if (state === false) {
          apiUrl.searchParams.append('value', state);
          axios.get(apiUrl.toString())
            .then(response => {
              console.log('Request send successfully:', response.data);
            })
            .catch(error => {
              console.error('Error while sending request:', error);
            });
        } else {
          // Check if isIrrigationNeeded is true for original logic
          const { result: irrigationNeeded, response: gptResponse } = await isIrrigationNeeded();
          if (irrigationNeeded) {
            // Original logic for other topics
            apiUrl.searchParams.append('value', state);
            axios.get(apiUrl.toString())
              .then(response => {
                console.log('Request sent successfully:', response.data);
              })
              .catch(error => {
                console.error('Error while sending request:', error);
              });
          } else {
            console.log('Skipping task execution due to irrigationNeeded returning false');
          }
        }
      }
    } catch (error) {
      console.error('Error while getting task enabler status:', error);
    }
  };
}

async function scheduleTask(topic, state, recurrenceRule) {
  if (!topic || state === undefined || !recurrenceRule) {
    throw new Error('Missing required parameters: topic, state, recurrenceRule');
  }

  const uniqueID = generateUniqueId();

  const jobKey = `${topic}_${uniqueID}`;

  if (jobs[jobKey]) {
    jobs[jobKey].cancel();
  }

  const task = createTask(topic, state);
  jobs[jobKey] = schedule.scheduleJob(recurrenceRule, task);

  const client = await connectToRedis();
  const setAsync = promisify(client.set).bind(client);
  await setAsync(jobKey, JSON.stringify({ id: uniqueID, state, recurrenceRule }));
}

async function loadScheduledTasks() {
  const patterns = ['bewaesserung*', 'markise*'];
  const client = await connectToRedis();
  const keysAsync = promisify(client.keys).bind(client);
  const getAsync = promisify(client.get).bind(client);

  for (const pattern of patterns) {
    const jobKeys = await keysAsync(pattern);

    for (const jobKey of jobKeys) {
      const data = await getAsync(jobKey);
      const { state, recurrenceRule } = JSON.parse(data);

      // Extract topic from jobKey, it should be everything before the last underscore
      const topic = jobKey.substring(0, jobKey.lastIndexOf('_'));

      // Schedule the task
      const task = createTask(topic, state);
      jobs[jobKey] = schedule.scheduleJob(recurrenceRule, task);
    }
  }
}

async function getScheduledTasks() {
  const patterns = ['bewaesserung*', 'markise*'];
  const client = await connectToRedis();
  const keysAsync = promisify(client.keys).bind(client);
  const getAsync = promisify(client.get).bind(client);

  const tasksByTopic = {};

  for (const pattern of patterns) {
    const jobKeys = await keysAsync(pattern);

    for (const jobKey of jobKeys) {
      const data = await getAsync(jobKey);
      const {id, state, recurrenceRule } = JSON.parse(data);

      // Extract topic from jobKey
      const topic = jobKey.substring(0, jobKey.lastIndexOf('_'));

      // Initialize the topic array if not done yet
      if (!tasksByTopic[topic]) {
        tasksByTopic[topic] = [];
      }

      // Push the task to the appropriate topic array
      tasksByTopic[topic].push({taskId: id, state, recurrenceRule });
    }
  }
  return tasksByTopic;
}

module.exports = {
  scheduleTask,
  loadScheduledTasks,
  getScheduledTasks,
};
