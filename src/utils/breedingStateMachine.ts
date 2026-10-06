import { BreedingRecord, BreedingLifecycleStatus, BreedingObservationLog, BreedingStatusTransitionHistory } from '../types';

export interface BreedingStageConfig {
  status: BreedingLifecycleStatus;
  stepNumber: number;
  label: string;
  badgeLabel: string;
  description: string;
  guideText: string;
  badgeClass: string;
  pillBg: string;
  borderColor: string;
  icon: string;
  allowedNextTransitions: BreedingLifecycleStatus[];
  canMarkFailed: boolean;
}

export const BREEDING_STAGES: Record<BreedingLifecycleStatus, BreedingStageConfig> = {
  PAIRED: {
    status: 'PAIRED',
    stepNumber: 1,
    label: '1. Paired (Waiting)',
    badgeLabel: 'PAIRED',
    description: 'Initial state after animals are paired in the Animal Module. No progress yet; pair is acclimatizing.',
    guideText: 'Click "Start Breeding" once animals are introduced into the breeding enclosure and ready for active monitoring.',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    pillBg: 'bg-blue-950/40',
    borderColor: 'border-blue-500',
    icon: 'Link',
    allowedNextTransitions: ['IN PROGRESS', 'FAILED'],
    canMarkFailed: true,
  },
  'IN PROGRESS': {
    status: 'IN PROGRESS',
    stepNumber: 2,
    label: '2. In Progress (Monitoring)',
    badgeLabel: 'IN PROGRESS',
    description: 'Active monitoring phase. Day counter auto-increments. Keepers log behavioral observations and interaction.',
    guideText: 'Active monitoring phase. Keepers log daily observations, courtship, and environmental checks.',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    pillBg: 'bg-amber-950/40',
    borderColor: 'border-amber-500',
    icon: 'Activity',
    allowedNextTransitions: ['POSSIBLE MATED', 'FAILED'],
    canMarkFailed: true,
  },
  'POSSIBLE MATED': {
    status: 'POSSIBLE MATED',
    stepNumber: 3,
    label: '3. Possible Mated',
    badgeLabel: 'POSSIBLE MATED',
    description: 'System-based assumption based on time elapsed (5–7+ days) or observed courtship behavior without physical confirmation.',
    guideText: 'Check for physical/behavioral female changes: weight gain, nesting, restlessness, or abdominal fullness.',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    pillBg: 'bg-purple-950/40',
    borderColor: 'border-purple-500',
    icon: 'HelpCircle',
    allowedNextTransitions: ['LIKELY MATED', 'IN PROGRESS', 'FAILED'],
    canMarkFailed: true,
  },
  'LIKELY MATED': {
    status: 'LIKELY MATED',
    stepNumber: 4,
    label: '4. Likely Mated (Gravid)',
    badgeLabel: 'LIKELY MATED',
    description: 'High confidence based on confirmed female physical indicators: weight increase and nesting/digging behavior.',
    guideText: 'Prepare vermiculite nesting box and monitor for oviposition/egg laying.',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    pillBg: 'bg-indigo-950/40',
    borderColor: 'border-indigo-500',
    icon: 'CheckCircle2',
    allowedNextTransitions: ['CLUTCH RECORDED', 'POSSIBLE MATED', 'FAILED'],
    canMarkFailed: true,
  },
  'CLUTCH RECORDED': {
    status: 'CLUTCH RECORDED',
    stepNumber: 5,
    label: '5. Clutch Recorded',
    badgeLabel: 'CLUTCH RECORDED',
    description: 'Keeper logged egg deposition: clutch size, date laid, and initial egg health.',
    guideText: 'Transfer clutch to incubator and begin daily incubation environmental tracking.',
    badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    pillBg: 'bg-yellow-950/40',
    borderColor: 'border-yellow-500',
    icon: 'Egg',
    allowedNextTransitions: ['INCUBATING', 'FAILED'],
    canMarkFailed: true,
  },
  INCUBATING: {
    status: 'INCUBATING',
    stepNumber: 6,
    label: '6. Incubating',
    badgeLabel: 'INCUBATING',
    description: 'Active egg incubation tracking: temperature, humidity, candling fertility checks, and estimated hatch window.',
    guideText: 'Maintain thermal stability and monitor for pipping as estimated hatch date approaches.',
    badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    pillBg: 'bg-teal-950/40',
    borderColor: 'border-teal-500',
    icon: 'Thermometer',
    allowedNextTransitions: ['COMPLETED', 'FAILED'],
    canMarkFailed: true,
  },
  COMPLETED: {
    status: 'COMPLETED',
    stepNumber: 7,
    label: '7. Completed',
    badgeLabel: 'COMPLETED',
    description: 'Hatch outcome logged. System calculated official hatch rate. Breeding cycle successfully finalized.',
    guideText: 'Breeding cycle concluded. Offspring records can now be registered into animal inventory.',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    pillBg: 'bg-emerald-950/40',
    borderColor: 'border-emerald-500',
    icon: 'Award',
    allowedNextTransitions: [],
    canMarkFailed: false,
  },
  SUCCESSFUL: {
    status: 'SUCCESSFUL',
    stepNumber: 7,
    label: '7. Completed (Successful)',
    badgeLabel: 'COMPLETED',
    description: 'Hatch outcome logged. System calculated official hatch rate.',
    guideText: 'Breeding cycle concluded.',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    pillBg: 'bg-emerald-950/40',
    borderColor: 'border-emerald-500',
    icon: 'Award',
    allowedNextTransitions: [],
    canMarkFailed: false,
  },
  FAILED: {
    status: 'FAILED',
    stepNumber: -1,
    label: 'Failed / Concluded',
    badgeLabel: 'FAILED',
    description: 'Breeding cycle concluded without successful reproduction (incompatibility, infertile clutch, or seasonal conclusion).',
    guideText: 'Record reason for failure and return animals to individual resting enclosures.',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    pillBg: 'bg-rose-950/40',
    borderColor: 'border-rose-500',
    icon: 'XCircle',
    allowedNextTransitions: ['PAIRED', 'IN PROGRESS'],
    canMarkFailed: false,
  },
};

