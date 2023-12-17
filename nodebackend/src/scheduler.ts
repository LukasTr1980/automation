import schedule from 'node-schedule';
import { promisify } from 'util';
import { connectToRedis } from './clients/redisClient';
import isIrrigationNeeded from './gptChatIrrigation';
import getTaskEnabler from './utils/getTaskEnabler';
import { sharedState } from './utils/sharedState';
import generateUniqueId from './utils/generateUniqueId';
import { topicToTaskEnablerKey } from './utils/constants';
import MqttPublisher from './utils/mqttPublisher';
import logger from './logger';

const publisher = new MqttPublisher();

interface Job {
  [key: string]: schedule.Job;
}

const jobs: Job = {};

async function createTask(topic: string, state: boolean): Promise<() => Promise<void>> {
  return async function () {
    try {
      const zoneName = topic.split('/')[2];

      if (Object.prototype.hasOwnProperty.call(topicToTaskEnablerKey, zoneName)) {
        const taskEnablerKey = topicToTaskEnablerKey[zoneName];

        const taskEnablerState = await getTaskEnabler(taskEnablerKey);

        if (!taskEnablerState) {
          logger.info(`Task enabler status for key "${taskEnablerKey}" is false. Skipping task execution.`);
          return;
        }
      } else {
        logger.info(`No task enabler key found for "${zoneName}". Proceeding without checking task enabler state.`);
      }

      // Special logic for markise
      if (topic.startsWith('markise/switch/haupt/set')) {
        if (!sharedState.timeoutOngoing) {
          publisher.publish(topic, state.toString(), (err: Error | null) => {
            if (err) {
              logger.error('Error while publishing message:', err);
            } else {
              logger.info('Message published successfully.');

              setTimeout(() => {
                publisher.publish(topic, '3', (err: Error | null) => {
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
          publisher.publish(topic, state.toString(), (err: Error | null) => {
            if (err) {
              logger.error('Error while publishing message:', err);
            } else {
              logger.info('Message published successfully.');
            }
          });
        } else {
          const { result: irrigationNeeded } = await isIrrigationNeeded();
          if (irrigationNeeded) {
            publisher.publish(topic, state.toString(), (err: Error | null) => {
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

async function scheduleTask(topic: string, state: boolean, recurrenceRule: string): Promise<void> {
  if (!topic || state === undefined || !recurrenceRule) {
    throw new Error('Missing required parameters: topic, state, recurrenceRule');
  }

  const uniqueID = generateUniqueId();

  const jobKey = `${topic}_${uniqueID}`;

  if (jobs[jobKey]) {
    jobs[jobKey].cancel();
  }

  const task = await createTask(topic, state);
  jobs[jobKey] = schedule.scheduleJob(recurrenceRule, task);

  const client = await connectToRedis();
  const setAsync = promisify(client.set).bind(client);
  await setAsync(jobKey, JSON.stringify({ id: uniqueID, state, recurrenceRule }));
}

async function loadScheduledTasks(): Promise<void> {
  const patterns = ['bewaesserung*', 'markise*'];
  const client = await connectToRedis();
  const keysAsync = promisify(client.keys).bind(client);
  const getAsync = promisify(client.get).bind(client);

  for (const pattern of patterns) {
    const jobKeys = await keysAsync(pattern);

    if (jobKeys) {
      for (const jobKey of jobKeys) {
        const data = await getAsync(jobKey);
        if (data) {
          const { state, recurrenceRule } = JSON.parse(data);

          const topic = jobKey.substring(0, jobKey.lastIndexOf('_'));

          const task = await createTask(topic, state);
          jobs[jobKey] = schedule.scheduleJob(recurrenceRule, task);
        }
      }
    }
  }
}

interface TaskDetail {
  taskId: string;
  state: boolean;
  recurrenceRule: string;
}

interface TasksByTopic {
  [key: string]: TaskDetail[];
}

async function getScheduledTasks(): Promise<TasksByTopic> {
  const patterns = ['bewaesserung*', 'markise*'];
  const client = await connectToRedis();
  const keysAsync = promisify(client.keys).bind(client);
  const getAsync = promisify(client.get).bind(client);

  const tasksByTopic: TasksByTopic = {};

  for (const pattern of patterns) {
    const jobKeys = await keysAsync(pattern);

    if (jobKeys) {
      for (const jobKey of jobKeys) {
        const data = await getAsync(jobKey);

        if (data) {
          const { id, state, recurrenceRule } = JSON.parse(data);

          const topic = jobKey.substring(0, jobKey.lastIndexOf('_'));

          if (!tasksByTopic[topic]) {
            tasksByTopic[topic] = [];
          }

          tasksByTopic[topic].push({ taskId: id, state, recurrenceRule });
        }
      }
    }
  }
  return tasksByTopic;
}

export {
  scheduleTask,
  loadScheduledTasks,
  getScheduledTasks,
};
