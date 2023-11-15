const Redis = require('ioredis');
const envSwitcher = require('./envSwitcher');
const namespaces = require('../nodeserver/namespace');
const vaultClient = require('./vaultClient');
const logger = require('./logger');

let client;
let subscriptionClient;
let redisPassword;

async function fetchRedisPassword() {
  if (!redisPassword) {
    try {
      await vaultClient.login();
      const credentials = await vaultClient.getSecret('kv/data/automation/redis');
      redisPassword = credentials.data.REDIS_PASSWORD;

      if (!redisPassword) {
        throw new Error('Failed to retrieve Redis password from Vault.');
      }
    } catch (error) {
      logger.error('Could not fetch credentials from Vault', error);
      throw error;
    }
  }
}

async function connectToRedis() {
  await fetchRedisPassword();

  if (!client) {
    client = new Redis({
      host: envSwitcher.redisHost,
      port: 6379,
      password: redisPassword,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    client.on('connect', () => {
      logger.info('Redis client is connected');
    });

    client.on('ready', () => {
      logger.info('Redis client is ready');
    });

    client.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    client.on('end', () => {
      logger.info('Redis client connection has ended');
    });

    try {
      // Test the connection
      await client.ping();
    } catch (err) {
      logger.error('Failed to connect to Redis:', err);
      process.exit(1);
    }
  }

  return client;
}

async function subscribeToRedisKey(io) {
  await fetchRedisPassword();

  if (!subscriptionClient) {
    try {
      const markiseStatusNamespace = namespaces.markiseStatus;

      subscriptionClient = new Redis({
        host: envSwitcher.redisHost,
        port: 6379,
        password: redisPassword,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      subscriptionClient.on('pmessage', async (pattern, channel, message) => {
        const baseKey = channel.substring(15, channel.lastIndexOf(":"));
        if (baseKey.startsWith('countdown:')) {
          try {
            const countdownHoursKey = `${baseKey}:countdownHours`;
            const countdownMinutesKey = `${baseKey}:countdownMinutes`;
            const countdownControlKey = `${baseKey}:countdownControl`;
            const countdownValueKey = `${baseKey}:value`;

            const countdownHours = await client.get(countdownHoursKey);
            const countdownMinutes = await client.get(countdownMinutesKey);
            const countdownControl = await client.get(countdownControlKey);
            const countdownValue = await client.get(countdownValueKey);
            logger.info(countdownControl);

            const topic = baseKey.split(':')[1];

            const numericValue = parseInt(countdownValue, 10);

            io.emit('redis-countdown-update', {
              baseKey,
              topic,
              countdownHours,
              countdownMinutes,
              countdownControl,
              countdownValue: numericValue
            });
          } catch (error) {
            logger.error('Error fetching countdown values from Redis:', error);
          }
        } else if (baseKey.startsWith(`${markiseStatusNamespace}`)) {
          io.emit('redis-markise-update', { pattern, channel, message });
        }
      });

      await subscriptionClient.psubscribe('__keyspace@0__:countdown:*');
      logger.info('Subscribed to all keys starting with countdown:');

      await subscriptionClient.psubscribe(`__keyspace@0__:${markiseStatusNamespace}:markise:throttling_active`);
      logger.info('Subscribed to markise:throttling_active key');

      await subscriptionClient.psubscribe(`__keyspace@0__:${markiseStatusNamespace}:markise:weather:*`);
      logger.info('Subscribed to all keys starting with markise:weather');

    } catch (err) {
      logger.error('Failed to subscribe:', err);
    }

    subscriptionClient.on('error', (err) => {
      logger.error('Subscription client error:', err);
    });
  }
}

module.exports = {
  connectToRedis,
  subscribeToRedisKey
};