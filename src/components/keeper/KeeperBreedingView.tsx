import React, { useState, useMemo } from 'react';
import {
  Heart,
  Egg,
  Dna,
  Sparkles,
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  Baby,
  FileText,
  Layers,
  Eye,
  Thermometer,
  Droplets,
  ArrowRight,
  History,
  Check,
  Activity,
  PawPrint,
  Info,
  Scale,
  RefreshCw,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import {
  Animal,
  Enclosure,
  BreedingRecord,
  BreedingObservationLog,
  BreedingLifecycleStatus
} from '../../types';
import {
  BREEDING_STAGES,
  calculateBreedingDayCounts,
  transitionBreedingStatus,
  evaluateBreedingProgress,
  normalizeBreedingStatus
} from '../../utils/breedingStateMachine';
import { findSpeciesBreedingStandard } from '../../utils/breedingStandards';
import { BreedingLifecycleTracker } from '../admin/breeding/BreedingLifecycleTracker';

interface KeeperBreedingViewProps {
  animals: Animal[];
  enclosures: Enclosure[];
  breedingRecords: BreedingRecord[];
  onAddBreedingRecord?: (record: BreedingRecord) => void;
  onUpdateBreedingRecord?: (record: BreedingRecord) => void;
  isDarkMode: boolean;
  profileName: string;
  systemDate: string;
  onOpenAnimalDetail?: (animal: Animal) => void;
}

export default function KeeperBreedingView({
  animals,
  enclosures,
  breedingRecords = [],
  onAddBreedingRecord,
  onUpdateBreedingRecord,
  isDarkMode,
  profileName,
  systemDate,
  onOpenAnimalDetail
}: KeeperBreedingViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedRecordForLog, setSelectedRecordForLog] = useState<BreedingRecord | null>(null);
  const [selectedRecordForHistory, setSelectedRecordForHistory] = useState<BreedingRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [subView, setSubView] = useState<'pairs' | 'eligible_animals'>('pairs');

  // Observation Form State
  const [obsType, setObsType] = useState<BreedingObservationLog['type']>('Courtship');
  const [obsDate, setObsDate] = useState(systemDate || new Date().toISOString().split('T')[0]);
  const [obsTime, setObsTime] = useState('08:30');
  const [obsNotes, setObsNotes] = useState('');
  
  // Specific Behavioral Indicators
  const [indicatorNesting, setIndicatorNesting] = useState(false);
  const [indicatorRestlessness, setIndicatorRestlessness] = useState(false);
  const [indicatorLossOfAppetite, setIndicatorLossOfAppetite] = useState(false);
  const [indicatorTailFlagging, setIndicatorTailFlagging] = useState(false);
  const [indicatorSwelling, setIndicatorSwelling] = useState(false);
  const [indicatorWeightGain, setIndicatorWeightGain] = useState<number | ''>('');
  const [indicatorAggression, setIndicatorAggression] = useState<'None' | 'Mild' | 'Moderate' | 'Severe'>('None');
  const [indicatorOther, setIndicatorOther] = useState(false);
  const [indicatorOtherNotes, setIndicatorOtherNotes] = useState('');

  // Clutch & Incubation fields
  const [clutchSizeInput, setClutchSizeInput] = useState<number | ''>('');
  const [fertileEggsInput, setFertileEggsInput] = useState<number | ''>('');
  const [incubationTempInput, setIncubationTempInput] = useState('');
  const [incubationHumidityInput, setIncubationHumidityInput] = useState('');
  const [hatchlingsInput, setHatchlingsInput] = useState<number | ''>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filter Active vs Inactive with robust same-enclosure pair auto-detection (sync with Admin)
  const activeRecords = useMemo<BreedingRecord[]>(() => {
    const list = [...breedingRecords.filter(r => r.status !== 'FAILED')];
    
    const pairedAnimalIds = new Set<string>();
    list.forEach(r => {
      if (r.femaleId) pairedAnimalIds.add(r.femaleId.toLowerCase());
      if (r.maleId) pairedAnimalIds.add(r.maleId.toLowerCase());
    });

    // Auto-detect pairs from ready/in-progress/paired animals in the same enclosure
    const inProgressAnimals = (animals || []).filter(a => 
      !a.isArchived && 
      (a.breedingStatus === 'In Progress' || a.breedingStatus === 'Ready for Pairing' || (a.breedingStatus as string) === 'Paired')
    );
    
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
  }, [breedingRecords, animals, enclosures]);

  // Compute individual animals marked for breeding but not yet paired in an active pair
  const eligibleAnimals = useMemo(() => {
    const pairedIds = new Set<string>();
    activeRecords.forEach(r => {
      if (r.femaleId) pairedIds.add(r.femaleId.toLowerCase());
      if (r.maleId) pairedIds.add(r.maleId.toLowerCase());
    });
    return animals.filter(a => 
      !a.isArchived && 
      (a.breedingStatus === 'Ready for Pairing' || a.breedingStatus === 'In Progress') &&
      !pairedIds.has(a.id.toLowerCase())
    );
  }, [animals, activeRecords]);

  // Filtered by Search & Status
  const filteredRecords = useMemo(() => {
    return activeRecords.filter(record => {
      const female = animals.find(a => a.id === record.femaleId);
      const male = animals.find(a => a.id === record.maleId);
      const femaleName = female?.name || record.femaleName || '';
      const maleName = male?.name || record.maleName || '';
      const species = record.species || female?.species || male?.species || '';
      const pairText = `${femaleName} ${maleName} ${species} ${record.id}`.toLowerCase();

      const matchesSearch = pairText.includes(searchQuery.toLowerCase());
      const normSt = normalizeBreedingStatus(record.status, record);

      if (statusFilter === 'ALL') return matchesSearch;
      if (statusFilter === 'ACTIVE_MATING') {
        return matchesSearch && (normSt === 'PAIRED' || normSt === 'IN PROGRESS');
      }
      if (statusFilter === 'GRAVID') {
        return matchesSearch && (normSt === 'POSSIBLE MATED' || normSt === 'LIKELY MATED');
      }
      if (statusFilter === 'INCUBATING') {
        return matchesSearch && (normSt === 'CLUTCH RECORDED' || normSt === 'INCUBATING');
      }
      if (statusFilter === 'COMPLETED') {
        return matchesSearch && (normSt === 'COMPLETED' || normSt === 'SUCCESSFUL');
      }
      return matchesSearch && normSt === statusFilter;
    });
  }, [activeRecords, animals, searchQuery, statusFilter]);

  // Statistics Summary
  const stats = useMemo(() => {
    const totalPairs = activeRecords.length;
    const activeMating = activeRecords.filter(r => {
      const s = normalizeBreedingStatus(r.status, r);
      return s === 'PAIRED' || s === 'IN PROGRESS';
    }).length;
    const gravidGestation = activeRecords.filter(r => {
      const s = normalizeBreedingStatus(r.status, r);
      return s === 'POSSIBLE MATED' || s === 'LIKELY MATED';
    }).length;
    const incubating = activeRecords.filter(r => {
      const s = normalizeBreedingStatus(r.status, r);
      return s === 'CLUTCH RECORDED' || s === 'INCUBATING';
    }).length;
    const hatched = activeRecords.reduce((sum, r) => sum + (r.hatchlings || 0), 0);
    const totalEggs = activeRecords.reduce((sum, r) => sum + (r.clutchSize || 0), 0);

    return { totalPairs, activeMating, gravidGestation, incubating, hatched, totalEggs };
  }, [activeRecords]);

  // Open Log Modal for a specific pair
  const handleOpenLogModal = (record: BreedingRecord) => {
    setSelectedRecordForLog(record);
    setObsType('Courtship');
    setObsDate(systemDate || new Date().toISOString().split('T')[0]);
    setObsTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setObsNotes('');
    setIndicatorNesting(false);
    setIndicatorRestlessness(false);
    setIndicatorLossOfAppetite(false);
    setIndicatorTailFlagging(false);
    setIndicatorSwelling(false);
    setIndicatorWeightGain('');
    setIndicatorAggression('None');
    setIndicatorOther(false);
    setIndicatorOtherNotes('');
    setClutchSizeInput(record.clutchSize || '');
    setFertileEggsInput(record.fertileEggs || '');
    setIncubationTempInput(record.incubationTemp || '28.5');
    setIncubationHumidityInput(record.incubationHumidity || '80%');
    setHatchlingsInput(record.hatchlings || '');
  };

  // Submit Observation Log
  const handleSaveObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForLog) return;

    const logEntry: BreedingObservationLog = {
      id: `OBS-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      date: obsDate,
      timestamp: `${obsDate} ${obsTime}`,
      keeperName: profileName || 'Assigned Keeper',
      type: obsType,
      notes: obsNotes || `Recorded ${obsType} observation during daily sanctuary check.`,
      indicators: {
        nestingBehavior: indicatorNesting,
        restlessness: indicatorRestlessness,
        lossOfAppetite: indicatorLossOfAppetite,
        tailFlagging: indicatorTailFlagging,
        swellingObserved: indicatorSwelling,
        weightIncreaseGrams: indicatorWeightGain !== '' ? Number(indicatorWeightGain) : undefined,
        aggressionLevel: indicatorAggression,
        otherObserved: indicatorOther,
        otherNotes: indicatorOther && indicatorOtherNotes.trim() ? indicatorOtherNotes.trim() : undefined
      }
    };

    let updatedRecord: BreedingRecord = {
      ...selectedRecordForLog,
      observationLogs: [logEntry, ...(selectedRecordForLog.observationLogs || [])]
    };

    // Automatic intelligent status progression based on logged observation
    if ((obsType === 'Clutch' || clutchSizeInput !== '') && selectedRecordForLog.status !== 'CLUTCH RECORDED') {
      updatedRecord = transitionBreedingStatus(
        updatedRecord,
        'CLUTCH RECORDED',
        {
          keeperName: profileName || 'Assigned Keeper',
          notes: obsNotes || 'Clutch deposition logged by keeper.',
          indicators: logEntry.indicators,
          clutchSize: clutchSizeInput !== '' ? Number(clutchSizeInput) : undefined,
          fertileEggs: fertileEggsInput !== '' ? Number(fertileEggsInput) : undefined,
          incubationTemp: incubationTempInput || undefined,
          incubationHumidity: incubationHumidityInput || undefined,
        }
      );
    } else if ((obsType === 'Hatch' || hatchlingsInput !== '') && selectedRecordForLog.status !== 'COMPLETED') {
      updatedRecord = transitionBreedingStatus(
        updatedRecord,
        'COMPLETED',
        {
          keeperName: profileName || 'Assigned Keeper',
          notes: obsNotes || 'Hatching outcome logged by keeper.',
          indicators: logEntry.indicators,
          hatchlings: hatchlingsInput !== '' ? Number(hatchlingsInput) : undefined
        }
      );
    } else {
      // Update clutch / incubation / hatchling metrics directly if provided
      if (clutchSizeInput !== '') updatedRecord.clutchSize = Number(clutchSizeInput);
      if (fertileEggsInput !== '') updatedRecord.fertileEggs = Number(fertileEggsInput);
      if (incubationTempInput) updatedRecord.incubationTemp = incubationTempInput;
      if (incubationHumidityInput) updatedRecord.incubationHumidity = incubationHumidityInput;
      if (hatchlingsInput !== '') updatedRecord.hatchlings = Number(hatchlingsInput);
      if (obsType === 'Clutch' && !updatedRecord.clutchDate) updatedRecord.clutchDate = obsDate;
      if (obsType === 'Hatch' && !updatedRecord.hatchDate) updatedRecord.hatchDate = obsDate;
    }

    if (onUpdateBreedingRecord) {
      onUpdateBreedingRecord(updatedRecord);
    }
    
    setSelectedRecordForLog(null);
    showToast(`✓ Breeding observation logged for ${selectedRecordForLog.femaleName || 'Female'} × ${selectedRecordForLog.maleName || 'Male'}!`);
  };

  const handleDeleteObservation = (record: BreedingRecord, logId: string) => {
    const updatedLogs = (record.observationLogs || []).filter(l => l.id !== logId);
    const updatedRecord: BreedingRecord = {
      ...record,
      observationLogs: updatedLogs
    };
    if (onUpdateBreedingRecord) {
      onUpdateBreedingRecord(updatedRecord);
    }
    if (selectedRecordForHistory && selectedRecordForHistory.id === record.id) {
      setSelectedRecordForHistory(updatedRecord);
    }
    showToast('✓ Observation note removed.');
  };

  const handleClearAllObservations = (record: BreedingRecord) => {
    const updatedRecord: BreedingRecord = {
      ...record,
      observationLogs: []
    };
    if (onUpdateBreedingRecord) {
      onUpdateBreedingRecord(updatedRecord);
    }
    if (selectedRecordForHistory && selectedRecordForHistory.id === record.id) {
      setSelectedRecordForHistory(updatedRecord);
    }
    showToast('✓ All observation logs cleared for this pair.');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 font-bold text-xs border border-emerald-400/40 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Station Header Banner */}
      <div className={`p-6 rounded-3xl border shadow-sm relative overflow-hidden transition-all ${
        isDarkMode 
          ? 'bg-gradient-to-br from-[#061F12] via-[#04160C] to-[#020D07] border-emerald-900/60' 
          : 'bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 border-emerald-200/80 shadow-emerald-900/5'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-extrabold uppercase tracking-wider">
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
              <span>Keeper Breeding & Reproduction Station</span>
            </div>
            <h1 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Breeding Observations & Incubation Log
            </h1>
            <p className={`text-xs leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Log behavioral signs, mating attempts, female gestation, clutch deposition, and candling progress. All keeper logs synchronize live with the sanctuary Admin records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className={`px-3.5 py-2.5 rounded-2xl border text-xs font-bold flex items-center space-x-2 ${
              isDarkMode ? 'bg-amber-950/40 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Breeding Pairs Managed by Admin</span>
            </div>
          </div>
        </div>

        {/* Quick Stat Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-emerald-900/30 dark:border-emerald-950/60">
          <div className={`p-3.5 rounded-2xl border ${
            isDarkMode ? 'bg-[#05170E]/80 border-emerald-900/40' : 'bg-white/80 border-emerald-100 shadow-2xs'
          }`}>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Pairs</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{stats.totalPairs}</span>
              <span className="text-[10px] text-emerald-400 font-bold">pairs</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${
            isDarkMode ? 'bg-[#05170E]/80 border-emerald-900/40' : 'bg-white/80 border-emerald-100 shadow-2xs'
          }`}>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Active Mating</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className={`text-xl font-black ${isDarkMode ? 'text-amber-300' : 'text-amber-600'}`}>{stats.activeMating}</span>
              <span className="text-[10px] text-amber-400/80 font-bold">pairs</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${
            isDarkMode ? 'bg-[#05170E]/80 border-emerald-900/40' : 'bg-white/80 border-emerald-100 shadow-2xs'
          }`}>
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Gravid / Gestation</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className={`text-xl font-black ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>{stats.gravidGestation}</span>
              <span className="text-[10px] text-purple-400/80 font-bold">females</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${
            isDarkMode ? 'bg-[#05170E]/80 border-emerald-900/40' : 'bg-white/80 border-emerald-100 shadow-2xs'
          }`}>
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">Incubating</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className={`text-xl font-black ${isDarkMode ? 'text-teal-300' : 'text-teal-600'}`}>{stats.incubating}</span>
              <span className="text-[10px] text-teal-400/80 font-bold">clutches</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${
            isDarkMode ? 'bg-[#05170E]/80 border-emerald-900/40' : 'bg-white/80 border-emerald-100 shadow-2xs'
          }`}>
            <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider block">Total Eggs</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className={`text-xl font-black ${isDarkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>{stats.totalEggs}</span>
              <span className="text-[10px] text-yellow-400/80 font-bold">eggs</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${
            isDarkMode ? 'bg-[#05170E]/80 border-emerald-900/40' : 'bg-white/80 border-emerald-100 shadow-2xs'
          }`}>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Hatched / Born</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className={`text-xl font-black ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>{stats.hatched}</span>
              <span className="text-[10px] text-emerald-400/80 font-bold">offspring</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB-TAB VIEW SELECTOR */}
      <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-emerald-950 pb-2">
        <button
          type="button"
          onClick={() => setSubView('pairs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
            subView === 'pairs'
              ? isDarkMode
                ? 'bg-[#062015] border border-emerald-500 text-emerald-300 shadow-xs'
                : 'bg-emerald-100 border border-emerald-500 text-emerald-800 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
          <span>Active Breeding Pairs ({filteredRecords.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubView('eligible_animals')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
            subView === 'eligible_animals'
              ? isDarkMode
                ? 'bg-[#062015] border border-emerald-500 text-emerald-300 shadow-xs'
                : 'bg-emerald-100 border border-emerald-500 text-emerald-800 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Dna className="w-3.5 h-3.5 text-emerald-400" />
          <span>Animals Ready for Pairing ({eligibleAnimals.length})</span>
        </button>
      </div>

      {subView === 'pairs' && (
        <>
          {/* Search & Filter Bar */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
        isDarkMode ? 'bg-[#05160E] border-emerald-950 text-white' : 'bg-white border-slate-200'
      }`}>
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search pair by animal name, species, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-semibold border focus:outline-none transition-colors ${
              isDarkMode 
                ? 'bg-[#031109] border-emerald-900/60 text-white placeholder-slate-500 focus:border-emerald-500' 
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-600'
            }`}
          />
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Pairs' },
            { id: 'ACTIVE_MATING', label: 'Active Mating' },
            { id: 'GRAVID', label: 'Gravid / Gestating' },
            { id: 'INCUBATING', label: 'Incubation & Clutch' },
            { id: 'COMPLETED', label: 'Completed' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isDarkMode
                  ? 'bg-emerald-950/40 text-slate-300 hover:text-white hover:bg-emerald-900/40'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Breeding Pairs Cards Grid */}
      {filteredRecords.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border ${
          isDarkMode ? 'bg-[#05170E] border-emerald-950 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
        }`}>
          <Heart className="w-12 h-12 text-slate-600 mx-auto mb-3 stroke-1" />
          <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            No Breeding Pairs Found
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL' 
              ? 'Try adjusting your search query or status filter.'
              : 'No active breeding pairs have been registered yet. Breeding pairs are established and assigned by Facility Administrators in the Admin Portal.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map(record => {
            const female = animals.find(a => a.id === record.femaleId);
            const male = animals.find(a => a.id === record.maleId);
            const femaleName = female?.name || record.femaleName || 'Female';
            const maleName = male?.name || record.maleName || 'Male';
            const species = record.species || female?.species || male?.species || 'Reptile / Amphibian';
            const normSt = normalizeBreedingStatus(record.status, record);
            const stageConfig = BREEDING_STAGES[normSt] || BREEDING_STAGES.PAIRED;
            const logsCount = record.observationLogs?.length || 0;

            const recordEnclosure = enclosures.find(e => 
              (female?.enclosureId && e.id === female.enclosureId) ||
              (male?.enclosureId && e.id === male.enclosureId) ||
              e.climateProfile?.targetAnimalId === record.femaleId ||
              e.climateProfile?.targetAnimalId === record.maleId
            );
            const enclosureId = recordEnclosure?.name || 'MF-BD-001';
            const facilityName = recordEnclosure?.facility || 'Main Facility';

            const morphDisplay = female?.morph && male?.morph
              ? `${female.morph} × ${male.morph}`
              : female?.morph || male?.morph || 'Normal × Normal';

            const statusText = normSt === 'PAIRED' ? 'PAIRED' : normSt === 'CLUTCH RECORDED' ? 'CLUTCH' : normSt === 'INCUBATING' ? 'INCUBATING' : 'IN PROGRESS';

            return (
              <div
                key={record.id}
                onClick={() => setSelectedRecordForHistory(record)}
                className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between hover:scale-[1.002] active:scale-[0.998] group relative ${
                  isDarkMode
                    ? 'bg-[#04110A] border-emerald-950/70 hover:border-emerald-500/60 text-slate-200 hover:bg-[#071F11]'
                    : 'bg-white border-slate-200/80 hover:border-emerald-500/60 text-slate-800 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                  {/* Dual Animal Thumbnail with Heart in the Center */}
                  <div className="relative flex items-center shrink-0">
                    {/* Female Animal Thumbnail */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-slate-200/80 dark:border-emerald-950/60 bg-slate-900 shrink-0 shadow-xs relative group-hover:scale-102 transition-transform duration-300">
                      <img
                        src={female?.image || record.femaleImage || 'https://images.unsplash.com/photo-1548841416-e565987140e6?auto=format&fit=crop&w=150&q=80'}
                        alt={femaleName}
                        className="w-full h-full object-cover"
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
                        src={male?.image || record.maleImage || 'https://images.unsplash.com/photo-1548841416-e565987140e6?auto=format&fit=crop&w=150&q=80'}
                        alt={maleName}
                        className="w-full h-full object-cover"
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
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDarkMode ? 'text-emerald-300' : 'text-[#113C24]'} whitespace-nowrap`}>
                        PAIR-{record.femaleId}-{record.maleId}
                      </span>
                      <span className="text-pink-500 dark:text-pink-400 text-xs font-black">♀</span>
                      <span className="text-slate-400 text-xs">×</span>
                      <span className="text-blue-500 dark:text-blue-400 text-xs font-black">♂</span>
                    </div>

                    <h4 className={`font-bold text-sm leading-tight truncate mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {species}
                    </h4>

                    <p className={`text-[11px] font-semibold truncate mt-0.5 ${isDarkMode ? 'text-emerald-300/80' : 'text-slate-500'}`}>
                      Morph: {morphDisplay}
                    </p>
                  </div>
                </div>

                {/* Enclosure & Status Column */}
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
                  </div>

                  <div className="w-28 text-center shrink-0">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-500/30 whitespace-nowrap">
                      {statusText}
                    </span>
                  </div>
                </div>

                {/* Quick Actions & History/Chevron Button (Matches Image exactly but without delete button) */}
                <div className="shrink-0 pl-1.5 flex items-center space-x-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRecordForHistory(record);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center space-x-1.5 whitespace-nowrap shrink-0 ${
                      isDarkMode 
                        ? 'bg-[#041209] border-emerald-900/60 text-slate-300 hover:text-white hover:bg-emerald-950' 
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                    title="View Observation History & Timeline"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>History ({logsCount})</span>
                  </button>
                  <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {subView === 'eligible_animals' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${isDarkMode ? 'bg-[#05160E] border-emerald-950 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            <p className="font-bold text-emerald-400 text-sm mb-1">Available Breeding Stock</p>
            <p>The following specimens have been marked as <strong>Ready for Pairing</strong> or are currently undergoing breeding preparation. Contact the administrator to initiate an active pairing or establish cohabitation locks.</p>
          </div>

          {eligibleAnimals.length === 0 ? (
            <div className={`p-12 text-center rounded-3xl border ${isDarkMode ? 'bg-[#05170E] border-emerald-950 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
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
                        }`}>
                          {animal.sex === 'Female' ? '♀' : '♂'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${
                          animal.sex === 'Female' ? 'text-rose-400' : 'text-blue-400'
                        }`}>
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
                        onClick={() => onOpenAnimalDetail && onOpenAnimalDetail(animal)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs active:scale-95 transition-all cursor-pointer"
                      >
                        View Specimen Profile
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Log Breeding Observation Modal */}
      {selectedRecordForLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-3xl max-w-xl w-full border shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 ${
            isDarkMode ? 'bg-[#061A10] border-emerald-950 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDarkMode ? 'bg-[#04140D] border-emerald-950' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Heart className="w-4 h-4 fill-emerald-400/30" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Log Breeding Observation</h3>
                  <p className="text-[11px] text-slate-400">
                    Pair: {selectedRecordForLog.femaleName} ♀ × {selectedRecordForLog.maleName} ♂ ({selectedRecordForLog.species})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRecordForLog(null)} 
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-emerald-950 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSaveObservation} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar text-xs">
              {/* Row 1: Observation Type & Timing */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Observation Type</label>
                  <select
                    value={obsType}
                    onChange={(e) => setObsType(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none ${
                      isDarkMode ? 'bg-[#041209] border-emerald-900 text-white' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="Courtship">💍 Courtship / Mating Attempt</option>
                    <option value="Interaction">❤️ Confirmed Copulation / Lock</option>
                    <option value="Female Indicators">🤰 Gravid / Follicle Swelling</option>
                    <option value="Behavior">🪺 Nest Digging / Restlessness</option>
                    <option value="Clutch">🥚 Clutch Laid / Egg Collection</option>
                    <option value="Candling">🔬 Candling / Fertility Check</option>
                    <option value="Hatch">🐣 Hatching / Birth Occurred</option>
                    <option value="Aggression">⚠️ Aggression / Separation Check</option>
                    <option value="General">📋 General Daily Observation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Observation Date</label>
                  <input
                    type="date"
                    value={obsDate}
                    onChange={(e) => setObsDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none ${
                      isDarkMode ? 'bg-[#041209] border-emerald-900 text-white' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Time</label>
                  <input
                    type="time"
                    value={obsTime}
                    onChange={(e) => setObsTime(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none ${
                      isDarkMode ? 'bg-[#041209] border-emerald-900 text-white' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Species Standard Behavioral & Environmental Protocols */}
              {(() => {
                const std = findSpeciesBreedingStandard(selectedRecordForLog?.species || '');
                if (!std) return null;
                return (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-emerald-300 flex items-center space-x-1.5">
                        <span>🧬</span>
                        <span>{std.name} ({std.scientificName}) — Standard Protocols</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300">
                        {std.code} • {std.taxonomicFamily}
                      </span>
                    </div>

                    {std.preLayBehavioralIndicators && (
                      <div className="text-[11px] text-slate-300 leading-relaxed bg-[#031008] p-2.5 rounded-xl border border-amber-500/30">
                        <strong className="text-amber-400 block mb-0.5 font-bold uppercase tracking-wider text-[10px]">
                          ⚠️ Pre-Lay Behavioral Indicators to Watch For:
                        </strong>
                        <span className="italic text-amber-200/90">{std.preLayBehavioralIndicators}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                      <div className="bg-[#031008] p-2 rounded-xl border border-emerald-900/40">
                        <span className="text-slate-400 block uppercase font-bold">Gestation / Pre-Lay</span>
                        <strong className="text-emerald-400 text-xs block mt-0.5">{std.gestationPreLayPeriod}</strong>
                      </div>
                      <div className="bg-[#031008] p-2 rounded-xl border border-emerald-900/40">
                        <span className="text-slate-400 block uppercase font-bold">Cooling / Brumation</span>
                        <strong className="text-emerald-400 text-xs block mt-0.5">{std.coolingTempRange || std.brumationCoolingRequired}</strong>
                      </div>
                      <div className="bg-[#031008] p-2 rounded-xl border border-emerald-900/40">
                        <span className="text-slate-400 block uppercase font-bold">Incubation Climate</span>
                        <strong className="text-emerald-400 text-xs block mt-0.5">{std.incubationTempTarget} ({std.incubationHumidity})</strong>
                      </div>
                      <div className="bg-[#031008] p-2 rounded-xl border border-emerald-900/40">
                        <span className="text-slate-400 block uppercase font-bold">Incubation Period</span>
                        <strong className="text-emerald-400 text-xs block mt-0.5">{std.incubationPeriod}</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Behavioral Indicators Checklist */}
              <div className={`p-4 rounded-2xl border space-y-2.5 ${
                isDarkMode ? 'bg-[#041209] border-emerald-950' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider block">
                  Observed Physical & Behavioral Signs
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={indicatorTailFlagging}
                      onChange={(e) => setIndicatorTailFlagging(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 accent-emerald-500 rounded cursor-pointer"
                    />
                    <span className="text-xs font-medium">Mounting / Tail Flagging</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={indicatorSwelling}
                      onChange={(e) => setIndicatorSwelling(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 accent-emerald-500 rounded cursor-pointer"
                    />
                    <span className="text-xs font-medium">Abdominal Swelling / Gravid</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={indicatorNesting}
                      onChange={(e) => setIndicatorNesting(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 accent-emerald-500 rounded cursor-pointer"
                    />
                    <span className="text-xs font-medium">Nest Box Digging / Test Pits</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={indicatorLossOfAppetite}
                      onChange={(e) => setIndicatorLossOfAppetite(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 accent-emerald-500 rounded cursor-pointer"
                    />
                    <span className="text-xs font-medium">Pre-lay Appetite Refusal</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={indicatorRestlessness}
                      onChange={(e) => setIndicatorRestlessness(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 accent-emerald-500 rounded cursor-pointer"
                    />
                    <span className="text-xs font-medium">Restless Pacing / Active</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={indicatorOther}
                      onChange={(e) => setIndicatorOther(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 accent-emerald-500 rounded cursor-pointer"
                    />
                    <span className="text-xs font-medium">Other</span>
                  </label>
                </div>

                {indicatorOther && (
                  <div className="pt-2 animate-in fade-in duration-150">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                      Specify Other Observed Sign / Behavior
                    </label>
                    <input
                      type="text"
                      value={indicatorOtherNotes}
                      onChange={(e) => setIndicatorOtherNotes(e.target.value)}
                      placeholder="e.g. Color shifting, head bobbing, unusual basking posture, substrate burrowing..."
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        isDarkMode
                          ? 'bg-[#030d06] border-emerald-900 text-white placeholder-slate-500'
                          : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                      }`}
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Conditional Data Inputs based on stage/obsType */}
              {(obsType === 'Clutch' || obsType === 'Candling' || obsType === 'Hatch' || selectedRecordForLog.status === 'INCUBATING') && (
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isDarkMode ? 'bg-[#041209] border-emerald-950' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[11px] font-extrabold text-yellow-400 uppercase tracking-wider block">
                    Clutch & Incubation Measurements
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Clutch Size</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 18"
                        value={clutchSizeInput}
                        onChange={(e) => setClutchSizeInput(e.target.value === '' ? '' : Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold text-center ${
                          isDarkMode ? 'bg-[#030E07] border-emerald-900' : 'bg-white border-slate-200'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Fertile Eggs</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 16"
                        value={fertileEggsInput}
                        onChange={(e) => setFertileEggsInput(e.target.value === '' ? '' : Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold text-center ${
                          isDarkMode ? 'bg-[#030E07] border-emerald-900' : 'bg-white border-slate-200'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Temp (°C)</label>
                      <input
                        type="text"
                        placeholder="28.5"
                        value={incubationTempInput}
                        onChange={(e) => setIncubationTempInput(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold text-center ${
                          isDarkMode ? 'bg-[#030E07] border-emerald-900' : 'bg-white border-slate-200'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Hatchlings</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 14"
                        value={hatchlingsInput}
                        onChange={(e) => setHatchlingsInput(e.target.value === '' ? '' : Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold text-center ${
                          isDarkMode ? 'bg-[#030E07] border-emerald-900' : 'bg-white border-slate-200'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Keeper Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Keeper's Behavioral Notes & Observation Details
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record interaction behavior, female responsiveness, temperature / environmental setup, or clutch health..."
                  value={obsNotes}
                  onChange={(e) => setObsNotes(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none text-xs leading-relaxed ${
                    isDarkMode 
                      ? 'bg-[#041209] border-emerald-900 text-white focus:border-emerald-500' 
                      : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-600'
                  }`}
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-emerald-900/30 dark:border-emerald-950 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedRecordForLog(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-emerald-900 rounded-xl font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-emerald-950/40 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save Observation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Observation History Modal */}
      {selectedRecordForHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-3xl max-w-4xl w-full border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 ${
            isDarkMode ? 'bg-[#061A10] border-emerald-950 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDarkMode ? 'bg-[#04140D] border-emerald-950' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Pairing Lifecycle &amp; Keeper Logs</h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedRecordForHistory.femaleName} ♀ × {selectedRecordForHistory.maleName} ♂ ({selectedRecordForHistory.species})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRecordForHistory(null)} 
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-emerald-950 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto no-scrollbar space-y-4">
              <BreedingLifecycleTracker
                record={selectedRecordForHistory}
                femaleAnimal={animals.find(a => a.id === selectedRecordForHistory.femaleId)}
                maleAnimal={animals.find(a => a.id === selectedRecordForHistory.maleId)}
                onUpdateRecord={(updated) => {
                  if (onUpdateBreedingRecord) onUpdateBreedingRecord(updated);
                  setSelectedRecordForHistory(updated);
                }}
                isDarkMode={isDarkMode}
                isKeeper={true}
                systemDate={systemDate}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
