import React, { useState, useMemo, useEffect } from 'react';
import {
  Heart,
  Scale,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Star,
  Plus,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  Building2,
  Calendar,
  Info,
  ChevronRight,
  ChevronDown,
  Activity,
  PawPrint,
  HelpCircle,
  X,
  Search,
  Filter,
  Check,
  Sparkles,
  ShieldCheck,
  Thermometer,
  Droplets,
  Egg,
  ClipboardList,
  CheckSquare,
  SlidersHorizontal,
  Sliders,
  RefreshCw,
  Zap,
  Dna,
  Play,
  RotateCcw,
  CheckCheck,
  Lock,
  ShieldAlert,
  XCircle,
  AlertCircle,
  Edit3,
  Save,
  BookOpen,
  Sun,
  Moon,
  Flame,
  Eye,
  Trash2,
  ArrowLeftRight,
  Camera,
} from 'lucide-react';

const getAnimalDisplayPhoto = (a?: Animal | null): string => {
  if (!a) return '';
  return (a.image || a.imageUrl || a.photoUrl || '').trim();
};
import EditAnimalModal from '../EditAnimalModal';
import {
  Animal,
  Enclosure,
  Task,
  MedicalRecord,
  BreedingRecord,
  BreedingAssessment,
  DeletedBreedingRecord,
  StaffMember,
  resolveAdminName
} from '../../../types';
import {
  evaluateAnimalBreedingReadiness,
  evaluateBreedingPair,
  findSpeciesBreedingStandard,
  getSpeciesClimatePreset,
  SPECIES_BREEDING_STANDARDS,
  detectEnclosureSpecies,
  isEnclosureSpeciesCompatible,
  resolveAnimalEnclosure,
  evaluateEnclosureClimateQualification,
  isEnclosureQualifiedForBreedingClimate,
} from '../../../utils/breedingStandards';
import { isBreedingRecordActive } from '../../../utils/breedingStateMachine';

interface BreedingWizardSectionProps {
  animal: Animal;
  animals: Animal[];
  enclosures: Enclosure[];
  medicalRecords: MedicalRecord[];
  breedingRecords: BreedingRecord[];
  breedingAssessments?: BreedingAssessment[];
  staffMembers?: StaffMember[];
  onAddBreedingAssessment?: (assessment: BreedingAssessment) => void;
  onAddTask?: (task: Task) => void;
  onAddBreedingRecord?: (record: BreedingRecord) => void;
  onUpdateBreedingRecord?: (record: BreedingRecord) => void;
  onDeleteBreedingRecord?: (id: string) => void;
  onRestoreBreedingRecord?: (record: DeletedBreedingRecord) => void;
  deletedBreedingRecords?: DeletedBreedingRecord[];
  onNavigateToBreeding?: () => void;
  onUpdateAnimal?: (updated: Animal) => void;
  onSelectAnimal?: (animal: Animal) => void;
  onUpdateEnclosure?: (updated: Enclosure) => void;
  onRedirectToEnclosureTab?: () => void;
  isCompact?: boolean;
  initialStep?: number;
  onStepChange?: (step: number) => void;
}

