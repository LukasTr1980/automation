import * as envSwitcher from '../envSwitcher';

interface TopicToTaskEnablerKey {
    [key: string]: string;
}

const topicToTaskEnablerKey: TopicToTaskEnablerKey = {
    'stefanNord': 'Stefan_Nord',
    'stefanOst': 'Stefan_Ost',
    'lukasSued': 'Lukas_Sued',
    'lukasWest': 'Lukas_West',
    'haupt': 'Markise',
};

const mqttBrokerUrl: string = envSwitcher.mqttBrokerUrl;

export { mqttBrokerUrl, topicToTaskEnablerKey };