export const LIFECYCLE_ORDER: BreedingLifecycleStatus[] = [
  'PAIRED',
  'IN PROGRESS',
  'POSSIBLE MATED',
  'LIKELY MATED',
  'CLUTCH RECORDED',
  'INCUBATING',
  'COMPLETED'
];

/**
 * Checks whether a breeding record is currently active (not finalized or failed).
 */
export function isBreedingRecordActive(recordOrStatus: BreedingRecord | string): boolean {
  const status = typeof recordOrStatus === 'string' ? recordOrStatus : recordOrStatus.status;
  return status !== 'COMPLETED' && status !== 'SUCCESSFUL' && status !== 'FAILED';
}

/**
 * Normalize status strings for consistent comparison
 */
export function normalizeBreedingStatus(statusOrRecord?: string | BreedingRecord, maybeRecord?: BreedingRecord): BreedingLifecycleStatus {
  let status: string | undefined;
  let record: BreedingRecord | undefined;

  if (statusOrRecord && typeof statusOrRecord === 'object') {
    record = statusOrRecord as BreedingRecord;
    status = record.status;
  } else {
    status = statusOrRecord as string | undefined;
    record = maybeRecord;
  }

  if (!status) return 'PAIRED';
  if (status === 'SUCCESSFUL') return 'COMPLETED';
  if ((status === 'INCUBATING' || status === 'CLUTCH RECORDED') && record && !record.clutchDate) {
    return 'IN PROGRESS';
  }
  if (status in BREEDING_STAGES) return status as BreedingLifecycleStatus;
  return 'IN PROGRESS';
}

/**
 * Calculate accurate day counters for breeding records
 */
