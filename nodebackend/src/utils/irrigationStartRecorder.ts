import { insertRow as insertQuestDbRow, registerQuestDbTableSchema } from "../clients/questdbClient.js";
import logger from "../logger.js";

export const QUESTDB_TABLE_IRRIGATION_START_EVENTS = "irrigation_start_events";

registerQuestDbTableSchema(QUESTDB_TABLE_IRRIGATION_START_EVENTS, () => `
    CREATE TABLE IF NOT EXISTS "${QUESTDB_TABLE_IRRIGATION_START_EVENTS}" (
        event_ts TIMESTAMP,
        zone SYMBOL,
        started BOOLEAN,
        source SYMBOL
    ) timestamp(event_ts) PARTITION BY DAY
`);

export type IrrigationStartSource = "skipDecisionCheck" | "decisionApproved" | "unknown";

export async function recordIrrigationStartQuestDb(zone: string, source: IrrigationStartSource = "unknown"): Promise<void> {
    try {
        await insertQuestDbRow(QUESTDB_TABLE_IRRIGATION_START_EVENTS, {
            event_ts: new Date(),
            zone,
            started: true,
            source,
        });
        logger.info(`QuestDB: Irrigation start recorded for zone ${zone} (source=${source}).`);
    } catch (error) {
        logger.error(`Failed to record irrigation start for zone ${zone} in QuestDB`, error);
    }
}
