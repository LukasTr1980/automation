// src/services/evapotranspiration.ts
// -----------------------------------------------------------------------------
//  DAILY ET₀ (FAO‑56)
//  – Sensorwerte (Tmin/Tmax/Tavg, RH, Wind, Rain, **Pressure**) aus InfluxDB
//  – Tages‑Ø‑Bewölkung aus *OpenWeather 5‑day / 3‑h forecast* (free tier, 1000 calls/d)
//  – Ergebnis → Write‑API ("et0"‑Measurement) + ausführliches Logging
// -----------------------------------------------------------------------------

import fetch from 'node-fetch';
import { querySingleData, writeToInflux } from '../clients/influxdb-client';
import { getOpenWeatherMapApiKey } from '../configs';
import logger from '../logger';

// ───────────── Standort & Konstanten (über ENV variabel) ────────────────────
const LAT = Number(process.env.LAT ?? 46.5668);
const LON = Number(process.env.LON ?? 11.5599);
const ELEV = Number(process.env.ELEV ?? 1060);        // m NN
const ALBEDO = Number(process.env.ALBEDO ?? 0.23);        // Gras‑Reflexion
const K_RS = Number(process.env.K_RS ?? 0.19);        // Hargreaves (Inland)
const BUCKET = process.env.BUCKET ?? 'iobroker';

const MEAS_TEMP = 'javascript.0.Wetterstation.Aussentemperatur';
const MEAS_RH = 'javascript.0.Wetterstation.FT0300_Feuchte_1';
const MEAS_WIND = 'javascript.0.Wetterstation.Wind';
const MEAS_RAIN = 'javascript.0.Wetterstation.Regen_Tag';
const MEAS_PRESSURE = 'javascript.0.Wetterstation.Druck_relativ';

// ───────────── FAO‑Hilfsfunktionen ──────────────────────────────────────────
const svp = (T: number) => 0.6108 * Math.exp((17.27 * T) / (T + 237.3));
const svpSlope = (T: number) => 4098 * svp(T) / Math.pow(T + 237.3, 2);
const psychro = (P: number) => 0.665e-3 * P;
const rad = (deg: number) => (deg * Math.PI) / 180;
function Ra(latDeg: number, doy: number) {
    const G = 0.0820, lat = rad(latDeg);
    const dr = 1 + 0.033 * Math.cos(2 * Math.PI * doy / 365);
    const d = 0.409 * Math.sin(2 * Math.PI * doy / 365 - 1.39);
    const ws = Math.acos(-Math.tan(lat) * Math.tan(d));
    return (24 * 60 / Math.PI) * G * dr *
        (ws * Math.sin(lat) * Math.sin(d) + Math.cos(lat) * Math.cos(d) * Math.sin(ws));
}

// ───────────── Flux‑Query für heutigen Tag ──────────────────────────────────
const fluxDaily = (m: string, fn: 'min' | 'max' | 'mean') => `import "timezone"
option location = timezone.location(name: "Europe/Rome")
from(bucket:"${BUCKET}")
  |> range(start: today())
  |> filter(fn:(r)=>r._measurement=="${m}")
  |> filter(fn:(r)=>r._field=="value")
  |> aggregateWindow(every:1d,fn:${fn})
  |> last()`;

const qTmin = fluxDaily(MEAS_TEMP, 'min');
const qTmax = fluxDaily(MEAS_TEMP, 'max');
const qTavg = fluxDaily(MEAS_TEMP, 'mean');
const qRH = fluxDaily(MEAS_RH, 'mean');
const qWind = fluxDaily(MEAS_WIND, 'mean');
const qRain = fluxDaily(MEAS_RAIN, 'mean');
const qP = fluxDaily(MEAS_PRESSURE, 'mean');

async function influxNumber(flux: string) {
    const rows: any[] = await querySingleData(flux);
    return rows.length ? parseFloat(rows[0]._value) : NaN;
}

// ───────────── OpenWeather – Tages‑Ø Bewölkung aus 3‑h‑Forecast ────────────
// 5‑Tage‑/ 3‑h‑Forecast ist in allen kostenlosen Keys enthalten
// Wir bilden den Mittelwert aller *heutigen* Einträge (lokale Zeitzone)
async function owmMeanCloudToday(): Promise<number> {
    const key = await getOpenWeatherMapApiKey();
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=metric&appid=${key}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OWM forecast HTTP ${res.status}`);
    const j = await res.json();

    const now = new Date();
    const todayStr = now.toISOString().substring(0, 10);        // YYYY‑MM‑DD

    const clouds: number[] = (j.list as any[])
        .filter(item => (item.dt_txt as string).startsWith(todayStr))
        .map(item => item.clouds?.all ?? 0);

    return clouds.length ? clouds.reduce((a, b) => a + b, 0) / clouds.length : 0;
}

// ───────────── Hauptfunktion ───────────────────────────────────────────────
export async function computeTodayET0() {
    const [Tmin, Tmax, Tavg, RH, wind10, rain24h, P, cloud] = await Promise.all([
        influxNumber(qTmin),
        influxNumber(qTmax),
        influxNumber(qTavg),
        influxNumber(qRH),
        influxNumber(qWind),
        influxNumber(qRain),
        influxNumber(qP),
        owmMeanCloudToday()
    ]);

    logger.debug(`Inputs – Tmin:${Tmin}°C Tmax:${Tmax}°C Tavg:${Tavg}°C RH:${RH}% Wind10:${wind10}m/s P:${P}hPa Rain24h:${rain24h}mm CloudØ:${cloud}%`);

    if ([Tmin, Tmax, Tavg, RH, wind10, P].some(v => !isFinite(v)))
        throw new Error('Unvollständige Sensordaten');

    const doy = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000);
    const RaMJ = Ra(LAT, doy);
    let Rs = K_RS * Math.sqrt(Math.max(0.1, Tmax - Tmin)) * RaMJ;
    Rs *= 1 - 0.75 * Math.pow(cloud / 100, 3);

    const Rns = (1 - ALBEDO) * Rs;
    const ea = svp(Tavg) * RH / 100;
    const Rnl = 4.903e-9 * ((Math.pow(Tmax + 273.16, 4) + Math.pow(Tmin + 273.16, 4)) / 2)
        * (0.34 - 0.14 * Math.sqrt(ea))
        * (1.35 * (Rs / (RaMJ * 0.75 + 2e-5 * ELEV)) - 0.35);
    const Rn = Rns - Rnl;

    const Δ = svpSlope(Tavg);
    const γ = psychro(P);
    const u2 = wind10 * 0.748;

    const et0 = (0.408 * Δ * Rn + γ * 900 / (Tavg + 273) * u2 * (svp(Tavg) - ea)) /
        (Δ + γ * (1 + 0.34 * u2));

    // Alte writeToInflux‑Signatur: (topic, message, measurement, bucket)
    await writeToInflux('', et0.toFixed(2), 'et0');
    logger.info(`ET₀: ${et0.toFixed(2)} mm | Rs:${Rs.toFixed(2)} MJ | ØCloud:${cloud}% | P:${P} hPa | Rain24h:${rain24h} mm`);
    return +et0.toFixed(2);
}

// 1× täglich via Scheduler (23:55)
