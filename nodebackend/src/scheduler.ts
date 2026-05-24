import schedule from 'node-schedule';
import { connectToRedis } from './clients/redisClient.js';
import { createIrrigationDecision } from './irrigationDecision.js';
import getTaskEnabler from './utils/getTaskEnabler.js';
import generateUniqueId from './utils/generateUniqueId.js';
import { topicToTaskEnablerKey, skipDecisionCheckRedisKey, irrigationSwitchTopics, irrigationSwitchDescriptions } from './utils/constants.js';
import MqttPublisher from './utils/mqttPublisher.js';
import { computeWeeklyET0 } from './utils/evapotranspiration.js';
import { recordCurrentGlobalRadiation } from './utils/radiationRecorder.js';
import { odhRecordNextDayRain } from './utils/odhRainRecorder.js';
import logger from './logger.js';
import { recordIrrigationEvent } from './utils/irrigationEventsRecorder.js';
import { dailySoilBalance, queueIrrigationRunForDailyAverage } from './utils/soilBucket.js';
import { broadcastPayloadToSseClients } from './utils/sseHandler.js';
import { DEFAULT_RUN_DURATION_MIN, depthForRunMinutes } from './utils/irrigationDepthService.js';
import { fetchLatestWeatherSnapshot, getRainRateFromWeatherlink, getDailyRainTotal, getSevenDayRainTotal, getOutdoorTempAverageRange, getOutdoorHumidityAverageRange, getOutdoorWindSpeedAverageRange, getOutdoorTempExtremaRange, getOutdoorPressureAverageRange } from './clients/weatherlink-client.js';
import { writeLatestWeatherToRedis } from './utils/weatherLatestStorage.js';
import { writeWeatherAggregatesToRedis, readWeatherAggregatesFromRedis } from './utils/weatherAggregatesStorage.js';
import { writeDailyLast7ToRedis } from './utils/weatherDailyStorage.js';

const publisher = new MqttPublisher();

interface Job {
  [key: string]: schedule.Job;
}

const jobs: Job = {};

// Daily ET₀ job removed; ET₀ is refreshed every 5 minutes alongside weather cache

// Poll official South Tyrol global-radiation measurements shortly after the
// station network's 10-minute timestamps are expected to become available.
schedule.scheduleJob(process.env.RADIATION_POLL_CRON ?? '2,12,22,32,42,52 * * * *', async () => {
  try {
    const { globalRadiationWM2, stationCode, qualityFlag } = await recordCurrentGlobalRadiation();
    logger.info(`GlobalRadiation Scheduler-Run: ${globalRadiationWM2.toFixed(0)} W/m² (${stationCode}, ${qualityFlag})`);
  } catch (error) {
    logger.error('Global radiation scheduler run failed:', error);
  }
});

