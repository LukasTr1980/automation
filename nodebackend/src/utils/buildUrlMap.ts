import { connectToMongo } from '../clients/mongoClient.js';
import { ObjectId } from 'mongodb';  
import * as envSwitcher from '../envSwitcher.js';
import logger from '../logger.js';

const baseUrl: string = envSwitcher.baseUrl;

interface UrlMap {
    [key: string]: string;
}

interface Document {
    mqttTopics: string[];
    vAtuyaUrl: string[];
}

async function buildUrlMap(): Promise<UrlMap> {
    try {
        const db = await connectToMongo();

        const collection = db.collection('nodeServerConfig');
        const docId: string = "652e8f1a49124f743556be68";

        // Use type assertion here
        const doc = await collection.findOne({ _id: new ObjectId(docId) }) as Document | null;

        if (!doc) {
            throw new Error(`Document with id ${docId} not found.`);
        }

        const urlMap: UrlMap = {};

        for (let i = 0; i < doc.mqttTopics.length; i++) {
            const topic: string = doc.mqttTopics[i];
            const url: string = doc.vAtuyaUrl[i];
            urlMap[topic] = `${baseUrl}/set/${url}`;
        }
        return urlMap;
    } catch (error) {
        logger.error('Could not build urlMap object:', error);
        throw error;
    }
}

export { buildUrlMap };
