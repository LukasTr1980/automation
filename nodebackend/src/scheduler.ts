import schedule from 'node-schedule';
import { connectToRedis } from './clients/redisClient.js';
import isIrrigationNeeded from './gptChatIrrigation.js';
import getTaskEnabler from './utils/getTaskEnabler.js';
import generateUniqueId from './utils/generateUniqueId.js';
import { topicToTaskEnablerKey, skipAiRedisKey } from './utils/constants.js';
import MqttPublisher from './utils/mqttPublisher.js';
import { computeTodayET0 } from './utils/evapotranspiration.js';
import { recordCurrentCloudCover } from './utils/cloudCoverRecorder.js';
import { odhRecordNextDayRain } from './utils/odhRainRecorder.js';
import logger from './logger.js';
import { recordIrrigationStartInflux } from './clients/influxdb-client.js';

const publisher = new MqttPublisher();

interface Job {
  [key: string]: schedule.Job;
}

const jobs: Job = {};

schedule.scheduleJob('55 23 * * *', async () => {
  try {
    const val = await computeTodayET0();
    logger.info(`ET₀ Scheduler-Run: ${val} mm`);
  } catch (error) {
    logger.error('ET₀ scheduler run failed:', error);
  }
});

// Schedule the task to run every 15 minutes
schedule.scheduleJob('*/15 * * * *', async () => {
  try {
    const { cloud } = await recordCurrentCloudCover();
    logger.info(`CloudCover Scheduler-Run: ${cloud.toFixed(0)} %`);
  } catch (error) {
    logger.error('CloudCover scheduler run failed:', error);
  }
});

schedule.scheduleJob('*/15 * * * *', async () => {
  try {
    const val = await odhRecordNextDayRain();
    logger.info(
      `OdhNextDayRain: ${val.rainSum.toFixed(2)} mm – Wahrscheinlichkeit max ${val.probMax}% – gültig für ${val.date.slice(0,10)}`
    );
  } catch (err) {
    logger.error("OdhNextDayRain scheduler run failed:", err);
  }
});

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

      if (state === false) {
        publisher.publish(topic, state.toString(), (err: Error | null) => {
          if (err) {
            logger.error('Error while publishing message:', err);
          } else {
            logger.info('Message published successfully.');
          }
        });
      } else {
        // If skipAiVerification is enabled, we bypass the AI check and
        // execute scheduled irrigation directly.
        const client = await connectToRedis();
        const skipAi = (await client.get(skipAiRedisKey)) === 'true';
        if (skipAi) {
          publisher.publish(topic, state.toString(), async (err: Error | null) => {
            if (err) {
              logger.error('Error while publishing message:', err);
            } else {
              logger.info(`Irrigation started for zone ${zoneName} (AI verification skipped)`);
              await recordIrrigationStartInflux(zoneName);
            }
          });
        } else {
          const { result: irrigationNeeded } = await isIrrigationNeeded();
          if (irrigationNeeded) {
            publisher.publish(topic, state.toString(), async (err: Error | null) => {
              if (err) {
                logger.error('Error while publishing message:', err);
              } else {
                logger.info(`Irrigation started for zone ${zoneName}`);
                await recordIrrigationStartInflux(zoneName);
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

interface RecurrenceRule {
  hour: number;
  minute: number;
  dayOfWeek: number[];
  month: number[];
}

async function scheduleTask(topic: string, state: boolean, recurrenceRule: RecurrenceRule): Promise<void> {
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
  const jobData = JSON.stringify({ id: uniqueID, state, recurrenceRule });
  await client.set(jobKey, jobData);
}

async function loadScheduledTasks(): Promise<void> {
  const patterns = ['bewaesserung*'];
  const client = await connectToRedis();

  for (const pattern of patterns) {
    const jobKeys = await client.keys(pattern);

    if (jobKeys) {
      for (const jobKey of jobKeys) {
        const data = await client.get(jobKey);
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
  const patterns = ['bewaesserung*'];
  const client = await connectToRedis();

  const tasksByTopic: TasksByTopic = {};

  for (const pattern of patterns) {
    const jobKeys = await client.keys(pattern);

    if (jobKeys) {
      for (const jobKey of jobKeys) {
        const data = await client.get(jobKey);

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
  jobs
};
