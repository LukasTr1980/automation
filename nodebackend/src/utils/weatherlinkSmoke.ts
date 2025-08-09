// TS -> CJS Build: das kompiliert zu require('davis')
import { WeatherlinkClient, flattenCurrent, flattenHistoric } from "@lukastr1980/davis";

export async function weatherlinkSmoke() {
    const apiKey = process.env.API_KEY!;
    const apiSecret = process.env.API_SECRET!;
    if (!apiKey || !apiSecret) {
        console.log('[WEATHERLINK] API_KEY/API_SECRET missing in env');
        return;
    }

    const client = new WeatherlinkClient({
        apiKey,
        apiSecret,
        axiosConfig: { timeout: 15_000 },
    });

    const stations = await client.getStations();
    if (!stations.length) {
        console.log('[WEATHERLINK] No station found');
        return;
    }

    const s = stations[0]; // oder per Namen/UUID filtern
    const uuid = s.station_id_uuid;
    console.log(`[WEATHERLINK] using UUID from package: ${uuid} (${s.station_name}, id=${s.station_id})`);

    const cur = await client.getCurrent(uuid);
    if (cur) {
        console.log('[WEATHERLINK][CURRENT]', flattenCurrent(cur));
    } else {
        console.log('[WEATHERLINK] /current not available');
    }

    try {
        const end = new Date();
        const start = new Date(end.getTime() - 10 * 60 * 1000);
        const hist = await client.getHistoric(uuid, start, end);
        if (!hist) {
            console.log('[WEATHERLINK] /historic not available (plan/permissions)');
        } else {
            const rows = flattenHistoric(hist);
            console.log(`[WEATHERLINK][HIST_ROWS] ${rows.length}`);
            console.log('[WEATHERLINK][HIST_LAST]', rows.at(-1) ?? '(empty)');
        }
    } catch (e: any) {
        console.log('[WEATHERLINK][HIST ERROR]', e?.response?.status ? `HTTP ${e.response.status}` : e);
    }
}
