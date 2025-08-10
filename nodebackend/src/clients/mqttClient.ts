import mqtt, { IClientOptions, MqttClient } from 'mqtt';
import * as vaultClient from '../clients/vaultClient.js';
import * as envSwitcher from '../envSwitcher.js';
import logger from '../logger.js';

interface Credentials {
    data: { MOSQUITTO_USERNAME: string; MOSQUITTO_PASSWORD: string };
}

const MQTT_RECONNECT_INTERVAL = 5000;
const baseOptions: IClientOptions = {
    reconnectPeriod: MQTT_RECONNECT_INTERVAL,
    connectTimeout: 30_000,
    keepalive: 60,
    clean: true,
};

export const mqttClientPromise: Promise<MqttClient> = (async () => {
    await vaultClient.login();
    const cred = await vaultClient.getSecret('kv/data/automation/mosquitto') as Credentials;
    const brokerUrl = envSwitcher.mosquittoUrl;
    const options: IClientOptions = {
        ...baseOptions,
        username: cred.data.MOSQUITTO_USERNAME,
        password: cred.data.MOSQUITTO_PASSWORD,
    };
    const client = mqtt.connect(brokerUrl, options);
    client.on('connect', () => logger.info('Connected to MQTT Broker'));
    client.on('reconnect', () => logger.info('Reconnecting to MQTT broker…'));
    client.on('error', (err) => logger.error('MQTT error:', err));
    client.on('offline', () => logger.info('MQTT client offline'));
    client.on('close', () => logger.info('MQTT client disconnected'));
    return client;
})();
