import assert from 'node:assert';
import logger from '../logger.js';
import {
  aggregateAllZoneState,
  buildLegacyTuyaZoneMappings,
  parseBooleanCommandPayload,
  parseTuyaZoneMappings,
  resolveTuyaMappingsForSetTopic,
} from '../utils/tuyaBridgeConfig.js';

function run(): void {
  assert.equal(parseBooleanCommandPayload('true'), true);
  assert.equal(parseBooleanCommandPayload('OFF'), false);
  assert.equal(parseBooleanCommandPayload('maybe'), null);

  const mappings = parseTuyaZoneMappings(JSON.stringify({
    stefanNord: { deviceId: 'device-1', code: 'switch_1' },
    'bewaesserung/switch/stefanOst/set': { deviceId: 'device-1', code: 'switch_2', onValue: 'ON', offValue: 'OFF' },
    'bewaesserung/switch/lukasSued': { deviceId: 'device-2', code: 'switch_1' },
  }));

  assert.equal(mappings.stefanNord?.deviceId, 'device-1');
  assert.equal(mappings.stefanOst?.onValue, 'ON');
  assert.equal(mappings.lukasSued?.statusTopic, 'bewaesserung/switch/lukasSued');

  const northOnly = resolveTuyaMappingsForSetTopic('bewaesserung/switch/stefanNord/set', mappings);
  assert.equal(northOnly.length, 1);
  assert.equal(northOnly[0]?.code, 'switch_1');

  const allZones = resolveTuyaMappingsForSetTopic('bewaesserung/switch/alle/set', mappings);
  assert.equal(allZones.length, 3);
  assert.deepEqual(
    allZones.map((entry) => entry.zoneKey).sort(),
    ['lukasSued', 'stefanNord', 'stefanOst'],
  );

  assert.equal(aggregateAllZoneState({
    stefanNord: 'true',
    stefanOst: 'true',
    lukasSued: 'true',
    lukasWest: 'true',
  }), 'true');

  assert.equal(aggregateAllZoneState({
    stefanNord: 'true',
    stefanOst: 'false',
    lukasSued: 'true',
    lukasWest: 'true',
  }), 'false');

  const legacyMappings = buildLegacyTuyaZoneMappings();
  assert.equal(legacyMappings.stefanNord?.deviceId, '51050522600194fed14c');
  assert.equal(legacyMappings.stefanNord?.code, 'switch_1');
  assert.equal(legacyMappings.stefanOst?.code, 'switch_2');
  assert.equal(legacyMappings.lukasWest?.code, 'switch_4');

  logger.info('[Tuya Bridge Tests] OK');
}

run();
