import React, { useState } from 'react';
import {
  Stethoscope, Activity, Calendar, AlertTriangle, CheckCircle2, Clock,
  ArrowRight, ShieldCheck, Heart, Sparkles, FileText, ChevronRight, User,
  Eye, AlertCircle, Camera
} from 'lucide-react';
import { Animal, Task, MedicalRecord, Appointment, StaffMember, getAppointmentRequesterInfo, resolveVeterinarianName } from '../../types';
import { sortTasksByTime, sortAppointmentsByTime } from '../../utils/timeUtils';
import UrgentAttentionModal from './UrgentAttentionModal';
import ActiveCareListModal from './ActiveCareListModal';
import SystemDateBadge from '../common/SystemDateBadge';

interface VetDashboardViewProps {
  animals: Animal[];
  medicalRecords: MedicalRecord[];
  tasks: Task[];
  appointments: Appointment[];
  staffMembers?: StaffMember[];
  systemDate: string;
  isDarkMode: boolean;
  onNavigate: (tab: 'dashboard' | 'animals' | 'medical-records' | 'appointments' | 'reports' | 'settings', filter?: string) => void;
  onSelectAnimalForConsult: (animalId: string, appointmentId?: string) => void;
  onScheduleForAnimal?: (animalId: string) => void;
  onCompleteAppointment?: (id: string) => void;
  onUpdateSystemDate?: (newDate: string) => void;
}

