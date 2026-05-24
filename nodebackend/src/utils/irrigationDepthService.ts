const DEFAULT_CALIBRATED_DEPTH_MM = 1.5;
const DEFAULT_CALIBRATED_DURATION_MIN = 15;

// Calibrated irrigation depth from cup tests, not pump specification.
// Measurements were taken during 15-minute zone runs:
// - Lukas West: 1.0, 1.4, 0.6 mm
// - Lukas Süd: 3.9, 0.5, 1.0 mm
// We use 1.5 mm per 15 minutes as a pragmatic global average that accounts
// for uneven sprinkler distribution and some lateral water movement in soil.
const DEFAULT_MM_PER_MIN = DEFAULT_CALIBRATED_DEPTH_MM / DEFAULT_CALIBRATED_DURATION_MIN;

function positiveNumberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const CALIBRATED_MM_PER_MIN = positiveNumberFromEnv('IRR_CALIBRATED_MM_PER_MIN', DEFAULT_MM_PER_MIN);
export const DEFAULT_RUN_DURATION_MIN = positiveNumberFromEnv('IRR_DEFAULT_RUN_DURATION_MIN', DEFAULT_CALIBRATED_DURATION_MIN);
export const DEFAULT_RUN_DEPTH_MM = +(CALIBRATED_MM_PER_MIN * DEFAULT_RUN_DURATION_MIN).toFixed(2);

export const CUP_TEST_SAMPLES = [
  { zone: 'Lukas West', durationMin: 15, valuesMm: [1.0, 1.4, 0.6] },
  { zone: 'Lukas Süd', durationMin: 15, valuesMm: [3.9, 0.5, 1.0] },
] as const;

export function depthForRunMinutes(durationMin: number): number {
  const safeDuration = Number.isFinite(durationMin) && durationMin > 0 ? durationMin : DEFAULT_RUN_DURATION_MIN;
  return +(safeDuration * CALIBRATED_MM_PER_MIN).toFixed(2);
}
