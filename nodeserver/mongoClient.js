const { MongoClient } = require('mongodb');
const envSwitcher = require('../shared/build/envSwitcher');
const vaultClient = require('../shared/vaultClient');
const logger = require('../shared/build/logger');

let isConnected = false;
let client;

async function connectToDatabase() {
    const dbName = "automation";
    
    if (!isConnected) {
        try {
            await vaultClient.login();

            const credentials = await vaultClient.getSecret('kv/data/automation/mongo');
            const username = credentials.data.MONGO_USERNAME;
            const password = credentials.data.MONGO_PASSWORD;

            if (!username || !password) {
                throw new Error('Failed to retrieve MongoDB credentials from Vault.');
            }
            
            const host = envSwitcher.mongoDbHost;

            // Form the MongoDB connection URL
            const url = `mongodb://${username}:${password}@${host}/${dbName}?authSource=admin`;

            client = new MongoClient(url);
            await client.connect();

            logger.info('Connected to MongoDB');
            isConnected = true;
        } catch (error) {
            logger.error('Could not connect to MongoDB', error);
            throw error;  // re-throw the error after logging it
        }
    }
    return client.db(dbName);
}

module.exports = {
    connectToMongo: connectToDatabase
};
