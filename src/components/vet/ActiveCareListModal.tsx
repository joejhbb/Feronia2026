import React, { useState, useMemo } from 'react';
import {
  X, Heart, Eye, ChevronLeft, ChevronRight, Search,
  PawPrint, Calendar, Stethoscope, ArrowRight, Activity,
  Filter, AlertCircle, Camera
} from 'lucide-react';
import { Animal, MedicalRecord, Appointment } from '../../types';

interface ActiveCareListModalProps {
  isOpen: boolean;
  onClose: () => void;
  animals: Animal[];
  medicalRecords?: MedicalRecord[];
  appointments?: Appointment[];
  isDarkMode: boolean;
  systemDate?: string;
  onSelectAnimalForConsult: (animalId: string) => void;
  onScheduleForAnimal?: (animalId: string) => void;
  onViewInAnimalsTab?: () => void;
}

export default function ActiveCareListModal({
  isOpen,
  onClose,
  animals,
  medicalRecords = [],
  appointments = [],
  isDarkMode,
  systemDate,
  onSelectAnimalForConsult,
  onScheduleForAnimal,
  onViewInAnimalsTab
}: ActiveCareListModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'All' | 'Under Observation' | 'Under Treatment' | 'Injured/Sick'>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  // Filter animals requiring observation & therapy
  const carePatients = useMemo(() => {
    return animals.filter(a => {
      if (a.isArchived) return false;
      const status = a.healthStatus;
      // All animals requiring observation, treatment, or non-healthy statuses
      return status && status !== 'Healthy';
    });
  }, [animals]);

  // Apply search query and category filtering
  const filteredPatients = useMemo(() => {
    return carePatients.filter(patient => {
      const matchesSearch =
        (patient.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient.enclosureId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterCategory === 'All') return true;
      if (filterCategory === 'Under Observation') {
        return patient.healthStatus === 'Under Observation';
      }
      if (filterCategory === 'Under Treatment') {
        return patient.healthStatus === 'Under Treatment';
      }
      if (filterCategory === 'Injured/Sick') {
        return patient.healthStatus === 'Injured' || patient.healthStatus === 'Sick';
      }
      return true;
    });
  }, [carePatients, searchQuery, filterCategory]);

  // Counts for pills
  const countObservation = useMemo(() => carePatients.filter(a => a.healthStatus === 'Under Observation').length, [carePatients]);
  const countTreatment = useMemo(() => carePatients.filter(a => a.healthStatus === 'Under Treatment').length, [carePatients]);
  const countInjuredSick = useMemo(() => carePatients.filter(a => a.healthStatus === 'Injured' || a.healthStatus === 'Sick').length, [carePatients]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / itemsPerPage));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const startIndex = (currentPageSafe - 1) * itemsPerPage;
  const currentPatients = filteredPatients.slice(startIndex, startIndex + itemsPerPage);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all ${
          isDarkMode 
            ? 'bg-[#06180F] border-amber-950/70 text-slate-100' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-5 sm:p-6 border-b flex items-center justify-between shrink-0 ${
          isDarkMode ? 'border-emerald-950/70 bg-[#071F11]' : 'border-slate-100 bg-amber-50/40'
        }`}>
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className={`font-black text-lg sm:text-xl tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Active Care List
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {carePatients.length} {carePatients.length === 1 ? 'Patient' : 'Patients'} Under Care
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Patients requiring veterinary observation, medical therapy, and intensive care monitoring.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onViewInAnimalsTab && (
              <button
                onClick={() => {
                  onClose();
                  onViewInAnimalsTab();
                }}
                className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isDarkMode
                    ? 'border-emerald-900/60 bg-[#04110A] text-emerald-300 hover:bg-emerald-900/40 hover:text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                title="View full list in Animals Tab"
              >
                <span>Animals Directory</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDarkMode ? 'border-emerald-950 text-slate-400 hover:text-white hover:bg-emerald-950/40' : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className={`p-4 sm:px-6 border-b flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
          isDarkMode ? 'border-emerald-950/40 bg-[#04110A]' : 'border-slate-100 bg-slate-50/50'
        }`}>
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search patient, species, habitat..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-medium focus:outline-none transition-colors ${
                isDarkMode 
                  ? 'bg-[#071F11] border-emerald-950 text-slate-200 focus:border-amber-500' 
                  : 'bg-white border-slate-200 text-slate-800 focus:border-amber-600'
              }`}
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => {
                setFilterCategory('All');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterCategory === 'All'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : isDarkMode
                    ? 'bg-[#071F11] text-slate-400 hover:text-slate-200 border border-emerald-950/60'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Under Care ({carePatients.length})
            </button>

            <button
              onClick={() => {
                setFilterCategory('Under Observation');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterCategory === 'Under Observation'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : isDarkMode
                    ? 'bg-[#071F11] text-slate-400 hover:text-slate-200 border border-emerald-950/60'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Observation ({countObservation})
            </button>

            <button
              onClick={() => {
                setFilterCategory('Under Treatment');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterCategory === 'Under Treatment'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : isDarkMode
                    ? 'bg-[#071F11] text-slate-400 hover:text-slate-200 border border-emerald-950/60'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Treatment ({countTreatment})
            </button>

            <button
              onClick={() => {
                setFilterCategory('Injured/Sick');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterCategory === 'Injured/Sick'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : isDarkMode
                    ? 'bg-[#071F11] text-slate-400 hover:text-slate-200 border border-emerald-950/60'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Injured / Sick ({countInjuredSick})
            </button>
          </div>
        </div>

        {/* Modal Body: Active Care Patient Cards */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3.5">
          {carePatients.length === 0 ? (
            <div className={`p-8 rounded-2xl border text-center ${
              isDarkMode ? 'bg-[#04110A] border-emerald-950/60' : 'bg-slate-50 border-slate-200'
            }`}>
              <Activity className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-sm text-emerald-400">✨ All patients are currently in healthy condition!</p>
              <p className="text-xs text-slate-400 mt-1">No animals in the facility currently require active observation or medical therapy.</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className={`p-8 rounded-2xl border text-center ${
              isDarkMode ? 'bg-[#04110A] border-emerald-950/60' : 'bg-slate-50 border-slate-200'
            }`}>
              <p className="font-bold text-xs text-slate-300">No animals match your filter criteria.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterCategory('All');
                }}
                className="mt-2 text-xs font-bold text-amber-400 hover:underline cursor-pointer"
              >
                Reset search & filters
              </button>
            </div>
          ) : (
            currentPatients.map((patient) => {
              // Find latest medical record for patient
              const patientRecords = medicalRecords.filter(r => r.animalId === patient.id);
              const latestRecord = patientRecords.length > 0
                ? patientRecords.sort((a, b) => (b.recordDate || '').localeCompare(a.recordDate || ''))[0]
                : null;

              // Find pending/ongoing appointment for patient
              const patientAppointment = appointments.find(
                apt => apt.animalId === patient.id && (apt.status === 'Pending' || apt.status === 'Approved' || apt.status === 'Ongoing')
              );

              const isUnderTreatment = patient.healthStatus === 'Under Treatment';
              const isUnderObservation = patient.healthStatus === 'Under Observation';
              const isInjuredOrSick = patient.healthStatus === 'Injured' || patient.healthStatus === 'Sick';

              return (
                <div
                  key={patient.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isInjuredOrSick
                      ? 'border-l-4 border-l-rose-500'
                      : isUnderTreatment
                        ? 'border-l-4 border-l-orange-500'
                        : isUnderObservation
                          ? 'border-l-4 border-l-amber-400'
                          : 'border-l-4 border-l-emerald-500'
                  } ${
                    isDarkMode 
                      ? 'bg-[#04110A] border-emerald-950/70 hover:border-emerald-800' 
                      : 'bg-white border-slate-200 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  {/* Animal Info */}
                  <div className="flex items-center space-x-3.5 min-w-[240px]">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-emerald-950 shrink-0 shadow-sm relative">
                      {patient.image ? (
                        <img
                          src={patient.image}
                          alt={patient.name || patient.id}
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
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {patient.name || patient.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          isInjuredOrSick
                            ? 'bg-rose-100 dark:bg-rose-950/90 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            : isUnderTreatment
                              ? 'bg-orange-100 dark:bg-orange-950/90 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800'
                              : isUnderObservation
                                ? 'bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                : 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        }`}>
                          {patient.healthStatus}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                        {patient.species} {patient.morph ? `• ${patient.morph}` : ''}
                      </p>

                      <div className="flex items-center space-x-3 mt-1 text-[11px] text-slate-400">
                        <span className="flex items-center space-x-1">
                          <PawPrint className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{patient.enclosureId || 'Unassigned'}</span>
                        </span>
                        <span>•</span>
                        <span>{patient.weight ? `${patient.weight}g` : 'Weight unrecorded'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Therapy / Clinical Notes Details */}
                  <div className="md:flex-1 min-w-0 border-t md:border-t-0 md:border-l border-slate-100 dark:border-emerald-950/50 pt-2.5 md:pt-0 md:pl-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Observation & Therapy Notes
                    </p>
                    <p className={`text-xs mt-1 leading-snug line-clamp-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                      {latestRecord?.diagnosis
                        ? `Diagnosis: ${latestRecord.diagnosis}${latestRecord.treatment ? ` — Treatment: ${latestRecord.treatment}` : ''}`
                        : patient.notes || 'Active clinical observation protocol in place. Routine temperature, appetite, and behavioral monitoring.'}
                    </p>
                    
                    {patientAppointment && (
                      <p className="text-[10px] font-semibold text-teal-400 mt-1 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>Scheduled: {patientAppointment.date} ({patientAppointment.type})</span>
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 justify-end">
                    <button
                      onClick={() => {
                        onClose();
                        onSelectAnimalForConsult(patient.id);
                      }}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
                      title="Open Consultation Desk for this patient"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Clinical Consult</span>
                    </button>

                    {onScheduleForAnimal && (
                      <button
                        onClick={() => {
                          onClose();
                          onScheduleForAnimal(patient.id);
                        }}
                        className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer ${
                          isDarkMode
                            ? 'bg-[#06180F] border-emerald-900/60 text-emerald-300 hover:bg-[#082215]'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                        title="Book an examination or therapy schedule"
                      >
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Schedule</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer with Pagination & Actions */}
        <div className={`px-5 sm:px-6 py-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
          isDarkMode ? 'border-emerald-950/60 bg-[#04110A]' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <div className="text-xs text-slate-400 font-medium">
            Showing {filteredPatients.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredPatients.length)} of {filteredPatients.length} care patients
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
                        ? 'bg-amber-600 text-white'
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

            {onViewInAnimalsTab && (
              <button
                onClick={() => {
                  onClose();
                  onViewInAnimalsTab();
                }}
                className={`px-3.5 py-2 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                  isDarkMode 
                    ? 'border-emerald-900/80 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60' 
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs'
                }`}
              >
                View in Animals Tab
              </button>
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