schedule.scheduleJob('*/15 * * * *', async () => {
  try {
    const val = await odhRecordNextDayRain();
    logger.info(
      `OdhRainForecast: today ${val.today.rainSum.toFixed(2)} mm / ${val.today.probMax}% – tomorrow ${val.tomorrow.rainSum.toFixed(2)} mm / ${val.tomorrow.probMax}%`
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

    // Compute and cache rolling rain totals (24h, 7d) every 5 minutes; keep 7d means unchanged until daily refresh
    const now = new Date();
    const [r24, r7] = await Promise.all([
      getDailyRainTotal(now, 'metric'),
      getSevenDayRainTotal(now, 'metric'),
    ] as const);

    // Read existing 7d averages from Redis to preserve their values during the day
    const existing = await readWeatherAggregatesFromRedis();
    const agg = {
      rain24hMm: r24.ok ? Math.round(r24.total * 10) / 10 : (existing?.rain24hMm ?? null),
      rain7dMm: r7.ok ? Math.round(r7.total * 10) / 10 : (existing?.rain7dMm ?? null),
      temp7dAvgC: existing?.temp7dAvgC ?? null,
      humidity7dAvgPct: existing?.humidity7dAvgPct ?? null,
      wind7dAvgMS: existing?.wind7dAvgMS ?? null,
      pressure7dAvgHPa: existing?.pressure7dAvgHPa ?? null,
      temp7dRangeAvgC: existing?.temp7dRangeAvgC ?? null,
      timestamp: new Date().toISOString(),
      // Preserve daily means timestamp so frontend can distinguish from rolling rain updates
      meansTimestamp: existing?.meansTimestamp ?? existing?.timestamp,
    };
    await writeWeatherAggregatesToRedis(agg);
    logger.info(`[WEATHERLINK] Cached aggs: r24=${agg.rain24hMm ?? 'n/a'} mm, r7=${agg.rain7dMm ?? 'n/a'} mm (7d means unchanged until daily job)`);

    // ET0 recomputation removed from 5-min loop; handled by a daily job
  } catch (error) {
    logger.error('WeatherLink latest cache scheduler failed:', error);
  }
});

// Compute ET₀ daily last-7 once per day shortly after local midnight
schedule.scheduleJob('40 0 * * *', async () => {
  try {
    const sum = await computeWeeklyET0();
    logger.info(`ET₀ daily last-7 refreshed (sum=${sum} mm)`);
  } catch (err) {
    logger.error('ET₀ daily recompute failed:', err);
  }
});

// Apply daily soil water balance shortly after ET0 is computed
schedule.scheduleJob('45 0 * * *', async () => {
  try {
    // Currently we track a single zone bucket aligned with decision logic
    await dailySoilBalance('lukasSued');
  } catch (err) {
    logger.error('Soil bucket daily balance failed:', err);
  }
});

// Refresh last-7 daily aggregates and 7d means once per day (aligned to local midnight)
schedule.scheduleJob('35 0 * * *', async () => {
  try {
    const now = new Date();
    const SEVEN_DAYS = 7 * 24 * 3600;
    const alignedEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [t7, h7, w7, p7, tExt7] = await Promise.all([
      getOutdoorTempAverageRange({ end: alignedEnd, windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, combineMode: 'dailyMean', units: 'metric' }),
      getOutdoorHumidityAverageRange({ end: alignedEnd, windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, combineMode: 'dailyMean' }),
      getOutdoorWindSpeedAverageRange({ end: alignedEnd, windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, combineMode: 'dailyMean', units: 'metric' }),
      getOutdoorPressureAverageRange({ end: alignedEnd, windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, combineMode: 'sampleWeighted', units: 'metric' }),
      getOutdoorTempExtremaRange({ end: alignedEnd, windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, units: 'metric' }),
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

    // Merge with current rain totals so the agg payload remains complete
    const existing = await readWeatherAggregatesFromRedis();
    const agg = {
      rain24hMm: existing?.rain24hMm ?? null,
      rain7dMm: existing?.rain7dMm ?? null,
      temp7dAvgC: t7.ok ? Math.round(t7.avg * 100) / 100 : null,
      humidity7dAvgPct: h7.ok ? Math.round(h7.avg) : null,
      wind7dAvgMS: w7.ok ? Math.round(w7.avg * 1000) / 1000 : null,
      pressure7dAvgHPa: p7.ok ? Math.round(p7.avg) : null,
      temp7dRangeAvgC: deltaT7Avg,
      timestamp: new Date().toISOString(),
      // Set/refresh the means timestamp on the daily job
      meansTimestamp: new Date().toISOString(),
    };
    await writeWeatherAggregatesToRedis(agg);
    logger.info(`[WEATHERLINK] Daily 7d means cached: t7=${agg.temp7dAvgC ?? 'n/a'} °C, h7=${agg.humidity7dAvgPct ?? 'n/a'} %, w7=${agg.wind7dAvgMS ?? 'n/a'} m/s, p7=${agg.pressure7dAvgHPa ?? 'n/a'} hPa, dT7=${agg.temp7dRangeAvgC ?? 'n/a'} °C`);

    // Persist per-day aggregates for the last 7 full local days in Redis
    try {
      const len = Math.min(
        t7.ok ? t7.chunks.length : 0,
        h7.ok ? h7.chunks.length : 0,
        w7.ok ? w7.chunks.length : 0,
        p7.ok ? p7.chunks.length : 0,
        tExt7.ok ? tExt7.chunks.length : 0,
      );

      const fmtDate = (ts: number) => {
        const d = new Date(ts);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const days = [] as Array<{
        date: string;
        tMinC: number | null;
        tMaxC: number | null;
        tAvgC: number | null;
        rhMeanPct: number | null;
        windMeanMS: number | null;
        pressureMeanHPa: number | null;
      }>;

      for (let i = 0; i < len; i++) {
        const start = t7.chunks[i]?.start ?? h7.chunks[i]?.start ?? w7.chunks[i]?.start ?? p7.chunks[i]?.start ?? tExt7.chunks[i]?.start;
        const date = fmtDate(start ?? alignedEnd.getTime() - (len - i) * 86400000);

        const tAvgC = t7.ok && t7.chunks[i]?.count > 0 ? Math.round(t7.chunks[i].avg * 100) / 100 : null;
        const rhMeanPct = h7.ok && h7.chunks[i]?.count > 0 ? Math.round(h7.chunks[i].avg) : null;
        const windMeanMS = w7.ok && w7.chunks[i]?.count > 0 ? Math.round(w7.chunks[i].avg * 1000) / 1000 : null;
        const pressureMeanHPa = p7.ok && p7.chunks[i]?.count > 0 ? Math.round(p7.chunks[i].avg) : null;
        const tMinC = tExt7.ok && tExt7.chunks[i]?.count > 0 && isFinite(tExt7.chunks[i].loMin) ? Math.round(tExt7.chunks[i].loMin * 100) / 100 : null;
        const tMaxC = tExt7.ok && tExt7.chunks[i]?.count > 0 && isFinite(tExt7.chunks[i].hiMax) ? Math.round(tExt7.chunks[i].hiMax * 100) / 100 : null;

        days.push({ date, tMinC, tMaxC, tAvgC, rhMeanPct, windMeanMS, pressureMeanHPa });
      }

      await writeDailyLast7ToRedis({ days, timestamp: new Date().toISOString() });
      logger.info(`[WEATHERLINK] Cached daily last-7 (daily job): ${days.map(d => d.date).join(', ')}`);
    } catch (e) {
      logger.error('Failed to cache daily last-7 aggregates to Redis (daily job)', e);
    }
  } catch (err) {
    logger.error('Daily 7d aggregates refresh failed:', err);
  }
});

async function createTask(topic: string, state: boolean, recurrenceRule: RecurrenceRule): Promise<() => Promise<void>> {
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
        publisher.publish(topic, state.toString(), async (err: Error | null) => {
          if (err) {
            logger.error('Error while publishing message:', err);
          } else {
            logger.info('Message published successfully.');
            await recordIrrigationEvent(zoneName, false, 'scheduler', 'false');
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
              await recordIrrigationEvent(zoneName, true, 'scheduler', 'true');
              try {
                await queueScheduledIrrigationDepth(topic, zoneName, recurrenceRule);
                // Notify SSE clients that a scheduled irrigation has started
                try {
                  broadcastPayloadToSseClients({ type: 'irrigationStart', source: 'scheduled', zone: zoneName, at: new Date().toISOString() });
                } catch {}
              } catch (e) {
                logger.error('Failed to apply irrigation to soil bucket', e);
              }
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
                await recordIrrigationEvent(zoneName, true, 'scheduler', 'true');
                try {
                  await queueScheduledIrrigationDepth(topic, zoneName, recurrenceRule);
                  // Notify SSE clients that a scheduled irrigation has started
                  try {
                    broadcastPayloadToSseClients({ type: 'irrigationStart', source: 'scheduled', zone: zoneName, at: new Date().toISOString() });
                  } catch {}
                } catch (e) {
                  logger.error('Failed to apply irrigation to soil bucket', e);
                }
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

function parseStoredRecurrenceRule(value: unknown): RecurrenceRule | null {
  let raw: unknown;
  try {
    raw = typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const rule = raw as Partial<RecurrenceRule>;
  const hour = Number(rule.hour);
  const minute = Number(rule.minute);
  const dayOfWeek = Array.isArray(rule.dayOfWeek) ? rule.dayOfWeek.map(Number) : [];
  const month = Array.isArray(rule.month) ? rule.month.map(Number) : [];
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return { hour, minute, dayOfWeek, month };
}

function rulesOverlap(a: RecurrenceRule, b: RecurrenceRule): boolean {
  const overlap = (left: number[], right: number[]) => {
    if (!left.length || !right.length) return true;
    return left.some((value) => right.includes(value));
  };
  return overlap(a.dayOfWeek, b.dayOfWeek) && overlap(a.month, b.month);
}

function minutesOfDay(rule: RecurrenceRule): number {
  return rule.hour * 60 + rule.minute;
}

function minutesUntilStop(start: RecurrenceRule, stop: RecurrenceRule): number {
  const startMinutes = minutesOfDay(start);
  const stopMinutes = minutesOfDay(stop);
  const diff = stopMinutes - startMinutes;
  return diff > 0 ? diff : diff + 24 * 60;
}

async function inferRunDurationMinutes(topic: string, startRule: RecurrenceRule): Promise<number> {
  const client = await connectToRedis();
  const jobKeys = await client.keys(`${topic}_*`);
  const stopDurations: number[] = [];

  for (const jobKey of jobKeys) {
    const raw = await client.get(jobKey);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as { state?: boolean; recurrenceRule?: unknown };
      if (parsed.state !== false) continue;
      const stopRule = parseStoredRecurrenceRule(parsed.recurrenceRule);
      if (!stopRule || !rulesOverlap(startRule, stopRule)) continue;
      stopDurations.push(minutesUntilStop(startRule, stopRule));
    } catch (error) {
      logger.warn(`Could not parse scheduled stop task ${jobKey}: ${error}`);
    }
  }

  const bestDuration = stopDurations.sort((a, b) => a - b)[0];
  if (Number.isFinite(bestDuration) && bestDuration > 0) return bestDuration;

  logger.warn(`[Soil] No matching stop schedule found for ${topic}; using default duration ${DEFAULT_RUN_DURATION_MIN} min`);
  return DEFAULT_RUN_DURATION_MIN;
}

async function queueScheduledIrrigationDepth(topic: string, zoneName: string, recurrenceRule: RecurrenceRule): Promise<void> {
  const durationMin = await inferRunDurationMinutes(topic, recurrenceRule);
  const depthMm = depthForRunMinutes(durationMin);
  await queueIrrigationRunForDailyAverage(zoneName, durationMin, depthMm);
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

  const task = await createTask(topic, state, recurrenceRule);
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

          const rule = parseStoredRecurrenceRule(recurrenceRule);
          if (!rule) {
            logger.warn(`Skipping scheduled task with invalid recurrence rule for ${jobKey}`);
            continue;
          }
          const task = await createTask(topic, state, rule);
          jobs[jobKey] = schedule.scheduleJob(rule, task);
        }
      }
    }
  }
}

interface TaskDetail {
  taskId: string;
  state: boolean;
  recurrenceRule: RecurrenceRule;
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
          const rule = parseStoredRecurrenceRule(recurrenceRule);
          if (!rule) {
            logger.warn(`Skipping scheduled task with invalid recurrence rule for ${jobKey}`);
            continue;
          }

          const topic = jobKey.substring(0, jobKey.lastIndexOf('_'));

          if (!tasksByTopic[topic]) {
            tasksByTopic[topic] = [];
          }

          tasksByTopic[topic].push({ taskId: id, state, recurrenceRule: rule });
        }
      }
    }
  }
  return tasksByTopic;
}

