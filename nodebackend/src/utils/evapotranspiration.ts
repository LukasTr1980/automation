// src/utils/evapotranspiration.ts
// -----------------------------------------------------------------------------
//  WEEKLY ET₀ (FAO‑56)
//  – Inputs: 7‑day averages from Redis (Tavg, RH, Wind @ sensor height, Pressure, mean daily range)
//  – Cloud cover daily means from Influx (measurement "dwd.clouds").
//  – Computes daily ET₀ for last 7 full days (approximation using 7‑day means) and
//    uses cloud cover to estimate Rs via Angström–Prescott (n/N ≈ 1 − cloud/100).
//  – Sums to a weekly value and stores the sum in Redis.
// -----------------------------------------------------------------------------

// NOTE: Avoid heavy imports (Vault/Influx/Redis) at module load to keep
// manual testing cheap. These are dynamically imported inside functions.

// ───────────── Standort & Konstanten ─────────────────────────────────────────
const LAT = Number(process.env.LAT ?? 46.5668);
const ELEV = Number(process.env.ELEV ?? 1060);    // m NN
const ALBEDO = Number(process.env.ALBEDO ?? 0.23);    // Grass reference albedo
const WIND_Z = Number(process.env.WIND_SENSOR_HEIGHT_M ?? 10); // wind sensor height (m)
const AP_A_S = Number(process.env.ANGSTROM_A_S ?? 0.25); // Angström a_s
const AP_B_S = Number(process.env.ANGSTROM_B_S ?? 0.50); // Angström b_s

// Standard‑Buckets
const CLOUD_BUCKET = process.env.CLOUD_BUCKET ?? "automation"; // Wolken‑Recorder

// Measurements (clouds from Influx; temps, RH, wind, pressure from WeatherLink)
const MEAS_CLOUDS = "dwd.clouds";

// ───────────── FAO‑Hilfsfunktionen ──────────────────────────────────────────
const svp = (T: number) => 0.6108 * Math.exp((17.27 * T) / (T + 237.3));
const svpSlope = (T: number) => (4098 * svp(T)) / Math.pow(T + 237.3, 2);
const psychro = (P: number) => 0.665e-3 * P;          // P [kPa]
const rad = (deg: number) => (deg * Math.PI) / 180;
export function Ra(latDeg: number, doy: number) {
    const G = 0.0820, lat = rad(latDeg);
    const dr = 1 + 0.033 * Math.cos((2 * Math.PI * doy) / 365);
    const d = 0.409 * Math.sin((2 * Math.PI * doy) / 365 - 1.39);
    const ws = Math.acos(-Math.tan(lat) * Math.tan(d));
    return (24 * 60 / Math.PI) * G * dr *
        (ws * Math.sin(lat) * Math.sin(d) + Math.cos(lat) * Math.cos(d) * Math.sin(ws));
}

// ───────────── Influx Abfragen (Rohdaten) ───────────────────────────────────
// Für die Tagesmittel der Bewölkung werden Rohwerte (15‑min) der letzten 7
// vollen Tage abgefragt und anschließend tagsüber (Sonnenaufgang‑bis‑Sonnenuntergang)
// lokal gemittelt.

const LON = Number(process.env.LON ?? 11.5599);

const fluxCloudsRawLast7 = (bucket: string, m: string, field: string) => `import "date"
import "timezone"
option location = timezone.location(name: "Europe/Rome")
stop = date.truncate(t: now(), unit: 1d)
start = date.sub(d: 7d, from: stop)
from(bucket: "${bucket}")
  |> range(start: start, stop: stop)
  |> filter(fn: (r) => r._measurement == "${m}")
  |> filter(fn: (r) => r._field == "${field}")
  |> keep(columns: ["_time", "_value"]) 
  |> sort(columns: ["_time"])`;

type CloudSample = { time: number; value: number };

async function influxCloudRawSeriesLast7(bucket: string): Promise<CloudSample[]> {
    const { querySingleData } = await import("../clients/influxdb-client.js");
    const flux = fluxCloudsRawLast7(bucket, MEAS_CLOUDS, 'value_numeric');
    const rows: any[] = await querySingleData(flux as any);
    return rows
        .map(r => ({ time: Date.parse(r._time as string), value: Number(r._value) }))
        .filter(r => Number.isFinite(r.time) && Number.isFinite(r.value));
}

