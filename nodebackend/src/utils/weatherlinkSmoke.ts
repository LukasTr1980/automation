// TS -> CJS Build: das kompiliert zu require('davis')
import { WeatherlinkClient, flattenCurrent, flattenHistoric } from "@lukastr1980/davis";
import logger from "../logger.js";

export async function weatherlinkSmoke() {
    const apiKey = process.env.WEATHERLINK_API_KEY!;
    const apiSecret = process.env.WEATHERLINK_API_SECRET!;
    if (!apiKey || !apiSecret) {
        logger.error('[WEATHERLINK] API_KEY/API_SECRET missing in env');
        return;
    }

    const client = new WeatherlinkClient({
        apiKey,
        apiSecret,
        axiosConfig: { timeout: 15_000 },
    });

    const stations = await client.getStations();
    if (!stations.length) {
        logger.warn('[WEATHERLINK] No station found');
        return;
    }

    const s = stations[0]; // oder per Namen/UUID filtern
    const uuid = s.station_id_uuid;
    logger.info(`[WEATHERLINK] using UUID from package: ${uuid} (${s.station_name}, id=${s.station_id})`);

    const cur = await client.getCurrent(uuid);
    if (cur) {
        logger.info('[WEATHERLINK][CURRENT] %j', flattenCurrent(cur));
    } else {
        logger.warn('[WEATHERLINK] /current not available');
    }

    try {
        const end = new Date();
        const start = new Date(end.getTime() - 10 * 60 * 1000);
        const hist = await client.getHistoric(uuid, start, end);
        if (!hist) {
            logger.warn('[WEATHERLINK] /historic not available (plan/permissions)');
        } else {
            const rows = flattenHistoric(hist);
            logger.info('[WEATHERLINK][HIST_ROWS] %d', rows.length);
            logger.info('[WEATHERLINK][HIST_LAST] %j', rows.at(-1) ?? '(empty)');
        }
    } catch (e: any) {
        logger.error('[WEATHERLINK][HIST ERROR]', e?.response?.status ? `HTTP ${e.response.status}` : e);
    }
}
