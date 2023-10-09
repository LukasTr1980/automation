// constants.js
const envSwitcher = require('./envSwitcher');

const baseUrl = envSwitcher.baseUrl;
const urlMap = {
    'bewaesserung/switch/stefanNord': `${baseUrl}/set/tuya.0.51050522600194fed14c.1`,
    'bewaesserung/switch/stefanOst': `${baseUrl}/set/tuya.0.51050522600194fed14c.2`,
    'bewaesserung/switch/lukasSued': `${baseUrl}/set/tuya.0.51050522600194fed14c.3`,
    'bewaesserung/switch/lukasWest': `${baseUrl}/set/tuya.0.51050522600194fed14c.4`,
    'bewaesserung/switch/alle': `${baseUrl}/set/tuya.0.51050522600194fed14c.13`,
    'markise/switch/haupt' : `${baseUrl}/set/tuya.0.8407060570039f7fa6d2.1`,
    // add other mappings
}

// Topics for MQTT
const mqttTopics = [
    'bewaesserung/switch/stefanNord',
    'bewaesserung/switch/stefanOst',
    'bewaesserung/switch/lukasSued',
    'bewaesserung/switch/lukasWest',
    'bewaesserung/switch/alle',
    'markise/switch/haupt',
];

const mqttTopicsNumber = [
    'bewaesserung/number/regenTag',
    'bewaesserung/number/regenGestern',
    'wetter/number/weathercloud_regenrate',
    'wetter/number/aussentemperatur',
    'wetter/number/wind'
];

// Define a mapping of topics to task enabler keys
const topicToTaskEnablerKey = {
    'stefanNord': 'Stefan_Nord',
    'stefanOst': 'Stefan_Ost',
    'lukasSued': 'Lukas_Sued',
    'lukasWest': 'Lukas_West',
    'haupt' : 'Markise',
};

const mqttBrokerUrl = envSwitcher.mqttBrokerUrl;

module.exports = { mqttTopics, mqttTopicsNumber, mqttBrokerUrl, urlMap, topicToTaskEnablerKey };
