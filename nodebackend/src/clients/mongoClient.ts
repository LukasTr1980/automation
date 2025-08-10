import { MongoClient, Db } from 'mongodb';
import * as envSwitcher from '../envSwitcher.js';
import * as vaultClient from './vaultClient.js';
import logger from '../logger.js';

let isConnected: boolean = false;
let client: MongoClient;

interface Credentials {
    data: {
        MONGO_USERNAME: string;
        MONGO_PASSWORD: string;
    };
}

async function connectToDatabase(): Promise<Db> {
    const dbName: string = "automation";
    
    if (!isConnected) {
        try {
            await vaultClient.login();

            const credentials: Credentials = await vaultClient.getSecret('kv/data/automation/mongo');
            const username: string = credentials.data.MONGO_USERNAME;
            const password: string = credentials.data.MONGO_PASSWORD;

            if (!username || !password) {
                throw new Error('Failed to retrieve MongoDB credentials from Vault.');
            }
            
            const host: string = envSwitcher.mongoDbHost;

            // Form the MongoDB connection URL
            const url: string = `mongodb://${username}:${password}@${host}/${dbName}?authSource=admin`;

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

export { connectToDatabase as connectToMongo };
