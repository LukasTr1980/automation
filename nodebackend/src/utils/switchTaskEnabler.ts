import logger from '../logger.js';
import { connectToRedis } from '../clients/redisClient.js';

async function setTaskEnabler(zone: string, state: boolean): Promise<void> {
  try {
    const client = await connectToRedis();
    // Set the state of the task enabler for a given zone
    await client.set(`taskEnabler:${zone}`, state ? 'true' : 'false');
    logger.info(`Task enabler status for zone "${zone}" set to "${state}"`);
  } catch (error) {
    logger.error('Error while setting task enabler status:', error);
  }
}

export default setTaskEnabler;
