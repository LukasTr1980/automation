import { connectToRedis } from '../clients/redisClient.js';
import { skipDecisionCheckRedisKey } from './constants.js';

export async function readDecisionCheckSkipped(): Promise<boolean> {
  const client = await connectToRedis();
  return (await client.get(skipDecisionCheckRedisKey)) === 'true';
}

export async function writeDecisionCheckSkipped(skip: boolean): Promise<void> {
  const client = await connectToRedis();
  await client.set(skipDecisionCheckRedisKey, skip ? 'true' : 'false');
}
