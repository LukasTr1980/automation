const mqtt = require('mqtt');
const envSwitcher = require('../../shared/envSwitcher');
const vaultClient = require('../../shared/vaultClient');  // Import the vaultClient

class MqttPublisher {
  constructor() {
    (async () => {  // Wrap the constructor logic in an async function
      try {
        await vaultClient.login();  // Login to Vault

        // Fetch MQTT credentials from Vault
        const credentials = await vaultClient.getSecret('kv/data/mosquitto');
        const username = credentials.data.MOSQUITTO_USERNAME;
        const password = credentials.data.MOSQUITTO_PASSWORD;

        if (!username || !password) {
          throw new Error('Failed to retrieve MQTT credentials from Vault.');
        }

        const brokerUrl = envSwitcher.mosquittoUrl;
        const options = {
          username: username,
          password: password
        };

        this.client = mqtt.connect(brokerUrl, options);

        this.client.on('connect', () => {
          console.log('Connected to MQTT Broker:', brokerUrl);
        });

        this.client.on('error', (err) => {
          console.error('MQTT Error:', err);
        });
      } catch (error) {
        console.error('Error initializing MqttPublisher:', error);
      }
    })();
  }

  publish(mqttTopic, message, options = {}, callback = () => {}) {
    this.client.publish(mqttTopic, message, options, callback);
  }

  close() {
    this.client.end();
  }
}

module.exports = MqttPublisher;
