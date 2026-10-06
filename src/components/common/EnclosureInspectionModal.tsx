import React, { useState } from 'react';
import { 
  X, Shield, Box, Thermometer, Droplets, Users, Sparkles, PawPrint, 
  ChevronRight, Calendar, Heart, AlertTriangle, CheckCircle2, Utensils,
  Camera, Stethoscope, QrCode, ArrowLeft, RefreshCw, Clock, ExternalLink,
  MapPin, Check, Info, ShieldAlert, LogIn, Lock, Activity, ClipboardList,
  Flame, KeyRound, ArrowUpRight
} from 'lucide-react';
import { Enclosure, Animal, Task, MedicalRecord, Role } from '../../types';

interface EnclosureInspectionModalProps {
  enclosure: Enclosure;
  animals: Animal[];
  tasks?: Task[];
  medicalRecords?: MedicalRecord[];
  currentView?: 'launch' | 'login' | 'admin' | 'vet' | 'keeper' | 'guest' | Role;
  onClose: () => void;
  onOpenLogin?: () => void;
  onScanAnother?: () => void;
  onSelectAnimal?: (animal: Animal) => void;
  onQuickLogAction?: (actionType: 'feed' | 'clean' | 'check', enclosure: Enclosure, notes?: string) => void;
  onCompleteTask?: (taskId: string) => void;
  isDarkMode?: boolean;
}

