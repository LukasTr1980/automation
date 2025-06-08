import mqtt, { MqttClient, IClientPublishOptions } from 'mqtt';
import * as envSwitcher from '../envSwitcher';
import * as vaultClient from '../clients/vaultClient';
import logger from '../logger';

interface Credentials {
  data: {
    MOSQUITTO_USERNAME: string;
    MOSQUITTO_PASSWORD: string;
  };
}

class MqttPublisher {
  private client: MqttClient | undefined;
  private lastPayload: Record<string, string> = {};
  private inflight: Record<string, boolean> = {};
  private queued: Record<string, string> = {};

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

        this.client.on('connect', () => {
          logger.info('Connected to MQTT Broker:', brokerUrl);
        });

        this.client.on('error', (err) => {
          logger.error('MQTT Error:', err);
        });
      } catch (error) {
        logger.error('Error initializing MqttPublisher:', error);
      }
    })();
  }

  // Check if client is initialized before publishing
  publish(
    topic: string,
    message: string,
    optionsOrCrb?: IClientPublishOptions | ((err?: Error | null) => void),
    cb: (err?: Error | null) => void = () => {}
  ): void {
    if (!this.client) throw new Error('MQTT Client not initialized');

    let opts: IClientPublishOptions = {};
    if (typeof optionsOrCrb === 'function') {
      cb = optionsOrCrb;
    } else if (optionsOrCrb) {
      opts = optionsOrCrb;
    }

    // 1) identische Wiederholung trotzdem schlucken
    if (this.lastPayload[topic] === message) {
      logger.debug(`Skip publish – unchanged (${topic}=${message})`);
      return;
    }

    // 2) ist gerade ein Publish unterwegs? ⇒ in Queue ablegen
    if (this.inflight[topic]) {
      this.queued[topic] = message; // Merke nur den NEUESTEN
      logger.debug(`Queue publish (${topic}=${message})`);
      return;
    }

    // 3) senden
    this.inflight[topic] = true;
    this.client.publish(topic, message, opts, err => {
      this.inflight[topic] = false;

      if (err) logger.error(`MQTT publish error (${topic}):`, err);
      else this.lastPayload[topic] = message;

      // 4) war währenddessen etwas gequeued?
      if (this.queued[topic] !== undefined) {
        const next = this.queued[topic];
        delete this.queued[topic];
        this.publish(topic, next, opts, cb); // sofort nachschieben
      } else {
        cb();
      }
    });
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
