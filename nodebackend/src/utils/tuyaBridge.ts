import { createHash, createHmac, randomUUID } from 'node:crypto';
import type { MqttClient } from 'mqtt';
import * as vaultClient from '../clients/vaultClient.js';
import logger from '../logger.js';
import {
  aggregateAllZoneState,
  buildLegacyTuyaZoneMappings,
  getIrrigationZoneDefinitions,
  normalizeTuyaStatusToMqttValue,
  parseBooleanCommandPayload,
  parseTuyaZoneMappings,
  resolveTuyaMappingsForSetTopic,
  type TuyaCommandValue,
  type TuyaZoneMapping,
} from './tuyaBridgeConfig.js';

interface TuyaSecret {
  data?: Record<string, unknown>;
}

interface TuyaRuntimeConfig {
  accessId: string;
  accessSecret: string;
  baseUrl: string;
  projectCode: string | null;
  zoneMappings: Record<string, TuyaZoneMapping>;
}

interface TuyaApiResponse<T> {
  success?: boolean;
  result?: T;
  code?: string | number;
  msg?: string;
}

interface TuyaTokenResult {
  access_token?: string;
  expire_time?: number;
}

interface TuyaStatusEntry {
  code?: string;
  value?: unknown;
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

const TUYA_SECRET_PATH = 'kv/data/automation/tuya';
const EMPTY_BODY_SHA256 = createHash('sha256').update('').digest('hex');
const TOKEN_EXPIRY_SAFETY_WINDOW_MS = 60_000;
const COMMAND_RETRY_DELAYS_MS = [0, 500, 1_500];
const STATUS_CONFIRM_INITIAL_DELAY_MS = 700;
const STATUS_CONFIRM_INTERVAL_MS = 900;
const STATUS_CONFIRM_MAX_ATTEMPTS = 6;

const TUYA_REGION_BASE_URLS: Record<string, string> = {
  cn: 'https://openapi.tuyacn.com',
  eu: 'https://openapi.tuyaeu.com',
  in: 'https://openapi.tuyain.com',
  us: 'https://openapi.tuyaus.com',
};

let runtimeConfigCache: TuyaRuntimeConfig | null | undefined;
let runtimeConfigPromise: Promise<TuyaRuntimeConfig | null> | null = null;
let cachedToken: CachedToken | null = null;
let tokenPromise: Promise<string> | null = null;
let missingConfigLogged = false;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function pickFirstString(...values: unknown[]): string | null {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) return normalized;
  }
  return null;
}

function resolveBaseUrl(regionOrUrl: string | null, explicitBaseUrl: string | null): string | null {
  if (explicitBaseUrl) return explicitBaseUrl.replace(/\/+$/, '');
  if (!regionOrUrl) return null;
  if (regionOrUrl.startsWith('http://') || regionOrUrl.startsWith('https://')) {
    return regionOrUrl.replace(/\/+$/, '');
  }

  const normalizedRegion = regionOrUrl.toLowerCase();
  return TUYA_REGION_BASE_URLS[normalizedRegion] ?? null;
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function buildTuyaRequestPath(pathname: string, query?: Record<string, string | number | boolean | null | undefined>): string {
  if (!query) return pathname;

  const searchParams = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== '')
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return searchParams.length ? `${pathname}?${searchParams.join('&')}` : pathname;
}

function signRequest(
  accessId: string,
  accessSecret: string,
  timestamp: string,
  nonce: string,
  method: string,
  pathWithQuery: string,
  body: string,
  accessToken?: string,
): string {
  const contentHash = body ? sha256Hex(body) : EMPTY_BODY_SHA256;
  const stringToSign = `${method.toUpperCase()}\n${contentHash}\n\n${pathWithQuery}`;
  const payload = `${accessId}${accessToken ?? ''}${timestamp}${nonce}${stringToSign}`;
  return createHmac('sha256', accessSecret).update(payload).digest('hex').toUpperCase();
}

async function loadVaultTuyaSecret(): Promise<Record<string, unknown> | null> {
  try {
    await vaultClient.login();
    const secret = await vaultClient.getSecret(TUYA_SECRET_PATH) as TuyaSecret | null;
    return secret?.data ?? null;
  } catch (error) {
    logger.warn('Tuya Bridge: could not read Tuya secret from Vault', error);
    return null;
  }
}

