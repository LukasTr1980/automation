import { insertRow as insertQuestDbRow, registerQuestDbTableSchema } from "../clients/questdbClient.js";
import logger from "../logger.js";

const QUESTDB_TABLE_IRRIGATION_SWITCH_EVENTS = "irrigation_switch_events";

registerQuestDbTableSchema(QUESTDB_TABLE_IRRIGATION_SWITCH_EVENTS, () => `
    CREATE TABLE IF NOT EXISTS "${QUESTDB_TABLE_IRRIGATION_SWITCH_EVENTS}" (
        event_ts TIMESTAMP,
        topic SYMBOL,
        zone SYMBOL,
        state_raw STRING,
        state_boolean BOOLEAN,
        state_numeric DOUBLE,
        recorded_via SYMBOL
    ) timestamp(event_ts) PARTITION BY DAY
`);

export type IrrigationSwitchRecordMode = "realtime" | "hourlySnapshot";

export async function recordIrrigationSwitchEvent(
    topic: string,
    state: string,
    mode: IrrigationSwitchRecordMode
): Promise<void> {
    const normalizedState = state.trim();
    const lower = normalizedState.toLowerCase();
    const boolValue = lower === "true" ? true : lower === "false" ? false : null;

    const numericValue = Number(normalizedState);
    const numericOrNull = Number.isFinite(numericValue) ? numericValue : null;

    const segments = topic.split("/");
    const zone = segments.length ? segments[segments.length - 1] : topic;

    try {
        await insertQuestDbRow(QUESTDB_TABLE_IRRIGATION_SWITCH_EVENTS, {
            event_ts: new Date(),
            topic,
            zone,
            state_raw: state,
            state_boolean: boolValue,
            state_numeric: numericOrNull,
            recorded_via: mode,
        });
    } catch (error) {
        logger.error(`Failed to persist irrigation switch event for topic ${topic}`, error);
        throw error;
    }
}
