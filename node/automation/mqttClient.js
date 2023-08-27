const mqtt = require('mqtt');
const { mqttBrokerUrl } = require('./constants');

const MQTT_RECONNECT_INTERVAL = 5000; // 5 seconds

const mqttOptions = {
    reconnectPeriod: MQTT_RECONNECT_INTERVAL,
    connectTimeout: 30 * 1000, // 30 seconds
    keepalive: 60, // keepalive time in seconds
    // you can add more options as needed, like authentication credentials
};

const mqttClient = mqtt.connect(mqttBrokerUrl, mqttOptions);

mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
});

mqttClient.on('reconnect', () => {
    console.log('Reconnecting to MQTT broker...');
});

mqttClient.on('error', (err) => {
    console.error('MQTT Error:', err);
});

mqttClient.on('offline', () => {
    console.log('MQTT client is offline');
});

mqttClient.on('close', () => {
    console.log('MQTT client disconnected');
});

module.exports = mqttClient;