async function loadRuntimeConfig(): Promise<TuyaRuntimeConfig | null> {
  const envConfig = {
    accessId: process.env.TUYA_ACCESS_ID,
    accessSecret: process.env.TUYA_ACCESS_SECRET,
    region: process.env.TUYA_REGION,
    baseUrl: process.env.TUYA_BASE_URL,
    mappingsJson: process.env.TUYA_DEVICE_MAPPINGS_JSON,
  };

  let secretConfig: Record<string, unknown> | null = null;
  const needsVault = !envConfig.accessId || !envConfig.accessSecret || !envConfig.mappingsJson || (!envConfig.region && !envConfig.baseUrl);
  if (needsVault) {
    secretConfig = await loadVaultTuyaSecret();
  }

  const accessId = pickFirstString(envConfig.accessId, secretConfig?.ACCESS_ID, secretConfig?.CLIENT_ID);
  const accessSecret = pickFirstString(envConfig.accessSecret, secretConfig?.ACCESS_SECRET, secretConfig?.CLIENT_SECRET);
  const projectCode = pickFirstString(process.env.TUYA_PROJECT_CODE, secretConfig?.PROJECT_CODE, secretConfig?.APP_SCHEMA);
  const region = pickFirstString(envConfig.region, secretConfig?.REGION, secretConfig?.API_REGION) ?? 'eu';
  const explicitBaseUrl = pickFirstString(envConfig.baseUrl, secretConfig?.BASE_URL, secretConfig?.API_BASE_URL);
  const mappingsJson = pickFirstString(envConfig.mappingsJson, secretConfig?.DEVICE_MAPPINGS_JSON, secretConfig?.ZONE_MAPPINGS_JSON);

  if (!accessId || !accessSecret) {
    if (!missingConfigLogged) {
      logger.warn('Tuya Bridge disabled: missing TUYA_ACCESS_ID/TUYA_ACCESS_SECRET configuration');
      missingConfigLogged = true;
    }
    return null;
  }

  const baseUrl = resolveBaseUrl(region, explicitBaseUrl);
  if (!baseUrl) {
    if (!missingConfigLogged) {
      logger.warn('Tuya Bridge disabled: set TUYA_REGION to cn/eu/in/us or provide TUYA_BASE_URL');
      missingConfigLogged = true;
    }
    return null;
  }

  const zoneMappings = mappingsJson ? parseTuyaZoneMappings(mappingsJson) : buildLegacyTuyaZoneMappings();
  if (!Object.keys(zoneMappings).length) {
    if (!missingConfigLogged) {
      logger.warn('Tuya Bridge disabled: no per-zone Tuya mappings configured or derived from legacy datapoints');
      missingConfigLogged = true;
    }
    return null;
  }

  missingConfigLogged = false;
  return {
    accessId,
    accessSecret,
    baseUrl,
    projectCode,
    zoneMappings,
  };
}

async function getRuntimeConfig(): Promise<TuyaRuntimeConfig | null> {
  if (runtimeConfigCache !== undefined) return runtimeConfigCache;
  if (runtimeConfigPromise) return runtimeConfigPromise;

  runtimeConfigPromise = loadRuntimeConfig()
    .then((config) => {
      runtimeConfigCache = config;
      return config;
    })
    .finally(() => {
      runtimeConfigPromise = null;
    });

  return runtimeConfigPromise;
}

