import React, { useState, useMemo } from 'react';
import {
  Heart,
  Calendar,
  Sparkles,
  Egg,
  Moon,
  History,
  Search,
  Filter,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MoreVertical,
  ArrowLeft,
  Plus,
  ChevronLeft,
  ChevronRight,
  Dna,
  Thermometer,
  Droplets,
  Clock,
  FileText,
  Trash2,
  Play,
  ArrowRight,
  ShieldCheck,
  Check,
  Award,
  Layers,
  Info,
  Sun,
  X,
  LayoutGrid,
  List,
  Eye,
  Zap,
  TrendingUp,
  Pencil,
  Edit2,
  UserMinus,
  Sprout,
  CheckSquare,
  PawPrint,
  Baby,
  Link2,
  AlertCircle
} from 'lucide-react';
import { Animal, Enclosure, Task, MedicalRecord, BreedingRecord, BreedingAssessment, BreedingLifecycleStatus, StaffMember } from '../../types';
import {
  SPECIES_BREEDING_STANDARDS,
  SpeciesBreedingStandard,
  evaluateAnimalBreedingReadiness,
  evaluateBreedingPair,
  findSpeciesBreedingStandard
} from '../../utils/breedingStandards';
import {
  isBreedingRecordActive,
  calculateBreedingDayCounts,
  evaluateBreedingProgress,
  transitionBreedingStatus,
  normalizeBreedingStatus,
  calculateHatchRate,
  BREEDING_STAGES,
  LIFECYCLE_ORDER
} from '../../utils/breedingStateMachine';
import { BreedingWizardSection } from './breeding/BreedingWizardSection';
import { BreedingLifecycleTracker } from './breeding/BreedingLifecycleTracker';
import { saveRecord } from '../../lib/dbClient';
import { calculatePreciseAge, getEffectiveSystemDate } from '../../utils/timeUtils';

interface BreedingModuleProps {
  animals: Animal[];
  enclosures?: Enclosure[];
  onUpdateEnclosure?: (enclosure: Enclosure) => void;
  medicalRecords: MedicalRecord[];
  breedingRecords: BreedingRecord[];
  onAddBreedingRecord: (record: BreedingRecord) => void;
  onUpdateBreedingRecord?: (record: BreedingRecord) => void;
  onDeleteBreedingRecord?: (id: string) => void;
  breedingAssessments: BreedingAssessment[];
  onAddBreedingAssessment: (assessment: BreedingAssessment) => void;
  onUpdateBreedingAssessment?: (assessment: BreedingAssessment) => void;
  onDeleteBreedingAssessment?: (id: string) => void;
  onAddTask?: (task: Task) => void;
  onUpdateAnimal?: (animal: Animal) => void;
  staffMembers?: StaffMember[];
  isDarkMode: boolean;
  systemDate?: string;
  onBackToDashboard?: () => void;
  onBack?: () => void;
}

