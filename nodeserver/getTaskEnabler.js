const logger = require('../shared/logger');
const { connectToRedis } = require('../shared/redisClient');

async function getTaskEnabler(zone) {
  try {
    const client = await connectToRedis();
    const result = await client.get(`taskEnabler:${zone}`);
    logger.info(`Task enabler status for zone "${zone}" retrieved as "${result}"`);

    // Convert the string "true"/"false" to boolean true/false
    return result === 'true';
  } catch (error) {
    logger.error('Error while getting task enabler status:', error);
  }
}

module.exports = getTaskEnabler;
