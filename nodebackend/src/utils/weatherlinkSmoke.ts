import { WeatherlinkClient } from '@lukastr1980/davis';
import logger from "../logger.js";
import * as vaultClient from "../clients/vaultClient.js";
import { getDailyOutdoorTempAverage, getOutdoorTempAverageRange, getOutdoorHumidityAverageRange, getOutdoorWindSpeedAverageRange, getDailyOutdoorTempExtrema } from "../clients/weatherlink-client.js";

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

    // Configurable window like before; default 24h back
    const end = Date.now();
    const WINDOW_SECONDS = 600; // adjust as needed
    const start = end - WINDOW_SECONDS * 1000;
    const historic = await client.getHistoric(s.station_id_uuid, start, end);
    if (historic) {
        const measurements = historic.sensors[2];
        console.log('Measurements:', measurements);
    }

    // Last 24 hours average (ending now) using flexible range helper
    const avg24 = await getOutdoorTempAverageRange({ end, windowSeconds: WINDOW_SECONDS, chunkSeconds: 24 * 3600, combineMode: 'sampleWeighted', units: 'metric' });
    if (avg24.ok) {
        console.log(`[WEATHERLINK] Last ${WINDOW_SECONDS/3600}h outdoor temp avg: ${avg24.avg.toFixed(2)} °C (chunks=${avg24.chunks.length})`);
    } else {
        console.log('[WEATHERLINK] Failed to compute range outdoor temp average');
    }

    // Example: whole week via daily chunks and daily-mean combination
    const SEVEN_DAYS = 7 * 24 * 3600;
    const week = await getOutdoorTempAverageRange({ end, windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, combineMode: 'dailyMean', units: 'metric' });
    if (week.ok) {
        console.log(`[WEATHERLINK] 7-day avg (daily mean): ${week.avg.toFixed(2)} °C`);
    }

    // 7-day humidity average using daily chunks and daily-mean combination
    const hWeek = await getOutdoorHumidityAverageRange({ end, windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, combineMode: 'dailyMean' });
    if (hWeek.ok) {
        console.log(`[WEATHERLINK] 7-day humidity avg (daily mean): ${hWeek.avg.toFixed(1)} %`);
    } else {
        console.log('[WEATHERLINK] Failed to compute 7-day humidity average');
    }

    // 7-day wind speed average using daily chunks and daily-mean combination (metric m/s)
    const wWeek = await getOutdoorWindSpeedAverageRange({ end, windowSeconds: SEVEN_DAYS, chunkSeconds: 24 * 3600, combineMode: 'dailyMean', units: 'metric' });
    if (wWeek.ok) {
        console.log(`[WEATHERLINK] 7-day wind speed avg (daily mean): ${wWeek.avg.toFixed(2)} m/s`);
    } else {
        console.log('[WEATHERLINK] Failed to compute 7-day wind speed average');
    }

    // 24h temperature extrema (hi/lo) ending now
    const tExt = await getDailyOutdoorTempExtrema(new Date(end));
    if (tExt.ok) {
        console.log(`[WEATHERLINK] 24h temp extrema: hi=${tExt.tHi.toFixed(1)} °C, lo=${tExt.tLo.toFixed(1)} °C (samples=${tExt.count})`);
    } else {
        console.log('[WEATHERLINK] Failed to compute 24h temperature extrema');
    }
}
