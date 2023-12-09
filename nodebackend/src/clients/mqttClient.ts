import mqtt from 'mqtt';
import { mqttBrokerUrl } from '../utils/constants';
import logger from '../logger';

const MQTT_RECONNECT_INTERVAL = 5000; // 5 seconds

const mqttOptions: mqtt.IClientOptions = {
    reconnectPeriod: MQTT_RECONNECT_INTERVAL,
    connectTimeout: 30 * 1000, // 30 seconds
    keepalive: 60, // keepalive time in seconds
    // you can add more options as needed, like authentication credentials
};

const mqttClient = mqtt.connect(mqttBrokerUrl, mqttOptions);

mqttClient.on('connect', () => {
    logger.info('Connected to MQTT broker');
});

mqttClient.on('reconnect', () => {
    logger.info('Reconnecting to MQTT broker...');
});

mqttClient.on('error', (err: Error) => {
    logger.error('MQTT Error:', err);
});

mqttClient.on('offline', () => {
    logger.info('MQTT client is offline');
});

mqttClient.on('close', () => {
    logger.info('MQTT client disconnected');
});

export default mqttClient;
