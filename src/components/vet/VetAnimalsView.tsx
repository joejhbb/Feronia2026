import React, { useState, useEffect } from 'react';
import {
  PawPrint, Search, Filter, Stethoscope, Calendar, Heart, ShieldCheck,
  AlertTriangle, ArrowRight, ArrowLeft, Eye, ChevronRight, Activity, X, FolderArchive,
  RotateCcw, CheckCircle2, AlertCircle, Info, FileText, Leaf, Camera, Edit2, Plus
} from 'lucide-react';
import { Animal, Enclosure, MedicalRecord, Appointment, Task, StaffMember, getAppointmentRequesterInfo, resolveVeterinarianName } from '../../types';
import VetAnimalDetailView from './VetAnimalDetailView';

interface VetAnimalsViewProps {
  animals: Animal[];
  enclosures?: Enclosure[];
  tasks?: Task[];
  medicalRecords: MedicalRecord[];
  appointments?: Appointment[];
  staffMembers?: StaffMember[];
  isDarkMode: boolean;
  systemDate?: string;
  onUpdateAnimal?: (animal: Animal) => void;
  onSelectAnimalForConsult: (animalId: string, appointmentId?: string) => void;
  onScheduleForAnimal: (animalId: string) => void;
  onAddAppointment?: (appointment: Appointment) => void;
  onUpdateAppointment?: (appointment: Appointment) => void;
  onUpdateAppointmentStatus?: (id: string, status: Appointment['status']) => void;
  onAddMedicalRecord?: (record: MedicalRecord) => void;
  initialStatusFilter?: string;
  initialSelectedAnimalId?: string | null;
  userAccount?: { name: string; email: string };
  onBackToDashboard?: () => void;
  onBack?: () => void;
}

