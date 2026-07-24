import express from 'express';
import { getScheduledTasks } from '../scheduler.js';
import logger from '../logger.js';
import { irrigationSwitchTopics, irrigationSwitchSetTopics, irrigationSwitchDescriptions } from '../utils/constants.js';
import { createIrrigationDecision } from '../irrigationDecision.js';
import { reasonFromIrrigationBlockers } from '../utils/irrigationBlockerReason.js';
import { readDecisionCheckSkipped } from '../utils/decisionCheckState.js';
import {
  createDecisionAwareIrrigationSummary,
  createNextIrrigationSummary,
} from '../utils/nextIrrigationStatus.js';

const router = express.Router();

interface RecurrenceRule {
  hour: number;
  minute: number;
  dayOfWeek?: number[];
  month?: number[];
}

interface TaskDetail {
  taskId: string;
  state: boolean;
  recurrenceRule: string | RecurrenceRule;
}

interface TaskWithTopic extends TaskDetail {
  topic: string;
}

function toIntegerArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry));
}

function parseRecurrence(rule: unknown): RecurrenceRule | null {
  try {
    let parsedRule: unknown = rule;
    if (typeof parsedRule === 'string') {
      try { parsedRule = JSON.parse(parsedRule); } catch { /* ignore */ }
    }
    if (!parsedRule || typeof parsedRule !== 'object') return null;
    const record = parsedRule as Record<string, unknown>;
    const hour = Number(record.hour);
    const minute = Number(record.minute);
    const dayOfWeek = toIntegerArray(record.dayOfWeek);
    const month = toIntegerArray(record.month);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return { hour, minute, dayOfWeek, month };
  } catch {
    return null;
  }
}

function nextOccurrence(rule: RecurrenceRule, from = new Date()): Date | null {
  const maxDays = 370; // a bit more than a year
  for (let i = 0; i < maxDays; i++) {
    const base = new Date(from);
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + i);
    const cand = new Date(base.getFullYear(), base.getMonth(), base.getDate(), rule.hour, rule.minute, 0, 0);
    // Month filter (0..11)
    if (rule.month && rule.month.length > 0 && !rule.month.includes(cand.getMonth())) continue;
    // Day-of-week filter (0..6; 0=Sunday)
    if (rule.dayOfWeek && rule.dayOfWeek.length > 0 && !rule.dayOfWeek.includes(cand.getDay())) continue;
    if (cand >= from) return cand;
  }
  return null;
}

