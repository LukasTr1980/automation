import express from 'express';
import { getScheduledTasks } from '../scheduler.js';
import logger from '../logger.js';
import { irrigationSwitchTopics, irrigationSwitchSetTopics, irrigationSwitchDescriptions } from '../utils/constants.js';

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

function parseRecurrence(rule: unknown): RecurrenceRule | null {
  try {
    let r = rule as any;
    if (typeof r === 'string') {
      try { r = JSON.parse(r); } catch { /* ignore */ }
    }
    if (!r || typeof r !== 'object') return null;
    const hour = Number(r.hour);
    const minute = Number(r.minute);
    const dayOfWeek = Array.isArray(r.dayOfWeek) ? r.dayOfWeek.map((n: any) => Number(n)).filter((n: number) => Number.isInteger(n)) : [];
    const month = Array.isArray(r.month) ? r.month.map((n: any) => Number(n)).filter((n: number) => Number.isInteger(n)) : [];
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return { hour, minute, dayOfWeek, month } as RecurrenceRule;
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
    const allTasks = await getScheduledTasks();
    
    if (!allTasks || Object.keys(allTasks).length === 0) {
      logger.info('No scheduled tasks found', { label: 'NextScheduleRoute' });
      return res.json({ 
        nextTask: null,
        nextScheduled: 'No schedules',
        zone: null
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
        zone: null
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
        zone: null
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

    logger.info(`Next irrigation scheduled: ${timeDisplay} for ${zoneName}`, { label: 'NextScheduleRoute' });
    
    res.json({
      nextTask: bestTask,
      nextScheduled: timeDisplay,
      zone: zoneName,
      topic: bestTask.topic,
      scheduleDetails: scheduleDetails,
      taskId: bestTask.taskId
    });
  } catch (error) {
    logger.error('Error fetching next schedule', error as Error, { label: 'NextScheduleRoute' });
    res.status(500).json({ 
      error: 'Failed to fetch next schedule',
      nextTask: null,
      nextScheduled: 'Error',
      zone: null
    });
  }
});

export default router;
