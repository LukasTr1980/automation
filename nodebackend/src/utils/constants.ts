// Mapping used for enabling/disabling tasks per zone
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

const skipDecisionCheckRedisKey = 'skipDecisionCheck';

// Centralized MQTT topics (Markise/haupt removed; numbers inactive)
const irrigationSwitchTopics: string[] = [
  'bewaesserung/switch/stefanNord',
  'bewaesserung/switch/stefanOst',
  'bewaesserung/switch/lukasSued',
  'bewaesserung/switch/lukasWest',
  'bewaesserung/switch/alle',
];

const irrigationSwitchSetTopics: string[] = [
  'bewaesserung/switch/stefanNord/set',
  'bewaesserung/switch/stefanOst/set',
  'bewaesserung/switch/lukasSued/set',
  'bewaesserung/switch/lukasWest/set',
  'bewaesserung/switch/alle/set',
];

const irrigationSwitchDescriptions: string[] = [
  'Stefan Nord',
  'Stefan Ost',
  'Lukas Süd',
  'Lukas West',
  'Alle',
];

// Tuya datapoints aligned by index with irrigationSwitchTopics
const irrigationTuyaDatapoints: string[] = [
  'tuya.0.51050522600194fed14c.1',
  'tuya.0.51050522600194fed14c.2',
  'tuya.0.51050522600194fed14c.3',
  'tuya.0.51050522600194fed14c.4',
  'tuya.0.51050522600194fed14c.13',
];

const topicToTuyaDatapoint: Record<string, string> = irrigationSwitchTopics.reduce((acc, topic, idx) => {
  acc[topic] = irrigationTuyaDatapoints[idx];
  return acc;
}, {} as Record<string, string>);

export {
  topicToTaskEnablerKey,
  skipDecisionCheckRedisKey,
  irrigationSwitchTopics,
  irrigationSwitchSetTopics,
  irrigationSwitchDescriptions,
  irrigationTuyaDatapoints,
  topicToTuyaDatapoint,
};