export default function EnclosureInspectionModal({
  enclosure,
  animals,
  tasks = [],
  medicalRecords = [],
  currentView = 'launch',
  onClose,
  onOpenLogin,
  onScanAnother,
  onSelectAnimal,
  onQuickLogAction,
  onCompleteTask,
  isDarkMode = true
}: EnclosureInspectionModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'medical' | 'admin'>('overview');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [loggedActions, setLoggedActions] = useState<{ type: string; time: string }[]>([]);

  const isStaffLoggedIn = currentView === 'admin' || currentView === 'vet' || currentView === 'keeper';

  // Find all reptiles currently housed inside this enclosure
  const assignedAnimals = animals.filter(
    a => a.enclosureId === enclosure.id || 
         a.enclosureId === enclosure.name || 
         a.enclosureId?.toLowerCase() === enclosure.id.toLowerCase()
  );

  const primaryAnimal = assignedAnimals[0];

  // Tasks associated with this enclosure or its resident animals
  const relatedTasks = tasks.filter(
    t => t.enclosureId === enclosure.id || 
         assignedAnimals.some(a => a.id === t.animalId)
  );

  // Medical records associated with resident animals
  const relatedMedical = medicalRecords.filter(
    m => assignedAnimals.some(a => a.id === m.animalId)
  );

  const capacityNum = parseInt(enclosure.capacity || '1', 10) || 1;

  const handleAction = (type: 'feed' | 'clean' | 'check', label: string) => {
    if (onQuickLogAction) {
      onQuickLogAction(type, enclosure);
    }
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLoggedActions(prev => [{ type: label, time: timeStr }, ...prev]);
    setActionSuccessMsg(`${label} logged successfully at ${timeStr}`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col transition-all ${
          isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header Banner */}
        <div className="px-5 py-4 border-b border-emerald-900/40 flex items-center justify-between bg-emerald-950/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-black uppercase tracking-wider text-emerald-300 bg-emerald-900/90 px-2 py-0.5 rounded-md border border-emerald-700/60">
                  {enclosure.id}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/60">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Enclosure QR Verified</span>
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black leading-tight text-slate-900 dark:text-white mt-1">
                {enclosure.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onScanAnother && (
              <button
                onClick={onScanAnother}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl transition-all cursor-pointer"
                title="Scan next enclosure"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Scan Another</span>
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Success Notification Toast */}
        {actionSuccessMsg && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 flex items-center justify-between animate-fade-in shrink-0 shadow-md">
            <span className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{actionSuccessMsg}</span>
            </span>
            <button onClick={() => setActionSuccessMsg(null)} className="cursor-pointer text-emerald-200 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Tabs (Overview, Tasks for Keeper, Medical for Vet, Admin Info) */}
        <div className="px-5 pt-3 pb-0 border-b border-emerald-950/40 bg-[#030d07] shrink-0 flex items-center space-x-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'overview'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PawPrint className="w-4 h-4" />
            <span>Animal & Unit Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'tasks'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Keeper Tasks</span>
            {isStaffLoggedIn ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-900/80 text-emerald-300 font-mono">
                {relatedTasks.length}
              </span>
            ) : (
              <Lock className="w-3 h-3 text-amber-400/80" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('medical')}
            className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'medical'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Medical & Vet Care</span>
            {isStaffLoggedIn ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-900/80 text-emerald-300 font-mono">
                {relatedMedical.length}
              </span>
            ) : (
              <Lock className="w-3 h-3 text-amber-400/80" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'admin'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin Oversight</span>
            {!isStaffLoggedIn && <Lock className="w-3 h-3 text-amber-400/80" />}
          </button>
        </div>

        {/* Main Content Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 flex-1">

          {/* ======================================================== */}
          {/* TAB 1: ANIMAL & ENCLOSURE OVERVIEW (PUBLIC / ALL USERS) */}
          {/* ======================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              
              {/* Enclosure Hardware & Microclimate */}
              <div className={`p-4 rounded-2xl border ${
                isDarkMode ? 'bg-[#071F11]/80 border-emerald-900/50' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                    <Box className="w-4 h-4 text-emerald-400" />
                    <span>Microclimate & Terrarium Telemetry</span>
                  </span>
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    enclosure.condition === 'Good'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}>
                    {enclosure.condition || 'Good Condition'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-black/30 border border-emerald-900/40">
                    <span className="text-slate-400 block font-semibold text-[11px]">Facility</span>
                    <strong className="text-white text-xs truncate block mt-0.5">{enclosure.facility}</strong>
                  </div>

                  <div className="p-3 rounded-xl bg-black/30 border border-emerald-900/40">
                    <span className="text-slate-400 block font-semibold text-[11px]">Housing Type</span>
                    <strong className="text-white text-xs truncate block mt-0.5">{enclosure.type}</strong>
                  </div>

                  <div className="p-3 rounded-xl bg-black/30 border border-emerald-900/40">
                    <span className="text-slate-400 block font-semibold text-[11px] flex items-center space-x-1">
                      <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Target Temp</span>
                    </span>
                    <strong className="text-amber-300 text-xs block mt-0.5">{enclosure.temperature || '31°C'}</strong>
                  </div>

                  <div className="p-3 rounded-xl bg-black/30 border border-emerald-900/40">
                    <span className="text-slate-400 block font-semibold text-[11px] flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Occupancy</span>
                    </span>
                    <strong className="text-emerald-300 text-xs block mt-0.5">{assignedAnimals.length} / {capacityNum} Animals</strong>
                  </div>
                </div>
              </div>

              {/* Resident Animals Showcase Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                    <PawPrint className="w-4 h-4 text-emerald-400" />
                    <span>Resident Animals ({assignedAnimals.length})</span>
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Species overview & status</span>
                </div>

                {assignedAnimals.length === 0 ? (
                  <div className={`p-8 text-center rounded-2xl border ${
                    isDarkMode ? 'bg-[#071F11]/40 border-emerald-900/30 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <PawPrint className="w-10 h-10 mx-auto text-emerald-600/60 mb-2" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Animals Currently Housed</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      This enclosure is sterilized, monitored, and available for reptile assignment.
                    </p>
                  </div>
                ) : (
                  assignedAnimals.map((animal) => (
                    <div
                      key={animal.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-md ${
                        isDarkMode ? 'bg-[#071F11] border-emerald-900/60 hover:border-emerald-700/60' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {/* Animal Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start space-x-3.5">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden border border-emerald-700/60 shrink-0 bg-slate-900 shadow-md">
                            {(animal.image || animal.imageUrl || animal.photoUrl) ? (
                              <img 
                                src={animal.image || animal.imageUrl || animal.photoUrl} 
                                alt={animal.name || animal.species} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-emerald-400 font-black text-base bg-emerald-950">
                                {animal.species ? animal.species.slice(0, 2).toUpperCase() : 'AN'}
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/90 px-2 py-0.5 rounded-md border border-emerald-800/60">
                                {animal.id}
                              </span>
                              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                animal.sex === 'Male'
                                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                                  : 'bg-pink-500/20 text-pink-400 border border-pink-500/40'
                              }`}>
                                {animal.sex === 'Male' ? '♂ Male' : '♀ Female'}
                              </span>
                              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                animal.healthStatus === 'Healthy'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              }`}>
                                {animal.healthStatus || 'Healthy'}
                              </span>
                            </div>

                            <h4 className="text-base font-black text-slate-900 dark:text-white mt-1.5">
                              {animal.name ? `${animal.name} (${animal.species})` : animal.species}
                            </h4>

                            <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-2.5">
                              <span>Morph: <strong className="text-emerald-300">{animal.morph || 'Normal / Wild'}</strong></span>
                              {animal.dob && <span>• DOB: <strong className="text-slate-300">{animal.dob}</strong></span>}
                              <span>• Stage: <strong className="text-slate-300">{(animal as any).stage || (animal as any).ageCategory || 'Adult'}</strong></span>
                            </div>
                          </div>
                        </div>

                        {onSelectAnimal && isStaffLoggedIn && (
                          <button
                            onClick={() => {
                              onClose();
                              onSelectAnimal(animal);
                            }}
                            className="self-end sm:self-center px-4 py-2.5 bg-[#113C24] hover:bg-[#1B5234] text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 shadow-sm active:scale-95"
                          >
                            <span>Full Dossier</span>
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Vital Specs Grid */}
                      <div className="mt-3.5 pt-3.5 border-t border-emerald-900/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-black/30 border border-emerald-900/30">
                          <span className="text-slate-400 block font-semibold text-[11px]">Weight</span>
                          <strong className="text-white text-xs mt-0.5 block">{animal.weight ? `${animal.weight} g` : 'Not recorded'}</strong>
                        </div>

                        <div className="p-2.5 rounded-xl bg-black/30 border border-emerald-900/30">
                          <span className="text-slate-400 block font-semibold text-[11px]">Length</span>
                          <strong className="text-white text-xs mt-0.5 block">{animal.length ? `${animal.length} cm` : 'Not recorded'}</strong>
                        </div>

                        <div className="p-2.5 rounded-xl bg-black/30 border border-emerald-900/30">
                          <span className="text-slate-400 block font-semibold text-[11px]">Diet Class</span>
                          <strong className="text-emerald-300 text-xs mt-0.5 block truncate">Carnivorous / Insectivore</strong>
                        </div>

                        <div className="p-2.5 rounded-xl bg-black/30 border border-emerald-900/30">
                          <span className="text-slate-400 block font-semibold text-[11px]">Breeding Status</span>
                          <strong className="text-amber-300 text-xs mt-0.5 block truncate">{animal.breedingStatus || 'Resting'}</strong>
                        </div>
                      </div>

                      {animal.notes && (
                        <div className="mt-2.5 text-xs text-slate-300 bg-black/40 p-2.5 rounded-xl border border-emerald-900/40 flex items-start space-x-2">
                          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-emerald-300">Husbandry Observation: </strong>
                            <span>{animal.notes}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* PUBLIC VIEW: STAFF LOGIN PROMPT CALLOUT */}
              {!isStaffLoggedIn && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#062414] to-[#041a0e] border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-white">
                        Authorized Staff Portal Access
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Are you a Keeper, Veterinarian, or Admin? Log in to view scheduled tasks, record clinical notes, or manage this unit.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenLogin) onOpenLogin();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all cursor-pointer shrink-0 shadow-lg flex items-center space-x-1.5 active:scale-95"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Staff Sign In</span>
                  </button>
                </div>
              )}

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: KEEPER HUSBANDRY & CARE CHECKLIST */}
          {/* ======================================================== */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {!isStaffLoggedIn ? (
                <div className="p-6 sm:p-8 rounded-2xl border border-emerald-900/60 bg-gradient-to-b from-[#072415] to-[#031109] text-center space-y-4 shadow-xl">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <Lock className="w-8 h-8" />
                  </div>

                  <div className="space-y-1.5 max-w-md mx-auto">
                    <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40">
                      <span>Keeper & Wildlife Staff Portal</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Daily Care Tasks & Husbandry Schedule
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Scheduled feedings, habitat sanitization, misting cycles, and physical 1-tap check-ins for <strong>{enclosure.name}</strong> are restricted to authorized wildlife staff.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        onClose();
                        if (onOpenLogin) onOpenLogin();
                      }}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-lg flex items-center justify-center space-x-2 active:scale-95"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Sign In as Keeper to View & Complete Tasks</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('overview')}
                      className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      Back to Animal Overview
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Quick 1-Tap Physical Field Actions */}
                  <div className={`p-4 rounded-2xl border ${
                    isDarkMode ? 'bg-[#071F11]/60 border-emerald-900/40' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>1-Tap Physical Field Check-in</span>
                      </span>
                      <span className="text-xs text-slate-400">Instant database record</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleAction('feed', 'Feeding Round')}
                        className="p-3 rounded-xl border border-amber-800/60 bg-amber-950/40 hover:bg-amber-900/50 text-amber-200 text-center transition-all cursor-pointer active:scale-95"
                      >
                        <Utensils className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                        <span className="text-xs font-bold block">Log Feeding</span>
                        <span className="text-[10px] opacity-75 block">Feeding Complete</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction('clean', 'Sanitization')}
                        className="p-3 rounded-xl border border-sky-800/60 bg-sky-950/40 hover:bg-sky-900/50 text-sky-200 text-center transition-all cursor-pointer active:scale-95"
                      >
                        <Droplets className="w-5 h-5 mx-auto mb-1 text-sky-400" />
                        <span className="text-xs font-bold block">Log Clean</span>
                        <span className="text-[10px] opacity-75 block">Substrate & Water</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction('check', 'Health Check')}
                        className="p-3 rounded-xl border border-emerald-700/60 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-200 text-center transition-all cursor-pointer active:scale-95"
                      >
                        <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                        <span className="text-xs font-bold block">Check OK</span>
                        <span className="text-[10px] opacity-75 block">All Healthy</span>
                      </button>
                    </div>

                    {loggedActions.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-emerald-900/40 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Just Logged:</span>
                        </span>
                        {loggedActions.map((log, idx) => (
                          <span key={idx} className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                            ✓ {log.type} ({log.time})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Scheduled Tasks for this Unit */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                      <ClipboardList className="w-4 h-4 text-emerald-400" />
                      <span>Assigned Care Duties for this Enclosure ({relatedTasks.length})</span>
                    </h4>

                    {relatedTasks.length === 0 ? (
                      <div className="p-6 text-center rounded-2xl border border-emerald-900/30 bg-[#071F11]/40 text-slate-400 text-xs">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1.5" />
                        <p className="font-bold text-white">All Scheduled Care Duties Up to Date</p>
                        <p className="text-slate-400 mt-0.5">No pending husbandry tasks for this enclosure.</p>
                      </div>
                    ) : (
                      relatedTasks.map(task => (
                        <div 
                          key={task.id}
                          className="p-3.5 rounded-xl border border-emerald-900/50 bg-[#071F11] flex items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                task.type === 'Feeding' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                              }`}>
                                {task.type}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">{task.time || 'Routine'}</span>
                            </div>
                            <h5 className="text-xs font-bold text-white">{task.title}</h5>
                            {task.details && <p className="text-[11px] text-slate-400">{task.details}</p>}
                          </div>

                          {task.status === 'Completed' ? (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 shrink-0">
                              <Check className="w-3.5 h-3.5" />
                              <span>DONE</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => onCompleteTask && onCompleteTask(task.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shrink-0 active:scale-95 shadow-xs"
                            >
                              Mark Done
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: VETERINARIAN & MEDICAL RECORDS */}
          {/* ======================================================== */}
          {activeTab === 'medical' && (
            <div className="space-y-4">
              {!isStaffLoggedIn ? (
                <div className="p-6 sm:p-8 rounded-2xl border border-emerald-900/60 bg-gradient-to-b from-[#072415] to-[#031109] text-center space-y-4 shadow-xl">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                    <Lock className="w-8 h-8" />
                  </div>

                  <div className="space-y-1.5 max-w-md mx-auto">
                    <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/40">
                      <span>Attending Veterinarian Portal</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Clinical Records & Medical Prescriptions
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Detailed diagnostic evaluations, medication schedules, and clinical examinations for animals in <strong>{enclosure.name}</strong> require veterinary credentials.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        onClose();
                        if (onOpenLogin) onOpenLogin();
                      }}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-lg flex items-center justify-center space-x-2 active:scale-95"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Sign In as Veterinarian to Access Clinical Care</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('overview')}
                      className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      Back to Animal Overview
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                      <Stethoscope className="w-4 h-4 text-emerald-400" />
                      <span>Clinical Records & Medical Regimens</span>
                    </span>
                    <span className="text-xs text-slate-400">{relatedMedical.length} Records</span>
                  </div>

                  {relatedMedical.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-emerald-900/30 bg-[#071F11]/40 text-slate-400 text-xs">
                      <Stethoscope className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                      <p className="font-bold text-white">No Active Clinical Treatments</p>
                      <p className="text-slate-400 mt-0.5">All animals in this unit are currently classified as healthy with no active prescriptions.</p>
                    </div>
                  ) : (
                    relatedMedical.map(record => (
                      <div 
                        key={record.id}
                        className="p-4 rounded-xl border border-emerald-900/60 bg-[#071F11] space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {record.recordType || 'Clinical Checkup'}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{record.recordDate}</span>
                        </div>
                        <h4 className="text-xs font-extrabold text-white">{record.purpose || 'Health Examination'}</h4>
                        {record.treatment && (
                          <p className="text-xs text-emerald-300 bg-emerald-950/60 p-2 rounded-lg border border-emerald-800/40">
                            <strong>Prescribed Regimen: </strong> {record.treatment}
                          </p>
                        )}
                        {record.clinicalObservation && (
                          <p className="text-[11px] text-slate-300">
                            <strong>Observation: </strong> {record.clinicalObservation}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: ADMIN & STATUTORY COMPLIANCE INFO */}
          {/* ======================================================== */}
          {activeTab === 'admin' && (
            <div className="space-y-4">
              {!isStaffLoggedIn ? (
                <div className="p-6 sm:p-8 rounded-2xl border border-emerald-900/60 bg-gradient-to-b from-[#072415] to-[#031109] text-center space-y-4 shadow-xl">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Lock className="w-8 h-8" />
                  </div>

                  <div className="space-y-1.5 max-w-md mx-auto">
                    <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                      <span>Facility Administration Portal</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Enclosure Inventory & Statutory Oversight
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Enclosure asset lifecycle, microclimate hardware specs, QR pass generation, and staff allocation controls are restricted to system administrators.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        onClose();
                        if (onOpenLogin) onOpenLogin();
                      }}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-lg flex items-center justify-center space-x-2 active:scale-95"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Sign In as Admin</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('overview')}
                      className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      Back to Animal Overview
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`p-4 rounded-2xl border border-emerald-900/60 bg-[#071F11] space-y-3 text-xs`}>
                  <h4 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center space-x-1.5">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Asset & Statutory Compliance Status</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-black/30 border border-emerald-900/40">
                      <span className="text-slate-400 block font-semibold text-[11px]">Enclosure Serial</span>
                      <strong className="text-white text-xs font-mono mt-0.5 block">{enclosure.id}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-black/30 border border-emerald-900/40">
                      <span className="text-slate-400 block font-semibold text-[11px]">Asset Status</span>
                      <strong className="text-emerald-400 text-xs mt-0.5 block">Active Inventory Asset</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-black/30 border border-emerald-900/40">
                      <span className="text-slate-400 block font-semibold text-[11px]">Facility Location</span>
                      <strong className="text-white text-xs mt-0.5 block">{enclosure.facility}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-black/30 border border-emerald-900/40">
                      <span className="text-slate-400 block font-semibold text-[11px]">Max Capacity</span>
                      <strong className="text-white text-xs mt-0.5 block">{enclosure.capacity} Reptiles</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Bar */}
        <div className="px-5 py-3.5 border-t border-emerald-900/40 flex items-center justify-between bg-emerald-950/40 shrink-0">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Feronia Wildlife Asset Passport</span>
          </div>

          <div className="flex items-center space-x-2">
            {onScanAnother && (
              <button
                onClick={onScanAnother}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Scan Another</span>
              </button>
            )}

            <button
              onClick={onClose}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              }`}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
