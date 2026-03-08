import { irrigationSwitchDescriptions, irrigationSwitchSetTopics, irrigationSwitchTopics, irrigationTuyaDatapoints } from './constants.js';

export type TuyaCommandValue = boolean | number | string;

export interface TuyaZoneDefinition {
  zoneKey: string;
  label: string;
  statusTopic: string;
  setTopic: string;
}

export interface TuyaZoneMapping {
  zoneKey: string;
  label: string;
  statusTopic: string;
  setTopic: string;
  deviceId: string;
  code: string;
  onValue: TuyaCommandValue;
  offValue: TuyaCommandValue;
}

interface RawZoneMapping {
  deviceId?: unknown;
  code?: unknown;
  onValue?: unknown;
  offValue?: unknown;
}

const BOOLEAN_TRUE_VALUES = new Set(['1', 'on', 'true']);
const BOOLEAN_FALSE_VALUES = new Set(['0', 'false', 'off']);
const ALL_ZONE_KEY = 'alle';
const LEGACY_TUYA_DP_CODE_PREFIX = 'switch_';

function extractZoneKeyFromTopic(topic: string): string | null {
  const segments = topic.split('/');
  const zoneKey = segments[segments.length - 1];
  return zoneKey?.trim() ? zoneKey.trim() : null;
}

const zoneDefinitions: TuyaZoneDefinition[] = irrigationSwitchTopics.map((statusTopic, index) => {
  const zoneKey = extractZoneKeyFromTopic(statusTopic);
  const setTopic = irrigationSwitchSetTopics[index];
  const label = irrigationSwitchDescriptions[index];
  if (!zoneKey || !setTopic || !label) {
    throw new Error(`Invalid irrigation zone configuration at index ${index}`);
  }

  return {
    zoneKey,
    label,
    statusTopic,
    setTopic,
  };
});

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeCommandValue(value: unknown, fallback: TuyaCommandValue): TuyaCommandValue {
  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  return fallback;
}

function normalizeZoneEntry(raw: RawZoneMapping | undefined, zone: TuyaZoneDefinition): TuyaZoneMapping | null {
  if (!raw) return null;

  const deviceId = normalizeString(raw.deviceId);
  const code = normalizeString(raw.code);
  if (!deviceId || !code) {
    throw new Error(`Tuya mapping for zone "${zone.zoneKey}" requires non-empty "deviceId" and "code"`);
  }

  return {
    zoneKey: zone.zoneKey,
    label: zone.label,
    statusTopic: zone.statusTopic,
    setTopic: zone.setTopic,
    deviceId,
    code,
    onValue: normalizeCommandValue(raw.onValue, true),
    offValue: normalizeCommandValue(raw.offValue, false),
  };
}

export function getIrrigationZoneDefinitions(): TuyaZoneDefinition[] {
  return zoneDefinitions;
}

export function isIrrigationSetTopic(topic: string): boolean {
  return irrigationSwitchSetTopics.includes(topic);
}

export function parseBooleanCommandPayload(payload: string): boolean | null {
  const normalized = payload.trim().toLowerCase();
  if (BOOLEAN_TRUE_VALUES.has(normalized)) return true;
  if (BOOLEAN_FALSE_VALUES.has(normalized)) return false;
  return null;
}

export function parseTuyaZoneMappings(rawJson: string): Record<string, TuyaZoneMapping> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new Error(`Invalid TUYA_DEVICE_MAPPINGS_JSON: ${(error as Error).message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('TUYA_DEVICE_MAPPINGS_JSON must be a JSON object keyed by zone key or MQTT topic');
  }

  const rawMappings = parsed as Record<string, RawZoneMapping | undefined>;
  const zoneMappings: Record<string, TuyaZoneMapping> = {};

  for (const zone of zoneDefinitions) {
    if (zone.zoneKey === ALL_ZONE_KEY) continue;
    const rawEntry = rawMappings[zone.zoneKey] ?? rawMappings[zone.setTopic] ?? rawMappings[zone.statusTopic];
    const mapping = normalizeZoneEntry(rawEntry, zone);
    if (mapping) {
      zoneMappings[zone.zoneKey] = mapping;
    }
  }

  return zoneMappings;
}

export function buildLegacyTuyaZoneMappings(): Record<string, TuyaZoneMapping> {
  const zoneMappings: Record<string, TuyaZoneMapping> = {};

  zoneDefinitions.forEach((zone, index) => {
    if (zone.zoneKey === ALL_ZONE_KEY) return;

    const datapoint = irrigationTuyaDatapoints[index];
    if (!datapoint) return;

    const match = /^tuya\.0\.([^.]+)\.(\d+)$/.exec(datapoint.trim());
    if (!match) return;

    const [, deviceId, datapointId] = match;
    const numericDp = Number(datapointId);
    if (!Number.isInteger(numericDp) || numericDp <= 0 || numericDp > 8) {
      return;
    }

    zoneMappings[zone.zoneKey] = {
      zoneKey: zone.zoneKey,
      label: zone.label,
      statusTopic: zone.statusTopic,
      setTopic: zone.setTopic,
      deviceId,
      code: `${LEGACY_TUYA_DP_CODE_PREFIX}${numericDp}`,
      onValue: true,
      offValue: false,
    };
  });

  return zoneMappings;
}

export function resolveTuyaMappingsForSetTopic(
  setTopic: string,
  zoneMappings: Record<string, TuyaZoneMapping>,
): TuyaZoneMapping[] {
  const zone = zoneDefinitions.find((entry) => entry.setTopic === setTopic);
  if (!zone) return [];

  if (zone.zoneKey === ALL_ZONE_KEY) {
    return zoneDefinitions
      .filter((entry) => entry.zoneKey !== ALL_ZONE_KEY)
      .map((entry) => zoneMappings[entry.zoneKey])
      .filter((entry): entry is TuyaZoneMapping => Boolean(entry));
  }

  const mapping = zoneMappings[zone.zoneKey];
  return mapping ? [mapping] : [];
}

export function normalizeTuyaStatusToMqttValue(value: unknown, mapping: TuyaZoneMapping): string | null {
  if (value === mapping.onValue) return 'true';
  if (value === mapping.offValue) return 'false';

  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (value === 1) return 'true';
    if (value === 0) return 'false';
  }
  if (typeof value === 'string') {
    const parsed = parseBooleanCommandPayload(value);
    return parsed === null ? null : parsed ? 'true' : 'false';
  }

  return null;
}

export function aggregateAllZoneState(states: Record<string, string>): string {
  const relevantZones = zoneDefinitions.filter((entry) => entry.zoneKey !== ALL_ZONE_KEY);
  if (!relevantZones.length) return 'false';
  return relevantZones.every((entry) => states[entry.zoneKey] === 'true') ? 'true' : 'false';
}