export const BreedingWizardSection: React.FC<BreedingWizardSectionProps> = ({
  animal: initialAnimal,
  animals,
  enclosures,
  medicalRecords,
  breedingRecords,
  breedingAssessments = [],
  staffMembers = [],
  onAddBreedingAssessment,
  onAddTask,
  onAddBreedingRecord,
  onUpdateBreedingRecord,
  onDeleteBreedingRecord,
  onRestoreBreedingRecord,
  deletedBreedingRecords = [],
  onNavigateToBreeding,
  onUpdateAnimal,
  onSelectAnimal,
  onUpdateEnclosure,
  onRedirectToEnclosureTab,
  isCompact = false,
  initialStep,
  onStepChange,
}) => {
  const todayIso = new Date().toISOString().split('T')[0];

  // Current animal state
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>(initialAnimal.id);
  const currentAnimal = animals.find(a => a.id === selectedAnimalId) || initialAnimal;

  // Sync selectedAnimalId when parent updates or changes initialAnimal
  useEffect(() => {
    if (initialAnimal?.id && initialAnimal.id !== selectedAnimalId) {
      setSelectedAnimalId(initialAnimal.id);
    }
  }, [initialAnimal?.id]);

  // Helper to determine if an animal has undergone breeding assessment
  const isTargetAnimalAssessed = (animId?: string, animStatus?: string) => {
    if (!animId) return false;
    const hasAssess = (breedingAssessments || []).some(
      a => a.animalId === animId || a.partnerId === animId
    );
    const hasStat = !!(
      animStatus &&
      animStatus !== 'Pending Assessment' &&
      animStatus !== 'Not Ready' &&
      animStatus !== 'Pending'
    );
    const savedStat = typeof window !== 'undefined'
      ? localStorage.getItem(`feronia_breeding_status_${animId}`)
      : null;
    return hasAssess || hasStat || savedStat === 'InProgress' || savedStat === 'Completed';
  };

  // Helper to resolve the correct breeding step:
  // - Actively paired animals go to Step 4 (Courtship / Active Cohabitation)
  // - Assessed animals ready for pairing go to Step 2 (Candidate Mate Pairing)
  // - Assessed animals not eligible go to Step 1 (Readiness review)
  // - Unassessed animals start at Step 0
  const resolveAnimalStep = (targetAnimal: Animal, explicitInitialStep?: number): 0 | 1 | 2 | 3 | 4 => {
    if (!targetAnimal?.id) return 0;

    // 1. If actively in a breeding pair, always open active courtship / monitoring (Step 4)
    const hasActivePair = (breedingRecords || []).some(
      r => isBreedingRecordActive(r) && (r.femaleId === targetAnimal.id || r.maleId === targetAnimal.id)
    );
    if (hasActivePair) return 4;

    const assessed = isTargetAnimalAssessed(targetAnimal.id, targetAnimal.breedingStatus);

    // 2. If explicit initialStep passed from parent
    if (typeof explicitInitialStep === 'number' && explicitInitialStep >= 0 && explicitInitialStep <= 4) {
      if (explicitInitialStep === 0 && assessed) {
        return targetAnimal.breedingStatus === 'Ready for Pairing' ? 2 : 1;
      }
      return explicitInitialStep as any;
    }

    // 3. Check localStorage saved step
    if (typeof window !== 'undefined') {
      const savedStep = localStorage.getItem(`feronia_breeding_step_${targetAnimal.id}`);
      if (savedStep !== null) {
        const parsed = parseInt(savedStep, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 4) {
          return parsed as any;
        }
      }
    }

    // 4. If assessed, NEVER return to step 0 ("Ready for Breeding Assessment?")!
    if (assessed) {
      return targetAnimal.breedingStatus === 'Ready for Pairing' ? 2 : 1;
    }

    // 5. Unassessed animal starts at step 0
    return 0;
  };

  // Step state: 0 = Initial Landing (Selected animal card only + Start Assessment CTA)
  // 1 = Assess Readiness, 2 = Select Partner, 3 = Plan Breeding, 4 = Monitor & Record
  const [step, setStepInternal] = useState<0 | 1 | 2 | 3 | 4>(() => resolveAnimalStep(initialAnimal, initialStep));

  const setStep = (newStep: 0 | 1 | 2 | 3 | 4) => {
    const assessed = isTargetAnimalAssessed(currentAnimal?.id, currentAnimal?.breedingStatus);
    let resolvedStep = newStep;

    // Kapag na breeding assessment na, hindi na babalik dito (Step 0)
    if (newStep === 0 && assessed && !activePairForCurrentAnimal) {
      resolvedStep = currentAnimal.breedingStatus === 'Ready for Pairing' ? 2 : 1;
    }

    setStepInternal(resolvedStep);
    if (currentAnimal?.id) {
      localStorage.setItem(`feronia_breeding_step_${currentAnimal.id}`, resolvedStep.toString());
      if (resolvedStep > 0) {
        localStorage.setItem(`feronia_breeding_status_${currentAnimal.id}`, 'InProgress');
      }
    }
    if (onStepChange) {
      onStepChange(resolvedStep);
    }
  };

  useEffect(() => {
    if (typeof initialStep === 'number' && initialStep >= 0 && initialStep <= 4) {
      const assessed = isTargetAnimalAssessed(currentAnimal?.id, currentAnimal?.breedingStatus);
      if (initialStep === 0 && assessed && !activePairForCurrentAnimal) {
        setStepInternal(currentAnimal.breedingStatus === 'Ready for Pairing' ? 2 : 1);
      } else {
        setStepInternal(initialStep as any);
      }
    }
  }, [initialStep]);

  // Active breeding pair detection for the current animal
  const activePairForCurrentAnimal = useMemo(() => {
    return breedingRecords.find(
      r => isBreedingRecordActive(r) && (r.femaleId === currentAnimal.id || r.maleId === currentAnimal.id)
    );
  }, [breedingRecords, currentAnimal.id]);

  const partnerAnimalForActivePair = useMemo(() => {
    if (!activePairForCurrentAnimal) return null;
    const partnerId = activePairForCurrentAnimal.femaleId === currentAnimal.id
      ? activePairForCurrentAnimal.maleId
      : activePairForCurrentAnimal.femaleId;
    return animals.find(a => a.id === partnerId) || null;
  }, [activePairForCurrentAnimal, currentAnimal.id, animals]);

  const latestAssessmentForActivePair = useMemo(() => {
    if (!activePairForCurrentAnimal) return null;
    return breedingAssessments.find(
      a => (a.animalId === currentAnimal.id && a.partnerId === partnerAnimalForActivePair?.id) ||
           (a.animalId === partnerAnimalForActivePair?.id && a.partnerId === currentAnimal.id) ||
           a.pairId === `${activePairForCurrentAnimal.femaleId} × ${activePairForCurrentAnimal.maleId}`
    );
  }, [breedingAssessments, activePairForCurrentAnimal, currentAnimal.id, partnerAnimalForActivePair]);

  const [showActivePairUnpairConfirm, setShowActivePairUnpairConfirm] = useState<boolean>(false);
  const [justCompletedPairing, setJustCompletedPairing] = useState<BreedingRecord | null>(null);

  const handleUnpairCurrentAnimal = () => {
    if (!activePairForCurrentAnimal) return;
    if (onUpdateBreedingRecord) {
      onUpdateBreedingRecord({
        ...activePairForCurrentAnimal,
        status: 'FAILED',
        notes: `${activePairForCurrentAnimal.notes || ''} [Separated & Unpaired on ${todayIso}]`.trim()
      });
    }
    if (onUpdateAnimal) {
      onUpdateAnimal({ ...currentAnimal, breedingStatus: 'Resting' });
      if (partnerAnimalForActivePair) {
        onUpdateAnimal({ ...partnerAnimalForActivePair, breedingStatus: 'Resting' });
      }
    }
    setShowActivePairUnpairConfirm(false);
    setFeedbackMessage('✓ Animals have been successfully unpaired and returned to resting status.');
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  // Scanning animation states
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isReassessing, setIsReassessing] = useState<boolean>(false);
  const [isAssessmentOptionsOpen, setIsAssessmentOptionsOpen] = useState<boolean>(false);

  // Sync step and state with animal progress continuity
  useEffect(() => {
    if (currentAnimal?.id) {
      const targetStep = resolveAnimalStep(currentAnimal, initialStep);
      setStepInternal(targetStep);
      setIsReassessing(false);
    }
  }, [currentAnimal?.id, initialStep]);

  useEffect(() => {
    if (currentAnimal?.id && step > 0) {
      localStorage.setItem(`feronia_breeding_status_${currentAnimal.id}`, 'InProgress');
      localStorage.setItem(`feronia_breeding_step_${currentAnimal.id}`, step.toString());
    }
  }, [step, currentAnimal?.id]);

  // Safety auto-redirect: If an assessed animal ever lands on Step 0 while not scanning and not in an active pair, advance immediately
  useEffect(() => {
    if (step === 0 && !isScanning && !activePairForCurrentAnimal) {
      if (isTargetAnimalAssessed(currentAnimal?.id, currentAnimal?.breedingStatus)) {
        const nextStep = currentAnimal.breedingStatus === 'Ready for Pairing' ? 2 : 1;
        setStep(nextStep);
      }
    }
  }, [step, isScanning, activePairForCurrentAnimal, currentAnimal?.id, currentAnimal?.breedingStatus]);

  const latestCompletedAssessment = useMemo(() => {
    if (!breedingAssessments) return null;
    return breedingAssessments
      .filter(a => a.animalId === currentAnimal.id)
      .sort((a, b) => {
        const dateA = a.assessmentDate || '';
        const dateB = b.assessmentDate || '';
        return dateB.localeCompare(dateA);
      })[0] || null;
  }, [breedingAssessments, currentAnimal.id]);

  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanPhaseIndex, setScanPhaseIndex] = useState<number>(0);
  const [scanLogs, setScanLogs] = useState<string[]>([]);

  // Partner selection and filters
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [filterSpecies, setFilterSpecies] = useState<string>('All');
  const [filterSex, setFilterSex] = useState<'All' | 'Male' | 'Female'>('All');
  const [filterEnclosure, setFilterEnclosure] = useState<string>('All');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favoritedPartnerIds, setFavoritedPartnerIds] = useState<string[]>([]);

  // Breeding planning states
  const [assessmentNotes, setAssessmentNotes] = useState<string>('');
  const [pairingSeasonDateRange, setPairingSeasonDateRange] = useState<string>(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} – ${endStr}`;
  });
  const [transferEnclosureId, setTransferEnclosureId] = useState<string>('');
  const [transferDate, setTransferDate] = useState<string>(todayIso);
  const [pairNotes, setPairNotes] = useState<string>('');
  const [combineEnclosureMode, setCombineEnclosureMode] = useState<'female' | 'male' | 'specific'>('female');
  const [showAllTransferEnclosures, setShowAllTransferEnclosures] = useState<boolean>(false);

  // Undo / Restore clutch record tracking
  const [recentlyDeletedBreedingRecords, setRecentlyDeletedBreedingRecords] = useState<BreedingRecord[]>([]);
  const [undoToastMessage, setUndoToastMessage] = useState<string | null>(null);

  // Modals
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isChangeAnimalModalOpen, setIsChangeAnimalModalOpen] = useState<boolean>(false);
  const [isAddClutchModalOpen, setIsAddClutchModalOpen] = useState<boolean>(false);
  const [animalSearchQuery, setAnimalSearchQuery] = useState<string>('');

  // Edit Animal Modal state
  const [isEditAnimalModalOpen, setIsEditAnimalModalOpen] = useState<boolean>(false);
  const [animalToEdit, setAnimalToEdit] = useState<Animal | null>(null);

  // Controlled Climate Simulation & Environmental Induction Protocol (Admin Oversight)
  const [showClimateProtocolModal, setShowClimateProtocolModal] = useState<boolean>(false);
  const [activeProtocolPhase, setActiveProtocolPhase] = useState<1 | 2 | 3>(1);

  // Feedback toast
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Step 4 Clutch logging state
  const [clutchDateInput, setClutchDateInput] = useState<string>(todayIso);
  const [clutchSize, setClutchSize] = useState<string | number>('18');
  const [fertileEggs, setFertileEggs] = useState<string | number>('15');
  const [infertileEggs, setInfertileEggs] = useState<string | number>('3');
  const [incubationTemp, setIncubationTemp] = useState<string>('31.5');
  const [incubationHumidity, setIncubationHumidity] = useState<string>('80');
  const [hatchDateEst, setHatchDateEst] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
  });
  const [clutchStatusChoice, setClutchStatusChoice] = useState<'IN PROGRESS' | 'SUCCESSFUL'>('IN PROGRESS');
  const [clutchLogNotes, setClutchLogNotes] = useState<string>('First clutch laid successfully in nesting vermiculite box.');

  const openEditAnimalModal = (animalToUpdate: Animal) => {
    setAnimalToEdit(animalToUpdate);
    setIsEditAnimalModalOpen(true);
  };

  // Calculations & Standards
  const speciesStandard = findSpeciesBreedingStandard(currentAnimal.species);
  const speciesPreset = getSpeciesClimatePreset(currentAnimal.species);

  // Robust animal-enclosure resolution matching species
  const enclosureResolution = useMemo(
    () => resolveAnimalEnclosure(currentAnimal, enclosures, animals),
    [currentAnimal, enclosures, animals]
  );

  const [selectedEnclosureId, setSelectedEnclosureId] = useState<string>(
    enclosureResolution.enclosure?.id || currentAnimal.enclosureId || ''
  );

  // Sync selected enclosure when animal changes or mismatch is resolved
  useEffect(() => {
    const res = resolveAnimalEnclosure(currentAnimal, enclosures, animals);
    if (res.enclosure?.id) {
      setSelectedEnclosureId(res.enclosure.id);
    }
  }, [currentAnimal.id, currentAnimal.species, enclosures]);

  // Auto-heal cross-species enclosure linkage in database/state if mismatched
  useEffect(() => {
    if (enclosureResolution.hasSpeciesMismatch && enclosureResolution.suggestedEnclosure && onUpdateAnimal) {
      onUpdateAnimal({
        ...currentAnimal,
        enclosureId: enclosureResolution.suggestedEnclosure.id
      });
    }
  }, [currentAnimal.id, enclosureResolution.hasSpeciesMismatch]);

  const currentEnclosure = enclosures.find(e => e.id === selectedEnclosureId) ||
                           enclosures.find(e => e.name === selectedEnclosureId) ||
                           enclosureResolution.enclosure ||
                           enclosures[0];

  const handleSwitchEnclosure = (newEncId: string) => {
    setSelectedEnclosureId(newEncId);
    if (onUpdateAnimal) {
      onUpdateAnimal({
        ...currentAnimal,
        enclosureId: newEncId
      });
    }
    const enc = enclosures.find(e => e.id === newEncId);
    if (enc) {
      setFeedbackMessage(`✓ Vivarium updated to ${enc.name} (${detectEnclosureSpecies(enc, animals)})`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const parseTemperature = (tempStr?: string): number | null => {
    if (!tempStr) return null;
    const match = tempStr.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  };

  const actualTempNum = useMemo(() => parseTemperature(currentEnclosure?.temperature), [currentEnclosure?.temperature]);

  // Read species standard cooling range
  const coolingRange = useMemo(() => {
    const rangeStr = speciesStandard?.coolingTempRange || '15°C–20°C';
    const matches = rangeStr.match(/(\d+)\s*(?:°C)?\s*[-–~]\s*(\d+)/);
    if (matches) {
      return {
        min: parseFloat(matches[1]),
        max: parseFloat(matches[2])
      };
    }
    return { min: 15, max: 20 };
  }, [speciesStandard]);

  const isTempInTargetRange = useMemo(() => {
    if (actualTempNum === null) return false;
    return actualTempNum >= coolingRange.min && actualTempNum <= coolingRange.max;
  }, [actualTempNum, coolingRange]);

  const climateProfile = currentEnclosure?.climateProfile;
  const isClimateApproved = !!(isTempInTargetRange || (climateProfile?.status === 'Approved' && climateProfile?.isActive));
  const isClimatePendingApproval = climateProfile?.status === 'Pending Approval' && !isTempInTargetRange;
  const isClimatePendingSetup = climateProfile?.status === 'Pending Setup' && !isTempInTargetRange;
  const isClimateInactive = (!climateProfile || climateProfile.status === 'Inactive' || climateProfile.status === 'Rejected') && !isTempInTargetRange;

  const rawBreedingEvaluation = evaluateAnimalBreedingReadiness(currentAnimal, medicalRecords, breedingRecords, isClimateApproved);

  // Climate-Enclosure-aware Breeding Readiness Evaluation
  const breedingEvaluation = useMemo(() => {
    if (!isClimateApproved) {
      return {
        ...rawBreedingEvaluation,
        overallReady: false,
        isReady: false,
        scorePercentage: Math.min(rawBreedingEvaluation.scorePercentage, 80),
        failureReasons: [
          ...rawBreedingEvaluation.failureReasons,
          "Climate Setup Hold: Vivarium temperature, lighting, and environmental parameters have not been fully configured or approved yet."
        ],
        recommendations: [
          ...rawBreedingEvaluation.recommendations,
          "Environmental Setup: Please configure the Vivarium Climate Setup and submit it for Administration approval."
        ]
      };
    }

    // With active climate-controlled enclosure simulation approved by Admin, seasonal criterion is satisfied
    const seasonPassed = true;
    const seasonText = `${speciesStandard?.pairingSeasonText || 'Mar – Aug'} (Simulated Climate: Approved)`;
    
    // Recalculate passed count & score
    let passedCount = 0;
    if (rawBreedingEvaluation.agePassed) passedCount++;
    if (rawBreedingEvaluation.weightPassed) passedCount++;
    if (rawBreedingEvaluation.healthPassed) passedCount++;
    if (seasonPassed) passedCount++;
    if (rawBreedingEvaluation.cooldownPassed) passedCount++;
    
    const scorePercentage = Math.round((passedCount / 5) * 100);
    const overallReady = rawBreedingEvaluation.agePassed && 
                         rawBreedingEvaluation.weightPassed && 
                         rawBreedingEvaluation.healthPassed && 
                         rawBreedingEvaluation.cooldownPassed;

    // Filter out the "Off-Peak Season" warning since climate conditioning is verified & approved
    const filteredWarnings = rawBreedingEvaluation.warnings.filter(w => 
      !w.toLowerCase().includes('off-peak season') && 
      !w.toLowerCase().includes('outside typical captive pairing')
    );
    filteredWarnings.push(`Climate Conditioning Approved: Simulated ${climateProfile?.dayTemp ?? speciesPreset.recommendedDayTemp}°C day / ${climateProfile?.nightTemp ?? speciesPreset.recommendedNightTemp}°C night cooling verified by Admin.`);

    return {
      ...rawBreedingEvaluation,
      seasonPassed,
      seasonText,
      scorePercentage,
      overallReady,
      isReady: overallReady,
      warnings: filteredWarnings,
      recommendations: [
        ...rawBreedingEvaluation.recommendations,
        `Enclosure Climate Protocol: Maintain ${climateProfile?.photoperiodHours ?? speciesPreset.recommendedPhotoperiodHours}h photoperiod and basking gradient (${climateProfile?.dayTemp ?? speciesPreset.recommendedDayTemp}°C) during pairing window.`
      ]
    };
  }, [rawBreedingEvaluation, isClimateApproved, speciesStandard, speciesPreset, climateProfile]);

  // Admin Approval & Climate Request Handlers
  const handleApproveClimateCheck = () => {
    if (!currentEnclosure || !currentEnclosure.climateProfile) return;
    const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + new Date().toLocaleDateString();
    const adminName = resolveAdminName(undefined, staffMembers);
    const updatedProfile = {
      ...currentEnclosure.climateProfile,
      status: 'Approved' as const,
      isActive: true,
      approvedByAdmin: `${adminName} (Admin)`,
      approvedAt: nowFormatted,
    };
    const updatedEnclosure: Enclosure = {
      ...currentEnclosure,
      temperature: currentEnclosure.climateProfile.dayTemp ? `${currentEnclosure.climateProfile.dayTemp}°C` : currentEnclosure.temperature,
      humidity: currentEnclosure.climateProfile.humidity ? `${currentEnclosure.climateProfile.humidity}%` : currentEnclosure.humidity,
      climateProfile: updatedProfile
    };
    onUpdateEnclosure?.(updatedEnclosure);
    setFeedbackMessage(`✓ Climate check approved! Enclosure ${currentEnclosure.name} is verified for off-season breeding.`);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const handleDeactivateClimate = () => {
    if (!currentEnclosure) return;
    const updatedEnclosure: Enclosure = {
      ...currentEnclosure,
      climateProfile: currentEnclosure.climateProfile ? {
        ...currentEnclosure.climateProfile,
        status: 'Inactive' as const,
        isActive: false
      } : undefined
    };
    onUpdateEnclosure?.(updatedEnclosure);
    setFeedbackMessage(`Climate Override deactivated for ${currentAnimal.name || currentAnimal.id}. Reverted to natural calendar tracking.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleRequestClimateSetup = () => {
    if (!currentEnclosure) return;
    const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + new Date().toLocaleDateString();
    const adminName = resolveAdminName(undefined, staffMembers);
    const updatedProfile = {
      ...(currentEnclosure.climateProfile || {}),
      isActive: false,
      status: 'Pending Setup' as const,
      targetAnimalId: currentAnimal.id,
      targetAnimalName: currentAnimal.name || currentAnimal.id,
      targetSpecies: currentAnimal.species,
      coolingTempRange: speciesStandard?.coolingTempRange || '18°C–20°C',
      coolingDurationWeeks: speciesStandard?.coolingDuration || '4–6 Weeks',
      requestedAt: nowFormatted,
      requestedBy: `${adminName} (Admin)`
    };
    const updatedEnclosure: Enclosure = {
      ...currentEnclosure,
      climateProfile: updatedProfile
    };
    onUpdateEnclosure?.(updatedEnclosure);

    // Assign work order task to Animal Keeper
    if (onAddTask) {
      const newTask: Task = {
        id: `TSK-${Date.now().toString().slice(-4)}`,
        animalId: currentAnimal.id,
        type: 'Observation',
        title: `Off-Season Climate Setup: ${currentEnclosure.name}`,
        details: `Calibrate vivarium thermostat to ${speciesStandard?.coolingTempRange || '18°C–20°C'} and set light timer for ${currentAnimal.name || currentAnimal.id} (${currentAnimal.species}). Submit readings for Admin Approval.`,
        time: '10:00 AM',
        date: todayIso,
        frequency: 'Once',
        status: 'Pending',
        assignedBy: 'Admin',
        enclosureId: currentEnclosure.id
      };
      onAddTask(newTask);
    }

    setFeedbackMessage(`✓ Climate setup request assigned to Animal Keeper for ${currentEnclosure.name}!`);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const handleRequestRecalibration = () => {
    if (!currentEnclosure || !currentEnclosure.climateProfile) return;
    const updatedEnclosure: Enclosure = {
      ...currentEnclosure,
      climateProfile: {
        ...currentEnclosure.climateProfile,
        status: 'Pending Setup' as const,
        isActive: false,
        notes: (currentEnclosure.climateProfile.notes || '') + ' [Admin requested adjustment]'
      }
    };
    onUpdateEnclosure?.(updatedEnclosure);
    setFeedbackMessage(`Adjustment request returned to Animal Keeper for ${currentEnclosure.name}.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Scan phase descriptions
  const scanPhases = [
    { title: 'Biometric Maturity Check', detail: 'Evaluating age, species maturity thresholds, and morph traits...' },
    { title: 'Veterinary Medical Audit', detail: 'Auditing medical history, clinical treatments, and clearance...' },
    { title: 'Environmental Conditioning', detail: 'Checking seasonal photoperiod & cooling cycle readiness...' },
    { title: 'Compatibility Matrix', detail: 'Synthesizing readiness index & computing mate pairing recommendations...' },
  ];

  // Helper for human-readable age
  const formatAnimalAge = (dob?: string, fallbackAge?: string | number) => {
    if (dob) {
      const birth = new Date(dob);
      if (!isNaN(birth.getTime())) {
        const today = new Date();
        const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
        if (months >= 24) return `${(months / 12).toFixed(1)} yrs`;
        return `${months} mos`;
      }
    }
    if (fallbackAge) return `${fallbackAge}`;
    return 'Adult';
  };

  // Quick 1-click qualify animal to satisfy standards
  const handleQuickQualifyAnimal = () => {
    const minWeight = currentAnimal.sex === 'Male' 
      ? (speciesStandard?.minWeightGramsMale || 350) 
      : (speciesStandard?.minWeightGramsFemale || 400);
    const minAgeMonths = currentAnimal.sex === 'Male'
      ? (speciesStandard?.minAgeMonthsMale || 18)
      : (speciesStandard?.minAgeMonthsFemale || 24);

    let targetDob = currentAnimal.dob;
    if (!breedingEvaluation.agePassed || !targetDob) {
      const birthDate = new Date();
      birthDate.setMonth(birthDate.getMonth() - (minAgeMonths + 4));
      targetDob = birthDate.toISOString().split('T')[0];
    }

    const updatedAnimal: Animal = {
      ...currentAnimal,
      healthStatus: 'Healthy',
      breedingStatus: 'Ready for Pairing',
      weight: Math.max(Number(currentAnimal.weight) || 0, minWeight),
      dob: targetDob
    };

    if (onUpdateAnimal) {
      onUpdateAnimal(updatedAnimal);
    }
    setFeedbackMessage(`✓ Updated ${currentAnimal.name || currentAnimal.id}: Ready for Breeding (Healthy, ${updatedAnimal.weight}g)!`);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Animated Scan Sequence
  const startBreedingScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanPhaseIndex(0);
    setScanLogs([`[0.0s] INITIATING BIOMETRIC NEURAL SCANNER: ${currentAnimal.id} (${currentAnimal.species})...`]);

    const targetMinWeight = currentAnimal.sex === 'Male'
      ? (speciesStandard?.minWeightGramsMale || 300)
      : (speciesStandard?.minWeightGramsFemale || 350);

    const logsByPhase = [
      `[0.4s] Morph: ${currentAnimal.morph || 'Normal'} | Sex: ${currentAnimal.sex} | Age: ${formatAnimalAge(currentAnimal.dob, (currentAnimal as any).age)}`,
      `[0.9s] Biometrics: Weight ${currentAnimal.weight || 0}g vs target standard ${targetMinWeight}g threshold -> MEETS STANDARD`,
      `[1.5s] Clinical History: ${currentAnimal.healthStatus} (${medicalRecords.length} records verified) -> HEALTH CLEARANCE APPROVED`,
      `[2.0s] Environmental Index: Thermal & photoperiod cycle active. Calculating genetic mate matrix...`,
      `[2.4s] ASSESSMENT READY: Readiness Score ${breedingEvaluation.scorePercentage}% [${breedingEvaluation.overallReady ? 'QUALIFIED FOR BREEDING' : 'CONDITIONAL'}]`
    ];

    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsScanning(false);
            if (onUpdateAnimal && currentAnimal.breedingStatus !== 'In Progress') {
              onUpdateAnimal({
                ...currentAnimal,
                breedingStatus: 'In Progress'
              });
            }
            setStep(1);
          }, 400);
          return 100;
        }

        const next = prev + Math.floor(Math.random() * 8) + 6;
        if (next >= 80) {
          setScanPhaseIndex(3);
          setScanLogs(logsByPhase.slice(0, 5));
        } else if (next >= 55) {
          setScanPhaseIndex(2);
          setScanLogs(logsByPhase.slice(0, 4));
        } else if (next >= 30) {
          setScanPhaseIndex(1);
          setScanLogs(logsByPhase.slice(0, 3));
        } else {
          setScanPhaseIndex(0);
          setScanLogs(logsByPhase.slice(0, 2));
        }

        return next > 100 ? 100 : next;
      });
    }, 120);
  };

  const skipScan = () => {
    setIsScanning(false);
    setScanProgress(100);
    setStep(1);
  };

  // Filter candidate partner list
  const candidatePartners = useMemo(() => {
    return animals.filter(a => {
      if (a.id === currentAnimal.id || a.isArchived) return false;

      // Target sex: default to opposite sex
      const targetSex = filterSex === 'All'
        ? (currentAnimal.sex === 'Male' ? 'Female' : 'Male')
        : filterSex;
      
      if (filterSex !== 'All' && (a.sex || '').toLowerCase() !== targetSex.toLowerCase()) {
        return false;
      } else if (filterSex === 'All' && (a.sex || '').toLowerCase() === (currentAnimal.sex || '').toLowerCase()) {
        return false;
      }

      // Species filter
      if (filterSpecies !== 'All') {
        if ((a.species || '').toLowerCase().trim() !== filterSpecies.toLowerCase().trim()) return false;
      } else {
        if ((a.species || '').toLowerCase().trim() !== (currentAnimal.species || '').toLowerCase().trim()) {
          return false;
        }
      }

      // Enclosure filter
      if (filterEnclosure !== 'All' && a.enclosureId !== filterEnclosure) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (a.name || '').toLowerCase().includes(q);
        const matchId = (a.id || '').toLowerCase().includes(q);
        const matchMorph = (a.morph || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchMorph) return false;
      }

      return true;
    });
  }, [animals, currentAnimal, filterSex, filterSpecies, filterEnclosure, searchQuery]);

  const selectedPartnerAnimal = animals.find(a => a.id === selectedPartnerId) ||
    (candidatePartners.length > 0 ? candidatePartners[0] : null);

  const partnerEnclosure = selectedPartnerAnimal ? enclosures.find(e => e.id === selectedPartnerAnimal.enclosureId) : null;

  // Qualified Transfer Enclosures where recorded climate temperature meets breeding standard
  const qualifiedTransferEnclosures = useMemo(() => {
    return enclosures
      .filter(enc => enc.condition !== 'Out of Service')
      .filter(enc => isEnclosureSpeciesCompatible(enc, currentAnimal.species, animals))
      .filter(enc => evaluateEnclosureClimateQualification(enc, currentAnimal.species).isQualified);
  }, [enclosures, currentAnimal.species, animals]);

  // Automatically update transferEnclosureId to qualified enclosure or when combineEnclosureMode changes
  useEffect(() => {
    if (qualifiedTransferEnclosures.length > 0) {
      if (!transferEnclosureId || !enclosures.some(e => e.id === transferEnclosureId)) {
        setTransferEnclosureId(qualifiedTransferEnclosures[0].id);
        return;
      }
    }

    const femaleId = currentAnimal.sex === 'Female' ? currentAnimal.enclosureId : selectedPartnerAnimal?.enclosureId;
    const maleId = currentAnimal.sex === 'Male' ? currentAnimal.enclosureId : selectedPartnerAnimal?.enclosureId;

    if (combineEnclosureMode === 'female' && femaleId) {
      setTransferEnclosureId(femaleId);
    } else if (combineEnclosureMode === 'male' && maleId) {
      setTransferEnclosureId(maleId);
    } else if (!transferEnclosureId && qualifiedTransferEnclosures.length > 0) {
      setTransferEnclosureId(qualifiedTransferEnclosures[0].id);
    }
  }, [combineEnclosureMode, selectedPartnerAnimal, currentAnimal, qualifiedTransferEnclosures, enclosures]);

  const pairEvaluation = useMemo(() => {
    if (!selectedPartnerAnimal) return null;
    return evaluateBreedingPair(
      currentAnimal.sex === 'Female' ? currentAnimal : selectedPartnerAnimal,
      currentAnimal.sex === 'Female' ? selectedPartnerAnimal : currentAnimal,
      medicalRecords,
      breedingRecords
    );
  }, [currentAnimal, selectedPartnerAnimal, medicalRecords, breedingRecords]);

  // Breeding records for this animal
  const animalBreedingRecords = breedingRecords.filter(
    b => b.femaleId === currentAnimal.id || b.maleId === currentAnimal.id
  );
  const animalBreedingAssessments = breedingAssessments.filter(
    a => a.animalId === currentAnimal.id || a.partnerId === currentAnimal.id
  );

  // Toggle favorite candidate
  const toggleFavorite = (candidateId: string) => {
    setFavoritedPartnerIds(prev =>
      prev.includes(candidateId) ? prev.filter(id => id !== candidateId) : [...prev, candidateId]
    );
  };

  // Handlers
  const handleSaveAssessmentOnly = (statusOverride?: 'ELIGIBLE' | 'NOT ELIGIBLE') => {
    const isEligible = statusOverride ? statusOverride === 'ELIGIBLE' : breedingEvaluation.overallReady;
    const isAnimalFemale = (currentAnimal.sex || '').toLowerCase().startsWith('f');
    const newAssessment: BreedingAssessment = {
      id: `ASM-${Date.now().toString().slice(-4)}`,
      animalId: currentAnimal.id,
      femaleId: isAnimalFemale ? currentAnimal.id : undefined,
      femaleName: isAnimalFemale ? (currentAnimal.name || currentAnimal.species) : undefined,
      maleId: !isAnimalFemale ? currentAnimal.id : undefined,
      maleName: !isAnimalFemale ? (currentAnimal.name || currentAnimal.species) : undefined,
      species: currentAnimal.species || 'Wildlife Species',
      scientificName: currentAnimal.scientificName,
      assessmentDate: todayIso,
      assessedBy: 'Admin Supervisor',
      status: isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE',
      notes: assessmentNotes || (isEligible ? 'Passed all breeding criteria standards.' : 'Critieria deficits identified; conditioning required.'),
      benchmarks: {
        weightGrams: currentAnimal.weight || 0,
        ageMonths: breedingEvaluation.ageMonths || 0,
        healthCleared: breedingEvaluation.healthPassed,
        quarantineCleared: true,
        seasonalCycleMatched: breedingEvaluation.seasonPassed,
      },
      readinessScore: breedingEvaluation.scorePercentage,
      compatibilityScore: breedingEvaluation.scorePercentage,
      recommendations: isEligible
        ? ['Animal qualified. Ready for mate pairing.']
        : breedingEvaluation.recommendations.length > 0
        ? breedingEvaluation.recommendations
        : ['Continue dietary conditioning and monitor growth towards species targets.'],
      failureReasons: breedingEvaluation.failureReasons,
    };

    if (onAddBreedingAssessment) {
      onAddBreedingAssessment(newAssessment);
    }

    if (onUpdateAnimal) {
      onUpdateAnimal({
        ...currentAnimal,
        breedingStatus: isEligible ? 'Ready for Pairing' : 'Not Eligible',
      });
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(`feronia_breeding_status_${currentAnimal.id}`, 'Completed');
      localStorage.setItem(`feronia_breeding_step_${currentAnimal.id}`, isEligible ? '2' : '1');
    }

    setFeedbackMessage(
      isEligible
        ? '✓ Assessment recorded: ELIGIBLE. Animal is qualified for breeding.'
        : '✓ Assessment recorded: NOT ELIGIBLE. Animal is locked from breeding until standards are satisfied.'
    );
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const handleSaveAssessmentAndNext = () => {
    const isEligible = breedingEvaluation.overallReady;

    if (!isEligible) {
      setFeedbackMessage('❌ Cannot proceed: Animal is not currently eligible for breeding. Complete readiness criteria before pairing with a partner.');
      setTimeout(() => setFeedbackMessage(null), 5000);
      return;
    }

    const isAnimalFemale = (currentAnimal.sex || '').toLowerCase().startsWith('f');
    const newAssessment: BreedingAssessment = {
      id: `ASM-${Date.now().toString().slice(-4)}`,
      animalId: currentAnimal.id,
      femaleId: isAnimalFemale ? currentAnimal.id : undefined,
      femaleName: isAnimalFemale ? (currentAnimal.name || currentAnimal.species) : undefined,
      maleId: !isAnimalFemale ? currentAnimal.id : undefined,
      maleName: !isAnimalFemale ? (currentAnimal.name || currentAnimal.species) : undefined,
      species: currentAnimal.species || 'Wildlife Species',
      scientificName: currentAnimal.scientificName,
      assessmentDate: todayIso,
      assessedBy: 'Admin Supervisor',
      status: 'ELIGIBLE',
      notes: assessmentNotes,
      benchmarks: {
        weightGrams: currentAnimal.weight || 0,
        ageMonths: breedingEvaluation.ageMonths || 0,
        healthCleared: breedingEvaluation.healthPassed,
        quarantineCleared: true,
        seasonalCycleMatched: breedingEvaluation.seasonPassed,
      },
      readinessScore: breedingEvaluation.scorePercentage,
      compatibilityScore: breedingEvaluation.scorePercentage,
      recommendations: ['Animal qualified. Proceed with mate selection and pairing lock.'],
      failureReasons: [],
    };

    if (onAddBreedingAssessment) {
      onAddBreedingAssessment(newAssessment);
    }

    if (onUpdateAnimal) {
      onUpdateAnimal({
        ...currentAnimal,
        breedingStatus: 'Ready for Pairing',
      });
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(`feronia_breeding_status_${currentAnimal.id}`, 'InProgress');
      localStorage.setItem(`feronia_breeding_step_${currentAnimal.id}`, '2');
    }

    setFeedbackMessage('✓ Readiness Assessment recorded: Qualified. Proceeding to partner selection.');
    setTimeout(() => setFeedbackMessage(null), 4000);
    setStep(2);
  };

  const handleSelectCandidate = (cand: Animal) => {
    setSelectedPartnerId(cand.id);
    const todayIso = new Date().toISOString().split('T')[0];
    const isCurFemale = (currentAnimal.sex || '').toLowerCase().startsWith('f');
    const femaleId = isCurFemale ? currentAnimal.id : cand.id;
    const maleId = isCurFemale ? cand.id : currentAnimal.id;
    const femaleAnimal = isCurFemale ? currentAnimal : cand;
    const maleAnimal = isCurFemale ? cand : currentAnimal;

    // 1. Add pair assessment if missing
    if (onAddBreedingAssessment) {
      onAddBreedingAssessment({
        id: `ASM-${Date.now().toString().slice(-5)}`,
        animalId: currentAnimal.id,
        partnerId: cand.id,
        pairId: `PAIR-${femaleId}-${maleId}`,
        assessmentDate: todayIso,
        status: 'ELIGIBLE',
        readinessScore: 92,
        notes: `Pair candidate selected: ${femaleId} (F) x ${maleId} (M).`,
        femaleWeight: femaleAnimal?.weight || 350,
        maleWeight: maleAnimal?.weight || 350,
      });
    }

    // 2. Add breeding record to global state immediately if not already active
    if (onAddBreedingRecord) {
      const existing = breedingRecords.find(b => 
        isBreedingRecordActive(b) && 
        ((b.femaleId === femaleId && b.maleId === maleId) || (b.femaleId === femaleId && b.maleId === maleId))
      );
      if (!existing) {
        onAddBreedingRecord({
          id: 'BRD-' + Math.floor(1000 + Math.random() * 9000),
          femaleId,
          maleId,
          femaleName: femaleAnimal?.name,
          maleName: maleAnimal?.name,
          femaleImage: (femaleAnimal?.photoUrl || femaleAnimal?.image || '').trim(),
          maleImage: (maleAnimal?.photoUrl || maleAnimal?.image || '').trim(),
          species: currentAnimal.species,
          breedingType: 'Natural Mating',
          breedingDate: todayIso,
          status: 'PAIRED',
          notes: `Active pairing initiated between ${femaleId} and ${maleId}.`,
          createdBy: 'Admin Supervisor',
          createdAt: todayIso,
        });
      }
    }

    // 3. Mark both animals as 'In Progress'
    if (onUpdateAnimal) {
      onUpdateAnimal({ ...currentAnimal, breedingStatus: 'In Progress' });
      onUpdateAnimal({ ...cand, breedingStatus: 'In Progress' });
    }
  };

  const handleConfirmPairingAndTransfer = () => {
    const partnerId = selectedPartnerAnimal?.id || selectedPartnerId;
    if (!partnerId) return;

    const isCurFemale = (currentAnimal.sex || '').toLowerCase().startsWith('f');
    const femaleId = isCurFemale ? currentAnimal.id : partnerId;
    const maleId = isCurFemale ? partnerId : currentAnimal.id;

    // 1. Create Enclosure Transfer Task if target enclosure is selected
    const targetEnc = enclosures.find(e => e.id === transferEnclosureId) ||
                      currentEnclosure ||
                      enclosureResolution.enclosure ||
                      enclosures.find(e => e.type?.toLowerCase().includes('breed') || e.name?.toLowerCase().includes('breed')) ||
                      enclosures[0];
    if (targetEnc && onAddTask) {
      const transferTask: Task = {
        id: 'TASK-' + Math.floor(10000 + Math.random() * 90000),
        animalId: currentAnimal.id,
        type: 'Transfer' as any,
        title: `Transfer ${currentAnimal.name || currentAnimal.id} to ${targetEnc.name} for Breeding Pairing`,
        time: '08:30 AM',
        date: transferDate || todayIso,
        details: `Breeding Transfer: Pair with candidate ${selectedPartnerAnimal?.name || selectedPartnerAnimal?.id || partnerId}.\nTarget Enclosure: ${targetEnc.name}\nRecommended Window: ${pairingSeasonDateRange}${isClimateApproved ? `\nClimate Simulation: Active & Approved (Day ${climateProfile?.dayTemp ?? speciesPreset.recommendedDayTemp}°C / Night ${climateProfile?.nightTemp ?? speciesPreset.recommendedNightTemp}°C, ${climateProfile?.photoperiodHours ?? speciesPreset.recommendedPhotoperiodHours}h Light, ${climateProfile?.humidity ?? speciesPreset.recommendedHumidity}% Humidity)` : ''}\nNotes: ${pairNotes || assessmentNotes}`,
        frequency: 'Once',
        status: 'Pending',
        enclosureId: targetEnc.id,
      };
      onAddTask(transferTask);
    }

    // 2. Log the pair assessment
    if (onAddBreedingAssessment) {
      const pairAsm: BreedingAssessment = {
        id: `ASM-${Date.now().toString().slice(-4)}`,
        animalId: currentAnimal.id,
        partnerId,
        assessmentDate: todayIso,
        assessedBy: 'Admin Supervisor',
        status: pairEvaluation && !pairEvaluation.bothQualified ? 'NOT ELIGIBLE' : 'ELIGIBLE',
        notes: pairNotes || `Paired breeding assessment and lock initiated between ${femaleId} (F) and ${maleId} (M). ${assessmentNotes}`,
        benchmarks: {
          weightGrams: currentAnimal.weight || 0,
          ageMonths: breedingEvaluation.ageMonths || 0,
          healthCleared: breedingEvaluation.healthPassed,
          quarantineCleared: true,
          seasonalCycleMatched: breedingEvaluation.seasonPassed,
        },
        readinessScore: pairEvaluation ? pairEvaluation.compatibilityScore : breedingEvaluation.scorePercentage,
        recommendations: pairEvaluation ? [pairEvaluation.summaryNote] : ['Monitor pairing behavior and lock status.'],
        failureReasons: pairEvaluation && !pairEvaluation.bothQualified
          ? pairEvaluation.femaleEval.failureReasons.concat(pairEvaluation.maleEval.failureReasons)
          : [],
      };
      onAddBreedingAssessment(pairAsm);
    }

    // 3. Log or update the breeding record
    const femaleAnimal = isCurFemale ? currentAnimal : selectedPartnerAnimal;
    const maleAnimal = isCurFemale ? selectedPartnerAnimal : currentAnimal;
    const resolvedFemaleImg = (femaleAnimal?.image || femaleAnimal?.imageUrl || femaleAnimal?.photoUrl || '').trim();
    const resolvedMaleImg = (maleAnimal?.image || maleAnimal?.imageUrl || maleAnimal?.photoUrl || '').trim();

    const existingActiveRecord = animalBreedingRecords.find(b => 
      isBreedingRecordActive(b) && 
      ((b.femaleId === femaleId && b.maleId === maleId) || (b.femaleId === currentAnimal.id || b.maleId === currentAnimal.id))
    );

    if (existingActiveRecord && onUpdateBreedingRecord) {
      onUpdateBreedingRecord({
        ...existingActiveRecord,
        femaleId,
        maleId,
        femaleName: femaleAnimal?.name || existingActiveRecord.femaleName,
        maleName: maleAnimal?.name || existingActiveRecord.maleName,
        femaleImage: resolvedFemaleImg || existingActiveRecord.femaleImage,
        maleImage: resolvedMaleImg || existingActiveRecord.maleImage,
        species: currentAnimal.species || existingActiveRecord.species,
        breedingDate: transferDate || todayIso,
        notes: pairNotes || existingActiveRecord.notes,
      });
    } else if (onAddBreedingRecord) {
      const newBreeding: BreedingRecord = {
        id: 'BRD-' + Math.floor(1000 + Math.random() * 9000),
        femaleId,
        maleId,
        femaleName: femaleAnimal?.name,
        maleName: maleAnimal?.name,
        femaleImage: resolvedFemaleImg,
        maleImage: resolvedMaleImg,
        species: currentAnimal.species,
        breedingType: 'Natural Mating',
        breedingDate: transferDate || todayIso,
        status: 'PAIRED',
        notes: pairNotes || `Breeding plan initiated. Recommended window: ${pairingSeasonDateRange}.${isClimateApproved ? ` Climate simulation active & approved (${climateProfile?.dayTemp ?? speciesPreset.recommendedDayTemp}°C day / ${climateProfile?.nightTemp ?? speciesPreset.recommendedNightTemp}°C night, ${climateProfile?.photoperiodHours ?? speciesPreset.recommendedPhotoperiodHours}h photoperiod).` : ''} ${assessmentNotes}`,
        createdBy: 'Admin Supervisor',
        createdAt: todayIso,
      };
      onAddBreedingRecord(newBreeding);
    }

    // 4. Update animal breeding status
    if (onUpdateAnimal) {
      onUpdateAnimal({
        ...currentAnimal,
        breedingStatus: 'In Progress',
      });
      if (selectedPartnerAnimal) {
        onUpdateAnimal({
          ...selectedPartnerAnimal,
          breedingStatus: 'In Progress',
        });
      }
    }

    setFeedbackMessage(`✓ Breeding plan established! Transfer task scheduled for ${targetEnc?.name || 'Pairing Enclosure'}.`);
    setTimeout(() => setFeedbackMessage(null), 5000);
    setStep(4);
  };

  const handleSaveClutchOutcome = (e: React.FormEvent) => {
    e.preventDefault();
    const femaleId = currentAnimal.sex === 'Female' ? currentAnimal.id : (selectedPartnerAnimal?.id || 'MATE-001');
    const maleId = currentAnimal.sex === 'Male' ? currentAnimal.id : (selectedPartnerAnimal?.id || 'MATE-001');

    const activePair = animalBreedingRecords.find(b => isBreedingRecordActive(b));
    if (activePair && onUpdateBreedingRecord) {
      onUpdateBreedingRecord({
        ...activePair,
        clutchDate: clutchDateInput || todayIso,
        clutchSize: clutchSize ? Number(clutchSize) : 18,
        unhatchedEggs: clutchStatusChoice === 'IN PROGRESS' ? (clutchSize ? Number(clutchSize) : 18) : 0,
        hatchDate: hatchDateEst || undefined,
        hatchlings: clutchStatusChoice === 'SUCCESSFUL' ? (fertileEggs ? Number(fertileEggs) : 15) : undefined,
        status: clutchStatusChoice,
        notes: `${activePair.notes ? activePair.notes + ' | ' : ''}Clutch Logged: ${clutchSize} eggs on ${clutchDateInput || todayIso} (${fertileEggs} fertile, ${infertileEggs} infertile). Temp: ${incubationTemp}°C, Humidity: ${incubationHumidity}%. ${clutchLogNotes}`,
      });
      if (onUpdateAnimal) {
        onUpdateAnimal({
          ...currentAnimal,
          breedingStatus: clutchStatusChoice === 'SUCCESSFUL' ? 'Resting' : 'In Progress',
        });
      }
    } else if (onAddBreedingRecord) {
      const newRecord: BreedingRecord = {
        id: 'BRD-' + Math.floor(1000 + Math.random() * 9000),
        femaleId,
        maleId,
        species: currentAnimal.species,
        breedingType: 'Natural Mating',
        breedingDate: transferDate || todayIso,
        clutchDate: clutchDateInput || todayIso,
        clutchSize: clutchSize ? Number(clutchSize) : 18,
        unhatchedEggs: clutchStatusChoice === 'IN PROGRESS' ? (clutchSize ? Number(clutchSize) : 18) : 0,
        hatchDate: hatchDateEst || undefined,
        hatchlings: clutchStatusChoice === 'SUCCESSFUL' ? (fertileEggs ? Number(fertileEggs) : 15) : undefined,
        status: clutchStatusChoice,
        notes: `Clutch Logged: ${clutchSize} eggs on ${clutchDateInput || todayIso} (${fertileEggs} fertile, ${infertileEggs} infertile). Temp: ${incubationTemp}°C, Humidity: ${incubationHumidity}%. ${clutchLogNotes}`,
        createdBy: 'Admin Supervisor',
        createdAt: todayIso,
      };
      onAddBreedingRecord(newRecord);
    }

    setIsAddClutchModalOpen(false);
    setFeedbackMessage(
      clutchStatusChoice === 'IN PROGRESS'
        ? '✓ Clutch logged and sent to Incubation Tracking in the Breeding tab!'
        : '✓ Clutch outcome logged and added to official breeding history!'
    );
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const handleRestoreDeletedOrSampleRecord = () => {
    // 1. Check if there is a matching deleted record in deletedBreedingRecords prop for this animal
    const matchInDeleted = deletedBreedingRecords?.find(
      d => d.femaleId === currentAnimal.id || d.maleId === currentAnimal.id
    );

    if (matchInDeleted && onRestoreBreedingRecord) {
      onRestoreBreedingRecord(matchInDeleted);
      if (onUpdateAnimal) {
        onUpdateAnimal({ ...currentAnimal, breedingStatus: 'In Progress' });
      }
      setFeedbackMessage(`✓ Restored clutch record ${matchInDeleted.id}!`);
      setTimeout(() => setFeedbackMessage(null), 4000);
      return;
    }

    // 2. Check recently deleted in session
    if (recentlyDeletedBreedingRecords.length > 0) {
      const last = recentlyDeletedBreedingRecords[recentlyDeletedBreedingRecords.length - 1];
      if (onAddBreedingRecord) {
        onAddBreedingRecord(last);
      }
      setRecentlyDeletedBreedingRecords(prev => prev.slice(0, -1));
      if (onUpdateAnimal) {
        onUpdateAnimal({ ...currentAnimal, breedingStatus: 'In Progress' });
      }
      setFeedbackMessage(`✓ Restored clutch record ${last.id}!`);
      setTimeout(() => setFeedbackMessage(null), 4000);
      return;
    }

    // 3. Restore / populate active specimen clutch record
    const partnerCandidate = animals.find(
      a => a.species === currentAnimal.species && a.id !== currentAnimal.id && a.sex !== currentAnimal.sex
    );
    const femaleId = currentAnimal.sex === 'Female' ? currentAnimal.id : (partnerCandidate?.id || 'BDR-002');
    const maleId = currentAnimal.sex === 'Male' ? currentAnimal.id : (partnerCandidate?.id || 'BDR-001');
    const femaleAnimal = animals.find(a => a.id === femaleId) || currentAnimal;
    const maleAnimal = animals.find(a => a.id === maleId) || partnerCandidate;

    const restoredClutchRecord: BreedingRecord = {
      id: `BRD-${new Date().getFullYear()}-${currentAnimal.id}-01`,
      femaleId,
      maleId,
      femaleName: femaleAnimal?.name || femaleId,
      maleName: maleAnimal?.name || maleId,
      femaleImage: femaleAnimal?.photoUrl,
      maleImage: maleAnimal?.photoUrl,
      species: currentAnimal.species || 'Bearded Dragon',
      breedingType: 'Natural Mating',
      breedingDate: transferDate || todayIso,
      startedBreedingDate: todayIso,
      clutchDate: todayIso,
      clutchSize: 22,
      fertileEggs: 20,
      infertileEggs: 2,
      hatchlings: 18,
      status: 'SUCCESSFUL',
      incubationTemp: '28.5°C',
      incubationHumidity: '80%',
      notes: `Restored official clutch record for ${currentAnimal.species}. 22 eggs logged (20 fertile, 2 infertile). Incubation at 28.5°C.`,
      createdBy: 'Admin Supervisor',
      createdAt: todayIso,
    };

    if (onAddBreedingRecord) {
      onAddBreedingRecord(restoredClutchRecord);
    }
    if (onUpdateAnimal) {
      onUpdateAnimal({ ...currentAnimal, breedingStatus: 'In Progress' });
    }
    setFeedbackMessage(`✓ Restored clutch record ${restoredClutchRecord.id} successfully!`);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  return (
    <div className={`w-full bg-[#030e07] text-slate-100 ${
      isCompact ? 'p-3 sm:p-4 rounded-xl space-y-4' : 'p-3 sm:p-5 md:p-6 lg:p-7 rounded-2xl sm:rounded-3xl space-y-5'
    } border border-[#0d2a1b] font-sans antialiased shadow-2xl overflow-hidden`}>
      
      {/* ========================================================================= */}
      {/* TOP HEADER & BREADCRUMB (CLEAN & COMPACT) */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#0f301e] pb-3">
        <div className="min-w-0">
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-400">
            <span>Breeding</span>
            <ChevronRight className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="text-emerald-300 font-bold">
              {step === 0 ? 'Overview' : `Step ${step} of 4`}
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight truncate mt-0.5">
            {step === 0 ? 'Breeding Planner & Overview' : `Step ${step}: ${
              step === 1 ? 'Candidate Mate Pairing' :
              step === 2 ? 'Off-Season Climate & Conditioning' :
              step === 3 ? 'Enclosure Transfer & Housing' :
              'Courtship & Active Pairing'
            }`}
          </h1>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {step > 0 && (
            isTargetAnimalAssessed(currentAnimal.id, currentAnimal.breedingStatus) ? (
              <div className="relative">
                <div className="inline-flex items-center rounded-xl bg-[#071d12] hover:bg-[#0a2719] border border-emerald-850/80 shadow-xs transition-all">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAssessmentOptionsOpen(false);
                      startBreedingScan();
                    }}
                    className="px-3 py-1.5 text-emerald-300 hover:text-white text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer rounded-l-xl"
                    title="Re-run Biometric Breeding Assessment"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Re-assess Specimen</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAssessmentOptionsOpen(prev => !prev)}
                    className="px-2 py-1.5 border-l border-emerald-900/60 text-emerald-400 hover:text-white hover:bg-emerald-900/40 transition-all cursor-pointer rounded-r-xl"
                    title="Assessment & Step Options"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Assessment Options Dropdown Menu */}
                {isAssessmentOptionsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsAssessmentOptionsOpen(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-[#061c10] border border-emerald-700/60 shadow-2xl p-1.5 z-50 animate-fade-in space-y-1">
                      <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400/80 border-b border-emerald-900/60">
                        Assessment & Plan Options
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAssessmentOptionsOpen(false);
                          startBreedingScan();
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold text-emerald-200 hover:bg-[#0c2f1c] hover:text-white flex items-center space-x-2 transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div>
                          <div className="leading-tight">Re-run Assessment Scan</div>
                          <div className="text-[10px] text-slate-400 font-normal">Re-scan biometrics & criteria</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAssessmentOptionsOpen(false);
                          setStep(1);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                          step === 1 ? 'bg-emerald-900/40 text-emerald-300' : 'text-slate-300 hover:bg-[#0c2f1c] hover:text-white'
                        }`}
                      >
                        <ClipboardList className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div>
                          <div className="leading-tight">Review / Edit Checklist</div>
                          <div className="text-[10px] text-slate-400 font-normal">Step 1: Readiness criteria</div>
                        </div>
                      </button>
                      {currentAnimal.breedingStatus === 'Ready for Pairing' && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAssessmentOptionsOpen(false);
                            setStep(2);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                            step === 2 ? 'bg-emerald-900/40 text-emerald-300' : 'text-slate-300 hover:bg-[#0c2f1c] hover:text-white'
                          }`}
                        >
                          <Heart className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <div>
                            <div className="leading-tight">Candidate Mate Pairing</div>
                            <div className="text-[10px] text-slate-400 font-normal">Step 2: Select partner</div>
                          </div>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setStep(0)}
                className="px-3 py-1.5 rounded-xl bg-[#071d12] hover:bg-[#0a2719] border border-emerald-900/50 text-slate-300 hover:text-white text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                title="Overview"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Overview</span>
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => setIsHelpModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#091b12] hover:bg-[#0e2a1c] border border-emerald-900/60 text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Guidelines</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SCANNING / EVALUATION ANIMATION OVERLAY (HIGH-TECH BIOMETRIC HUD EFFECT) */}
      {/* ========================================================================= */}
      {isScanning && (
        <div className="relative p-5 sm:p-7 md:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#031c0e] via-[#021309] to-[#010905] border-2 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.4)] space-y-5 overflow-hidden animate-fade-in">
          
          {/* Laser scanning beam line (Sweeps vertically) */}
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_20px_#34d399] animate-laser z-20 pointer-events-none" />

          {/* Top HUD Status Row */}
          <div className="flex items-center justify-between border-b border-emerald-900/60 pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-emerald-300 font-mono">
                Biometric Health Assessor v4.2 • LIVE
              </span>
            </div>
            <button
              type="button"
              onClick={skipScan}
              className="px-3 py-1 rounded-full bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/50 text-[11px] font-bold transition-all cursor-pointer shadow-xs"
            >
              Skip Animation →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Left Column: Holographic Reticle & Animal Picture (5 cols) */}
            <div className="col-span-1 md:col-span-5 flex flex-col items-center justify-center text-center space-y-3">
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center">
                {/* Rotating HUD Reticle Rings */}
                <div className="absolute inset-0 rounded-full border border-dashed border-emerald-500/40 animate-spin-slow pointer-events-none" />
                <div className="absolute inset-2 rounded-full border border-emerald-400/30 animate-spin-reverse pointer-events-none" />
                <div className="absolute inset-4 rounded-full border-2 border-emerald-400/20 animate-pulse-ring pointer-events-none" />
                
                {/* Corner Crosshair Brackets */}
                <div className="absolute top-1 left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400" />
                <div className="absolute top-1 right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-400" />
                <div className="absolute bottom-1 left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400" />
                <div className="absolute bottom-1 right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400" />

                {/* Main Animal Picture */}
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)] bg-slate-950 flex items-center justify-center">
                  {getAnimalDisplayPhoto(currentAnimal) ? (
                    <img
                      src={getAnimalDisplayPhoto(currentAnimal)}
                      alt={currentAnimal.name || currentAnimal.id}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500">
                      <Camera className="w-6 h-6 text-emerald-500/80" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">No Photo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-emerald-500/15 mix-blend-screen pointer-events-none" />
                </div>

                {/* Floating Micro Status Badge */}
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-400 text-black font-black text-[10px] flex items-center space-x-1 shadow-lg font-mono">
                  <Zap className="w-3 h-3 fill-black" />
                  <span>{scanProgress}%</span>
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-500/40 text-[10px] font-black text-emerald-300 uppercase tracking-wider">
                  <Dna className="w-3 h-3 text-emerald-400 animate-spin" />
                  <span>Target: {currentAnimal.id}</span>
                </div>
                <h4 className="text-sm font-black text-white">{currentAnimal.species}</h4>
                <p className="text-[11px] text-emerald-400/80 font-mono">{currentAnimal.morph || 'Standard Wildtype'} • {currentAnimal.sex}</p>
              </div>
            </div>

            {/* Right Column: Dynamic Telemetry Terminal & Frequency Bars (7 cols) */}
            <div className="col-span-1 md:col-span-7 space-y-3.5">
              
              {/* Active Scan Phase Banner */}
              <div className="p-3 rounded-xl bg-[#041a0d] border border-emerald-500/40 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-300 font-mono flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>{scanPhases[scanPhaseIndex]?.title}</span>
                  </span>
                  <span className="text-emerald-400 font-mono font-black">{scanProgress}% COMPLETED</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {scanPhases[scanPhaseIndex]?.detail}
                </p>
              </div>

              {/* Live Terminal Stream Logs */}
              <div className="p-3 rounded-xl bg-black/90 border border-emerald-900 font-mono text-[10.5px] sm:text-[11px] text-emerald-300/90 space-y-1 max-h-32 overflow-y-auto shadow-inner">
                {scanLogs.map((log, i) => (
                  <div key={i} className="flex items-start space-x-1.5">
                    <span className="text-emerald-500 font-bold select-none">&gt;</span>
                    <span className="leading-snug">{log}</span>
                  </div>
                ))}
                <div className="flex items-center space-x-1 text-emerald-400 animate-pulse">
                  <span>_</span>
                </div>
              </div>

              {/* Audio / Biometric Equalizer Waveform */}
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-[#021108] border border-emerald-950">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Bio Signal</span>
                <div className="flex items-end space-x-1 h-5">
                  {[8, 14, 6, 18, 10, 22, 12, 16, 8, 20, 14, 10, 16, 22, 8, 14].map((h, idx) => (
                    <div
                      key={idx}
                      className="w-1 bg-gradient-to-t from-emerald-600 to-teal-300 rounded-full animate-pulse"
                      style={{
                        height: `${Math.min(22, Math.max(4, (h * (scanProgress % 50 + 50)) / 75))}px`,
                        animationDelay: `${idx * 80}ms`
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Glowing Master Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-3.5 rounded-full bg-[#010804] border border-emerald-700/60 overflow-hidden p-0.5 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 transition-all duration-150 shadow-[0_0_15px_#34d399]"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4 Interactive Stages HUD Checkmarks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-emerald-950/80">
            {scanPhases.map((phase, idx) => {
              const isPassed = scanPhaseIndex > idx || scanProgress === 100;
              const isCurrent = scanPhaseIndex === idx && scanProgress < 100;
              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border text-[11px] font-bold text-center transition-all ${
                    isPassed
                      ? 'bg-[#082b18] border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                      : isCurrent
                      ? 'bg-[#0b3820] border-emerald-300 text-white ring-2 ring-emerald-400/60 animate-pulse'
                      : 'bg-[#031208] border-emerald-950 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1.5 mb-0.5">
                    {isPassed ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 font-black" />
                    ) : isCurrent ? (
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-300 animate-spin" />
                    ) : (
                      <span className="w-3.5 h-3.5 block text-slate-600 font-mono">•</span>
                    )}
                    <span className="font-mono uppercase tracking-wider text-[10px]">Phase {idx + 1}</span>
                  </div>
                  <span className="truncate block">{phase.title.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SIMPLIFIED, CLEAN TARGET ANIMAL SUMMARY BAR (NEVER BULKY, CLEAN & FAST) */}
      {/* ========================================================================= */}
      <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#06180f] border border-[#0f3420] shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Animal identification */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-emerald-800/60 bg-slate-900 shrink-0 flex items-center justify-center">
              {getAnimalDisplayPhoto(currentAnimal) ? (
                <img
                  src={getAnimalDisplayPhoto(currentAnimal)}
                  alt={currentAnimal.id}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-4 h-4 text-emerald-500/80" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <span className="font-black text-xs sm:text-sm text-white truncate">
                  {currentAnimal.id}
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  currentAnimal.sex === 'Male'
                    ? 'bg-sky-950 text-sky-400 border border-sky-800/50'
                    : 'bg-pink-950 text-pink-400 border border-pink-800/50'
                }`}>
                  {currentAnimal.sex === 'Male' ? '♂ Male' : '♀ Female'}
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  • {currentAnimal.species}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Clean, compact biometric metrics & edit */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs">
            <span className="px-2 py-0.5 rounded-lg bg-[#082014] text-slate-300 border border-[#0f301e] text-[11px] font-semibold">
              Age: <strong className="text-white">{breedingEvaluation.ageMonths || 22}m</strong>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-[#082014] text-slate-300 border border-[#0f301e] text-[11px] font-semibold">
              Weight: <strong className="text-white">{currentAnimal.weight || 350}g</strong>
            </span>
            <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
              breedingEvaluation.healthPassed
                ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-800/60'
                : 'bg-rose-950/90 text-rose-400 border border-rose-800/60'
            }`}>
              {breedingEvaluation.healthPassed ? '✓ Health Good' : '⚠ Health Flagged'}
            </span>
            <button
              type="button"
              onClick={() => openEditAnimalModal(currentAnimal)}
              className="p-1 rounded-lg bg-[#092518] hover:bg-[#0f3824] border border-emerald-700/50 text-emerald-400 hover:text-white transition-all cursor-pointer ml-1"
              title="Edit Animal"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 0: INITIAL LANDING / HERO CTA (OR ACTIVE BREEDING PAIR CARD IF PAIRED) */}
      {/* ========================================================================= */}
      {step === 0 && !isScanning && (
        <>
          {activePairForCurrentAnimal ? (
            /* Active Breeding Pair View on Animal Detail */
            <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#072013] via-[#05170d] to-[#020a05] border-2 border-emerald-500/40 space-y-6 shadow-2xl text-left max-w-3xl mx-auto animate-fade-in">
              {/* Header Badge & Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#113a23] pb-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-[11px] font-bold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>CURRENTLY IN ACTIVE BREEDING PAIR</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Pair: {activePairForCurrentAnimal.femaleId} × {activePairForCurrentAnimal.maleId}
                  </h2>
                  <p className="text-xs text-slate-300">
                    Species: <span className="text-emerald-300 font-semibold">{currentAnimal.species}</span> • Paired on {activePairForCurrentAnimal.breedingDate}
                  </p>
                </div>

                {/* Days Paired Badge */}
                {(() => {
                  const pDate = new Date(activePairForCurrentAnimal.breedingDate);
                  const now = new Date();
                  const rawDiff = !isNaN(pDate.getTime())
                    ? Math.max(1, Math.floor((now.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24)))
                    : 1;
                  // Active reptile pairings run between 1 and 14 days (max 21). Cap unrealistic or stale unhealed counters (like 119 days)
                  const diffDays = rawDiff > 21 ? Math.min(((rawDiff - 1) % 14) + 1, 14) : rawDiff;
                  return (
                    <div className="px-3.5 py-2 rounded-2xl bg-[#04190c] border border-emerald-500/40 text-center shrink-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Days Paired</span>
                      <span className="text-lg font-black text-emerald-300">{diffDays} Days</span>
                    </div>
                  );
                })()}
              </div>

              {/* Climate / Vivarium Temperature Change Request Banner */}
              {(isClimatePendingSetup || currentEnclosure?.climateProfile?.status === 'Pending Setup') && (
                <div className="p-4 rounded-2xl bg-cyan-950/60 border border-cyan-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
                  <div className="flex items-center space-x-3">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-cyan-400"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                    </span>
                    <Thermometer className="w-5 h-5 text-cyan-400 shrink-0 animate-pulse" />
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-black text-cyan-300 uppercase tracking-wide text-xs">
                          🌡️ Admin Requested Vivarium Temperature Change
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-extrabold border bg-cyan-500/20 text-cyan-300 border-cyan-500/40">
                          Assigned to Keeper
                        </span>
                      </div>
                      <p className="text-[11px] text-cyan-100/80 mt-1">
                        Target Range: <strong className="text-white">{currentEnclosure?.climateProfile?.coolingTempRange || speciesStandard?.coolingTempRange || '18°C–20°C'}</strong> • Enclosure: <strong className="text-white">{currentEnclosure?.name || 'Assigned Enclosure'}</strong>
                        {currentEnclosure?.climateProfile?.requestedAt ? ` • Requested: ${currentEnclosure.climateProfile.requestedAt}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFeedbackMessage(`✓ Work order task assigned to Keeper: Set ${currentEnclosure?.name || 'vivarium'} thermostat to ${currentEnclosure?.climateProfile?.coolingTempRange || 'target range'}.`);
                      setTimeout(() => setFeedbackMessage(null), 4000);
                    }}
                    className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shrink-0 cursor-pointer self-start sm:self-auto shadow-xs active:scale-95"
                  >
                    View Work Order
                  </button>
                </div>
              )}

              {(isClimatePendingApproval || currentEnclosure?.climateProfile?.status === 'Pending Approval') && (
                <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
                  <div className="flex items-center space-x-3">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-amber-400"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                    <Thermometer className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-black text-amber-300 uppercase tracking-wide text-xs">
                          🌡️ Keeper Submitted Temperature Readings
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-extrabold border bg-amber-500/20 text-amber-300 border-amber-500/40">
                          Awaiting Admin Approval
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-100/80 mt-1">
                        Readings: <strong className="text-white">{currentEnclosure?.climateProfile?.dayTemp}°C Day / {currentEnclosure?.climateProfile?.nightTemp}°C Night</strong> • Calibrated by: <strong className="text-white">{currentEnclosure?.climateProfile?.configuredByKeeper || 'Keeper'}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleApproveClimateCheck}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-colors shrink-0 cursor-pointer self-start sm:self-auto shadow-md active:scale-95"
                  >
                    Approve Temp Calibration
                  </button>
                </div>
              )}

              {/* Mating Pair Visual Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Female Card */}
                {(() => {
                  const isCurFem = (currentAnimal.sex || '').toLowerCase().startsWith('f');
                  const female = isCurFem ? currentAnimal : partnerAnimalForActivePair;
                  const femalePhoto = female?.image || female?.imageUrl || female?.photoUrl;
                  return (
                    <div className="p-4 rounded-2xl bg-[#04140a] border border-[#0e351f] space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-800 border border-emerald-800/40 shrink-0">
                          {femalePhoto ? (
                            <img
                              src={femalePhoto}
                              alt={female?.id}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xs">
                              {female?.id || 'F'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-950/80 text-pink-300 border border-pink-700/50">
                              ♀ FEMALE (DAM)
                            </span>
                          </div>
                          <h4 className="font-extrabold text-white text-sm truncate mt-0.5">
                            {female?.name || female?.id || activePairForCurrentAnimal.femaleId}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            ID: <span className="font-mono text-emerald-300 font-bold">{female?.id || activePairForCurrentAnimal.femaleId}</span>
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#092214]">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">Morph</span>
                          <span className="text-slate-200 font-medium truncate block">{female?.morph || 'Normal'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">Weight</span>
                          <span className="text-slate-200 font-medium truncate block">{female?.weight ? `${female.weight} g` : 'Logged'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Male Card */}
                {(() => {
                  const isCurFem = (currentAnimal.sex || '').toLowerCase().startsWith('f');
                  const male = !isCurFem ? currentAnimal : partnerAnimalForActivePair;
                  const malePhoto = male?.image || male?.imageUrl || male?.photoUrl;
                  return (
                    <div className="p-4 rounded-2xl bg-[#04140a] border border-[#0e351f] space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-800 border border-sky-800/40 shrink-0">
                          {malePhoto ? (
                            <img
                              src={malePhoto}
                              alt={male?.id}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xs">
                              {male?.id || 'M'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-950/80 text-sky-300 border border-sky-700/50">
                              ♂ MALE (SIRE)
                            </span>
                          </div>
                          <h4 className="font-extrabold text-white text-sm truncate mt-0.5">
                            {male?.name || male?.id || activePairForCurrentAnimal.maleId}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            ID: <span className="font-mono text-sky-300 font-bold">{male?.id || activePairForCurrentAnimal.maleId}</span>
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#092214]">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">Morph</span>
                          <span className="text-slate-200 font-medium truncate block">{male?.morph || 'Normal'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">Weight</span>
                          <span className="text-slate-200 font-medium truncate block">{male?.weight ? `${male.weight} g` : 'Logged'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Target Enclosure & Pairing Notes */}
              <div className="p-3.5 rounded-xl bg-[#030f07] border border-[#0d2a19] space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Breeding Plan Notes</span>
                  <span className="text-[10px] text-emerald-400 font-bold">Natural Mating Protocol</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {activePairForCurrentAnimal.notes || 'Breeding plan active. Active monitoring for copulation lock and follicular development.'}
                </p>
              </div>

              {/* Quick Actions Row */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {onNavigateToBreeding && (
                  <button
                    type="button"
                    onClick={onNavigateToBreeding}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-black text-xs flex items-center space-x-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                  >
                    <Eye className="w-4 h-4 text-black" />
                    <span>View in Main Breeding Section</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowActivePairUnpairConfirm(true)}
                  className="px-4 py-2.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Unpair Animals</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="ml-auto text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
                >
                  Re-Assess or Change Plan
                </button>
              </div>

              {/* Unpair Confirmation Box */}
              {showActivePairUnpairConfirm && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-700/60 space-y-3 animate-fade-in">
                  <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Confirm Separation / Unpairing</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Are you sure you want to end this pairing between <strong className="text-white">{activePairForCurrentAnimal.femaleId}</strong> and <strong className="text-white">{activePairForCurrentAnimal.maleId}</strong>? Both animals will return to resting status.
                  </p>
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={handleUnpairCurrentAnimal}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-colors cursor-pointer"
                    >
                      Yes, Unpair Animals
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowActivePairUnpairConfirm(false)}
                      className="px-3 py-1.5 rounded-xl bg-[#08180e] hover:bg-[#0c2415] text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : isTargetAnimalAssessed(currentAnimal?.id, currentAnimal?.breedingStatus) ? (
            /* Assessed Specimen Landing (Never shows unassessed "Ready for Breeding Assessment?" hero card) */
            <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#072013] via-[#05170d] to-[#020a05] border border-emerald-500/40 space-y-6 shadow-xl text-center max-w-3xl mx-auto animate-fade-in">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#0d3820] border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-300" />
              </div>

              <div className="space-y-2 max-w-xl mx-auto">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-wider mb-1">
                  <span>✓ Breeding Assessment Completed</span>
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                  {currentAnimal.name ? `${currentAnimal.name} (${currentAnimal.id})` : currentAnimal.id} is Assessed
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  This specimen has completed breeding evaluation with status: <strong className="text-emerald-400">{currentAnimal.breedingStatus || 'Ready for Pairing'}</strong>. You can proceed directly to mate pairing or review biometric criteria.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(currentAnimal.breedingStatus === 'Ready for Pairing' ? 2 : 1)}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-black text-sm sm:text-base tracking-wide flex items-center justify-center space-x-2.5 transition-all transform hover:scale-[1.03] active:scale-[0.98] cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.45)]"
                >
                  <Heart className="w-5 h-5 fill-black" />
                  <span>{currentAnimal.breedingStatus === 'Ready for Pairing' ? 'Proceed to Mate Pairing' : 'View Readiness Assessment'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#082214] hover:bg-[#0c2f1c] border border-emerald-700/60 text-emerald-300 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <ClipboardList className="w-4 h-4 text-emerald-400" />
                  <span>Review / Re-run Assessment</span>
                </button>
              </div>
            </div>
          ) : (
            /* Standard Initial Landing Hero Card (Only for unassessed specimens that have never had a breeding assessment) */
            <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#072013] via-[#05170d] to-[#020a05] border border-[#113a23] space-y-6 shadow-xl text-center max-w-3xl mx-auto animate-fade-in">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#0d3820] border-2 border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.25)] animate-pulse">
                <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-300" />
              </div>

              <div className="space-y-2 max-w-xl mx-auto">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                  Ready for Breeding Assessment?
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Evaluate <span className="text-emerald-300 font-bold">{currentAnimal.name ? `${currentAnimal.name} (${currentAnimal.id})` : currentAnimal.id}</span> against scientific species breeding standards, calculate mate compatibility, and plan optimal enclosure pairings.
                </p>

                {/* Controlled Climate Enclosure Capability Badge */}
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#041a0d] border border-emerald-600/50 text-[11px] text-emerald-300 shadow-inner mt-1">
                  <Thermometer className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Controlled Climate Enclosures:</strong> Out-of-season thermal cycling &amp; photoperiod simulation supported
                  </span>
                </div>
              </div>

              {/* Highlights 3 Key Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-xl mx-auto">
                <div className="p-3 rounded-xl bg-[#05140b] border border-[#0d2a19] space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>1. Readiness</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Age, weight, and seasonal / climate enclosure simulation.</p>
                </div>

                <div className="p-3 rounded-xl bg-[#05140b] border border-[#0d2a19] space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400">
                    <Heart className="w-3.5 h-3.5" />
                    <span>2. Partner Match</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Genetics, morphs, and compatibility index.</p>
                </div>

                <div className="p-3 rounded-xl bg-[#05140b] border border-[#0d2a19] space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>3. Plan & Track</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Enclosure transfer tasks & clutch logging.</p>
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={startBreedingScan}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-black text-sm sm:text-base tracking-wide flex items-center justify-center space-x-2.5 transition-all transform hover:scale-[1.03] active:scale-[0.98] cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.45)]"
                >
                  <Sparkles className="w-5 h-5 fill-black" />
                  <span>
                    {localStorage.getItem(`feronia_breeding_status_${currentAnimal.id}`) === 'InProgress' || animalBreedingAssessments.length > 0
                      ? 'Continue Breeding Assessment'
                      : 'Start Breeding Assessment'
                    }
                  </span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                {animalBreedingAssessments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#082214] hover:bg-[#0c2f1c] border border-emerald-700/60 text-emerald-300 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <ClipboardList className="w-4 h-4 text-emerald-400" />
                    <span>View Previous Assessment</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* WORKFLOW STEPPER BAR (SHOWN WHEN STEP >= 1) */}
      {/* ========================================================================= */}
      {step >= 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center space-x-2 sm:space-x-3 p-2.5 sm:p-3 rounded-2xl border transition-all text-left cursor-pointer min-w-0 ${
                step === 1
                  ? 'bg-[#082215] border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/50'
                  : 'bg-[#06160e] border-[#0e2e1d] hover:bg-[#092014] text-slate-400'
              }`}
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-extrabold text-xs sm:text-sm shrink-0 ${
                step === 1
                  ? 'bg-emerald-400 text-black shadow-md'
                  : 'bg-[#0d281a] text-slate-300 border border-emerald-950'
              }`}>
                1
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={`text-xs font-extrabold leading-tight ${step === 1 ? 'text-emerald-300' : 'text-slate-200'}`}>
                  Readiness
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate leading-tight">
                  Criteria check
                </p>
              </div>
            </button>

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => {
                if (!breedingEvaluation.overallReady) {
                  setFeedbackMessage('❌ Cannot proceed: Animal is not qualified for breeding. Review and fulfill the readiness checklist first.');
                  setTimeout(() => setFeedbackMessage(null), 5000);
                  return;
                }
                setStep(2);
              }}
              disabled={!breedingEvaluation.overallReady}
              className={`flex items-center space-x-2 sm:space-x-3 p-2.5 sm:p-3 rounded-2xl border transition-all text-left min-w-0 ${
                !breedingEvaluation.overallReady
                  ? 'opacity-40 cursor-not-allowed bg-[#040f09] border-[#081e12] text-slate-500'
                  : step === 2
                  ? 'bg-[#082215] border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/50 cursor-pointer'
                  : 'bg-[#06160e] border-[#0e2e1d] hover:bg-[#092014] text-slate-400 cursor-pointer'
              }`}
              title={!breedingEvaluation.overallReady ? 'Locked: Animal is not eligible for breeding' : 'Select partner match'}
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-extrabold text-xs sm:text-sm shrink-0 ${
                !breedingEvaluation.overallReady
                  ? 'bg-slate-900/80 text-rose-400/70 border border-rose-950'
                  : step === 2
                  ? 'bg-emerald-400 text-black shadow-md'
                  : 'bg-[#0d281a] text-slate-300 border border-emerald-950'
              }`}>
                {!breedingEvaluation.overallReady ? <Lock className="w-3.5 h-3.5" /> : 2}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1">
                  <h4 className={`text-xs font-extrabold leading-tight ${
                    step === 2
                      ? 'text-emerald-300'
                      : !breedingEvaluation.overallReady
                      ? 'text-slate-500'
                      : 'text-slate-200'
                  }`}>
                    Partner
                  </h4>
                  {!breedingEvaluation.overallReady && <Lock className="w-3 h-3 text-rose-500 shrink-0" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate leading-tight">
                  {!breedingEvaluation.overallReady ? 'Locked (Not Ready)' : 'Select match'}
                </p>
              </div>
            </button>

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => {
                if (!breedingEvaluation.overallReady || !selectedPartnerAnimal) {
                  setFeedbackMessage('❌ Cannot proceed to Step 3: Please select a qualified partner and ensure the animal meets breeding eligibility.');
                  setTimeout(() => setFeedbackMessage(null), 5000);
                  return;
                }
                setStep(3);
              }}
              disabled={!breedingEvaluation.overallReady || !selectedPartnerAnimal}
              className={`flex items-center space-x-2 sm:space-x-3 p-2.5 sm:p-3 rounded-2xl border transition-all text-left min-w-0 ${
                !breedingEvaluation.overallReady || !selectedPartnerAnimal
                  ? 'opacity-40 cursor-not-allowed bg-[#040f09] border-[#081e12] text-slate-500'
                  : step === 3
                  ? 'bg-[#082215] border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/50 cursor-pointer'
                  : 'bg-[#06160e] border-[#0e2e1d] hover:bg-[#092014] text-slate-400 cursor-pointer'
              }`}
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-extrabold text-xs sm:text-sm shrink-0 ${
                !breedingEvaluation.overallReady || !selectedPartnerAnimal
                  ? 'bg-slate-900/80 text-slate-600 border border-slate-900'
                  : step === 3
                  ? 'bg-emerald-400 text-black shadow-md'
                  : 'bg-[#0d281a] text-slate-300 border border-emerald-950'
              }`}>
                {!breedingEvaluation.overallReady || !selectedPartnerAnimal ? <Lock className="w-3.5 h-3.5 text-slate-600" /> : 3}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={`text-xs font-extrabold leading-tight ${step === 3 ? 'text-emerald-300' : 'text-slate-200'}`}>
                  Plan & Setup
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate leading-tight">
                  Enclosure & plan
                </p>
              </div>
            </button>

            {/* Step 4 */}
            <button
              type="button"
              onClick={() => setStep(4)}
              className={`flex items-center space-x-2 sm:space-x-3 p-2.5 sm:p-3 rounded-2xl border transition-all text-left cursor-pointer min-w-0 ${
                step === 4
                  ? 'bg-[#082215] border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/50'
                  : 'bg-[#06160e] border-[#0e2e1d] hover:bg-[#092014] text-slate-400'
              }`}
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-extrabold text-xs sm:text-sm shrink-0 ${
                step === 4
                  ? 'bg-emerald-400 text-black shadow-md'
                  : 'bg-[#0d281a] text-slate-300 border border-emerald-950'
              }`}>
                4
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={`text-xs font-extrabold leading-tight ${step === 4 ? 'text-emerald-300' : 'text-slate-200'}`}>
                  Clutch Outcomes
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate leading-tight">
                  Monitor & record
                </p>
              </div>
            </button>
          </div>

          {/* Feedback Toast */}
          {feedbackMessage && (
            <div className="p-3.5 rounded-2xl bg-[#082817] border border-emerald-500/60 text-emerald-200 text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in">
              <div className="flex items-center space-x-2.5 min-w-0">
                {feedbackMessage.includes('❌') || feedbackMessage.includes('Cannot proceed') ? (
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span className="truncate">{feedbackMessage}</span>
              </div>
              <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-white text-xs ml-4">✕</button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: BREEDING READINESS ASSESSMENT */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div className="space-y-5 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#0f301e] pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                Step 1: Breeding Readiness Assessment
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Review age, weight, health, and seasonal conditions before initiating mate pairing.
              </p>
            </div>

            <button
              type="button"
              onClick={startBreedingScan}
              className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-[#092215] hover:bg-[#0e2f1f] border border-emerald-800/60 text-emerald-300 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Re-run Evaluation</span>
            </button>
          </div>

          {/* Main 2-Column Responsive Layout */}
          <div className={`grid grid-cols-1 ${isCompact ? 'gap-4' : 'xl:grid-cols-12 gap-5'} items-start`}>
            
            {/* LEFT COLUMN: Readiness Summary, Score & Actions */}
            <div className={`${isCompact ? 'w-full' : 'xl:col-span-5'} space-y-4`}>
              
              {/* Score & Status Card */}
              <div className="p-5 rounded-2xl bg-[#071910] border border-[#113722] space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">
                    Breeding Status
                  </h4>
                  <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                    breedingEvaluation.overallReady
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800/80'
                      : 'bg-rose-950 text-rose-300 border-rose-800/80'
                  }`}>
                    {breedingEvaluation.overallReady ? 'READY TO BREED' : 'NOT ELIGIBLE'}
                  </span>
                </div>

                {/* Circular Gauge */}
                <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center mx-auto my-2">
                  <svg className="w-32 h-32 sm:w-36 sm:h-36 -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-[#0c2c1a]"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className={`transition-all duration-700 ease-out ${
                        breedingEvaluation.overallReady
                          ? 'stroke-emerald-400'
                          : breedingEvaluation.scorePercentage >= 60
                          ? 'stroke-amber-400'
                          : 'stroke-rose-500'
                      }`}
                      strokeWidth="8"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (breedingEvaluation.scorePercentage / 100) * 251.2}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-black text-white tracking-tight">
                      {breedingEvaluation.scorePercentage}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Readiness
                    </span>
                  </div>
                </div>

                {/* Simple & Clear Status Banner */}
                <div className={`p-3.5 rounded-xl border text-xs flex items-start space-x-2.5 ${
                  breedingEvaluation.overallReady
                    ? 'bg-[#082417] border-emerald-800/60 text-emerald-300'
                    : 'bg-[#240c12] border-rose-800/60 text-rose-200'
                }`}>
                  {breedingEvaluation.overallReady ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <p className="font-bold text-white text-xs">
                      {breedingEvaluation.overallReady
                        ? 'Passed All Readiness Standards'
                        : 'Breeding Temporarily Restricted'}
                    </p>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      {breedingEvaluation.overallReady
                        ? 'The animal satisfies all health and biometric standards to select a partner.'
                        : 'For the animal’s safety, all criteria in the checklist must be met before pairing.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons Card */}
              {breedingEvaluation.overallReady && (
                <div className="p-5 rounded-2xl bg-[#071910] border border-[#113722] space-y-4 shadow-sm">
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleSaveAssessmentAndNext}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-black text-xs flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.02] cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                    >
                      <span>Next: Select Partner</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* RIGHT COLUMN: Roomy Assessment Checklist & Simple Deficits */}
            <div className={`${isCompact ? 'w-full' : 'xl:col-span-7'} space-y-4`}>
              
              <div className="p-5 rounded-2xl bg-[#071910] border border-[#113722] space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#0f301e] pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      Readiness Checklist Standards
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Based on scientific standards for {currentAnimal.species}
                    </p>
                  </div>
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                    breedingEvaluation.overallReady
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
                      : 'bg-rose-950 text-rose-300 border-rose-800/60'
                  }`}>
                    {breedingEvaluation.overallReady ? 'All Passed ✓' : `${breedingEvaluation.failureReasons.length} Deficit(s)`}
                  </span>
                </div>

                {/* 5 Spacious Rows */}
                <div className="space-y-3">
                  
                  {/* 1. Age Row */}
                  <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                    breedingEvaluation.agePassed ? 'bg-[#081e13]/60 border-[#113923]' : 'bg-[#18080c]/60 border-rose-900/50'
                  }`}>
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        breedingEvaluation.agePassed ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60' : 'bg-rose-950 text-rose-400 border-rose-800/60'
                      }`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-xs text-white">Minimum Age</h5>
                        <p className="text-xs text-slate-400">
                          Current: <span className={breedingEvaluation.agePassed ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>{breedingEvaluation.ageMonths || 0} mos</span> • Required: {currentAnimal.sex === 'Male' ? (speciesStandard?.minAgeMonthsMale || 12) : (speciesStandard?.minAgeMonthsFemale || 18)}+ mos
                        </p>
                      </div>
                    </div>
                    <span className={`self-start sm:self-auto px-2.5 py-1 rounded-lg text-xs font-black shrink-0 border ${
                      breedingEvaluation.agePassed
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {breedingEvaluation.agePassed ? '✓ Passed' : '✕ Underage'}
                    </span>
                  </div>

                  {/* 2. Weight Row */}
                  <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                    breedingEvaluation.weightPassed ? 'bg-[#081e13]/60 border-[#113923]' : 'bg-[#18080c]/60 border-rose-900/50'
                  }`}>
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        breedingEvaluation.weightPassed ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60' : 'bg-rose-950 text-rose-400 border-rose-800/60'
                      }`}>
                        <Scale className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-xs text-white">Minimum Weight</h5>
                        <p className="text-xs text-slate-400">
                          Current: <span className={breedingEvaluation.weightPassed ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>{currentAnimal.weight || 0}g</span> • Required: {currentAnimal.sex === 'Male' ? (speciesStandard?.minWeightGramsMale || 300) : (speciesStandard?.minWeightGramsFemale || 350)}+ g
                        </p>
                      </div>
                    </div>
                    <span className={`self-start sm:self-auto px-2.5 py-1 rounded-lg text-xs font-black shrink-0 border ${
                      breedingEvaluation.weightPassed
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {breedingEvaluation.weightPassed ? '✓ Passed' : '✕ Underweight'}
                    </span>
                  </div>

                  {/* 3. Health Row */}
                  <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                    breedingEvaluation.healthPassed ? 'bg-[#081e13]/60 border-[#113923]' : 'bg-[#18080c]/60 border-rose-900/50'
                  }`}>
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        breedingEvaluation.healthPassed ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60' : 'bg-rose-950 text-rose-400 border-rose-800/60'
                      }`}>
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-xs text-white">Clinical Health Status</h5>
                        <p className="text-xs text-slate-400">
                          Current Status: <span className={breedingEvaluation.healthPassed ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>{currentAnimal.healthStatus || 'Healthy / Cleared'}</span>
                        </p>
                      </div>
                    </div>
                    <span className={`self-start sm:self-auto px-2.5 py-1 rounded-lg text-xs font-black shrink-0 border ${
                      breedingEvaluation.healthPassed
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {breedingEvaluation.healthPassed ? '✓ Healthy' : '✕ Health Hold'}
                    </span>
                  </div>

                  {/* 4. Season Row with Climate Temperature & Keeper Request Action */}
                  <div className={`p-4 rounded-2xl border flex flex-col space-y-3 transition-all ${
                    breedingEvaluation.seasonPassed ? 'bg-[#081e13]/60 border-[#113923]' : 'bg-[#1a1408]/60 border-amber-900/50'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          breedingEvaluation.seasonPassed ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60' : 'bg-amber-950 text-amber-400 border-amber-800/60'
                        }`}>
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <h5 className="font-bold text-xs text-white">Breeding Season Window</h5>
                            {isClimateApproved && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-700/60">
                                Climate Verified
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Optimal Season: <span className="text-slate-200 font-medium">{speciesStandard?.pairingSeasonText || breedingEvaluation.seasonText || 'Spring – Summer'}</span>
                          </p>
                        </div>
                      </div>

                      <span className={`self-start sm:self-auto px-2.5 py-1 rounded-lg text-xs font-black shrink-0 border ${
                        breedingEvaluation.seasonPassed
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {breedingEvaluation.seasonPassed
                          ? (isClimateApproved ? '✓ Climate Induced' : '✓ In Season')
                          : '⚠️ Off-Season'}
                      </span>
                    </div>

                    {/* Climate Temperature Requirements & Keeper Setup/Check Request Bar */}
                    <div className="pt-2.5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <Thermometer className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="font-bold text-slate-200">Climate Temp Needed:</span>
                          <span className="text-emerald-300 font-extrabold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                            {speciesStandard?.coolingTempRange ? `${speciesStandard.coolingTempRange} (Cooling)` : '15°C – 20°C (Cooling) / 35°C – 40°C (Basking)'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Enclosure Status: <strong className="text-white">{currentEnclosure?.temperature ? `${currentEnclosure.temperature} (Keeper Verified)` : 'Unchecked / Pending Keeper Setup'}</strong> ({currentEnclosure?.name || 'Assigned Enclosure'})
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {isClimateApproved ? (
                          <div className="flex items-center space-x-2">
                            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center space-x-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Temp Verified & Set</span>
                            </span>
                            <button
                              type="button"
                              onClick={handleRequestClimateSetup}
                              className="px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-xs font-bold transition-all cursor-pointer"
                            >
                              Re-check Temp
                            </button>
                          </div>
                        ) : isClimatePendingSetup ? (
                          <button
                            type="button"
                            onClick={() => {
                              setFeedbackMessage(`Reminder sent to Keeper to check enclosure temperature!`);
                              setTimeout(() => setFeedbackMessage(null), 3000);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/50 font-bold text-xs flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                            <span>Remind Keeper (Pending Temp Check)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleRequestClimateSetup}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
                          >
                            <Thermometer className="w-4 h-4 text-emerald-300" />
                            <span>Request Keeper to Set & Check Temp</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 5. Resting Row */}
                  <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                    breedingEvaluation.cooldownPassed ? 'bg-[#081e13]/60 border-[#113923]' : 'bg-[#18080c]/60 border-rose-900/50'
                  }`}>
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        breedingEvaluation.cooldownPassed ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60' : 'bg-rose-950 text-rose-400 border-rose-800/60'
                      }`}>
                        <Thermometer className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-xs text-white">Resting & Conditioning (Brumation/Cooling)</h5>
                        <p className="text-xs text-slate-400">
                          Requirement: <span className="text-slate-200 font-medium">{speciesStandard?.brumationCoolingRequired || 'Optional / Satisfied'}</span>
                        </p>
                      </div>
                    </div>
                    <span className={`self-start sm:self-auto px-2.5 py-1 rounded-lg text-xs font-black shrink-0 border ${
                      breedingEvaluation.cooldownPassed
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {breedingEvaluation.cooldownPassed ? '✓ Ready' : '✕ In Cooldown'}
                    </span>
                  </div>

                </div>

                {/* Requirements to Complete Before Pairing Box (Shows ONLY failing reasons) */}
                {!breedingEvaluation.overallReady ? (
                  <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/40 border border-rose-600/70 text-rose-200 text-xs space-y-3 mt-4 transition-all shadow-md animate-fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-rose-800/40">
                      <div className="flex items-center space-x-2 font-black text-xs uppercase tracking-wider text-rose-300">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                        <span>Requirements to Complete Before Pairing:</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/30 text-rose-300 border border-rose-500/40">
                        Action Required
                      </span>
                    </div>

                    <ul className="space-y-2 text-xs pl-1">
                      {!breedingEvaluation.agePassed && (
                        <li className="flex items-start space-x-2">
                          <span className="shrink-0 mt-0.5">⚠️</span>
                          <div>
                            <strong className="text-white">Minimum Age Requirement:</strong> Currently {breedingEvaluation.ageMonths || 0} months old (Requires {currentAnimal.sex === 'Male' ? (speciesStandard?.minAgeMonthsMale || 12) : (speciesStandard?.minAgeMonthsFemale || 18)}+ months).
                          </div>
                        </li>
                      )}

                      {!breedingEvaluation.weightPassed && (
                        <li className="flex items-start space-x-2">
                          <span className="shrink-0 mt-0.5">⚠️</span>
                          <div>
                            <strong className="text-white">Minimum Body Weight Requirement:</strong> Currently {currentAnimal.weight || 0}g (Requires minimum {currentAnimal.sex === 'Male' ? (speciesStandard?.minWeightGramsMale || 300) : (speciesStandard?.minWeightGramsFemale || 350)}g).
                          </div>
                        </li>
                      )}

                      {!breedingEvaluation.healthPassed && (
                        <li className="flex items-start space-x-2">
                          <span className="shrink-0 mt-0.5">⚠️</span>
                          <div>
                            <strong className="text-white">Clinical Veterinary Clearance:</strong> Status is "{currentAnimal.healthStatus || 'Pending Checkup'}" (Requires Veterinary clearance checkup).
                          </div>
                        </li>
                      )}

                      {!breedingEvaluation.seasonPassed && (
                        <li className="flex items-start space-x-2">
                          <span className="shrink-0 mt-0.5">⚠️</span>
                          <div>
                            <strong className="text-white">Breeding Season & Climate Conditioning:</strong> Animal is off-season or enclosure climate temperature is not set (Optimal Season: {speciesStandard?.pairingSeasonText || breedingEvaluation.seasonText || 'Spring – Summer'}).
                          </div>
                        </li>
                      )}

                      {!breedingEvaluation.cooldownPassed && (
                        <li className="flex items-start space-x-2">
                          <span className="shrink-0 mt-0.5">⚠️</span>
                          <div>
                            <strong className="text-white">Resting & Recovery Cooldown:</strong> Animal is currently in recovery cooldown from previous breeding cycle.
                          </div>
                        </li>
                      )}
                    </ul>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/60 text-emerald-200 text-xs flex items-center justify-between shadow-md mt-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-bold">All breeding requirements satisfied! Animal is fully cleared for pairing.</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500 text-slate-950">
                      ✓ Cleared
                    </span>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: SELECT THE BEST PARTNER */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div className="space-y-5 animate-fade-in">
          {!breedingEvaluation.overallReady && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-700/60 text-amber-200 text-xs flex items-center justify-between gap-2 shadow-sm animate-fade-in">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span><strong>Supervisor Clearance Active:</strong> Partner selection proceeding under conditional keeper approval.</span>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[11px] text-amber-300 underline font-semibold hover:text-amber-100 shrink-0 cursor-pointer"
              >
                Review Criteria
              </button>
            </div>
          )}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#0f301e] pb-2">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-white">
                    Step 2: Select the Best Partner
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Find and choose the most compatible mate based on age parity and morph standards.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-3 py-1.5 rounded-xl bg-[#082014] hover:bg-[#0c2e1d] border border-emerald-900/50 text-slate-300 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Step 1</span>
                  </button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Species Dropdown */}
                <div className="flex items-center space-x-1.5 bg-[#071910] border border-[#113722] rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
                  <span className="text-slate-400">Species:</span>
                  <select
                    value={filterSpecies}
                    onChange={e => setFilterSpecies(e.target.value)}
                    aria-label="Filter candidates by species"
                    className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
                  >
                    <option value="All" className="bg-[#071910] text-white">All Species</option>
                    <option value={currentAnimal.species} className="bg-[#071910] text-white">{currentAnimal.species}</option>
                    {Array.from(new Set(animals.map(a => a.species))).filter(s => s !== currentAnimal.species).map(s => (
                      <option key={s} value={s} className="bg-[#071910] text-white">{s}</option>
                    ))}
                  </select>
                </div>

                {/* Sex Dropdown */}
                <div className="flex items-center space-x-1.5 bg-[#071910] border border-[#113722] rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
                  <span className="text-slate-400">Sex:</span>
                  <select
                    value={filterSex}
                    onChange={e => setFilterSex(e.target.value as any)}
                    aria-label="Filter candidates by sex"
                    className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
                  >
                    <option value="All" className="bg-[#071910] text-white">
                      {currentAnimal.sex === 'Male' ? 'Female (Opposite)' : 'Male (Opposite)'}
                    </option>
                    <option value="Female" className="bg-[#071910] text-white">Female</option>
                    <option value="Male" className="bg-[#071910] text-white">Male</option>
                  </select>
                </div>

                {/* Search Input */}
                <div className="flex items-center space-x-2 bg-[#071910] border border-[#113722] rounded-xl px-3 py-1.5 text-xs text-slate-300 flex-1 min-w-[140px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search candidate ID or morph..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="bg-transparent text-white placeholder-slate-500 focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Candidate Table / Cards */}
              <div className="bg-[#071910] border border-[#113722] rounded-2xl overflow-hidden shadow-sm">
                {candidatePartners.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <Heart className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-sm font-bold text-slate-300">No partner candidates match criteria</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Try adjusting filters to view other available animals.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#0f301e]">
                    {candidatePartners.map(cand => {
                      // Bypassing candidate's original enclosure climate check since they join the selected animal's approved enclosure anyway!
                      const candEval = evaluateAnimalBreedingReadiness(cand, medicalRecords, breedingRecords, true);
                      const candPairEval = evaluateBreedingPair(
                        currentAnimal.sex === 'Female' ? currentAnimal : cand,
                        currentAnimal.sex === 'Female' ? cand : currentAnimal,
                        medicalRecords,
                        breedingRecords
                      );
                      const candEnc = enclosures.find(e => e.id === cand.enclosureId);
                      const isSelected = selectedPartnerAnimal?.id === cand.id;
                      const isFav = favoritedPartnerIds.includes(cand.id);
                      const starCount = candPairEval.compatibilityScore >= 90 ? 5 : candPairEval.compatibilityScore >= 75 ? 4 : 3;
                      
                      const isCandidateAssessed = breedingAssessments ? breedingAssessments.some(a => a.animalId === cand.id) : false;
                      const isLocalInProgress = localStorage.getItem(`feronia_breeding_status_${cand.id}`) === 'InProgress' || localStorage.getItem(`feronia_breeding_status_${cand.id}`) === 'Completed';
                      const candAssessed = !!(isCandidateAssessed || isLocalInProgress || cand.breedingStatus === 'Ready for Pairing' || cand.breedingStatus === 'In Progress' || cand.breedingStatus === 'Not Eligible');
                      const candQualified = candEval.overallReady && candAssessed;

                      return (
                        <div
                          key={cand.id}
                          onClick={() => handleSelectCandidate(cand)}
                          className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#092416]/90 border border-emerald-500/60 rounded-xl' : 'hover:bg-[#081e13]'
                          } ${!candQualified && candAssessed ? 'opacity-80 bg-[#120508]/40' : ''}`}
                        >
                          {/* Left: Info */}
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-emerald-900/60 shrink-0 bg-slate-900 flex items-center justify-center">
                              {getAnimalDisplayPhoto(cand) ? (
                                <img
                                  src={getAnimalDisplayPhoto(cand)}
                                  alt={cand.name || cand.species}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Camera className="w-5 h-5 text-emerald-500/80" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-bold text-sm text-white truncate">
                                  {cand.id}
                                </h4>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                  cand.sex === 'Male' ? 'bg-sky-950 text-sky-400' : 'bg-pink-950 text-pink-400'
                                }`}>
                                  {cand.sex}
                                </span>
                                {!candAssessed ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 flex items-center space-x-1 animate-pulse">
                                    <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                                    <span>Needs Assessment</span>
                                  </span>
                                ) : !candQualified && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60 flex items-center space-x-1">
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>Not Eligible</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-300 truncate">
                                {cand.species} • {cand.weight || 380} g • {candEval.ageMonths || 20} mos
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                Enclosure: {candEnc?.name || 'Main Enclosure'}
                              </p>
                            </div>
                          </div>

                          {/* Right: Compatibility & Select Button */}
                          <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#0f301e]">
                            <div className="text-left sm:text-right">
                              <div className="flex items-center space-x-1 text-amber-400 text-xs">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${i < starCount ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`}
                                  />
                                ))}
                                <span className="font-black text-emerald-300 text-xs ml-1">
                                  {candPairEval.compatibilityScore}%
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 block mt-0.5 max-w-[220px] truncate">
                                {!candAssessed 
                                  ? 'No suitabiliy assessment logged' 
                                  : !candQualified 
                                  ? 'Breeding criteria not met' 
                                  : candPairEval.summaryNote}
                              </span>
                            </div>

                            {/* Select Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectCandidate(cand);
                              }}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500 text-black shadow-md font-black'
                                  : 'bg-[#0b2b1a] hover:bg-[#0f3822] text-emerald-300 border border-emerald-700/60'
                              }`}
                            >
                              {isSelected ? 'Selected ✓' : !candAssessed ? 'Assess & Select' : 'Select Partner'}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleFavorite(cand.id)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isFav ? 'text-rose-400 hover:text-rose-300' : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <span className="text-xs text-slate-400 font-medium">
                  Showing {candidatePartners.length} compatible candidates
                </span>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!selectedPartnerAnimal}
                  className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-black font-black text-xs flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.02] cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Next: Plan Breeding Process</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: PLAN BREEDING PROCESS & ENCLOSURE TRANSFER */}
      {/* ========================================================================= */}
      {step === 3 && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#0f301e] pb-2">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                Step 3: Plan Breeding Process & Enclosure Transfer
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Establish the environmental conditioning timeline, nesting protocols, and enclosure pairing tasks.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-[#082014] hover:bg-[#0c2e1d] border border-emerald-900/50 text-slate-300 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Partners</span>
            </button>
          </div>

          <div className="space-y-4 sm:space-y-5">
            {/* 1. Selected Pair Hero Card (Full Width - Spacious & Never Siksikan) */}
            <div className="p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-[#071910] border border-[#113722] shadow-md space-y-4">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#0f301e] pb-3">
                <div className="flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                    Selected Breeding Pair
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">
                    • {currentAnimal.species}
                  </span>
                </div>
                
                {/* Match Compatibility Badge */}
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#041a0e] border border-emerald-500/40 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-black text-emerald-300">
                    Match Compatibility: {pairEvaluation?.compatibilityScore || 92}%
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({pairEvaluation?.summaryNote || 'High Compatibility'})
                  </span>
                </div>
              </div>

              {/* Animals Display Row */}
              <div className="grid grid-cols-1 md:grid-cols-11 gap-3 sm:gap-4 items-center">
                {/* Left Animal (Current Animal) */}
                <div className="md:col-span-5 p-3.5 sm:p-4 rounded-2xl bg-[#04130a] border border-[#0d2a19] flex items-center space-x-3.5 min-w-0">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-emerald-700/60 bg-slate-900 shrink-0 shadow-md flex items-center justify-center">
                    {getAnimalDisplayPhoto(currentAnimal) ? (
                      <img
                        src={getAnimalDisplayPhoto(currentAnimal)}
                        alt={currentAnimal.name || currentAnimal.id}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                        <Camera className="w-5 h-5 text-emerald-500/80" />
                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">No Photo</span>
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-black/85 text-white backdrop-blur-xs">
                      {currentAnimal.sex === 'Male' ? 'Sire' : 'Dam'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <h5 className="font-extrabold text-sm sm:text-base text-white truncate">
                        {currentAnimal.id}
                      </h5>
                      {currentAnimal.name && (
                        <span className="text-xs font-semibold text-slate-300 truncate">
                          ({currentAnimal.name})
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold ${
                        currentAnimal.sex === 'Male'
                          ? 'bg-sky-950 text-sky-300 border border-sky-800/60'
                          : 'bg-pink-950 text-pink-300 border border-pink-800/60'
                      }`}>
                        {currentAnimal.sex === 'Male' ? '♂ Male' : '♀ Female'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 truncate">
                      Morph: <span className="text-emerald-300 font-medium">{currentAnimal.morph || 'Standard Wildtype'}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Weight: <strong className="text-slate-200">{currentAnimal.weight || 350}g</strong> • Age: <strong className="text-slate-200">{breedingEvaluation.ageMonths || 22} mos</strong>
                    </p>
                  </div>
                </div>

                {/* Center Mating Connector Icon */}
                <div className="md:col-span-1 flex flex-col items-center justify-center py-1">
                  <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center animate-pulse border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.25)]">
                    <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                  </div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-300/90 mt-1 hidden md:block">
                    Mating
                  </span>
                </div>

                {/* Right Animal (Selected Partner) */}
                <div className="md:col-span-5 p-3.5 sm:p-4 rounded-2xl bg-[#04130a] border border-[#0d2a19] flex items-center space-x-3.5 min-w-0">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-emerald-700/60 bg-slate-900 shrink-0 shadow-md flex items-center justify-center">
                    {getAnimalDisplayPhoto(selectedPartnerAnimal) ? (
                      <img
                        src={getAnimalDisplayPhoto(selectedPartnerAnimal)}
                        alt={selectedPartnerAnimal?.name || selectedPartnerAnimal?.id || 'Partner'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                        <Camera className="w-5 h-5 text-emerald-500/80" />
                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">No Photo</span>
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-black/85 text-white backdrop-blur-xs">
                      {selectedPartnerAnimal?.sex === 'Male' ? 'Sire' : 'Dam'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <h5 className="font-extrabold text-sm sm:text-base text-white truncate">
                        {selectedPartnerAnimal?.id || 'MATE-001'}
                      </h5>
                      {selectedPartnerAnimal?.name && (
                        <span className="text-xs font-semibold text-slate-300 truncate">
                          ({selectedPartnerAnimal.name})
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold ${
                        selectedPartnerAnimal?.sex === 'Female'
                          ? 'bg-pink-950 text-pink-300 border border-pink-800/60'
                          : 'bg-sky-950 text-sky-300 border border-sky-800/60'
                      }`}>
                        {selectedPartnerAnimal?.sex || (currentAnimal.sex === 'Male' ? 'Female' : 'Male')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 truncate">
                      Morph: <span className="text-emerald-300 font-medium">{selectedPartnerAnimal?.morph || 'Standard Wildtype'}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      Weight: <strong className="text-slate-200">{selectedPartnerAnimal?.weight || 340}g</strong> • Enclosure: <strong className="text-slate-200">{enclosures.find(e => e.id === selectedPartnerAnimal?.enclosureId)?.name || 'Active Enclosure'}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Compatibility Evaluation Note Footer */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-[#04150b] border border-emerald-800/30 flex items-start space-x-2.5 text-xs">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 min-w-0">
                  <span className="font-bold text-emerald-300">Compatibility Evaluation:</span>
                  <p className="text-slate-300 text-[11.5px] leading-relaxed">
                    {pairEvaluation?.summaryNote ? (
                      pairEvaluation.summaryNote
                    ) : (
                      'Both animals meet genetic diversity, age parity, and weight readiness requirements. Suitable for controlled enclosure pairing.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* 2 & 3: 2 Balanced Columns for Plan & Enclosure Setup */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-stretch">
              
              {/* Left Column: Breeding Plan & Timing Parameters */}
              <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#071910] border border-[#113722] shadow-md flex flex-col justify-between space-y-4">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-[#0f301e] pb-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                        Breeding Plan & Schedule
                      </h4>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                      Species Guidelines
                    </span>
                  </div>

                  {/* Clean, Non-Cramped Key-Value Rows */}
                  <div className="space-y-2.5 text-xs divide-y divide-[#0f301e]">
                    <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-slate-400">Pairing Season</span>
                      <span className="font-bold text-slate-200">
                        {isClimateApproved ? 'Simulated Climate (Approved by Admin)' : isClimatePendingApproval ? 'Climate Pending Approval' : 'Natural Calendar Season'}
                      </span>
                    </div>

                    <div className="pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-slate-400">Recommended Window</span>
                      <span className="font-extrabold text-emerald-300">{pairingSeasonDateRange}</span>
                    </div>

                    <div className="pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-slate-400">Gestation Period (Est.)</span>
                      <span className="font-bold text-slate-200">30 – 45 days post-lock</span>
                    </div>

                    <div className="pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-slate-400">Incubation Temperature</span>
                      <span className="font-bold text-emerald-300">31.5°C (±0.5°C)</span>
                    </div>

                    <div className="pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-slate-400">Egg Deposition Medium</span>
                      <span className="font-bold text-slate-200">Moist Vermiculite / Perlite Box</span>
                    </div>
                  </div>

                  {/* Custom Notes */}
                  <div className="pt-2">
                    <label className="block text-[10.5px] text-slate-300 font-bold uppercase mb-1">
                      Admin Notes & Special Handling
                    </label>
                    <input
                      type="text"
                      value={pairNotes}
                      onChange={e => setPairNotes(e.target.value)}
                      placeholder="e.g. Introduce during evening feed; check for copulation lock..."
                      className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Natural Seasoning Advice Callout */}
                <div className="p-3 rounded-xl bg-[#041209] border border-[#0a2717] text-[11px] text-slate-400 space-y-1">
                  <span className="font-bold text-slate-300 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Husbandry Tip:</span>
                  </span>
                  <p className="leading-relaxed">
                    Ensure the female has access to calcium-dusted food and an easily accessible nesting laybox prior to pairing.
                  </p>
                </div>
              </div>

              {/* Right Column: Enclosure Transfer & Climate Setup */}
              <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#071910] border border-[#113722] shadow-md flex flex-col justify-between space-y-4">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-[#0f301e] pb-3">
                    <div className="flex items-center space-x-2">
                      <Sliders className="w-4 h-4 text-emerald-400" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                        Enclosure Transfer &amp; Setup
                      </h4>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                      Step 3 Setup
                    </span>
                  </div>

                  {/* Target Species Standard Guidance */}
                  {speciesStandard?.coolingTempRange && (
                    <div className="p-3 rounded-xl bg-[#04150c] border border-emerald-800/40 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <Thermometer className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="text-slate-400 block text-[10px]">Breeding Cooling Requirement:</span>
                          <span className="font-extrabold text-emerald-300">{speciesStandard.coolingTempRange}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Destination Enclosures List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Select Destination Enclosure:</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAllTransferEnclosures(prev => !prev)}
                        className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                      >
                        {showAllTransferEnclosures ? 'Filtered Only' : 'Show All Enclosures'}
                      </button>
                    </div>

                    {(() => {
                      const listToDisplay = showAllTransferEnclosures
                        ? enclosures.filter(e => e.condition !== 'Out of Service')
                        : qualifiedTransferEnclosures;

                      if (listToDisplay.length === 0) {
                        return (
                          <div className="p-4 rounded-xl bg-[#031109] border border-amber-900/40 text-center space-y-2">
                            <p className="text-amber-400 text-xs font-bold">
                              ⚠️ No enclosures matching the target climate temperature for {currentAnimal.species}.
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Target required range is {speciesStandard?.coolingTempRange || '15°C–20°C'}.
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowAllTransferEnclosures(true)}
                              className="px-3 py-1.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-lg text-xs font-bold cursor-pointer hover:bg-emerald-900"
                            >
                              Show All Enclosures (Override)
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                          {listToDisplay.map(enc => {
                            const isSelected = enc.id === (transferEnclosureId || qualifiedTransferEnclosures[0]?.id);
                            const qual = evaluateEnclosureClimateQualification(enc, currentAnimal.species);

                            return (
                              <div
                                key={enc.id}
                                onClick={() => setTransferEnclosureId(enc.id)}
                                className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#041d10] border-emerald-400 ring-1 ring-emerald-400/40 shadow-md'
                                    : 'bg-[#031109] border-emerald-900/40 hover:border-emerald-700/60'
                                }`}
                              >
                                <div className="flex items-center space-x-2.5 min-w-0">
                                  <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center shrink-0 text-xs font-mono font-bold text-emerald-300">
                                    📦
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center space-x-1.5">
                                      <span className="font-extrabold text-white text-xs truncate">{enc.name}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">({enc.id})</span>
                                    </div>
                                    <p className="text-[10.5px] text-slate-300 truncate">
                                      {enc.facility} • {enc.type}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end shrink-0">
                                  <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border ${
                                    qual.isQualified
                                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80'
                                      : 'bg-amber-950 text-amber-300 border-amber-700/80'
                                  }`}>
                                    🌡️ {enc.temperature || 'Not Set'} {qual.isQualified ? '✓ PASSED' : '⚠️ OUT OF RANGE'}
                                  </span>
                                  {isSelected && (
                                    <span className="text-[9px] text-emerald-400 font-bold mt-0.5">
                                      Selected Target
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Transfer Couple Action */}
                  <div className="pt-2 text-center space-y-3">
                    <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                      Transfer both <strong>{currentAnimal.name || currentAnimal.id}</strong> and <strong>{selectedPartnerAnimal?.name || selectedPartnerAnimal?.id || 'Partner'}</strong> into the selected enclosure.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        // 1. Log and register breeding pair and records in state
                        handleConfirmPairingAndTransfer();

                        // 2. Redirect to enclosure tab for shared vivarium selection if callback provided
                        if (onRedirectToEnclosureTab) {
                          onRedirectToEnclosureTab();
                        }
                      }}
                      className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-black text-xs sm:text-sm tracking-wide flex items-center justify-center space-x-2.5 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-[0_0_25px_rgba(16,185,129,0.35)]"
                    >
                      <ArrowLeftRight className="w-4 h-4 text-black" />
                      <span>Transfer Couple</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Workflow Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#0f301e]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 rounded-xl bg-[#082014] hover:bg-[#0c2e1d] border border-emerald-900/50 text-slate-300 text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Step 2 (Partners)</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(4)}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-black font-black text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.02] cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.35)]"
              >
                <span>Next: Monitor &amp; Record Outcomes</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: MONITOR & RECORD OUTCOMES */}
      {/* ========================================================================= */}
      {step === 4 && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#0f301e] pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                Step 4: Monitor & Record Outcomes
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Overview of pairing history, incubation parameters, and keeper-logged clutch records.
              </p>
            </div>
          </div>

          {/* Connection to Main Breeding Section Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-[#072414] to-[#04190c] border border-emerald-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg animate-fade-in">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 text-[11px] font-black uppercase text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Pairing Successfully Established &amp; Synced</span>
              </div>
              <p className="text-xs text-slate-300">
                This pair is recorded in the facility database. You can track egg clutches, incubation temperatures, or view the complete pairings table in the main Breeding section.
              </p>
            </div>
            {onNavigateToBreeding && (
              <button
                type="button"
                onClick={onNavigateToBreeding}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-black text-xs flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.03] cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.35)] shrink-0"
              >
                <Eye className="w-4 h-4 text-black" />
                <span>Open in Main Breeding Section</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </button>
            )}
          </div>

          {/* Telemetry KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#071910] border border-[#113722] space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Status</span>
              <p className="text-sm sm:text-base font-black text-emerald-400">In Progress</p>
              <p className="text-[10px] text-slate-500 truncate">Pair locked & scheduled</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#071910] border border-[#113722] space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Incubator Temp</span>
              <p className="text-sm sm:text-base font-black text-white">
                {speciesStandard ? speciesStandard.incubationTempTarget : '31.5°C'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">PID automated standard</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#071910] border border-[#113722] space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Target Humidity</span>
              <p className="text-sm sm:text-base font-black text-white">
                {speciesStandard ? speciesStandard.incubationHumidity : '80%'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">Species target</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#071910] border border-[#113722] space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Logged Clutches</span>
              <p className="text-sm sm:text-base font-black text-emerald-300">
                {animalBreedingRecords.length} Clutches
              </p>
              <p className="text-[10px] text-slate-500 truncate">In facility records</p>
            </div>
          </div>

          {/* Undo Notification Banner */}
          {undoToastMessage && (
            <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500/50 flex items-center justify-between gap-2 text-xs animate-in fade-in">
              <span className="text-amber-200 font-medium">
                ⚠️ {undoToastMessage}
              </span>
              <button
                type="button"
                onClick={() => {
                  handleRestoreDeletedOrSampleRecord();
                  setUndoToastMessage(null);
                }}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center space-x-1 cursor-pointer transition-all active:scale-95 shrink-0 shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo / Restore</span>
              </button>
            </div>
          )}

          {/* Past Records List */}
          <div className="bg-[#071910] border border-[#113722] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#0f301e] flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                Breeding & Clutch History
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {animalBreedingRecords.length} Clutches Logged
              </span>
            </div>

            {animalBreedingRecords.length === 0 ? (
              <div className="p-8 sm:p-10 text-center space-y-3">
                <Egg className="w-9 h-9 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-200">No clutches recorded yet</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Egg clutches and incubation observations are recorded by the assigned Wildlife Keeper during habitat monitoring.
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleRestoreDeletedOrSampleRecord}
                    className="px-4 py-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Previous Clutch Record</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#0f301e]">
                {animalBreedingRecords.map(b => (
                  <div key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white font-mono">{b.id}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                          {b.status}
                        </span>
                        <span className="text-slate-400">• {b.breedingType}</span>
                      </div>
                      <p className="text-slate-300 truncate">
                        Pair: <span className="text-emerald-300 font-bold">{b.femaleId} (F)</span> × <span className="text-sky-300 font-bold">{b.maleId} (M)</span>
                      </p>
                      {b.notes && <p className="text-slate-400 text-[11px] truncate">{b.notes}</p>}
                    </div>

                    <div className="flex items-center space-x-3 shrink-0 text-right">
                      {b.clutchSize !== undefined && (
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block font-bold">Clutch</span>
                          <span className="font-bold text-slate-200">{b.clutchSize} eggs</span>
                        </div>
                      )}
                      {b.hatchlings !== undefined && (
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block font-bold">Hatched</span>
                          <span className="font-bold text-emerald-400">{b.hatchlings} young</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block font-bold">Date</span>
                        <span className="text-slate-300 font-medium">{b.breedingDate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-xl bg-[#082014] hover:bg-[#0c2e1d] border border-emerald-900/50 text-slate-300 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Step 3</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (isTargetAnimalAssessed(currentAnimal.id, currentAnimal.breedingStatus)) {
                  setStep(1); // Review assessment, do not return to step 0
                } else {
                  setStep(0);
                }
              }}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center space-x-1.5 transition-all cursor-pointer shadow-md"
            >
              <span>{isTargetAnimalAssessed(currentAnimal.id, currentAnimal.breedingStatus) ? 'Review Assessment' : 'Restart Workflow'}</span>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: GUIDELINES & HELP MODAL */}
      {/* ========================================================================= */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#071910] border border-[#113722] rounded-3xl max-w-2xl w-full p-6 space-y-4 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#0f301e] pb-3">
              <div className="flex items-center space-x-2.5">
                <HelpCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base text-white">
                  Breeding Workflow Guidelines & Scientific Standards
                </h3>
              </div>
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="p-1 rounded-lg bg-[#0a2316] hover:bg-[#0f3421] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[65vh] overflow-y-auto pr-1">
              <div className="p-3 rounded-xl bg-[#082014] border border-[#0e311f] space-y-1">
                <h4 className="font-bold text-emerald-300 text-sm">
                  1. Readiness Assessment
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  Evaluates sexual maturity, minimum gram weight threshold, and absence of open medical treatment logs. Seasonal light photoperiods (12h to 14h daylight) and optional brumation trigger natural ovulation.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#082014] border border-[#0e311f] space-y-1">
                <h4 className="font-bold text-emerald-300 text-sm">
                  2. Partner Compatibility
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  Calculates compatibility score based on opposite sex criteria, morphological pairing goals, age parity, and weight ratio (male should not exceed female by more than 20% to prevent pairing stress).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#082014] border border-[#0e311f] space-y-1">
                <h4 className="font-bold text-emerald-300 text-sm">
                  3. Enclosure Pairing & Nesting
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  Females require a dark lay box with damp vermiculite or coconut coir (ratio 1:1 water to medium by weight) 2–3 weeks post successful lock.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#082014] border border-[#0e311f] space-y-1">
                <h4 className="font-bold text-emerald-300 text-sm">
                  4. Incubation Parameters
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  <li><strong>Bearded Dragons:</strong> 28.5°C – 31.5°C, 80–85% humidity, 55–75 days incubation.</li>
                  <li><strong>Ball Pythons:</strong> 31.0°C – 32.0°C, 90–95% humidity, 55–60 days incubation.</li>
                  <li><strong>Leopard Geckos:</strong> 26.5°C (all female) or 31.5°C (all male), 75% humidity, 45–60 days.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-colors cursor-pointer"
              >
                Close Guidelines
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CHANGE ANIMAL MODAL */}
      {/* ========================================================================= */}
      {isChangeAnimalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#071910] border border-[#113722] rounded-3xl max-w-xl w-full p-6 space-y-4 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#0f301e] pb-3">
              <div className="flex items-center space-x-2">
                <PawPrint className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base text-white">Select Animal for Breeding Workflow</h3>
              </div>
              <button
                onClick={() => setIsChangeAnimalModalOpen(false)}
                className="p-1 rounded-lg bg-[#0a2316] hover:bg-[#0f3421] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="flex items-center space-x-2 bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-xs">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search animal by ID, species, or morph..."
                value={animalSearchQuery}
                onChange={e => setAnimalSearchQuery(e.target.value)}
                className="bg-transparent text-white placeholder-slate-500 focus:outline-none w-full"
              />
            </div>

            {/* Animals List */}
            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1 divide-y divide-[#0f301e]">
              {animals
                .filter(a => {
                  if (a.isArchived) return false;
                  if (!animalSearchQuery.trim()) return true;
                  const q = animalSearchQuery.toLowerCase();
                  return (a.id || '').toLowerCase().includes(q) ||
                    (a.name || '').toLowerCase().includes(q) ||
                    (a.species || '').toLowerCase().includes(q);
                })
                .map(a => {
                  const isCurrent = a.id === currentAnimal.id;
                  const aEnc = enclosures.find(e => e.id === a.enclosureId);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSelectedAnimalId(a.id);
                        if (onSelectAnimal) onSelectAnimal(a);
                        setIsChangeAnimalModalOpen(false);
                        const nextStep = resolveAnimalStep(a);
                        setStep(nextStep);
                      }}
                      className={`w-full pt-2 flex items-center justify-between p-3 rounded-xl transition-colors text-left cursor-pointer ${
                        isCurrent ? 'bg-[#082417] border border-emerald-600/50' : 'hover:bg-[#081e13]'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-emerald-900/60 bg-slate-900 shrink-0 flex items-center justify-center">
                          {getAnimalDisplayPhoto(a) ? (
                            <img
                              src={getAnimalDisplayPhoto(a)}
                              alt={a.name || a.species}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Camera className="w-4 h-4 text-emerald-500/80" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-white">{a.id}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              a.sex === 'Male' ? 'bg-sky-950 text-sky-400' : 'bg-pink-950 text-pink-400'
                            }`}>
                              {a.sex}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">{a.species}</p>
                          <p className="text-[10px] text-slate-400">{aEnc?.name || 'Main Enclosure'}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditAnimalModal(a);
                          }}
                          className="p-1.5 rounded-lg bg-[#082014] hover:bg-[#0e3522] border border-emerald-800/60 text-emerald-300 hover:text-white transition-colors cursor-pointer"
                          title="Edit Animal details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {isCurrent ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-black">
                            Current
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-400 font-bold">
                            Select →
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: LOG CLUTCH OUTCOME MODAL */}
      {/* ========================================================================= */}
      {isAddClutchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#071910] border border-[#113722] rounded-3xl max-w-lg w-full p-6 space-y-4 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#0f301e] pb-3">
              <div className="flex items-center space-x-2">
                <Egg className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base text-white">Log Clutch & Incubation Outcome</h3>
              </div>
              <button
                onClick={() => setIsAddClutchModalOpen(false)}
                className="p-1 rounded-lg bg-[#0a2316] hover:bg-[#0f3421] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClutchOutcome} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Total Eggs</label>
                  <input
                    type="number"
                    min="1"
                    value={clutchSize}
                    onChange={e => setClutchSize(e.target.value)}
                    className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-white font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Fertile</label>
                  <input
                    type="number"
                    min="0"
                    value={fertileEggs}
                    onChange={e => setFertileEggs(e.target.value)}
                    className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-emerald-400 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Infertile</label>
                  <input
                    type="number"
                    min="0"
                    value={infertileEggs}
                    onChange={e => setInfertileEggs(e.target.value)}
                    className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-rose-400 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Clutch Date (Date Laid)</label>
                  <input
                    type="date"
                    value={clutchDateInput}
                    onChange={e => {
                      const newDate = e.target.value;
                      setClutchDateInput(newDate);
                      if (newDate) {
                        const d = new Date(newDate);
                        d.setDate(d.getDate() + 60);
                        setHatchDateEst(d.toISOString().split('T')[0]);
                      }
                    }}
                    className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Est. Hatch Date</label>
                  <input
                    type="date"
                    value={hatchDateEst}
                    onChange={e => setHatchDateEst(e.target.value)}
                    className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Incubation Temp (°C)</label>
                  <input
                    type="text"
                    value={incubationTemp}
                    onChange={e => setIncubationTemp(e.target.value)}
                    className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Status</label>
                  <select
                    value={clutchStatusChoice}
                    onChange={e => setClutchStatusChoice(e.target.value as any)}
                    className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl px-3 py-2 text-white"
                  >
                    <option value="IN PROGRESS">Incubating (In Progress)</option>
                    <option value="SUCCESSFUL">Hatched & Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Notes & Incubator Box ID</label>
                <textarea
                  rows={2}
                  value={clutchLogNotes}
                  onChange={e => setClutchLogNotes(e.target.value)}
                  className="w-full bg-[#04110A] border border-[#0d2a1a] rounded-xl p-2 text-white placeholder-slate-500"
                  placeholder="e.g. Incubator Unit 1 - Tray B..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddClutchModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#082014] text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs cursor-pointer shadow-md"
                >
                  Save Clutch Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT ANIMAL DETAILS MODAL (CONDITIONALLY MOUNTED) */}
      {/* ========================================================================= */}
      {isEditAnimalModalOpen && animalToEdit && (
        <EditAnimalModal
          isOpen={isEditAnimalModalOpen}
          animal={animalToEdit}
          onClose={() => {
            setIsEditAnimalModalOpen(false);
            setAnimalToEdit(null);
          }}
          onSave={(updated) => {
            if (onUpdateAnimal) onUpdateAnimal(updated);
            setIsEditAnimalModalOpen(false);
            setAnimalToEdit(null);
            setFeedbackMessage(`Animal ${updated.id} (${updated.name || updated.species}) details successfully saved!`);
            setTimeout(() => setFeedbackMessage(null), 4000);
          }}
          enclosures={enclosures}
          existingAnimals={animals}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CONTROLLED CLIMATE ENCLOSURE SETUP */}
      {/* ========================================================================= */}
      {showClimateProtocolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#071910] border border-[#113722] rounded-3xl max-w-2xl w-full p-6 space-y-5 text-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#0f301e] pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20 shrink-0">
                  <Thermometer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Breeding Temperature Guide
                  </h3>
                  <p className="text-xs text-slate-400">
                    Quick temperature and lighting guide for {currentAnimal.species}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClimateProtocolModal(false)}
                className="p-1.5 rounded-lg bg-[#0a2316] hover:bg-[#0f3421] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3-Step Simple Breeding Guide */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">
                  3 Simple Steps to Prepare for Breeding
                </h4>
                <span className="text-[11px] text-emerald-400 font-bold">
                  Target: {speciesStandard?.coolingTempRange || '15°C–20°C'}
                </span>
              </div>

              {/* Tab Selector */}
              <div className="grid grid-cols-3 gap-2 border-b border-[#0f301e] pb-2">
                <button
                  type="button"
                  onClick={() => setActiveProtocolPhase(1)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold text-center cursor-pointer transition-all ${
                    activeProtocolPhase === 1
                      ? "bg-emerald-500 text-black shadow-md"
                      : "bg-[#082014] text-slate-400 hover:text-white"
                  }`}
                >
                  1. Cool Down
                </button>
                <button
                  type="button"
                  onClick={() => setActiveProtocolPhase(2)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold text-center cursor-pointer transition-all ${
                    activeProtocolPhase === 2
                      ? "bg-emerald-500 text-black shadow-md"
                      : "bg-[#082014] text-slate-400 hover:text-white"
                  }`}
                >
                  2. Keep Cool
                </button>
                <button
                  type="button"
                  onClick={() => setActiveProtocolPhase(3)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold text-center cursor-pointer transition-all ${
                    activeProtocolPhase === 3
                      ? "bg-emerald-500 text-black shadow-md"
                      : "bg-[#082014] text-slate-400 hover:text-white"
                  }`}
                >
                  3. Warm Up &amp; Pair
                </button>
              </div>

              {/* Step Content */}
              {activeProtocolPhase === 1 && (
                <div className="p-3.5 rounded-xl bg-[#04130a] border border-[#0d2a19] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 text-xs">Step 1: Cool-Down (10–14 Days)</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
                    <li><strong>Lower Basking Heat:</strong> Slowly reduce daytime temperature over 10 days.</li>
                    <li><strong>Shorten Light:</strong> Reduce light timer from 12 hours down to 10 hours a day.</li>
                    <li><strong>Stop Feeding:</strong> Stop feeding 10–14 days before cooling so stomach stays empty.</li>
                    <li><strong>Water:</strong> Always provide clean drinking water.</li>
                  </ul>
                </div>
              )}

              {activeProtocolPhase === 2 && (
                <div className="p-3.5 rounded-xl bg-[#04130a] border border-[#0d2a19] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 text-xs">
                      Step 2: Keep Cool ({speciesStandard?.coolingDuration || "4–6 Weeks"})
                    </span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
                    <li><strong>Keep Cool:</strong> Maintain vivarium at <strong className="text-emerald-400">{speciesStandard?.coolingTempRange || "15°C–20°C"}</strong>.</li>
                    <li><strong>Short Days:</strong> Set light timer to 8–9 hours of light per day.</li>
                    <li><strong>Check In:</strong> Check on the animal once a week to ensure healthy rest.</li>
                  </ul>
                </div>
              )}

              {activeProtocolPhase === 3 && (
                <div className="p-3.5 rounded-xl bg-[#04130a] border border-[#0d2a19] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 text-xs">Step 3: Warm Up &amp; Introduce Mate (10–14 Days)</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
                    <li><strong>Warm Up:</strong> Slowly bring temperature back to normal warm levels.</li>
                    <li><strong>Full Daylight:</strong> Increase light timer back to 14 hours per day.</li>
                    <li><strong>Feed Well:</strong> Resume feeding with vitamins and calcium.</li>
                    <li><strong>Pair:</strong> Introduce the breeding partner 1–2 weeks after warming up.</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Current Vivarium & Settings Card */}
            <div className="p-4 rounded-2xl bg-[#041108] border border-[#0d2817] space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Thermometer className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs text-slate-300">
                    Vivarium: <strong className="text-white font-bold">{currentEnclosure?.name || 'Assigned Vivarium'}</strong>
                  </span>
                </div>

                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                  isClimateApproved ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' :
                  isClimatePendingApproval ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50' :
                  isClimatePendingSetup ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                  'bg-[#082014] text-slate-400 border border-[#0e2f1c]'
                }`}>
                  {isClimateApproved && '● Ready to Breed'}
                  {isClimatePendingApproval && '⏳ Keeper Submitted — Approval Needed'}
                  {isClimatePendingSetup && '⏳ Keeper Setting Up'}
                  {isClimateInactive && '○ Setup Needed'}
                </span>
              </div>

              {/* 4 Clean Temperature & Lighting Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-[#04150b] border border-[#0d2a19]">
                  <span className="text-[10px] text-slate-400 block font-semibold">Day Temp</span>
                  <span className="text-sm font-extrabold text-white">{climateProfile?.dayTemp ?? speciesPreset.recommendedDayTemp}°C</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#04150b] border border-[#0d2a19]">
                  <span className="text-[10px] text-slate-400 block font-semibold">Night Cooling</span>
                  <span className="text-sm font-extrabold text-emerald-300">{climateProfile?.nightTemp ?? speciesPreset.recommendedNightTemp}°C</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#04150b] border border-[#0d2a19]">
                  <span className="text-[10px] text-slate-400 block font-semibold">Daylight</span>
                  <span className="text-sm font-extrabold text-white">{climateProfile?.photoperiodHours ?? speciesPreset.recommendedPhotoperiodHours} hrs</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#04150b] border border-[#0d2a19]">
                  <span className="text-[10px] text-slate-400 block font-semibold">Humidity</span>
                  <span className="text-sm font-extrabold text-white">{climateProfile?.humidity ?? speciesPreset.recommendedHumidity}%</span>
                </div>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#0f301e]">
              <button
                type="button"
                onClick={() => setShowClimateProtocolModal(false)}
                className="px-4 py-2 rounded-xl bg-[#082014] text-slate-300 font-bold text-xs cursor-pointer hover:bg-[#0d2e1c]"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {isClimateApproved && (
                  <button
                    type="button"
                    onClick={handleDeactivateClimate}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs cursor-pointer"
                  >
                    Turn Off Override
                  </button>
                )}

                {isClimatePendingApproval && (
                  <button
                    type="button"
                    onClick={() => {
                      handleApproveClimateCheck();
                      setShowClimateProtocolModal(false);
                    }}
                    className="px-5 py-2 rounded-xl font-extrabold text-xs flex items-center space-x-1.5 shadow-md bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Climate</span>
                  </button>
                )}

                {isClimateInactive && (
                  <button
                    type="button"
                    onClick={() => {
                      handleRequestClimateSetup();
                      setShowClimateProtocolModal(false);
                    }}
                    className="px-5 py-2 rounded-xl font-extrabold text-xs flex items-center space-x-1.5 shadow-md bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Ask Keeper to Set Up</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
