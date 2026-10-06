import React from 'react';
import {
  PawPrint,
  Plus,
  Leaf,
  Search,
  Camera,
  Edit2,
  Trash2,
  ChevronRight,
  Stethoscope,
  Eye,
  Shield,
  AlertTriangle,
  X,
  ArrowLeft,
  Clock,
  Thermometer,
  Flame,
  Sun
} from 'lucide-react';
import { Animal, Enclosure, Appointment, StaffMember, getAppointmentRequesterInfo, resolveVeterinarianName } from '../../types';

interface AdminAnimalsViewProps {
  animals: Animal[];
  enclosures: Enclosure[];
  appointments: Appointment[];
  staffMembers: StaffMember[];
  isDarkMode: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  speciesFilter: string;
  setSpeciesFilter: (val: string) => void;
  sexFilter: string;
  setSexFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  selectedAnimal: Animal | null;
  onSelectAnimal: (animal: Animal, initialTab: 'overview' | 'medical') => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (animal: Animal) => void;
  onOpenDeleteModal: (animal: Animal) => void;
  onDeleteAppointment?: (id: string) => void;
  onUpdateAppointmentStatus?: (id: string, status: Appointment['status']) => void;
  onBackToDashboard?: () => void;
  onBack?: () => void;
}

export const AdminAnimalsView: React.FC<AdminAnimalsViewProps> = ({
  animals,
  enclosures,
  appointments,
  staffMembers,
  isDarkMode,
  searchQuery,
  setSearchQuery,
  speciesFilter,
  setSpeciesFilter,
  sexFilter,
  setSexFilter,
  statusFilter,
  setStatusFilter,
  selectedAnimal,
  onSelectAnimal,
  onOpenAddModal,
  onOpenEditModal,
  onOpenDeleteModal,
  onDeleteAppointment,
  onUpdateAppointmentStatus,
  onBackToDashboard,
  onBack
}) => {
  const handleBack = onBack || onBackToDashboard;
  const activeAnimals = animals.filter(a => !a.isArchived);

  const uniqueSpecies = Array.from(new Set(activeAnimals.map(a => a.species))).sort();

  const totalAnimalsCount = activeAnimals.length;
  const maleCount = activeAnimals.filter(a => a.sex === 'Male').length;
  const femaleCount = activeAnimals.filter(a => a.sex === 'Female').length;
  const uniqueSpeciesCount = uniqueSpecies.length;

  const pendingApprovalsCount = appointments.filter(a => a.status === 'Pending Approval' || a.status === 'Pending').length;
  const pendingClimateCount = activeAnimals.filter(animal => {
    if (!animal.enclosureId) return false;
    const enc = enclosures.find(e => e.id === animal.enclosureId || e.name === animal.enclosureId);
    return enc?.climateProfile?.status === 'Pending Setup' || enc?.climateProfile?.status === 'Pending Approval';
  }).length;

  const filteredAnimals = activeAnimals.filter(animal => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = 
      (animal.name || '').toLowerCase().includes(q) ||
      (animal.species || '').toLowerCase().includes(q) ||
      (animal.id || '').toLowerCase().includes(q) ||
      (animal.morph || '').toLowerCase().includes(q);

    const matchesSpecies = speciesFilter === 'All' || animal.species === speciesFilter;
    const matchesSex = sexFilter === 'All' || animal.sex === sexFilter;
    
    let matchesStatus = true;
    if (statusFilter === 'Pending Request') {
      const hasPending = appointments.some(a => 
        (a.status === 'Pending Approval' || a.status === 'Pending' || a.status === 'Reschedule Requested') &&
        a.animalId === animal.id &&
        a.requestedByRole !== 'admin' &&
        !a.requestedBy?.toLowerCase().includes('admin') &&
        !a.id?.startsWith('APT-ADM-')
      );
      matchesStatus = hasPending;
    } else if (statusFilter === 'Pending Climate') {
      if (!animal.enclosureId) {
        matchesStatus = false;
      } else {
        const enc = enclosures.find(e => e.id === animal.enclosureId || e.name === animal.enclosureId);
        matchesStatus = !!(enc?.climateProfile?.status === 'Pending Setup' || enc?.climateProfile?.status === 'Pending Approval');
      }
    } else if (statusFilter !== 'All') {
      matchesStatus = animal.healthStatus === statusFilter;
    }

    return matchesQuery && matchesSpecies && matchesSex && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header with icon, title, and Add New Animal button */}
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
          <div className="w-10 h-10 rounded-xl bg-[#113C24] dark:bg-emerald-800 flex items-center justify-center text-white shrink-0 shadow-xs">
            <PawPrint className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Animals</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Manage all animals in your facilities.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="px-4 py-2.5 bg-[#113C24] hover:bg-[#1B5234] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all flex items-center space-x-2 cursor-pointer self-start sm:self-auto active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add New Animal</span>
          </button>
        </div>
      </div>

      {/* Counts Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Animals */}
        <div className={`p-4 rounded-2xl border shadow-2xs flex items-center space-x-3.5 transition-colors ${
          isDarkMode ? 'bg-[#071F11] border-emerald-950/60 text-slate-200' : 'bg-white border-slate-100 text-slate-800'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <PawPrint className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-emerald-400/70 uppercase tracking-wider block">Total Animals</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 block">{totalAnimalsCount}</span>
          </div>
        </div>

        {/* 2. Male */}
        <div className={`p-4 rounded-2xl border shadow-2xs flex items-center space-x-3.5 transition-colors ${
          isDarkMode ? 'bg-[#071F11] border-emerald-950/60 text-slate-200' : 'bg-white border-slate-100 text-slate-800'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-blue-100/80 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-base shrink-0">
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
          <div className="w-10 h-10 rounded-xl bg-rose-100/80 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black text-base shrink-0">
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

      {/* Animal List Container */}
      <div className={`p-6 rounded-2xl border shadow-2xs transition-colors ${
        isDarkMode ? 'bg-[#071F11] border-emerald-950/60' : 'bg-white border-slate-100'
      }`}>
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-4">Animal List</h2>

        {/* Search & Filter bar */}
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
            <select
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className={`text-xs font-bold px-3 py-2 rounded-xl border outline-none transition-all cursor-pointer ${
                isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-emerald-200' : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <option value="All">Species: All</option>
              {uniqueSpecies.map(sp => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
            </select>

            <select
              value={sexFilter}
              onChange={(e) => setSexFilter(e.target.value)}
              className={`text-xs font-bold px-3 py-2 rounded-xl border outline-none transition-all cursor-pointer ${
                isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-emerald-200' : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <option value="All">Sex: All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`text-xs font-bold px-3 py-2 rounded-xl border outline-none transition-all cursor-pointer ${
                isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-emerald-200' : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <option value="All">Status: All</option>
              {pendingApprovalsCount > 0 && (
                <option value="Pending Request">⚠️ Has Pending Request ({pendingApprovalsCount})</option>
              )}
              {pendingClimateCount > 0 && (
                <option value="Pending Climate">🌡️ Climate / Temp Request ({pendingClimateCount})</option>
              )}
              <option value="Healthy">Healthy</option>
              <option value="Under Treatment">Under Treatment</option>
              <option value="Under Observation">Under Observation</option>
              <option value="Injured">Injured</option>
            </select>

            {(statusFilter !== 'All' || speciesFilter !== 'All' || sexFilter !== 'All' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('All');
                  setSpeciesFilter('All');
                  setSexFilter('All');
                  setSearchQuery('');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 border shadow-2xs ${
                  isDarkMode 
                    ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-800' 
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200'
                }`}
                title="Reset all filters to show all animals"
              >
                <X className="w-3.5 h-3.5" />
                <span>Show All Animals ({totalAnimalsCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Warning Banner if showing filtered view */}
        {statusFilter === 'Pending Request' && (
          <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200 ${
            isDarkMode ? 'bg-amber-950/30 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Showing <strong>{filteredAnimals.length}</strong> of <strong>{totalAnimalsCount}</strong> animals with pending authorization requests. Other animals are currently hidden by this filter.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStatusFilter('All')}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer shrink-0"
            >
              Show All Animals ({totalAnimalsCount})
            </button>
          </div>
        )}

        {statusFilter === 'Pending Climate' && (
          <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200 ${
            isDarkMode ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200' : 'bg-cyan-50 border-cyan-300 text-cyan-900'
          }`}>
            <div className="flex items-center space-x-2">
              <Thermometer className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
              <span>
                Showing <strong>{filteredAnimals.length}</strong> of <strong>{totalAnimalsCount}</strong> animals with active vivarium temperature or breeding climate setup requests.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStatusFilter('All')}
              className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer shrink-0"
            >
              Show All Animals ({totalAnimalsCount})
            </button>
          </div>
        )}

        {/* Animals List or Empty State */}
        {filteredAnimals.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <svg className="w-36 h-32 text-slate-300 dark:text-emerald-900/60 mb-2" viewBox="0 0 160 120" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 30 100 V 60 A 50 50 0 0 1 130 60 V 100" />
              <line x1="15" y1="100" x2="145" y2="100" />
              <path d="M 55 100 V 65 A 25 25 0 0 1 105 65 V 100" />
              <line x1="30" y1="60" x2="55" y2="65" />
              <line x1="130" y1="60" x2="105" y2="65" />
              <g fill="currentColor" stroke="none">
                <ellipse cx="80" cy="78" rx="8" ry="6" />
                <circle cx="71" cy="67" r="2.8" />
                <circle cx="77" cy="63" r="2.8" />
                <circle cx="83" cy="63" r="2.8" />
                <circle cx="89" cy="67" r="2.8" />
              </g>
            </svg>

            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-2">No animals added yet.</h3>
            <p className="text-xs text-slate-400 font-medium max-w-sm mt-1.5 leading-relaxed">
              Start by adding your first animal to manage its information, care, and health records.
            </p>

            <button
              onClick={onOpenAddModal}
              className="mt-6 px-6 py-2.5 bg-[#113C24] hover:bg-[#1B5234] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add New Animal</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnimals.map(animal => {
              const animalEnclosure = animal.enclosureId ? enclosures.find(e => e.id === animal.enclosureId || e.name === animal.enclosureId) : undefined;
              const isSelected = selectedAnimal?.id === animal.id;
              const isAptFromAdmin = (a: Appointment) => 
                a.requestedByRole === 'admin' || 
                a.requestedBy?.toLowerCase().includes('admin') || 
                a.id?.startsWith('APT-ADM-');

              const animalPendingAppointments = appointments.filter(a => {
                if (a.status !== 'Pending Approval' && a.status !== 'Pending' && a.status !== 'Reschedule Requested') return false;
                if (isAptFromAdmin(a)) return false;
                return a.animalId === animal.id;
              });

              const animalAdminWaitingVetAppointments = appointments.filter(a => {
                if (a.status !== 'Pending Approval' && a.status !== 'Pending') return false;
                if (!isAptFromAdmin(a)) return false;
                return a.animalId === animal.id;
              });

              const animalScheduledAppointments = appointments.filter(a => {
                if (a.status !== 'Approved' && a.status !== 'Ongoing') return false;
                return a.animalId === animal.id;
              });

              const hasPendingRequest = animalPendingAppointments.length > 0;
              const hasAdminWaitingVet = !hasPendingRequest && animalAdminWaitingVetAppointments.length > 0;
              const adminWaitingVet = hasAdminWaitingVet ? animalAdminWaitingVetAppointments[0] : null;
              const hasScheduledVisit = !hasPendingRequest && !hasAdminWaitingVet && animalScheduledAppointments.length > 0;
              const scheduledVisit = hasScheduledVisit ? animalScheduledAppointments[0] : null;

              // Climate & Temperature Setup / Breeding Request State
              const climateProfile = animalEnclosure?.climateProfile;
              const isClimateForThisAnimal = !!(climateProfile && (!climateProfile.targetAnimalId || climateProfile.targetAnimalId === animal.id || climateProfile.targetSpecies?.toLowerCase() === animal.species.toLowerCase()));
              const hasClimatePendingSetup = isClimateForThisAnimal && climateProfile?.status === 'Pending Setup';
              const hasClimatePendingApproval = isClimateForThisAnimal && climateProfile?.status === 'Pending Approval';
              const hasClimateApproved = isClimateForThisAnimal && climateProfile?.status === 'Approved' && climateProfile?.isActive;

              const primaryReq = animalPendingAppointments[0];
              const requesterInfo = primaryReq ? getAppointmentRequesterInfo(primaryReq, staffMembers) : null;
              const isReschedReq = primaryReq?.status === 'Reschedule Requested';
              const isVetReq = isReschedReq || requesterInfo?.role === 'vet';
              const isKeeperReq = requesterInfo?.role === 'keeper';

              return (
                <div
                  key={animal.id}
                  onClick={() => onSelectAnimal(animal, hasPendingRequest ? 'medical' : 'overview')}
                  className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between hover:scale-[1.002] active:scale-[0.998] group relative ${
                    isSelected
                      ? (isDarkMode ? 'bg-[#113C24] border-emerald-400/80 shadow-sm' : 'bg-emerald-50 border-[#113C24]/30 shadow-xs')
                      : hasPendingRequest
                      ? isVetReq
                        ? (isDarkMode ? 'bg-[#051e19] border-cyan-500/50 hover:border-cyan-400 text-slate-200 shadow-xs' : 'bg-cyan-50/50 border-cyan-300/90 hover:border-cyan-400 text-slate-800 shadow-xs')
                        : (isDarkMode ? 'bg-[#1b1606] border-amber-500/50 hover:border-amber-400 text-slate-200 shadow-xs' : 'bg-amber-50/50 border-amber-300/90 hover:border-amber-400 text-slate-800 shadow-xs')
                      : hasClimatePendingSetup
                      ? (isDarkMode ? 'bg-[#041c24] border-cyan-500/50 hover:border-cyan-400 text-slate-200 shadow-xs' : 'bg-cyan-50/60 border-cyan-300 hover:border-cyan-400 text-slate-800 shadow-xs')
                      : hasClimatePendingApproval
                      ? (isDarkMode ? 'bg-[#1e1704] border-amber-500/50 hover:border-amber-400 text-slate-200 shadow-xs' : 'bg-amber-50/60 border-amber-300 hover:border-amber-400 text-slate-800 shadow-xs')
                      : hasScheduledVisit
                      ? (isDarkMode ? 'bg-[#061d12] border-emerald-500/40 text-slate-200 hover:bg-[#09291a]' : 'bg-emerald-50/40 border-emerald-300/60 text-slate-800 hover:bg-emerald-50/80')
                      : (isDarkMode ? 'bg-[#071F11] border-emerald-950/60 text-slate-200 hover:bg-[#0a2f1a]' : 'bg-white border-slate-100 text-slate-800 hover:bg-slate-50/50')
                  }`}
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-slate-200/80 dark:border-emerald-950/40 shrink-0 shadow-xs bg-slate-900 flex items-center justify-center group-hover:scale-102 transition-all duration-300">
                      {animal.image ? (
                        <img src={animal.image} alt={animal.name || animal.species} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <Camera className="w-5 h-5 text-emerald-500/80" />
                          <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">No Photo</span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDarkMode ? 'text-emerald-300' : 'text-[#113C24]'}`}>
                          {animal.id}
                        </span>
                        <span className={`inline-flex items-center justify-center text-xs font-black ${
                          animal.sex === 'Male' ? 'text-blue-500 dark:text-blue-300' : 'text-rose-500 dark:text-rose-300'
                        }`}>
                          {animal.sex === 'Male' ? '♂' : '♀'}
                        </span>

                        {hasPendingRequest && (
                          <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-black border max-w-full truncate ${
                            isVetReq 
                              ? isDarkMode
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                                : 'bg-cyan-100 text-cyan-900 border-cyan-300'
                              : isDarkMode
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 animate-ping ${isVetReq ? 'bg-cyan-400' : 'bg-amber-400'}`}></span>
                            <span className="truncate">
                              {isReschedReq 
                                ? `🩺 Resched Req (${requesterInfo?.name || primaryReq?.veterinarian || 'Vet'})` 
                                : isVetReq 
                                ? `🩺 Vet Req (${requesterInfo?.name || 'Vet'})` 
                                : `👁️ Keeper Req (${requesterInfo?.name || 'Keeper'})`}
                            </span>
                          </span>
                        )}

                        {/* Climate / Temp Change Request Badges */}
                        {hasClimatePendingSetup && (
                          <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-black border max-w-full truncate ${
                            isDarkMode
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                              : 'bg-cyan-100 text-cyan-900 border-cyan-300'
                          }`} title="Admin requested temperature change from keeper for breeding">
                            <Thermometer className="w-2.5 h-2.5 text-cyan-400 shrink-0 animate-pulse" />
                            <span className="truncate">🌡️ Temp Req: {climateProfile?.coolingTempRange || '18°C–20°C'} (Keeper Setup)</span>
                          </span>
                        )}

                        {hasClimatePendingApproval && (
                          <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-black border max-w-full truncate ${
                            isDarkMode
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`} title="Keeper submitted temperature calibration readings. Waiting for Admin verification and approval.">
                            <Thermometer className="w-2.5 h-2.5 text-amber-400 shrink-0 animate-pulse" />
                            <span className="truncate">🌡️ Temp Set: {climateProfile?.dayTemp}°C / {climateProfile?.nightTemp}°C (Pending Admin)</span>
                          </span>
                        )}

                        {hasClimateApproved && (
                          <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-black border max-w-full truncate ${
                            isDarkMode
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`} title="Breeding climate cooling cycle active">
                            <span className="truncate">❄️ Climate Active ({climateProfile?.dayTemp ?? 28}°C / {climateProfile?.nightTemp ?? 19}°C)</span>
                          </span>
                        )}

                        {hasAdminWaitingVet && adminWaitingVet && (
                          <span className={`inline-flex lg:hidden items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-black border max-w-full truncate ${
                            isDarkMode
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-400 animate-pulse"></span>
                            <span className="truncate">⏳ Vet Approval ({resolveVeterinarianName(adminWaitingVet.veterinarian, staffMembers)})</span>
                          </span>
                        )}

                        {hasScheduledVisit && scheduledVisit && (
                          <span className={`inline-flex lg:hidden items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-black border max-w-full truncate ${
                            isDarkMode
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}>
                            <span>🩺 Vet: {resolveVeterinarianName(scheduledVisit.veterinarian, staffMembers)}</span>
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
                        {animal.name ? `${animal.species} (${animal.morph})` : `Morph: ${animal.morph}`}
                      </p>
                    </div>
                  </div>

                  {/* Direct Notification badge if animal has pending requests */}
                  {hasPendingRequest && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAnimal(animal, 'medical');
                      }}
                      className={`hidden lg:flex items-center space-x-2.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs group/notif shrink-0 mx-2 ${
                        isVetReq
                          ? isDarkMode 
                            ? 'bg-cyan-950/40 hover:bg-cyan-900/40 border-cyan-500/40 text-cyan-200' 
                            : 'bg-cyan-50 hover:bg-cyan-100/70 border-cyan-300 text-cyan-950'
                          : isDarkMode 
                            ? 'bg-amber-950/40 hover:bg-amber-900/40 border-amber-500/40 text-amber-200' 
                            : 'bg-amber-50 hover:bg-amber-100/70 border-amber-300 text-amber-950'
                      }`}
                      title={`Click to review request from ${primaryReq.requestedBy || (isVetReq ? 'Veterinarian' : 'Keeper')}`}
                    >
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          isVetReq ? 'bg-cyan-400' : 'bg-amber-400'
                        }`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${
                          isVetReq ? 'bg-cyan-500' : 'bg-amber-500'
                        }`}></span>
                      </span>
                      
                      {isVetReq ? (
                        <Stethoscope className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}

                      <div className="flex flex-col text-left">
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${
                            isVetReq 
                              ? isDarkMode ? 'text-cyan-300' : 'text-cyan-800'
                              : isDarkMode ? 'text-amber-400' : 'text-amber-800'
                          }`}>
                            {isReschedReq ? '🩺 Resched Request' : isVetReq ? '🩺 Vet Request' : '👁️ Keeper Request'}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                            isVetReq
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            Awaiting Auth
                          </span>
                          {animalPendingAppointments.length > 1 && (
                            <span className="text-[9px] font-bold px-1 rounded bg-slate-800 text-slate-300">
                              +{animalPendingAppointments.length - 1}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1.5 text-[10px] mt-0.5">
                          <span className={`font-bold truncate max-w-[120px] ${
                            isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            {requesterInfo?.name}
                          </span>
                          <span className="text-slate-400 font-mono">•</span>
                          <span className={`truncate max-w-[130px] lg:max-w-[200px] font-medium ${
                            isDarkMode ? 'text-slate-300' : 'text-slate-600'
                          }`}>
                            {primaryReq.purpose || primaryReq.type || (isVetReq ? 'Clinical Checkup' : 'Observation Request')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-md transition-colors flex items-center space-x-0.5 shadow-2xs ${
                          isVetReq
                            ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        }`}>
                          <span>Review</span>
                          <span>&rarr;</span>
                        </span>

                        {onDeleteAppointment && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteAppointment(primaryReq.id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer"
                            title="Dismiss / Cancel this checkup request"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Climate / Temp Change Request Waiting for Keeper Setup Badge */}
                  {!hasPendingRequest && !hasAdminWaitingVet && hasClimatePendingSetup && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAnimal(animal, 'overview');
                      }}
                      className={`hidden lg:flex items-center space-x-2.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs group/notif shrink-0 mx-2 ${
                        isDarkMode 
                          ? 'bg-cyan-950/40 hover:bg-cyan-900/40 border-cyan-500/40 text-cyan-200' 
                          : 'bg-cyan-50 hover:bg-cyan-100/70 border-cyan-300 text-cyan-950'
                      }`}
                      title={`Admin requested keeper temperature calibration (${climateProfile?.coolingTempRange || '18°C–20°C'}). Awaiting keeper vivarium calibration.`}
                    >
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-cyan-400"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                      </span>
                      <Thermometer className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <div className="flex flex-col text-left">
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${
                            isDarkMode ? 'text-cyan-300' : 'text-cyan-800'
                          }`}>
                            🌡️ Breeding Temp Change Request
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold border bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                            Assigned to Keeper
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[10px] mt-0.5">
                          <span className={`font-bold truncate max-w-[130px] ${
                            isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            Target: {climateProfile?.coolingTempRange || '18°C–20°C'}
                          </span>
                          <span className="text-slate-400 font-mono">•</span>
                          <span className={`truncate max-w-[160px] font-medium ${
                            isDarkMode ? 'text-slate-300' : 'text-slate-600'
                          }`}>
                            Vivarium: {animalEnclosure?.name || 'Assigned Enclosure'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Climate Readings Submitted Waiting for Admin Approval Badge */}
                  {!hasPendingRequest && !hasAdminWaitingVet && hasClimatePendingApproval && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAnimal(animal, 'overview');
                      }}
                      className={`hidden lg:flex items-center space-x-2.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs group/notif shrink-0 mx-2 ${
                        isDarkMode 
                          ? 'bg-amber-950/40 hover:bg-amber-900/40 border-amber-500/40 text-amber-200' 
                          : 'bg-amber-50 hover:bg-amber-100/70 border-amber-300 text-amber-950'
                      }`}
                      title="Keeper configured vivarium temperature. Click to review and approve climate setup."
                    >
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-amber-400"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      <Thermometer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <div className="flex flex-col text-left">
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${
                            isDarkMode ? 'text-amber-300' : 'text-amber-800'
                          }`}>
                            🌡️ Temp Readings Submitted
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold border bg-amber-500/20 text-amber-300 border-amber-500/30">
                            Awaiting Admin Approval
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[10px] mt-0.5">
                          <span className={`font-bold truncate max-w-[130px] ${
                            isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            {climateProfile?.dayTemp}°C Day / {climateProfile?.nightTemp}°C Night
                          </span>
                          <span className="text-slate-400 font-mono">•</span>
                          <span className={`truncate max-w-[160px] font-medium ${
                            isDarkMode ? 'text-slate-300' : 'text-slate-600'
                          }`}>
                            By {climateProfile?.configuredByKeeper || 'Keeper'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Admin Consultation Request Waiting for Vet Approval Badge */}
                  {hasAdminWaitingVet && adminWaitingVet && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAnimal(animal, 'medical');
                      }}
                      className={`hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs shrink-0 mx-2 ${
                        isDarkMode 
                          ? 'bg-amber-950/40 hover:bg-amber-900/40 border-amber-500/40 text-amber-200' 
                          : 'bg-amber-50 hover:bg-amber-100/70 border-amber-300 text-amber-950'
                      }`}
                      title={`Consultation request sent to ${resolveVeterinarianName(adminWaitingVet.veterinarian, staffMembers)}. Waiting for vet approval in Vet Portal.`}
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                      <div className="flex flex-col text-left">
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${
                            isDarkMode ? 'text-amber-300' : 'text-amber-800'
                          }`}>
                            Waiting for Vet Approval
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold border bg-amber-500/20 text-amber-300 border-amber-500/30">
                            ⏳ Pending Vet
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[10px] mt-0.5">
                          <span className={`font-bold truncate max-w-[120px] ${
                            isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            {resolveVeterinarianName(adminWaitingVet.veterinarian, staffMembers)}
                          </span>
                          <span className="text-slate-400 font-mono">•</span>
                          <span className="text-slate-400 font-mono">📅 {adminWaitingVet.date}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scheduled Authorized Vet Visit Badge (Non-blocking, informative) */}
                  {hasScheduledVisit && scheduledVisit && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAnimal(animal, 'medical');
                      }}
                      className={`hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs shrink-0 mx-2 ${
                        isDarkMode 
                          ? 'bg-emerald-950/40 hover:bg-emerald-900/40 border-emerald-500/40 text-emerald-300' 
                          : 'bg-emerald-50 hover:bg-emerald-100/70 border-emerald-300 text-emerald-900'
                      }`}
                      title={`Authorized clinical checkup scheduled with ${resolveVeterinarianName(scheduledVisit.veterinarian, staffMembers)}`}
                    >
                      <Stethoscope className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <div className="flex flex-col text-left">
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${
                            isDarkMode ? 'text-emerald-300' : 'text-emerald-800'
                          }`}>
                            Scheduled Vet Visit
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                            ✓ Authorized
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[10px] mt-0.5">
                          <span className={`font-bold truncate max-w-[120px] ${
                            isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            {resolveVeterinarianName(scheduledVisit.veterinarian, staffMembers)}
                          </span>
                          <span className="text-slate-400 font-mono">•</span>
                          <span className="text-slate-400 font-mono">📅 {scheduledVisit.date}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Enclosure and Health Status Column */}
                  <div className="hidden sm:flex items-center space-x-6 lg:space-x-8 text-right pr-4 shrink-0">
                    <div className="text-left">
                      <span className={`text-[9px] uppercase tracking-wider block font-bold ${isDarkMode ? 'text-emerald-400' : 'text-slate-400'}`}>Enclosure</span>
                      <span className={`font-bold text-xs mt-0.5 block ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                        {animalEnclosure ? (animalEnclosure.name || animalEnclosure.id) : (animal.enclosureId || 'None')}
                      </span>
                      <span className={`text-[10px] block mt-0.5 ${isDarkMode ? 'text-emerald-300/60 font-semibold' : 'text-slate-400'}`}>
                        {animalEnclosure ? animalEnclosure.facility : 'Unassigned'}
                      </span>
                      {hasClimatePendingSetup && (
                        <span className="inline-flex items-center space-x-1 text-[9px] font-black text-cyan-500 dark:text-cyan-300 mt-0.5">
                          <Thermometer className="w-2.5 h-2.5 animate-pulse shrink-0" />
                          <span>Req: {climateProfile?.coolingTempRange || '18°C–20°C'}</span>
                        </span>
                      )}
                      {hasClimatePendingApproval && (
                        <span className="inline-flex items-center space-x-1 text-[9px] font-black text-amber-500 dark:text-amber-300 mt-0.5">
                          <Thermometer className="w-2.5 h-2.5 animate-pulse shrink-0" />
                          <span>Submitted: {climateProfile?.dayTemp}°C</span>
                        </span>
                      )}
                      {hasClimateApproved && (
                        <span className="inline-flex items-center space-x-1 text-[9px] font-black text-emerald-500 dark:text-emerald-300 mt-0.5">
                          <span>❄️ {climateProfile?.dayTemp ?? 28}°C/{climateProfile?.nightTemp ?? 19}°C</span>
                        </span>
                      )}
                    </div>

                    <div className="w-28 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                        animal.healthStatus === 'Healthy' 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-500/30' 
                          : animal.healthStatus === 'Under Treatment'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-500/30'
                          : 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-950/80 dark:text-red-300 dark:border-red-500/30'
                      }`}>
                        {animal.healthStatus}
                      </span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="shrink-0 pl-1.5 flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEditModal(animal);
                      }}
                      className="p-1.5 rounded-lg opacity-85 hover:opacity-100 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer shadow-2xs"
                      title="Edit Animal Profile"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDeleteModal(animal);
                      }}
                      className="p-1.5 rounded-lg opacity-85 hover:opacity-100 hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer"
                      title="Remove or Archive Animal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${
                      isDarkMode ? 'text-emerald-400' : 'text-slate-500'
                    }`} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default AdminAnimalsView;