async function requestTuyaApi<T>(
  method: string,
  pathname: string,
  body?: Record<string, unknown>,
  query?: Record<string, string | number | boolean | null | undefined>,
  forceTokenRefresh = false,
): Promise<TuyaApiResponse<T>> {
  const config = await getRuntimeConfig();
  if (!config) {
    throw new Error('Tuya Bridge is not configured');
  }

  const pathWithQuery = buildTuyaRequestPath(pathname, query);
  const accessToken = pathWithQuery.startsWith('/v1.0/token')
    ? undefined
    : await getAccessToken(forceTokenRefresh);
  const bodyString = body ? JSON.stringify(body) : '';
  const timestamp = Date.now().toString();
  const nonce = randomUUID().replace(/-/g, '');
  const sign = signRequest(config.accessId, config.accessSecret, timestamp, nonce, method, pathWithQuery, bodyString, accessToken);

  const headers: Record<string, string> = {
    client_id: config.accessId,
    sign,
    sign_method: 'HMAC-SHA256',
    t: timestamp,
    nonce,
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers.access_token = accessToken;
  }

  const response = await fetch(`${config.baseUrl}${pathWithQuery}`, {
    method,
    headers,
    body: bodyString || undefined,
  });

  const responseText = await response.text();
  let parsedResponse: TuyaApiResponse<T>;
  try {
    parsedResponse = responseText ? JSON.parse(responseText) as TuyaApiResponse<T> : {};
  } catch {
    throw new Error(`Tuya API returned non-JSON response (${response.status})`);
  }

  if (!response.ok) {
    const apiCode = parsedResponse.code ?? response.status;
    const apiMessage = parsedResponse.msg ?? response.statusText;
    throw new Error(`Tuya API request failed (${apiCode}): ${apiMessage}`);
  }

  return parsedResponse;
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > now + TOKEN_EXPIRY_SAFETY_WINDOW_MS) {
    return cachedToken.value;
  }
  if (tokenPromise) return tokenPromise;

  tokenPromise = (async () => {
    const response = await requestTuyaApi<TuyaTokenResult>('GET', '/v1.0/token', undefined, { grant_type: 1 });
    if (!response.success || !response.result?.access_token) {
      throw new Error(`Failed to obtain Tuya access token: ${response.msg ?? 'unknown error'}`);
    }

    const expiresInSeconds = typeof response.result.expire_time === 'number' ? response.result.expire_time : 3600;
    cachedToken = {
      value: response.result.access_token,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    };
    return cachedToken.value;
  })().finally(() => {
    tokenPromise = null;
  });

  return tokenPromise;
}

async function sendDeviceCommand(mapping: TuyaZoneMapping, nextState: boolean): Promise<void> {
  const commandValue: TuyaCommandValue = nextState ? mapping.onValue : mapping.offValue;
  const payload = {
    commands: [{ code: mapping.code, value: commandValue }],
  };

  let shouldRefreshToken = false;
  let lastError: Error | null = null;
  for (const retryDelay of COMMAND_RETRY_DELAYS_MS) {
    if (retryDelay > 0) {
      await delay(retryDelay);
    }

    try {
      const response = await requestTuyaApi<boolean>(
        'POST',
        `/v1.0/devices/${encodeURIComponent(mapping.deviceId)}/commands`,
        payload,
        undefined,
        shouldRefreshToken,
      );
      if (!response.success) {
        throw new Error(`Tuya command rejected: ${response.msg ?? 'unknown error'}`);
      }
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      shouldRefreshToken = true;
      logger.warn(`Tuya command attempt failed for zone ${mapping.zoneKey}: ${lastError.message}`);
    }
  }

  throw lastError ?? new Error(`Tuya command failed for zone ${mapping.zoneKey}`);
}

async function fetchDeviceStatus(deviceId: string): Promise<TuyaStatusEntry[]> {
  const response = await requestTuyaApi<TuyaStatusEntry[]>(
    'GET',
    `/v1.0/devices/${encodeURIComponent(deviceId)}/status`,
  );

  if (!response.success || !Array.isArray(response.result)) {
    throw new Error(`Failed to fetch Tuya device status for ${deviceId}: ${response.msg ?? 'unknown error'}`);
  }

  return response.result;
}

async function readNormalizedStatesForMappings(mappings: TuyaZoneMapping[]): Promise<Record<string, string>> {
  const statesByZone: Record<string, string> = {};
  const mappingsByDevice = new Map<string, TuyaZoneMapping[]>();

  for (const mapping of mappings) {
    const existing = mappingsByDevice.get(mapping.deviceId);
    if (existing) {
      existing.push(mapping);
    } else {
      mappingsByDevice.set(mapping.deviceId, [mapping]);
    }
  }

  for (const [deviceId, deviceMappings] of mappingsByDevice.entries()) {
    const statuses = await fetchDeviceStatus(deviceId);
    for (const mapping of deviceMappings) {
      const statusEntry = statuses.find((entry) => entry.code === mapping.code);
      if (!statusEntry) {
        logger.warn(`Tuya status for zone ${mapping.zoneKey} is missing code ${mapping.code}`);
        continue;
      }

      const normalizedState = normalizeTuyaStatusToMqttValue(statusEntry.value, mapping);
      if (!normalizedState) {
        logger.warn(`Tuya status for zone ${mapping.zoneKey} could not be normalized: ${JSON.stringify(statusEntry.value)}`);
        continue;
      }

      statesByZone[mapping.zoneKey] = normalizedState;
    }
  }

  return statesByZone;
}

