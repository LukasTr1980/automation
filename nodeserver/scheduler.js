const schedule = require('node-schedule');
const { promisify } = require('util');
const { connectToRedis } = require('../nodebackend/build/clients/redisClient');
const isIrrigationNeeded = require('../nodebackend/build/gptChatIrrigation').default;
const getTaskEnabler = require('../nodebackend/build/utils/getTaskEnabler').default;
const sharedState = require('../nodebackend/build/utils/sharedState');
const generateUniqueId = require('../nodebackend/build/utils/generateUniqueId').default;
const { topicToTaskEnablerKey } = require('../nodebackend/build/utils/constants');
const MqttPublisher = require('../nodebackend/build/utils/mqttPublisher').default;
const logger = require('../nodebackend/build/logger').default;

const publisher = new MqttPublisher();

let jobs = {};

function createTask(topic, state) {
  return async function () {
    try {

      const zoneName = topic.split('/')[2];

      if (topicToTaskEnablerKey.hasOwnProperty(zoneName)) {

        const taskEnablerKey = topicToTaskEnablerKey[zoneName];

        const taskEnablerState = await getTaskEnabler(taskEnablerKey);

        if (!taskEnablerState) {
          logger.info(`Task enabler status for key "${taskEnablerKey}" is false. Skipping task execution.`);
          return;
        }
      } else {
        logger.info(`No task enabler key found for "${zoneName}". Proceeding without checking task enabler state.`)
      }

      // Special logic for markise
      if (topic.startsWith('markise/switch/haupt/set')) {
        if (!sharedState.timeoutOngoing) {
          // Send initial state (from Redis key)
          publisher.publish(topic, state.toString(), (err) => {
            if (err) {
              logger.error('Error while publishing message:', err);
            } else {
              logger.info('Message published successfully.');

              // Send state 3 after 40 seconds
              setTimeout(() => {
                publisher.publish(topic, '3', (err) => {
                  if (err) {
                    logger.error('Error while publishing second message:', err);
                  } else {
                    logger.info('Second message published successfully.');
                  }
                });
              }, 40000); // 40 seconds delay

            }
          });
        } else {
          logger.info("The timeout is ongoing in markiseblock, skipping tasks.");
        }
      } else {
        if (state === false) {
          publisher.publish(topic, state.toString(), (err) => {
            if (err) {
              logger.error('Error while publishing message:', err);
            } else {
              logger.info('Message published successfully.');
            }
          });
        } else {
          // Check if isIrrigationNeeded is true for original logic
          const { result: irrigationNeeded, response: gptResponse } = await isIrrigationNeeded();
          if (irrigationNeeded) {
            // Original logic for other topics
            publisher.publish(topic, state.toString(), (err) => {
              if (err) {
                logger.error('Error while publishing message:', err);
              } else {
                logger.info('Message published successfully.');
              }
            });
          } else {
            logger.info('Skipping task execution due to irrigationNeeded returning false');
          }
        }
      }
    } catch (error) {
      logger.error('Error while getting task enabler status:', error);
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
      const { id, state, recurrenceRule } = JSON.parse(data);

      // Extract topic from jobKey
      const topic = jobKey.substring(0, jobKey.lastIndexOf('_'));

      // Initialize the topic array if not done yet
      if (!tasksByTopic[topic]) {
        tasksByTopic[topic] = [];
      }

      // Push the task to the appropriate topic array
      tasksByTopic[topic].push({ taskId: id, state, recurrenceRule });
    }
  }
  return tasksByTopic;
}

module.exports = {
  scheduleTask,
  loadScheduledTasks,
  getScheduledTasks,
};
