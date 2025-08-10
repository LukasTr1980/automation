import logger from '../logger.js';
import { connectToRedis } from '../clients/redisClient.js';

async function getTaskEnabler(zone: string): Promise<boolean | void> {
  try {
    const client = await connectToRedis();
    const result = await client.get(`taskEnabler:${zone}`);
    logger.info(`Task enabler status for zone "${zone}" retrieved as "${result}"`);

    return result === 'true';
  } catch (error) {
    logger.error('Error while getting task enabler status:', error);
  }
}

export default getTaskEnabler;
