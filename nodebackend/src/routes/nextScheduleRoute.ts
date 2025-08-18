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

    // For simplicity, just take the first enabled task
    // In a real implementation, you'd want to parse the recurrenceRule to find the actual next execution time
    const firstTask = enabledIrrigationTasks[0];

    // Convert topic to zone name using the same mapping as frontend constants
    const bewaesserungsTopics = irrigationSwitchTopics;
    const bewaesserungsTopicsSet = irrigationSwitchSetTopics;
    const switchDescriptions = irrigationSwitchDescriptions;

    // Find the index in either topics array to map to switchDescriptions
    let topicIndex = bewaesserungsTopics.indexOf(firstTask.topic);
    if (topicIndex === -1) {
      topicIndex = bewaesserungsTopicsSet.indexOf(firstTask.topic);
    }
    
    const zoneName = topicIndex !== -1 ? switchDescriptions[topicIndex] : firstTask.topic;

    // Extract time information from recurrenceRule
    let timeDisplay = 'Scheduled';
    let scheduleDetails = null;
    
    try {
      let ruleObj = firstTask.recurrenceRule;
      
      // If it's a string, try to parse it as JSON, otherwise use it as-is if it's already an object
      if (typeof ruleObj === 'string') {
        try {
          ruleObj = JSON.parse(ruleObj);
        } catch (_parseError) {
          logger.warn(`RecurrenceRule is a string but not valid JSON: ${firstTask.recurrenceRule}`, { label: 'NextScheduleRoute' });
        }
      }
      
      if (ruleObj && typeof ruleObj === 'object' && 'hour' in ruleObj && 'minute' in ruleObj) {
        const rule = ruleObj as RecurrenceRule;
        // Format time as HH:MM
        const hours = String(rule.hour).padStart(2, '0');
        const minutes = String(rule.minute).padStart(2, '0');
        timeDisplay = `${hours}:${minutes}`;
        
        // Include additional schedule details
        scheduleDetails = {
          hour: rule.hour,
          minute: rule.minute,
          dayOfWeek: rule.dayOfWeek || [],
          month: rule.month || []
        };
      } else {
        logger.warn(`RecurrenceRule doesn't have expected hour/minute properties for task ${firstTask.taskId}:`, ruleObj, { label: 'NextScheduleRoute' });
      }
    } catch (error) {
      logger.error(`Error processing recurrenceRule for task ${firstTask.taskId}:`, error as Error, { label: 'NextScheduleRoute' });
    }

    logger.info(`Next irrigation scheduled: ${timeDisplay} for ${zoneName}`, { label: 'NextScheduleRoute' });
    
    res.json({
      nextTask: firstTask,
      nextScheduled: timeDisplay,
      zone: zoneName,
      topic: firstTask.topic,
      scheduleDetails: scheduleDetails,
      taskId: firstTask.taskId
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
