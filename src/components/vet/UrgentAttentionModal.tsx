import React, { useState, useMemo } from 'react';
import {
  X, AlertTriangle, Eye, ChevronLeft, ChevronRight,
  PawPrint, Calendar as CalendarIcon, User, ShieldAlert, Camera
} from 'lucide-react';
import { Animal, Appointment, MedicalRecord } from '../../types';

export interface UrgentAttentionCase {
  id: string;
  animalId: string;
  name: string;
  species: string;
  scientificName?: string;
  enclosure: string;
  image?: string;
  priority: 'Emergency' | 'High' | 'Medium' | 'Normal';
  reason: string;
  reportedBy: string;
  dateReported: string;
  status: 'Pending Examination' | 'Under Observation' | 'Under Treatment' | 'Critical Review';
  assignedVet: string;
  rawAppointment?: Appointment;
}

interface UrgentAttentionModalProps {
  isOpen: boolean;
  onClose: () => void;
  animals: Animal[];
  appointments: Appointment[];
  medicalRecords?: MedicalRecord[];
  isDarkMode: boolean;
  systemDate: string;
  onViewCase: (animalId: string, appointment?: Appointment) => void;
}

export default function UrgentAttentionModal({
  isOpen,
  onClose,
  animals,
  appointments,
  isDarkMode,
  systemDate,
  onViewCase
}: UrgentAttentionModalProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  // Build the list of animals requiring immediate attention from appointments and critical health status
  const cases: UrgentAttentionCase[] = useMemo(() => {
    const caseList: UrgentAttentionCase[] = [];
    const processedAnimalIds = new Set<string>();

    // 1. Process high & emergency priority appointments
    const urgentAppointments = appointments.filter(
      apt => apt.status !== 'Completed' && apt.status !== 'Cancelled'
    );

    urgentAppointments.forEach(apt => {
      const animal = animals.find(a => a.id === apt.animalId);
      if (!animal) return;

      let priority: 'Emergency' | 'High' | 'Medium' | 'Normal' = 'Normal';
      if (apt.priority === 'Emergency') priority = 'Emergency';
      else if (apt.priority === 'High') priority = 'High';
      else if (animal.healthStatus === 'Under Treatment' || animal.healthStatus === 'Injured') priority = 'Medium';

      let statusDisplay: UrgentAttentionCase['status'] = 'Pending Examination';
      if (animal.healthStatus === 'Under Treatment') statusDisplay = 'Under Treatment';
      else if (animal.healthStatus === 'Sick' || animal.healthStatus === 'Injured') statusDisplay = 'Under Observation';
      else if (apt.status === 'Ongoing') statusDisplay = 'Under Observation';

      caseList.push({
        id: apt.id,
        animalId: animal.id,
        name: animal.name || animal.id,
        species: animal.species,
        scientificName: animal.scientificName,
        enclosure: animal.enclosureId ? (animal.enclosureId.startsWith('ENC') ? `Habitat ${animal.enclosureId}` : animal.enclosureId) : 'Main Enclosure',
        image: animal.image,
        priority,
        reason: apt.purpose || 'Urgent veterinary follow-up required.',
        reportedBy: apt.requestedBy || 'Keeper',
        dateReported: apt.date || systemDate,
        status: statusDisplay,
        assignedVet: apt.veterinarian || 'Dr. Veterinarian',
        rawAppointment: apt
      });

      processedAnimalIds.add(animal.id);
    });

    // 2. Also include non-healthy animals that don't have explicit appointments yet
    animals
      .filter(a => !a.isArchived && a.healthStatus && a.healthStatus !== 'Healthy' && !processedAnimalIds.has(a.id))
      .forEach(animal => {
        let priority: 'Emergency' | 'High' | 'Medium' = 'Medium';
        if (animal.healthStatus === 'Injured' || animal.healthStatus === 'Sick') priority = 'High';
        if (animal.healthStatus === 'Under Treatment') priority = 'Medium';

        let statusDisplay: UrgentAttentionCase['status'] = 'Under Observation';
        if (animal.healthStatus === 'Under Treatment') statusDisplay = 'Under Treatment';

        caseList.push({
          id: `CASE-${animal.id}`,
          animalId: animal.id,
          name: animal.name || animal.id,
          species: animal.species,
          scientificName: animal.scientificName,
          enclosure: animal.enclosureId ? (animal.enclosureId.startsWith('ENC') ? `Habitat ${animal.enclosureId}` : animal.enclosureId) : 'Unassigned',
          image: animal.image,
          priority,
          reason: animal.notes || `Reported condition: ${animal.healthStatus}. Requires clinical evaluation.`,
          reportedBy: 'Keeper',
          dateReported: systemDate,
          status: statusDisplay,
          assignedVet: 'Dr. Veterinarian'
        });
      });

    // Sort by priority (Emergency -> High -> Medium -> Normal)
    const priorityWeight = { Emergency: 4, High: 3, Medium: 2, Normal: 1 };
    return caseList.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
  }, [animals, appointments, systemDate]);

  const totalPages = Math.max(1, Math.ceil(cases.length / itemsPerPage));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const startIndex = (currentPageSafe - 1) * itemsPerPage;
  const currentCases = cases.slice(startIndex, startIndex + itemsPerPage);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className={`w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh] ${
        isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-100 text-slate-800'
      }`}>
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
          isDarkMode ? 'border-emerald-950/60 bg-[#04110A]' : 'border-slate-100 bg-white'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-black text-base sm:text-lg leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Animals Requiring Immediate Attention
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {cases.length} {cases.length === 1 ? 'patient requires' : 'patients require'} prompt veterinary review and medical clearance.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDarkMode ? 'border-emerald-950 text-slate-400 hover:text-white hover:bg-emerald-950/40' : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Case Cards */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {cases.length === 0 ? (
            <div className={`p-8 rounded-2xl border text-center ${
              isDarkMode ? 'bg-[#04110A] border-emerald-950/60' : 'bg-slate-50 border-slate-200'
            }`}>
              <ShieldAlert className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-xs">No urgent cases currently pending.</p>
              <p className="text-[11px] text-slate-400 mt-1">All animals in the facility are currently in stable health.</p>
            </div>
          ) : (
            currentCases.map((item) => {
              const isEmergency = item.priority === 'Emergency';
              const isHigh = item.priority === 'High';
              const isMedium = item.priority === 'Medium';

              // Left Accent Border Color
              const accentBorder = isEmergency
                ? 'border-l-4 border-l-rose-500'
                : isHigh
                  ? 'border-l-4 border-l-orange-500'
                  : isMedium
                    ? 'border-l-4 border-l-amber-400'
                    : 'border-l-4 border-l-emerald-500';

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${accentBorder} ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950/70 hover:border-emerald-800' : 'bg-white border-slate-200 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  {/* 1. Animal Photo + Name & Details */}
                  <div className="flex items-center space-x-3.5 min-w-[220px]">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-emerald-950 shrink-0 shadow-sm">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-1 text-center">
                          <Camera className="w-5 h-5 mb-0.5 text-emerald-500/80" />
                          <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400">No Photo</span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {item.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          isEmergency
                            ? 'bg-rose-100 dark:bg-rose-950/90 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            : isHigh
                              ? 'bg-orange-100 dark:bg-orange-950/90 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800'
                              : isMedium
                                ? 'bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                : 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        }`}>
                          {item.priority}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                        {item.species} {item.scientificName ? `(${item.scientificName})` : ''}
                      </p>

                      <p className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
                        <PawPrint className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>{item.enclosure}</span>
                      </p>
                    </div>
                  </div>

                  {/* 2. Reason for Immediate Attention */}
                  <div className="md:w-56 min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason</p>
                    <p className={`text-xs font-semibold mt-1 leading-snug line-clamp-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                      {item.reason}
                    </p>
                  </div>

                  {/* 3. Reported By & Date */}
                  <div className="min-w-[130px]">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reported By</p>
                    <p className={`text-xs font-bold mt-1 flex items-center space-x-1.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      <PawPrint className="w-3 h-3 text-slate-400" />
                      <span>{item.reportedBy}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono flex items-center space-x-1">
                      <CalendarIcon className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{item.dateReported}</span>
                    </p>
                  </div>

                  {/* 4. Status & Assigned Veterinarian */}
                  <div className="min-w-[140px]">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                    <div className="mt-1">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        item.status === 'Pending Examination'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : item.status === 'Under Observation'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Veterinarian</p>
                      <p className={`text-xs font-bold mt-0.5 flex items-center space-x-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{item.assignedVet}</span>
                      </p>
                    </div>
                  </div>

                  {/* 5. View Case Action Button */}
                  <div className="shrink-0 flex items-center self-end md:self-center">
                    <button
                      onClick={() => {
                        onViewCase(item.animalId, item.rawAppointment);
                        onClose();
                      }}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs ${
                        isDarkMode
                          ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900 hover:text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-500" />
                      <span>View Case</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer with Pagination & Close */}
        <div className={`px-6 py-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
          isDarkMode ? 'border-emerald-950/60 bg-[#04110A]' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <div className="text-xs text-slate-400 font-medium">
            Showing {cases.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, cases.length)} of {cases.length} animals
          </div>

          <div className="flex items-center space-x-3">
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center space-x-1.5">
                <button
                  disabled={currentPageSafe <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={`p-1.5 rounded-lg border text-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                    isDarkMode ? 'border-emerald-950 text-slate-300 hover:bg-emerald-950' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      currentPageSafe === pageNum
                        ? 'bg-emerald-700 text-white'
                        : isDarkMode
                          ? 'text-slate-400 hover:text-white hover:bg-emerald-950'
                          : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  disabled={currentPageSafe >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={`p-1.5 rounded-lg border text-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                    isDarkMode ? 'border-emerald-950 text-slate-300 hover:bg-emerald-950' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className={`px-5 py-2 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                isDarkMode ? 'border-emerald-950 bg-[#06180F] text-slate-300 hover:text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