function collectMappingsForAffectedDevices(
  requestedMappings: TuyaZoneMapping[],
  allZoneMappings: Record<string, TuyaZoneMapping>,
): TuyaZoneMapping[] {
  const affectedDeviceIds = new Set(requestedMappings.map((mapping) => mapping.deviceId));
  return Object.values(allZoneMappings).filter((mapping) => affectedDeviceIds.has(mapping.deviceId));
}

async function publishMqttState(mqttClient: MqttClient, topic: string, state: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    mqttClient.publish(topic, state, {}, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function hasCompleteAggregateState(zoneStates: Record<string, string>): boolean {
  return getIrrigationZoneDefinitions()
    .filter((entry) => entry.zoneKey !== 'alle')
    .every((entry) => typeof zoneStates[entry.zoneKey] === 'string');
}

async function syncMappingsToMqtt(
  mqttClient: MqttClient,
  mappings: TuyaZoneMapping[],
  knownStates: Record<string, string> = {},
  resolvedStatesByZone?: Record<string, string>,
): Promise<void> {
  if (!mappings.length) return;

  const aggregateStatesByZone: Record<string, string> = {};
  for (const zone of getIrrigationZoneDefinitions()) {
    if (zone.zoneKey === 'alle') continue;
    const currentState = knownStates[zone.statusTopic];
    if (typeof currentState === 'string') {
      aggregateStatesByZone[zone.zoneKey] = currentState;
    }
  }

  const statesByZone = resolvedStatesByZone ?? await readNormalizedStatesForMappings(mappings);

  for (const mapping of mappings) {
    const normalizedState = statesByZone[mapping.zoneKey];
    if (!normalizedState) {
      continue;
    }

    aggregateStatesByZone[mapping.zoneKey] = normalizedState;
    await publishMqttState(mqttClient, mapping.statusTopic, normalizedState);
  }

  if (hasCompleteAggregateState(aggregateStatesByZone)) {
    const allZoneDefinition = getIrrigationZoneDefinitions().find((entry) => entry.zoneKey === 'alle');
    if (allZoneDefinition) {
      await publishMqttState(mqttClient, allZoneDefinition.statusTopic, aggregateAllZoneState(aggregateStatesByZone));
    }
  }
}

export async function handleTuyaMqttSetCommand(
  mqttClient: MqttClient,
  topic: string,
  payload: string,
  knownStates: Record<string, string> = {},
): Promise<boolean> {
  const config = await getRuntimeConfig();
  if (!config) return false;

  const nextState = parseBooleanCommandPayload(payload);
  if (nextState === null) {
    logger.warn(`Tuya Bridge ignored non-boolean MQTT command for ${topic}: ${payload}`);
    return true;
  }

  const requestedMappings = resolveTuyaMappingsForSetTopic(topic, config.zoneMappings);
  if (!requestedMappings.length) {
    logger.warn(`Tuya Bridge has no mapping for MQTT set topic ${topic}`);
    return false;
  }

  const affectedMappings = collectMappingsForAffectedDevices(requestedMappings, config.zoneMappings);

  for (const mapping of requestedMappings) {
    await sendDeviceCommand(mapping, nextState);
  }

  const expectedState = nextState ? 'true' : 'false';
  let resolvedStatesByZone: Record<string, string> = {};
  let confirmed = false;

  for (let attempt = 0; attempt < STATUS_CONFIRM_MAX_ATTEMPTS; attempt += 1) {
    await delay(attempt === 0 ? STATUS_CONFIRM_INITIAL_DELAY_MS : STATUS_CONFIRM_INTERVAL_MS);
    resolvedStatesByZone = await readNormalizedStatesForMappings(affectedMappings);
    confirmed = requestedMappings.every((mapping) => resolvedStatesByZone[mapping.zoneKey] === expectedState);
    if (confirmed) {
      break;
    }
  }

  if (!confirmed) {
    logger.warn(`Tuya Bridge did not confirm expected state "${expectedState}" for ${topic} within ${STATUS_CONFIRM_MAX_ATTEMPTS} attempts`);
  }

  await syncMappingsToMqtt(mqttClient, affectedMappings, knownStates, resolvedStatesByZone);
  return true;
}

export async function syncConfiguredTuyaStates(mqttClient: MqttClient, knownStates: Record<string, string> = {}): Promise<void> {
  const config = await getRuntimeConfig();
  if (!config) return;

  const mappings = Object.values(config.zoneMappings);
  if (!mappings.length) return;

  try {
    await syncMappingsToMqtt(mqttClient, mappings, knownStates);
  } catch (error) {
    logger.warn('Tuya Bridge failed to sync states to MQTT', error);
  }
}
