import type { IrrigationBlockerReason } from './irrigationBlockerReason.js';

export type NextIrrigationStatus = 'planned' | 'blocked' | 'out_of_season' | 'inactive' | 'unknown';

export type NextIrrigationReason =
  | 'none'
  | 'no_schedules'
  | 'no_active_schedules'
  | 'out_of_season'
  | IrrigationBlockerReason
  | 'decision_check_disabled'
  | 'decision_unavailable'
  | 'schedule_error';

export interface NextIrrigationSummary {
  status: NextIrrigationStatus;
  reasonKey: NextIrrigationReason;
  blockerCount: number;
  nextTimestamp: string | null;
  zone: string | null;
  decisionCheckSkipped: boolean;
}

export function createNextIrrigationSummary(
  status: NextIrrigationStatus,
  reasonKey: NextIrrigationReason,
  nextTimestamp: string | null,
  zone: string | null,
  blockerCount = 0,
  decisionCheckSkipped = false,
): NextIrrigationSummary {
  return {
    status,
    reasonKey,
    blockerCount,
    nextTimestamp,
    zone,
    decisionCheckSkipped,
  };
}

interface DecisionSummaryInput {
  inSeason: boolean;
  decisionCheckSkipped: boolean;
  decisionAvailable: boolean;
  blockerReason?: IrrigationBlockerReason | null;
  blockerCount?: number;
  nextTimestamp: string | null;
  zone: string | null;
}

export function createDecisionAwareIrrigationSummary({
  inSeason,
  decisionCheckSkipped,
  decisionAvailable,
  blockerReason = null,
  blockerCount = 0,
  nextTimestamp,
  zone,
}: DecisionSummaryInput): NextIrrigationSummary {
  if (!inSeason) {
    return createNextIrrigationSummary(
      'out_of_season',
      'out_of_season',
      nextTimestamp,
      zone,
      0,
      decisionCheckSkipped,
    );
  }

  if (decisionCheckSkipped) {
    return createNextIrrigationSummary(
      'planned',
      'decision_check_disabled',
      nextTimestamp,
      zone,
      blockerCount,
      true,
    );
  }

  if (!decisionAvailable) {
    return createNextIrrigationSummary(
      'unknown',
      'decision_unavailable',
      nextTimestamp,
      zone,
    );
  }

  if (blockerReason && blockerCount > 0) {
    return createNextIrrigationSummary(
      'blocked',
      blockerReason,
      nextTimestamp,
      zone,
      blockerCount,
    );
  }

  return createNextIrrigationSummary('planned', 'none', nextTimestamp, zone);
}
