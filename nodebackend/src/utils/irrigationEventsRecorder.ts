import { insertRow as insertQuestDbRow, registerQuestDbTableSchema } from "../clients/questdbClient.js";
import logger from "../logger.js";

export const QUESTDB_TABLE_IRRIGATION_EVENTS = "irrigation_events";

// Single unified table for irrigation events (manual + scheduler driven)
// Columns:
// - event_ts: timestamp of the event
// - zone: zone key (e.g., stefanNord, alle)
// - state_raw: raw payload if available (e.g., MQTT message)
// - state_boolean: normalized boolean state (on/off)
// - recorded_via: 'manual' | 'auto'
registerQuestDbTableSchema(QUESTDB_TABLE_IRRIGATION_EVENTS, () => `
    CREATE TABLE IF NOT EXISTS "${QUESTDB_TABLE_IRRIGATION_EVENTS}" (
        event_ts TIMESTAMP,
        zone SYMBOL,
        state_raw STRING,
        state_boolean BOOLEAN,
        recorded_via SYMBOL
    ) timestamp(event_ts) PARTITION BY DAY
`);

export type IrrigationRecordedVia = "manual" | "auto";

export async function recordIrrigationEvent(
  zone: string,
  stateBoolean: boolean,
  recordedVia: IrrigationRecordedVia,
  stateRaw?: string,
): Promise<void> {
  try {
    await insertQuestDbRow(QUESTDB_TABLE_IRRIGATION_EVENTS, {
      event_ts: new Date(),
      zone,
      state_raw: typeof stateRaw === 'string' ? stateRaw : null,
      state_boolean: stateBoolean,
      recorded_via: recordedVia,
    });
  } catch (error) {
    logger.error(`Failed to persist irrigation event for zone ${zone}`, error);
    throw error;
  }
}