export default function VetAnimalsView({
  animals,
  enclosures = [],
  tasks = [],
  medicalRecords,
  appointments = [],
  staffMembers = [],
  isDarkMode,
  systemDate,
  onUpdateAnimal,
  onSelectAnimalForConsult,
  onScheduleForAnimal,
  onAddAppointment,
  onUpdateAppointment,
  onUpdateAppointmentStatus,
  onAddMedicalRecord,
  initialStatusFilter = 'All',
  initialSelectedAnimalId = null,
  userAccount,
  onBackToDashboard,
  onBack
}: VetAnimalsViewProps) {
  const handleBack = onBack || onBackToDashboard;
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(() => {
    if (initialSelectedAnimalId) {
      return animals.find(a => a.id === initialSelectedAnimalId) || null;
    }
    return null;
  });
  const [viewTab, setViewTab] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || 'All');
  const [speciesFilter, setSpeciesFilter] = useState('All');
  const [sexFilter, setSexFilter] = useState<'All' | 'Male' | 'Female'>('All');
  const [selectedAnimalForHistory, setSelectedAnimalForHistory] = useState<Animal | null>(null);

  // Synchronize when initialSelectedAnimalId changes
  useEffect(() => {
    if (initialSelectedAnimalId) {
      const found = animals.find(a => a.id === initialSelectedAnimalId);
      if (found) {
        setSelectedAnimal(found);
      }
    }
  }, [initialSelectedAnimalId, animals]);

  // Synchronize when initialStatusFilter changes from external navigation
  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // Keep selectedAnimal in sync if animals list updates
  useEffect(() => {
    if (selectedAnimal) {
      const refreshed = animals.find(a => a.id === selectedAnimal.id);
      if (refreshed) {
        setSelectedAnimal(refreshed);
      }
    }
  }, [animals]);

  // Archive modal states
  const [animalToArchive, setAnimalToArchive] = useState<Animal | null>(null);
  const [archiveReasonType, setArchiveReasonType] = useState('Deceased / Clinical Mortality');
  const [archiveCustomNotes, setArchiveCustomNotes] = useState('');
  const [archiveEffectiveDate, setArchiveEffectiveDate] = useState(() => {
    if (systemDate) return systemDate;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Restore modal/action states
  const [animalToRestore, setAnimalToRestore] = useState<Animal | null>(null);

  // Quick edit animal modal state
  const [animalToEdit, setAnimalToEdit] = useState<Animal | null>(null);
  const [editName, setEditName] = useState('');
  const [editMorph, setEditMorph] = useState('');
  const [editSex, setEditSex] = useState<'Male' | 'Female'>('Male');
  const [editHealthStatus, setEditHealthStatus] = useState('Healthy');
  const [editEnclosureId, setEditEnclosureId] = useState('');

  // Success notification banner
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const activeAnimals = animals.filter(a => !a.isArchived);
  const archivedAnimals = animals.filter(a => !!a.isArchived);

  // Counts for Metric Cards
  const totalActiveCount = activeAnimals.length;
  const maleCount = activeAnimals.filter(a => a.sex === 'Male').length;
  const femaleCount = activeAnimals.filter(a => a.sex === 'Female').length;
  const uniqueSpeciesList = Array.from(new Set(activeAnimals.map(a => a.species).filter(Boolean)));
  const uniqueSpeciesCount = uniqueSpeciesList.length;

  // Extract unique species for current tab
  const currentList = viewTab === 'active' ? activeAnimals : archivedAnimals;
  const dropdownSpeciesList = ['All', ...Array.from(new Set(currentList.map(a => a.species).filter(Boolean)))];

  const filteredAnimals = currentList.filter(a => {
    const matchesSearch = (a.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (a.morph || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (a.archiveReason || '').toLowerCase().includes(searchQuery.toLowerCase());
    const standardHealthStatuses = ['Healthy', 'Under Observation', 'Under Treatment', 'Injured', 'Sick'];
    const matchesStatus = statusFilter === 'All' 
      ? true 
      : statusFilter === 'Active Care'
        ? (a.healthStatus && a.healthStatus !== 'Healthy')
        : statusFilter === 'Other'
          ? (a.healthStatus === 'Other' || !standardHealthStatuses.includes(a.healthStatus))
          : a.healthStatus === statusFilter;
    const matchesSpecies = speciesFilter === 'All' || a.species === speciesFilter;
    const matchesSex = sexFilter === 'All' || a.sex === sexFilter;
    return matchesSearch && matchesStatus && matchesSpecies && matchesSex;
  });

  const handleOpenArchiveModal = (animal: Animal) => {
    setAnimalToArchive(animal);
    setArchiveReasonType('Deceased / Clinical Mortality');
    setArchiveCustomNotes('');
    setArchiveEffectiveDate(systemDate || new Date().toISOString().split('T')[0]);
  };

  const handleConfirmArchive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalToArchive || !onUpdateAnimal) return;

    const fullReason = archiveCustomNotes.trim()
      ? `${archiveReasonType} — ${archiveCustomNotes.trim()}`
      : archiveReasonType;

    const updated: Animal = {
      ...animalToArchive,
      isArchived: true,
      archiveReason: fullReason,
      archiveDate: archiveEffectiveDate
    };

    onUpdateAnimal(updated);

    const nameOrId = animalToArchive.name || animalToArchive.id;
    setAnimalToArchive(null);
    setNotificationMsg(`"${nameOrId}" has been moved to the archives and removed from the active directory.`);
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleConfirmRestore = (animal: Animal) => {
    if (!onUpdateAnimal) return;

    const updated: Animal = {
      ...animal,
      isArchived: false,
      archiveReason: undefined,
      archiveDate: undefined
    };

    onUpdateAnimal(updated);
    setAnimalToRestore(null);
    const nameOrId = animal.name || animal.id;
    setNotificationMsg(`"${nameOrId}" has been restored to the active animals directory.`);
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleOpenQuickEdit = (animal: Animal) => {
    setAnimalToEdit(animal);
    setEditName(animal.name || '');
    setEditMorph(animal.morph || '');
    setEditSex(animal.sex || 'Male');
    setEditHealthStatus(animal.healthStatus || 'Healthy');
    setEditEnclosureId(animal.enclosureId || '');
  };

  const handleSaveQuickEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalToEdit || !onUpdateAnimal) return;

    const updated: Animal = {
      ...animalToEdit,
      name: editName || undefined,
      morph: editMorph,
      sex: editSex,
      healthStatus: editHealthStatus,
      enclosureId: editEnclosureId || undefined
    };

    onUpdateAnimal(updated);
    setAnimalToEdit(null);
    setNotificationMsg(`Patient ${animalToEdit.id} profile updated.`);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // RENDER THE CARD-BASED ANIMAL LIST (MATCHING ADMIN DASHBOARD)
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header & Directory View Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          <div>
            <h1 className={`text-xl sm:text-2xl font-black flex items-center space-x-2.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <PawPrint className="w-4 h-4" />
              </div>
              <span>Animals & Patient Directory</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage all animals in your facilities and track clinical care.
            </p>
          </div>
        </div>

        {/* Directory View Mode Tabs */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setViewTab('active');
              setStatusFilter('All');
              setSpeciesFilter('All');
              setSexFilter('All');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer border ${
              viewTab === 'active'
                ? (isDarkMode ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' : 'bg-emerald-800 text-white border-emerald-700 shadow-md')
                : (isDarkMode ? 'bg-[#06180F] border-emerald-950 text-slate-300 hover:text-white hover:bg-emerald-950/50' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50')
            }`}
          >
            <PawPrint className="w-3.5 h-3.5" />
            <span>Active Patients ({activeAnimals.length})</span>
          </button>

          <button
            onClick={() => {
              setViewTab('archived');
              setStatusFilter('All');
              setSpeciesFilter('All');
              setSexFilter('All');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer border ${
              viewTab === 'archived'
                ? (isDarkMode ? 'bg-amber-600 text-white border-amber-500 shadow-md' : 'bg-amber-700 text-white border-amber-600 shadow-md')
                : (isDarkMode ? 'bg-[#06180F] border-emerald-950 text-slate-300 hover:text-white hover:bg-emerald-950/50' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50')
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Archived Records ({archivedAnimals.length})</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notificationMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notificationMsg}</span>
          </div>
          <button 
            onClick={() => setNotificationMsg(null)}
            className="text-emerald-400 hover:text-white text-xs ml-2 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Top Metric Cards (Image 2 style: Total Animals, Male, Female, Total Species) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* 1. Total Animals */}
        <div className={`p-4 rounded-2xl border shadow-2xs flex items-center space-x-3.5 transition-colors ${
          isDarkMode ? 'bg-[#071F11] border-emerald-950/60 text-slate-200' : 'bg-white border-slate-100 text-slate-800'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <PawPrint className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-emerald-400/70 uppercase tracking-wider block">Total Animals</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 block">{totalActiveCount}</span>
          </div>
        </div>

        {/* 2. Male */}
        <div className={`p-4 rounded-2xl border shadow-2xs flex items-center space-x-3.5 transition-colors ${
          isDarkMode ? 'bg-[#071F11] border-emerald-950/60 text-slate-200' : 'bg-white border-slate-100 text-slate-800'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-blue-100/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0 font-black text-lg">
            ♂
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-blue-400/70 uppercase tracking-wider block">Male</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 block">{maleCount}</span>
          </div>
        </div>

        {/* 3. Female */}
        <div className={`p-4 rounded-2xl border shadow-2xs flex items-center space-x-3.5 transition-colors ${
          isDarkMode ? 'bg-[#071F11] border-emerald-950/60 text-slate-200' : 'bg-white border-slate-100 text-slate-800'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-rose-100/80 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0 font-black text-lg">
            ♀
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-rose-400/70 uppercase tracking-wider block">Female</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 block">{femaleCount}</span>
          </div>
        </div>

        {/* 4. Total Species */}
        <div className={`p-4 rounded-2xl border shadow-2xs flex items-center space-x-3.5 transition-colors ${
          isDarkMode ? 'bg-[#071F11] border-emerald-950/60 text-slate-200' : 'bg-white border-slate-100 text-slate-800'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-emerald-400/70 uppercase tracking-wider block">Total Species</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 block">{uniqueSpeciesCount}</span>
          </div>
        </div>
      </div>

      {/* 3. Animal List Container matching Image 2 */}
      <div className={`p-6 rounded-2xl border shadow-2xs transition-colors ${
        isDarkMode ? 'bg-[#071F11] border-emerald-950/60' : 'bg-white border-slate-100'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
            {viewTab === 'active' ? 'Animal List' : 'Archived Animal Registry'}
          </h2>
          <span className="text-xs font-bold text-slate-400">
            Showing {filteredAnimals.length} {viewTab === 'active' ? 'patients' : 'records'}
          </span>
        </div>

        {/* Search & Filter bar (matching Admin layout) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, species, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                isDarkMode 
                  ? 'bg-[#04110A] border-emerald-900/60 text-white placeholder-slate-500 focus:border-emerald-500' 
                  : 'bg-slate-50/50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#113C24]'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* Species Filter */}
            <select
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className={`text-xs font-bold px-3 py-2 rounded-xl border outline-none transition-all cursor-pointer ${
                isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-emerald-200' : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <option value="All">Species: All</option>
              {dropdownSpeciesList.filter(s => s !== 'All').map(sp => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
            </select>

            {/* Sex Filter */}
            <select
              value={sexFilter}
              onChange={(e) => setSexFilter(e.target.value as any)}
              className={`text-xs font-bold px-3 py-2 rounded-xl border outline-none transition-all cursor-pointer ${
                isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-emerald-200' : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <option value="All">Sex: All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`text-xs font-bold px-3 py-2 rounded-xl border outline-none transition-all cursor-pointer ${
                isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-emerald-200' : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <option value="All">Status: All</option>
              <option value="Healthy">Healthy</option>
              <option value="Under Treatment">Under Treatment</option>
              <option value="Under Observation">Under Observation</option>
              <option value="Injured">Injured</option>
              <option value="Sick">Sick</option>
            </select>
          </div>
        </div>

        {/* 4. Animals Card-Based List (Matching Image 2 exactly) */}
        {filteredAnimals.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <PawPrint className="w-12 h-12 text-slate-400/40 mb-3" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">No patients found</h3>
            <p className="text-xs text-slate-400 font-medium max-w-sm mt-1">
              {searchQuery || statusFilter !== 'All' || speciesFilter !== 'All' || sexFilter !== 'All'
                ? 'Try adjusting your filters or search terms.'
                : viewTab === 'active'
                  ? 'All facility animals are currently archived.'
                  : 'No archived records currently.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnimals.map(animal => {
              const animalEnclosure = enclosures.find(e => e.id === animal.enclosureId);
              const animalPendingAppointments = appointments.filter(a => {
                if (a.status !== 'Pending Approval' && a.status !== 'Pending') return false;
                return a.animalId === animal.id;
              });
              const hasPendingRequest = animalPendingAppointments.length > 0;
              const primaryReq = animalPendingAppointments[0];
              const reqInfo = primaryReq ? getAppointmentRequesterInfo(primaryReq) : null;
              const isRescheduleReq = primaryReq?.status === 'Reschedule Requested';
              const isAdminReq = reqInfo?.role === 'admin';
              const isKeeperReq = reqInfo?.role === 'keeper';
              const isVetReq = reqInfo?.role === 'vet';

              const photoSrc = (animal.image || animal.imageUrl || animal.photoUrl || '').trim();

              return (
                <div
                  key={animal.id}
                  onClick={() => setSelectedAnimal(animal)}
                  className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between hover:scale-[1.002] active:scale-[0.998] group relative ${
                    hasPendingRequest
                      ? isRescheduleReq
                        ? (isDarkMode ? 'bg-[#1a0f2e] border-purple-500/50 hover:border-purple-400 text-slate-200 shadow-xs' : 'bg-purple-50/70 border-purple-300/90 hover:border-purple-400 text-slate-800 shadow-xs')
                        : isAdminReq
                        ? (isDarkMode ? 'bg-[#062015] border-emerald-500/50 hover:border-emerald-400 text-slate-200 shadow-xs' : 'bg-emerald-50/70 border-emerald-300/90 hover:border-emerald-400 text-slate-800 shadow-xs')
                        : isKeeperReq
                        ? (isDarkMode ? 'bg-[#1b1606] border-amber-500/50 hover:border-amber-400 text-slate-200 shadow-xs' : 'bg-amber-50/50 border-amber-300/90 hover:border-amber-400 text-slate-800 shadow-xs')
                        : (isDarkMode ? 'bg-[#051e19] border-cyan-500/50 hover:border-cyan-400 text-slate-200 shadow-xs' : 'bg-cyan-50/50 border-cyan-300/90 hover:border-cyan-400 text-slate-800 shadow-xs')
                      : (isDarkMode ? 'bg-[#071F11] border-emerald-950/60 text-slate-200 hover:bg-[#0a2f1a]' : 'bg-white border-slate-100 text-slate-800 hover:bg-slate-50/50')
                  }`}
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    {/* Rounded square animal image (hover zoom) */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-slate-200/80 dark:border-emerald-950/40 shrink-0 shadow-xs bg-slate-900 flex items-center justify-center group-hover:scale-105 transition-all duration-300">
                      {photoSrc ? (
                        <img
                          src={photoSrc}
                          alt={animal.name || animal.species}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <Camera className="w-5 h-5 text-emerald-500/80" />
                          <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">No Photo</span>
                        </div>
                      )}
                    </div>

                    {/* Info text stack */}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDarkMode ? 'text-emerald-300' : 'text-[#113C24]'}`}>
                          {animal.id}
                        </span>
                        <span className={`inline-flex items-center justify-center text-xs font-black ${
                          animal.sex === 'Male' ? 'text-blue-500 dark:text-blue-300' : 'text-rose-500 dark:text-rose-300'
                        }`}>
                          {animal.sex === 'Male' ? '♂' : '♀'}
                        </span>

                        {hasPendingRequest && (
                          <span className={`inline-flex sm:hidden items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-black border ${
                            isRescheduleReq
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : isAdminReq
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : isKeeperReq
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full animate-ping ${
                              isRescheduleReq ? 'bg-purple-400' : isAdminReq ? 'bg-emerald-400' : isKeeperReq ? 'bg-amber-400' : 'bg-cyan-400'
                            }`}></span>
                            <span>{isRescheduleReq ? '🔄 Resched' : isAdminReq ? '🛡️ Admin Req' : isKeeperReq ? '👁️ Keeper Req' : '🩺 Vet Req'}</span>
                          </span>
                        )}
                      </div>

                      {animal.name ? (
                        <h4 className={`font-bold text-sm leading-tight truncate mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {animal.name}
                        </h4>
                      ) : (
                        <h4 className={`font-bold text-sm leading-tight truncate mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {animal.species}
                        </h4>
                      )}

                      <p className={`text-[11px] font-semibold truncate mt-0.5 ${isDarkMode ? 'text-emerald-300/80' : 'text-slate-500'}`}>
                        {animal.name ? `${animal.species} (${animal.morph || 'Normal'})` : `Morph: ${animal.morph || 'Normal'}`}
                      </p>
                    </div>
                  </div>

                  {/* Direct Notification badge if animal has pending requests (Image 2 design) */}
                  {hasPendingRequest && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAnimal(animal);
                      }}
                      className={`hidden md:flex items-center space-x-2.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs group/notif shrink-0 mx-2 ${
                        isRescheduleReq
                          ? isDarkMode
                            ? 'bg-purple-950/40 hover:bg-purple-900/40 border-purple-500/40 text-purple-200'
                            : 'bg-purple-50 hover:bg-purple-100/70 border-purple-300 text-purple-950'
                          : isAdminReq
                          ? isDarkMode
                            ? 'bg-emerald-950/40 hover:bg-emerald-900/40 border-emerald-500/40 text-emerald-200'
                            : 'bg-emerald-50 hover:bg-emerald-100/70 border-emerald-300 text-emerald-950'
                          : isKeeperReq
                          ? isDarkMode 
                            ? 'bg-amber-950/40 hover:bg-amber-900/40 border-amber-500/40 text-amber-200' 
                            : 'bg-amber-50 hover:bg-amber-100/70 border-amber-300 text-amber-950'
                          : isDarkMode 
                            ? 'bg-cyan-950/40 hover:bg-cyan-900/40 border-cyan-500/40 text-cyan-200' 
                            : 'bg-cyan-50 hover:bg-cyan-100/70 border-cyan-300 text-cyan-950'
                      }`}
                      title={`Review request for ${animal.name || animal.id}`}
                    >
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          isRescheduleReq ? 'bg-purple-400' : isAdminReq ? 'bg-emerald-400' : isKeeperReq ? 'bg-amber-400' : 'bg-cyan-400'
                        }`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${
                          isRescheduleReq ? 'bg-purple-500' : isAdminReq ? 'bg-emerald-500' : isKeeperReq ? 'bg-amber-500' : 'bg-cyan-500'
                        }`}></span>
                      </span>
                      
                      {isRescheduleReq ? (
                        <RotateCcw className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      ) : isAdminReq ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : isKeeperReq ? (
                        <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <Stethoscope className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      )}

                      <div className="flex flex-col text-left">
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${
                            isRescheduleReq
                              ? isDarkMode ? 'text-purple-300' : 'text-purple-800'
                              : isAdminReq
                              ? isDarkMode ? 'text-emerald-300' : 'text-emerald-800'
                              : isKeeperReq
                              ? isDarkMode ? 'text-amber-400' : 'text-amber-800'
                              : isDarkMode ? 'text-cyan-300' : 'text-cyan-800'
                          }`}>
                            {isRescheduleReq
                              ? '🔄 Reschedule Proposed'
                              : isAdminReq
                              ? '🛡️ Admin Request'
                              : isKeeperReq
                              ? '👁️ Keeper Request'
                              : '🩺 Vet Follow-up'}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                            isRescheduleReq
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : isAdminReq
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : isKeeperReq
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          }`}>
                            {isRescheduleReq ? 'Review New Date' : isAdminReq ? 'Awaiting Vet Auth' : isKeeperReq ? 'Observation' : 'Awaiting Admin Auth'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[10px] mt-0.5">
                          <span className={`font-bold truncate max-w-[120px] ${
                            isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            {getAppointmentRequesterInfo(primaryReq, staffMembers).name}
                          </span>
                          <span className="text-slate-400 font-mono">•</span>
                          <span className={`truncate max-w-[130px] lg:max-w-[200px] font-medium ${
                            isDarkMode ? 'text-slate-300' : 'text-slate-600'
                          }`}>
                            {primaryReq.purpose || primaryReq.type || 'Clinical Checkup'}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-md transition-colors shrink-0 flex items-center space-x-0.5 shadow-2xs ${
                        isRescheduleReq
                          ? 'bg-purple-500 hover:bg-purple-400 text-white'
                          : isAdminReq
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          : isKeeperReq
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      }`}>
                        <span>{isVetReq ? 'Details' : 'Review'}</span>
                        <span>&rarr;</span>
                      </span>
                    </div>
                  )}

                  {/* Enclosure and Health Status Column (matching Image 2) */}
                  <div className="hidden sm:flex items-center space-x-6 lg:space-x-8 text-right pr-4 shrink-0">
                    <div className="text-left">
                      <span className={`text-[9px] uppercase tracking-wider block font-bold ${isDarkMode ? 'text-emerald-400' : 'text-slate-400'}`}>Enclosure</span>
                      <span className={`font-bold text-xs mt-0.5 block ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                        {animal.enclosureId || 'None'}
                      </span>
                      <span className={`text-[10px] block mt-0.5 ${isDarkMode ? 'text-emerald-300/60 font-semibold' : 'text-slate-400'}`}>
                        {animalEnclosure ? animalEnclosure.facility : 'Reptile House 1'}
                      </span>
                    </div>

                    <div className="w-28 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                        animal.healthStatus === 'Healthy' 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-500/30' 
                          : animal.healthStatus === 'Under Treatment'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-500/30'
                          : 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-950/80 dark:text-red-300 dark:border-red-500/30'
                      }`}>
                        {animal.healthStatus || 'Healthy'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Actions & Arrow Chevron indicator */}
                  <div className="shrink-0 pl-1.5 flex items-center space-x-1.5">
                    {/* Quick Consult Stethoscope */}
                    {!animal.isArchived && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAnimalForConsult(animal.id);
                        }}
                        className="p-1.5 rounded-lg opacity-85 hover:opacity-100 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer shadow-2xs"
                        title="Log Clinical Consultation / Medical Record"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Edit Animal Details */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenQuickEdit(animal);
                      }}
                      className="p-1.5 rounded-lg opacity-85 hover:opacity-100 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer shadow-2xs"
                      title="Quick Edit Patient Profile"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Archive / Restore Button */}
                    {!animal.isArchived ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenArchiveModal(animal);
                        }}
                        className="p-1.5 rounded-lg opacity-85 hover:opacity-100 hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer"
                        title="Archive Patient"
                      >
                        <FolderArchive className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnimalToRestore(animal);
                        }}
                        className="p-1.5 rounded-lg opacity-85 hover:opacity-100 hover:bg-emerald-500/20 text-emerald-400 transition-colors cursor-pointer"
                        title="Restore Patient"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Chevron to open Animal Detail Page */}
                    <div className="p-1 text-slate-400 group-hover:text-white transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QUICK EDIT ANIMAL MODAL */}
      {animalToEdit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4 ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-emerald-950/40">
              <h3 className="font-extrabold text-sm sm:text-base">Quick Edit {animalToEdit.id}</h3>
              <button onClick={() => setAnimalToEdit(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Name (Optional)</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-bold ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Morph / Breed</label>
                <input
                  type="text"
                  value={editMorph}
                  onChange={(e) => setEditMorph(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-bold ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Sex</label>
                  <select
                    value={editSex}
                    onChange={(e) => setEditSex(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Health Status</label>
                  <select
                    value={editHealthStatus}
                    onChange={(e) => setEditHealthStatus(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Healthy">Healthy</option>
                    <option value="Under Observation">Under Observation</option>
                    <option value="Under Treatment">Under Treatment</option>
                    <option value="Injured">Injured</option>
                    <option value="Sick">Sick</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Enclosure</label>
                <select
                  value={editEnclosureId}
                  onChange={(e) => setEditEnclosureId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-bold ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="">Unassigned</option>
                  {enclosures.map(enc => (
                    <option key={enc.id} value={enc.id}>{enc.name} ({enc.facility})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAnimalToEdit(null)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARCHIVE ANIMAL MODAL */}
      {animalToArchive && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="p-5 border-b border-rose-950/40 bg-rose-950/20 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    Put Animal into Archives
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {animalToArchive.name || animalToArchive.id} • {animalToArchive.species}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAnimalToArchive(null)}
                className="p-1.5 rounded-lg border border-emerald-950 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmArchive} className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-xs text-rose-200 flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Patient Removal:</strong> Archiving will immediately remove <strong>{animalToArchive.name || animalToArchive.id}</strong> from the active patients directory table. All historical medical records and notes will remain intact and viewable in the Archive section.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Reason for Archiving *
                </label>
                <select
                  value={archiveReasonType}
                  onChange={(e) => setArchiveReasonType(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  required
                >
                  <option value="Deceased / Clinical Mortality">Deceased / Clinical Mortality</option>
                  <option value="Transferred to Another Facility / Sanctuary">Transferred to Another Facility / Sanctuary</option>
                  <option value="Released to Natural Habitat / Conservation">Released to Natural Habitat / Conservation</option>
                  <option value="Medical Isolation / Quarantine Complete">Medical Isolation / Quarantine Complete</option>
                  <option value="Administrative De-accessioning">Administrative De-accessioning</option>
                  <option value="Other Clinical Reason">Other Clinical Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Archive Effective Date *
                </label>
                <input
                  type="date"
                  value={archiveEffectiveDate}
                  onChange={(e) => setArchiveEffectiveDate(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Additional Clinical Notes / Details (Optional)
                </label>
                <textarea
                  rows={3}
                  value={archiveCustomNotes}
                  onChange={(e) => setArchiveCustomNotes(e.target.value)}
                  placeholder="e.g. Transferred under DENR permit; or Cause of mortality..."
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAnimalToArchive(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-black text-xs flex items-center space-x-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>Archive & Remove from Table</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      {animalToRestore && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4 ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm">Restore Patient to Active Table?</h3>
                <p className="text-xs text-slate-400 font-mono">{animalToRestore.name || animalToRestore.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to unarchive <strong>{animalToRestore.name || animalToRestore.id}</strong> ({animalToRestore.species})? It will immediately return to the Active Patients directory table.
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setAnimalToRestore(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRestore(animalToRestore)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center space-x-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Yes, Restore Patient</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Medical History Modal */}
      {selectedAnimalForHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden max-h-[85vh] flex flex-col ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="p-5 border-b border-emerald-950/40 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/40 shrink-0 flex items-center justify-center">
                  {(selectedAnimalForHistory.image || selectedAnimalForHistory.imageUrl) ? (
                    <img src={selectedAnimalForHistory.image || selectedAnimalForHistory.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Camera className="w-3.5 h-3.5 text-emerald-500/80" />
                      <span className="text-[6px] font-bold uppercase tracking-wider text-slate-400">No Photo</span>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    {selectedAnimalForHistory.name || selectedAnimalForHistory.id} — Clinical History
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedAnimalForHistory.species} • Sex: {selectedAnimalForHistory.sex} • Weight: {selectedAnimalForHistory.weight || 0}g
                    {selectedAnimalForHistory.isArchived && <span className="ml-2 text-amber-400 font-bold">(Archived)</span>}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAnimalForHistory(null)}
                className="p-1.5 rounded-lg border border-emerald-950 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {(() => {
                const history = medicalRecords.filter(m => m.animalId === selectedAnimalForHistory.id);
                if (history.length === 0) {
                  return (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No previous clinical medical records logged for this animal yet.
                    </div>
                  );
                }
                return (
                  <div className="space-y-3">
                    {history.map(rec => (
                      <div
                        key={rec.id}
                        className={`p-4 rounded-xl border space-y-2 text-xs ${
                          isDarkMode ? 'bg-[#04110A] border-emerald-950/60' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-emerald-950/20 pb-2">
                          <span className="font-bold text-emerald-400">{rec.recordType}</span>
                          <span className="font-mono text-slate-400 text-[10px]">{rec.recordDate}</span>
                        </div>
                        <p><strong>Purpose:</strong> {rec.purpose}</p>
                        <p><strong>Observation:</strong> {rec.clinicalObservation}</p>
                        <p><strong>Treatment:</strong> <span className="text-emerald-300">{rec.treatment}</span></p>
                        <p className="text-[10px] text-slate-400">Attending Vet: {rec.veterinarian}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t border-emerald-950/40 flex justify-end gap-2">
              {!selectedAnimalForHistory.isArchived && (
                <button
                  onClick={() => {
                    const animalId = selectedAnimalForHistory.id;
                    setSelectedAnimalForHistory(null);
                    onSelectAnimalForConsult(animalId);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Log New Consultation</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ANIMAL DETAIL MODAL OVERLAY (MATCHING ADMIN DASHBOARD DETAIL OVERLAY WITH CLOSE 'X') */}
      {selectedAnimal && (
        <VetAnimalDetailView
          animal={animals.find(a => a.id === selectedAnimal.id) || selectedAnimal}
          enclosures={enclosures}
          tasks={tasks}
          medicalRecords={medicalRecords}
          appointments={appointments}
          staffMembers={staffMembers}
          isDarkMode={isDarkMode}
          systemDate={systemDate}
          onBack={() => setSelectedAnimal(null)}
          onClose={() => setSelectedAnimal(null)}
          onUpdateAnimal={(updated) => {
            setSelectedAnimal(updated);
            if (onUpdateAnimal) onUpdateAnimal(updated);
          }}
          onSelectAnimalForConsult={(id) => {
            setSelectedAnimal(null);
            if (onSelectAnimalForConsult) onSelectAnimalForConsult(id);
          }}
          onScheduleForAnimal={onScheduleForAnimal}
          onAddAppointment={onAddAppointment}
          onUpdateAppointment={onUpdateAppointment}
          onUpdateAppointmentStatus={onUpdateAppointmentStatus}
          onAddMedicalRecord={onAddMedicalRecord}
          userAccount={userAccount}
        />
      )}
    </div>
  );
}
