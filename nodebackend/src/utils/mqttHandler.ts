import { EventEmitter } from 'events';
import { mqttClientPromise } from '../clients/mqttClient.js';
import { broadcastToSseClients, addSseClient } from './sseHandler.js';
import logger from '../logger.js';
import { irrigationSwitchTopics } from './constants.js';
import { recordIrrigationEvent } from './irrigationEventsRecorder.js';

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

        // Only log switch events for tracked irrigation topics
        if (mqttTopics.includes(topic)) {
            const segments = topic.split('/');
            const zone = segments.length ? segments[segments.length - 1] : topic;
            const lower = msg.trim().toLowerCase();
            const boolValue = lower === 'true' ? true : lower === 'false' ? false : null;
            if (boolValue !== null) {
              await recordIrrigationEvent(zone, boolValue, 'mqtt_echo', msg);
            } else {
              logger.warn(`Ignoring non-boolean irrigation switch payload for ${topic}: ${msg}`);
            }
        }
    });
}

main();

// Individual exports for each entity
export { latestStates, addSseClient, stateChangeEmitter };
