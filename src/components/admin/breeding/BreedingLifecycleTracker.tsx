import React, { useState, useEffect } from 'react';
import {
  Heart,
  Egg,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  ArrowRight,
  Award,
  Thermometer,
  Activity,
  HelpCircle,
  Scale,
  Sparkles,
  ChevronRight,
  Plus,
  Clock,
  User,
  ShieldAlert,
  RotateCcw,
  Sliders,
  Check,
  X,
  FileText,
  Info
} from 'lucide-react';
import {
  BreedingRecord,
  BreedingLifecycleStatus,
  BreedingObservationLog,
  Animal
} from '../../../types';
import {
  BREEDING_STAGES,
  LIFECYCLE_ORDER,
  calculateBreedingDayCounts,
  evaluateBreedingProgress,
  transitionBreedingStatus,
  normalizeBreedingStatus
} from '../../../utils/breedingStateMachine';

interface BreedingLifecycleTrackerProps {
  record: BreedingRecord;
  femaleAnimal?: Animal;
  maleAnimal?: Animal;
  onUpdateRecord: (updated: BreedingRecord) => void;
  onOpenClutchModal?: (record: BreedingRecord) => void;
  onOpenHatchModal?: (record: BreedingRecord) => void;
  isDarkMode: boolean;
  isKeeper?: boolean;
  systemDate?: string;
}