interface ScheduledIrrigationDepthRun {
  zone: string;
  zoneLabel: string | null;
  durationMin: number;
  depthMm: number;
}

interface ScheduledIrrigationDepthPreview {
  runs: ScheduledIrrigationDepthRun[];
  averageDepthMm: number | null;
}

function mapZoneLabel(zoneKey: string): string | null {
  const topic = irrigationSwitchTopics.find((entry) => entry.endsWith(`/${zoneKey}`));
  const idx = topic ? irrigationSwitchTopics.indexOf(topic) : -1;
  return idx >= 0 ? irrigationSwitchDescriptions[idx] : null;
}

async function getScheduledIrrigationDepthPreview(): Promise<ScheduledIrrigationDepthPreview> {
  const tasksByTopic = await getScheduledTasks();
  const byZone = new Map<string, ScheduledIrrigationDepthRun>();

  for (const [topic, tasks] of Object.entries(tasksByTopic)) {
    for (const task of tasks) {
      if (task.state !== true) continue;
      const zoneKey = topic.split('/')[2] ?? topic;
      const durationMin = await inferRunDurationMinutes(topic, task.recurrenceRule);
      const depthMm = depthForRunMinutes(durationMin);
      const existing = byZone.get(zoneKey);
      if (!existing || depthMm > existing.depthMm) {
        byZone.set(zoneKey, {
          zone: zoneKey,
          zoneLabel: mapZoneLabel(zoneKey),
          durationMin,
          depthMm,
        });
      }
    }
  }

  const runs = [...byZone.values()];
  const averageDepthMm = runs.length
    ? Math.round((runs.reduce((sum, run) => sum + run.depthMm, 0) / runs.length) * 100) / 100
    : null;

  return { runs, averageDepthMm };
}

export {
  scheduleTask,
  loadScheduledTasks,
  getScheduledTasks,
  getScheduledIrrigationDepthPreview,
  jobs
};
