const mqtt = require('mqtt');
const envSwitcher = require('../../shared/envSwitcher');
require('dotenv').config();

class MqttPublisher {
  constructor() {
    const brokerUrl = envSwitcher.mosquittoUrl;
    const options = {
      username: process.env.MOSQUITTO_USERNAME,
      password: process.env.MOSQUITTO_PASSWORD
    };
    
    this.client = mqtt.connect(brokerUrl, options);
    
    this.client.on('connect', () => {
      console.log('Connected to MQTT Broker:', brokerUrl);
    });
    
    this.client.on('error', (err) => {
      console.error('MQTT Error:', err);
    });
  }

  publish(mqttTopic, message, options = {}, callback = () => {}) {
    this.client.publish(mqttTopic, message, options, callback);
  }

  close() {
    this.client.end();
  }
}

module.exports = MqttPublisher;
