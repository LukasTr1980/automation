import { describe, expect, it } from 'vitest';
import { getWeatherFaultImpactCopy } from '../utils/weatherFaultCopy';

describe('getWeatherFaultImpactCopy', () => {
  it('describes a blocking fault when decision checks are active', () => {
    const copy = getWeatherFaultImpactCopy(false, false);

    expect(copy.headline).toBe('Wetterstation gestört: Automatische Bewässerung blockiert.');
  });

  it('describes continued execution when decision checks are skipped', () => {
    const copy = getWeatherFaultImpactCopy(true, false);

    expect(copy.headline).toBe('Wetterstation gestört: Bewässerung läuft ohne Schutzprüfung weiter.');
  });

  it('does not claim a known effect when the decision-check state is unavailable', () => {
    const copy = getWeatherFaultImpactCopy(null, true);

    expect(copy.headline).toBe('Wetterstation gestört: Auswirkung auf Automatik unbekannt.');
  });
});
