const Redis = require('ioredis');
const envSwitcher = require('./envSwitcher');

let client;

async function connectToRedis() {
  if (!client) {
    client = new Redis({
      host: envSwitcher.redisHost,
      port: 6379,
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

module.exports = connectToRedis;
