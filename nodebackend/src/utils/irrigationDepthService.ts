import { ParameterizedQuery } from "@influxdata/influxdb-client";
import logger from "../logger";
import { getInfluxDbClientAutomation } from "../configs";
import { irrigationDaysQuery } from "../utils/fluxQueries";

const ORG = "villaanna";
// Pumpenspezifikationen
const PUMP_RATE_L_PER_MIN = 83; // Liter pro Minute
const RUN_TIME_MIN = 9;         // Minuten pro Lauf
const AREA_M2 = 120;            // zu bewässernde Fläche in m²

/**
 * Berechnet die Niederschlagshöhe in mm basierend auf der
 * Anzahl der Bewässerungstage in den letzten 7 Tagen.
 *
 * @param zoneName Name der Bewässerungszone (z.B. "lukasSued")
 * @returns Niederschlagshöhe in mm über 7 Tage
 */
export async function getWeeklyIrrigationDepthMm(
    zoneName: string
): Promise<number> {
    const influx = await getInfluxDbClientAutomation();
    const queryApi = influx.getQueryApi(ORG);

    // Parameterisierte Flux-Abfrage für Bewässerungstage
    const fluxQuery: ParameterizedQuery = irrigationDaysQuery(zoneName);
    logger.info(`Executing irrigationDaysQuery for ${zoneName}`);

    // Abfrage der Tage als DataRow
    const rows: { _value: number }[] = [];
    await new Promise<void>((resolve, reject) => {
        queryApi.queryRows(fluxQuery, {
            next(row, meta) {
                rows.push(meta.toObject(row) as { _value: number });
            },
            error(err) {
                logger.error("Error executing irrigationDaysQuery", err);
                reject(err);
            },
            complete() {
                resolve();
            },
        });
    });

    const days = rows[0]?._value ?? 0;
    // Gesamtwasser in Litern
    const totalLiters = days * PUMP_RATE_L_PER_MIN * RUN_TIME_MIN;
    // 1 L/m² = 1 mm
    const depthMm = totalLiters / AREA_M2;

    logger.info(
        `Irrigation depth for ${zoneName}: ${depthMm.toFixed(2)} mm over 7 days`
    );

    return depthMm;
}
