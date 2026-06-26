export type IrrigationBlockerReason =
  | 'soil_wet'
  | 'current_rain'
  | 'rain_24h'
  | 'humidity_high'
  | 'temperature_low'
  | 'weather_station_error'
  | 'weather_blocker';

export function reasonFromIrrigationBlockers(blockers: string[]): IrrigationBlockerReason {
  if (blockers.some((blocker) => blocker.includes('Wetterstation'))) return 'weather_station_error';
  if (blockers.some((blocker) => blocker.includes('Boden nicht trocken genug'))) return 'soil_wet';
  if (blockers.some((blocker) => blocker.includes('Rain rate'))) return 'current_rain';
  if (blockers.some((blocker) => blocker.includes('Rain (24h)'))) return 'rain_24h';
  if (blockers.some((blocker) => blocker.includes('humidity'))) return 'humidity_high';
  if (blockers.some((blocker) => blocker.includes('temperature'))) return 'temperature_low';
  return 'weather_blocker';
}