export const BreedingLifecycleTracker: React.FC<BreedingLifecycleTrackerProps> = ({
  record,
  femaleAnimal,
  maleAnimal,
  onUpdateRecord,
  onOpenClutchModal,
  onOpenHatchModal,
  isDarkMode,
  isKeeper = false,
  systemDate,
}) => {
  const normStatus = normalizeBreedingStatus(record.status, record);
  const stageConfig = BREEDING_STAGES[normStatus] || BREEDING_STAGES['IN PROGRESS'];
  const dayCounts = calculateBreedingDayCounts(record, systemDate);
  const suggestion = evaluateBreedingProgress(record, systemDate);

  // Modals state
  const [isLogObservationModalOpen, setIsLogObservationModalOpen] = useState(false);
  const [isManualOverrideModalOpen, setIsManualOverrideModalOpen] = useState(false);
  const [isFailModalOpen, setIsFailModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isDemoToolbarOpen, setIsDemoToolbarOpen] = useState(false);

  // Observation form state
  const [obsType, setObsType] = useState<BreedingObservationLog['type']>('Behavior');
  const [obsNotes, setObsNotes] = useState('');
  const [obsWeightChange, setObsWeightChange] = useState<string>('');
  const [obsNesting, setObsNesting] = useState(false);
  const [obsRestlessness, setObsRestlessness] = useState(false);
  const [obsSwelling, setObsSwelling] = useState(false);
  const [obsTailFlagging, setObsTailFlagging] = useState(false);
  const [obsOther, setObsOther] = useState(false);
  const [obsOtherNotes, setObsOtherNotes] = useState('');
  const [obsAggression, setObsAggression] = useState<'None' | 'Mild' | 'Moderate' | 'Severe'>('None');

  // Selected phase card tab & its reachability check
  const isPhaseReached = (p: number) => {
    if (p === 1) return true;
    if (p === 2) return ['CLUTCH RECORDED', 'INCUBATING', 'COMPLETED', 'SUCCESSFUL'].includes(normStatus);
    if (p === 3) return ['INCUBATING', 'COMPLETED', 'SUCCESSFUL'].includes(normStatus);
    if (p === 4) return ['COMPLETED', 'SUCCESSFUL'].includes(normStatus);
    return false;
  };

  const defaultSelectedPhase = isPhaseReached(4) ? 4 : isPhaseReached(3) ? 3 : isPhaseReached(2) ? 2 : 1;
  const [selectedPhase, setSelectedPhase] = useState<number>(defaultSelectedPhase);

  useEffect(() => {
    setSelectedPhase(defaultSelectedPhase);
  }, [normStatus]);

  useEffect(() => {
    if (isLogObservationModalOpen) {
      if (selectedPhase === 1) {
        setObsType('Behavior');
      } else if (selectedPhase === 2) {
        setObsType('Clutch');
      } else if (selectedPhase === 3) {
        setObsType('Candling');
      } else if (selectedPhase === 4) {
        setObsType('Hatch');
      }
    }
  }, [isLogObservationModalOpen, selectedPhase]);

  // Phase-specific fields for logging
  const [clutchSize, setClutchSize] = useState<string>(record.clutchSize ? String(record.clutchSize) : '');
  const [fertileEggs, setFertileEggs] = useState<string>(record.fertileEggs ? String(record.fertileEggs) : '');
  const [incubationTemp, setIncubationTemp] = useState<string>(record.incubationTemp || '28.5');
  const [incubationHumidity, setIncubationHumidity] = useState<string>(record.incubationHumidity || '80%');
  const [hatchlingsCount, setHatchlingsCount] = useState<string>(record.hatchlings ? String(record.hatchlings) : '');

  // Manual Override state
  const [targetOverrideStatus, setTargetOverrideStatus] = useState<BreedingLifecycleStatus>(normStatus);
  const [overrideReason, setOverrideReason] = useState('');

  // Failure modal state
  const [failReason, setFailReason] = useState('Incompatible Pair / Excessive Aggression');
  const [failNotes, setFailNotes] = useState('');

  // Handle direct state transitions
  const handleDirectTransition = (target: BreedingLifecycleStatus, transitionNotes?: string) => {
    const updated = transitionBreedingStatus(record, target, {
      keeperName: 'Keeper Staff',
      notes: transitionNotes || `Advanced to ${target} via workflow progression.`,
    });
    onUpdateRecord(updated);
  };

  // Submit Observation
  const handleSaveObservation = (e: React.FormEvent) => {
    e.preventDefault();
    const weightVal = obsWeightChange ? parseFloat(obsWeightChange) : undefined;
    
    // Check if keeper logged indicators that should immediately promote to LIKELY MATED
    const hasStrongFemaleIndicators = (weightVal && weightVal > 0) || obsNesting || obsSwelling;
    const shouldAutoAdvanceToLikely = normStatus === 'POSSIBLE MATED' && hasStrongFemaleIndicators;

    let updated = { ...record };

    const newLog: BreedingObservationLog = {
      id: `OBS-${Date.now()}`,
      date: systemDate || new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      keeperName: 'Keeper Staff',
      type: obsType,
      notes: obsNotes || `Recorded ${obsType} details during daily checks.`,
      indicators: {
        weightIncreaseGrams: weightVal,
        nestingBehavior: obsNesting,
        restlessness: obsRestlessness,
        swellingObserved: obsSwelling,
        tailFlagging: obsTailFlagging,
        aggressionLevel: obsAggression,
        otherObserved: obsOther,
        otherNotes: obsOther && obsOtherNotes.trim() ? obsOtherNotes.trim() : undefined,
      },
    };

    updated.observationLogs = [newLog, ...(record.observationLogs || [])];

    if (obsType === 'Clutch') {
      if (clutchSize) updated.clutchSize = Number(clutchSize);
      if (fertileEggs) updated.fertileEggs = Number(fertileEggs);
      if (incubationTemp) updated.incubationTemp = incubationTemp;
      if (incubationHumidity) updated.incubationHumidity = incubationHumidity;
      if (!updated.clutchDate) updated.clutchDate = systemDate || new Date().toISOString().split('T')[0];
      
      if (normStatus !== 'CLUTCH RECORDED' && normStatus !== 'INCUBATING' && normStatus !== 'COMPLETED') {
        updated = transitionBreedingStatus(updated, 'CLUTCH RECORDED', {
          keeperName: 'Keeper Staff',
          notes: obsNotes || `Logged clutch of ${clutchSize || 0} eggs.`,
          clutchSize: clutchSize ? Number(clutchSize) : undefined,
          fertileEggs: fertileEggs ? Number(fertileEggs) : undefined,
          incubationTemp,
          incubationHumidity
        });
      } else {
        onUpdateRecord(updated);
      }
    } else if (obsType === 'Hatch') {
      if (hatchlingsCount) updated.hatchlings = Number(hatchlingsCount);
      if (!updated.hatchDate) updated.hatchDate = systemDate || new Date().toISOString().split('T')[0];

      if (normStatus !== 'COMPLETED') {
        updated = transitionBreedingStatus(updated, 'COMPLETED', {
          keeperName: 'Keeper Staff',
          notes: obsNotes || `Logged hatch of ${hatchlingsCount || 0} offspring.`,
          hatchlings: hatchlingsCount ? Number(hatchlingsCount) : undefined
        });
      } else {
        onUpdateRecord(updated);
      }
    } else if (shouldAutoAdvanceToLikely) {
      updated = transitionBreedingStatus(updated, 'LIKELY MATED', {
        keeperName: 'Keeper Staff',
        notes: `Female indicators confirmed (${obsNesting ? 'Nesting behavior observed. ' : ''}${weightVal ? `+${weightVal}g weight increase. ` : ''}${obsNotes})`,
        indicators: newLog.indicators,
      });
    } else {
      onUpdateRecord(updated);
    }

    setIsLogObservationModalOpen(false);
    setObsNotes('');
    setObsWeightChange('');
    setObsNesting(false);
    setObsRestlessness(false);
    setObsSwelling(false);
    setObsTailFlagging(false);
    setObsOther(false);
    setObsOtherNotes('');
    setObsAggression('None');
  };

  // Submit Manual Override
  const handleConfirmOverride = () => {
    const updated = transitionBreedingStatus(record, targetOverrideStatus, {
      keeperName: 'Keeper Staff (Manual Override)',
      notes: overrideReason || 'Manual status change applied by keeper override.',
      isOverride: true,
    });
    onUpdateRecord(updated);
    setIsManualOverrideModalOpen(false);
    setOverrideReason('');
  };

  // Submit Failure
  const handleConfirmFailure = () => {
    const updated = transitionBreedingStatus(record, 'FAILED', {
      keeperName: 'Keeper Staff',
      failureReason: failReason,
      notes: failNotes ? `${failReason}: ${failNotes}` : failReason,
    });
    onUpdateRecord(updated);
    setIsFailModalOpen(false);
    setFailNotes('');
  };

  const currentStepIdx = LIFECYCLE_ORDER.indexOf(normStatus);

  // Date calculation helpers for the 4 Phase progression cards
  const pairDateStr = record.breedingDate || record.startedBreedingDate || record.createdAt || '2026-10-04';
  const pairDateObj = new Date(pairDateStr);
  const validPairDate = isNaN(pairDateObj.getTime()) ? new Date('2026-10-04') : pairDateObj;
  
  const formatCardDate = (dString?: string) => {
    if (!dString) return '';
    const d = new Date(dString);
    if (isNaN(d.getTime())) return dString;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const estClutchDate = new Date(validPairDate);
  estClutchDate.setDate(estClutchDate.getDate() + 30);
  const estClutchFormatted = estClutchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const anchorClutchDate = record.clutchDate ? new Date(record.clutchDate) : estClutchDate;
  const estHatchDate = new Date(anchorClutchDate);
  estHatchDate.setDate(estHatchDate.getDate() + 60);
  const estHatchFormatted = estHatchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // 5-Step Horizontal Stepper timeline helpers (matching Image 2)
  const visualStages = ['Pairing', 'Monitoring', 'Clutch', 'Incubation', 'Outcome'] as const;

  let currentStageIndex = 1;
  if (normStatus === 'PAIRED') currentStageIndex = 0;
  else if (['IN PROGRESS', 'POSSIBLE MATED', 'LIKELY MATED'].includes(normStatus)) currentStageIndex = 1;
  else if (normStatus === 'CLUTCH RECORDED') currentStageIndex = 2;
  else if (normStatus === 'INCUBATING') currentStageIndex = 3;
  else if (['COMPLETED', 'SUCCESSFUL', 'FAILED'].includes(normStatus)) currentStageIndex = 4;

  const hasRealClutch = !!(
    record.clutchDate &&
    (normStatus === 'CLUTCH RECORDED' || normStatus === 'INCUBATING' || normStatus === 'COMPLETED' || normStatus === 'SUCCESSFUL') &&
    record.clutchDate !== record.breedingDate
  );

  const hasRealHatch = !!(
    record.hatchDate &&
    (normStatus === 'COMPLETED' || normStatus === 'SUCCESSFUL')
  );

  const shortPairDateStr = validPairDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const pairEnd = new Date(validPairDate);
  pairEnd.setDate(pairEnd.getDate() + 7);
  const pairEndShort = pairEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const pairEndFull = pairEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const estClutchStart = new Date(validPairDate);
  estClutchStart.setDate(estClutchStart.getDate() + 30);
  const estClutchEnd = new Date(estClutchStart);
  estClutchEnd.setDate(estClutchEnd.getDate() + 15);

  const estClutchStartShort = estClutchStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const estClutchEndShort = estClutchEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const estClutchFullRange = `Est. ${estClutchStartShort} – ${estClutchEndShort}, 2026`;

  const incStart = hasRealClutch ? new Date(record.clutchDate!) : estClutchStart;
  const incEnd = new Date(incStart);
  incEnd.setDate(incEnd.getDate() + 30);
  const incStartShort = incStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const incEndShort = incEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const hatchStart = hasRealClutch ? new Date(record.clutchDate!) : estClutchStart;
  hatchStart.setDate(hatchStart.getDate() + 60);
  const hatchEnd = new Date(hatchStart);
  hatchEnd.setDate(hatchEnd.getDate() + 15);
  const hatchStartShort = hatchStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const hatchEndShort = hatchEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const hatchFullRange = `Est. ${hatchStartShort} – ${hatchEndShort}, 2026`;

  const getStageDateText = (stg: typeof visualStages[number]) => {
    if (stg === 'Pairing') return `${shortPairDateStr} – ${pairEndShort}`;
    if (stg === 'Monitoring') return `${shortPairDateStr} – ${pairEndShort}`;
    if (stg === 'Clutch') {
      if (hasRealClutch) {
        const d = new Date(record.clutchDate!);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return `Est. ${estClutchStartShort} – ${estClutchEndShort}`;
    }
    if (stg === 'Incubation') {
      if (hasRealClutch) {
        const d = new Date(record.clutchDate!);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return `Est. ${incStartShort} – ${incEndShort}`;
    }
    if (stg === 'Outcome') {
      if (hasRealHatch) {
        const d = new Date(record.hatchDate!);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return `${hatchStartShort} – ${hatchEndShort}`;
    }
    return '';
  };

  return (
    <div className={`rounded-3xl border p-5 transition-all space-y-5 ${
      isDarkMode ? 'bg-[#05180E] border-emerald-950/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* 1. PAIR HEADER WITH ANIMAL CARDS */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-[#062013] to-emerald-950/80 border border-emerald-800/60 shadow-md">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Female Dam */}
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="w-12 h-12 rounded-xl overflow-hidden relative border border-pink-500/40 bg-pink-950/30 shrink-0 shadow-xs">
              {femaleAnimal?.image || femaleAnimal?.photoUrl ? (
                <img
                  src={femaleAnimal?.image || femaleAnimal?.photoUrl}
                  alt={femaleAnimal?.name || record.femaleName || record.femaleId}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-pink-400 font-bold text-xs">
                  ♀
                </div>
              )}
              <span className="absolute bottom-0 inset-x-0 bg-pink-600/90 text-[8px] text-white font-extrabold text-center py-0.5">
                ♀ Dam
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-black text-white">
                  {femaleAnimal?.name || record.femaleName || record.femaleId}
                </span>
                <span className="text-[10px] font-mono text-pink-400 font-bold">
                  ({record.femaleId})
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {femaleAnimal?.species || record.species || 'Reptile'} • {femaleAnimal?.weight ? `${femaleAnimal.weight}g` : '360g'}
              </p>
            </div>
          </div>

          {/* Center Heart Status Badge */}
          <div className="flex flex-col items-center justify-center px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 shrink-0">
            <div className="flex items-center space-x-1.5">
              <Heart className="w-4 h-4 text-pink-400 animate-pulse" />
              <span className="text-xs font-black text-emerald-300">
                Active Pairing
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400/80 font-bold">
              {dayCounts.displayDayText}
            </span>
          </div>

          {/* Male Sire */}
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <div className="text-right">
              <div className="flex items-center justify-end space-x-1.5">
                <span className="text-[10px] font-mono text-sky-400 font-bold">
                  ({record.maleId})
                </span>
                <span className="text-sm font-black text-white">
                  {maleAnimal?.name || record.maleName || record.maleId}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {maleAnimal?.species || record.species || 'Reptile'} • {maleAnimal?.weight ? `${maleAnimal.weight}g` : '352g'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl overflow-hidden relative border border-sky-500/40 bg-sky-950/30 shrink-0 shadow-xs">
              {maleAnimal?.image || maleAnimal?.photoUrl ? (
                <img
                  src={maleAnimal?.image || maleAnimal?.photoUrl}
                  alt={maleAnimal?.name || record.maleName || record.maleId}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sky-400 font-bold text-xs">
                  ♂
                </div>
              )}
              <span className="absolute bottom-0 inset-x-0 bg-sky-600/90 text-[8px] text-white font-extrabold text-center py-0.5">
                ♂ Sire
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 5-STEP HORIZONTAL STEPPER TIMELINE (EXACT MATCH FOR IMAGE 2) */}
      <div className="py-4 px-3 sm:px-6 bg-[#03150C] rounded-2xl border border-emerald-900/60 shadow-md">
        <div className="relative flex items-center justify-between">
          {/* Background track line */}
          <div className="absolute left-3 right-3 top-3 -translate-y-1/2 h-0.5 bg-emerald-950/90 border-t border-emerald-900/50" />

          {/* Progress fill line */}
          <div
            className="absolute left-3 top-3 -translate-y-1/2 h-0.5 bg-emerald-400 shadow-xs shadow-emerald-400/50 transition-all duration-500"
            style={{
              width: `calc(${(currentStageIndex / (visualStages.length - 1)) * 100}% - 12px)`
            }}
          />

          {visualStages.map((stg, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;

            return (
              <div key={stg} className="relative z-10 flex flex-col items-center">
                {isCompleted ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-400 text-black flex items-center justify-center font-bold shadow-md shadow-emerald-500/30">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : isCurrent ? (
                  <div className="w-6 h-6 rounded-full border-2 border-emerald-400 p-0.5 bg-[#041B10] flex items-center justify-center shadow-lg shadow-emerald-500/40">
                    <div className="w-full h-full rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-slate-700 bg-[#041B10] flex items-center justify-center" />
                )}

                <span
                  className={`text-xs mt-2 font-bold tracking-tight ${
                    isCurrent
                      ? 'text-white font-extrabold'
                      : isCompleted
                      ? 'text-emerald-400 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  {stg}
                </span>
                <span
                  className={`text-[10px] font-mono mt-0.5 whitespace-nowrap ${
                    isCurrent
                      ? 'text-emerald-400 font-black'
                      : isCompleted
                      ? 'text-emerald-400/80 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  {getStageDateText(stg)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. FRIENDLY 4-PHASE PROGRESSION JOURNEY */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Phase 1: Pairing & Courtship */}
          <div 
            onClick={() => setSelectedPhase(1)}
            className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
              selectedPhase === 1 ? 'ring-2 ring-emerald-500 shadow-md scale-[1.01]' : 'hover:scale-[1.01]'
            } ${
              ['PAIRED', 'IN PROGRESS', 'POSSIBLE MATED', 'LIKELY MATED'].includes(normStatus)
                ? 'bg-emerald-500/15 border-emerald-500/40 text-white shadow-sm ring-1 ring-emerald-500/30'
                : ['CLUTCH RECORDED', 'INCUBATING', 'COMPLETED', 'SUCCESSFUL'].includes(normStatus)
                ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400 opacity-80'
                : 'bg-slate-900/30 border-slate-800 text-slate-500 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">Phase 1</span>
              <Heart className="w-4 h-4 text-pink-400" />
            </div>
            <div className="text-xs font-black text-white">Courtship &amp; Pairing</div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-1">
              {['PAIRED', 'IN PROGRESS', 'POSSIBLE MATED', 'LIKELY MATED'].includes(normStatus) ? (
                <span className="text-emerald-400 font-bold">🟢 Active Phase</span>
              ) : (
                <span>✓ Completed</span>
              )}
            </div>
            <div className="mt-2 text-[10px] font-mono text-emerald-300 font-semibold bg-emerald-950/70 px-2 py-0.5 rounded-md border border-emerald-800/60 inline-flex items-center space-x-1">
              <span>📅 {formatCardDate(pairDateStr)} – {pairEndFull}</span>
            </div>
          </div>

          {/* Phase 2: Egg Laying / Clutch */}
          <div 
            onClick={() => setSelectedPhase(2)}
            className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
              selectedPhase === 2 ? 'ring-2 ring-amber-500 shadow-md scale-[1.01]' : 'hover:scale-[1.01]'
            } ${
              normStatus === 'CLUTCH RECORDED'
                ? 'bg-amber-500/15 border-amber-500/40 text-white shadow-sm ring-1 ring-amber-500/30'
                : ['INCUBATING', 'COMPLETED', 'SUCCESSFUL'].includes(normStatus)
                ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400 opacity-80'
                : 'bg-slate-900/30 border-slate-800 text-slate-500 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">Phase 2</span>
              <Egg className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xs font-black text-white">Egg Laying / Clutch</div>
            <div className="text-[10px] text-slate-400 mt-1">
              {normStatus === 'CLUTCH RECORDED' ? '🟡 Clutch Deposited' : ['INCUBATING', 'COMPLETED', 'SUCCESSFUL'].includes(normStatus) ? '✓ Completed' : 'Pending Clutch'}
            </div>
            <div className="mt-2 text-[10px] font-mono text-amber-300 font-semibold bg-amber-950/70 px-2 py-0.5 rounded-md border border-amber-800/60 inline-flex items-center space-x-1">
              <span>📅 {hasRealClutch ? formatCardDate(record.clutchDate) : estClutchFullRange}</span>
            </div>
          </div>

          {/* Phase 3: Incubation */}
          <div 
            onClick={() => setSelectedPhase(3)}
            className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
              selectedPhase === 3 ? 'ring-2 ring-teal-500 shadow-md scale-[1.01]' : 'hover:scale-[1.01]'
            } ${
              normStatus === 'INCUBATING'
                ? 'bg-teal-500/15 border-teal-500/40 text-white shadow-sm ring-1 ring-teal-500/30'
                : ['COMPLETED', 'SUCCESSFUL'].includes(normStatus)
                ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400 opacity-80'
                : 'bg-slate-900/30 border-slate-800 text-slate-500 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400">Phase 3</span>
              <Thermometer className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-xs font-black text-white">Egg Incubation</div>
            <div className="text-[10px] text-slate-400 mt-1">
              {normStatus === 'INCUBATING' ? '🔵 Incubating Chamber' : ['COMPLETED', 'SUCCESSFUL'].includes(normStatus) ? '✓ Completed' : 'Pending Incubation'}
            </div>
            <div className="mt-2 text-[10px] font-mono text-teal-300 font-semibold bg-teal-950/70 px-2 py-0.5 rounded-md border border-teal-800/60 inline-flex items-center space-x-1">
              <span>📅 {hasRealClutch ? formatCardDate(record.clutchDate) : `Est. ${incStartShort} – ${incEndShort}, 2026`}</span>
            </div>
          </div>

          {/* Phase 4: Hatching Success */}
          <div 
            onClick={() => setSelectedPhase(4)}
            className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
              selectedPhase === 4 ? 'ring-2 ring-emerald-500 shadow-md scale-[1.01]' : 'hover:scale-[1.01]'
            } ${
              normStatus === 'COMPLETED' || normStatus === 'SUCCESSFUL'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-white shadow-sm ring-1 ring-emerald-500/40'
                : 'bg-slate-900/30 border-slate-800 text-slate-500 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">Phase 4</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xs font-black text-white">Hatchlings Outcome</div>
            <div className="text-[10px] text-slate-400 mt-1">
              {normStatus === 'COMPLETED' || normStatus === 'SUCCESSFUL' ? '🏆 Cycle Complete' : 'Final Outcome'}
            </div>
            <div className="mt-2 text-[10px] font-mono text-emerald-300 font-semibold bg-emerald-950/70 px-2 py-0.5 rounded-md border border-emerald-800/60 inline-flex items-center space-x-1">
              <span>📅 {hasRealHatch ? formatCardDate(record.hatchDate) : hatchFullRange}</span>
            </div>
          </div>
        </div>
        {(() => {
          const userLogs = (record.observationLogs || []).filter(log => 
            !log.id.startsWith('DEMO-') &&
            !log.notes.startsWith('Clutch moved') &&
            !log.notes.startsWith('Copulation lock observed') &&
            !log.notes.startsWith('Keeper initiated active breeding') &&
            !log.notes.startsWith('Courtship observed /') &&
            !log.notes.startsWith('Female physical indicators confirmed') &&
            !log.notes.startsWith('Advanced to') &&
            !log.notes.startsWith('Accepted system suggestion')
          );

          return (
            <div className="p-5 rounded-2xl bg-black/40 border border-emerald-800/60 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-900/60 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white tracking-tight">
                      Keeper Field Husbandry Logs ({userLogs.length})
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Live daily checks, locks, and observations submitted by Animal Keepers in the field.
                    </p>
                  </div>
                </div>

                {isKeeper && (
                  <button
                    type="button"
                    onClick={() => setIsLogObservationModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-100" />
                    <span>+ Add Field Note</span>
                  </button>
                )}
              </div>

              {userLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs bg-emerald-950/20 rounded-xl border border-emerald-950/80 p-5 space-y-2">
                  <FileText className="w-8 h-8 mx-auto opacity-40 text-emerald-400" />
                  <p className="font-extrabold text-slate-200 text-sm">No Keeper Field Logs Recorded Yet</p>
                  <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                    Daily behavioral checks, courtship observations, weight logs, and copulation locks recorded by Animal Keepers in their Keeper Dashboard will automatically appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {userLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl bg-[#03180F] border border-emerald-900/50 hover:border-emerald-800/80 transition-all space-y-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-950/80 pb-2">
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] border border-emerald-500/30">
                            {log.type}
                          </span>
                          <span className="font-extrabold text-slate-200 text-xs">
                            {log.keeperName || 'Jason Lee (Primary Keeper)'}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-400 font-semibold">
                          📅 {log.date} {log.timestamp ? `• ${log.timestamp}` : ''}
                        </span>
                      </div>

                      <p className="text-slate-200 leading-relaxed text-xs font-medium">
                        {log.notes}
                      </p>

                      {/* Indicators Badges */}
                      {log.indicators && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {log.indicators.weightIncreaseGrams !== undefined && log.indicators.weightIncreaseGrams > 0 && (
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-mono border border-emerald-800">
                              ⚖️ Weight: +{log.indicators.weightIncreaseGrams}g
                            </span>
                          )}
                          {log.indicators.nestingBehavior && (
                            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-mono border border-amber-800">
                              🪹 Nesting Behavior
                            </span>
                          )}
                          {log.indicators.swellingObserved && (
                            <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 text-[10px] font-mono border border-indigo-800">
                              🔍 Gravid Swelling
                            </span>
                          )}
                          {log.indicators.aggressionLevel && log.indicators.aggressionLevel !== 'None' && (
                            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] font-mono border border-rose-800">
                              ⚠️ Aggression: {log.indicators.aggressionLevel}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL 1: LOG OBSERVATION & FEMALE INDICATORS */}
      {/* ========================================================================= */}
      {isLogObservationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className={`w-full max-w-lg rounded-3xl border p-6 space-y-4 ${
            isDarkMode ? 'bg-[#061B10] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-950 pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-sm">
                  {selectedPhase === 1 ? 'Log Pairing & Courtship Checks'
                   : selectedPhase === 2 ? 'Log Clutch Deposition Data'
                   : selectedPhase === 3 ? 'Log Incubation Parameters'
                   : 'Log Hatching & Outcome Results'}
                </h3>
              </div>
              <button
                onClick={() => setIsLogObservationModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {!isPhaseReached(selectedPhase) ? (
              <div className="p-5 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-amber-400 uppercase tracking-wider">Phase Not Reached Yet</h4>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto mt-1.5">
                    Maaari ka lamang mag-log o maglagay ng data para sa <strong>Phase {selectedPhase}</strong> kapag pumasok na o natapos na ang yugto na ito sa breeding lifecycle timeline.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLogObservationModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
                  >
                    Got it, Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveObservation} className="space-y-3.5 text-xs">
                {selectedPhase === 1 && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Observation Type</label>
                        <select
                          value={obsType}
                          onChange={e => setObsType(e.target.value as any)}
                          className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-white font-medium"
                        >
                          <option value="Behavior">Behavior / Courtship</option>
                          <option value="Female Indicators">Female Physical Indicators (Gravid)</option>
                          <option value="Aggression">Pair Aggression Check</option>
                          <option value="Interaction">General Interaction</option>
                          <option value="General">General Keeper Note</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Female Weight Change (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="e.g., +8.5"
                          value={obsWeightChange}
                          onChange={e => setObsWeightChange(e.target.value)}
                          className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-white font-medium placeholder-slate-600"
                        />
                      </div>
                    </div>

                    {/* Female Behavioral Indicators Checkboxes */}
                    <div className="p-3 rounded-2xl bg-black/20 border border-slate-200 dark:border-emerald-950 space-y-2">
                      <span className="text-[11px] font-bold text-slate-300 block uppercase">
                        Biological & Female Indicators (Gravidity Checks)
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={obsNesting}
                            onChange={e => setObsNesting(e.target.checked)}
                            className="rounded accent-emerald-500"
                          />
                          <span>Nesting / Digging Behavior</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={obsSwelling}
                            onChange={e => setObsSwelling(e.target.checked)}
                            className="rounded accent-emerald-500"
                          />
                          <span>Abdominal Swelling / Follicles</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={obsRestlessness}
                            onChange={e => setObsRestlessness(e.target.checked)}
                            className="rounded accent-emerald-500"
                          />
                          <span>Restlessness / Basking Shift</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={obsTailFlagging}
                            onChange={e => setObsTailFlagging(e.target.checked)}
                            className="rounded accent-emerald-500"
                          />
                          <span>Tail Flagging / Courtship</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={obsOther}
                            onChange={e => setObsOther(e.target.checked)}
                            className="rounded accent-emerald-500"
                          />
                          <span>Other</span>
                        </label>
                      </div>
                      {obsOther && (
                        <div className="pt-2 animate-in fade-in duration-150">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                            Specify Other Observed Sign / Behavior
                          </label>
                          <input
                            type="text"
                            value={obsOtherNotes}
                            onChange={e => setObsOtherNotes(e.target.value)}
                            placeholder="e.g. Color change, basking shift, substrate burrowing..."
                            className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Pair Aggression Level</label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['None', 'Mild', 'Moderate', 'Severe'] as const).map(lvl => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setObsAggression(lvl)}
                            className={`py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                              obsAggression === lvl
                                ? lvl === 'None'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                                  : lvl === 'Mild'
                                  ? 'bg-amber-950 text-amber-300 border-amber-600'
                                  : 'bg-rose-950 text-rose-300 border-rose-600'
                                : 'bg-black/20 text-slate-400 border-slate-800'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {selectedPhase === 2 && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <span className="text-[11px] font-bold text-amber-400 block uppercase">
                      🍳 CLUTCH DEPOSITION RECORDS
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Clutch Size (Total Eggs)</label>
                        <input
                          type="number"
                          placeholder="e.g. 15"
                          value={clutchSize}
                          onChange={e => setClutchSize(e.target.value)}
                          className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-white font-medium"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Fertile Eggs Count</label>
                        <input
                          type="number"
                          placeholder="e.g. 12"
                          value={fertileEggs}
                          onChange={e => setFertileEggs(e.target.value)}
                          className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-white font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Incubation Temp (°C)</label>
                        <input
                          type="text"
                          placeholder="e.g. 28.5"
                          value={incubationTemp}
                          onChange={e => setIncubationTemp(e.target.value)}
                          className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-white font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Incubation Humidity (%)</label>
                        <input
                          type="text"
                          placeholder="e.g. 80%"
                          value={incubationHumidity}
                          onChange={e => setIncubationHumidity(e.target.value)}
                          className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-white font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedPhase === 3 && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <span className="text-[11px] font-bold text-teal-400 block uppercase">
                      🌡️ INCUBATION CHAMBER CHECKS &amp; CANDLING
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Target Temp (°C)</label>
                        <input
                          type="text"
                          value={incubationTemp}
                          onChange={e => setIncubationTemp(e.target.value)}
                          className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-white font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Target Humidity (%)</label>
                        <input
                          type="text"
                          value={incubationHumidity}
                          onChange={e => setIncubationHumidity(e.target.value)}
                          className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-white font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedPhase === 4 && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <span className="text-[11px] font-bold text-emerald-400 block uppercase">
                      🏆 HATCHING OUTCOME &amp; OFFSPRING COUNT
                    </span>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Hatchlings Count (Successful Births)</label>
                      <input
                        type="number"
                        placeholder="e.g. 10"
                        value={hatchlingsCount}
                        onChange={e => setHatchlingsCount(e.target.value)}
                        className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-white font-medium"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Keeper Notes &amp; Details</label>
                  <textarea
                    rows={3}
                    value={obsNotes}
                    onChange={e => setObsNotes(e.target.value)}
                    placeholder="Maglagay ng karagdagang detalye o obserbasyon para sa yugtong ito..."
                    className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl p-2.5 text-white placeholder-slate-600 outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-emerald-950">
                  <button
                    type="button"
                    onClick={() => setIsLogObservationModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs shadow-xs"
                  >
                    Save Observation
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MANUAL STATUS OVERRIDE BY KEEPER */}
      {/* ========================================================================= */}
      {isManualOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-3xl border p-6 space-y-4 ${
            isDarkMode ? 'bg-[#061B10] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-950 pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm">Keeper Manual Status Override</h3>
              </div>
              <button
                onClick={() => setIsManualOverrideModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              As a keeper or supervisor, you can manually set the breeding status to any stage in the lifecycle. This will record an audit trail.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Target Status</label>
                <select
                  value={targetOverrideStatus}
                  onChange={e => setTargetOverrideStatus(e.target.value as BreedingLifecycleStatus)}
                  className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="PAIRED">1. PAIRED (Initial / Waiting)</option>
                  <option value="IN PROGRESS">2. IN PROGRESS (Monitoring)</option>
                  <option value="POSSIBLE MATED">3. POSSIBLE MATED (5–7 days window)</option>
                  <option value="LIKELY MATED">4. LIKELY MATED (Female Gravid)</option>
                  <option value="CLUTCH RECORDED">5. CLUTCH RECORDED (Eggs Laid)</option>
                  <option value="INCUBATING">6. INCUBATING (Incubator Tracking)</option>
                  <option value="COMPLETED">7. COMPLETED (Hatched & Finalized)</option>
                  <option value="FAILED">8. FAILED (Concluded / Incompatible)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Reason for Override</label>
                <textarea
                  rows={2}
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  placeholder="e.g. Visual confirmation of copulation lock witnessed by keeper..."
                  className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl p-2 text-white placeholder-slate-600 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-emerald-950">
              <button
                type="button"
                onClick={() => setIsManualOverrideModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOverride}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
              >
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MARK AS FAILED MODAL */}
      {/* ========================================================================= */}
      {isFailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-3xl border p-6 space-y-4 ${
            isDarkMode ? 'bg-[#061B10] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-950 pb-3">
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                <h3 className="font-extrabold text-sm text-white">Conclude Cycle as Failed</h3>
              </div>
              <button
                onClick={() => setIsFailModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              This will mark the current breeding cycle between <strong>{record.femaleId}</strong> and <strong>{record.maleId}</strong> as <strong>FAILED</strong>. Both animals can be returned to resting status.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Reason for Failure</label>
                <select
                  value={failReason}
                  onChange={e => setFailReason(e.target.value)}
                  className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="Incompatible Pair / Excessive Aggression">Incompatible Pair / Excessive Aggression</option>
                  <option value="No Follicular Development after Extended Window">No Follicular Development after Extended Window</option>
                  <option value="Unsuccessful Mating Attempts / No Receptivity">Unsuccessful Mating Attempts / No Receptivity</option>
                  <option value="Infertile Clutch (Slugs) / 0% Hatchability">Infertile Clutch (Slugs) / 0% Hatchability</option>
                  <option value="Breeding Season Concluded / Natural Bruma Transition">Breeding Season Concluded / Natural Bruma Transition</option>
                  <option value="Health / Medical Precautionary Separation">Health / Medical Precautionary Separation</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Keeper Notes</label>
                <textarea
                  rows={2}
                  value={failNotes}
                  onChange={e => setFailNotes(e.target.value)}
                  placeholder="Provide clinical or behavioral summary..."
                  className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl p-2 text-white placeholder-slate-600 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-emerald-950">
              <button
                type="button"
                onClick={() => setIsFailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFailure}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
              >
                Confirm Failure & Conclude
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
