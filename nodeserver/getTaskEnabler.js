const connectToRedis = require('./redisClient');

async function getTaskEnabler(zone) {
  try {
    const client = await connectToRedis();
    const result = await client.get(`taskEnabler:${zone}`);
    console.log(`Task enabler status for zone "${zone}" retrieved as "${result}"`);

    // Convert the string "true"/"false" to boolean true/false
    return result === 'true';
  } catch (error) {
    console.error('Error while getting task enabler status:', error);
  }
}

module.exports = getTaskEnabler;
