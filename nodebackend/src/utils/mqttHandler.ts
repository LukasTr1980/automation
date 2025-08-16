import { EventEmitter } from 'events';
import { writeToInflux } from '../clients/influxdb-client.js';
import { mqttClientPromise } from '../clients/mqttClient.js';
import { broadcastToSseClients, addSseClient } from './sseHandler.js';
import logger from '../logger.js';
import { irrigationSwitchTopics } from './constants.js';

class StateChangeEmitter extends EventEmitter { }
const stateChangeEmitter = new StateChangeEmitter();

const mqttTopics: string[] = irrigationSwitchTopics;

const latestStates: Record<string, string> = {};

// Subscribe to all topics and set message handlers
async function main() {
    const mqttClient = await mqttClientPromise;
    mqttClient.on('connect', async () => {
        mqttTopics.forEach(mqttTopic => {
            mqttClient.subscribe(mqttTopic, (err) => {
                if (err) logger.error('Error subscribing to MQTT topic:', err);
                else logger.info('Subscribed to MQTT topic: ' + JSON.stringify(mqttTopic));
            });
        });
    });

    mqttClient.on('message', async (topic, message) => {
        const msg = message.toString();
        logger.info(`Message received from topic: ${topic}, Message: ${msg}`);

        // Update the latest switch state when a message is received
        latestStates[topic] = msg;

        // Broadcast the message to all active SSE clients
        broadcastToSseClients(topic, msg);

        // Only write to Influx for specific topics
        if (mqttTopics.includes(topic)) {
            await writeToInflux(topic, msg);
        }
    });
}

main();

// Your interval saving mechanism remains the same
const SAVE_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
setInterval(() => {
    for (const [topic, state] of Object.entries(latestStates)) {
        if (mqttTopics.includes(topic) && state !== null) {
            writeToInflux(topic, state);
        }
    }
}, SAVE_INTERVAL);

// Handlers for topics with specific check functions
const createTopicHandler = (topic: string, checkFunction: (message: string) => boolean) => {
    return {
        getStatus: () => {
            const message = latestStates[topic];
            return message ? checkFunction(message) : null;
        }
    };
};

// Individual exports for each entity
export { latestStates, addSseClient, stateChangeEmitter };