// ───────────── Sonnenauf-/untergang (NOAA‑Approx.) ─────────────────────────
// Berechnet lokale Zeiten (Europe/Rome über JS‑Date mit lokaler TZ) für einen
// gegebenen Tag. Rückgabe sind Datum/Zeiten im lokalen Kalendersinn.
function normalizeDeg(d: number) { const n = d % 360; return n < 0 ? n + 360 : n; }
function degToRad(d: number) { return (d * Math.PI) / 180; }

function dayOfYearLocal(d: Date): number {
    const start = new Date(d.getFullYear(), 0, 0);
    const ms = d.getTime() - start.getTime();
    return Math.floor(ms / 86400000);
}

function calcSunTimeHoursLocal(N: number, lat: number, lon: number, isSunrise: boolean, tzHours: number): number {
    const lngHour = lon / 15;
    const t = N + ((isSunrise ? 6 : 18) - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    let L = normalizeDeg(M + 1.916 * Math.sin(degToRad(M)) + 0.020 * Math.sin(2 * degToRad(M)) + 282.634);
    let RA = (Math.atan(0.91764 * Math.tan(degToRad(L))) * 180) / Math.PI;
    RA = normalizeDeg(RA);
    // Quadrant correction
    const Lquad = Math.floor(L / 90) * 90;
    const RAquad = Math.floor(RA / 90) * 90;
    RA = RA + (Lquad - RAquad);
    RA = RA / 15;
    const sinDec = 0.39782 * Math.sin(degToRad(L));
    const cosDec = Math.cos(Math.asin(sinDec));
    const zenith = 90.833; // "official" sunrise
    const cosH = (Math.cos(degToRad(zenith)) - sinDec * Math.sin(degToRad(lat))) / (cosDec * Math.cos(degToRad(lat)));
    // Guard: if sun never rises/sets (not expected at our latitude), fallback to 12h day
    if (cosH > 1 || cosH < -1) {
        return isSunrise ? 6 + tzHours : 18 + tzHours;
    }
    let H = Math.acos(cosH) * 180 / Math.PI;
    H = isSunrise ? 360 - H : H;
    H = H / 15;
    const T = H + RA - 0.06571 * t - 6.622;
    let UT = T - lngHour;
    while (UT < 0) UT += 24; while (UT >= 24) UT -= 24;
    const local = UT + tzHours;
    return (local + 24) % 24;
}

import { getTimezoneOffset as getTzOffset } from "date-fns-tz";

export function computeSunTimesLocal(day: Date, lat: number, lon: number, timeZone = "Europe/Rome") {
    const base = new Date(day.getFullYear(), day.getMonth(), day.getDate()); // local midnight
    const tzMs = getTzOffset(timeZone, base); // e.g., 7200000 for CEST
    const tzHours = tzMs / 3600000;
    const N = dayOfYearLocal(base);
    const srH = calcSunTimeHoursLocal(N, lat, lon, true, tzHours);
    const ssH = calcSunTimeHoursLocal(N, lat, lon, false, tzHours);
    const mkDate = (hours: number) => {
        const h = Math.floor(hours);
        const m = Math.floor((hours - h) * 60);
        const s = Math.floor((hours - h - m / 60) * 3600);
        return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, s, 0);
    };
    return { sunrise: mkDate(srH), sunset: mkDate(ssH) };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// Convert wind speed measured at height z to 2 m using FAO‑56 log law.
// u2 = uz * (4.87 / ln(67.8 z − 5.42))
export function windAt2m(uAtZ: number, zMeters = 10): number {
    const denom = Math.log(67.8 * zMeters - 5.42);
    if (!isFinite(denom) || denom <= 0) return uAtZ * 0.748; // fallback to 10 m → 2 m factor
    return uAtZ * (4.87 / denom);
}

// ───────────── Pure daily ET₀ (FAO‑56 Penman–Monteith) ─────────────────────
// Allows manual testing with arbitrary inputs without touching Redis/Influx.
export type DailyEt0Input = {
    doy: number;                     // day of year (1..366), local
    tminC: number;                   // °C
    tmaxC: number;                   // °C
    rhMeanPct: number;               // %
    windAtSensorMS: number;          // m/s measured at windSensorHeightM
    pressureHPa: number;             // hPa
    cloudPct: number;                // 0..100 (used for Angström–Prescott)
    latDeg?: number;                 // default env LAT
    elevMeters?: number;             // default env ELEV
    albedo?: number;                 // default env ALBEDO
    angstromAS?: number;             // default env AP_A_S
    angstromBS?: number;             // default env AP_B_S
    windSensorHeightM?: number;      // default env WIND_Z
};

export function computeDailyET0FAO56(input: DailyEt0Input): number {
    const latDeg = input.latDeg ?? LAT;
    const elev = input.elevMeters ?? ELEV;
    const albedo = input.albedo ?? ALBEDO;
    const aS = input.angstromAS ?? AP_A_S;
    const bS = input.angstromBS ?? AP_B_S;
    const windZ = input.windSensorHeightM ?? WIND_Z;

    const Tmin = input.tminC;
    const Tmax = input.tmaxC;
    const Tavg = (Tmin + Tmax) / 2;
    const RH = input.rhMeanPct;
    const uAtZ = input.windAtSensorMS;
    const P_kPa = (input.pressureHPa ?? 1013) / 10; // convert hPa → kPa
    const cloud = input.cloudPct;

    const RaMJ = Ra(latDeg, input.doy);
    const nOverN = Math.min(1, Math.max(0, 1 - cloud / 100));
    const Rs = (aS + bS * nOverN) * RaMJ;          // MJ m-2 d-1
    const Rso = (0.75 + 2e-5 * elev) * RaMJ;       // MJ m-2 d-1
    const Rs_Rso = Math.min(1, Math.max(0, Rs / Rso));
    const Rns = (1 - albedo) * Rs;
    const es = (svp(Tmax) + svp(Tmin)) / 2;        // kPa
    const ea = es * RH / 100;                      // kPa
    const Tk4 = (Math.pow(Tmax + 273.15, 4) + Math.pow(Tmin + 273.15, 4)) / 2;
    const emissivity = Math.max(0.05, 0.34 - 0.14 * Math.sqrt(Math.max(ea, 0)));
    const cloudCorr = Math.max(0.05, 1.35 * Rs_Rso - 0.35);
    const Rnl = 4.903e-9 * Tk4 * emissivity * cloudCorr; // MJ m-2 d-1
    const Rn = Rns - Rnl;                         // MJ m-2 d-1
    const Δ = svpSlope(Tavg);                     // kPa °C-1
    const γ = psychro(P_kPa);                     // kPa °C-1
    const u2 = windAt2m(uAtZ, windZ);             // m s-1 at 2 m
    const et0 = (0.408 * Δ * Rn + γ * 900 / (Tavg + 273.15) * u2 * (es - ea)) / (Δ + γ * (1 + 0.34 * u2));
    return Math.max(0, et0);
}

// ───────────── Hauptfunktion ────────────────────────────────────────────────
// No daily ET0 computation anymore — weekly only

export async function computeWeeklyET0(): Promise<number> {
    try {
        const [
            { default: logger },
            { readDailyLast7FromRedis },
            { readWeatherAggregatesFromRedis },
            { writeEt0DailyLast7ToRedis },
        ] = await Promise.all([
            import("../logger.js"),
            import("./weatherDailyStorage.js"),
            import("./weatherAggregatesStorage.js"),
            import("./et0DailyStorage.js"),
        ] as const);
        const endDate = new Date();
        // Align to local midnight (today 00:00) to cover the previous 7 full days
        const localMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        const SEVEN_DAYS = 7 * 24 * 3600;
        const cloudSamples = await influxCloudRawSeriesLast7(CLOUD_BUCKET);
        
        // Read daily aggregates (preferred) and 7-day means (fallbacks)
        const [daily, agg] = await Promise.all([
            readDailyLast7FromRedis(),
            readWeatherAggregatesFromRedis(),
        ] as const);
        if (!agg) throw new Error('Weekly ET0: Missing aggregates in Redis');

        const Tavg7 = agg.temp7dAvgC;
        const RH7 = agg.humidity7dAvgPct;
        const windAtSensor7 = agg.wind7dAvgMS;
        const P_hPa7 = agg.pressure7dAvgHPa ?? 1013;
        const dTavg = agg.temp7dRangeAvgC;

        const n = 7;
        const idx = Array.from({ length: n }, (_, i) => i);

        // Tagesmittel per Tag: nur Samples zwischen Sonnenaufgang und Sonnenuntergang (lokal)
        const startWindow = new Date(localMidnight);
        startWindow.setDate(startWindow.getDate() - 7);
        const dayStart: Date[] = [];
        for (let i = 0; i < n; i++) {
            const d = new Date(startWindow);
            d.setDate(startWindow.getDate() + i);
            dayStart.push(d);
        }
        const dayEnd = dayStart.map(d => { const e = new Date(d); e.setDate(e.getDate() + 1); return e; });
        const sunTimes = dayStart.map(d => computeSunTimesLocal(d, LAT, LON));
        // Mittelwerte pro Tag (tagsüber)
        const cloudsDailyRaw: Array<number | null> = [];
        for (let i = 0; i < n; i++) {
            const { sunrise, sunset } = sunTimes[i];
            const vals: number[] = [];
            for (const s of cloudSamples) {
                const t = new Date(s.time);
                if (t >= dayStart[i] && t < dayEnd[i] && t >= sunrise && t <= sunset) {
                    vals.push(s.value);
                }
            }
            if (vals.length > 0) {
                const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
                cloudsDailyRaw.push(mean);
            } else {
                cloudsDailyRaw.push(null);
            }
        }
        // Gaps schließen: Last‑valid, initial 60%
        const cloudsW: number[] = [];
        let lastValid = 60;
        for (let i = 0; i < n; i++) {
            const v = cloudsDailyRaw[i];
            if (Number.isFinite(v as number)) {
                lastValid = clamp(v as number, 0, 100);
                cloudsW.push(lastValid);
            } else {
                cloudsW.push(lastValid);
            }
        }
        logger.info(`[ET0] Cloud cover daily means (daylight-only) used: ${cloudsW.map(v => v.toFixed(0)).join(', ')} %`, { label: 'Evapotranspiration' });
        
        const et0s: number[] = [];
        for (const i of idx) {
            const cloud = clamp(cloudsW[i], 0, 100);

            // Compute local day start for doy; prefer aligned sequence
            const startTs = localMidnight.getTime() - (SEVEN_DAYS * 1000) + i * 24 * 3600 * 1000;
            const dLocal = new Date(startTs);
            const jan1 = new Date(dLocal.getFullYear(), 0, 1);
            const doy = Math.floor((+new Date(dLocal.getFullYear(), dLocal.getMonth(), dLocal.getDate()) - +jan1) / 86400000) + 1;

            // Prefer daily values; fallback to 7d aggregates if missing
            const day = daily?.days?.[i];
            const TavgDaily = (day?.tAvgC ?? (Number.isFinite(day?.tMinC) && Number.isFinite(day?.tMaxC) ? ((day!.tMinC! + day!.tMaxC!) / 2) : null));
            const Tavg = Number.isFinite(TavgDaily as number) ? (TavgDaily as number) : (Tavg7 as number);
            const dTRange = Number.isFinite(day?.tMinC) && Number.isFinite(day?.tMaxC)
              ? ((day!.tMaxC! - day!.tMinC!))
              : (dTavg as number);
            const Tmin = Number.isFinite(day?.tMinC as number) ? (day!.tMinC as number) : (Tavg - dTRange / 2);
            const Tmax = Number.isFinite(day?.tMaxC as number) ? (day!.tMaxC as number) : (Tavg + dTRange / 2);
            const RH = Number.isFinite(day?.rhMeanPct as number) ? (day!.rhMeanPct as number) : (RH7 as number);
            const windZ = Number.isFinite(day?.windMeanMS as number) ? (day!.windMeanMS as number) : (windAtSensor7 as number);
            const P_hPa = Number.isFinite(day?.pressureMeanHPa as number) ? (day!.pressureMeanHPa as number) : P_hPa7;

            const RaMJ = Ra(LAT, doy);
            const nOverN = clamp(1 - cloud / 100, 0, 1);
            const Rs = (AP_A_S + AP_B_S * nOverN) * RaMJ;
            const Rso = (0.75 + 2e-5 * ELEV) * RaMJ;
            let Rs_Rso = Rs / Rso;
            Rs_Rso = clamp(Rs_Rso, 0, 1.0);
            const Rns = (1 - ALBEDO) * Rs;
            const es = (svp(Tmax) + svp(Tmin)) / 2;
            const ea = es * RH / 100;
            const Tk4 = (Math.pow(Tmax + 273.15, 4) + Math.pow(Tmin + 273.15, 4)) / 2;
            const emissivity = Math.max(0.05, 0.34 - 0.14 * Math.sqrt(Math.max(ea, 0)));
            const cloudCorr = Math.max(0.05, 1.35 * Rs_Rso - 0.35);
            const Rnl = 4.903e-9 * Tk4 * emissivity * cloudCorr;
            const Rn = Rns - Rnl;
            const Δ = svpSlope(Tavg);
            const γ = psychro(P_hPa / 10);
            const u2 = windAt2m(windZ, WIND_Z);
            const et0 = (0.408 * Δ * Rn + γ * 900 / (Tavg + 273.15) * u2 * (es - ea)) / (Δ + γ * (1 + 0.34 * u2));
            et0s.push(Math.max(0, et0));

            logger.debug(
                `[ET0] d${i + 1} ` +
                `doy=${doy} cloud=${cloud.toFixed(0)}% n/N=${nOverN.toFixed(2)} ` +
                `Tavg=${Tavg.toFixed(2)}°C Tmin=${Tmin.toFixed(2)}°C Tmax=${Tmax.toFixed(2)}°C RH=${RH.toFixed(1)}% ` +
                `wind@${WIND_Z}m=${windZ.toFixed(2)} m/s u2=${u2.toFixed(2)} m/s ` +
                `Ra=${RaMJ.toFixed(2)} Rso=${Rso.toFixed(2)} Rs=${Rs.toFixed(2)} ` +
                `es=${es.toFixed(3)}kPa ea=${ea.toFixed(3)}kPa Δ=${Δ.toFixed(3)} γ=${γ.toFixed(4)} ` +
                `Rns=${Rns.toFixed(2)} Rnl=${Rnl.toFixed(2)} Rn=${Rn.toFixed(2)} ET0=${et0.toFixed(2)} mm`,
                { label: 'Evapotranspiration' }
            );
        }

        const et0Sum = +et0s.reduce((a, b) => a + b, 0).toFixed(2);

        // Persist ET0 daily last-7 (dates aligned with daily aggregates if available)
        try {
            const dates: string[] = [];
            if (daily?.days?.length === et0s.length) {
                for (let i = 0; i < daily.days.length; i++) {
                    dates.push(daily.days[i].date);
                }
            } else {
                // Fallback: synthesize local dates for the previous 7 full days
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(localMidnight);
                    d.setDate(d.getDate() - (6 - i) - 1); // map i:0..6 → d-7..d-1
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    dates.push(`${y}-${m}-${day}`);
                }
            }
            const payload = {
                days: et0s.map((v, i) => ({ date: dates[i] ?? `d${i+1}` , et0mm: +v.toFixed(2) })),
                timestamp: new Date().toISOString()
            };
        await writeEt0DailyLast7ToRedis(payload);
        } catch (e) {
            logger.error('Failed to persist ET0 daily last-7', e as Error, { label: 'Evapotranspiration' });
        }
        logger.info(
            `ET₀ daily last-7 refreshed. Sum=${et0Sum.toFixed(2)} mm | ` +
            `Inputs: ` + (daily?.days?.length ? `daily aggregates from Redis (preferred), ` : ``) +
            `Tavg7=${(Tavg7 as number).toFixed(2)}°C dT7=${(dTavg as number).toFixed(2)}°C RH7=${(RH7 as number).toFixed(1)}% ` +
            `wind@${WIND_Z}m=${(windAtSensor7 as number).toFixed(2)} m/s P=${(P_hPa7 / 10).toFixed(2)} kPa ` +
            `Angström a_s=${AP_A_S}, b_s=${AP_B_S}`,
            { label: 'Evapotranspiration' }
        );
        return et0Sum;
    } catch (err) {
        const { default: logger } = await import("../logger.js");
        logger.error('Error computing weekly ET₀', err as Error, { label: 'Evapotranspiration' });
        throw err;
    }
}
