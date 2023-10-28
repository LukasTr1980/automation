const Redis = require('ioredis');
const envSwitcher = require('./envSwitcher');
require('dotenv').config();
const namespaces = require('./namespace');

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
    try {
      // Retrieve or create the 'markise' namespace
      const markiseStatusNamespace = namespaces.markiseStatus;

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

        const key = channel.substring(15);

        if (key.startsWith('countdown:')) {
          io.emit('redis-countdown-update', { pattern, channel, message });
        } else if (key.startsWith(`${markiseStatusNamespace}`)) {
          io.emit('redis-markise-update', { pattern, channel, message });
        }
      });

      // Existing subscription
      await subscriptionClient.psubscribe('__keyspace@0__:countdown:*');
      console.log('Subscribed to all keys starting with countdown:');

      // New subscriptions for markise status and throttling
      await subscriptionClient.psubscribe(`__keyspace@0__:${markiseStatusNamespace}:markise:throttling_active`);
      console.log('Subscribed to markise:throttling_active key');

      await subscriptionClient.psubscribe(`__keyspace@0__:${markiseStatusNamespace}:markise:weather:*`);
      console.log('Subscribed to all keys starting with markise:weather');

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