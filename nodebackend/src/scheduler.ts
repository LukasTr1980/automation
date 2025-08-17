import schedule from 'node-schedule';
import { connectToRedis } from './clients/redisClient.js';
import { createIrrigationDecision } from './irrigationDecision.js';
import getTaskEnabler from './utils/getTaskEnabler.js';
import generateUniqueId from './utils/generateUniqueId.js';
import { topicToTaskEnablerKey, skipDecisionCheckRedisKey } from './utils/constants.js';
import MqttPublisher from './utils/mqttPublisher.js';
import { computeWeeklyET0 } from './utils/evapotranspiration.js';
import { recordCurrentCloudCover } from './utils/cloudCoverRecorder.js';
import { odhRecordNextDayRain } from './utils/odhRainRecorder.js';
import logger from './logger.js';
import { recordIrrigationStartInflux } from './clients/influxdb-client.js';
import { fetchLatestWeatherSnapshot, getRainRateFromWeatherlink, getDailyRainTotal, getSevenDayRainTotal, getOutdoorTempAverageRange, getOutdoorHumidityAverageRange, getOutdoorWindSpeedAverageRange, getOutdoorTempExtremaRange, getOutdoorPressureAverageRange } from './clients/weatherlink-client.js';
import { writeLatestWeatherToRedis } from './utils/weatherLatestStorage.js';
import { writeWeatherAggregatesToRedis } from './utils/weatherAggregatesStorage.js';

const publisher = new MqttPublisher();

interface Job {
  [key: string]: schedule.Job;
}

const jobs: Job = {};

// Daily ET₀ job removed; ET₀ is refreshed every 5 minutes alongside weather cache

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

// Poll WeatherLink current metrics every 5 minutes with 30s delay
schedule.scheduleJob('30 */5 * * * *', async () => {
  try {
    const snap = await fetchLatestWeatherSnapshot();
    const { rate: rainRateMmPerHour } = await getRainRateFromWeatherlink();
    const payload = {
      temperatureC: snap.temperatureC,
      humidity: snap.humidity,
      rainRateMmPerHour: typeof rainRateMmPerHour === 'number' && isFinite(rainRateMmPerHour) ? Math.round(rainRateMmPerHour * 10) / 10 : null,
      timestamp: new Date().toISOString(),
    };
    await writeLatestWeatherToRedis(payload);
    logger.info(`[WEATHERLINK] Cached latest: T=${payload.temperatureC ?? 'n/a'}°C, H=${payload.humidity ?? 'n/a'}%, R=${payload.rainRateMmPerHour ?? 'n/a'} mm/h`);

    // Compute aggregates used by the app (24h/7d rain totals, 7d avg temp/humidity)
    const now = new Date();
    const SEVEN_DAYS = 7 * 24 * 3600;
    const [r24, r7, t7, h7, w7, p7, tExt7] = await Promise.all([
      getDailyRainTotal(now, 'metric'),
      getSevenDayRainTotal(now, 'metric'),
      getOutdoorTempAverageRange({ windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, combineMode: 'dailyMean', units: 'metric' }),
      getOutdoorHumidityAverageRange({ windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, combineMode: 'dailyMean' }),
      getOutdoorWindSpeedAverageRange({ windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, combineMode: 'dailyMean', units: 'metric' }),
      getOutdoorPressureAverageRange({ windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, combineMode: 'sampleWeighted', units: 'metric' }),
      getOutdoorTempExtremaRange({ windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, units: 'metric' }),
    ] as const);

    // Average daily temperature range over 7 days
    let deltaT7Avg: number | null = null;
    if (tExt7.ok) {
      let sum = 0;
      let n = 0;
      for (const c of tExt7.chunks) {
        if (isFinite(c.hiMax) && isFinite(c.loMin) && c.count > 0) {
          sum += (c.hiMax - c.loMin);
          n += 1;
        }
      }
      deltaT7Avg = n > 0 ? Math.round((sum / n) * 100) / 100 : null;
    }

    const agg = {
      rain24hMm: r24.ok ? Math.round(r24.total * 10) / 10 : null,
      rain7dMm: r7.ok ? Math.round(r7.total * 10) / 10 : null,
      temp7dAvgC: t7.ok ? Math.round(t7.avg * 100) / 100 : null,
      humidity7dAvgPct: h7.ok ? Math.round(h7.avg) : null,
      wind7dAvgMS: w7.ok ? Math.round(w7.avg * 1000) / 1000 : null,
      pressure7dAvgHPa: p7.ok ? Math.round(p7.avg) : null,
      temp7dRangeAvgC: deltaT7Avg,
      timestamp: new Date().toISOString(),
    };
    await writeWeatherAggregatesToRedis(agg);
    logger.info(`[WEATHERLINK] Cached aggs: r24=${agg.rain24hMm ?? 'n/a'} mm, r7=${agg.rain7dMm ?? 'n/a'} mm, t7=${agg.temp7dAvgC ?? 'n/a'} °C, h7=${agg.humidity7dAvgPct ?? 'n/a'} %, w7=${agg.wind7dAvgMS ?? 'n/a'} m/s, p7=${agg.pressure7dAvgHPa ?? 'n/a'} hPa, dT7=${agg.temp7dRangeAvgC ?? 'n/a'} °C`);

    // Recompute weekly ET0 using Redis-cached values and store to Redis
    try {
      const sum = await computeWeeklyET0();
      logger.info(`ET₀ Weekly (5-min refresh): ${sum} mm`);
    } catch (err) {
      logger.error('ET₀ 5-min recompute failed:', err);
    }
  } catch (error) {
    logger.error('WeatherLink latest cache scheduler failed:', error);
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
        // If decision check is skipped, execute scheduled irrigation directly.
        const client = await connectToRedis();
        const skipDecision = (await client.get(skipDecisionCheckRedisKey)) === 'true';
        if (skipDecision) {
          publisher.publish(topic, state.toString(), async (err: Error | null) => {
            if (err) {
              logger.error('Error while publishing message:', err);
            } else {
              logger.info(`Irrigation started for zone ${zoneName} (decision check skipped)`);
              await recordIrrigationStartInflux(zoneName);
            }
          });
        } else {
          const { result: irrigationNeeded } = await createIrrigationDecision();
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
