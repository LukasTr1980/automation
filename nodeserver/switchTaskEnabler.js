const logger = require('../shared/build/logger').default;
const { connectToRedis } = require('../shared/build/redisClient');

async function setTaskEnabler(zone, state) {
  try {
    const client = await connectToRedis();
    // Set the state of the task enabler for a given zone
    await client.set(`taskEnabler:${zone}`, state ? 'true' : 'false');
    logger.info(`Task enabler status for zone "${zone}" set to "${state}"`);
  } catch (error) {
    logger.error('Error while setting task enabler status:', error);
  }
}

module.exports = setTaskEnabler;
