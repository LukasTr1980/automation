const Redis = require('ioredis');
const envSwitcher = require('./envSwitcher');
require('dotenv').config();

let client;
let subscriptionClient;

async function connectToRedis() {
  if (!client) {
    client = new Redis({
      host: envSwitcher.redisHost,
      port: 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    client.on('connect', () => {
      console.log('Redis client is connected');
    });

    client.on('ready', () => {
      console.log('Redis client is ready');
    });

    client.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    client.on('end', () => {
      console.log('Redis client connection has ended');
    });

    try {
      // Test the connection
      await client.ping();
    } catch (err) {
      console.error('Failed to connect to Redis:', err);
      process.exit(1);
    }
  }

  return client;
}

async function subscribeToRedisKey(io) {
  if (!subscriptionClient) {
    subscriptionClient = new Redis({
      host: envSwitcher.redisHost,
      port: 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    subscriptionClient.on('pmessage', (pattern, channel, message) => {
      console.log(`Pattern: ${pattern}, Channel: ${channel}, Message: ${message}`);

      io.emit('redis-update', { pattern, channel, message });
    });

    try {
      await subscriptionClient.psubscribe('__keyspace@0__:countdown:*');
      console.log('Subscribed to all keys starting with countdown:');
    } catch (err) {
      console.error('Failed to subscribe:', err);
    }

    subscriptionClient.on('error', (err) => {
      console.error('Subscription client error:', err);
    });
  }
}

module.exports = {
  connectToRedis,
  subscribeToRedisKey
};