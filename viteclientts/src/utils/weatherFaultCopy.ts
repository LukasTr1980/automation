export function getWeatherFaultImpactCopy(
  skipDecision: boolean | null,
  decisionCheckUnknown: boolean,
) {
  if (decisionCheckUnknown || skipDecision === null) {
    return {
      effect: 'Die Auswirkung auf automatische Zeitpläne ist derzeit unbekannt.',
      headline: 'Wetterstation gestört: Auswirkung auf Automatik unbekannt.',
    };
  }
  if (skipDecision) {
    return {
      effect: 'Zeitpläne werden wegen der deaktivierten Entscheidungsprüfung trotzdem ausgeführt.',
      headline: 'Wetterstation gestört: Bewässerung läuft ohne Schutzprüfung weiter.',
    };
  }
  return {
    effect: 'Die automatische Bewässerung bleibt blockiert, bis aktuelle Wetterstationsdaten vorliegen.',
    headline: 'Wetterstation gestört: Automatische Bewässerung blockiert.',
  };
}
