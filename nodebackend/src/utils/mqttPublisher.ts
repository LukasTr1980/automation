import mqtt, { MqttClient } from 'mqtt';
import * as envSwitcher from '../envSwitcher.js';
import * as vaultClient from '../clients/vaultClient.js';
import logger from '../logger.js';

interface Credentials {
  data: {
    MOSQUITTO_USERNAME: string;
    MOSQUITTO_PASSWORD: string;
  };
}

class MqttPublisher {
  private client: MqttClient | undefined;

  constructor() {
    (async () => {
      try {
        await vaultClient.login();

        const credentials = await vaultClient.getSecret('kv/data/automation/mosquitto') as Credentials;
        const username = credentials.data.MOSQUITTO_USERNAME;
        const password = credentials.data.MOSQUITTO_PASSWORD;

        if (!username || !password) {
          throw new Error('Failed to retrieve MQTT credentials from Vault.');
        }

        const brokerUrl = envSwitcher.mosquittoUrl;
        const options = {
          username,
          password
        };

        this.client = mqtt.connect(brokerUrl, options);

        this.client.on('connect', () => {});

        this.client.on('error', (err) => {
          logger.error('MQTT Error:', err);
        });
      } catch (error) {
        logger.error('Error initializing MqttPublisher:', error);
      }
    })();
  }

  // Check if client is initialized before publishing
  publish(mqttTopic: string, message: string, options = {}, callback: () => void = () => {}): void {
    if (!this.client) {
      logger.error('MQTT Client is not initialized');
      throw new Error('MQTT Client is not initialized');
    }
    this.client.publish(mqttTopic, message, options, callback);
  }

  // Check if client is initialized before closing
  close(): void {
    if (!this.client) {
      logger.error('MQTT Client is not initialized');
      throw new Error('MQTT Client is not initialized');
    }
    this.client.end();
  }
}

export default MqttPublisher;
