// constants.js
const envSwitcher = require('../shared/envSwitcher');

// Define a mapping of topics to task enabler keys
const topicToTaskEnablerKey = {
    'stefanNord': 'Stefan_Nord',
    'stefanOst': 'Stefan_Ost',
    'lukasSued': 'Lukas_Sued',
    'lukasWest': 'Lukas_West',
    'haupt' : 'Markise',
};

const mqttBrokerUrl = envSwitcher.mqttBrokerUrl;

module.exports = { mqttBrokerUrl, topicToTaskEnablerKey };
