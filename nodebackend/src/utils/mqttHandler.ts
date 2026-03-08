import { EventEmitter } from 'events';
import { mqttClientPromise } from '../clients/mqttClient.js';
import { broadcastToSseClients, addSseClient } from './sseHandler.js';
import logger from '../logger.js';
import { irrigationSwitchSetTopics, irrigationSwitchTopics } from './constants.js';
import { recordIrrigationEvent } from './irrigationEventsRecorder.js';
import { handleTuyaMqttSetCommand, syncConfiguredTuyaStates } from './tuyaBridge.js';
import { isIrrigationSetTopic } from './tuyaBridgeConfig.js';
import type { IPublishPacket } from 'mqtt';

class StateChangeEmitter extends EventEmitter { }
const stateChangeEmitter = new StateChangeEmitter();

const mqttTopics: string[] = irrigationSwitchTopics;
const mqttSetTopics: string[] = irrigationSwitchSetTopics;

const latestStates: Record<string, string> = {};

// Subscribe to all topics and set message handlers
async function main() {
    const mqttClient = await mqttClientPromise;
    mqttClient.on('connect', async () => {
        [...mqttTopics, ...mqttSetTopics].forEach(mqttTopic => {
            mqttClient.subscribe(mqttTopic, (err) => {
                if (err) logger.error('Error subscribing to MQTT topic:', err);
                else logger.info('Subscribed to MQTT topic: ' + JSON.stringify(mqttTopic));
            });
        });

        void syncConfiguredTuyaStates(mqttClient, latestStates);
    });

    mqttClient.on('message', async (topic, message, packet: IPublishPacket) => {
        const msg = message.toString();
        logger.info(`Message received from topic: ${topic}, Message: ${msg}`);

        if (isIrrigationSetTopic(topic)) {
            if (packet.retain) {
                logger.info(`Ignoring retained MQTT set command for ${topic}`);
                return;
            }
            try {
                const handled = await handleTuyaMqttSetCommand(mqttClient, topic, msg, latestStates);
                if (handled) {
                    return;
                }
            } catch (error) {
                logger.error(`Failed to bridge MQTT command ${topic} to Tuya`, error);
                return;
            }
        }

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