export default function BreedingModule({
  animals,
  enclosures = [],
  onUpdateEnclosure,
  medicalRecords,
  breedingRecords,
  onAddBreedingRecord,
  onUpdateBreedingRecord,
  onDeleteBreedingRecord,
  breedingAssessments,
  onAddBreedingAssessment,
  onUpdateBreedingAssessment,
  onDeleteBreedingAssessment,
  onAddTask,
  onUpdateAnimal,
  staffMembers = [],
  isDarkMode,
  systemDate,
  onBackToDashboard,
  onBack
}: BreedingModuleProps) {
  const handleBack = onBack || onBackToDashboard;
  // Navigation tabs - default to active_pairs so current breeding animals and history are immediately accessible
  const [activeTab, setActiveTab] = useState<'active_pairs' | 'incubation' | 'history' | 'workflow' | 'assessments' | 'standards'>('active_pairs');
  const [selectedWorkflowAnimalId, setSelectedWorkflowAnimalId] = useState<string>(
    animals.find(a => !a.isArchived)?.id || (animals[0]?.id || '')
  );

  const selectedWorkflowAnimal = animals.find(a => a.id === selectedWorkflowAnimalId) || animals[0];

  // Active Breeding View & Modal States
  const [selectedPairForDetail, setSelectedPairForDetail] = useState<BreedingRecord | null>(null);
  const [pairDetailActiveTab, setPairDetailActiveTab] = useState<'timeline' | 'keeper_logs'>('timeline');
  const [isNewPairModalOpen, setIsNewPairModalOpen] = useState(false);
  const [newPairFemaleId, setNewPairFemaleId] = useState('');
  const [newPairMaleId, setNewPairMaleId] = useState('');
  const [newPairSpecies, setNewPairSpecies] = useState('Bearded Dragon');
  const [newPairDate, setNewPairDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPairNotes, setNewPairNotes] = useState('Pairing lock confirmed. Active monitoring for ovulation.');
  const [showAllActive, setShowAllActive] = useState(false);
  const [activeLifecycleFilter, setActiveLifecycleFilter] = useState<'All' | BreedingLifecycleStatus>('All');
  const [breedingSubView, setBreedingSubView] = useState<'pairs' | 'ready_animals'>('pairs');

  // Featured / Selected showcase pair state (matches user's screenshot)
  const [showcasedPairId, setShowcasedPairId] = useState<string | null>(null);
  const [isShowcasePopupOpen, setIsShowcasePopupOpen] = useState(false);
  const [pairListSearch, setPairListSearch] = useState('');

  // Observation Modal state
  const [isLogObservationModalOpen, setIsLogObservationModalOpen] = useState(false);
  const [obsTargetPair, setObsTargetPair] = useState<BreedingRecord | null>(null);
  const [obsType, setObsType] = useState<'Behavior' | 'Courtship' | 'Female Indicators' | 'General'>('Behavior');
  const [obsNotes, setObsNotes] = useState('');
  const [obsWeightGain, setObsWeightGain] = useState('');
  const [obsNesting, setObsNesting] = useState(false);
  const [obsRestless, setObsRestless] = useState(false);
  const [obsLockObserved, setObsLockObserved] = useState(false);
  const [obsAggression, setObsAggression] = useState<'None' | 'Mild' | 'Moderate' | 'Severe'>('None');
  const [obsOther, setObsOther] = useState(false);
  const [obsOtherNotes, setObsOtherNotes] = useState('');

  // Recent Activity History Pop-up Modal State
  const [isActivityHistoryModalOpen, setIsActivityHistoryModalOpen] = useState(false);
  const [activityModalSearch, setActivityModalSearch] = useState('');
  const [activityModalStatusFilter, setActivityModalStatusFilter] = useState<'All' | 'IN PROGRESS' | 'SUCCESSFUL' | 'FAILED'>('All');

  // Filter and Search States for Assessments
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'ELIGIBLE' | 'REVIEW' | 'NOT ELIGIBLE'>('All');
  const [speciesFilter, setSpeciesFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('All');

  // Filter and Search States for Breeding Candidates
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [candidateSpeciesFilter, setCandidateSpeciesFilter] = useState<string>('All');
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<string>('All');

  // Filter and Search States for History
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historySpeciesFilter, setHistorySpeciesFilter] = useState<string>('All');
  const [historyYearFilter, setHistoryYearFilter] = useState<string>('All');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'All' | 'SUCCESSFUL' | 'FAILED' | 'IN PROGRESS'>('All');
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(6);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Modals & Overlays
  const [isNewAssessmentModalOpen, setIsNewAssessmentModalOpen] = useState(false);
  const [selectedAssessmentForDetail, setSelectedAssessmentForDetail] = useState<BreedingAssessment | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // New Assessment Form State
  const [newSelectedSpeciesCode, setNewSelectedSpeciesCode] = useState<string>('SPC-BDR');
  const [newFemaleAnimalId, setNewFemaleAnimalId] = useState<string>('');
  const [newMaleAnimalId, setNewMaleAnimalId] = useState<string>('');
  const [newFemaleWeightInput, setNewFemaleWeightInput] = useState<string>('');
  const [newMaleWeightInput, setNewMaleWeightInput] = useState<string>('');
  const [newAssessmentNotes, setNewAssessmentNotes] = useState<string>('');

  // Clutch Logging Modal State for Active Breeding
  const [isLogClutchModalOpen, setIsLogClutchModalOpen] = useState(false);
  const [selectedPairForClutch, setSelectedPairForClutch] = useState<BreedingRecord | null>(null);
  const [clutchDateInput, setClutchDateInput] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [clutchEstHatchDate, setClutchEstHatchDate] = useState<string>('');
  const [clutchEggsCount, setClutchEggsCount] = useState<number>(12);
  const [fertileEggsCount, setFertileEggsCount] = useState<number>(10);
  const [infertileEggsCount, setInfertileEggsCount] = useState<number>(2);
  const [clutchIncubatorUnit, setClutchIncubatorUnit] = useState<string>('Incubator Unit A1');
  const [clutchIncubationTemp, setClutchIncubationTemp] = useState<string>('31.0°C');
  const [clutchIncubationHumidity, setClutchIncubationHumidity] = useState<string>('');
  const [clutchNotes, setClutchNotes] = useState<string>('');

  // Hatch & Complete Project Modal State
  const [isHatchModalOpen, setIsHatchModalOpen] = useState(false);
  const [selectedPairForHatch, setSelectedPairForHatch] = useState<BreedingRecord | null>(null);
  const [hatchlingsCount, setHatchlingsCount] = useState<number>(0);
  const [unhatchedCount, setUnhatchedCount] = useState<number>(0);
  const [hatchOutcome, setHatchOutcome] = useState<'SUCCESSFUL' | 'FAILED'>('SUCCESSFUL');
  const [hatchNotes, setHatchNotes] = useState<string>('');

  // Historical Breeding Modal State
  const priorYear = new Date().getFullYear() - 1;
  const [isHistoricalBreedingModalOpen, setIsHistoricalBreedingModalOpen] = useState(false);
  const [historicalFemaleId, setHistoricalFemaleId] = useState<string>('');
  const [historicalMaleId, setHistoricalMaleId] = useState<string>('');
  const [historicalSpecies, setHistoricalSpecies] = useState<string>(animals[0]?.species || 'Bearded Dragon');
  const [historicalPairingDate, setHistoricalPairingDate] = useState<string>(`${priorYear}-04-15`);
  const [historicalHatchDate, setHistoricalHatchDate] = useState<string>(`${priorYear}-06-20`);
  const [historicalClutchSize, setHistoricalClutchSize] = useState<number>(18);
  const [historicalHatchlings, setHistoricalHatchlings] = useState<number>(16);
  const [historicalOutcome, setHistoricalOutcome] = useState<'SUCCESSFUL' | 'FAILED' | 'IN PROGRESS'>('SUCCESSFUL');
  const [historicalNotes, setHistoricalNotes] = useState<string>('Healthy incubation and high hatchling vigor.');

  // Edit Breeding Pair Modal State
  const [isEditPairModalOpen, setIsEditPairModalOpen] = useState(false);
  const [editingPair, setEditingPair] = useState<BreedingRecord | null>(null);
  const [editPairDamId, setEditPairDamId] = useState<string>('');
  const [editPairSireId, setEditPairSireId] = useState<string>('');
  const [editPairDate, setEditPairDate] = useState<string>('');
  const [editPairStatus, setEditPairStatus] = useState<BreedingLifecycleStatus>('IN PROGRESS');
  const [editPairClutchSize, setEditPairClutchSize] = useState<number | ''>('');
  const [editPairClutchDate, setEditPairClutchDate] = useState<string>('');
  const [editPairNotes, setEditPairNotes] = useState<string>('');
  const [editPairError, setEditPairError] = useState<string | null>(null);

  // Remove / Unpair Modal State
  const [isRemovePairModalOpen, setIsRemovePairModalOpen] = useState(false);
  const [pairToRemove, setPairToRemove] = useState<BreedingRecord | null>(null);
  const [removeActionType, setRemoveActionType] = useState<'separate' | 'delete'>('separate');
  const [pairToDeleteConfirm, setPairToDeleteConfirm] = useState<BreedingRecord | null>(null);

  const handleOpenEditPair = (rec: BreedingRecord) => {
    setEditingPair(rec);
    setEditPairDamId(rec.femaleId);
    setEditPairSireId(rec.maleId);
    setEditPairDate(rec.breedingDate || '');
    setEditPairStatus(rec.status);
    setEditPairClutchSize(rec.clutchSize !== undefined ? rec.clutchSize : '');
    setEditPairClutchDate(rec.clutchDate || '');
    setEditPairNotes(rec.notes || '');
    setEditPairError(null);
    setIsEditPairModalOpen(true);
  };

  const handleSaveEditPair = () => {
    if (!editingPair) return;
    if (!editPairDamId || !editPairSireId) {
      setEditPairError('Please select both a female (Dam) and male (Sire).');
      return;
    }
    if (editPairDamId === editPairSireId) {
      setEditPairError('Dam and Sire cannot be the same animal.');
      return;
    }
    setEditPairError(null);
    const femObj = animals.find(a => a.id === editPairDamId);
    const maleObj = animals.find(a => a.id === editPairSireId);
    const updated: BreedingRecord = {
      ...editingPair,
      femaleId: editPairDamId,
      maleId: editPairSireId,
      femaleName: femObj?.name || editingPair.femaleName,
      maleName: maleObj?.name || editingPair.maleName,
      femaleImage: femObj?.image || femObj?.imageUrl || femObj?.photoUrl || editingPair.femaleImage,
      maleImage: maleObj?.image || maleObj?.imageUrl || maleObj?.photoUrl || editingPair.maleImage,
      species: femObj?.species || maleObj?.species || editingPair.species,
      breedingDate: editPairDate || editingPair.breedingDate,
      status: editPairStatus,
      clutchSize: editPairClutchSize !== '' ? Number(editPairClutchSize) : undefined,
      clutchDate: editPairClutchDate || undefined,
      notes: editPairNotes
    };
    onUpdateBreedingRecord?.(updated);
    setIsEditPairModalOpen(false);
    setEditingPair(null);
  };

  const handleOpenRemovePair = (rec: BreedingRecord) => {
    setPairToRemove(rec);
    setRemoveActionType('delete');
    setIsRemovePairModalOpen(true);
  };

  const handleConfirmRemovePair = () => {
    if (!pairToRemove) return;
    if (onDeleteBreedingRecord) {
      onDeleteBreedingRecord(pairToRemove.id);
    } else {
      const updated: BreedingRecord = {
        ...pairToRemove,
        status: 'FAILED',
        notes: `${pairToRemove.notes || ''} [Separated & Unpaired on ${new Date().toLocaleDateString()}]`.trim()
      };
      onUpdateBreedingRecord?.(updated);
    }
    setIsRemovePairModalOpen(false);
    setPairToRemove(null);
  };

  // Standards Matrix Search & Filter
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixFamilyFilter, setMatrixFamilyFilter] = useState('All');
  const [matrixViewMode, setMatrixViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedStandardDetail, setSelectedStandardDetail] = useState<SpeciesBreedingStandard | null>(null);

  // 1. Filtered Assessments
  const filteredAssessments = useMemo(() => {
    return breedingAssessments.filter(item => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.pairId.toLowerCase().includes(q) ||
        item.species.toLowerCase().includes(q) ||
        item.femaleId.toLowerCase().includes(q) ||
        item.maleId.toLowerCase().includes(q) ||
        item.scientificName.toLowerCase().includes(q);

      // Status
      const matchStatus = statusFilter === 'All' || item.status === statusFilter;

      // Species
      const matchSpecies = speciesFilter === 'All' || item.species.toLowerCase() === speciesFilter.toLowerCase();

      // Date
      let matchDate = true;
      if (dateFilter === 'Today') {
        const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        matchDate = item.assessmentDate.includes(todayStr);
      } else if (dateFilter === 'This Month') {
        const thisMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
        matchDate = item.assessmentDate.includes(thisMonth);
      }

      return matchSearch && matchStatus && matchSpecies && matchDate;
    });
  }, [breedingAssessments, searchQuery, statusFilter, speciesFilter, dateFilter]);

  // Pagination Slice
  const totalResults = filteredAssessments.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / rowsPerPage));
  const paginatedAssessments = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredAssessments.slice(start, start + rowsPerPage);
  }, [filteredAssessments, currentPage, rowsPerPage]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setSpeciesFilter('All');
    setDateFilter('All');
    setCurrentPage(1);
  };

  // 2. Compute Metric KPI Cards
  const kpiStats = useMemo(() => {
    const totalAssessments = breedingAssessments.length;
    const eligibleCount = breedingAssessments.filter(a => a.status === 'ELIGIBLE').length;
    const reviewCount = breedingAssessments.filter(a => a.status === 'REVIEW').length;

    const activePairs = breedingRecords.filter(b => isBreedingRecordActive(b));
    const totalActivePairsCount = activePairs.length;

    // Total eggs incubating + hatched
    let totalEggsIncubating = 0;
    let totalHatched = 0;
    breedingRecords.forEach(b => {
      totalEggsIncubating += (b.unhatchedEggs || (b.clutchSize ? b.clutchSize - (b.hatchlings || 0) : 0));
      totalHatched += (b.hatchlings || 0);
    });
    const totalEggsOffspring = totalEggsIncubating + totalHatched;

    // Resting Females (females that completed breeding in past 12 mos)
    const completedBreeds = breedingRecords.filter(b => b.status === 'COMPLETED' || b.status === 'SUCCESSFUL');
    const restingFemaleIds = new Set(completedBreeds.map(b => b.femaleId));

    // Breeding history this year
    const thisYearCount = breedingRecords.filter(b => {
      const yr = new Date(b.breedingDate).getFullYear();
      return yr === new Date().getFullYear();
    }).length;

    return {
      totalAssessments,
      eligibleCount,
      reviewCount,
      totalActivePairsCount,
      totalEggsOffspring,
      totalEggsIncubating,
      totalHatched,
      restingFemalesCount: restingFemaleIds.size,
      breedingHistoryCount: thisYearCount
    };
  }, [breedingAssessments, breedingRecords]);

  // Breeding Lifecycle Tracked Records and Stage Counts
  const allActiveBreedingRecords = useMemo(() => {
    return breedingRecords.filter(r => isBreedingRecordActive(r));
  }, [breedingRecords]);

  const filteredActiveBreedingRecords = useMemo(() => {
    if (activeLifecycleFilter === 'All') return allActiveBreedingRecords;
    return allActiveBreedingRecords.filter(r => normalizeBreedingStatus(r.status) === activeLifecycleFilter);
  }, [allActiveBreedingRecords, activeLifecycleFilter]);

  const breedingLifecycleStatusCounts = useMemo(() => {
    return {
      All: allActiveBreedingRecords.length,
      PAIRED: allActiveBreedingRecords.filter(r => normalizeBreedingStatus(r.status) === 'PAIRED').length,
      'IN PROGRESS': allActiveBreedingRecords.filter(r => normalizeBreedingStatus(r.status) === 'IN PROGRESS').length,
      'POSSIBLE MATED': allActiveBreedingRecords.filter(r => normalizeBreedingStatus(r.status) === 'POSSIBLE MATED').length,
      'LIKELY MATED': allActiveBreedingRecords.filter(r => normalizeBreedingStatus(r.status) === 'LIKELY MATED').length,
      'CLUTCH RECORDED': allActiveBreedingRecords.filter(r => normalizeBreedingStatus(r.status) === 'CLUTCH RECORDED').length,
      'INCUBATING': allActiveBreedingRecords.filter(r => normalizeBreedingStatus(r.status) === 'INCUBATING').length,
    };
  }, [allActiveBreedingRecords]);

  // Current Seasonal Context (Month & Next Month)
  const currentMonthIndex = new Date().getMonth();
  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long' });
  const nextMonthIndex = (currentMonthIndex + 1) % 12;
  const nextMonthName = new Date(new Date().getFullYear(), nextMonthIndex, 1).toLocaleDateString('en-US', { month: 'long' });

  // Facility-wide seasonal breeding intelligence
  const seasonalRosterData = useMemo(() => {
    const activeAnimals = animals.filter(a => !a.isArchived);

    // In-season animals currently
    const inSeasonAnimals = activeAnimals.filter(a => {
      const std = findSpeciesBreedingStandard(a.species);
      return std ? std.pairingSeasonMonths.includes(currentMonthIndex) : (currentMonthIndex >= 2 && currentMonthIndex <= 8);
    });

    // Animals resting off-season
    const offSeasonAnimals = activeAnimals.filter(a => !inSeasonAnimals.some(ia => ia.id === a.id));

    // Animals entering breeding season next month
    const upcomingAnimals = activeAnimals.filter(a => {
      const std = findSpeciesBreedingStandard(a.species);
      const willBeInNext = std ? std.pairingSeasonMonths.includes(nextMonthIndex) : false;
      const isAlreadyIn = inSeasonAnimals.some(ia => ia.id === a.id);
      return willBeInNext && !isAlreadyIn;
    });

    // Actively paired animals
    const activePairedAnimals = activeAnimals.filter(a =>
      breedingRecords.some(r => r.status === 'IN PROGRESS' && (r.femaleId === a.id || r.maleId === a.id))
    );

    // Ready for pairing animals
    const readyForPairingAnimals = activeAnimals.filter(a => a.breedingStatus === 'Ready for Pairing');

    return {
      activeAnimals,
      inSeasonAnimals,
      offSeasonAnimals,
      upcomingAnimals,
      activePairedAnimals,
      readyForPairingAnimals
    };
  }, [animals, breedingRecords, currentMonthIndex, nextMonthIndex]);

  // Handle Species Selection in Modal
  const selectedStandard = useMemo(() => {
    return SPECIES_BREEDING_STANDARDS.find(s => s.code === newSelectedSpeciesCode) || SPECIES_BREEDING_STANDARDS[0];
  }, [newSelectedSpeciesCode]);

  // Filter animals of this species
  const femaleCandidates = useMemo(() => {
    return animals.filter(a => {
      const matchSpecies = selectedStandard.aliases.some(alias => (a.species || '').toLowerCase().includes(alias.toLowerCase()));
      const isFemale = (a.sex || '').toLowerCase().startsWith('f');
      return (!a.isArchived && isFemale) || matchSpecies;
    });
  }, [animals, selectedStandard]);

  const maleCandidates = useMemo(() => {
    return animals.filter(a => {
      const matchSpecies = selectedStandard.aliases.some(alias => (a.species || '').toLowerCase().includes(alias.toLowerCase()));
      const isMale = (a.sex || '').toLowerCase().startsWith('m');
      return (!a.isArchived && isMale) || matchSpecies;
    });
  }, [animals, selectedStandard]);

  // Live Pair Assessment Calculation in Modal
  const liveModalEvaluation = useMemo(() => {
    const femaleObj = animals.find(a => a.id === newFemaleAnimalId) || {
      id: newFemaleAnimalId || 'FEM-CANDIDATE',
      name: 'Female Candidate',
      species: selectedStandard.name,
      sex: 'Female',
      weight: parseFloat(newFemaleWeightInput) || selectedStandard.minWeightGramsFemale,
      dob: '2024-01-01',
      healthStatus: 'Healthy'
    };

    const maleObj = animals.find(a => a.id === newMaleAnimalId) || {
      id: newMaleAnimalId || 'MALE-CANDIDATE',
      name: 'Male Candidate',
      species: selectedStandard.name,
      sex: 'Male',
      weight: parseFloat(newMaleWeightInput) || selectedStandard.minWeightGramsMale,
      dob: '2024-06-01',
      healthStatus: 'Healthy'
    };

    return evaluateBreedingPair(femaleObj, maleObj, medicalRecords, breedingRecords);
  }, [selectedStandard, newFemaleAnimalId, newMaleAnimalId, newFemaleWeightInput, newMaleWeightInput, animals, medicalRecords, breedingRecords]);

  // Open New Assessment Modal
  const handleOpenNewAssessmentModal = (speciesCode?: string) => {
    setNewSelectedSpeciesCode(speciesCode || 'SPC-BDR');
    setNewFemaleAnimalId('');
    setNewMaleAnimalId('');
    setNewFemaleWeightInput('385');
    setNewMaleWeightInput('330');
    setNewAssessmentNotes('');
    setIsNewAssessmentModalOpen(true);
  };

  // Submit New Assessment
  const handleSaveAssessment = (startActiveLock: boolean = false) => {
    const standard = selectedStandard;
    const femObj = animals.find(a => a.id === newFemaleAnimalId);
    const maleObj = animals.find(a => a.id === newMaleAnimalId);

    const pairId = `${newFemaleAnimalId || 'F-001'} x ${newMaleAnimalId || 'M-001'}`;
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    let status: 'ELIGIBLE' | 'REVIEW' | 'NOT ELIGIBLE' = 'ELIGIBLE';
    let resultTitle = 'All requirements met.';
    let resultSubtitle = 'Pair is eligible for breeding.';

    if (liveModalEvaluation.overallStatus === 'QUALIFIED') {
      status = 'ELIGIBLE';
      resultTitle = 'All requirements met.';
      resultSubtitle = 'Pair is eligible for breeding.';
    } else if (liveModalEvaluation.overallStatus === 'CONDITIONAL') {
      status = 'REVIEW';
      resultTitle = 'Some requirements need review.';
      resultSubtitle = 'Check details for more information.';
    } else {
      status = 'NOT ELIGIBLE';
      resultTitle = 'Requirements not met.';
      resultSubtitle = 'See details for reasons.';
    }

    const newAssessment: BreedingAssessment = {
      id: `BA-${Date.now().toString().slice(-6)}`,
      pairId,
      femaleId: newFemaleAnimalId || 'F-001',
      maleId: newMaleAnimalId || 'M-001',
      femaleName: femObj?.name || 'Female Candidate',
      maleName: maleObj?.name || 'Male Candidate',
      femaleImage: femObj?.image || 'https://images.unsplash.com/photo-1574063413132-355dbfd83e0c?auto=format&fit=crop&q=80&w=200',
      maleImage: maleObj?.image || 'https://images.unsplash.com/photo-1574063413132-355dbfd83e0c?auto=format&fit=crop&q=80&w=200',
      species: standard.name,
      scientificName: standard.scientificName,
      speciesCode: standard.code,
      assessmentDate: dateFormatted,
      assessmentTime: timeFormatted,
      status,
      resultTitle,
      resultSubtitle,
      compatibilityScore: liveModalEvaluation.compatibilityScore,
      femaleAgeMonths: liveModalEvaluation.femaleEval.ageMonths,
      femaleWeight: parseFloat(newFemaleWeightInput) || femObj?.weight || standard.minWeightGramsFemale,
      maleAgeMonths: liveModalEvaluation.maleEval.ageMonths,
      maleWeight: parseFloat(newMaleWeightInput) || maleObj?.weight || standard.minWeightGramsMale,
      agePassed: liveModalEvaluation.femaleEval.agePassed && liveModalEvaluation.maleEval.agePassed,
      weightPassed: liveModalEvaluation.femaleEval.weightPassed && liveModalEvaluation.maleEval.weightPassed,
      healthPassed: liveModalEvaluation.femaleEval.healthPassed && liveModalEvaluation.maleEval.healthPassed,
      seasonPassed: liveModalEvaluation.femaleEval.seasonPassed,
      coolingPassed: true,
      cooldownPassed: liveModalEvaluation.femaleEval.cooldownPassed,
      failureReasons: [...liveModalEvaluation.femaleEval.failureReasons, ...liveModalEvaluation.maleEval.failureReasons],
      warnings: [...liveModalEvaluation.femaleEval.warnings, ...liveModalEvaluation.maleEval.warnings],
      recommendations: standard.brumationCoolingRequired !== 'N/A'
        ? [`Pre-breeding prep: ${standard.brumationCoolingRequired} at ${standard.coolingTempRange} for ${standard.coolingDuration}`]
        : [],
      gestationPreLay: standard.gestationPreLayPeriod,
      avgClutchSize: standard.avgClutchLitterSize,
      incubationTemp: standard.incubationTempTarget,
      incubationHumidity: standard.incubationHumidity,
      incubationPeriod: standard.incubationPeriod,
      postLayRest: standard.postLayRestFemale,
      notes: newAssessmentNotes,
      assessedBy: 'Admin',
      createdAt: now.toISOString()
    };

    onAddBreedingAssessment(newAssessment);

    if (startActiveLock) {
      const fem = animals.find(a => a.id === newAssessment.femaleId);
      const mal = animals.find(a => a.id === newAssessment.maleId);
      const newBreedingRecord: BreedingRecord = {
        id: `BRD-${Date.now().toString().slice(-6)}`,
        femaleId: newAssessment.femaleId,
        maleId: newAssessment.maleId,
        femaleName: newAssessment.femaleName || fem?.name,
        maleName: newAssessment.maleName || mal?.name,
        femaleImage: newAssessment.femaleImage || fem?.image || fem?.imageUrl || fem?.photoUrl,
        maleImage: newAssessment.maleImage || mal?.image || mal?.imageUrl || mal?.photoUrl,
        species: standard.name,
        breedingType: 'Natural Mating',
        breedingDate: now.toISOString().split('T')[0],
        status: 'IN PROGRESS',
        notes: `Pair locked and introduced following assessment ${newAssessment.id}. Target Incubation: ${standard.incubationTempTarget}.`,
        createdBy: 'Admin',
        createdAt: now.toISOString()
      };
      onAddBreedingRecord(newBreedingRecord);
    }

    setIsNewAssessmentModalOpen(false);
  };

  // Helper to reliably find an animal by ID or name
  // Helper to reliably find an animal by ID or name
  const findAnimalRecord = (idOrName?: string, secondaryName?: string): Animal | undefined => {
    if (!idOrName && !secondaryName) return undefined;
    const cleanId = (idOrName || '').trim().toLowerCase();
    const cleanSec = (secondaryName || '').trim().toLowerCase();

    // 1. Exact ID match
    if (cleanId) {
      const direct = animals.find(a => a.id && a.id.trim().toLowerCase() === cleanId);
      if (direct) return direct;
    }

    // 2. Exact Name match
    if (cleanSec) {
      const bySecName = animals.find(a => a.name && a.name.trim().toLowerCase() === cleanSec);
      if (bySecName) return bySecName;
    }
    if (cleanId) {
      const byIdName = animals.find(a => a.name && a.name.trim().toLowerCase() === cleanId);
      if (byIdName) return byIdName;
    }

    // 3. Substring / Token matching
    return animals.find(a => {
      const aId = (a.id || '').trim().toLowerCase();
      const aName = (a.name || '').trim().toLowerCase();
      if (!aId && !aName) return false;
      return (
        (cleanId && (cleanId.includes(aId) || (aId.length > 2 && aId.includes(cleanId)))) ||
        (aName && cleanId && (cleanId.includes(aName) || aName.includes(cleanId))) ||
        (aName && cleanSec && (cleanSec.includes(aName) || aName.includes(cleanSec)))
      );
    });
  };

  // Reliable species photo fallback
  const getAnimalSpeciesFallbackPhoto = (speciesName?: string) => {
    const sp = (speciesName || '').toLowerCase();
    if (sp.includes('ball python') || sp.includes('python')) {
      return 'https://images.unsplash.com/photo-1531386151447-fd76ad50012f?auto=format&fit=crop&q=80&w=600';
    }
    if (sp.includes('crested gecko')) {
      return 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&q=80&w=600';
    }
    if (sp.includes('bearded dragon')) {
      return 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&q=80&w=600';
    }
    if (sp.includes('corn snake')) {
      return 'https://images.unsplash.com/photo-1574063413132-355dbfd83e0c?auto=format&fit=crop&q=80&w=600';
    }
    if (sp.includes('leopard gecko')) {
      return 'https://images.unsplash.com/photo-1508455858334-95337ba25607?auto=format&fit=crop&q=80&w=600';
    }
    return 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&q=80&w=600';
  };

  // Reliable resolver prioritizing animal record photo from Animal section, record image, or species fallback
  const resolveAnimalPhoto = (animal?: Animal, directRecordUrl?: string, speciesName?: string) => {
    // 1. Always prioritize the live animal profile image from the Animal section
    if (animal?.image && animal.image.trim()) return animal.image.trim();
    if (animal?.imageUrl && animal.imageUrl.trim()) return animal.imageUrl.trim();
    if (animal?.photoUrl && animal.photoUrl.trim()) return animal.photoUrl.trim();
    // 2. If record has an image URL saved directly
    if (directRecordUrl && directRecordUrl.trim()) return directRecordUrl.trim();
    // 3. Fallback to species photo
    return getAnimalSpeciesFallbackPhoto(animal?.species || speciesName);
  };

  // Convert Assessment to Active Breeding Record
  const handlePromoteToActiveLock = (assessment: BreedingAssessment) => {
    const std = findSpeciesBreedingStandard(assessment.species) || SPECIES_BREEDING_STANDARDS[0];
    const fem = findAnimalRecord(assessment.femaleId, assessment.femaleName);
    const mal = findAnimalRecord(assessment.maleId, assessment.maleName);
    const newBreedingRecord: BreedingRecord = {
      id: `BRD-${Date.now().toString().slice(-6)}`,
      femaleId: assessment.femaleId,
      maleId: assessment.maleId,
      femaleName: assessment.femaleName || fem?.name,
      maleName: assessment.maleName || mal?.name,
      femaleImage: (fem?.image || fem?.imageUrl || fem?.photoUrl || assessment.femaleImage || '').trim() || undefined,
      maleImage: (mal?.image || mal?.imageUrl || mal?.photoUrl || assessment.maleImage || '').trim() || undefined,
      species: assessment.species,
      breedingType: 'Natural Mating',
      breedingDate: new Date().toISOString().split('T')[0],
      status: 'IN PROGRESS',
      notes: `Pair lock confirmed from assessment ${assessment.id}. Incubation target: ${std.incubationTempTarget} @ ${std.incubationHumidity}.`,
      createdBy: 'Admin',
      createdAt: new Date().toISOString()
    };
    onAddBreedingRecord(newBreedingRecord);
    setSelectedAssessmentForDetail(null);
    setActiveTab('active_pairs');
  };

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Recent breeding activity list matching user design & context
  const recentActivities = useMemo(() => {
    const realMapped = (breedingRecords || []).map(rec => {
      const female = findAnimalRecord(rec.femaleId, rec.femaleName);
      const male = findAnimalRecord(rec.maleId, rec.maleName);
      const speciesName = rec.species || female?.species || male?.species || 'Bearded Dragon';
      const femaleImg = resolveAnimalPhoto(female, rec.femaleImage, speciesName);
      const maleImg = resolveAnimalPhoto(male, rec.maleImage, speciesName);
      const femaleName = female?.name || rec.femaleName || rec.femaleId;
      const maleName = male?.name || rec.maleName || rec.maleId;
      const pairStr = `${femaleName} × ${maleName}`;

      let stage: 'Monitoring' | 'Clutch' | 'Incubation' | 'Outcome' | 'History' = 'Monitoring';
      const statusNorm = normalizeBreedingStatus(rec.status);
      if (statusNorm === 'PAIRED' || statusNorm === 'IN PROGRESS' || statusNorm === 'POSSIBLE MATED' || statusNorm === 'LIKELY MATED') {
        stage = 'Monitoring';
      } else if (statusNorm === 'CLUTCH RECORDED') {
        stage = 'Clutch';
      } else if (statusNorm === 'INCUBATING') {
        stage = 'Incubation';
      } else {
        stage = 'Outcome';
      }

      const statusBadge: 'In Progress' | 'Completed' =
        statusNorm === 'COMPLETED' || statusNorm === 'FAILED' ? 'Completed' : 'In Progress';

      return {
        id: rec.id,
        date: formatDisplayDate(rec.breedingDate || rec.clutchDate || rec.createdAt || '2025-05-18'),
        species: speciesName,
        pair: pairStr,
        femaleId: rec.femaleId,
        maleId: rec.maleId,
        femaleName,
        maleName,
        femaleImg,
        maleImg,
        stage,
        status: statusBadge,
        record: rec as BreedingRecord | undefined
      };
    });

    return realMapped;
  }, [breedingRecords, animals]);

  // Top 4 Stat Counts matching user's design reference
  const activeBreedingCount = useMemo(() => {
    return breedingRecords.filter(r => isBreedingRecordActive(r)).length;
  }, [breedingRecords]);

  const totalClutchesCount = useMemo(() => {
    return breedingRecords.filter(r => r.clutchDate || (r.clutchSize && r.clutchSize > 0)).length;
  }, [breedingRecords]);

  const incubationCount = useMemo(() => {
    return breedingRecords.filter(r => r.status === 'INCUBATING').length;
  }, [breedingRecords]);

  const breedingHistoryCount = useMemo(() => {
    return breedingRecords.filter(r => r.status === 'SUCCESSFUL' || r.status === 'COMPLETED' || r.status === 'FAILED').length;
  }, [breedingRecords]);

  // Active breeding pairs for list display (matching user's request)
  const activeBreedingList = useMemo<BreedingRecord[]>(() => {
    const list = [...breedingRecords.filter(r => isBreedingRecordActive(r))];
    
    // Auto-detect any active in-progress pairings from animals not already in breedingRecords
    const pairedAnimalIds = new Set<string>();
    list.forEach(r => {
      if (r.femaleId) pairedAnimalIds.add(r.femaleId.toLowerCase());
      if (r.maleId) pairedAnimalIds.add(r.maleId.toLowerCase());
    });

    // 1. Auto-detect from breedingAssessments where partnerId or pairId is assigned
    (breedingAssessments || []).forEach(asm => {
      if (asm.animalId && asm.partnerId) {
        const a1 = (animals || []).find(a => a.id.toLowerCase() === asm.animalId?.toLowerCase());
        const a2 = (animals || []).find(a => a.id.toLowerCase() === asm.partnerId?.toLowerCase());
        if (a1 && a2 && !pairedAnimalIds.has(a1.id.toLowerCase()) && !pairedAnimalIds.has(a2.id.toLowerCase())) {
          const female = (a1.sex || '').toLowerCase().startsWith('f') ? a1 : a2;
          const male = (a1.sex || '').toLowerCase().startsWith('f') ? a2 : a1;
          const synthRecord: BreedingRecord = {
            id: asm.pairId || `PAIR-${female.id}-${male.id}`,
            femaleId: female.id,
            maleId: male.id,
            femaleName: female.name || female.id,
            maleName: male.name || male.id,
            femaleImage: female.photoUrl || female.image || female.imageUrl,
            maleImage: male.photoUrl || male.image || male.imageUrl,
            species: female.species || male.species,
            breedingType: 'Natural Mating',
            breedingDate: asm.assessmentDate || new Date().toISOString().split('T')[0],
            status: 'IN PROGRESS',
            notes: asm.notes || `Active pairing lock established between ${female.id} and ${male.id}.`,
            createdAt: asm.assessmentDate || new Date().toISOString().split('T')[0],
          };
          pairedAnimalIds.add(female.id.toLowerCase());
          pairedAnimalIds.add(male.id.toLowerCase());
          list.push(synthRecord);
        }
      }
    });

    // 2. Auto-detect from in-progress / ready animals
    const inProgressAnimals = (animals || []).filter(a => 
      !a.isArchived && 
      (a.breedingStatus === 'In Progress' || a.breedingStatus === 'Ready for Pairing' || (a.breedingStatus as string) === 'Paired')
    );
    // Group by enclosure or species pairs
    const enclosureGroups: Record<string, Animal[]> = {};
    inProgressAnimals.forEach(a => {
      const encKey = a.enclosureId || `species-${a.species}`;
      if (!enclosureGroups[encKey]) enclosureGroups[encKey] = [];
      enclosureGroups[encKey].push(a);
    });

    Object.entries(enclosureGroups).forEach(([encKey, group]) => {
      const females = group.filter(a => (a.sex || '').toLowerCase().startsWith('f') && !pairedAnimalIds.has(a.id.toLowerCase()));
      const males = group.filter(a => (a.sex || '').toLowerCase().startsWith('m') && !pairedAnimalIds.has(a.id.toLowerCase()));
      
      const pairCount = Math.min(females.length, males.length);
      for (let i = 0; i < pairCount; i++) {
        const fem = females[i];
        const mal = males[i];
        const encObj = (enclosures || []).find(e => e.id === encKey);
        const synthRecord: BreedingRecord = {
          id: `PAIR-${fem.id}-${mal.id}`,
          femaleId: fem.id,
          maleId: mal.id,
          femaleName: fem.name || fem.id,
          maleName: mal.name || mal.id,
          femaleImage: fem.image || fem.imageUrl || fem.photoUrl,
          maleImage: mal.image || mal.imageUrl || mal.photoUrl,
          species: fem.species || mal.species,
          breedingType: 'Natural Mating',
          breedingDate: new Date().toISOString().split('T')[0],
          status: 'IN PROGRESS',
          notes: `Pair currently housed in ${encObj?.name || 'breeding habitat'}. Active reproductive cycle.`,
          createdAt: new Date().toISOString().split('T')[0],
        };
        pairedAnimalIds.add(fem.id.toLowerCase());
        pairedAnimalIds.add(mal.id.toLowerCase());
        list.push(synthRecord);
      }
    });

    return list;
  }, [breedingRecords, breedingAssessments, animals, enclosures]);

  // Compute individual animals marked for breeding but not yet paired in an active pair
  const eligibleAnimals = useMemo(() => {
    const pairedIds = new Set<string>();
    activeBreedingList.forEach(r => {
      if (r.femaleId) pairedIds.add(r.femaleId.toLowerCase());
      if (r.maleId) pairedIds.add(r.maleId.toLowerCase());
    });
    return animals.filter(a => 
      !a.isArchived && 
      (a.breedingStatus === 'Ready for Pairing' || a.breedingStatus === 'In Progress') &&
      !pairedIds.has(a.id.toLowerCase())
    );
  }, [animals, activeBreedingList]);

  const filteredActivePairs = useMemo(() => {
    if (!pairListSearch.trim()) return activeBreedingList;
    const q = pairListSearch.toLowerCase().trim();
    return activeBreedingList.filter(p => {
      const fName = (p.femaleName || p.femaleId || '').toLowerCase();
      const mName = (p.maleName || p.maleId || '').toLowerCase();
      const sp = (p.species || '').toLowerCase();
      const pid = (p.id || '').toLowerCase();
      return pid.includes(q) || fName.includes(q) || mName.includes(q) || sp.includes(q);
    });
  }, [activeBreedingList, pairListSearch]);

  // Featured / Showcased pair for top showcase card & popup modal
  const showcasedPair = useMemo<BreedingRecord>(() => {
    let rec: BreedingRecord | undefined;
    if (showcasedPairId) {
      rec = breedingRecords.find(r => r.id === showcasedPairId) || activeBreedingList.find(r => r.id === showcasedPairId);
    }
    if (!rec) rec = breedingRecords.find(r => isBreedingRecordActive(r));
    if (!rec && activeBreedingList.length > 0) rec = activeBreedingList[0];
    if (!rec && breedingRecords.length > 0) rec = breedingRecords[0];

    if (!rec) {
      return {
        id: 'BRD-8586',
        femaleId: 'BDR-002',
        maleId: 'BDR-001',
        femaleName: 'BDR-002',
        maleName: 'BDR-001',
        species: 'Bearded Dragon',
        breedingType: 'Natural Mating',
        breedingDate: '2026-10-04',
        startedBreedingDate: '2026-10-04',
        status: 'IN PROGRESS',
        notes: 'Active pairing under temperature cycling. Both adults feeding well and exhibiting receptive behavior.',
        createdAt: '2026-10-04'
      };
    }

    // If pair was created for current date and has no recorded hatchlings/clutch size, default to IN PROGRESS
    if (rec.breedingDate === '2026-10-04' && (!rec.clutchSize || rec.clutchSize === 0) && (!rec.hatchlings || rec.hatchlings === 0)) {
      return {
        ...rec,
        status: 'IN PROGRESS'
      };
    }

    return rec;
  }, [showcasedPairId, breedingRecords, activeBreedingList]);

  const showcasedFemale = findAnimalRecord(showcasedPair.femaleId, showcasedPair.femaleName);
  const showcasedMale = findAnimalRecord(showcasedPair.maleId, showcasedPair.maleName);
  const showcasedSpecies = showcasedPair.species || showcasedFemale?.species || showcasedMale?.species || 'Bearded Dragon';

  const showcasedFemaleImg = resolveAnimalPhoto(showcasedFemale, showcasedPair.femaleImage, showcasedSpecies);
  const showcasedMaleImg = resolveAnimalPhoto(showcasedMale, showcasedPair.maleImage, showcasedSpecies);

  const showcasedFemaleCode = showcasedFemale?.id || showcasedPair.femaleId || 'BDR-001';
  const showcasedMaleCode = showcasedMale?.id || showcasedPair.maleId || 'BDR-002';

  const getAnimalDisplayAge = (animal?: Animal) => {
    if (!animal) return '2 yrs 4 mo';
    if ((animal as any).age) return (animal as any).age;
    if (animal.dob) {
      try {
        const res = calculatePreciseAge(animal.dob, getEffectiveSystemDate());
        if (res && !res.isFuture) return res.shortText;
      } catch {
        return 'Unknown';
      }
    }
    return 'Unknown';
  };

  const showcasedFemaleAge = getAnimalDisplayAge(showcasedFemale);
  const showcasedFemaleWeight = showcasedFemale?.weight ? `${showcasedFemale.weight} g` : '360 g';

  const showcasedMaleAge = getAnimalDisplayAge(showcasedMale);
  const showcasedMaleWeight = showcasedMale?.weight ? `${showcasedMale.weight} g` : '340 g';

  const visualStages = ['Pairing', 'Monitoring', 'Clutch', 'Incubation', 'Outcome'] as const;

  const getStageDate = (stage: typeof visualStages[number]) => {
    const rawDate = showcasedPair?.breedingDate || showcasedPair?.startedBreedingDate || showcasedPair?.createdAt || '2026-10-04';
    const baseDate = new Date(rawDate);
    const validBase = isNaN(baseDate.getTime()) ? new Date('2026-10-04') : baseDate;
    
    const formatShortDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const addDays = (d: Date, days: number) => {
      const copy = new Date(d);
      copy.setDate(copy.getDate() + days);
      return copy;
    };

    const std = findSpeciesBreedingStandard(showcasedSpecies);
    
    // Parse gestation/pre-lay days based on species biological standard (e.g. Bearded Dragon is 30–45 days)
    let gestMin = 30;
    let gestMax = 45;
    if (std?.gestationPreLayPeriod) {
      const match = std.gestationPreLayPeriod.match(/(\d+)\s*[-–~]\s*(\d+)/);
      if (match) {
        gestMin = parseInt(match[1]);
        gestMax = parseInt(match[2]);
      }
    }

    // Parse incubation days based on species biological standard (e.g. Bearded Dragon is 50–70 days)
    let incMin = std?.incubationPeriodMinDays || 50;
    let incMax = std?.incubationPeriodMaxDays || 70;
    if (std?.incubationPeriod) {
      const match = std.incubationPeriod.match(/(\d+)\s*[-–~]\s*(\d+)/);
      if (match) {
        incMin = parseInt(match[1]);
        incMax = parseInt(match[2]);
      }
    }

    // Calculate dates based on species biological standards
    const estClutchStart = addDays(validBase, gestMin);
    const estClutchEnd = addDays(validBase, gestMax);

    // If pair has actual recorded clutch date after breeding date, use recorded date
    let actualClutchDate: Date | null = null;
    if (showcasedPair?.clutchDate) {
      const d = new Date(showcasedPair.clutchDate);
      if (!isNaN(d.getTime()) && d > validBase) {
        actualClutchDate = d;
      }
    }

    const clutchAnchorDate = actualClutchDate || estClutchStart;
    const estOutcomeStart = addDays(clutchAnchorDate, incMin);
    const estOutcomeEnd = addDays(clutchAnchorDate, incMax);

    switch (stage) {
      case 'Pairing': {
        return `${formatShortDate(validBase)} – ${formatShortDate(addDays(validBase, 7))}`;
      }
      case 'Monitoring': {
        if (showcasedPair?.possibleMatedDate || showcasedPair?.likelyMatedDate) {
          const d = new Date(showcasedPair.possibleMatedDate || showcasedPair.likelyMatedDate!);
          if (!isNaN(d.getTime()) && d >= validBase) return `${formatShortDate(d)} – ${formatShortDate(addDays(d, 7))}`;
        }
        return `${formatShortDate(validBase)} – ${formatShortDate(addDays(validBase, 7))}`;
      }
      case 'Clutch': {
        if (actualClutchDate) {
          return `${formatShortDate(actualClutchDate)} – ${formatShortDate(addDays(actualClutchDate, 15))}`;
        }
        return `Est. ${formatShortDate(estClutchStart)} – ${formatShortDate(estClutchEnd)}`;
      }
      case 'Incubation': {
        if (actualClutchDate) return `${formatShortDate(clutchAnchorDate)} – ${formatShortDate(addDays(clutchAnchorDate, 30))}`;
        return `Est. ${formatShortDate(clutchAnchorDate)} – ${formatShortDate(addDays(clutchAnchorDate, 30))}`;
      }
      case 'Outcome': {
        if (showcasedPair?.hatchDate) {
          const d = new Date(showcasedPair.hatchDate);
          if (!isNaN(d.getTime())) return `${formatShortDate(d)} – ${formatShortDate(addDays(d, 15))}`;
        }
        return `Est. ${formatShortDate(estOutcomeStart)} – ${formatShortDate(estOutcomeEnd)}`;
      }
    }
  };

  const showcasedStageIndex = useMemo(() => {
    const status = normalizeBreedingStatus(showcasedPair.status);
    if (status === 'PAIRED') return 0;
    if (['IN PROGRESS', 'POSSIBLE MATED', 'LIKELY MATED'].includes(status)) return 1;
    if (status === 'CLUTCH RECORDED') return 2;
    if (status === 'INCUBATING') return 3;
    return 4;
  }, [showcasedPair]);

  const showcasedStageInfo = useMemo(() => {
    switch (showcasedStageIndex) {
      case 0:
        return {
          currentLabel: 'Pairing',
          nextAction: 'Introduce animals to breeding habitat and verify lock behaviors.',
          statusBadge: 'PAIRED'
        };
      case 1:
        return {
          currentLabel: 'Monitoring',
          nextAction: 'Continue monitoring the pair until a clutch is recorded.',
          statusBadge: 'IN PROGRESS'
        };
      case 2:
        return {
          currentLabel: 'Clutch Recorded',
          nextAction: 'Carefully transfer eggs into prepared incubation medium.',
          statusBadge: 'CLUTCH'
        };
      case 3:
        return {
          currentLabel: 'Incubation',
          nextAction: 'Maintain target temperature and humidity until hatching begins.',
          statusBadge: 'INCUBATING'
        };
      case 4:
      default:
        return {
          currentLabel: showcasedPair.status === 'FAILED' ? 'Concluded' : 'Outcome',
          nextAction: 'Breeding cycle completed. Hatchling health assessed and recorded.',
          statusBadge: showcasedPair.status === 'FAILED' ? 'FAILED' : 'COMPLETED'
        };
    }
  }, [showcasedStageIndex, showcasedPair]);

  // Breeding pipeline 6-step stages
  const pipelineStages = useMemo(() => [
    {
      title: 'Ready for Pairing',
      description: 'Animals assessed and ready to breed',
      icon: <Heart className="w-4 h-4" />,
      count: animals.filter(a => !a.isArchived && (a.breedingStatus === 'Ready for Pairing' || !a.breedingStatus)).length || 8,
      onClick: () => setActiveTab('assessments')
    },
    {
      title: 'Pairing',
      description: 'Pairs formed, breeding started',
      icon: <Link2 className="w-4 h-4" />,
      count: breedingRecords.filter(r => r.status === 'PAIRED').length || 3,
      onClick: () => {
        const pair = breedingRecords.find(r => r.status === 'PAIRED');
        if (pair) setShowcasedPairId(pair.id);
      }
    },
    {
      title: 'Monitoring',
      description: 'Observations in progress',
      icon: <Eye className="w-4 h-4" />,
      count: breedingRecords.filter(r => ['IN PROGRESS', 'POSSIBLE MATED', 'LIKELY MATED'].includes(r.status)).length || 2,
      onClick: () => {
        const pair = breedingRecords.find(r => ['IN PROGRESS', 'POSSIBLE MATED', 'LIKELY MATED'].includes(r.status));
        if (pair) setShowcasedPairId(pair.id);
      }
    },
    {
      title: 'Clutch',
      description: 'Eggs recorded',
      icon: <Egg className="w-4 h-4" />,
      count: breedingRecords.filter(r => r.status === 'CLUTCH RECORDED' || (r.clutchSize && r.clutchSize > 0)).length || 1,
      onClick: () => {
        const pair = breedingRecords.find(r => r.status === 'CLUTCH RECORDED');
        if (pair) setShowcasedPairId(pair.id);
      }
    },
    {
      title: 'Incubation',
      description: 'Hatching process ongoing',
      icon: <Thermometer className="w-4 h-4" />,
      count: breedingRecords.filter(r => r.status === 'INCUBATING').length || 1,
      onClick: () => setActiveTab('incubation')
    },
    {
      title: 'Outcome',
      description: 'Hatched / completed',
      icon: <Baby className="w-4 h-4" />,
      count: breedingRecords.filter(r => ['COMPLETED', 'SUCCESSFUL'].includes(r.status)).length || 0,
      onClick: () => setActiveTab('history')
    }
  ], [animals, breedingRecords]);

  // Handlers for Observation and Clutch modal triggers
  const handleOpenLogObservation = (pair?: BreedingRecord | null) => {
    const target = pair || showcasedPair;
    setObsTargetPair(target);
    setObsType('Behavior');
    setObsNotes('');
    setObsWeightGain('');
    setObsNesting(false);
    setObsRestless(false);
    setObsLockObserved(false);
    setObsAggression('None');
    setIsLogObservationModalOpen(true);
  };

  const handleSaveObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!obsTargetPair) return;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);

    const newLog = {
      id: `obs_${Date.now()}`,
      date: dateStr,
      timestamp: timeStr,
      keeperName: 'Staff Keeper',
      type: (obsNesting || obsWeightGain ? 'Female Indicators' : obsLockObserved ? 'Courtship' : obsType) as any,
      notes: obsNotes || 'Routine breeding check conducted. Pair active and stable.',
      indicators: {
        nestingBehavior: obsNesting,
        weightIncreaseGrams: obsWeightGain ? parseFloat(obsWeightGain) : undefined,
        restlessness: obsRestless,
        aggressionLevel: obsAggression,
        otherObserved: obsOther,
        otherNotes: obsOther && obsOtherNotes.trim() ? obsOtherNotes.trim() : undefined
      }
    };

    let nextStatus = obsTargetPair.status;
    if (obsTargetPair.status === 'IN PROGRESS' && (obsNesting || obsWeightGain)) {
      nextStatus = 'LIKELY MATED';
    } else if (obsTargetPair.status === 'PAIRED' && obsLockObserved) {
      nextStatus = 'IN PROGRESS';
    }

    const updatedPair: BreedingRecord = {
      ...obsTargetPair,
      status: nextStatus,
      observationLogs: [newLog, ...(obsTargetPair.observationLogs || [])]
    };

    if (onUpdateBreedingRecord) {
      onUpdateBreedingRecord(updatedPair);
    }
    setObsOther(false);
    setObsOtherNotes('');
    setIsLogObservationModalOpen(false);
  };

  const handleOpenLogClutch = (pair?: BreedingRecord | null) => {
    const target = pair || showcasedPair;
    if (!target) return;
    setSelectedPairForClutch(target);
    setClutchEggsCount(target.clutchSize || 12);
    const std = findSpeciesBreedingStandard(target.species || 'Bearded Dragon');
    setClutchIncubationTemp(std?.incubationTempTarget || '28–29.5°C');
    setClutchIncubationHumidity(std?.incubationHumidity || '80–85%');
    setClutchNotes(target.notes || '');
    const initialClutchDate = target.clutchDate || new Date().toISOString().split('T')[0];
    setClutchDateInput(initialClutchDate);
    if (target.hatchDate) {
      setClutchEstHatchDate(target.hatchDate);
    } else {
      const d = new Date(initialClutchDate);
      d.setDate(d.getDate() + 60);
      setClutchEstHatchDate(d.toISOString().split('T')[0]);
    }
    setIsLogClutchModalOpen(true);
  };

  // Filtered records for the full history pop-up modal
  const activityModalRecords = useMemo(() => {
    if (!breedingRecords) return [];
    return [...breedingRecords]
      .sort((a, b) => {
        const dateA = new Date(a.hatchDate || a.clutchDate || a.breedingDate || a.createdAt || 0).getTime();
        const dateB = new Date(b.hatchDate || b.clutchDate || b.breedingDate || b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .filter(record => {
        const q = activityModalSearch.toLowerCase().trim();
        const female = animals.find(a => a.id === record.femaleId);
        const male = animals.find(a => a.id === record.maleId);
        const matchSearch =
          !q ||
          (female?.name || '').toLowerCase().includes(q) ||
          (male?.name || '').toLowerCase().includes(q) ||
          record.femaleId.toLowerCase().includes(q) ||
          record.maleId.toLowerCase().includes(q) ||
          (female?.species || male?.species || '').toLowerCase().includes(q) ||
          (record.notes || '').toLowerCase().includes(q) ||
          (record.breedingType || '').toLowerCase().includes(q) ||
          (record.id || '').toLowerCase().includes(q);

        const matchStatus =
          activityModalStatusFilter === 'All' || record.status === activityModalStatusFilter;

        return matchSearch && matchStatus;
      });
  }, [breedingRecords, animals, activityModalSearch, activityModalStatusFilter]);

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          {handleBack && (
            <button
              type="button"
              onClick={handleBack}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                isDarkMode
                  ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-white border-emerald-800/80'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs'
              }`}
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
          <div className="w-11 h-11 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 shadow-sm shadow-emerald-500/20">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Breeding
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Track breeding progress, from pairing to hatching outcomes.
            </p>
          </div>
        </div>
      </div>

      {/* TOP 4 STAT CARDS (Matches user design reference) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Breeding */}
        <div
          onClick={() => setActiveTab('active_pairs')}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#061e13] border border-slate-200 dark:border-emerald-900/60 flex items-center justify-between transition-all hover:border-emerald-500 dark:hover:border-emerald-700/60 cursor-pointer shadow-md group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Breeding</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{activeBreedingCount}</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">in progress</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 2: Clutches / Eggs */}
        <div
          onClick={() => setActiveTab('history')}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#061e13] border border-slate-200 dark:border-emerald-900/60 flex items-center justify-between transition-all hover:border-emerald-500 dark:hover:border-emerald-700/60 cursor-pointer shadow-md group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Egg className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Clutches / Eggs</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{totalClutchesCount}</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">total clutches</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 3: Incubation */}
        <div
          onClick={() => setActiveTab('incubation')}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#061e13] border border-slate-200 dark:border-emerald-900/60 flex items-center justify-between transition-all hover:border-emerald-500 dark:hover:border-emerald-700/60 cursor-pointer shadow-md group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Thermometer className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Incubation</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{incubationCount}</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">in progress</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 4: Breeding History */}
        <div
          onClick={() => setIsActivityHistoryModalOpen(true)}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#061e13] border border-slate-200 dark:border-emerald-900/60 flex items-center justify-between transition-all hover:border-emerald-500 dark:hover:border-emerald-700/60 cursor-pointer shadow-md group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Breeding History</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{breedingHistoryCount}</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">completed</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* 2. PILL TAB NAVIGATION */}
      <div className="flex items-center space-x-2.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('active_pairs')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'active_pairs'
              ? isDarkMode
                ? 'bg-[#062015] border border-emerald-500 text-emerald-300 shadow-xs'
                : 'bg-emerald-100 border border-emerald-500 text-emerald-800 shadow-xs'
              : isDarkMode
              ? 'bg-[#061B10]/60 border border-emerald-950/80 text-slate-400 hover:text-slate-200 hover:border-emerald-800/60'
              : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Heart className="w-3.5 h-3.5 text-emerald-400" />
          <span>Active Breeding</span>
          {breedingRecords.filter(r => isBreedingRecordActive(r)).length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300">
              {breedingRecords.filter(r => isBreedingRecordActive(r)).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('incubation')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'incubation'
              ? isDarkMode
                ? 'bg-[#062015] border border-emerald-500 text-emerald-300 shadow-xs'
                : 'bg-emerald-100 border border-emerald-500 text-emerald-800 shadow-xs'
              : isDarkMode
              ? 'bg-[#061B10]/60 border border-emerald-950/80 text-slate-400 hover:text-slate-200 hover:border-emerald-800/60'
              : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Thermometer className="w-3.5 h-3.5 text-slate-400" />
          <span>Incubation</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'history'
              ? isDarkMode
                ? 'bg-[#062015] border border-emerald-500 text-emerald-300 shadow-xs'
                : 'bg-emerald-100 border border-emerald-500 text-emerald-800 shadow-xs'
              : isDarkMode
              ? 'bg-[#061B10]/60 border border-emerald-950/80 text-slate-400 hover:text-slate-200 hover:border-emerald-800/60'
              : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5 text-slate-400" />
          <span>History & Clutches</span>
        </button>

        <button
          onClick={() => setActiveTab('assessments')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'assessments'
              ? isDarkMode
                ? 'bg-[#062015] border border-emerald-500 text-emerald-300 shadow-xs'
                : 'bg-emerald-100 border border-emerald-500 text-emerald-800 shadow-xs'
              : isDarkMode
              ? 'bg-[#061B10]/60 border border-emerald-950/80 text-slate-400 hover:text-slate-200 hover:border-emerald-800/60'
              : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Assessments</span>
        </button>

        <button
          onClick={() => setActiveTab('standards')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'standards'
              ? isDarkMode
                ? 'bg-[#062015] border border-emerald-500 text-emerald-300 shadow-xs'
                : 'bg-emerald-100 border border-emerald-500 text-emerald-800 shadow-xs'
              : isDarkMode
              ? 'bg-[#061B10]/60 border border-emerald-950/80 text-slate-400 hover:text-slate-200 hover:border-emerald-800/60'
              : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Dna className="w-3.5 h-3.5 text-slate-400" />
          <span>Species Standards</span>
        </button>
      </div>

      {/* 3. MAIN CONTENT TABS */}
      {activeTab === 'workflow' && selectedWorkflowAnimal && (
        <div className="space-y-4">
          <BreedingWizardSection
            animal={selectedWorkflowAnimal}
            animals={animals}
            enclosures={enclosures}
            medicalRecords={medicalRecords}
            breedingRecords={breedingRecords}
            breedingAssessments={breedingAssessments}
            staffMembers={staffMembers}
            onAddBreedingAssessment={onAddBreedingAssessment}
            onAddTask={onAddTask}
            onAddBreedingRecord={onAddBreedingRecord}
            onUpdateAnimal={onUpdateAnimal}
            onUpdateEnclosure={onUpdateEnclosure}
            onSelectAnimal={(a) => setSelectedWorkflowAnimalId(a.id)}
            onRedirectToEnclosureTab={() => setActiveTab('active_pairs')}
            initialStep={
              selectedWorkflowAnimal.breedingStatus === 'Ready for Pairing' ? 2 :
              breedingAssessments.some(a => a.animalId === selectedWorkflowAnimal.id) ? 1 :
              undefined
            }
          />
        </div>
      )}

      {/* Observation Modal */}
      {isLogObservationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#04160d] border border-slate-200 dark:border-emerald-900/80 rounded-2xl max-w-lg w-full p-6 text-slate-900 dark:text-white shadow-2xl relative my-8">
            <button
              onClick={() => setIsLogObservationModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-emerald-950/60"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black">Log Breeding Observation</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {obsTargetPair ? `${obsTargetPair.femaleName || obsTargetPair.femaleId} × ${obsTargetPair.maleName || obsTargetPair.maleId} (${obsTargetPair.species || 'Reptile'})` : 'Record breeding observations'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveObservation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Observation Category</label>
                <select
                  value={obsType}
                  onChange={(e) => setObsType(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-[#03180e] border border-slate-300 dark:border-emerald-950 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Behavior">Behavior & Activity</option>
                  <option value="Courtship">Courtship & Receptivity</option>
                  <option value="Female Indicators">Female Gravidity & Swelling</option>
                  <option value="General">General Keeper Check</option>
                </select>
              </div>

              {/* Physical & Behavioral Indicators */}
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-[#03180e] rounded-xl border border-slate-200 dark:border-emerald-950">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Key Indicators</span>
                
                <label className="flex items-center space-x-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={obsNesting}
                    onChange={(e) => setObsNesting(e.target.checked)}
                    className="rounded border-slate-300 dark:border-emerald-900 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Nesting / Digging in laybox medium</span>
                </label>

                <label className="flex items-center space-x-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={obsRestless}
                    onChange={(e) => setObsRestless(e.target.checked)}
                    className="rounded border-slate-300 dark:border-emerald-900 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Restlessness / Pacing / Increased basking</span>
                </label>

                <label className="flex items-center space-x-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={obsLockObserved}
                    onChange={(e) => setObsLockObserved(e.target.checked)}
                    className="rounded border-slate-300 dark:border-emerald-900 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Copulation / breeding lock confirmed</span>
                </label>

                <label className="flex items-center space-x-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={obsOther}
                    onChange={(e) => setObsOther(e.target.checked)}
                    className="rounded border-slate-300 dark:border-emerald-900 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Other</span>
                </label>
              </div>

              {obsOther && (
                <div className="pt-1 animate-in fade-in duration-150">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                    Specify Other Observed Sign / Behavior
                  </label>
                  <input
                    type="text"
                    value={obsOtherNotes}
                    onChange={(e) => setObsOtherNotes(e.target.value)}
                    placeholder="e.g. Color shifting, basking posture, substrate burrowing..."
                    className="w-full bg-slate-50 dark:bg-[#03180e] border border-slate-300 dark:border-emerald-950 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Weight Increase (+g)</label>
                  <input
                    type="number"
                    placeholder="e.g. 15"
                    value={obsWeightGain}
                    onChange={(e) => setObsWeightGain(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#03180e] border border-slate-300 dark:border-emerald-950 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Aggression Level</label>
                  <select
                    value={obsAggression}
                    onChange={(e) => setObsAggression(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-[#03180e] border border-slate-300 dark:border-emerald-950 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="None">None (Peaceful)</option>
                    <option value="Mild">Mild (Posturing)</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe (Separate)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Observation Notes</label>
                <textarea
                  rows={3}
                  placeholder="Document keeper notes, behavioral nuance, appetite, oviposition signs..."
                  value={obsNotes}
                  onChange={(e) => setObsNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#03180e] border border-slate-300 dark:border-emerald-950 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-emerald-950">
                <button
                  type="button"
                  onClick={() => setIsLogObservationModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-emerald-950/40 hover:bg-slate-200 dark:hover:bg-emerald-950 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md"
                >
                  Save Observation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'assessments' && (
        <div className="space-y-4">
          {/* FILTER AND SEARCH BAR */}
          <div
            className={`p-3 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center gap-3 ${
              isDarkMode ? 'bg-[#061B10] border-emerald-950/70' : 'bg-white border-slate-200 shadow-2xs'
            }`}
          >
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by pair ID, species, or animal ID..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs outline-none border transition-all ${
                  isDarkMode
                    ? 'bg-emerald-950/40 border-emerald-900/50 text-white placeholder-slate-500 focus:border-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                }`}
              />
            </div>

            {/* Status Dropdown */}
            <div className="w-full md:w-36">
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-medium ${
                  isDarkMode
                    ? 'bg-emerald-950/40 border-emerald-900/50 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="All">All Status</option>
                <option value="ELIGIBLE">ELIGIBLE</option>
                <option value="REVIEW">REVIEW</option>
                <option value="NOT ELIGIBLE">NOT ELIGIBLE</option>
              </select>
            </div>

            {/* Species Dropdown */}
            <div className="w-full md:w-44">
              <select
                value={speciesFilter}
                onChange={e => {
                  setSpeciesFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-medium ${
                  isDarkMode
                    ? 'bg-emerald-950/40 border-emerald-900/50 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="All">All Species</option>
                {SPECIES_BREEDING_STANDARDS.map(s => (
                  <option key={s.code} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="w-full md:w-36">
              <select
                value={dateFilter}
                onChange={e => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-medium ${
                  isDarkMode
                    ? 'bg-emerald-950/40 border-emerald-900/50 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="All">All Dates</option>
                <option value="Today">Today</option>
                <option value="This Month">This Month</option>
              </select>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetFilters}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isDarkMode
                  ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Reset
            </button>
          </div>

          {/* 5. TABLE OF ASSESSMENTS */}
          <div
            className={`rounded-2xl border overflow-hidden transition-colors ${
              isDarkMode ? 'bg-[#061B10] border-emerald-950/70 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead>
                  <tr
                    className={`border-b font-bold tracking-wider uppercase text-[10px] ${
                      isDarkMode ? 'border-emerald-950 bg-[#04110A] text-slate-400' : 'border-slate-100 bg-slate-50/80 text-slate-500'
                    }`}
                  >
                    <th className="py-3.5 px-4 w-52">PAIR</th>
                    <th className="py-3.5 px-4 w-44">SPECIES</th>
                    <th className="py-3.5 px-4 w-36">ASSESSMENT DATE</th>
                    <th className="py-3.5 px-4 w-32">STATUS</th>
                    <th className="py-3.5 px-4">RESULT</th>
                    <th className="py-3.5 px-4 w-36 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-emerald-950/40">
                  {paginatedAssessments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Heart className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-emerald-950" />
                        <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No breeding assessments match your criteria</p>
                        <p className="text-xs text-slate-400 mt-1">Try changing filters or create a new breeding assessment.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedAssessments.map(item => {
                      const isIndividual = !item.pairId && !item.partnerId && !item.maleId && item.animalId;
                      const primaryAnimal = animals.find(a => a.id === (item.animalId || item.femaleId));
                      const partnerAnimal = animals.find(a => a.id === (item.partnerId || item.maleId));

                      return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isDarkMode ? 'hover:bg-emerald-900/10 text-slate-300' : 'hover:bg-slate-50/80 text-slate-700'
                        }`}
                      >
                        {/* PAIR / ANIMAL COLUMN */}
                        <td className="py-3.5 px-4">
                          {isIndividual ? (
                            <div className="flex items-center space-x-2">
                              <div className="relative">
                                <img
                                  src={
                                    primaryAnimal?.image ||
                                    item.femaleImage ||
                                    'https://images.unsplash.com/photo-1574063413132-355dbfd83e0c?auto=format&fit=crop&q=80&w=100'
                                  }
                                  alt={item.animalId}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-emerald-950"
                                  referrerPolicy="no-referrer"
                                />
                                <span className={`absolute -top-1 -right-1 text-[11px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-2xs border ${
                                  primaryAnimal?.sex === 'Male' 
                                    ? 'text-sky-500 dark:text-sky-400 bg-white dark:bg-slate-900 border-sky-200 dark:border-sky-900' 
                                    : 'text-rose-500 dark:text-rose-400 bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900'
                                }`}>
                                  {primaryAnimal?.sex === 'Male' ? '♂' : '♀'}
                                </span>
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">{primaryAnimal?.name || item.animalId}</span>
                                <span className="font-mono text-[10px] text-slate-400 block">{item.animalId} (Individual)</span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center space-x-2">
                                {/* Female avatar with red sex icon */}
                                <div className="relative">
                                  <img
                                    src={
                                      primaryAnimal?.image ||
                                      item.femaleImage ||
                                      'https://images.unsplash.com/photo-1574063413132-355dbfd83e0c?auto=format&fit=crop&q=80&w=100'
                                    }
                                    alt={item.femaleId || item.animalId}
                                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-emerald-950"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="absolute -top-1 -right-1 text-[11px] font-bold text-rose-500 dark:text-rose-400 bg-white dark:bg-slate-900 rounded-full w-4 h-4 flex items-center justify-center shadow-2xs border border-rose-200 dark:border-rose-900">
                                    ♀
                                  </span>
                                </div>

                                <span className="text-slate-400 font-bold text-xs">x</span>

                                {/* Male avatar with blue sex icon */}
                                <div className="relative">
                                  <img
                                    src={
                                      partnerAnimal?.image ||
                                      item.maleImage ||
                                      'https://images.unsplash.com/photo-1574063413132-355dbfd83e0c?auto=format&fit=crop&q=80&w=100'
                                    }
                                    alt={item.maleId || item.partnerId}
                                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-emerald-950"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="absolute -top-1 -right-1 text-[11px] font-bold text-sky-500 dark:text-sky-400 bg-white dark:bg-slate-900 rounded-full w-4 h-4 flex items-center justify-center shadow-2xs border border-sky-200 dark:border-sky-900">
                                    ♂
                                  </span>
                                </div>
                              </div>
                              {/* IDs below */}
                              <div className="flex items-center space-x-1.5 mt-1.5 font-mono text-[11px]">
                                <span className="font-bold text-slate-700 dark:text-slate-300">{item.femaleId || item.animalId}</span>
                                <span className="text-slate-400">x</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">{item.maleId || item.partnerId}</span>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* SPECIES COLUMN */}
                        <td className="py-3.5 px-4">
                          <strong className="block font-bold text-slate-900 dark:text-white text-xs">{item.species}</strong>
                          <span className="italic text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                            {item.scientificName}
                          </span>
                        </td>

                        {/* ASSESSMENT DATE COLUMN */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900 dark:text-slate-200 text-xs">{item.assessmentDate}</div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">{item.assessmentTime || '10:30 AM'}</span>
                        </td>

                        {/* STATUS COLUMN */}
                        <td className="py-3.5 px-4">
                          {item.status === 'ELIGIBLE' && (
                            <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wide uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 dark:bg-emerald-950/80 dark:text-emerald-400">
                              ELIGIBLE
                            </span>
                          )}
                          {item.status === 'REVIEW' && (
                            <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wide uppercase bg-amber-950/80 text-amber-400 border border-amber-800/40 dark:bg-amber-950/80 dark:text-amber-400">
                              REVIEW
                            </span>
                          )}
                          {item.status === 'NOT ELIGIBLE' && (
                            <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wide uppercase bg-rose-950/80 text-rose-400 border border-rose-800/40 dark:bg-rose-950/80 dark:text-rose-400">
                              NOT ELIGIBLE
                            </span>
                          )}
                        </td>

                        {/* RESULT COLUMN */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start space-x-2.5">
                            {item.status === 'ELIGIBLE' && (
                              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            )}
                            {item.status === 'REVIEW' && (
                              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </div>
                            )}
                            {item.status === 'NOT ELIGIBLE' && (
                              <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                                <XCircle className="w-3.5 h-3.5" />
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs leading-tight">
                                {item.resultTitle}
                              </div>
                              <span className="text-[11px] text-slate-400 dark:text-slate-400 block mt-0.5 leading-snug">
                                {item.resultSubtitle}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* ACTION COLUMN */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2 relative">
                            <button
                              onClick={() => setSelectedAssessmentForDetail(item)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                isDarkMode
                                  ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/40'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs'
                              }`}
                            >
                              View Details
                            </button>

                            <div className="relative">
                              <button
                                onClick={() => setActiveDropdownId(activeDropdownId === item.id ? null : item.id)}
                                className={`p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors ${
                                  isDarkMode ? 'hover:bg-emerald-900/30' : 'hover:bg-slate-100'
                                }`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeDropdownId === item.id && (
                                <div
                                  className={`absolute right-0 top-8 z-30 w-48 rounded-xl shadow-lg border p-1 text-left space-y-0.5 ${
                                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                                  }`}
                                >
                                  <button
                                    onClick={() => {
                                      handlePromoteToActiveLock(item);
                                      setActiveDropdownId(null);
                                    }}
                                    className="w-full px-3 py-1.5 rounded-lg text-xs font-medium text-left hover:bg-emerald-600 hover:text-white transition-colors flex items-center space-x-2"
                                  >
                                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Start Active Lock</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedAssessmentForDetail(item);
                                      setActiveDropdownId(null);
                                    }}
                                    className="w-full px-3 py-1.5 rounded-lg text-xs font-medium text-left hover:bg-emerald-600 hover:text-white transition-colors flex items-center space-x-2"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                                    <span>Full Diagnostic Report</span>
                                  </button>
                                  {onDeleteBreedingAssessment && (
                                    <button
                                      onClick={() => {
                                        if (confirm(`Delete assessment ${item.id}?`)) {
                                          onDeleteBreedingAssessment(item.id);
                                        }
                                        setActiveDropdownId(null);
                                      }}
                                      className="w-full px-3 py-1.5 rounded-lg text-xs font-medium text-left text-rose-500 hover:bg-rose-600 hover:text-white transition-colors flex items-center space-x-2"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete Record</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 6. FOOTER PAGINATION */}
            <div
              className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
                isDarkMode ? 'border-emerald-950 bg-[#04110A] text-slate-400' : 'border-slate-100 bg-slate-50/60 text-slate-500'
              }`}
            >
              <div>
                Showing {totalResults === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to{' '}
                {Math.min(currentPage * rowsPerPage, totalResults)} of {totalResults} results
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1.5">
                  <span>Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={e => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-1 rounded-lg border text-xs outline-none ${
                      isDarkMode ? 'bg-emerald-950/60 border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`p-1.5 rounded-lg border transition-all disabled:opacity-40 ${
                      isDarkMode ? 'border-emerald-950 hover:bg-emerald-900/30' : 'border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        currentPage === pageNum
                          ? isDarkMode
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-[#113C24] text-white shadow-xs'
                          : isDarkMode
                          ? 'text-slate-400 hover:bg-emerald-900/20'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`p-1.5 rounded-lg border transition-all disabled:opacity-40 ${
                      isDarkMode ? 'border-emerald-950 hover:bg-emerald-900/30' : 'border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: CURRENT BREEDING ANIMALS & ACTIVE PAIRS */}
      {activeTab === 'active_pairs' && (
        <div className="space-y-6">
          {/* Main Active Pairs List & Recent Activity Table */}
          <div className="w-full space-y-6">
            {/* 1. Active Breeding Pairs List (Image 1 Style) */}
              <div className={`p-5 rounded-2xl border shadow-xl space-y-4 transition-colors ${
                isDarkMode ? 'bg-[#061e13] border-emerald-900/60' : 'bg-white border-slate-200'
              }`}>
                {/* Header with Title & Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-emerald-950/80">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <Sprout className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-base font-black text-slate-900 dark:text-white">Active Breeding Pairs</h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {filteredActivePairs.length} Active
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Click any pair to open the complete Breeding Tracker and lifecycle actions.
                      </p>
                    </div>
                  </div>

                  {/* Search Bar & Section Note */}
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search pair ID, species..."
                        value={pairListSearch}
                        onChange={(e) => setPairListSearch(e.target.value)}
                        className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                          isDarkMode 
                            ? 'bg-[#04110A] border-emerald-900/60 text-white placeholder-slate-500 focus:border-emerald-500' 
                            : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-600'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-view navigation */}
                <div className="flex items-center space-x-2.5 border-b border-slate-100 dark:border-emerald-950 pb-2.5">
                  <button
                    type="button"
                    onClick={() => setBreedingSubView('pairs')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      breedingSubView === 'pairs'
                        ? 'bg-emerald-600/10 text-emerald-500 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                    <span>Active Breeding Pairs ({filteredActivePairs.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBreedingSubView('ready_animals')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      breedingSubView === 'ready_animals'
                        ? 'bg-emerald-600/10 text-emerald-500 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Dna className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Animals Ready for Pairing ({eligibleAnimals.length})</span>
                  </button>
                </div>

                {breedingSubView === 'pairs' && (
                  <>
                    {/* Pairs List (Matches Image 1 layout) */}
                    <div className="space-y-3">
                  {filteredActivePairs.length === 0 ? (
                    <div className={`p-8 rounded-2xl border text-center space-y-3 ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-900/50 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                        <Heart className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        No Active Breeding Pairs Found
                      </h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        {pairListSearch
                          ? 'No active pairs matched your search filter. Try clearing your search keyword.'
                          : 'No active breeding pairs registered. To add and manage animal pairs, please use the Breeding section inside the Animals tab.'}
                      </p>
                      <div className="pt-2">
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold inline-flex items-center space-x-1.5">
                          <Info className="w-3.5 h-3.5" />
                          <span>Pair animals in Animals Section</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    filteredActivePairs.map(pair => {
                    const female = findAnimalRecord(pair.femaleId, pair.femaleName);
                    const male = findAnimalRecord(pair.maleId, pair.maleName);
                    const pairSpecies = pair.species || female?.species || male?.species || 'Bearded Dragon';
                    const femaleImg = resolveAnimalPhoto(female, pair.femaleImage, pairSpecies);
                    const maleImg = resolveAnimalPhoto(male, pair.maleImage, pairSpecies);
                    const femaleCode = female?.id || pair.femaleId || 'BDR-001';
                    const maleCode = male?.id || pair.maleId || 'BDR-002';
                    const pairIdDisplay = pair.id ? (pair.id.startsWith('PAIR') ? pair.id : `PAIR-${femaleCode}-${maleCode}`) : `PAIR-${femaleCode}-${maleCode}`;
                    
                    const femaleEnclosure = enclosures.find(e => e.id === female?.enclosureId);
                    const maleEnclosure = enclosures.find(e => e.id === male?.enclosureId);
                    const enclosureId = female?.enclosureId || male?.enclosureId || 'RL1-BD-002';
                    const facilityName = femaleEnclosure?.facility || maleEnclosure?.facility || 'Main Facility';
                    
                    const morphDisplay = female?.morph && male?.morph
                      ? `${female.morph} × ${male.morph}`
                      : female?.morph || male?.morph || 'Normal';

                    const statusNorm = normalizeBreedingStatus(pair.status);
                    const statusText = statusNorm === 'PAIRED' ? 'PAIRED' : statusNorm === 'CLUTCH RECORDED' ? 'CLUTCH' : statusNorm === 'INCUBATING' ? 'INCUBATING' : 'IN PROGRESS';

                    const isCurrentSelected = showcasedPair.id === pair.id;

                    const pairEnclosure = enclosures.find(e => 
                      e.id === enclosureId ||
                      (female?.enclosureId && e.id === female.enclosureId) ||
                      (male?.enclosureId && e.id === male.enclosureId) ||
                      e.climateProfile?.targetAnimalId === female?.id ||
                      e.climateProfile?.targetAnimalId === male?.id
                    );
                    const pairClimate = pairEnclosure?.climateProfile;

                    return (
                      <div
                        key={pair.id}
                        onClick={() => {
                          setShowcasedPairId(pair.id);
                          setIsShowcasePopupOpen(true);
                        }}
                        className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between hover:scale-[1.002] active:scale-[0.998] group relative ${
                          isCurrentSelected
                            ? isDarkMode
                              ? 'bg-[#072417] border-emerald-400/80 shadow-sm'
                              : 'bg-emerald-50 border-[#113C24]/30 shadow-xs'
                            : isDarkMode
                            ? 'bg-[#04110A] border-emerald-950/70 hover:border-emerald-500/60 text-slate-200 hover:bg-[#071F11]'
                            : 'bg-white border-slate-200/80 hover:border-emerald-500/60 text-slate-800 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5 min-w-0">
                          {/* Dual Animal Thumbnail with Heart in the Center */}
                          <div className="relative flex items-center shrink-0">
                            {/* Female Animal Thumbnail */}
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-slate-200/80 dark:border-emerald-950/60 bg-slate-900 shrink-0 shadow-xs relative group-hover:scale-102 transition-transform duration-300">
                              <img
                                src={femaleImg}
                                alt={female?.name || femaleCode}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = getAnimalSpeciesFallbackPhoto(pairSpecies); }}
                              />
                              <div className="absolute bottom-0.5 right-0.5">
                                <span className="w-3.5 h-3.5 rounded bg-pink-600 text-white text-[8px] font-bold flex items-center justify-center leading-none shadow-xs">
                                  ♀
                                </span>
                              </div>
                            </div>

                            {/* Center Heart Icon */}
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 z-10 -mx-2 shadow-sm bg-[#04160d]">
                              <Heart className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                            </div>

                            {/* Male Animal Thumbnail */}
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-slate-200/80 dark:border-emerald-950/60 bg-slate-900 shrink-0 shadow-xs relative group-hover:scale-102 transition-transform duration-300">
                              <img
                                src={maleImg}
                                alt={male?.name || maleCode}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = getAnimalSpeciesFallbackPhoto(pairSpecies); }}
                              />
                              <div className="absolute bottom-0.5 right-0.5">
                                <span className="w-3.5 h-3.5 rounded bg-sky-600 text-white text-[8px] font-bold flex items-center justify-center leading-none shadow-xs">
                                  ♂
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Info Text Stack */}
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDarkMode ? 'text-emerald-300' : 'text-[#113C24]'}`}>
                                {pairIdDisplay}
                              </span>
                              <span className="text-pink-500 dark:text-pink-400 text-xs font-black">♀</span>
                              <span className="text-slate-400 text-xs">×</span>
                              <span className="text-blue-500 dark:text-blue-400 text-xs font-black">♂</span>
                            </div>

                            <h4 className={`font-bold text-sm leading-tight truncate mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {pairSpecies}
                            </h4>

                            <p className={`text-[11px] font-semibold truncate mt-0.5 ${isDarkMode ? 'text-emerald-300/80' : 'text-slate-500'}`}>
                              Morph: {morphDisplay}
                            </p>

                            {/* Climate / Temp Change Request Badges */}
                            {pairClimate?.status === 'Pending Setup' && (
                              <div className="mt-1">
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                  <Thermometer className="w-2.5 h-2.5 animate-pulse shrink-0" />
                                  <span>🌡️ Temp Change Req: {pairClimate.coolingTempRange || '18°C–20°C'} (Keeper Setup)</span>
                                </span>
                              </div>
                            )}
                            {pairClimate?.status === 'Pending Approval' && (
                              <div className="mt-1">
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  <Thermometer className="w-2.5 h-2.5 animate-pulse shrink-0" />
                                  <span>🌡️ Temp Readings Set: {pairClimate.dayTemp}°C / {pairClimate.nightTemp}°C (Pending Admin)</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Enclosure & Status Column (Matches Image 1) */}
                        <div className="hidden sm:flex items-center space-x-6 lg:space-x-8 text-right pr-4 shrink-0">
                          <div className="text-left">
                            <span className={`text-[9px] uppercase tracking-wider block font-bold ${isDarkMode ? 'text-emerald-400' : 'text-slate-400'}`}>
                              ENCLOSURE
                            </span>
                            <span className={`font-bold text-xs mt-0.5 block ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                              {enclosureId}
                            </span>
                            <span className={`text-[10px] block mt-0.5 ${isDarkMode ? 'text-emerald-300/60 font-semibold' : 'text-slate-400'}`}>
                              {facilityName}
                            </span>
                            {pairClimate?.status === 'Pending Setup' && (
                              <span className="inline-flex items-center space-x-1 text-[9px] font-black text-cyan-500 dark:text-cyan-300 mt-0.5">
                                <Thermometer className="w-2.5 h-2.5 animate-pulse shrink-0" />
                                <span>Req: {pairClimate.coolingTempRange || '18°C–20°C'} (Keeper)</span>
                              </span>
                            )}
                            {pairClimate?.status === 'Pending Approval' && (
                              <span className="inline-flex items-center space-x-1 text-[9px] font-black text-amber-500 dark:text-amber-300 mt-0.5">
                                <Thermometer className="w-2.5 h-2.5 animate-pulse shrink-0" />
                                <span>Submitted: {pairClimate.dayTemp}°C</span>
                              </span>
                            )}
                          </div>

                          <div className="w-28 text-center">
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-500/30">
                              {statusText}
                            </span>
                          </div>
                        </div>

                        {/* Quick Actions & Chevron Right (Matches Image 1) */}
                        <div className="shrink-0 pl-1.5 flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRemovePair(pair);
                            }}
                            className="p-1.5 rounded-lg opacity-85 hover:opacity-100 bg-rose-500/10 hover:bg-rose-500/25 text-rose-500 border border-rose-500/20 transition-all cursor-pointer shadow-2xs"
                            title="Delete / Remove Breeding Pair"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    );
                  })
                )}
                </div>
                </>
              )}

              {breedingSubView === 'ready_animals' && (
                <div className="space-y-4 pt-2 animate-in fade-in duration-200">
                  <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${isDarkMode ? 'bg-[#05160E] border-emerald-950 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                    <p className="font-bold text-emerald-400 text-sm mb-1">Available Breeding Stock (Unpaired)</p>
                    <p>The following specimens have been assessed and are <strong>Ready for Pairing</strong> but are not currently assigned to any active breeding pairs. Select a specimen to open the 4-step Breeding &amp; Transfer Wizard to establish a cohabitation lock.</p>
                  </div>

                  {eligibleAnimals.length === 0 ? (
                    <div className={`p-12 text-center rounded-3xl border ${isDarkMode ? 'bg-[#04110A] border-emerald-950 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
                      <Dna className="w-12 h-12 text-slate-600 mx-auto mb-3 stroke-1" />
                      <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>No Specimens Ready for Pairing</h3>
                      <p className="text-xs text-slate-400 mt-1">There are currently no individual animals set to &quot;Ready for Pairing&quot; status that aren&apos;t already paired.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {eligibleAnimals.map(animal => {
                        const enclosure = enclosures.find(e => e.id === animal.enclosureId);
                        return (
                          <div
                            key={animal.id}
                            className={`p-4 rounded-3xl border flex flex-col justify-between space-y-4 transition-all ${
                              isDarkMode ? 'bg-[#061A10] border-emerald-950 hover:border-emerald-800/80 shadow-md' : 'bg-white border-slate-200 hover:border-emerald-300 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="relative shrink-0">
                                <img
                                  src={animal.image || animal.imageUrl || animal.photoUrl || 'https://images.unsplash.com/photo-1548841416-e565987140e6?auto=format&fit=crop&w=150&q=80'}
                                  alt={animal.name || animal.id}
                                  className="w-14 h-14 rounded-2xl object-cover border border-emerald-500/20"
                                  onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1548841416-e565987140e6?auto=format&fit=crop&w=150&q=80'; }}
                                />
                                <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-xs ${
                                  animal.sex === 'Female' ? 'bg-rose-500' : 'bg-blue-500'
                                }}`}>
                                  {animal.sex === 'Female' ? '♀' : '♂'}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${
                                  animal.sex === 'Female' ? 'text-rose-400' : 'text-blue-400'
                                }}`}>
                                  {animal.sex || 'Unsexed'} Specimen
                                </span>
                                <h4 className={`text-sm font-black truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                  {animal.name || 'Unnamed Specimen'}
                                </h4>
                                <span className="text-[10px] text-slate-400 font-mono block truncate">
                                  ID: {animal.id}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] py-1">
                              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-[#041209]' : 'bg-slate-50'}`}>
                                <span className="text-slate-400 block text-[9px] uppercase font-bold">Species</span>
                                <span className="font-extrabold truncate block">{animal.species}</span>
                              </div>
                              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-[#041209]' : 'bg-slate-50'}`}>
                                <span className="text-slate-400 block text-[9px] uppercase font-bold">Morph</span>
                                <span className="font-extrabold truncate block">{animal.morph || 'Normal'}</span>
                              </div>
                              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-[#041209]' : 'bg-slate-50'}`}>
                                <span className="text-slate-400 block text-[9px] uppercase font-bold">Weight</span>
                                <span className="font-extrabold truncate block">{animal.weight || 0}g</span>
                              </div>
                              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-[#041209]' : 'bg-slate-50'}`}>
                                <span className="text-slate-400 block text-[9px] uppercase font-bold">Enclosure</span>
                                <span className="font-extrabold truncate block">{enclosure?.name || 'Unassigned'}</span>
                              </div>
                            </div>

                            <div className="pt-2 flex items-center justify-between border-t border-emerald-900/10 dark:border-emerald-950/40">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">
                                {animal.breedingStatus || 'Ready'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedWorkflowAnimalId(animal.id);
                                  setActiveTab('workflow');
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs active:scale-95 transition-all cursor-pointer"
                              >
                                Pair Specimen
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              </div>

              {/* POPUP MODAL: Active Breeding Showcase (Image 2) */}
              {isShowcasePopupOpen && (
                <div
                  className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
                  onClick={() => setIsShowcasePopupOpen(false)}
                >
                  <div
                    className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-[#061e13] border border-slate-200 dark:border-emerald-900/80 shadow-2xl p-6 sm:p-7 space-y-5 my-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header of Showcase Modal */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-950/80">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <Sprout className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="text-base font-black text-slate-900 dark:text-white">Active Breeding</h2>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          {showcasedStageInfo.statusBadge}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                          Started {formatDisplayDate(showcasedPair.startedBreedingDate || showcasedPair.breedingDate || '2026-09-17')}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsShowcasePopupOpen(false)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-emerald-950/60 hover:bg-slate-200 dark:hover:bg-emerald-900 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all cursor-pointer flex items-center space-x-1.5 text-xs font-bold"
                          title="Exit & Close Modal"
                        >
                          <X className="w-4 h-4" />
                          <span>Exit</span>
                        </button>
                      </div>
                    </div>

                    {/* Climate / Temp Change Request Banner in Modal */}
                    {(() => {
                      const showcasedPairEnc = enclosures.find(e => 
                        (showcasedFemale?.enclosureId && e.id === showcasedFemale.enclosureId) ||
                        (showcasedMale?.enclosureId && e.id === showcasedMale.enclosureId) ||
                        e.climateProfile?.targetAnimalId === showcasedPair.femaleId ||
                        e.climateProfile?.targetAnimalId === showcasedPair.maleId
                      );
                      const showcasedPairClimate = showcasedPairEnc?.climateProfile;

                      if (showcasedPairClimate?.status === 'Pending Setup') {
                        return (
                          <div className="p-3.5 rounded-2xl bg-cyan-950/60 border border-cyan-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
                            <div className="flex items-center space-x-2.5">
                              <Thermometer className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
                              <div>
                                <span className="font-extrabold text-cyan-300 block text-xs">
                                  🌡️ Admin Requested Vivarium Temperature Change
                                </span>
                                <span className="text-[11px] text-cyan-100/80">
                                  Target: <strong>{showcasedPairClimate.coolingTempRange || '18°C–20°C'}</strong> in {showcasedPairEnc?.name || 'Vivarium'}
                                  {showcasedPairClimate.requestedAt ? ` • Requested: ${showcasedPairClimate.requestedAt}` : ''} (Awaiting Keeper calibration)
                                </span>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                              Assigned to Keeper
                            </span>
                          </div>
                        );
                      }

                      if (showcasedPairClimate?.status === 'Pending Approval') {
                        return (
                          <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
                            <div className="flex items-center space-x-2.5">
                              <Thermometer className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                              <div>
                                <span className="font-extrabold text-amber-300 block text-xs">
                                  🌡️ Keeper Submitted Temperature Calibration Readings
                                </span>
                                <span className="text-[11px] text-amber-100/80">
                                  Readings: <strong>{showcasedPairClimate.dayTemp}°C Day / {showcasedPairClimate.nightTemp}°C Night</strong> in {showcasedPairEnc?.name || 'Vivarium'}
                                </span>
                              </div>
                            </div>
                            {onUpdateEnclosure && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!showcasedPairEnc || !showcasedPairClimate) return;
                                  onUpdateEnclosure({
                                    ...showcasedPairEnc,
                                    climateProfile: {
                                      ...showcasedPairClimate,
                                      status: 'Approved',
                                      isActive: true,
                                      approvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + new Date().toLocaleDateString(),
                                      approvedByAdmin: 'Admin'
                                    }
                                  });
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shrink-0 transition-colors shadow-xs"
                              >
                                Approve Readings
                              </button>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Animals Pair Display */}
                    <div className="grid grid-cols-1 sm:grid-cols-11 gap-3 items-center">
                      {/* Female Animal Card */}
                      <div className="sm:col-span-5 bg-slate-50 dark:bg-[#04160d] rounded-2xl p-3.5 border border-slate-200 dark:border-emerald-950">
                        <div className="relative rounded-xl overflow-hidden h-36 bg-black/40">
                          <img
                            src={showcasedFemaleImg}
                            alt={showcasedFemale?.name || showcasedFemaleCode}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = getAnimalSpeciesFallbackPhoto(showcasedSpecies); }}
                          />
                          <div className="absolute bottom-2 right-2">
                            <span className="w-7 h-7 rounded-lg bg-pink-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                              ♀
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 space-y-0.5">
                          <div className="text-sm font-black text-slate-900 dark:text-white truncate">{showcasedFemaleCode}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{showcasedSpecies}</div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-400">
                            Female • {showcasedFemaleAge} • {showcasedFemaleWeight}
                          </div>
                        </div>
                      </div>

                      {/* Center Heart */}
                      <div className="sm:col-span-1 flex justify-center py-2 sm:py-0">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/20">
                          <Heart className="w-4 h-4 text-emerald-500 fill-emerald-500 dark:text-emerald-400 dark:fill-emerald-400" />
                        </div>
                      </div>

                      {/* Male Animal Card */}
                      <div className="sm:col-span-5 bg-slate-50 dark:bg-[#04160d] rounded-2xl p-3.5 border border-slate-200 dark:border-emerald-950">
                        <div className="relative rounded-xl overflow-hidden h-36 bg-black/40">
                          <img
                            src={showcasedMaleImg}
                            alt={showcasedMale?.name || showcasedMaleCode}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = getAnimalSpeciesFallbackPhoto(showcasedSpecies); }}
                          />
                          <div className="absolute bottom-2 right-2">
                            <span className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                              ♂
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 space-y-0.5">
                          <div className="text-sm font-black text-slate-900 dark:text-white truncate">{showcasedMaleCode}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{showcasedSpecies}</div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-400">
                            Male • {showcasedMaleAge} • {showcasedMaleWeight}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 5-Step Horizontal Stepper */}
                    <div className="pt-4 pb-2 px-2 sm:px-6">
                      <div className="relative flex items-center justify-between">
                        {/* Background track line */}
                        <div className="absolute left-3 right-3 top-3 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-800" />

                        {/* Progress fill line */}
                        <div
                          className="absolute left-3 top-3 -translate-y-1/2 h-0.5 bg-emerald-500 transition-all duration-500"
                          style={{
                            width: `calc(${(showcasedStageIndex / (visualStages.length - 1)) * 100}% - 12px)`
                          }}
                        />

                        {visualStages.map((stg, idx) => {
                          const isCompleted = idx < showcasedStageIndex;
                          const isCurrent = idx === showcasedStageIndex;

                          return (
                            <div key={stg} className="relative z-10 flex flex-col items-center">
                              {isCompleted ? (
                                <div className="w-6 h-6 rounded-full bg-emerald-400 text-black flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              ) : isCurrent ? (
                                <div className="w-6 h-6 rounded-full border-2 border-emerald-400 p-0.5 bg-white dark:bg-[#061e13] flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                  <div className="w-full h-full rounded-full bg-emerald-400 animate-pulse" />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-[#061e13] flex items-center justify-center" />
                              )}

                              <span
                                className={`text-xs mt-2 font-medium tracking-tight ${
                                  isCurrent
                                    ? 'text-slate-900 dark:text-white font-extrabold'
                                    : isCompleted
                                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                    : 'text-slate-400'
                                }`}
                              >
                                {stg}
                              </span>
                              <span
                                className={`text-[10px] font-mono mt-0.5 whitespace-nowrap ${
                                  isCurrent
                                    ? 'text-emerald-600 dark:text-emerald-400 font-black'
                                    : isCompleted
                                    ? 'text-emerald-600/80 dark:text-emerald-400/80 font-bold'
                                    : 'text-slate-400 dark:text-slate-500'
                                }`}
                              >
                                {getStageDate(stg)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Current Stage & Next Action Info Boxes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Current Stage */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#04160d] border border-slate-200 dark:border-emerald-950 flex items-center space-x-3.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <PawPrint className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Current Stage</div>
                          <div className="text-base font-black text-slate-900 dark:text-white">{showcasedStageInfo.currentLabel}</div>
                        </div>
                      </div>

                      {/* Next Action */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#04160d] border border-slate-200 dark:border-emerald-950 flex items-start space-x-3.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Next Action</div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 font-normal leading-snug mt-0.5">
                            {showcasedStageInfo.nextAction}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Keeper Role Separation Notice & Admin Action Buttons */}
                    <div className="space-y-2.5 pt-2">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start space-x-2.5 text-xs text-amber-300">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5 leading-snug">
                          <span className="font-extrabold text-amber-200">
                            Keeper Field Husbandry:
                          </span>
                          <span className="text-slate-300 text-[11px] ml-1">
                            Daily behavioral checks, lock confirmations, and clutch collections are recorded by the <strong>Animal Keeper</strong> in their Keeper Dashboard.
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 w-full">
                          <button
                            onClick={() => {
                              setIsShowcasePopupOpen(false);
                              setPairDetailActiveTab('timeline');
                              setSelectedPairForDetail(showcasedPair);
                            }}
                            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-[0.99] cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View Pair Details & Timeline</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsShowcasePopupOpen(false);
                              setPairDetailActiveTab('keeper_logs');
                              setSelectedPairForDetail(showcasedPair);
                            }}
                            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-[#03180e] hover:bg-slate-200 dark:hover:bg-[#062416] border border-slate-300 dark:border-emerald-900/80 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                          >
                            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>View Keeper Logs ({showcasedPair.observationLogs?.length || 0})</span>
                          </button>
                        </div>

                        {/* Secondary Options */}
                        <div className="flex items-center w-full sm:w-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => setIsShowcasePopupOpen(false)}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-emerald-950/70 hover:bg-slate-300 dark:hover:bg-emerald-900 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shrink-0"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back / Close</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Recent Breeding Activity Table */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#061e13] border border-slate-200 dark:border-emerald-900/60 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-emerald-950/80">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">Recent Breeding Activity</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Latest updates and events across all breeding pairs.</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsActivityHistoryModalOpen(true)}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-emerald-950/80 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Pair</th>
                        <th className="py-2.5 px-3">Species</th>
                        <th className="py-2.5 px-3">Stage</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-emerald-950/40">
                      {recentActivities.map((act) => {
                        const isCurrentShowcased = showcasedPair.id === act.id || showcasedPair.femaleId === act.femaleId;
                        return (
                          <tr
                            key={act.id}
                            onClick={() => {
                              if (act.record) {
                                setShowcasedPairId(act.record.id);
                              } else {
                                setShowcasedPairId(act.id);
                              }
                            }}
                            className={`group cursor-pointer transition-colors ${
                              isCurrentShowcased
                                ? 'bg-emerald-500/10 dark:bg-emerald-950/50'
                                : 'hover:bg-slate-50 dark:hover:bg-emerald-950/30'
                            }`}
                          >
                            <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {act.date}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center -space-x-1.5 shrink-0">
                                  <img
                                    src={act.femaleImg}
                                    alt={act.femaleName}
                                    className="w-6 h-6 rounded-full object-cover border-2 border-white dark:border-slate-900 bg-pink-950/50"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = getAnimalSpeciesFallbackPhoto(act.species); }}
                                  />
                                  <img
                                    src={act.maleImg}
                                    alt={act.maleName}
                                    className="w-6 h-6 rounded-full object-cover border-2 border-white dark:border-slate-900 bg-sky-950/50"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = getAnimalSpeciesFallbackPhoto(act.species); }}
                                  />
                                </div>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {act.pair}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {act.species}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {act.stage === 'Monitoring' && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 w-max">
                                  <Eye className="w-3 h-3" />
                                  <span>Monitoring</span>
                                </span>
                              )}
                              {act.stage === 'Clutch' && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30 flex items-center space-x-1 w-max">
                                  <Egg className="w-3 h-3" />
                                  <span>Clutch</span>
                                </span>
                              )}
                              {act.stage === 'Incubation' && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30 flex items-center space-x-1 w-max">
                                  <Thermometer className="w-3 h-3" />
                                  <span>Incubation</span>
                                </span>
                              )}
                              {act.stage === 'Outcome' && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/30 flex items-center space-x-1 w-max">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Outcome</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {act.status === 'In Progress' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                  In Progress
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                  Completed
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* VIEW: INCUBATION & HATCHERY */}
      {activeTab === 'incubation' && (
        <div className="space-y-6">
          {/* Incubation Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">
                <Egg className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Incubation & Hatchery
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time environmental monitoring, candling records, and clutch development.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const firstPair = breedingRecords.find(r => r.status === 'IN PROGRESS');
                if (firstPair) {
                  setSelectedPairForClutch(firstPair);
                  setClutchEggsCount(firstPair.clutchSize || 12);
                  setClutchIncubationTemp('28–29.5°C');
                  setClutchIncubationHumidity('80–85%');
                  setClutchNotes(firstPair.notes || '');
                  const initialClutchDate = firstPair.clutchDate || new Date().toISOString().split('T')[0];
                  setClutchDateInput(initialClutchDate);
                  if (firstPair.hatchDate) {
                    setClutchEstHatchDate(firstPair.hatchDate);
                  } else {
                    const d = new Date(initialClutchDate);
                    d.setDate(d.getDate() + 60);
                    setClutchEstHatchDate(d.toISOString().split('T')[0]);
                  }
                }
                setIsLogClutchModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all bg-[#059669] hover:bg-[#047857] text-white shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log New Clutch</span>
            </button>
          </div>

          {/* Environmental Chambers Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Unit 1: Warm Reptile Incubator */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border ${
                isDarkMode ? 'bg-[#04150C] border-emerald-950/80 shadow-md' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                    <Thermometer className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Incubator Unit A (Warm Hatchery)
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Model: Exo-Terra Precision II • Calibrated
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  OPTIMAL
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-emerald-950/20 border border-slate-200/60 dark:border-emerald-950/60">
                  <span className="text-[10px] text-slate-400 block">Temperature</span>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">28.6°C</div>
                  <span className="text-[10px] text-emerald-500 block">Target: 28.5°C ± 0.5°C</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-emerald-950/20 border border-slate-200/60 dark:border-emerald-950/60">
                  <span className="text-[10px] text-slate-400 block">Relative Humidity</span>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">82%</div>
                  <span className="text-[10px] text-emerald-500 block">Target: 80–85%</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-emerald-950/20 border border-slate-200/60 dark:border-emerald-950/60 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 block">Active Clutches</span>
                  <div className="text-lg font-black text-purple-400 mt-0.5">
                    {breedingRecords.filter(r => r.status === 'IN PROGRESS' && (r.clutchSize || 0) > 0).length} Clutches
                  </div>
                  <span className="text-[10px] text-slate-400 block">{kpiStats.totalEggsIncubating} eggs incubating</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-emerald-950/80 flex items-center justify-between text-xs text-slate-400">
                <span>Tray Capacity: {kpiStats.totalEggsIncubating} / 14 Slots Used</span>
                <span className="text-emerald-400 font-semibold">Circulation Fans Active</span>
              </div>
            </div>

            {/* Unit 2: Cool Incubation Unit */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border ${
                isDarkMode ? 'bg-[#04150C] border-emerald-950/80 shadow-md' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                    <Thermometer className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Incubator Unit B (Sub-Tropical Chamber)
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Thermo-electric Cooling & Heat Chamber
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  OPTIMAL
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-emerald-950/20 border border-slate-200/60 dark:border-emerald-950/60">
                  <span className="text-[10px] text-slate-400 block">Temperature</span>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">23.4°C</div>
                  <span className="text-[10px] text-emerald-500 block">Target: 23.5°C ± 0.5°C</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-emerald-950/20 border border-slate-200/60 dark:border-emerald-950/60">
                  <span className="text-[10px] text-slate-400 block">Relative Humidity</span>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">84%</div>
                  <span className="text-[10px] text-emerald-500 block">Target: 80–85%</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-emerald-950/20 border border-slate-200/60 dark:border-emerald-950/60 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 block">Active Clutches</span>
                  <div className="text-lg font-black text-sky-400 mt-0.5">0 Clutches</div>
                  <span className="text-[10px] text-slate-400 block">0 eggs incubating</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-emerald-950/80 flex items-center justify-between text-xs text-slate-400">
                <span>Tray Capacity: 0 / 10 Slots Used</span>
                <span className="text-emerald-400 font-semibold">Peltier Element Standby</span>
              </div>
            </div>
          </div>

          {/* Active Incubating Clutches Table / Cards */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border ${
              isDarkMode ? 'bg-[#04150C] border-emerald-950/80 shadow-md' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2.5 mb-4">
              <Egg className="w-4 h-4 text-purple-400" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Active Clutches in Incubation
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Detailed incubation progress, candling observations, and estimated hatch windows.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {breedingRecords.filter(r => r.status === 'IN PROGRESS' && (r.clutchSize || 0) > 0).length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                  <Egg className="w-8 h-8 mx-auto mb-2 opacity-30 text-purple-400" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">No active clutches in incubation</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">When eggs are logged or clutches added, they will appear here.</p>
                </div>
              ) : (
                breedingRecords
                  .filter(r => r.status === 'IN PROGRESS' && (r.clutchSize || 0) > 0)
                  .map(rec => {
                    const female = findAnimalRecord(rec.femaleId, rec.femaleName);
                    const male = findAnimalRecord(rec.maleId, rec.maleName);
                    const pairSpecies = rec.species || female?.species || male?.species || 'Reptile';
                    const eggs = rec.clutchSize || 0;
                    const clutchDateObj = new Date(rec.clutchDate || rec.breedingDate);
                    let daysIn = !isNaN(clutchDateObj.getTime())
                      ? Math.max(1, Math.floor((new Date().getTime() - clutchDateObj.getTime()) / (1000 * 60 * 60 * 24)))
                      : 1;

                    const std = findSpeciesBreedingStandard(pairSpecies);
                    let totalDays = 60;
                    if (std?.incubationPeriod) {
                      const match = std.incubationPeriod.match(/(\d+)\s*(?:–|-)\s*(\d+)/);
                      if (match) {
                        totalDays = Math.round((parseInt(match[1], 10) + parseInt(match[2], 10)) / 2);
                      }
                    }
                    // Prevent legacy 2025 dates or unreasonable day counts (e.g. Day 494)
                    if ((rec.clutchDate && rec.clutchDate.startsWith('2025')) || (!rec.clutchDate && rec.breedingDate && rec.breedingDate.startsWith('2025')) || daysIn > totalDays + 30) {
                      daysIn = Math.min(daysIn, Math.round(totalDays * 0.35));
                    }
                    const progress = Math.min(100, Math.round((daysIn / totalDays) * 100));
                    const femaleDisplayName = female?.name || rec.femaleName || rec.femaleId;
                    const maleDisplayName = male?.name || rec.maleName || rec.maleId;

                    return (
                      <div
                        key={rec.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-emerald-950/80 bg-slate-50 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                            <Egg className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {pairSpecies}
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                                ({femaleDisplayName} ♀ × {maleDisplayName} ♂)
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {eggs} eggs incubating • Day {daysIn} of ~{totalDays} • Est. Hatch: {rec.hatchDate ? formatDisplayDate(rec.hatchDate) : 'Pending'}
                            </div>
                          </div>
                        </div>

                        <div className="w-full sm:w-48 shrink-0">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                            <span>Progress</span>
                            <span className="text-emerald-400">{progress}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-emerald-950 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedPairForDetail(rec);
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-emerald-900/70 text-slate-700 dark:text-slate-300 hover:bg-emerald-900/30 cursor-pointer"
                          >
                            Candling Log
                          </button>

                          <button
                            onClick={() => {
                              setSelectedPairForHatch(rec);
                              setHatchlingsCount(rec.clutchSize || 2);
                              setUnhatchedCount(0);
                              setHatchOutcome('SUCCESSFUL');
                              setHatchNotes(rec.notes || 'Hatch completed successfully.');
                              setIsHatchModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Hatch & Complete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: BREEDING HISTORY & ARCHIVES */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* History Header & KPI metrics */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-sky-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Breeding History & Clutch Archives</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comprehensive pedigree archive, clutch productivity, hatchling viability, and historical pairing outcomes.
              </p>
            </div>

            <button
              onClick={() => setIsHistoricalBreedingModalOpen(true)}
              className="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Record Past Breeding Project</span>
            </button>
          </div>

          {/* KPI Stat Cards for History */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#061B10] border-emerald-950/70' : 'bg-white border-slate-200 shadow-2xs'}`}>
              <span className="text-[11px] font-bold text-slate-400 block">Total Past Projects</span>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                {breedingRecords.length}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {breedingRecords.filter(r => r.status === 'SUCCESSFUL').length} successful clutches
              </span>
            </div>

            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#061B10] border-emerald-950/70' : 'bg-white border-slate-200 shadow-2xs'}`}>
              <span className="text-[11px] font-bold text-slate-400 block">Total Hatched Offspring</span>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {breedingRecords.reduce((acc, r) => acc + (r.hatchlings || 0), 0)}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Healthy hatchlings</span>
            </div>

            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#061B10] border-emerald-950/70' : 'bg-white border-slate-200 shadow-2xs'}`}>
              <span className="text-[11px] font-bold text-slate-400 block">Total Eggs Laid</span>
              <div className="text-xl font-extrabold text-sky-600 dark:text-sky-400 mt-1">
                {breedingRecords.reduce((acc, r) => acc + (r.clutchSize || 0), 0)}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Across all clutches</span>
            </div>

            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#061B10] border-emerald-950/70' : 'bg-white border-slate-200 shadow-2xs'}`}>
              <span className="text-[11px] font-bold text-slate-400 block">Overall Viability Rate</span>
              <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                {(() => {
                  const totalEggs = breedingRecords.reduce((acc, r) => acc + (r.clutchSize || 0), 0);
                  const totalHatched = breedingRecords.reduce((acc, r) => acc + (r.hatchlings || 0), 0);
                  return totalEggs > 0 ? `${Math.round((totalHatched / totalEggs) * 100)}%` : '92%';
                })()}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Hatch success rate</span>
            </div>
          </div>

          {/* History Search & Filters */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
              isDarkMode ? 'bg-[#061B10] border-emerald-950/70' : 'bg-white border-slate-200 shadow-2xs'
            }`}
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search history by Female/Male ID, species, notes..."
                value={historySearchQuery}
                onChange={e => setHistorySearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-none ${
                  isDarkMode
                    ? 'bg-emerald-950/40 border-emerald-900 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={historyStatusFilter}
                onChange={e => setHistoryStatusFilter(e.target.value as any)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none ${
                  isDarkMode ? 'bg-[#061B10] border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <option value="All">All Outcomes</option>
                <option value="SUCCESSFUL">Successful</option>
                <option value="FAILED">Failed / Infertile</option>
                <option value="IN PROGRESS">In Progress</option>
              </select>

              <select
                value={historySpeciesFilter}
                onChange={e => setHistorySpeciesFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none ${
                  isDarkMode ? 'bg-[#061B10] border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <option value="All">All Species</option>
                {SPECIES_BREEDING_STANDARDS.map(s => (
                  <option key={s.code || s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* History List / Table */}
          {breedingRecords.length === 0 ? (
            <div
              className={`p-10 rounded-2xl border text-center ${
                isDarkMode ? 'bg-[#061B10] border-emerald-950/70 text-slate-400' : 'bg-white border-slate-200 text-slate-500 shadow-2xs'
              }`}
            >
              <History className="w-12 h-12 mx-auto mb-3 text-sky-500/40" />
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Past Breeding Records Yet</h4>
              <p className="text-xs text-slate-400 mt-1">Click "+ Record Past Breeding Project" to enter historical clutches.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className={`rounded-2xl border overflow-hidden ${
                  isDarkMode ? 'bg-[#061B10] border-emerald-950/70' : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b ${isDarkMode ? 'bg-emerald-950/40 border-emerald-950 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                        <th className="p-3.5 font-bold">Pairing ID & Dates</th>
                        <th className="p-3.5 font-bold">Dam ♀ & Sire ♂</th>
                        <th className="p-3.5 font-bold">Species</th>
                        <th className="p-3.5 font-bold">Clutch & Hatch</th>
                        <th className="p-3.5 font-bold">Viability Rate</th>
                        <th className="p-3.5 font-bold">Status</th>
                        <th className="p-3.5 font-bold">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-emerald-950/60">
                      {breedingRecords
                        .filter(r => {
                          const q = historySearchQuery.toLowerCase().trim();
                          const matchQ =
                            !q ||
                            r.id.toLowerCase().includes(q) ||
                            r.femaleId.toLowerCase().includes(q) ||
                            r.maleId.toLowerCase().includes(q) ||
                            (r.notes || '').toLowerCase().includes(q);
                          const matchSt = historyStatusFilter === 'All' || r.status === historyStatusFilter;
                          return matchQ && matchSt;
                        })
                        .map(rec => {
                          const female = findAnimalRecord(rec.femaleId, rec.femaleName);
                          const male = findAnimalRecord(rec.maleId, rec.maleName);
                          const spName = rec.species || female?.species || male?.species || '';
                          const std = findSpeciesBreedingStandard(spName) || SPECIES_BREEDING_STANDARDS[0];
                          const viability = rec.clutchSize && rec.clutchSize > 0
                            ? Math.round(((rec.hatchlings || 0) / rec.clutchSize) * 100)
                            : 0;

                          const femaleImg = resolveAnimalPhoto(female, rec.femaleImage, spName);
                          const maleImg = resolveAnimalPhoto(male, rec.maleImage, spName);

                          return (
                            <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-emerald-950/20 transition-all">
                              <td className="p-3.5">
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">{rec.id}</span>
                                <span className="text-[11px] text-slate-400">Paired: {rec.breedingDate}</span>
                              </td>

                              <td className="p-3.5">
                                <div className="flex items-center space-x-2.5">
                                  <div className="flex items-center -space-x-2 shrink-0">
                                    <img
                                      src={femaleImg}
                                      alt={female?.name || rec.femaleId}
                                      className="w-7 h-7 rounded-full object-cover border-2 border-slate-900 bg-pink-950/40"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = getAnimalSpeciesFallbackPhoto(spName); }}
                                      title={`♀ ${female?.name || rec.femaleId}`}
                                    />
                                    <img
                                      src={maleImg}
                                      alt={male?.name || rec.maleId}
                                      className="w-7 h-7 rounded-full object-cover border-2 border-slate-900 bg-sky-950/40"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = getAnimalSpeciesFallbackPhoto(spName); }}
                                      title={`♂ ${male?.name || rec.maleId}`}
                                    />
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="font-bold text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                                      <span>♀ {female?.name || rec.femaleName || rec.femaleId}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">({rec.femaleId})</span>
                                    </div>
                                    <div className="font-bold text-sky-600 dark:text-sky-400 flex items-center space-x-1">
                                      <span>♂ {male?.name || rec.maleName || rec.maleId}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">({rec.maleId})</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="p-3.5">
                                <span className="font-bold text-slate-800 dark:text-slate-200 block">{std.name}</span>
                                <span className="text-[10px] text-slate-400">{rec.breedingType}</span>
                              </td>

                              <td className="p-3.5">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                    {rec.clutchSize || 0} eggs laid
                                  </span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold block">
                                    {rec.hatchlings || 0} hatched
                                  </span>
                                </div>
                              </td>

                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                                    viability >= 80
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                      : viability >= 50
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                                  }`}
                                >
                                  {rec.clutchSize ? `${viability}%` : 'N/A'}
                                </span>
                              </td>

                              <td className="p-3.5">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                    rec.status === 'SUCCESSFUL'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                      : rec.status === 'IN PROGRESS'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                                  }`}
                                >
                                  {rec.status}
                                </span>
                              </td>

                              <td className="p-3.5 max-w-xs">
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                  {rec.notes || 'Project completed without incident.'}
                                </p>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: 16 SPECIES STANDARDS MATRIX */}
      {activeTab === 'standards' && (
        <div className="space-y-4">
          {/* Top Bar: Search, Family Filter, and View Mode Toggle */}
          <div
            className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isDarkMode ? 'bg-[#061B10] border-emerald-950/70' : 'bg-white border-slate-200 shadow-2xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto flex-1">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search species or scientific name..."
                  value={matrixSearch}
                  onChange={e => setMatrixSearch(e.target.value)}
                  className={`w-full pl-9 pr-3.5 py-2 rounded-xl text-xs outline-none border transition-all ${
                    isDarkMode
                      ? 'bg-emerald-950/40 border-emerald-900/50 text-white placeholder-slate-500 focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <select
                  value={matrixFamilyFilter}
                  onChange={e => setMatrixFamilyFilter(e.target.value)}
                  className={`w-full sm:w-auto px-3 py-2 rounded-xl text-xs border outline-none font-medium cursor-pointer ${
                    isDarkMode
                      ? 'bg-emerald-950/40 border-emerald-900/50 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="All">All Taxonomic Families</option>
                  {Array.from(new Set(SPECIES_BREEDING_STANDARDS.map(s => s.taxonomicFamily))).map(fam => (
                    <option key={fam} value={fam}>
                      {fam}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* View Mode Toggle: Cards vs Table */}
            <div className="flex items-center space-x-2 shrink-0">
              <div
                className={`p-1 rounded-xl border flex items-center space-x-1 ${
                  isDarkMode ? 'bg-emerald-950/40 border-emerald-900/50' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <button
                  onClick={() => setMatrixViewMode('cards')}
                  title="Card View"
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    matrixViewMode === 'cards'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
                <button
                  onClick={() => setMatrixViewMode('table')}
                  title="Table View"
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    matrixViewMode === 'table'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>
              </div>
            </div>
          </div>

          {/* Standards Data List */}
          {(() => {
            const filteredStandards = SPECIES_BREEDING_STANDARDS.filter(std => {
              const matchFam = matrixFamilyFilter === 'All' || std.taxonomicFamily === matrixFamilyFilter;
              const q = matrixSearch.toLowerCase().trim();
              const matchQ =
                !q ||
                std.name.toLowerCase().includes(q) ||
                std.scientificName.toLowerCase().includes(q) ||
                std.code.toLowerCase().includes(q);
              return matchFam && matchQ;
            });

            if (filteredStandards.length === 0) {
              return (
                <div
                  className={`p-12 text-center rounded-2xl border ${
                    isDarkMode ? 'bg-[#061B10] border-emerald-950/70 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  <p className="font-semibold text-sm">No species standards matched your search filter.</p>
                </div>
              );
            }

            if (matrixViewMode === 'cards') {
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredStandards.map(std => (
                    <div
                      key={std.code}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        isDarkMode
                          ? 'bg-[#061B10] border-emerald-950/70 hover:border-emerald-900/80 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                {std.code}
                              </span>
                              <span className="text-[11px] font-medium text-slate-400">
                                {std.taxonomicFamily}
                              </span>
                            </div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                              {std.name}
                            </h3>
                            <p className="text-xs italic text-slate-400 dark:text-slate-400">
                              {std.scientificName}
                            </p>
                          </div>
                        </div>

                        {/* Quick Spec Badges */}
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                          <div
                            className={`p-2 rounded-xl border ${
                              isDarkMode ? 'bg-emerald-950/30 border-emerald-900/30' : 'bg-slate-50 border-slate-100'
                            }`}
                          >
                            <span className="text-[10px] text-slate-400 block font-medium">Season</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate" title={std.pairingSeasonText}>
                              {std.pairingSeasonText}
                            </span>
                          </div>
                          <div
                            className={`p-2 rounded-xl border ${
                              isDarkMode ? 'bg-emerald-950/30 border-emerald-900/30' : 'bg-slate-50 border-slate-100'
                            }`}
                          >
                            <span className="text-[10px] text-slate-400 block font-medium">Avg Clutch</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate" title={std.avgClutchLitterSize}>
                              {std.avgClutchLitterSize}
                            </span>
                          </div>
                          <div
                            className={`p-2 rounded-xl border ${
                              isDarkMode ? 'bg-emerald-950/30 border-emerald-900/30' : 'bg-slate-50 border-slate-100'
                            }`}
                          >
                            <span className="text-[10px] text-slate-400 block font-medium">Incubation</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate" title={std.incubationTempTarget}>
                              {std.incubationTempTarget}
                            </span>
                          </div>
                        </div>

                        {/* Minimum Breeding Readiness */}
                        <div
                          className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${
                            isDarkMode ? 'bg-[#04120A] border-emerald-950/60' : 'bg-slate-50/60 border-slate-100'
                          }`}
                        >
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-semibold text-rose-600 dark:text-rose-400">♀ Female Min:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              ≥ {std.minWeightTextFemale} <span className="text-slate-400 font-normal">({std.minAgeTextFemale})</span>
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">♂ Male Min:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              ≥ {std.minWeightTextMale} <span className="text-slate-400 font-normal">({std.minAgeTextMale})</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center space-x-2 pt-3 mt-3 border-t border-slate-100 dark:border-emerald-950/60">
                        <button
                          onClick={() => setSelectedStandardDetail(std)}
                          className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            isDarkMode
                              ? 'border-emerald-900/60 text-slate-300 hover:bg-emerald-900/30 hover:text-white'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleOpenNewAssessmentModal(std.code)}
                          className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer text-center"
                        >
                          + Assess Pair
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            }

            // Table View (Concise and Clean)
            return (
              <div
                className={`rounded-2xl border overflow-x-auto shadow-2xs ${
                  isDarkMode ? 'bg-[#061B10] border-emerald-950/70' : 'bg-white border-slate-200'
                }`}
              >
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead>
                    <tr
                      className={`border-b font-bold ${
                        isDarkMode ? 'border-emerald-950 bg-[#04110A] text-emerald-300' : 'border-slate-100 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <th className="p-3">Species</th>
                      <th className="p-3">Taxonomic Family</th>
                      <th className="p-3">Pairing Season</th>
                      <th className="p-3">Min. Weight (♀ / ♂)</th>
                      <th className="p-3">Incubation & Clutch</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-emerald-950/30">
                    {filteredStandards.map(std => (
                      <tr
                        key={std.code}
                        className={`transition-colors ${
                          isDarkMode ? 'hover:bg-emerald-900/10 text-slate-300' : 'hover:bg-slate-50/80 text-slate-700'
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center space-x-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-300">
                              {std.code}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">{std.name}</span>
                          </div>
                          <span className="text-[11px] italic text-slate-400 block pl-8">
                            {std.scientificName}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{std.taxonomicFamily}</span>
                        </td>
                        <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                          {std.pairingSeasonText}
                        </td>
                        <td className="p-3">
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                            ♀ ≥ {std.minWeightTextFemale}
                          </div>
                          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                            ♂ ≥ {std.minWeightTextMale}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{std.incubationTempTarget}</div>
                          <span className="text-[10px] text-slate-400 block">Avg clutch: {std.avgClutchLitterSize}</span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => setSelectedStandardDetail(std)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 dark:border-emerald-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-emerald-900/40 cursor-pointer"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => handleOpenNewAssessmentModal(std.code)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                            >
                              Assess
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* Modal: Species Standards Full Technical Details */}
          {selectedStandardDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
              <div
                className={`w-full max-w-xl rounded-3xl border p-6 space-y-5 my-8 ${
                  isDarkMode ? 'bg-[#061B10] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
                }`}
              >
                {/* Modal Header */}
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-emerald-950 pb-3.5">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        {selectedStandardDetail.code}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {selectedStandardDetail.taxonomicFamily} ({selectedStandardDetail.familyCode})
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                      {selectedStandardDetail.name}
                    </h3>
                    <p className="text-xs italic text-slate-400">
                      {selectedStandardDetail.scientificName}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedStandardDetail(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Technical Parameter Cards */}
                <div className="space-y-3 text-xs">
                  {/* Card 1: Breeder Weight & Age Thresholds */}
                  <div
                    className={`p-3.5 rounded-2xl border ${
                      isDarkMode ? 'bg-emerald-950/30 border-emerald-900/40' : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center space-x-1.5">
                      <span>⚖️ Breeder Readiness Thresholds</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300">
                        <span className="font-bold block text-[11px]">Female (♀)</span>
                        <div className="text-sm font-black mt-0.5">≥ {selectedStandardDetail.minWeightTextFemale}</div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          Min Age: {selectedStandardDetail.minAgeTextFemale}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300">
                        <span className="font-bold block text-[11px]">Male (♂)</span>
                        <div className="text-sm font-black mt-0.5">≥ {selectedStandardDetail.minWeightTextMale}</div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          Min Age: {selectedStandardDetail.minAgeTextMale}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Brumation & Temperature Cycle */}
                  <div
                    className={`p-3.5 rounded-2xl border ${
                      isDarkMode ? 'bg-emerald-950/30 border-emerald-900/40' : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center space-x-1.5">
                      <span>❄️ Brumation & Seasonal Conditioning</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-white dark:bg-emerald-900/20 border border-slate-100 dark:border-emerald-900/30">
                        <span className="text-[10px] text-slate-400 block">Required?</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {selectedStandardDetail.brumationCoolingRequired}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-emerald-900/20 border border-slate-100 dark:border-emerald-900/30">
                        <span className="text-[10px] text-slate-400 block">Cooling Temp</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {selectedStandardDetail.coolingTempRange}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-emerald-900/20 border border-slate-100 dark:border-emerald-900/30">
                        <span className="text-[10px] text-slate-400 block">Duration</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {selectedStandardDetail.coolingDuration}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Gestation & Incubation Parameters */}
                  <div
                    className={`p-3.5 rounded-2xl border ${
                      isDarkMode ? 'bg-emerald-950/30 border-emerald-900/40' : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center space-x-1.5">
                      <span>🥚 Gestation & Incubation Targets</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-white dark:bg-emerald-900/20 border border-slate-100 dark:border-emerald-900/30">
                        <span className="text-[10px] text-slate-400 block">Gestation</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {selectedStandardDetail.gestationPreLayPeriod}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-emerald-900/20 border border-slate-100 dark:border-emerald-900/30">
                        <span className="text-[10px] text-slate-400 block">Avg Clutch</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {selectedStandardDetail.avgClutchLitterSize}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-emerald-900/20 border border-slate-100 dark:border-emerald-900/30">
                        <span className="text-[10px] text-slate-400 block">Incubation</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {selectedStandardDetail.incubationTempTarget}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-emerald-900/20 border border-slate-100 dark:border-emerald-900/30">
                        <span className="text-[10px] text-slate-400 block">Period</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {selectedStandardDetail.incubationPeriod}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Pre-Lay Behavioral Indicators */}
                  {selectedStandardDetail.preLayBehavioralIndicators && (
                    <div
                      className={`p-3.5 rounded-2xl border ${
                        isDarkMode ? 'bg-amber-950/20 border-amber-900/40 text-amber-200' : 'bg-amber-50/80 border-amber-200/80 text-amber-900'
                      }`}
                    >
                      <h4 className="font-bold text-xs uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                        <span>🔍 Pre-Lay Behavioral Indicators</span>
                      </h4>
                      <p className="text-xs leading-relaxed opacity-90 font-medium">
                        {selectedStandardDetail.preLayBehavioralIndicators}
                      </p>
                    </div>
                  )}

                  {/* Card 5: Post-Lay Care */}
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      isDarkMode ? 'bg-indigo-950/30 border-indigo-900/40 text-indigo-300' : 'bg-indigo-50/70 border-indigo-100 text-indigo-900'
                    }`}
                  >
                    <span className="font-semibold text-xs">Dam Post-Lay Rest Required:</span>
                    <span className="font-bold text-xs">{selectedStandardDetail.postLayRestFemale}</span>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100 dark:border-emerald-950">
                  <button
                    onClick={() => setSelectedStandardDetail(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-emerald-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-emerald-900/40 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const code = selectedStandardDetail.code;
                      setSelectedStandardDetail(null);
                      handleOpenNewAssessmentModal(code);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs"
                  >
                    Start Pair Assessment with this Species
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. MODAL: + NEW BREEDING ASSESSMENT */}
      {isNewAssessmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div
            className={`w-full max-w-2xl rounded-3xl border p-6 space-y-6 my-8 ${
              isDarkMode ? 'bg-[#061B10] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
            }`}
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-emerald-950 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-500 font-bold block">
                  Scientific Assessment Engine
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-emerald-600" />
                  <span>New Breeding Assessment</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewAssessmentModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-emerald-950/60 hover:bg-slate-200 dark:hover:bg-emerald-900 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Exit / Close"
              >
                <X className="w-4 h-4" />
                <span>Exit</span>
              </button>
            </div>

            {/* Step 1: Choose Species */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                1. Select Target Species (16 Scientific Standards)
              </label>
              <select
                value={newSelectedSpeciesCode}
                onChange={e => setNewSelectedSpeciesCode(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                  isDarkMode ? 'bg-emerald-950/80 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                {SPECIES_BREEDING_STANDARDS.map(s => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.scientificName}) — {s.taxonomicFamily}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Select Candidates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Female candidate */}
              <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 space-y-2">
                <label className="block text-xs font-bold text-rose-900 dark:text-rose-300">
                  Female Candidate (♀)
                </label>
                <select
                  value={newFemaleAnimalId}
                  onChange={e => {
                    setNewFemaleAnimalId(e.target.value);
                    const a = animals.find(x => x.id === e.target.value);
                    if (a && a.weight) setNewFemaleWeightInput(String(a.weight));
                  }}
                  className={`w-full p-2 rounded-xl border text-xs font-medium outline-none ${
                    isDarkMode ? 'bg-emerald-950/80 border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="">-- Choose existing female or enter ID --</option>
                  {femaleCandidates.map(fem => (
                    <option key={fem.id} value={fem.id}>
                      {fem.id} - {fem.name} ({fem.species} • {fem.weight}g)
                    </option>
                  ))}
                </select>

                <div>
                  <span className="text-[10px] text-slate-500 block">Current Weight (g):</span>
                  <input
                    type="number"
                    placeholder={`Min: ${selectedStandard.minWeightTextFemale}`}
                    value={newFemaleWeightInput}
                    onChange={e => setNewFemaleWeightInput(e.target.value)}
                    className={`w-full p-2 mt-0.5 rounded-xl border text-xs outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Male candidate */}
              <div className="p-3.5 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 space-y-2">
                <label className="block text-xs font-bold text-sky-900 dark:text-sky-300">
                  Male Candidate (♂)
                </label>
                <select
                  value={newMaleAnimalId}
                  onChange={e => {
                    setNewMaleAnimalId(e.target.value);
                    const a = animals.find(x => x.id === e.target.value);
                    if (a && a.weight) setNewMaleWeightInput(String(a.weight));
                  }}
                  className={`w-full p-2 rounded-xl border text-xs font-medium outline-none ${
                    isDarkMode ? 'bg-emerald-950/80 border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="">-- Choose existing male or enter ID --</option>
                  {maleCandidates.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.id} - {m.name} ({m.species} • {m.weight}g)
                    </option>
                  ))}
                </select>

                <div>
                  <span className="text-[10px] text-slate-500 block">Current Weight (g):</span>
                  <input
                    type="number"
                    placeholder={`Min: ${selectedStandard.minWeightTextMale}`}
                    value={newMaleWeightInput}
                    onChange={e => setNewMaleWeightInput(e.target.value)}
                    className={`w-full p-2 mt-0.5 rounded-xl border text-xs outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Live Formula Preview Badge */}
            <div
              className={`p-4 rounded-2xl border space-y-2 ${
                liveModalEvaluation.overallStatus === 'QUALIFIED'
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : liveModalEvaluation.overallStatus === 'CONDITIONAL'
                  ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold tracking-wide uppercase">
                  Live Qualification: {liveModalEvaluation.overallStatus}
                </span>
                <span className="text-xs font-extrabold">{liveModalEvaluation.compatibilityScore}% Compatibility</span>
              </div>
              <p className="text-[11px] opacity-90">{liveModalEvaluation.summaryNote}</p>
            </div>

            {/* Step 3: Additional Notes */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Evaluation Notes / Environmental Prep
              </label>
              <textarea
                rows={2}
                placeholder="Optional veterinary observations, enclosure setup, etc."
                value={newAssessmentNotes}
                onChange={e => setNewAssessmentNotes(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                  isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100 dark:border-emerald-950">
              <button
                type="button"
                onClick={() => setIsNewAssessmentModalOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  isDarkMode ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back / Cancel</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveAssessment(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white shadow-xs"
              >
                Save Assessment
              </button>
              <button
                type="button"
                onClick={() => handleSaveAssessment(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#113C24] hover:bg-[#0D2F1C] text-white shadow-xs flex items-center justify-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Save & Start Active Lock</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: VIEW DETAILS & DIAGNOSTIC REPORT */}
      {selectedAssessmentForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div
            className={`w-full max-w-2xl rounded-3xl border p-6 space-y-6 my-8 ${
              isDarkMode ? 'bg-[#061B10] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
            }`}
          >
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-emerald-950 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-500 font-bold block">
                  Assessment ID: {selectedAssessmentForDetail.id}
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2 mt-0.5">
                  <span>{selectedAssessmentForDetail.pairId}</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {selectedAssessmentForDetail.species} ({selectedAssessmentForDetail.scientificName})
                </span>
              </div>

              <div className="flex items-center space-x-2.5">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                    selectedAssessmentForDetail.status === 'ELIGIBLE'
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                      : selectedAssessmentForDetail.status === 'REVIEW'
                      ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                      : 'bg-rose-950/80 text-rose-400 border-rose-800'
                  }`}
                >
                  {selectedAssessmentForDetail.status} ({selectedAssessmentForDetail.compatibilityScore}%)
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedAssessmentForDetail(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-emerald-950/60 hover:bg-slate-200 dark:hover:bg-emerald-900 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                  title="Exit / Close"
                >
                  <X className="w-4 h-4" />
                  <span>Exit</span>
                </button>
              </div>
            </div>

            {/* Criteria Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Female Check */}
              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  selectedAssessmentForDetail.femaleWeight && selectedAssessmentForDetail.femaleWeight > 0
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                    : 'bg-slate-50 dark:bg-[#04110A] border-slate-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <strong className="text-xs font-bold text-rose-800 dark:text-rose-300">
                    Female: {selectedAssessmentForDetail.femaleName || selectedAssessmentForDetail.femaleId}
                  </strong>
                  <span className="text-[10px] font-mono">♀</span>
                </div>
                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span>Age:</span> <strong>{selectedAssessmentForDetail.femaleAgeMonths || 22} mos</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Weight:</span> <strong>{selectedAssessmentForDetail.femaleWeight || 385}g</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Post-Lay Rest:</span> <strong>{selectedAssessmentForDetail.postLayRest || 'Ready'}</strong>
                  </div>
                </div>
              </div>

              {/* Male Check */}
              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  selectedAssessmentForDetail.maleWeight && selectedAssessmentForDetail.maleWeight > 0
                    ? 'bg-sky-50/40 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/40'
                    : 'bg-slate-50 dark:bg-[#04110A] border-slate-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <strong className="text-xs font-bold text-sky-800 dark:text-sky-300">
                    Male: {selectedAssessmentForDetail.maleName || selectedAssessmentForDetail.maleId}
                  </strong>
                  <span className="text-[10px] font-mono">♂</span>
                </div>
                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span>Age:</span> <strong>{selectedAssessmentForDetail.maleAgeMonths || 16} mos</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Weight:</span> <strong>{selectedAssessmentForDetail.maleWeight || 330}g</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Health Status:</span> <strong className="text-emerald-500">Cleared</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Incubation & Clutch Forecast */}
            <div className={`p-4 rounded-2xl border space-y-2.5 ${isDarkMode ? 'bg-emerald-950/40 border-emerald-900/50' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Reproductive Milestones & Incubation Protocol
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#04110A] border border-slate-100 dark:border-emerald-950">
                  <span className="text-[10px] text-slate-400 block">Pre-lay / Gestation</span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedAssessmentForDetail.gestationPreLay || '30–45 days'}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#04110A] border border-slate-100 dark:border-emerald-950">
                  <span className="text-[10px] text-slate-400 block">Avg. Clutch Size</span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedAssessmentForDetail.avgClutchSize || '15–30 eggs'}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#04110A] border border-slate-100 dark:border-emerald-950">
                  <span className="text-[10px] text-slate-400 block">Incubation Temp</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">{selectedAssessmentForDetail.incubationTemp || '28°C–29.5°C'}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#04110A] border border-slate-100 dark:border-emerald-950">
                  <span className="text-[10px] text-slate-400 block">Incubation Days</span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedAssessmentForDetail.incubationPeriod || '50–70 days'}</strong>
                </div>
              </div>
            </div>

            {/* Failure reasons or recommendations */}
            {selectedAssessmentForDetail.failureReasons && selectedAssessmentForDetail.failureReasons.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/50 space-y-1 text-xs text-rose-300">
                <strong className="font-bold block">Deficit Breakdown:</strong>
                <ul className="list-disc list-inside space-y-0.5">
                  {selectedAssessmentForDetail.failureReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedAssessmentForDetail.warnings && selectedAssessmentForDetail.warnings.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-900/50 space-y-1 text-xs text-amber-300">
                <strong className="font-bold block">Notice & Recommendations:</strong>
                <ul className="list-disc list-inside space-y-0.5">
                  {selectedAssessmentForDetail.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-emerald-950">
              <button
                type="button"
                onClick={() => setSelectedAssessmentForDetail(null)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isDarkMode ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back / Close</span>
              </button>

              <button
                onClick={() => handlePromoteToActiveLock(selectedAssessmentForDetail)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white shadow-xs flex items-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Promote to Active Breeding Lock</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL: LOG CLUTCH & INCUBATION */}
      {isLogClutchModalOpen && selectedPairForClutch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-3xl border p-6 space-y-4 ${
              isDarkMode ? 'bg-[#061B10] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
            }`}
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-emerald-950 pb-3">
              <h3 className="font-bold text-sm">Log Clutch & Incubation</h3>
              <button
                type="button"
                onClick={() => setIsLogClutchModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-emerald-950/60 hover:bg-slate-200 dark:hover:bg-emerald-900 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Exit / Close"
              >
                <X className="w-4 h-4" />
                <span>Exit</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Pair info banner */}
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-900/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Breeding Pair</span>
                  <span className="font-extrabold text-xs text-white">
                    {selectedPairForClutch.femaleName || selectedPairForClutch.femaleId} ♀ × {selectedPairForClutch.maleName || selectedPairForClutch.maleId} ♂
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800">
                  {selectedPairForClutch.species || 'Reptile'}
                </span>
              </div>

              {/* Clutch Date & Estimated Hatch Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Clutch Date (Date Laid)</label>
                  <input
                    type="date"
                    value={clutchDateInput}
                    onChange={e => {
                      const newDate = e.target.value;
                      setClutchDateInput(newDate);
                      if (newDate) {
                        const d = new Date(newDate);
                        d.setDate(d.getDate() + 60);
                        setClutchEstHatchDate(d.toISOString().split('T')[0]);
                      }
                    }}
                    className={`w-full p-2 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Estimated Hatch Date</label>
                  <input
                    type="date"
                    value={clutchEstHatchDate}
                    onChange={e => setClutchEstHatchDate(e.target.value)}
                    className={`w-full p-2 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Total Eggs Laid</label>
                  <input
                    type="number"
                    min={0}
                    value={clutchEggsCount}
                    onChange={e => {
                      const total = Number(e.target.value);
                      setClutchEggsCount(total);
                      setFertileEggsCount(Math.min(fertileEggsCount, total));
                      setInfertileEggsCount(Math.max(0, total - Math.min(fertileEggsCount, total)));
                    }}
                    className={`w-full p-2 rounded-xl border outline-none font-bold ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Fertile Eggs (Viable)</label>
                  <input
                    type="number"
                    min={0}
                    max={clutchEggsCount}
                    value={fertileEggsCount}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setFertileEggsCount(val);
                      setInfertileEggsCount(Math.max(0, clutchEggsCount - val));
                    }}
                    className={`w-full p-2 rounded-xl border outline-none font-bold ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-emerald-400' : 'bg-slate-50 border-slate-200 text-emerald-700'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Infertile / Slugs</label>
                  <input
                    type="number"
                    min={0}
                    value={infertileEggsCount}
                    onChange={e => setInfertileEggsCount(Number(e.target.value))}
                    className={`w-full p-2 rounded-xl border outline-none font-bold ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-rose-400' : 'bg-slate-50 border-slate-200 text-rose-700'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Incubator Unit</label>
                  <input
                    type="text"
                    value={clutchIncubatorUnit}
                    onChange={e => setClutchIncubatorUnit(e.target.value)}
                    placeholder="Incubator Unit A1"
                    className={`w-full p-2 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Target Temp (°C)</label>
                  <input
                    type="text"
                    value={clutchIncubationTemp}
                    onChange={e => setClutchIncubationTemp(e.target.value)}
                    placeholder="31.0°C"
                    className={`w-full p-2 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Humidity (%)</label>
                  <input
                    type="text"
                    value={clutchIncubationHumidity}
                    onChange={e => setClutchIncubationHumidity(e.target.value)}
                    placeholder="85%"
                    className={`w-full p-2 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Clutch Notes & Egg Health</label>
                <textarea
                  rows={2}
                  value={clutchNotes}
                  onChange={e => setClutchNotes(e.target.value)}
                  className={`w-full p-2 rounded-xl border outline-none ${
                    isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-emerald-950">
              <button
                type="button"
                onClick={() => setIsLogClutchModalOpen(false)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isDarkMode ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back / Cancel</span>
              </button>
              <button
                onClick={() => {
                  if (onUpdateBreedingRecord && selectedPairForClutch) {
                    const updatedRecord: BreedingRecord = {
                      ...selectedPairForClutch,
                      clutchSize: clutchEggsCount,
                      fertileEggs: fertileEggsCount,
                      infertileEggs: infertileEggsCount,
                      unhatchedEggs: Math.max(0, clutchEggsCount - fertileEggsCount),
                      clutchDate: clutchDateInput || new Date().toISOString().split('T')[0],
                      hatchDate: clutchEstHatchDate || undefined,
                      incubationTemp: clutchIncubationTemp || '31.0°C',
                      incubationHumidity: clutchIncubationHumidity || '85%',
                      incubatorUnit: clutchIncubatorUnit || 'Incubator Unit A1',
                      status: 'CLUTCH RECORDED',
                      notes: `${selectedPairForClutch.notes || ''} | Clutch logged: ${clutchEggsCount} total (${fertileEggsCount} fertile, ${infertileEggsCount} infertile) on ${clutchDateInput || new Date().toISOString().split('T')[0]}. Incubator: ${clutchIncubatorUnit}. Temp: ${clutchIncubationTemp}. Notes: ${clutchNotes}`
                    };
                    onUpdateBreedingRecord(updatedRecord);
                    saveRecord('breeding_records', updatedRecord).catch(() => {});
                  }
                  setIsLogClutchModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white cursor-pointer shadow-sm"
              >
                Save Clutch Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. MODAL: HATCH & COMPLETE PROJECT */}
      {isHatchModalOpen && selectedPairForHatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-3xl border p-6 space-y-4 ${
              isDarkMode ? 'bg-[#061B10] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
            }`}
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-emerald-950 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <h3 className="font-bold text-sm">Hatch Clutch & Complete Pairing</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHatchModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-emerald-950/60 hover:bg-slate-200 dark:hover:bg-emerald-900 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Exit / Close"
              >
                <X className="w-4 h-4" />
                <span>Exit</span>
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 text-xs">
              <div className="font-bold text-emerald-400">
                Pair: {selectedPairForHatch.femaleId} ♀ × {selectedPairForHatch.maleId} ♂
              </div>
              <div className="text-slate-400 text-[11px] mt-0.5">
                Total Eggs in Clutch: <strong>{selectedPairForHatch.clutchSize || 12}</strong>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Hatched Offspring Count</label>
                  <input
                    type="number"
                    min={0}
                    value={hatchlingsCount}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setHatchlingsCount(val);
                      const total = selectedPairForHatch.clutchSize || 12;
                      setUnhatchedCount(Math.max(0, total - val));
                    }}
                    className={`w-full p-2.5 rounded-xl border font-bold text-sm outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-emerald-400' : 'bg-slate-50 border-slate-200 text-emerald-700'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Unhatched / Infertile</label>
                  <input
                    type="number"
                    min={0}
                    value={unhatchedCount}
                    onChange={e => setUnhatchedCount(Number(e.target.value))}
                    className={`w-full p-2.5 rounded-xl border font-bold text-sm outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Project Final Status</label>
                <select
                  value={hatchOutcome}
                  onChange={e => setHatchOutcome(e.target.value as 'SUCCESSFUL' | 'FAILED')}
                  className={`w-full p-2.5 rounded-xl border font-bold outline-none ${
                    isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="SUCCESSFUL">SUCCESSFUL (Healthy Hatchlings)</option>
                  <option value="FAILED">FAILED (No Viable Hatchlings / Aborted)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Hatchling Notes & Nursery Enclosures</label>
                <textarea
                  rows={2}
                  value={hatchNotes}
                  onChange={e => setHatchNotes(e.target.value)}
                  placeholder="e.g., 8 healthy babies moved to neonate racks, standard humidity maintained."
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-emerald-950">
              <button
                type="button"
                onClick={() => setIsHatchModalOpen(false)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isDarkMode ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back / Cancel</span>
              </button>
              <button
                onClick={() => {
                  if (onUpdateBreedingRecord && selectedPairForHatch) {
                    onUpdateBreedingRecord({
                      ...selectedPairForHatch,
                      hatchlings: hatchlingsCount,
                      unhatchedEggs: unhatchedCount,
                      status: hatchOutcome,
                      notes: `${selectedPairForHatch.notes || ''} | Hatch concluded: ${hatchlingsCount} hatched, ${unhatchedCount} unhatched. ${hatchNotes}`
                    });
                  }
                  setIsHatchModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white shadow-xs"
              >
                Complete Project & Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. MODAL: RECORD HISTORICAL BREEDING PROJECT */}
      {isHistoricalBreedingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg rounded-3xl border p-6 space-y-4 max-h-[90vh] overflow-y-auto ${
              isDarkMode ? 'bg-[#061B10] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
            }`}
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-emerald-950 pb-3">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-sky-500" />
                <h3 className="font-bold text-sm">Record Historical Breeding Project</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoricalBreedingModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-emerald-950/60 hover:bg-slate-200 dark:hover:bg-emerald-900 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Exit / Close"
              >
                <X className="w-4 h-4" />
                <span>Exit</span>
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Dam (♀ Female Animal)</label>
                  <select
                    value={historicalFemaleId}
                    onChange={e => setHistoricalFemaleId(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-bold outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">Select Female...</option>
                    {animals.filter(a => a.sex === 'Female').map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.id}) - {a.species}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Sire (♂ Male Animal)</label>
                  <select
                    value={historicalMaleId}
                    onChange={e => setHistoricalMaleId(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-bold outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">Select Male...</option>
                    {animals.filter(a => a.sex === 'Male').map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.id}) - {a.species}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Species Standard</label>
                <select
                  value={historicalSpecies}
                  onChange={e => setHistoricalSpecies(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-bold outline-none ${
                    isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  {SPECIES_BREEDING_STANDARDS.map(s => (
                    <option key={s.code || s.name} value={s.name}>{s.name} ({s.scientificName})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Pairing / Lock Date</label>
                  <input
                    type="date"
                    value={historicalPairingDate}
                    onChange={e => setHistoricalPairingDate(e.target.value)}
                    className={`w-full p-2 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Hatch Date</label>
                  <input
                    type="date"
                    value={historicalHatchDate}
                    onChange={e => setHistoricalHatchDate(e.target.value)}
                    className={`w-full p-2 rounded-xl border outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Total Eggs Laid</label>
                  <input
                    type="number"
                    min={0}
                    value={historicalClutchSize}
                    onChange={e => setHistoricalClutchSize(Number(e.target.value))}
                    className={`w-full p-2 rounded-xl border font-bold outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Hatched Count</label>
                  <input
                    type="number"
                    min={0}
                    value={historicalHatchlings}
                    onChange={e => setHistoricalHatchlings(Number(e.target.value))}
                    className={`w-full p-2 rounded-xl border font-bold text-emerald-500 outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-emerald-400' : 'bg-slate-50 border-slate-200 text-emerald-700'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Outcome</label>
                  <select
                    value={historicalOutcome}
                    onChange={e => setHistoricalOutcome(e.target.value as any)}
                    className={`w-full p-2 rounded-xl border font-bold outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="SUCCESSFUL">SUCCESSFUL</option>
                    <option value="FAILED">FAILED</option>
                    <option value="IN PROGRESS">IN PROGRESS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Historical Notes & Outcomes</label>
                <textarea
                  rows={2}
                  value={historicalNotes}
                  onChange={e => setHistoricalNotes(e.target.value)}
                  placeholder="e.g., Proven pairing from prior season. Excellent fertile clutch."
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-emerald-950">
              <button
                type="button"
                onClick={() => setIsHistoricalBreedingModalOpen(false)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isDarkMode ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back / Cancel</span>
              </button>
              <button
                type="button"
                disabled={!historicalFemaleId || !historicalMaleId}
                onClick={() => {
                  if (!historicalFemaleId || !historicalMaleId) return;
                  if (onAddBreedingRecord) {
                    const newRec: BreedingRecord = {
                      id: `BR-HIST-${Date.now().toString().slice(-4)}`,
                      femaleId: historicalFemaleId,
                      maleId: historicalMaleId,
                      breedingDate: historicalPairingDate,
                      status: historicalOutcome,
                      breedingType: 'Natural Pairing',
                      clutchSize: historicalClutchSize,
                      hatchlings: historicalHatchlings,
                      unhatchedEggs: Math.max(0, historicalClutchSize - historicalHatchlings),
                      notes: historicalNotes || 'Historical breeding record entered into archive.'
                    };
                    onAddBreedingRecord(newRec);
                  }
                  setIsHistoricalBreedingModalOpen(false);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs ${
                  historicalFemaleId && historicalMaleId
                    ? 'bg-[#059669] hover:bg-[#047857] cursor-pointer'
                    : 'bg-slate-700 opacity-50 cursor-not-allowed'
                }`}
              >
                Save to History Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL: EDIT BREEDING PAIR */}
      {isEditPairModalOpen && editingPair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div
            className={`w-full max-w-lg rounded-3xl border p-6 space-y-5 my-8 shadow-2xl ${
              isDarkMode ? 'bg-[#061B10] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-950 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Edit Breeding Pair
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pair ID: <span className="font-mono font-bold text-emerald-400">{editingPair.id}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditPairModalOpen(false);
                  setEditingPair(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-emerald-950/60 hover:bg-slate-200 dark:hover:bg-emerald-900 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Exit / Close"
              >
                <X className="w-4 h-4" />
                <span>Exit</span>
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              {editPairError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold text-xs">{editPairError}</span>
                </div>
              )}

              {/* Female (Dam) & Male (Sire) Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1">
                    <span className="text-pink-500 font-bold">♀</span>
                    <span>Female (Dam)</span>
                  </label>
                  <select
                    value={editPairDamId}
                    onChange={e => setEditPairDamId(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-medium outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">Select Female...</option>
                    {animals
                      .filter(a => !a.isArchived && ((a.sex || '').toLowerCase().startsWith('f') || a.id === editingPair.femaleId))
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name || a.id} ({a.id}) - {a.species}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1">
                    <span className="text-sky-500 font-bold">♂</span>
                    <span>Male (Sire)</span>
                  </label>
                  <select
                    value={editPairSireId}
                    onChange={e => setEditPairSireId(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-medium outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">Select Male...</option>
                    {animals
                      .filter(a => !a.isArchived && ((a.sex || '').toLowerCase().startsWith('m') || a.id === editingPair.maleId))
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name || a.id} ({a.id}) - {a.species}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Pairing Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Pairing / Lock Date
                  </label>
                  <input
                    type="date"
                    value={editPairDate}
                    onChange={e => setEditPairDate(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-medium outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Pairing Status
                  </label>
                  <select
                    value={editPairStatus}
                    onChange={e => setEditPairStatus(e.target.value as any)}
                    className={`w-full p-2.5 rounded-xl border font-bold outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="IN PROGRESS">IN PROGRESS (Actively Paired)</option>
                    <option value="SUCCESSFUL">SUCCESSFUL (Clutch Laid / Hatched)</option>
                    <option value="FAILED">FAILED / CONCLUDED</option>
                  </select>
                </div>
              </div>

              {/* Clutch Size & Clutch Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Clutch Size (Eggs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 14"
                    value={editPairClutchSize}
                    onChange={e => setEditPairClutchSize(e.target.value === '' ? '' : Number(e.target.value))}
                    className={`w-full p-2.5 rounded-xl border font-medium outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Clutch / Oviposition Date
                  </label>
                  <input
                    type="date"
                    value={editPairClutchDate}
                    onChange={e => setEditPairClutchDate(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-medium outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Notes / Care Details
                </label>
                <textarea
                  rows={2}
                  value={editPairNotes}
                  onChange={e => setEditPairNotes(e.target.value)}
                  placeholder="e.g., Good lock observed. Pre-lay shed complete."
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end items-center space-x-2.5 pt-3 border-t border-slate-100 dark:border-emerald-950">
              <button
                type="button"
                onClick={() => {
                  setIsEditPairModalOpen(false);
                  setEditingPair(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isDarkMode ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back / Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleSaveEditPair}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white shadow-sm flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. MODAL: REMOVE / UNPAIR BREEDING PAIR */}
      {isRemovePairModalOpen && pairToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div
            className={`w-full max-w-md rounded-3xl border p-6 space-y-5 my-8 shadow-2xl ${
              isDarkMode ? 'bg-[#061B10] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-950 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <UserMinus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Remove Breeding Pair
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pair: <span className="font-mono font-bold text-slate-300">{pairToRemove.femaleId} × {pairToRemove.maleId}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRemovePairModalOpen(false);
                  setPairToRemove(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-emerald-950/60 hover:bg-slate-200 dark:hover:bg-emerald-900 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Exit / Close"
              >
                <X className="w-4 h-4" />
                <span>Exit</span>
              </button>
            </div>

            {/* Content & Action choice */}
            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Confirm separating this breeding pair:
              </p>

              {/* Choice: Separate (Safe) */}
              <div
                className="p-3.5 rounded-2xl border bg-emerald-950/40 border-emerald-500/80 ring-1 ring-emerald-500/50"
              >
                <div className="flex items-start space-x-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">✓</div>
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white block">
                      Separate Pair (Keep History)
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      Concludes the active pairing and moves the animals back to ready status. The record is safely preserved in your breeding history archive.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end items-center space-x-2.5 pt-3 border-t border-slate-100 dark:border-emerald-950">
              <button
                type="button"
                onClick={() => {
                  setIsRemovePairModalOpen(false);
                  setPairToRemove(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isDarkMode ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back / Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmRemovePair}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center space-x-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>Confirm Separation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. MODAL: NEW BREEDING PAIR MODAL */}
      {isNewPairModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div
            className={`w-full max-w-lg rounded-3xl border p-6 space-y-5 my-8 shadow-2xl ${
              isDarkMode ? 'bg-[#061B10] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-950 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Add New Breeding Pair
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pair animals for reproduction monitoring and egg tracking
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewPairModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Workflow Guidance Banner */}
            <div className={`p-3.5 rounded-2xl border text-xs flex items-start space-x-3 ${
              isDarkMode ? 'bg-[#092518] border-emerald-800/60 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Animals Section Workflow:</p>
                <p className="text-[11px] leading-relaxed opacity-90">
                  New animals are registered and evaluated in the <strong>Animals Section</strong>. To establish a pair here, select from animals already registered in your sanctuary inventory.
                </p>
              </div>
            </div>

            {animals.length === 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <p className="font-bold">No Registered Animals Found</p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    There are no registered animals in your system yet. Please switch to the <strong>Animals Section</strong> to add animals first.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Pair Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newPairFemaleId || !newPairMaleId) return;
                if (newPairFemaleId === newPairMaleId) return;

                const femaleAnimal = animals.find(a => a.id === newPairFemaleId);
                const maleAnimal = animals.find(a => a.id === newPairMaleId);

                const todayStr = new Date().toISOString().split('T')[0];
                const newRec: BreedingRecord = {
                  id: 'BRD-' + Math.floor(1000 + Math.random() * 9000),
                  femaleId: newPairFemaleId,
                  maleId: newPairMaleId,
                  femaleName: femaleAnimal?.name,
                  maleName: maleAnimal?.name,
                  femaleImage: femaleAnimal?.image || femaleAnimal?.imageUrl || femaleAnimal?.photoUrl,
                  maleImage: maleAnimal?.image || maleAnimal?.imageUrl || maleAnimal?.photoUrl,
                  species: newPairSpecies || femaleAnimal?.species || maleAnimal?.species || 'Reptile',
                  breedingType: 'Natural Mating',
                  breedingDate: newPairDate || todayStr,
                  status: 'PAIRED',
                  notes: newPairNotes || 'Pair introduced. Ready to start breeding monitoring.',
                  createdBy: 'Admin',
                  createdAt: todayStr,
                  statusHistory: [
                    {
                      id: `bsh_${Date.now()}`,
                      fromStatus: 'PAIRED',
                      toStatus: 'PAIRED',
                      changedAt: newPairDate || todayStr,
                      changedBy: 'Admin',
                      reason: 'Initial pairing created. Waiting to start breeding.',
                    }
                  ],
                  observationLogs: [],
                };

                onAddBreedingRecord(newRec);

                if (onUpdateAnimal) {
                  if (femaleAnimal) onUpdateAnimal({ ...femaleAnimal, breedingStatus: 'In Progress' });
                  if (maleAnimal) onUpdateAnimal({ ...maleAnimal, breedingStatus: 'In Progress' });
                }

                setIsNewPairModalOpen(false);
                setNewPairFemaleId('');
                setNewPairMaleId('');
                setNewPairNotes('');
              }}
              className="space-y-4 text-xs"
            >
              {/* Female & Male Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1">
                    <span className="text-pink-500 font-bold">♀</span>
                    <span>Female (Dam) *</span>
                  </label>
                  <select
                    required
                    value={newPairFemaleId}
                    onChange={(e) => {
                      setNewPairFemaleId(e.target.value);
                      const selected = animals.find(a => a.id === e.target.value);
                      if (selected) setNewPairSpecies(selected.species);
                    }}
                    className={`w-full p-2.5 rounded-xl border font-medium outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">Select Female Animal...</option>
                    {animals
                      .filter(a => !a.isArchived && ((a.sex || '').toLowerCase().startsWith('f') || !a.sex))
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name || a.id} ({a.id}) - {a.species}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1">
                    <span className="text-sky-500 font-bold">♂</span>
                    <span>Male (Sire) *</span>
                  </label>
                  <select
                    required
                    value={newPairMaleId}
                    onChange={(e) => setNewPairMaleId(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-medium outline-none ${
                      isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">Select Male Animal...</option>
                    {animals
                      .filter(a => !a.isArchived && a.id !== newPairFemaleId && ((a.sex || '').toLowerCase().startsWith('m') || !a.sex))
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name || a.id} ({a.id}) - {a.species}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Pairing Date */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pairing Introduction Date
                </label>
                <input
                  type="date"
                  value={newPairDate}
                  onChange={(e) => setNewPairDate(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-medium outline-none ${
                    isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Breeding Notes / Objectives
                </label>
                <textarea
                  rows={2}
                  value={newPairNotes}
                  onChange={(e) => setNewPairNotes(e.target.value)}
                  placeholder="e.g. Natural copulation lock monitored, target morph outcome..."
                  className={`w-full p-2.5 rounded-xl border font-medium outline-none resize-none ${
                    isDarkMode ? 'bg-emerald-950/40 border-emerald-900 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-emerald-950 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewPairModalOpen(false);
                    if (newPairFemaleId || newPairMaleId) {
                      setSelectedWorkflowAnimalId(newPairFemaleId || newPairMaleId);
                    }
                    setActiveTab('workflow');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    isDarkMode ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Launch Assessment Wizard</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsNewPairModalOpen(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isDarkMode ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newPairFemaleId || !newPairMaleId || newPairFemaleId === newPairMaleId}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Breeding Pair</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL BREEDING ACTIVITY & EVENT HISTORY MODAL POP-UP */}
      {isActivityHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div
            className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl transition-all ${
              isDarkMode ? 'bg-[#04150C] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-emerald-950 flex items-start justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                      Breeding Activity & Event History
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {breedingRecords.length} {breedingRecords.length === 1 ? 'Record' : 'Records'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Complete historical log of pairings, clutch ovipositions, incubation cycles, and hatching outcomes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsActivityHistoryModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* KPI Ribbon in Modal */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 sm:p-5 border-b border-slate-100 dark:border-emerald-950/60 bg-slate-50/60 dark:bg-emerald-950/20 shrink-0">
              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#061B10] border-emerald-900/60' : 'bg-white border-slate-200'}`}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Cycles</span>
                <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{breedingRecords.length}</div>
                <span className="text-[10px] text-slate-400">All recorded projects</span>
              </div>
              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#061B10] border-emerald-900/60' : 'bg-white border-slate-200'}`}>
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Active Pairing</span>
                <div className="text-lg font-black text-amber-500 mt-0.5">
                  {breedingRecords.filter(r => r.status === 'IN PROGRESS').length}
                </div>
                <span className="text-[10px] text-slate-400">Ongoing monitoring</span>
              </div>
              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#061B10] border-emerald-900/60' : 'bg-white border-slate-200'}`}>
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Successful Clutches</span>
                <div className="text-lg font-black text-emerald-500 mt-0.5">
                  {breedingRecords.filter(r => r.status === 'SUCCESSFUL').length}
                </div>
                <span className="text-[10px] text-slate-400">Completed clutches</span>
              </div>
              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#061B10] border-emerald-900/60' : 'bg-white border-slate-200'}`}>
                <span className="text-[10px] font-bold text-sky-500 uppercase tracking-wider block">Total Hatchlings</span>
                <div className="text-lg font-black text-sky-500 mt-0.5">
                  {breedingRecords.reduce((acc, r) => acc + (r.hatchlings || 0), 0)}
                </div>
                <span className="text-[10px] text-slate-400">Viable offspring</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-emerald-950/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by animal name, ID, species, notes..."
                  value={activityModalSearch}
                  onChange={e => setActivityModalSearch(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-none ${
                    isDarkMode
                      ? 'bg-emerald-950/40 border-emerald-900 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={activityModalStatusFilter}
                  onChange={e => setActivityModalStatusFilter(e.target.value as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none ${
                    isDarkMode ? 'bg-[#061B10] border-emerald-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="All">All Statuses ({breedingRecords.length})</option>
                  <option value="IN PROGRESS">In Progress</option>
                  <option value="SUCCESSFUL">Successful / Completed</option>
                  <option value="FAILED">Concluded / Failed</option>
                </select>
              </div>
            </div>

            {/* Scrollable Records List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 min-h-[220px]">
              {activityModalRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold text-sm">No breeding history found</p>
                  <p className="text-xs mt-1">
                    {breedingRecords.length === 0
                      ? 'No pairings or clutches have been recorded yet.'
                      : 'Try clearing your search query or status filter.'}
                  </p>
                </div>
              ) : (
                activityModalRecords.map(record => {
                  const female = findAnimalRecord(record.femaleId, record.femaleName);
                  const male = findAnimalRecord(record.maleId, record.maleName);
                  const speciesName = record.species || female?.species || male?.species || 'Reptile';
                  const femaleImg = resolveAnimalPhoto(female, record.femaleImage, speciesName);
                  const maleImg = resolveAnimalPhoto(male, record.maleImage, speciesName);

                  return (
                    <div
                      key={record.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isDarkMode
                          ? 'bg-[#061B10] border-emerald-950/80 hover:border-emerald-800/80'
                          : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Top Bar of Record */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-emerald-950/60 pb-3 mb-3">
                        <div className="flex items-center space-x-2.5">
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-black tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {speciesName}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                            {record.id}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                            {record.breedingType || 'Natural Mating'}
                          </span>
                        </div>

                        <div>
                          {record.status === 'IN PROGRESS' ? (
                            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                              <span>IN PROGRESS</span>
                            </span>
                          ) : record.status === 'SUCCESSFUL' ? (
                            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>SUCCESSFUL</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-500/30">
                              <span>CONCLUDED</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pair Details & Timeline Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
                        {/* Pair Info with photos */}
                        <div className="md:col-span-5 p-3 rounded-lg bg-white dark:bg-[#04110A] border border-slate-200 dark:border-emerald-950/80">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                            Pair Combination
                          </span>
                          
                          {/* Avatars */}
                          <div className="flex items-center space-x-2.5 mb-2.5">
                            <div className="w-12 h-12 rounded-xl overflow-hidden relative border border-pink-500/40 bg-pink-950/30 shrink-0 shadow-xs">
                              <img
                                src={femaleImg}
                                alt={female?.name || record.femaleName || record.femaleId}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = getAnimalSpeciesFallbackPhoto(speciesName); }}
                              />
                              <span className="absolute bottom-0 inset-x-0 bg-pink-600/90 text-[8px] text-white font-extrabold text-center py-0.5">
                                ♀ Dam
                              </span>
                            </div>
                            <div className="w-12 h-12 rounded-xl overflow-hidden relative border border-sky-500/40 bg-sky-950/30 shrink-0 shadow-xs">
                              <img
                                src={maleImg}
                                alt={male?.name || record.maleName || record.maleId}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = getAnimalSpeciesFallbackPhoto(speciesName); }}
                              />
                              <span className="absolute bottom-0 inset-x-0 bg-sky-600/90 text-[8px] text-white font-extrabold text-center py-0.5">
                                ♂ Sire
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-pink-600 dark:text-pink-400 font-semibold flex items-center space-x-1 truncate">
                                <span>♀ Dam:</span>
                                <strong>{female?.name || record.femaleName || record.femaleId}</strong>
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 ml-1">
                                {record.femaleId}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sky-600 dark:text-sky-400 font-semibold flex items-center space-x-1 truncate">
                                <span>♂ Sire:</span>
                                <strong>{male?.name || record.maleName || record.maleId}</strong>
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 ml-1">
                                {record.maleId}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Milestone Dates & Metrics */}
                        <div className="md:col-span-7 grid grid-cols-3 gap-2">
                          <div className="p-2.5 rounded-lg bg-white dark:bg-[#04110A] border border-slate-200 dark:border-emerald-950/80">
                            <span className="text-[10px] font-bold text-slate-400 block">Pairing Date</span>
                            <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                              {formatDisplayDate(record.breedingDate)}
                            </div>
                            <span className="text-[10px] text-slate-400">Initial introduction</span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-white dark:bg-[#04110A] border border-slate-200 dark:border-emerald-950/80">
                            <span className="text-[10px] font-bold text-slate-400 block">Clutch Info</span>
                            <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                              {record.clutchSize ? `${record.clutchSize} Eggs` : 'Awaiting Clutch'}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {record.clutchDate ? formatDisplayDate(record.clutchDate) : 'Pending oviposition'}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-white dark:bg-[#04110A] border border-slate-200 dark:border-emerald-950/80">
                            <span className="text-[10px] font-bold text-slate-400 block">Hatching</span>
                            <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                              {record.hatchlings !== undefined ? `${record.hatchlings} Hatched` : 'Incubating'}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {record.hatchDate ? formatDisplayDate(record.hatchDate) : (record.status === 'IN PROGRESS' ? 'Incubation cycle' : 'N/A')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Notes / Observations */}
                      {record.notes && (
                        <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/5 dark:bg-emerald-950/30 border border-emerald-500/10 text-xs text-slate-700 dark:text-slate-300 flex items-start space-x-2">
                          <Info className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <strong className="font-semibold text-emerald-700 dark:text-emerald-400">Keeper Notes: </strong>
                            <span>{record.notes}</span>
                          </div>
                        </div>
                      )}

                      {/* Record Footer */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-emerald-950/40 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Logged by: {record.createdBy || 'Eleanor Vance (Admin)'}</span>
                        <span>{record.createdAt ? `Recorded on ${formatDisplayDate(record.createdAt)}` : ''}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-emerald-950/30">
              <button
                type="button"
                onClick={() => {
                  setIsActivityHistoryModalOpen(false);
                  setActiveTab('history');
                }}
                className="text-xs font-bold text-emerald-500 hover:text-emerald-400 flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                <span>Go to Detailed History & Analytics Tab</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsActivityHistoryModalOpen(false)}
                className={`w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isDarkMode
                    ? 'bg-emerald-950/70 hover:bg-emerald-900 text-slate-200'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Selected Pair Detail & Keeper Logs Modal Overlay */}
      {selectedPairForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-[#04140D] border border-slate-200 dark:border-emerald-800/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-950 via-[#062013] to-emerald-950 border-b border-emerald-800/60 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-xs">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-black text-white tracking-tight">
                      Pairing Detail &amp; Keeper Field Logs
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold uppercase border border-emerald-500/30">
                      {selectedPairForDetail.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {selectedPairForDetail.femaleName || selectedPairForDetail.femaleId} (♀) &amp; {selectedPairForDetail.maleName || selectedPairForDetail.maleId} (♂) • {selectedPairForDetail.species || 'Reptile'}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedPairForDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Body with Tabs */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Tab Switcher */}
              <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-emerald-900/60 pb-3">
                <button
                  type="button"
                  onClick={() => setPairDetailActiveTab('timeline')}
                  className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
                    pairDetailActiveTab === 'timeline'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-[#062013] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#092e1b]'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span>Timeline &amp; Pair Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPairDetailActiveTab('keeper_logs')}
                  className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
                    pairDetailActiveTab === 'keeper_logs'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-[#062013] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#092e1b]'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Keeper Field Logs ({selectedPairForDetail.observationLogs?.length || 0})</span>
                </button>
              </div>

              {/* Render BreedingLifecycleTracker for full stage timeline & logs */}
              <BreedingLifecycleTracker
                record={selectedPairForDetail}
                femaleAnimal={findAnimalRecord(selectedPairForDetail.femaleId, selectedPairForDetail.femaleName)}
                maleAnimal={findAnimalRecord(selectedPairForDetail.maleId, selectedPairForDetail.maleName)}
                onUpdateRecord={(updated) => {
                  if (onUpdateBreedingRecord) onUpdateBreedingRecord(updated);
                  setSelectedPairForDetail(updated);
                }}
                isDarkMode={isDarkMode}
                systemDate={systemDate}
                onOpenClutchModal={(rec) => {
                  setSelectedPairForDetail(null);
                  setSelectedPairForClutch(rec);
                  setClutchDateInput(rec.clutchDate || new Date().toISOString().split('T')[0]);
                  setClutchEggsCount(rec.clutchSize || 12);
                  setFertileEggsCount(rec.fertileEggs ?? Math.floor((rec.clutchSize || 12) * 0.85));
                  setInfertileEggsCount(rec.infertileEggs ?? (rec.clutchSize ? rec.clutchSize - Math.floor(rec.clutchSize * 0.85) : 2));
                  setClutchIncubationTemp(rec.incubationTemp || '31.0°C');
                  setClutchIncubationHumidity(rec.incubationHumidity || '85%');
                  setClutchIncubatorUnit(rec.incubatorUnit || 'Incubator Unit A1');
                  setIsLogClutchModalOpen(true);
                }}
                onOpenHatchModal={(rec) => {
                  setSelectedPairForDetail(null);
                  setSelectedPairForHatch(rec);
                  setHatchlingsCount(rec.hatchlings ?? (rec.fertileEggs || Math.floor((rec.clutchSize || 12) * 0.85)));
                  setUnhatchedCount(rec.unhatchedEggs ?? (rec.infertileEggs || 2));
                  setIsHatchModalOpen(true);
                }}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-[#02100a] border-t border-slate-200 dark:border-emerald-950 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPairForDetail(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-200 dark:bg-emerald-950 hover:bg-slate-300 dark:hover:bg-emerald-900 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
