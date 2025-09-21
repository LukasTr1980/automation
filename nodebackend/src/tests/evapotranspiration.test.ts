import assert from 'node:assert';
import logger from '../logger.js';
import { computeSunTimesLocal } from '../utils/evapotranspiration.js';

function hm(d: Date) {
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

function fmt(d: Date) {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function fmtLen(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function run() {
  const lat = 46.5668;
  const lon = 11.5599;
  const tz = 'Europe/Rome';

  // Summer solstice (approx) – long day
  const d1 = new Date(2024, 5, 21);
  const s1 = computeSunTimesLocal(d1, lat, lon, tz);
  const sr1 = hm(s1.sunrise);
  const ss1 = hm(s1.sunset);
  assert(sr1 > 4 && sr1 < 6.6, `Expected summer sunrise ~4–6.6h, got ${sr1}`);
  assert(ss1 > 20 && ss1 < 22.2, `Expected summer sunset ~20–22.2h, got ${ss1}`);
  assert(ss1 > sr1, 'Sunset must be after sunrise (summer)');
  const len1 = ss1 - sr1;
  assert(len1 > 14 && len1 < 17, `Expected summer day length 14–17h, got ${len1}`);
  logger.info(`[SunTimes] ${d1.toISOString().slice(0,10)} sunrise=${fmt(s1.sunrise)} sunset=${fmt(s1.sunset)} length=${fmtLen(len1)} (local)`);

  // Winter solstice (approx) – short day
  const d2 = new Date(2024, 11, 21);
  const s2 = computeSunTimesLocal(d2, lat, lon, tz);
  const sr2 = hm(s2.sunrise);
  const ss2 = hm(s2.sunset);
  assert(sr2 > 7 && sr2 < 9.8, `Expected winter sunrise ~7–9.8h, got ${sr2}`);
  assert(ss2 > 16 && ss2 < 18.2, `Expected winter sunset ~16–18.2h, got ${ss2}`);
  assert(ss2 > sr2, 'Sunset must be after sunrise (winter)');
  const len2 = ss2 - sr2;
  assert(len2 > 8 && len2 < 10.5, `Expected winter day length 8–10.5h, got ${len2}`);
  logger.info(`[SunTimes] ${d2.toISOString().slice(0,10)} sunrise=${fmt(s2.sunrise)} sunset=${fmt(s2.sunset)} length=${fmtLen(len2)} (local)`);

  logger.info('[SunTimes Tests] OK');
}

run();