export default function VetDashboardView({
  animals,
  medicalRecords,
  tasks,
  appointments,
  staffMembers = [],
  systemDate,
  isDarkMode,
  onNavigate,
  onSelectAnimalForConsult,
  onScheduleForAnimal,
  onCompleteAppointment,
  onUpdateSystemDate
}: VetDashboardViewProps) {
  const [isUrgentAttentionModalOpen, setIsUrgentAttentionModalOpen] = useState(false);
  const [isActiveCareModalOpen, setIsActiveCareModalOpen] = useState(false);

  const activeAnimals = animals.filter(a => !a.isArchived);
  const totalPatients = activeAnimals.length;
  const underCare = activeAnimals.filter(a => a.healthStatus && a.healthStatus !== 'Healthy').length;
  const criticalCount = activeAnimals.filter(a => a.healthStatus === 'Under Treatment' || a.healthStatus === 'Injured' || a.healthStatus === 'Sick').length;

  // Helper to check if appointment was requested by Vet (requires Admin authorization before appearing as actionable on Vet side)
  const isAptRequestedByVet = (a: Appointment) => {
    return a.requestedByRole === 'vet' || 
           (a.requestedBy || '').toLowerCase().includes('vet') || 
           (a.requestedBy || '').toLowerCase().includes('dr. vicente') || 
           (a.requestedBy || '').toLowerCase().includes('follow-up') || 
           (a.id && (a.id.startsWith('APT-VET') || a.id.startsWith('APP-')));
  };

  const pendingAppointments = appointments.filter(a => {
    if (a.animalId && !activeAnimals.some(an => an.id === a.animalId)) return false;
    if (isAptRequestedByVet(a) && (a.status === 'Pending Approval' || a.status === 'Pending')) {
      return false;
    }
    return a.status === 'Pending' || a.status === 'Ongoing' || a.status === 'Approved';
  });

  const pendingApprovalsCount = appointments.filter(a => {
    if (a.animalId && !activeAnimals.some(an => an.id === a.animalId)) return false;
    // Only count requests sent to Vet by Admin/Keeper needing Vet confirmation
    if (isAptRequestedByVet(a)) return false;
    return a.status === 'Pending Approval' || a.status === 'Pending';
  }).length;

  const todayAppointments = sortAppointmentsByTime(
    appointments.filter(a => {
      if (a.status === 'Completed' || a.status === 'Cancelled' || a.status === 'Declined') return false;
      if (a.animalId && !activeAnimals.some(an => an.id === a.animalId)) return false;
      // Follow-up requested by Vet must be authorized by Admin first before appearing in today's clinical queue
      if (isAptRequestedByVet(a) && (a.status === 'Pending Approval' || a.status === 'Pending')) {
        return false;
      }
      return (a.date === systemDate || a.status === 'Pending' || a.status === 'Approved' || a.status === 'Ongoing');
    })
  );
  const pendingHealthTasks = sortTasksByTime(
    tasks.filter(t => {
      if (t.type !== 'Health Check' || t.status === 'Completed') return false;
      if (t.animalId && !activeAnimals.some(an => an.id === t.animalId)) return false;
      const hasActiveApt = appointments.some(a => 
        a.animalId === t.animalId && 
        a.status !== 'Completed' && 
        a.status !== 'Cancelled' && 
        a.status !== 'Declined'
      );
      return hasActiveApt;
    })
  );

  // Count animals needing immediate attention (urgent appointments + critical/injured/sick animals)
  const urgentApts = appointments.filter(a => (a.priority === 'Emergency' || a.priority === 'High') && a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'Declined');
  const urgentAnimalsCount = Math.max(criticalCount, urgentApts.length);

  return (
    <div className="space-y-6">
      {/* Urgent Attention Modal */}
      <UrgentAttentionModal
        isOpen={isUrgentAttentionModalOpen}
        onClose={() => setIsUrgentAttentionModalOpen(false)}
        animals={animals}
        appointments={appointments}
        medicalRecords={medicalRecords}
        isDarkMode={isDarkMode}
        systemDate={systemDate}
        onViewCase={(animalId) => {
          setIsUrgentAttentionModalOpen(false);
          onSelectAnimalForConsult(animalId);
        }}
      />

      {/* Active Care List Modal */}
      <ActiveCareListModal
        isOpen={isActiveCareModalOpen}
        onClose={() => setIsActiveCareModalOpen(false)}
        animals={animals}
        medicalRecords={medicalRecords}
        appointments={appointments}
        isDarkMode={isDarkMode}
        systemDate={systemDate}
        onSelectAnimalForConsult={(animalId) => {
          setIsActiveCareModalOpen(false);
          onSelectAnimalForConsult(animalId);
        }}
        onScheduleForAnimal={(animalId) => {
          setIsActiveCareModalOpen(false);
          if (onScheduleForAnimal) {
            onScheduleForAnimal(animalId);
          } else {
            onNavigate('appointments');
          }
        }}
        onViewInAnimalsTab={() => {
          setIsActiveCareModalOpen(false);
          onNavigate('animals', 'Active Care');
        }}
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-black flex items-center space-x-2.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Stethoscope className="w-4 h-4" />
            </div>
            <span>Clinical Operations Dashboard</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time patient diagnostics, ongoing clinical treatments, and scheduled examinations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SystemDateBadge
            systemDate={systemDate}
            onUpdateSystemDate={onUpdateSystemDate}
            isDarkMode={isDarkMode}
          />
          <button
            onClick={() => setIsUrgentAttentionModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-rose-900/30 cursor-pointer animate-pulse"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Immediate Attention ({urgentAnimalsCount})</span>
          </button>
          <button
            onClick={() => onNavigate('medical-records')}
            className="px-4 py-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-xs flex items-center space-x-2 transition-all shadow-md cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Medical Records</span>
          </button>
          <button
            onClick={() => onNavigate('appointments')}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              isDarkMode 
                ? 'bg-[#061A10] hover:bg-[#0A2618] border-emerald-900/60 text-emerald-300' 
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            <span>Schedule Exam</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Patients: Re-directed to animals tab */}
        <div 
          onClick={() => onNavigate('animals', 'All')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
            isDarkMode 
              ? 'bg-[#071F11] border-emerald-950/70 hover:border-emerald-700/60 text-slate-200 hover:bg-[#092816]' 
              : 'bg-white border-slate-100 hover:border-emerald-300 text-slate-800 shadow-2xs hover:shadow-xs'
          }`}
          title="Click to view all animals in directory"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 group-hover:text-emerald-400 transition-colors">Total Patients</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-400">{totalPatients}</span>
            <span className="text-[10px] font-bold text-emerald-400/80 group-hover:underline flex items-center space-x-0.5">
              <span>View Directory</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Active animals in facility</p>
        </div>

        {/* 2. Active Care List: Shows animals requiring observation & therapy */}
        <div 
          onClick={() => setIsActiveCareModalOpen(true)}
          className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
            isDarkMode 
              ? 'bg-[#071F11] border-amber-950/70 hover:border-amber-700/60 text-slate-200 hover:bg-[#0a2717]' 
              : 'bg-white border-amber-100 hover:border-amber-300 text-slate-800 shadow-2xs hover:shadow-xs'
          }`}
          title="Click to view animals requiring observation & therapy"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 group-hover:text-amber-300 transition-colors">Active Care List</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-400">{underCare}</span>
            <span className="text-[10px] font-bold text-amber-400/80 group-hover:underline flex items-center space-x-0.5">
              <span>View Care List</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Requiring observation & therapy</p>
        </div>

        {/* 3. Immediate Attention Modal Trigger */}
        <div 
          onClick={() => setIsUrgentAttentionModalOpen(true)}
          className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
            isDarkMode 
              ? 'bg-[#071F11] border-rose-950/70 hover:border-rose-700/60 text-slate-200 hover:bg-[#0c1f17]' 
              : 'bg-white border-rose-100 hover:border-rose-300 text-slate-800 shadow-2xs hover:shadow-xs'
          }`}
          title="Click to view urgent clinical cases"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 group-hover:text-rose-300 transition-colors">Immediate Attention</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-400">{criticalCount || urgentApts.length}</span>
            <span className="text-[10px] font-bold text-rose-400/80 group-hover:underline flex items-center space-x-0.5">
              <span>View Cases</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Urgent clinical review required</p>
        </div>

        {/* 4. Scheduled Exams: Shows appointments and schedules */}
        <div 
          onClick={() => onNavigate('appointments')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
            isDarkMode 
              ? 'bg-[#071F11] border-teal-950/70 hover:border-teal-700/60 text-slate-200 hover:bg-[#092816]' 
              : 'bg-white border-teal-100 hover:border-teal-300 text-slate-800 shadow-2xs hover:shadow-xs'
          }`}
          title="Click to view appointments and schedules"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-teal-400 group-hover:text-teal-300 transition-colors">Scheduled Exams</span>
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-teal-400">{pendingAppointments.length}</span>
            <span className="text-[10px] font-bold text-teal-400/80 group-hover:underline flex items-center space-x-0.5">
              <span>View Schedules</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Pending & ongoing checkups</p>
        </div>
      </div>

      {/* Main Two-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Scheduled Appointments & Health Checks (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">

          {/* 🚨 Immediate Attention Emergency Callout Panel (When urgent cases exist) */}
          {urgentAnimalsCount > 0 && (
            <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              isDarkMode 
                ? 'bg-rose-950/20 border-rose-900/60 shadow-lg shadow-rose-950/20' 
                : 'bg-rose-50/70 border-rose-200/90 shadow-2xs'
            }`}>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-rose-900/30">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                  </div>
                  <div>
                    <h3 className={`font-black text-xs uppercase tracking-wider ${isDarkMode ? 'text-rose-200' : 'text-rose-900'}`}>
                      Animals Requiring Immediate Attention
                    </h3>
                    <p className={`text-[11px] ${isDarkMode ? 'text-rose-300/80' : 'text-rose-700'}`}>
                      {urgentAnimalsCount} patient{urgentAnimalsCount === 1 ? '' : 's'} flagged for high priority or emergency intervention
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsUrgentAttentionModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Review All Cases</span>
                </button>
              </div>

              {/* Quick Row of Top Urgent Animals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeAnimals
                  .filter(a => a.healthStatus === 'Under Treatment' || a.healthStatus === 'Injured' || a.healthStatus === 'Sick')
                  .slice(0, 2)
                  .map(animal => (
                    <div
                      key={animal.id}
                      onClick={() => onSelectAnimalForConsult(animal.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isDarkMode
                          ? 'bg-[#04110A] border-rose-950/60 hover:border-rose-700/60'
                          : 'bg-white border-rose-200/80 hover:border-rose-400 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-rose-900/30 flex items-center justify-center">
                          {animal.image ? (
                            <img src={animal.image} alt={animal.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/80">
                              <Camera className="w-3.5 h-3.5 text-emerald-500/80" />
                              <span className="text-[6px] font-bold uppercase tracking-wider text-slate-400">No Photo</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-black text-xs truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {animal.name || animal.id}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{animal.species}</p>
                          <p className="text-[10px] text-rose-400 font-bold mt-0.5 truncate">{animal.healthStatus}</p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAnimalForConsult(animal.id);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-[11px] shrink-0 cursor-pointer shadow-2xs"
                      >
                        Examine
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {/* Today's Appointments */}
          <div className={`p-5 rounded-2xl border transition-colors ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950/60' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className={`flex items-center justify-between pb-3 mb-3 border-b ${
              isDarkMode ? 'border-emerald-950/60' : 'border-slate-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <h3 className={`font-extrabold text-xs uppercase tracking-wider ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Upcoming Clinical Appointments ({todayAppointments.length})
                </h3>
              </div>
              <button
                onClick={() => onNavigate('appointments')}
                className={`text-[11px] font-bold flex items-center space-x-1 cursor-pointer hover:underline ${
                  isDarkMode ? 'text-emerald-400' : 'text-emerald-700'
                }`}
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {pendingApprovalsCount > 0 && (
              <div className={`mb-3 p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                isDarkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
                <div className="flex items-center space-x-2">
                  <Clock className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                  <span className="text-[11px]">
                    <strong>{pendingApprovalsCount} request{pendingApprovalsCount > 1 ? 's' : ''}</strong> currently awaiting Administrator review & authorization.
                  </span>
                </div>
                <button
                  onClick={() => onNavigate('appointments')}
                  className={`text-[10px] font-bold hover:underline shrink-0 ${
                    isDarkMode ? 'text-amber-400' : 'text-amber-800'
                  }`}
                >
                  View Requests
                </button>
              </div>
            )}

            {todayAppointments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2 opacity-80" />
                No pending clinical appointments scheduled for today.
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayAppointments.slice(0, 4).map(apt => {
                  const patient = activeAnimals.find(a => a.id === apt.animalId);
                  const isEmergency = apt.priority === 'Emergency';
                  const isHigh = apt.priority === 'High';

                  return (
                    <div
                      key={apt.id}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        isEmergency 
                          ? (isDarkMode ? 'bg-rose-950/20 border-rose-900/50' : 'bg-rose-50/70 border-rose-200')
                          : (isDarkMode ? 'bg-[#04110A] border-emerald-950/40 hover:border-emerald-800/60' : 'bg-slate-50 border-slate-200 hover:border-slate-300')
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-slate-900 border border-emerald-950/80 shrink-0 shadow-2xs">
                          {patient?.image ? (
                            <img
                              src={patient.image}
                              alt={patient.name || apt.animalId}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-emerald-950/60 text-emerald-400 font-bold text-xs">
                              {apt.animalId.slice(0, 3)}
                            </div>
                          )}
                          <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-tl-md flex items-center justify-center text-[8px] ${
                            isEmergency
                              ? 'bg-rose-600 text-white'
                              : isHigh
                                ? 'bg-amber-600 text-white'
                                : 'bg-emerald-700 text-white'
                          }`}>
                            {isEmergency ? <AlertTriangle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className={`font-bold text-xs truncate ${
                              isDarkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                              {patient ? `${patient.name || patient.id} (${patient.species})` : apt.animalId}
                            </span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              isEmergency ? 'bg-rose-900/80 text-rose-200' : isHigh ? 'bg-amber-900/80 text-amber-200' : 'bg-emerald-900/80 text-emerald-200'
                            }`}>
                              {apt.priority}
                            </span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              apt.status === 'Pending Approval'
                                ? (isDarkMode ? 'bg-amber-900/80 text-amber-200' : 'bg-amber-100 text-amber-900 border border-amber-300')
                                : apt.status === 'Approved'
                                  ? (isDarkMode ? 'bg-emerald-900/80 text-emerald-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-300')
                                  : (isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-800')
                            }`}>
                              {apt.status === 'Pending Approval' ? 'Pending Admin' : apt.status}
                            </span>
                          </div>
                          <p className={`text-[11px] mt-0.5 truncate font-medium ${
                            isDarkMode ? 'text-slate-300' : 'text-slate-700'
                          }`}>{apt.purpose}</p>
                          <div className="flex items-center space-x-2 text-[10px] mt-1 text-slate-400 flex-wrap gap-y-1">
                            <span>📅 {apt.date} at {apt.time}</span>
                            <span>•</span>
                            <span>Req: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{getAppointmentRequesterInfo(apt, staffMembers).name}</strong></span>
                            <span>•</span>
                            <span>Vet: <strong className="text-emerald-300">{resolveVeterinarianName(apt.veterinarian, staffMembers)}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {apt.status !== 'Completed' && apt.status !== 'Cancelled' && apt.status !== 'Declined' && (
                          <button
                            onClick={() => onSelectAnimalForConsult(apt.animalId, apt.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <Stethoscope className="w-3.5 h-3.5" />
                            <span>Consult</span>
                          </button>
                        )}
                        {/* Complete button removed to enforce clinical consult flow */}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Attending Duties & Health Tasks */}
          <div className={`p-5 rounded-2xl border transition-colors ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950/60' : 'bg-white border-slate-100 shadow-2xs'
          }`}>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-950/20 dark:border-emerald-950/60">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">
                  Attending Clinical Tasks ({pendingHealthTasks.length})
                </h3>
              </div>
            </div>

            {pendingHealthTasks.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                🟢 All veterinary health observation tasks are cleared.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {pendingHealthTasks.slice(0, 4).map(task => {
                  const patient = activeAnimals.find(a => a.id === task.animalId);
                  return (
                    <div
                      key={task.id}
                      className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 text-xs transition-colors ${
                        isDarkMode ? 'bg-[#04110A] border-emerald-950/30 text-slate-200' : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-emerald-300 truncate">{task.title}</span>
                          <span className="px-1.5 py-0.5 bg-amber-950/40 text-amber-400 border border-amber-800/40 rounded text-[9px] font-bold">
                            PENDING
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{task.details}</p>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-emerald-950/20 text-[10px] text-slate-400">
                        <span>Patient: {patient?.name || task.animalId}</span>
                        <span>{task.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Patients under observation + Quick Medical Overview */}
        <div className="space-y-6">
          
          {/* Active Care Watchlist */}
          <div className={`p-5 rounded-2xl border transition-colors ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950/60' : 'bg-white border-slate-100 shadow-2xs'
          }`}>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-950/20 dark:border-emerald-950/60">
              <h3 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center space-x-2">
                <Heart className="w-4 h-4 text-rose-400" />
                <span>Patient Care Watchlist</span>
              </h3>
              <button
                onClick={() => setIsActiveCareModalOpen(true)}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer flex items-center space-x-1"
              >
                <span>View Care List ({underCare})</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {activeAnimals.filter(a => a.healthStatus !== 'Healthy').length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                ✨ All animal patients are currently in healthy condition!
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeAnimals
                  .filter(a => a.healthStatus !== 'Healthy')
                  .slice(0, 5)
                  .map(patient => (
                    <div
                      key={patient.id}
                      onClick={() => onSelectAnimalForConsult(patient.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isDarkMode 
                          ? 'bg-[#04110A] border-emerald-950/40 hover:border-emerald-700/60 hover:bg-[#071F11]' 
                          : 'bg-slate-50 border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/40'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/40 overflow-hidden shrink-0 flex items-center justify-center">
                          {patient?.image ? (
                            <img src={patient.image} alt={patient.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">No Photo</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{patient.name || patient.id}</p>
                          <p className="text-[10px] text-slate-400 truncate">{patient.species}</p>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                        patient.healthStatus === 'Under Treatment'
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                          : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                      }`}>
                        {patient.healthStatus}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Medical Records History Overview Card */}
          <div className={`p-5 rounded-2xl border transition-colors ${
            isDarkMode 
              ? 'bg-gradient-to-br from-[#072415] to-[#04160D] border-emerald-800/40' 
              : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
          }`}>
            <div className="flex items-center space-x-2 text-emerald-400 mb-2">
              <FileText className="w-4 h-4" />
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-white dark:text-white">
                Medical Records & Clinical History
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Access logged medical records, treatment histories, prescriptions, and clinical diagnostic files. Consultations require an active checkup request from Admin/Keeper or a scheduled follow-up.
            </p>
            <button
              onClick={() => onNavigate('medical-records')}
              className="mt-4 w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md cursor-pointer"
            >
              <span>View Medical Records History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