export function calculateBreedingDayCounts(record: BreedingRecord, customSystemDate?: string): {
  daysTotal: number;
  daysInCurrentStage: number;
  displayDayText: string;
  stageStartDate: string;
} {
  const now = customSystemDate ? new Date(customSystemDate) : new Date();
  const baseDate = new Date(record.breedingDate || new Date());
  
  // Total days paired
  let daysTotal = !isNaN(baseDate.getTime())
    ? Math.max(1, Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 1;

  // Sanity check against legacy, unhealed, or stale dates (e.g. 119 days).
  // Active reptile pairing windows realistically run 1 to 14 days (max 21 days).
  if (daysTotal > 21 && isBreedingRecordActive(record)) {
    daysTotal = Math.min(((daysTotal - 1) % 14) + 1, 14);
  }

  // Determine stage start date
  let stageStartDate = record.breedingDate;
  if (record.status === 'IN PROGRESS') {
    stageStartDate = record.startedBreedingDate || record.breedingDate;
  } else if (record.status === 'POSSIBLE MATED') {
    stageStartDate = record.possibleMatedDate || record.startedBreedingDate || record.breedingDate;
  } else if (record.status === 'LIKELY MATED') {
    stageStartDate = record.likelyMatedDate || record.possibleMatedDate || record.breedingDate;
  } else if (record.status === 'CLUTCH RECORDED' || record.status === 'INCUBATING') {
    stageStartDate = record.clutchDate || record.breedingDate;
  } else if (record.status === 'COMPLETED' || record.status === 'SUCCESSFUL') {
    stageStartDate = record.hatchDate || record.clutchDate || record.breedingDate;
  }

  const stageDate = new Date(stageStartDate);
  let daysInCurrentStage = !isNaN(stageDate.getTime())
    ? Math.max(1, Math.floor((now.getTime() - stageDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 1;

  if (daysInCurrentStage > 21 && isBreedingRecordActive(record)) {
    daysInCurrentStage = Math.min(((daysInCurrentStage - 1) % 14) + 1, 14);
  }

  let displayDayText = `Day ${daysTotal}`;
  if (record.status === 'INCUBATING' || record.status === 'CLUTCH RECORDED') {
    displayDayText = `Incubation Day ${daysInCurrentStage}`;
  } else if (record.status === 'PAIRED') {
    displayDayText = 'Awaiting Start';
  } else if (record.status === 'IN PROGRESS') {
    displayDayText = `Day ${daysInCurrentStage} Paired`;
  } else if (record.status === 'COMPLETED' || record.status === 'SUCCESSFUL') {
    displayDayText = 'Cycle Completed';
  } else if (record.status === 'FAILED') {
    displayDayText = 'Concluded';
  }

  return {
    daysTotal,
    daysInCurrentStage,
    displayDayText,
    stageStartDate,
  };
}

export interface BreedingSuggestion {
  hasSuggestion: boolean;
  suggestedStatus: BreedingLifecycleStatus;
  title: string;
  reason: string;
  confidence: 'Low' | 'Medium' | 'High';
  actionLabel: string;
  secondaryActionLabel?: string;
  isStalled?: boolean;
}

/**
 * Automated System Suggestion Engine
 * Analyzes time elapsed, keeper observation logs, and biological indicators
 * to suggest next breeding lifecycle transitions without forcing them.
 */
export function evaluateBreedingProgress(record: BreedingRecord, customSystemDate?: string): BreedingSuggestion {
  const normStatus = normalizeBreedingStatus(record.status);
  const dayCounts = calculateBreedingDayCounts(record, customSystemDate);
  const logs = record.observationLogs || [];

  // Check for female physical/behavioral indicators in any logged notes
  const hasFemaleIndicators = logs.some(log => 
    (log.indicators?.weightIncreaseGrams && log.indicators.weightIncreaseGrams > 0) ||
    log.indicators?.nestingBehavior ||
    log.indicators?.swellingObserved ||
    log.type === 'Female Indicators' ||
    /(weight\s*gain|nesting|digging|gravid|follicle|swelling)/i.test(log.notes)
  );

  // Check for courtship or mating interaction logs
  const hasCourtshipLogs = logs.some(log =>
    log.type === 'Courtship' ||
    log.indicators?.tailFlagging ||
    /(courtship|copulation|lock|mating|head\s*bob|tail\s*flag)/i.test(log.notes)
  );

  // Rule 1: PAIRED -> Suggest starting breeding
  if (normStatus === 'PAIRED') {
    return {
      hasSuggestion: true,
      suggestedStatus: 'IN PROGRESS',
      title: 'Ready to Start Breeding',
      reason: 'Animals have been paired from the Animal Module. Begin active monitoring and day counter.',
      confidence: 'High',
      actionLabel: 'Start Breeding (Advance to In Progress)',
    };
  }

  // Rule 2: IN PROGRESS -> Suggest Possible Mated after 5–7 days or observed courtship
  if (normStatus === 'IN PROGRESS') {
    if (dayCounts.daysInCurrentStage >= 5 || hasCourtshipLogs) {
      return {
        hasSuggestion: true,
        suggestedStatus: 'POSSIBLE MATED',
        title: 'Possible Mating Occurred',
        reason: hasCourtshipLogs
          ? 'Courtship interactions have been logged during pairing. Timeframe matches successful mating.'
          : `${dayCounts.daysInCurrentStage} days elapsed in active pairing. Natural breeding window indicates possible mating occurred.`,
        confidence: hasCourtshipLogs ? 'High' : 'Medium',
        actionLabel: 'Accept: Advance to Possible Mated',
        secondaryActionLabel: 'Keep In Progress',
      };
    }
  }

  // Rule 3: POSSIBLE MATED -> Suggest Likely Mated if female indicators logged
  if (normStatus === 'POSSIBLE MATED') {
    if (hasFemaleIndicators) {
      return {
        hasSuggestion: true,
        suggestedStatus: 'LIKELY MATED',
        title: 'Female Indicators Detected: Likely Mated',
        reason: 'Keeper logged positive female indicators (weight increase or nesting/digging behavior). High confidence of gestation/gravidity.',
        confidence: 'High',
        actionLabel: 'Advance to Likely Mated (Gravid)',
      };
    }

    // Check if stalled for > 28 days with zero female indicators
    if (dayCounts.daysInCurrentStage > 28) {
      return {
        hasSuggestion: true,
        suggestedStatus: 'FAILED',
        title: 'Breeding Review Needed',
        reason: `${dayCounts.daysInCurrentStage} days have passed in Possible Mated without female follicular development or weight gain.`,
        confidence: 'Low',
        actionLabel: 'Review / Conclude Pairing',
        isStalled: true,
      };
    }
  }

  // Rule 4: LIKELY MATED -> Suggest Clutch Recorded when eggs are laid
  if (normStatus === 'LIKELY MATED') {
    if (record.clutchSize && record.clutchSize > 0) {
      return {
        hasSuggestion: true,
        suggestedStatus: 'CLUTCH RECORDED',
        title: 'Clutch Deposition Detected',
        reason: `Clutch data recorded (${record.clutchSize} eggs). Proceed to formal clutch tracking.`,
        confidence: 'High',
        actionLabel: 'Confirm Clutch Recorded',
      };
    }
  }

  // Rule 5: CLUTCH RECORDED -> Suggest moving to Incubating
  if (normStatus === 'CLUTCH RECORDED') {
    return {
      hasSuggestion: true,
      suggestedStatus: 'INCUBATING',
      title: 'Transfer to Incubation',
      reason: 'Clutch has been logged. Move eggs to temperature-controlled incubator and begin incubation days count.',
      confidence: 'High',
      actionLabel: 'Start Active Incubation',
    };
  }

  // Rule 6: INCUBATING -> Suggest Hatch Outcome when estimated days reached
  if (normStatus === 'INCUBATING') {
    if (record.hatchlings !== undefined && record.hatchlings > 0) {
      return {
        hasSuggestion: true,
        suggestedStatus: 'COMPLETED',
        title: 'Hatchlings Recorded',
        reason: `${record.hatchlings} hatchlings logged. Finalize breeding project and calculate hatch rate.`,
        confidence: 'High',
        actionLabel: 'Complete Breeding Cycle',
      };
    }

    if (dayCounts.daysInCurrentStage >= 55) {
      return {
        hasSuggestion: true,
        suggestedStatus: 'COMPLETED',
        title: 'Hatching Window Reached',
        reason: `Eggs have been incubating for ${dayCounts.daysInCurrentStage} days. Check incubator for pipping and record hatch outcome.`,
        confidence: 'Medium',
        actionLabel: 'Log Hatch Outcome',
      };
    }
  }

  return {
    hasSuggestion: false,
    suggestedStatus: normStatus,
    title: '',
    reason: '',
    confidence: 'Low',
    actionLabel: '',
  };
}

/**
 * Calculates hatch rate percentage: (hatched / total clutch) * 100
 */
export function calculateHatchRate(clutchSize?: number, hatched?: number): number {
  if (!clutchSize || clutchSize <= 0) return 0;
  const count = hatched !== undefined ? hatched : 0;
  return Math.round((Math.min(count, clutchSize) / clutchSize) * 1000) / 10;
}

/**
 * Pure transition engine for updating breeding record status
 */
export function transitionBreedingStatus(
  currentRecord: BreedingRecord,
  targetStatus: BreedingLifecycleStatus,
  options: {
    keeperName?: string;
    notes?: string;
    indicators?: BreedingObservationLog['indicators'];
    clutchSize?: number;
    fertileEggs?: number;
    infertileEggs?: number;
    hatchlings?: number;
    unhatchedEggs?: number;
    incubationTemp?: string;
    incubationHumidity?: string;
    incubatorUnit?: string;
    failureReason?: string;
    isOverride?: boolean;
  } = {}
): BreedingRecord {
  const today = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();
  const keeper = options.keeperName || 'Admin / Keeper';

  const updated: BreedingRecord = {
    ...currentRecord,
    status: targetStatus,
    notes: options.notes ? `${currentRecord.notes ? currentRecord.notes + ' | ' : ''}${options.notes}` : currentRecord.notes,
  };

  // Specific state timestamp triggers
  if (targetStatus === 'IN PROGRESS' && !updated.startedBreedingDate) {
    updated.startedBreedingDate = today;
  } else if (targetStatus === 'POSSIBLE MATED' && !updated.possibleMatedDate) {
    updated.possibleMatedDate = today;
  } else if (targetStatus === 'LIKELY MATED' && !updated.likelyMatedDate) {
    updated.likelyMatedDate = today;
  } else if (targetStatus === 'CLUTCH RECORDED' || targetStatus === 'INCUBATING') {
    if (!updated.clutchDate) updated.clutchDate = today;
    if (options.clutchSize !== undefined) updated.clutchSize = options.clutchSize;
    if (options.fertileEggs !== undefined) updated.fertileEggs = options.fertileEggs;
    if (options.infertileEggs !== undefined) updated.infertileEggs = options.infertileEggs;
    if (options.incubationTemp) updated.incubationTemp = options.incubationTemp;
    if (options.incubationHumidity) updated.incubationHumidity = options.incubationHumidity;
    if (options.incubatorUnit) updated.incubatorUnit = options.incubatorUnit;
    
    // Auto-calculate estimated hatch date (+60 days) if not already set
    if (!updated.hatchDate) {
      const d = new Date(updated.clutchDate || today);
      d.setDate(d.getDate() + 60);
      updated.hatchDate = d.toISOString().split('T')[0];
    }
  } else if (targetStatus === 'COMPLETED' || targetStatus === 'SUCCESSFUL') {
    if (!updated.hatchDate) updated.hatchDate = today;
    if (options.hatchlings !== undefined) updated.hatchlings = options.hatchlings;
    if (options.unhatchedEggs !== undefined) updated.unhatchedEggs = options.unhatchedEggs;
    
    const clutch = updated.clutchSize || (options.hatchlings || 0) + (options.unhatchedEggs || 0);
    updated.hatchRate = calculateHatchRate(clutch, updated.hatchlings);
  } else if (targetStatus === 'FAILED') {
    updated.failureReason = options.failureReason || options.notes || 'Breeding cycle concluded without clutch.';
  }

  // Append to Status History
  const historyEntry: BreedingStatusTransitionHistory = {
    id: `HIST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    fromStatus: currentRecord.status,
    toStatus: targetStatus,
    changedAt: nowIso,
    changedBy: keeper,
    reason: options.notes || `Transitioned from ${currentRecord.status} to ${targetStatus}`,
    isOverride: !!options.isOverride,
  };

  updated.statusHistory = [...(currentRecord.statusHistory || []), historyEntry];

  return updated;
}
