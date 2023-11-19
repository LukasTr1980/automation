const { connectToMongo } = require('./mongoClient');
const { ObjectId } = require('mongodb');  
const envSwitcher = require('../shared/build/envSwitcher');
const logger = require('../shared/build/logger').default;

const baseUrl = envSwitcher.baseUrl;

async function buildUrlMap() {
    try {
        const db = await connectToMongo();

        const collection = db.collection('nodeServerConfig');
        const docId = "652e8f1a49124f743556be68";

        const doc = await collection.findOne({ _id: new ObjectId(docId) });

        if (!doc) {
            throw new Error(`Document with id ${docId} not found.`);
        }

        const urlMap = {};

        for (let i = 0; i < doc.mqttTopics.length; i++) {
            const topic = doc.mqttTopics[i];
            const url = doc.vAtuyaUrl[i];
            urlMap[topic]  = `${baseUrl}/set/${url}`;
        }
        return urlMap;
    } catch (error) {
        logger.error('Could not build urlMap object:', error);
        throw error;
    }
}

module.exports = { buildUrlMap };