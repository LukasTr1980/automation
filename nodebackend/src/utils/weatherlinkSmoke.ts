import { WeatherlinkClient } from '@lukastr1980/davis';
import logger from "../logger.js";
import * as vaultClient from "../clients/vaultClient.js";

interface WeatherlinkCredentials {
    data: {
        API_KEY?: string;
        API_SECRET?: string;
    };
}

export async function weatherlinkSmoke() {
    try {
        await vaultClient.login();
    } catch (e) {
        logger.error('[WEATHERLINK] Vault login failed', e);
        return;
    }

    let apiKey: string | undefined;
    let apiSecret: string | undefined;
    try {
        const credentials = (await vaultClient.getSecret('kv/data/automation/weatherlink')) as WeatherlinkCredentials | null;
        apiKey = credentials?.data?.API_KEY;
        apiSecret = credentials?.data?.API_SECRET;
    } catch (e) {
        logger.error('[WEATHERLINK] Failed to fetch credentials from Vault', e);
        return;
    }

    if (!apiKey || !apiSecret) {
        logger.error('[WEATHERLINK] API_KEY/API_SECRET missing in Vault secret kv/data/automation/weatherlink');
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

    const s = stations[0];
    const uuid = s.station_id_uuid;
    logger.info(`[WEATHERLINK] using UUID from package: ${uuid} (${s.station_name}, id=${s.station_id})`);

    const current = await client.getCurrent(s.station_id_uuid);
    if (current) {
        const bar = current.sensors[0];
        const stationStatus = current.sensors[1];
        const measurements = current.sensors[2];
        const inside = current.sensors[3];
        console.log("Bar:", bar);
        console.log("Station Status:", stationStatus);
        console.log("measurements:", measurements);
        console.log("inside:", inside);
    }
}