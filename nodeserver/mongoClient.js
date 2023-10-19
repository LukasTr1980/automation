const { MongoClient } = require('mongodb');
const envSwitcher = require('./envSwitcher');
const connectToRedis = require('./redisClient');

let isConnected = false;
let client;

async function connectToDatabase() {
    const dbName = "automation";
    
    if (!isConnected) {
        try {
            // Get the Redis client
            const redis = await connectToRedis();

            // Retrieve MongoDB credentials from Redis
            const username = await redis.get('mongo:username');
            const password = await redis.get('mongo:password');

            // Check if both username and password are retrieved
            if (!username || !password) {
                throw new Error('MongoDB credentials not found in Redis.');
            }

            const host = envSwitcher.mongoDbHost;

            // Form the MongoDB connection URL
            const url = `mongodb://${username}:${password}@${host}/${dbName}?authSource=admin`;

            client = new MongoClient(url);
            await client.connect();

            console.log('Connected to MongoDB');
            isConnected = true;
        } catch (error) {
            console.error('Could not connect to MongoDB', error);
            throw error;  // re-throw the error after logging it
        }
    }
    return client.db(dbName);
}

module.exports = {
    connectToMongo: connectToDatabase
};
