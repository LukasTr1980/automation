const { MongoClient } = require('mongodb');
const envSwitcher = require('./envSwitcher');
require('dotenv').config();

let isConnected = false;
let client;

async function connectToDatabase() {
    const dbName = "automation";
    
    if (!isConnected) {
        try {
            const username = process.env.MONGO_USERNAME;
            const password = process.env.MONGO_PASSWORD;

            // Check if both username and password are present
            if (!username || !password) {
                throw new Error('MongoDB credentials not found in environment variables.');
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