router.get('/next', async (req, res) => {
  try {
    const decisionCheckSkipped = await readDecisionCheckSkipped();
    const allTasks = await getScheduledTasks();
    
    if (!allTasks || Object.keys(allTasks).length === 0) {
      logger.info('No scheduled tasks found', { label: 'NextScheduleRoute' });
      return res.json({ 
        nextTask: null,
        nextScheduled: 'No schedules',
        zone: null,
        nextIrrigation: createNextIrrigationSummary(
          'inactive',
          'no_schedules',
          null,
          null,
          0,
          decisionCheckSkipped,
        ),
      });
    }

    // Flatten all tasks from all zones with topic info
    const allTasksFlat: TaskWithTopic[] = Object.entries(allTasks).flatMap(([topic, tasks]) => 
      tasks.map(task => ({ ...task, topic }))
    );

    // Filter only enabled tasks from irrigation topics
    const enabledIrrigationTasks = allTasksFlat.filter(task => 
      task.state === true && task.topic.startsWith('bewaesserung')
    );

    if (enabledIrrigationTasks.length === 0) {
      logger.info('No enabled irrigation tasks found', { label: 'NextScheduleRoute' });
      return res.json({ 
        nextTask: null,
        nextScheduled: 'No active schedules',
        zone: null,
        nextIrrigation: createNextIrrigationSummary(
          'inactive',
          'no_active_schedules',
          null,
          null,
          0,
          decisionCheckSkipped,
        ),
      });
    }

    // Compute actual next occurrence across all enabled tasks
    let bestTask: TaskWithTopic | null = null;
    let bestWhen: Date | null = null;
    const now = new Date();
    for (const t of enabledIrrigationTasks) {
      const r = parseRecurrence(t.recurrenceRule);
      if (!r) continue;
    const when = nextOccurrence(r, now);
    if (!when) continue;
    if (!bestWhen || when < bestWhen) {
      bestWhen = when;
      bestTask = t;
    }
    }
    if (!bestTask || !bestWhen) {
      logger.info('No valid upcoming irrigation occurrence found', { label: 'NextScheduleRoute' });
      return res.json({ 
        nextTask: null,
        nextScheduled: 'No active schedules',
        zone: null,
        nextIrrigation: createNextIrrigationSummary(
          'inactive',
          'no_active_schedules',
          null,
          null,
          0,
          decisionCheckSkipped,
        ),
      });
    }

    // Convert topic to zone name using the same mapping as frontend constants
    const bewaesserungsTopics = irrigationSwitchTopics;
    const bewaesserungsTopicsSet = irrigationSwitchSetTopics;
    const switchDescriptions = irrigationSwitchDescriptions;

    // Find the index in either topics array to map to switchDescriptions
    let topicIndex = bewaesserungsTopics.indexOf(bestTask.topic);
    if (topicIndex === -1) {
      topicIndex = bewaesserungsTopicsSet.indexOf(bestTask.topic);
    }
    
    const zoneName = topicIndex !== -1 ? switchDescriptions[topicIndex] : bestTask.topic;

    // Extract time information from recurrenceRule
    let timeDisplay = 'Scheduled';
    let scheduleDetails = null;
    let nextTimestamp: string | null = null;
    
    try {
      let ruleObj = bestTask.recurrenceRule;
      
      // If it's a string, try to parse it as JSON, otherwise use it as-is if it's already an object
      if (typeof ruleObj === 'string') {
        try {
          ruleObj = JSON.parse(ruleObj);
        } catch (_parseError) {
          logger.warn(`RecurrenceRule is a string but not valid JSON: ${bestTask.recurrenceRule}`, { label: 'NextScheduleRoute' });
        }
      }
      
      const rule = parseRecurrence(ruleObj);
      if (rule) {
        const hours = String(rule.hour).padStart(2, '0');
        const minutes = String(rule.minute).padStart(2, '0');
        // Prefer concrete next occurrence including local date if not today
        const today = new Date(); today.setHours(0,0,0,0);
        const when = bestWhen!;
        nextTimestamp = when.toISOString();
        const whenDay = new Date(when.getFullYear(), when.getMonth(), when.getDate());
        if (whenDay.getTime() !== today.getTime()) {
          // e.g., Mo 07:30
          const weekday = ['So','Mo','Di','Mi','Do','Fr','Sa'][when.getDay()];
          timeDisplay = `${weekday} ${hours}:${minutes}`;
        } else {
          timeDisplay = `${hours}:${minutes}`;
        }
        scheduleDetails = {
          hour: rule.hour,
          minute: rule.minute,
          dayOfWeek: rule.dayOfWeek || [],
          month: rule.month || []
        };
      } else {
        logger.warn(`Invalid recurrenceRule for task ${bestTask.taskId}`, { label: 'NextScheduleRoute' });
      }
    } catch (error) {
      logger.error(`Error processing recurrenceRule for task ${bestTask.taskId}:`, error as Error, { label: 'NextScheduleRoute' });
    }

    // Determine whether we are currently inside any configured irrigation season
    // A task with no month filter (empty month array) is treated as "all months".
    const currentMonth = now.getMonth();
    const inSeason = enabledIrrigationTasks.some((t) => {
      const r = parseRecurrence(t.recurrenceRule);
      if (!r) return false;
      if (!r.month || r.month.length === 0) return true;
      return r.month.includes(currentMonth);
    });

    let decisionAvailable = true;
    let blockerCount = 0;
    let blockerReason = null;
    if (inSeason) {
      try {
        const decision = await createIrrigationDecision();
        const blockers = decision.response.blockers ?? [];
        blockerCount = blockers.length;
        blockerReason = blockers.length > 0 ? reasonFromIrrigationBlockers(blockers) : null;
      } catch (error) {
        decisionAvailable = false;
        logger.warn('Failed to derive next irrigation decision status', {
          label: 'NextScheduleRoute',
          error: error instanceof Error ? error.message : String(error),
          decisionCheckSkipped,
        });
      }
    }
    const nextIrrigation = createDecisionAwareIrrigationSummary({
      inSeason,
      decisionCheckSkipped,
      decisionAvailable,
      blockerReason,
      blockerCount,
      nextTimestamp,
      zone: zoneName,
    });

    logger.info(`Next irrigation scheduled: ${timeDisplay} for ${zoneName}`, { label: 'NextScheduleRoute' });
    
    res.json({
      nextTask: bestTask,
      nextScheduled: timeDisplay,
      zone: zoneName,
      topic: bestTask.topic,
      scheduleDetails: scheduleDetails,
      taskId: bestTask.taskId,
      nextTimestamp,
      inSeason,
      nextIrrigation,
    });
  } catch (error) {
    logger.error('Error fetching next schedule', error as Error, { label: 'NextScheduleRoute' });
    res.status(500).json({ 
      error: 'Failed to fetch next schedule',
      nextTask: null,
      nextScheduled: 'Error',
      zone: null,
      nextIrrigation: createNextIrrigationSummary('unknown', 'schedule_error', null, null),
    });
  }
});

export default router;
