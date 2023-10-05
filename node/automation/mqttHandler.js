// mqttHandler.js

const EventEmitter = require('events');
const { mqttTopics, mqttTopicsNumber } = require('./constants');
const { writeToInflux } = require('./influxDbClient');
const mqttClient = require('./mqttClient');
const { broadcastToSseClients, addSseClient } = require('./sseHandler');

class StateChangeEmitter extends EventEmitter {}
const stateChangeEmitter = new StateChangeEmitter();

const latestStates = {};

// Subscribe to all topics and set message handlers
mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');

    [...mqttTopics, ...mqttTopicsNumber].forEach(mqttTopic => {
        mqttClient.subscribe(mqttTopic, (err) => {
            if (err) console.error('Error subscribing to MQTT topic:', err);
            else console.log('Subscribed to MQTT topic:', mqttTopic);
        });
    });
});

mqttClient.on('message', async (topic, message) => {
    const msg = message.toString();
    console.log(`Message received from topic: ${topic}, Message: ${msg}`);

    // Update the latest switch state when a message is received
    latestStates[topic] = msg;

    // Broadcast the message to all active SSE clients
    broadcastToSseClients(topic, msg);

    // Only write to Influx for specific topics
    if (mqttTopics.includes(topic)) {
        await writeToInflux(topic, msg);
    }
    if (['wetter/number/weathercloud_regenrate', 'wetter/number/aussentemperatur', 'wetter/number/wind'].includes(topic)) {
        stateChangeEmitter.emit('stateChanged');
    }
});

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
const createTopicHandler = (topic, checkFunction) => {
    return {
        getStatus: () => {
            const message = latestStates[topic];
            return message ? checkFunction(message) : null;
        }
    };
};

const rainRateHandler = createTopicHandler('wetter/number/weathercloud_regenrate', (message) => Number(message) > 0);
const temperatureHandler = createTopicHandler('wetter/number/aussentemperatur', (message) => Number(message) < 15);
const windHandler = createTopicHandler('wetter/number/wind', (message) => Number(message) >= 20);

module.exports = {
    latestStates,
    addSseClient,
    isRaining: rainRateHandler.getStatus,
    isCold: temperatureHandler.getStatus,
    isWindy: windHandler.getStatus,
    stateChangeEmitter
};
