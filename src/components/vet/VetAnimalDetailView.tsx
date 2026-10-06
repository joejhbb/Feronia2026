import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, CalendarPlus, Plus, Stethoscope, MoreVertical, Sparkles,
  Activity, FileText, Sliders, Heart, Scale, Ruler, Thermometer,
  Droplets, Home, Clock, User, Upload, X, ChevronLeft, ChevronRight,
  Image as ImageIcon, Trash2, Eye, MapPin, AlertCircle, Utensils,
  Puzzle, FileCheck, CheckCircle2, ShieldAlert, Check, XCircle, RotateCcw,
  Calendar, CalendarCheck, CalendarClock, Shield, AlertTriangle, Camera, ClipboardList, Info
} from 'lucide-react';
import { Animal, Enclosure, MedicalRecord, Appointment, Task, StaffMember, getAppointmentRequesterInfo, resolveVeterinarianName, resolveAdminName, resolveKeeperName } from '../../types';
import { getUnifiedAnimalCare } from '../../utils/careUtils';
import { calculatePreciseAge, getEffectiveSystemDate } from '../../utils/timeUtils';

interface ScheduleBreakdown {
  monthShort: string;
  dayNum: string;
  year: string;
  weekday: string;
  fullDateFormatted: string;
  relativeTag?: string;
  timeFormatted: string;
}

function parseScheduleDetails(dateStr?: string, timeStr?: string): ScheduleBreakdown {
  const defaultRes: ScheduleBreakdown = {
    monthShort: 'CAL',
    dayNum: '--',
    year: '',
    weekday: 'Scheduled',
    fullDateFormatted: dateStr || 'Date Pending',
    timeFormatted: timeStr || 'Time TBD'
  };
  if (!dateStr) return defaultRes;

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = Number(parts[0]);
    const m = Number(parts[1]) - 1;
    const d = Number(parts[2]);
    const dateObj = new Date(y, m, d);
    if (!isNaN(dateObj.getTime())) {
      const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const dayNum = String(dateObj.getDate()).padStart(2, '0');
      const year = String(dateObj.getFullYear());
      const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const fullDateFormatted = dateObj.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      let relativeTag: string | undefined;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(y, m, d);
      target.setHours(0, 0, 0, 0);
      const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) relativeTag = 'Today';
      else if (diffDays === 1) relativeTag = 'Tomorrow';
      else if (diffDays > 1 && diffDays <= 7) relativeTag = `In ${diffDays} days`;
      else if (diffDays < 0) relativeTag = 'Past Date';

      return {
        monthShort,
        dayNum,
        year,
        weekday,
        fullDateFormatted,
        relativeTag,
        timeFormatted: timeStr || '10:00 AM'
      };
    }
  }
  return defaultRes;
}

function formatDateString(dateStr?: string): string {
  if (!dateStr) return 'Unrecorded';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  }
  return dateStr;
}

function calculateAge(dobStr?: string): string {
  if (!dobStr) return 'Unknown';
  const res = calculatePreciseAge(dobStr, getEffectiveSystemDate());
  if (!res) return 'Unknown';
  if (res.isFuture) return 'Future Date (Not born)';
  return res.text;
}

function getAgeGroup(dobStr?: string): string {
  if (!dobStr) return 'Adult';
  const res = calculatePreciseAge(dobStr, getEffectiveSystemDate());
  if (!res) return 'Adult';
  return res.stage === 'N/A' ? 'Adult' : res.stage;
}

interface VetAnimalDetailViewProps {
  animal: Animal;
  enclosures?: Enclosure[];
  tasks?: Task[];
  medicalRecords?: MedicalRecord[];
  appointments?: Appointment[];
  staffMembers?: StaffMember[];
  isDarkMode: boolean;
  systemDate?: string;
  onBack?: () => void;
  onClose?: () => void;
  onUpdateAnimal: (updated: Animal) => void;
  onSelectAnimalForConsult: (animalId: string) => void;
  onScheduleForAnimal: (animalId: string) => void;
  onAddAppointment?: (appointment: Appointment) => void;
  onUpdateAppointment?: (appointment: Appointment) => void;
  onUpdateAppointmentStatus?: (id: string, status: Appointment['status']) => void;
  onAddMedicalRecord?: (record: MedicalRecord) => void;
  userAccount?: { name: string; email: string };
}

export default function VetAnimalDetailView({
  animal,
  enclosures = [],
  tasks = [],
  medicalRecords = [],
  appointments = [],
  staffMembers = [],
  isDarkMode,
  systemDate,
  onBack,
  onClose,
  onUpdateAnimal,
  onSelectAnimalForConsult,
  onScheduleForAnimal,
  onAddAppointment,
  onUpdateAppointment,
  onUpdateAppointmentStatus,
  onAddMedicalRecord,
  userAccount
}: VetAnimalDetailViewProps) {
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onBack) {
      onBack();
    }
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'medical' | 'request-followup' | 'documents'>('overview');
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [notesText, setNotesText] = useState(animal.notes || '');
  const [savedNotesFeedback, setSavedNotesFeedback] = useState<string | null>(null);

  // Edit details modal state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editName, setEditName] = useState(animal.name || '');
  const [editMorph, setEditMorph] = useState(animal.morph || '');
  const [editSex, setEditSex] = useState<'Male' | 'Female'>(animal.sex || 'Male');
  const [editWeight, setEditWeight] = useState(animal.weight || 0);
  const [editLength, setEditLength] = useState(animal.length || 0);
  const [editHealthStatus, setEditHealthStatus] = useState(animal.healthStatus || 'Healthy');
  const [editBreedingStatus, setEditBreedingStatus] = useState(animal.breedingStatus || 'Unassessed');
  const [editSource, setEditSource] = useState(animal.source || 'Local Breeder');
  const [editEnclosureId, setEditEnclosureId] = useState(animal.enclosureId || '');
  const [editDob, setEditDob] = useState(animal.dob || '');
  const [editDateAcquired, setEditDateAcquired] = useState(animal.dateAcquired || '');
  const [editDateError, setEditDateError] = useState<string | null>(null);

  // Add photo state
  const [isAddPhotoOpen, setIsAddPhotoOpen] = useState(false);
  const [newPhotoFileBase64, setNewPhotoFileBase64] = useState<string>('');

  // Three-dots menu state
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  // Follow-up tab form states
  const [aptType, setAptType] = useState('Follow-up Examination');
  const [aptCustomType, setAptCustomType] = useState('');
  const [aptPriority, setAptPriority] = useState<'Normal' | 'High' | 'Emergency'>('Normal');
  const [aptDate, setAptDate] = useState(() => systemDate || new Date().toISOString().split('T')[0]);
  const [aptTime, setAptTime] = useState('10:00 AM');
  const [aptNotes, setAptNotes] = useState('');
  const [aptFeedback, setAptFeedback] = useState<string | null>(null);

  // Documents state
  const [attachedDocs, setAttachedDocs] = useState<Array<{ name: string; size: string; date: string; type: string }>>([]);
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState('Diagnostic Lab Bloodwork');

  // Enclosure info
  const enclosure = enclosures.find(e => e.id === animal.enclosureId);
  const enclosureLocationText = enclosure ? `${enclosure.facility} • ${enclosure.name}` : (animal.enclosureId || 'Unassigned Enclosure');

  // Care requirements (unified with Admin and Keeper inputs)
  const care = getUnifiedAnimalCare(animal, enclosure, tasks);

  // Photos list - strictly use the animal's real photo and any extra uploaded photos, never arbitrary unasked photos!
  const basePhoto = (animal.image || animal.imageUrl || animal.photoUrl || '').trim();
  const rawExtraPhotos: string[] = (animal as any).photos || (animal as any).additionalImages || [];
  const photos: string[] = [
    ...(basePhoto ? [basePhoto] : []),
    ...rawExtraPhotos.filter(p => typeof p === 'string' && p.trim().length > 0 && p.trim() !== basePhoto)
  ];

  const currentPhoto: string | null = photos.length > 0 ? (photos[activePhotoIdx] || photos[0]) : null;

  // Records for this animal
  const patientRecords = medicalRecords.filter(m => m.animalId === animal.id);
  const patientAppointments = appointments.filter(a => a.animalId === animal.id);

  // Helper to check if appointment was requested by Vet
  const isAptRequestedByVet = (a: Appointment) => {
    return a.requestedByRole === 'vet' || 
           (a.requestedBy || '').toLowerCase().includes('vet') || 
           (a.requestedBy || '').toLowerCase().includes('dr. vicente') || 
           (a.requestedBy || '').toLowerCase().includes('follow-up') || 
           (a.id && (a.id.startsWith('APT-VET') || a.id.startsWith('APP-')));
  };

  // Pending action requests originating from Admin / Keeper (Action required by Vet to Accept/Decline)
  const pendingApt = patientAppointments.find(a => 
    !isAptRequestedByVet(a) && 
    (a.status === 'Pending Approval' || a.status === 'Pending' || a.status === 'Reschedule Requested')
  );

  // Vet-requested follow-up checkups currently awaiting Admin authorization
  const pendingVetFollowup = patientAppointments.find(a => 
    isAptRequestedByVet(a) && 
    (a.status === 'Pending Approval' || a.status === 'Pending')
  );

  // Confirmed upcoming appointments on this animal (authorized by Admin or confirmed)
  const upcomingApprovedApt = patientAppointments.find(a => 
    a.status === 'Approved' || a.status === 'Ongoing'
  );

  // Decline / Reschedule state for Vet reviewing Admin/Keeper request
  const [isDeclineRescheduleOpen, setIsDeclineRescheduleOpen] = useState(false);
  const [aptDeclineReason, setAptDeclineReason] = useState('Not available on this day');
  const [aptDeclineNotes, setAptDeclineNotes] = useState('');
  const [isProposingReschedule, setIsProposingReschedule] = useState(false);
  const [proposedDate, setProposedDate] = useState(() => pendingApt?.date || systemDate || '');
  const [proposedTime, setProposedTime] = useState(() => pendingApt?.time || '10:00 AM');
  const [aptActionToast, setAptActionToast] = useState<string | null>(null);

  const handleAcceptAppointment = (aptToAccept: Appointment) => {
    const defaultVetName = userAccount?.name || resolveVeterinarianName(undefined, staffMembers);
    const updated: Appointment = {
      ...aptToAccept,
      status: 'Approved',
      date: aptToAccept.proposedDate || aptToAccept.date,
      time: aptToAccept.proposedTime || aptToAccept.time,
      approvedBy: defaultVetName,
      approvedAt: new Date().toISOString(),
      adminNotes: aptToAccept.status === 'Reschedule Requested' 
        ? `Rescheduled date confirmed by ${defaultVetName}` 
        : aptToAccept.adminNotes
    };
    if (onUpdateAppointment) {
      onUpdateAppointment(updated);
    } else if (onUpdateAppointmentStatus) {
      onUpdateAppointmentStatus(aptToAccept.id, 'Approved');
    }
    setAptActionToast(`✓ Appointment confirmed for ${updated.date} at ${updated.time}.`);
    setTimeout(() => setAptActionToast(null), 4500);
    setIsDeclineRescheduleOpen(false);
  };

  const handleConfirmDeclineOrReschedule = (aptToUpdate: Appointment) => {
    const defaultVetName = userAccount?.name || resolveVeterinarianName(undefined, staffMembers);
    if (isProposingReschedule) {
      const updated: Appointment = {
        ...aptToUpdate,
        status: 'Reschedule Requested',
        proposedDate: proposedDate || aptToUpdate.date,
        proposedTime: proposedTime || aptToUpdate.time,
        rescheduleReason: aptDeclineReason,
        rescheduleNotes: aptDeclineNotes,
        rescheduledBy: 'vet',
        rescheduledByName: defaultVetName,
        rescheduledAt: new Date().toISOString()
      };
      if (onUpdateAppointment) {
        onUpdateAppointment(updated);
      }
      setAptActionToast(`✓ Reschedule proposal sent to Admin for ${updated.proposedDate} at ${updated.proposedTime}.`);
    } else {
      const updated: Appointment = {
        ...aptToUpdate,
        status: 'Declined',
        declineReason: aptDeclineReason,
        declineNotes: aptDeclineNotes,
        declinedBy: defaultVetName,
        declinedAt: new Date().toISOString()
      };
      if (onUpdateAppointment) {
        onUpdateAppointment(updated);
      } else if (onUpdateAppointmentStatus) {
        onUpdateAppointmentStatus(aptToUpdate.id, 'Declined');
      }
      setAptActionToast(`✕ Appointment request marked as Declined (${aptDeclineReason}).`);
    }
    setTimeout(() => setAptActionToast(null), 4500);
    setIsDeclineRescheduleOpen(false);
  };

  // Handle escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditingDetails) {
          setIsEditingDetails(false);
        } else if (isAddPhotoOpen) {
          setIsAddPhotoOpen(false);
        } else if (isAddDocOpen) {
          setIsAddDocOpen(false);
        } else if (isOptionsOpen) {
          setIsOptionsOpen(false);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isEditingDetails, isAddPhotoOpen, isAddDocOpen, isOptionsOpen]);

  const handleSaveNotes = () => {
    onUpdateAnimal({
      ...animal,
      notes: notesText
    });
    setSavedNotesFeedback('Clinical notes saved successfully!');
    setTimeout(() => setSavedNotesFeedback(null), 4000);
  };

  const handleSaveEditedDetails = (e: React.FormEvent) => {
    e.preventDefault();

    if (editDob && editDateAcquired && new Date(editDateAcquired) < new Date(editDob)) {
      setEditDateError(`Invalid dates: Date Acquired (${editDateAcquired}) cannot be earlier than Date of Birth (${editDob}).`);
      return;
    }
    setEditDateError(null);

    onUpdateAnimal({
      ...animal,
      name: editName || undefined,
      morph: editMorph,
      sex: editSex,
      weight: Number(editWeight),
      length: Number(editLength),
      healthStatus: editHealthStatus,
      breedingStatus: editBreedingStatus as any,
      source: editSource,
      enclosureId: editEnclosureId || undefined,
      dob: editDob,
      dateAcquired: editDateAcquired
    });
    setIsEditingDetails(false);
  };

  const handleAddPhotoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoFileBase64) return;
    onUpdateAnimal({
      ...animal,
      image: newPhotoFileBase64,
      imageUrl: newPhotoFileBase64,
      photoUrl: newPhotoFileBase64
    });
    setNewPhotoFileBase64('');
    setIsAddPhotoOpen(false);
  };

  const handleCreateFollowupRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (aptType === 'Other' && !aptCustomType.trim()) return;

    const finalType = aptType === 'Other' ? (aptCustomType.trim() || 'Other Examination') : aptType;
    const vetName = userAccount?.name || 'Dr. Vicente';
    const vetEmail = userAccount?.email || 'vicente.vet@feroniasanctuary.org';

    const newApt: Appointment = {
      id: `APP-2026-${Date.now().toString().slice(-5)}`,
      animalId: animal.id,
      type: finalType,
      veterinarian: vetName,
      requestedBy: `${vetName} (Veterinarian Follow-up Request)`,
      requestedByRole: 'vet',
      requestedById: 'STF-VET-001',
      requestedByEmail: vetEmail,
      date: aptDate,
      time: aptTime,
      priority: aptPriority,
      status: 'Pending Approval',
      purpose: aptNotes.trim() || `Veterinary Follow-up Examination for ${animal.name || animal.id} (${animal.species})`,
      createdOn: systemDate || new Date().toISOString().split('T')[0]
    };

    if (onAddAppointment) {
      onAddAppointment(newApt);
    }
    setAptFeedback(`✓ Follow-up check-up request submitted for ${aptDate} at ${aptTime}. Awaiting Administrator authorization.`);
    setTimeout(() => setAptFeedback(null), 5000);
    setAptNotes('');
    setAptCustomType('');
  };

  const handleAddDocumentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;
    const today = formatDateString(systemDate || new Date().toISOString().split('T')[0]);
    setAttachedDocs(prev => [
      ...prev,
      {
        name: newDocName.endsWith('.pdf') ? newDocName : `${newDocName}.pdf`,
        size: '180 KB',
        date: today,
        type: newDocType
      }
    ]);
    setNewDocName('');
    setIsAddDocOpen(false);
  };

  const isHealthy = animal.healthStatus === 'Healthy';
  const isTreatment = animal.healthStatus === 'Under Treatment' || animal.healthStatus === 'Injured' || animal.healthStatus === 'Sick';

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className={`bg-white dark:bg-[#071F11] rounded-2xl sm:rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 dark:border-emerald-950/80 overflow-hidden flex flex-col h-[94vh] sm:h-[90vh] max-h-[96vh] relative animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP HEADER WITH ANIMAL INFO & CLOSE 'X' BUTTON */}
        <div className={`p-4 sm:p-5 border-b shrink-0 ${
          isDarkMode ? 'bg-[#071F11] border-emerald-950/80 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
              isDarkMode ? 'text-emerald-400' : 'text-emerald-800'
            }`}>
              Animals • Clinical Patient Details
            </span>

            {/* Admin-style Close 'X' Button */}
            <button
              type="button"
              onClick={handleClose}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isDarkMode 
                  ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 hover:text-white border-emerald-900/40' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 border-slate-200'
              }`}
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Left info stack */}
            <div className="flex items-center space-x-3.5 min-w-0">
              {/* Square thumbnail photo */}
              <div 
                onClick={() => setIsAddPhotoOpen(true)}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-slate-900 shrink-0 shadow-md cursor-pointer hover:border-emerald-400 transition-all group"
                title="Click to change photo"
              >
                {currentPhoto ? (
                  <img
                    src={currentPhoto}
                    alt={animal.name || animal.id}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                    <Camera className="w-5 h-5 text-emerald-500/80" />
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">No Photo</span>
                  </div>
                )}
              </div>

              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                    {animal.id}
                  </h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    isHealthy
                      ? (isDarkMode ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/60' : 'bg-emerald-100 text-emerald-800 border-emerald-300')
                      : isTreatment
                        ? (isDarkMode ? 'bg-rose-950/60 text-rose-300 border-rose-600/60' : 'bg-rose-100 text-rose-800 border-rose-300')
                        : (isDarkMode ? 'bg-amber-950/60 text-amber-300 border-amber-600/60' : 'bg-amber-100 text-amber-800 border-amber-300')
                  }`}>
                    {animal.healthStatus || 'Healthy'}
                  </span>
                  {animal.name && (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      {animal.name}
                    </span>
                  )}
                </div>

                <p className={`text-xs sm:text-sm font-semibold truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {animal.species} {animal.scientificName && <span className="italic font-normal opacity-85">({animal.scientificName})</span>} • {animal.morph || 'Normal'}
                </p>

                <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-bold">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{enclosureLocationText}</span>
                </div>
              </div>
            </div>

            {/* Right action buttons */}
            <div className="flex items-center space-x-2 shrink-0 flex-wrap">
              <button
                onClick={() => setActiveTab('request-followup')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                  isDarkMode 
                    ? 'bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800/80' 
                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900'
                }`}
              >
                <CalendarPlus className="w-4 h-4 text-emerald-400" />
                <span>Request Follow-up</span>
              </button>

              <button
                onClick={() => onSelectAnimalForConsult(animal.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medical Record</span>
              </button>

              {/* Options menu ⋮ */}
              <div className="relative">
                <button
                  onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="More actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isOptionsOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsOptionsOpen(false)} />
                    <div className={`absolute right-0 mt-2 w-48 rounded-2xl border shadow-xl z-30 p-1.5 space-y-1 ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                      <button
                        onClick={() => {
                          setIsOptionsOpen(false);
                          setIsEditingDetails(true);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors ${
                          isDarkMode ? 'hover:bg-emerald-950/60 text-emerald-200' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Edit Animal Details</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsOptionsOpen(false);
                          setIsAddPhotoOpen(true);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors ${
                          isDarkMode ? 'hover:bg-emerald-950/60 text-emerald-200' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Add / Change Photo</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS (Pinned under header) */}
        <div className={`flex items-center space-x-2 overflow-x-auto px-4 sm:px-6 py-2.5 no-scrollbar border-b shrink-0 ${
          isDarkMode ? 'bg-[#06180F] border-emerald-950/60' : 'bg-slate-50/90 border-slate-200'
        }`}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? (isDarkMode ? 'bg-[#08301D] text-emerald-300 border border-emerald-500/60 shadow-xs' : 'bg-emerald-800 text-white border border-emerald-700 shadow-xs')
                : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-emerald-950/30' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('medical')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'medical'
                ? (isDarkMode ? 'bg-[#08301D] text-emerald-300 border border-emerald-500/60 shadow-xs' : 'bg-emerald-800 text-white border border-emerald-700 shadow-xs')
                : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-emerald-950/30' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
            <span>Medical</span>
            {patientRecords.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300">
                {patientRecords.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('request-followup')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'request-followup'
                ? (isDarkMode ? 'bg-[#08301D] text-emerald-300 border border-emerald-500/60 shadow-xs' : 'bg-emerald-800 text-white border border-emerald-700 shadow-xs')
                : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-emerald-950/30' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <CalendarPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Request Follow-up</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'documents'
                ? (isDarkMode ? 'bg-[#08301D] text-emerald-300 border border-emerald-500/60 shadow-xs' : 'bg-emerald-800 text-white border border-emerald-700 shadow-xs')
                : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-emerald-950/30' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Documents</span>
          </button>
        </div>

        {/* SCROLLABLE TAB CONTENTS */}
        <div className="overflow-y-auto min-h-0 flex-1 p-4 sm:p-6 space-y-6">

      {/* 4. TAB CONTENTS */}

      {/* Action Toast Feedback */}
      {aptActionToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>{aptActionToast}</span>
          <button onClick={() => setAptActionToast(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB A: OVERVIEW (Exact matching layout from Image 1) */}
      {activeTab === 'overview' && (
        <div className="space-y-5 animate-fadeIn">
          {/* PENDING APPOINTMENT / CONSULTATION REQUEST BANNER (If exists) */}
          {pendingApt && (() => {
            const sched = parseScheduleDetails(pendingApt.date, pendingApt.time);
            const isReschedule = pendingApt.status === 'Reschedule Requested';
            const proposedSched = isReschedule ? parseScheduleDetails(pendingApt.proposedDate, pendingApt.proposedTime) : null;
            const isEmergency = pendingApt.priority === 'Emergency';
            const isHigh = pendingApt.priority === 'High';
            const isAdmin = pendingApt.requestedByRole === 'admin' || (!pendingApt.requestedByRole && (pendingApt.requestedBy?.toLowerCase().includes('admin') || pendingApt.requestedBy?.toLowerCase().includes('eleanor')));
            const isKeeper = pendingApt.requestedByRole === 'keeper' || pendingApt.type?.toLowerCase().includes('observation');

            return (
              <div className={`p-5 sm:p-6 rounded-3xl border-2 transition-all shadow-xl relative overflow-hidden ${
                isReschedule
                  ? (isDarkMode ? 'bg-gradient-to-br from-[#1c0c2e] via-[#130722] to-[#0c0416] border-purple-400 ring-2 ring-purple-400/30 text-white shadow-purple-950/80' : 'bg-purple-50 border-purple-400 text-purple-950 shadow-md')
                  : isAdmin
                    ? (isDarkMode ? 'bg-gradient-to-br from-[#06291a] via-[#041d13] to-[#02120b] border-emerald-400 ring-2 ring-emerald-400/30 text-white shadow-emerald-950/80' : 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50 border-emerald-500 text-emerald-950 shadow-lg')
                    : isKeeper
                      ? (isDarkMode ? 'bg-gradient-to-br from-[#291f06] via-[#1d1504] to-[#120d02] border-amber-400 ring-2 ring-amber-400/30 text-white shadow-amber-950/80' : 'bg-amber-50 border-amber-400 text-amber-950 shadow-md')
                      : (isDarkMode ? 'bg-gradient-to-br from-[#062629] via-[#041b1d] to-[#021112] border-cyan-400 ring-2 ring-cyan-400/30 text-white shadow-cyan-950/80' : 'bg-cyan-50 border-cyan-400 text-cyan-950 shadow-md')
              }`}>
                {/* Visual Top Highlight Accent Bar */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                  isReschedule ? 'bg-purple-400' : isAdmin ? 'bg-emerald-400' : isKeeper ? 'bg-amber-400' : 'bg-cyan-400'
                }`} />

                {/* Header Row: Title, Requester, Priority */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-sm ${
                      isReschedule
                        ? 'bg-purple-500 text-white'
                        : isAdmin
                          ? 'bg-emerald-500 text-slate-950'
                          : isKeeper
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-cyan-500 text-slate-950'
                    }`}>
                      {isReschedule ? (
                        <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                      ) : isAdmin ? (
                        <Shield className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <Eye className="w-5 h-5 stroke-[2.5]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-black text-base sm:text-lg tracking-tight text-white">
                          {isReschedule
                            ? `Reschedule Proposed (${pendingApt.rescheduledBy === 'admin' ? 'by Admin' : `by ${resolveVeterinarianName(pendingApt.rescheduledByName || pendingApt.veterinarian, staffMembers)}`})`
                            : isAdmin
                              ? 'Admin Appointment Request'
                              : isKeeper
                                ? 'Keeper Observation Request'
                                : 'Veterinary Follow-up (Awaiting Admin Auth)'
                          }
                        </h4>
                        <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                          Action Required
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 flex items-center space-x-1.5 flex-wrap">
                        <span>Requested by:</span>
                        <strong className="text-white font-bold">{pendingApt.requestedBy || 'Eleanor Vance (Admin)'}</strong>
                        {pendingApt.type && (
                          <>
                            <span className="text-slate-500">•</span>
                            <span className="text-emerald-300 font-semibold">{pendingApt.type}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Priority Badge */}
                  <div className="flex items-center space-x-2 self-start sm:self-center">
                    <span className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-sm flex items-center space-x-1.5 ${
                      isEmergency
                        ? 'bg-rose-500 text-white ring-2 ring-rose-400/60 animate-pulse'
                        : isHigh
                          ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    }`}>
                      {isEmergency ? <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" /> : null}
                      <span>Priority: {pendingApt.priority}</span>
                    </span>
                  </div>
                </div>

                {/* THE SCHEDULE SPOTLIGHT (HIGH VISIBILITY FOCUS) */}
                <div className={`my-4 p-4 sm:p-4.5 rounded-2xl border-2 transition-all shadow-md ${
                  isDarkMode
                    ? 'bg-[#031d13] border-emerald-400 text-white shadow-emerald-950/70'
                    : 'bg-emerald-100/70 border-emerald-500 text-emerald-950'
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Date Block & Details */}
                    <div className="flex items-center space-x-4">
                      {/* Visual Calendar Date Sheet */}
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white dark:bg-[#02150e] border-2 border-emerald-400 shadow-lg flex flex-col items-center justify-center shrink-0 overflow-hidden">
                        <div className="w-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase text-center py-0.5 tracking-wider">
                          {sched.monthShort}
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-400 dark:text-emerald-300 leading-tight">
                          {sched.dayNum}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 leading-none pb-0.5">
                          {sched.year}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-emerald-400 text-slate-950 shadow-xs">
                            📅 Scheduled Appointment
                          </span>
                          {sched.relativeTag && (
                            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-xs">
                              ⚡ {sched.relativeTag}
                            </span>
                          )}
                        </div>
                        
                        <div className="text-base sm:text-xl font-black tracking-tight text-white mt-1.5 flex items-center flex-wrap gap-2">
                          <span className="text-emerald-400">{sched.weekday},</span>
                          <span className="text-white">{sched.fullDateFormatted}</span>
                        </div>
                      </div>
                    </div>

                    {/* Prominent High-Contrast Time Badge */}
                    <div className="flex items-center space-x-2 self-start md:self-center shrink-0">
                      <div className="flex flex-col items-start md:items-end">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300/80 mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span>Exact Appointment Time</span>
                        </span>
                        <div className="px-4 py-2.5 rounded-xl bg-emerald-400 text-slate-950 font-black text-lg sm:text-xl flex items-center space-x-2 shadow-lg ring-2 ring-emerald-300/50">
                          <Clock className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                          <span className="tracking-wide">{sched.timeFormatted}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* If Reschedule was proposed, show side-by-side comparison */}
                  {isReschedule && proposedSched && (
                    <div className="mt-4 pt-3.5 border-t border-purple-500/30">
                      <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 block mb-0.5">
                            Reschedule Proposal Comparison:
                          </span>
                          <div className="flex items-center space-x-2 flex-wrap text-slate-200">
                            <span className="line-through text-slate-400">
                              {sched.weekday}, {sched.fullDateFormatted} at {sched.timeFormatted}
                            </span>
                            <span className="text-purple-400 font-bold">➔</span>
                            <span className="font-black text-purple-200 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-400/40">
                              {proposedSched.weekday}, {proposedSched.fullDateFormatted} at {proposedSched.timeFormatted}
                            </span>
                          </div>
                          {pendingApt.rescheduleReason && (
                            <p className="text-[11px] text-purple-300/90 mt-1">
                              <strong>Reason:</strong> {pendingApt.rescheduleReason}
                              {pendingApt.rescheduleNotes ? ` — "${pendingApt.rescheduleNotes}"` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Purpose / Clinical Indication Box */}
                <div className="mb-4 p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs">
                  <div className="flex items-center space-x-2 mb-1.5 text-emerald-400 font-bold">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="text-[11px] uppercase tracking-wider font-extrabold">Clinical Indication & Purpose:</span>
                  </div>
                  <p className="text-slate-100 font-medium leading-relaxed sm:text-sm">
                    {pendingApt.purpose}
                  </p>
                </div>

                {/* Inline Decline / Reschedule Drawer */}
                {isDeclineRescheduleOpen ? (
                  <div className="mt-3 p-4 rounded-2xl bg-black/60 border border-white/15 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-rose-300">
                        Decline or Propose Alternate Reschedule
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsDeclineRescheduleOpen(false)}
                        className="text-xs text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Clinical Reason</label>
                      <select
                        value={aptDeclineReason}
                        onChange={(e) => setAptDeclineReason(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${
                          isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="Not available on this day">Not available on this day</option>
                        <option value="In surgery / clinical rounds">In surgery / clinical rounds</option>
                        <option value="Quarantine / enclosure restriction">Quarantine / enclosure restriction</option>
                        <option value="Emergency clinical priority">Emergency clinical priority</option>
                        <option value="Off-duty / clinic closed">Off-duty / clinic closed</option>
                        <option value="Other clinical reason">Other clinical reason</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Notes / Remarks for Admin</label>
                      <input
                        type="text"
                        value={aptDeclineNotes}
                        onChange={(e) => setAptDeclineNotes(e.target.value)}
                        placeholder="Add note for Admin..."
                        className={`w-full px-3 py-2 rounded-xl text-xs border ${
                          isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    {/* Checkbox to Reschedule */}
                    <label className="flex items-center space-x-2 text-xs font-bold cursor-pointer text-slate-200">
                      <input
                        type="checkbox"
                        checked={isProposingReschedule}
                        onChange={(e) => setIsProposingReschedule(e.target.checked)}
                        className="rounded accent-emerald-500 w-4 h-4"
                      />
                      <span>Propose a Rescheduled Date & Time to Admin</span>
                    </label>

                    {isProposingReschedule && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Proposed Date</label>
                          <input
                            type="date"
                            value={proposedDate}
                            onChange={(e) => setProposedDate(e.target.value)}
                            className={`w-full px-3 py-1.5 rounded-xl text-xs font-bold border ${
                              isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Proposed Time</label>
                          <select
                            value={proposedTime}
                            onChange={(e) => setProposedTime(e.target.value)}
                            className={`w-full px-3 py-1.5 rounded-xl text-xs font-bold border ${
                              isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            <option value="09:00 AM">09:00 AM</option>
                            <option value="10:00 AM">10:00 AM</option>
                            <option value="10:30 AM">10:30 AM</option>
                            <option value="11:15 AM">11:15 AM</option>
                            <option value="01:30 PM">01:30 PM</option>
                            <option value="02:30 PM">02:30 PM</option>
                            <option value="03:45 PM">03:45 PM</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsDeclineRescheduleOpen(false)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmDeclineOrReschedule(pendingApt)}
                        className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white active:scale-95 shadow-md transition-all cursor-pointer"
                      >
                        {isProposingReschedule ? 'Send Reschedule Proposal' : 'Confirm Decline'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Primary Action Buttons */
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleAcceptAppointment(pendingApt)}
                      className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-black rounded-xl shadow-lg active:scale-95 transition-all flex items-center space-x-2 cursor-pointer ring-2 ring-emerald-300/40 hover:ring-emerald-300"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>
                        {pendingApt.status === 'Reschedule Requested'
                          ? 'Accept Rescheduled Schedule'
                          : 'Accept & Confirm Appointment'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsDeclineRescheduleOpen(true);
                        setProposedDate(pendingApt.date || '');
                        setProposedTime(pendingApt.time || '10:00 AM');
                      }}
                      className="px-5 py-3 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-2 border-rose-500/50 hover:border-rose-400 text-xs sm:text-sm font-black rounded-xl active:scale-95 transition-all flex items-center space-x-2 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 stroke-[2.5]" />
                      <span>Decline / Reschedule</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* VET-SUBMITTED FOLLOW-UP REQUEST (AWAITING ADMIN AUTHORIZATION - NO VET ACCEPT BUTTON) */}
          {!pendingApt && !upcomingApprovedApt && pendingVetFollowup && (() => {
            const sched = parseScheduleDetails(pendingVetFollowup.date, pendingVetFollowup.time);
            return (
              <div className={`p-5 sm:p-6 rounded-3xl border-2 transition-all shadow-xl relative overflow-hidden ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-[#1a1403] via-[#120e02] to-[#0a0701] border-amber-500/80 ring-2 ring-amber-400/20 text-white shadow-amber-950/80' 
                  : 'bg-gradient-to-br from-amber-50 via-white to-amber-50/70 border-amber-400 text-amber-950 shadow-md'
              }`}>
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-400" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-amber-500/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-sm">
                      <Clock className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-black text-base sm:text-lg tracking-tight text-white">
                          Follow-up Request Submitted
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          ⏳ Awaiting Admin Authorization
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {pendingVetFollowup.type} • Requested by <strong className="text-white">{resolveVeterinarianName(pendingVetFollowup.requestedBy, staffMembers)}</strong>
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    Priority: {pendingVetFollowup.priority}
                  </span>
                </div>

                {/* Schedule details */}
                <div className={`my-4 p-4 rounded-2xl border transition-all ${
                  isDarkMode
                    ? 'bg-[#0f0c03] border-amber-500/40 text-white'
                    : 'bg-amber-100/60 border-amber-300 text-amber-950'
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#1a1403] border-2 border-amber-400 shadow-md flex flex-col items-center justify-center shrink-0 overflow-hidden">
                        <div className="w-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase text-center py-0.5 tracking-wider">
                          {sched.monthShort}
                        </div>
                        <div className="text-xl font-black text-amber-500 dark:text-amber-400 leading-tight">
                          {sched.dayNum}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 leading-none pb-0.5">
                          {sched.year}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-slate-300">
                          Target Proposed Date & Time:
                        </div>
                        <div className="text-sm font-black text-white flex items-center space-x-2 mt-0.5">
                          <span>{sched.weekday}, {sched.fullDateFormatted}</span>
                          <span className="text-amber-400">•</span>
                          <span>{pendingVetFollowup.time}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Purpose: {pendingVetFollowup.purpose}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notice callout explaining admin authorization workflow */}
                <div className="p-3.5 rounded-2xl bg-amber-950/50 border border-amber-500/50 text-amber-200 text-xs flex items-start space-x-3">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-amber-300">Administrator Authorization Required</p>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      This follow-up checkup was requested by the Veterinarian. Facility Administrator (Eleanor Vance) must review and authorize this schedule before it appears as a confirmed clinical consultation on your schedule.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* CONFIRMED UPCOMING APPOINTMENT BANNER (When approved and no pending request) */}
          {!pendingApt && upcomingApprovedApt && (() => {
            const sched = parseScheduleDetails(upcomingApprovedApt.date, upcomingApprovedApt.time);
            return (
              <div className={`p-5 sm:p-6 rounded-3xl border-2 transition-all shadow-xl relative overflow-hidden ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-[#06291a] via-[#041d13] to-[#02120b] border-emerald-400 ring-2 ring-emerald-400/30 text-white shadow-emerald-950/80' 
                  : 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50 border-emerald-500 text-emerald-950 shadow-lg'
              }`}>
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-400" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-sm">
                      <CalendarCheck className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-black text-base sm:text-lg tracking-tight text-white">
                          Confirmed Clinical Examination
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                          ✓ Confirmed
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {upcomingApprovedApt.type} • Requested by <strong className="text-white">{upcomingApprovedApt.requestedBy || 'Admin'}</strong>
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    Priority: {upcomingApprovedApt.priority}
                  </span>
                </div>

                {/* THE SCHEDULE SPOTLIGHT */}
                <div className={`my-4 p-4 sm:p-4.5 rounded-2xl border-2 transition-all shadow-md ${
                  isDarkMode
                    ? 'bg-[#031d13] border-emerald-400 text-white shadow-emerald-950/70'
                    : 'bg-emerald-100/70 border-emerald-500 text-emerald-950'
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white dark:bg-[#02150e] border-2 border-emerald-400 shadow-lg flex flex-col items-center justify-center shrink-0 overflow-hidden">
                        <div className="w-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase text-center py-0.5 tracking-wider">
                          {sched.monthShort}
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-400 dark:text-emerald-300 leading-tight">
                          {sched.dayNum}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 leading-none pb-0.5">
                          {sched.year}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-emerald-400 text-slate-950 shadow-xs">
                            📅 Confirmed Date
                          </span>
                          {sched.relativeTag && (
                            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-xs">
                              ⚡ {sched.relativeTag}
                            </span>
                          )}
                        </div>
                        
                        <div className="text-base sm:text-xl font-black tracking-tight text-white mt-1.5 flex items-center flex-wrap gap-2">
                          <span className="text-emerald-400">{sched.weekday},</span>
                          <span className="text-white">{sched.fullDateFormatted}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-start md:self-center shrink-0">
                      <div className="flex flex-col items-start md:items-end">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300/80 mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span>Confirmed Time</span>
                        </span>
                        <div className="px-4 py-2.5 rounded-xl bg-emerald-400 text-slate-950 font-black text-lg sm:text-xl flex items-center space-x-2 shadow-lg ring-2 ring-emerald-300/50">
                          <Clock className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                          <span className="tracking-wide">{sched.timeFormatted}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {upcomingApprovedApt.purpose && (
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200">
                    <strong className="text-emerald-300 block mb-1">Purpose / Indication:</strong>
                    {upcomingApprovedApt.purpose}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="grid grid-cols-1 gap-5">
          {/* FULL WIDTH COLUMN: Basic Information & Keeper Observations */}
          <div className="space-y-5">
            {/* Card 1: Basic Information */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-[#06180F] border-emerald-950/80 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-emerald-950/40">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-sm sm:text-base">Basic Information</h3>
                </div>

                <button
                  onClick={() => setIsEditingDetails(true)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    isDarkMode 
                      ? 'bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800/80' 
                      : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Edit Details</span>
                </button>
              </div>

              {/* 2-column layout inside Basic Information: Left keys/values, Right photo gallery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Left key-value items */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-emerald-950/20">
                    <span className="text-slate-400 font-semibold">Animal ID</span>
                    <span className="font-mono font-bold text-emerald-400">{animal.id}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-emerald-950/20">
                    <span className="text-slate-400 font-semibold">Name (Optional)</span>
                    <span className="font-bold">{animal.name || 'None'}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-emerald-950/20">
                    <span className="text-slate-400 font-semibold">Species</span>
                    <span className="font-bold">{animal.species}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-emerald-950/20">
                    <span className="text-slate-400 font-semibold">Morph / Breed</span>
                    <span className="font-bold">{animal.morph || 'Normal'}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-emerald-950/20">
                    <span className="text-slate-400 font-semibold">Sex</span>
                    <span className={`font-bold flex items-center space-x-1 ${
                      animal.sex === 'Male' ? 'text-blue-400' : 'text-rose-400'
                    }`}>
                      <span>{animal.sex === 'Male' ? '♂' : '♀'}</span>
                      <span>{animal.sex}</span>
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-emerald-950/20">
                    <span className="text-slate-400 font-semibold">Date of Birth (Est.)</span>
                    <span className="font-bold">{formatDateString(animal.dob)}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-emerald-950/20">
                    <span className="text-slate-400 font-semibold">Age (Auto)</span>
                    <span className="font-bold">{calculateAge(animal.dob)}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-emerald-950/20">
                    <span className="text-slate-400 font-semibold">Age Group</span>
                    <span className="font-bold">{getAgeGroup(animal.dob)}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-emerald-950/20">
                    <span className="text-slate-400 font-semibold">Date Acquired</span>
                    <span className="font-bold">{formatDateString(animal.dateAcquired)}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-400 font-semibold">Source</span>
                    <span className="font-bold">{animal.source || 'Local Breeder'}</span>
                  </div>
                </div>

                {/* Right photo gallery */}
                <div className="space-y-2.5">
                  {photos.length === 0 || !currentPhoto ? (
                    <div className="aspect-4/3 rounded-2xl overflow-hidden border border-dashed border-emerald-950/60 bg-slate-900/50 flex flex-col items-center justify-center p-4 text-center">
                      <ImageIcon className="w-8 h-8 text-slate-500 mb-1" />
                      <span className="text-xs font-bold text-slate-400">No Photo Uploaded</span>
                    </div>
                  ) : photos.length === 1 ? (
                    <div className="relative aspect-4/3 rounded-2xl overflow-hidden border border-emerald-950/60 bg-slate-900 group">
                      <img
                        src={currentPhoto}
                        alt={animal.name || animal.id}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    /* Big photo preview with counter and navigation */
                    <div className="relative aspect-4/3 rounded-2xl overflow-hidden border border-emerald-950/60 bg-slate-900 group">
                      <img
                        src={currentPhoto}
                        alt={animal.name || animal.id}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />

                      {/* Carousel navigation overlay */}
                      <div className="absolute inset-x-0 bottom-2 px-3 flex items-center justify-between pointer-events-none">
                        <button
                          type="button"
                          onClick={() => setActivePhotoIdx((activePhotoIdx - 1 + photos.length) % photos.length)}
                          className="p-1 rounded-full bg-black/60 hover:bg-black/80 text-white pointer-events-auto cursor-pointer transition-transform active:scale-95"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        <span className="px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-mono font-bold text-white shadow-xs">
                          {activePhotoIdx + 1} / {photos.length}
                        </span>

                        <button
                          type="button"
                          onClick={() => setActivePhotoIdx((activePhotoIdx + 1) % photos.length)}
                          className="p-1 rounded-full bg-black/60 hover:bg-black/80 text-white pointer-events-auto cursor-pointer transition-transform active:scale-95"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Thumbnail previews (if more than 1 photo) */}
                  {photos.length > 1 && (
                    <div className="grid grid-cols-2 gap-2">
                      {photos.slice(1, 3).filter(img => Boolean(img && img.trim())).map((img, i) => (
                        <div
                          key={i}
                          onClick={() => setActivePhotoIdx(i + 1)}
                          className={`aspect-4/3 rounded-xl overflow-hidden border cursor-pointer transition-all ${
                            activePhotoIdx === i + 1 ? 'border-emerald-400 ring-2 ring-emerald-500/40' : 'border-emerald-950/60 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Photo dashed button */}
                  <button
                    type="button"
                    onClick={() => setIsAddPhotoOpen(true)}
                    className="w-full py-2.5 rounded-xl border border-dashed border-emerald-500/50 hover:border-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-300 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Add Photo</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Keeper Daily Observations & Med Admin Logs */}
            {animal.keeperLogs && animal.keeperLogs.length > 0 && (
              <div className={`p-5 rounded-2xl border transition-all ${
                isDarkMode ? 'bg-[#06180F] border-emerald-950/80 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-950/40">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                    <ClipboardList className="w-4 h-4" />
                    <span>Keeper Field Observations & Logs</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {animal.keeperLogs.length} record{animal.keeperLogs.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
                  {animal.keeperLogs.map((log, idx) => (
                    <div 
                      key={log.id || idx}
                      className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                        isDarkMode ? 'bg-[#041209] border-emerald-950/80' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-slate-800 dark:text-white">
                          {log.date} {log.time ? `• ${log.time}` : ''}
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px]">
                          Logged by: {log.keeperName || 'Keeper Staff'}
                        </span>
                      </div>
                      {log.clinicalObservation && (
                        <p className="text-slate-600 dark:text-slate-300">
                          <strong className="text-slate-700 dark:text-slate-200">Obs:</strong> {log.clinicalObservation}
                        </p>
                      )}
                      {log.prescribedTreatment && (
                        <p className="text-slate-600 dark:text-slate-300">
                          <strong className="text-slate-700 dark:text-slate-200">Treatment:</strong> {log.prescribedTreatment} ({log.administrationStatus || 'Administered'})
                        </p>
                      )}
                      {log.notes && (
                        <p className="text-slate-500 dark:text-slate-400 italic text-[11px]">
                          Note: {log.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

      {/* TAB B: MEDICAL RECORDS (Clinical History) */}
      {activeTab === 'medical' && (
        <div className={`p-5 rounded-2xl border space-y-4 animate-fadeIn ${
          isDarkMode ? 'bg-[#06180F] border-emerald-950/80 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-emerald-950/40">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base">Clinical Medical Records</h3>
                <p className="text-[11px] text-slate-400">History of examinations, medications, and treatments recorded for {animal.name || animal.id}.</p>
              </div>
            </div>

            {(() => {
              const hasActiveReq = patientAppointments.some(a => a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'Declined');
              if (hasActiveReq) {
                return (
                  <button
                    onClick={() => onSelectAnimalForConsult(animal.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Authorized Consult</span>
                  </button>
                );
              }
              return (
                <div className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[11px] font-bold flex items-center space-x-1.5 shadow-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>🔒 Request Required to Consult</span>
                </div>
              );
            })()}
          </div>

          {patientRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Stethoscope className="w-8 h-8 mx-auto opacity-30 text-emerald-400" />
              <p className="font-bold text-xs text-slate-300">No medical records logged for this animal yet.</p>
              <p className="text-[11px]">Click "Log Consultation" above to record a new clinical observation or prescription.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {patientRecords.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950/60' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-emerald-950/20 pb-2">
                    <span className="font-bold text-emerald-400">{rec.recordType || 'Medical Examination'}</span>
                    <span className="font-mono text-slate-400 text-[10px]">{formatDateString(rec.recordDate)}</span>
                  </div>
                  <p><strong>Purpose:</strong> {rec.purpose}</p>
                  <p><strong>Clinical Observation:</strong> {rec.clinicalObservation}</p>
                  <p><strong>Prescribed Treatment:</strong> <span className="text-emerald-300">{rec.treatment}</span></p>
                  <p className="text-[10px] text-slate-400">Attending Veterinarian: {rec.veterinarian}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB C: REQUEST FOLLOW-UP FORM */}
      {activeTab === 'request-followup' && (
        <div className={`p-5 rounded-2xl border space-y-4 max-w-2xl mx-auto animate-fadeIn ${
          isDarkMode ? 'bg-[#06180F] border-emerald-950/80 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center space-x-2.5 pb-3 border-b border-emerald-950/40">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CalendarPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">Schedule Veterinary Follow-up / Examination</h3>
              <p className="text-[11px] text-slate-400">Schedule an upcoming clinical checkup for {animal.name || animal.id}.</p>
            </div>
          </div>

          {aptFeedback && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{aptFeedback}</span>
            </div>
          )}

          <form onSubmit={handleCreateFollowupRequest} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Examination Type *</label>
                <select
                  value={aptType}
                  onChange={(e) => setAptType(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-bold focus:outline-none ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="Routine Check-up">Routine Check-up</option>
                  <option value="Medical Examination">Medical Examination</option>
                  <option value="Follow-up Examination">Follow-up Examination</option>
                  <option value="Treatment Session">Treatment Session</option>
                  <option value="Quarantine Evaluation">Quarantine Evaluation</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Priority Level *</label>
                <select
                  value={aptPriority}
                  onChange={(e) => setAptPriority(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-xl border font-bold focus:outline-none ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>
            </div>

            {aptType === 'Other' && (
              <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20">
                <label className="block font-bold text-emerald-400 mb-1">Specify Examination Type *</label>
                <input
                  type="text"
                  value={aptCustomType}
                  onChange={(e) => setAptCustomType(e.target.value)}
                  placeholder="e.g. Ultrasound, Tail Skin Check, Stool Microscopy..."
                  required={aptType === 'Other'}
                  className={`w-full px-3 py-2 rounded-xl border font-semibold focus:outline-none ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-900 text-white' : 'bg-white border-emerald-300 text-slate-800'
                  }`}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Scheduled Date *</label>
                <input
                  type="date"
                  value={aptDate}
                  onChange={(e) => setAptDate(e.target.value)}
                  required
                  className={`w-full px-3 py-2 rounded-xl border font-bold focus:outline-none ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Scheduled Time *</label>
                <input
                  type="text"
                  value={aptTime}
                  onChange={(e) => setAptTime(e.target.value)}
                  placeholder="e.g. 10:00 AM"
                  required
                  className={`w-full px-3 py-2 rounded-xl border font-bold focus:outline-none ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Clinical Notes / Rationale</label>
              <textarea
                value={aptNotes}
                onChange={(e) => setAptNotes(e.target.value)}
                placeholder="State the clinical reasoning, symptoms to re-evaluate, or required medical supplies..."
                rows={3}
                className={`w-full p-3 rounded-xl border font-medium focus:outline-none ${
                  isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Schedule Follow-up Examination</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB D: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className={`p-5 rounded-2xl border space-y-4 animate-fadeIn ${
          isDarkMode ? 'bg-[#06180F] border-emerald-950/80 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-emerald-950/40">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base">Medical Documents & Certificates</h3>
                <p className="text-[11px] text-slate-400">Diagnostic lab files, quarantine clearances, and health certificates.</p>
              </div>
            </div>

            <button
              onClick={() => setIsAddDocOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-md"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Attach Document</span>
            </button>
          </div>

          {attachedDocs.length === 0 ? (
            <div className={`p-8 text-center text-xs rounded-2xl border border-dashed ${
              isDarkMode ? 'border-emerald-950/80 bg-[#04110A]/50 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}>
              <FileText className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
              <p className="font-bold text-slate-300">No Documents Attached Yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Upload medical records, quarantine clearance certificates, or lab reports by clicking <strong className="text-emerald-400">Attach Document</strong> above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attachedDocs.map((doc, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950/60' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold truncate text-slate-200">{doc.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{doc.type} • {doc.size} • {doc.date}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-900/60 px-2 py-0.5 rounded-md">
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
        </div>
      </div>

      {/* EDIT BASIC INFO MODAL */}
      {isEditingDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-emerald-950/40">
              <h3 className="font-extrabold text-sm sm:text-base">Edit Patient Details</h3>
              <button onClick={() => setIsEditingDetails(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedDetails} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Weight (grams)</label>
                  <input
                    type="number"
                    value={editWeight}
                    onChange={(e) => setEditWeight(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Length (cm)</label>
                  <input
                    type="number"
                    value={editLength}
                    onChange={(e) => setEditLength(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Breeding Status</label>
                  <select
                    value={editBreedingStatus}
                    onChange={(e) => setEditBreedingStatus(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Unassessed">Unassessed</option>
                    <option value="Ready for Pairing">Ready for Pairing</option>
                    <option value="Resting">Resting</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Underweight">Underweight</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Source</label>
                  <input
                    type="text"
                    value={editSource}
                    onChange={(e) => setEditSource(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Estimated DOB</label>
                  <input
                    type="date"
                    value={editDob}
                    max={editDateAcquired || new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditDob(val);
                      if (val && editDateAcquired && new Date(editDateAcquired) < new Date(val)) {
                        setEditDateError(`Date Acquired cannot be earlier than DOB.`);
                      } else {
                        setEditDateError(null);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Date Acquired</label>
                  <input
                    type="date"
                    value={editDateAcquired}
                    min={editDob || undefined}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditDateAcquired(val);
                      if (editDob && val && new Date(val) < new Date(editDob)) {
                        setEditDateError(`Date Acquired cannot be earlier than DOB.`);
                      } else {
                        setEditDateError(null);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {editDateError && (
                <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-900/80 text-red-300 text-xs font-semibold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{editDateError}</span>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditingDetails(false)}
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

      {/* ADD PHOTO MODAL */}
      {isAddPhotoOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4 ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-emerald-950/40">
              <h3 className="font-extrabold text-sm sm:text-base">Add Photo for {animal.id}</h3>
              <button onClick={() => setIsAddPhotoOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPhotoSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Select Photo File</label>
                <input
                  type="file"
                  accept="image/*"
                  id="vet-photo-upload-file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setNewPhotoFileBase64(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <label
                  htmlFor="vet-photo-upload-file"
                  className="w-full py-6 px-4 rounded-2xl border-2 border-dashed border-emerald-800/60 hover:border-emerald-500 bg-[#04110A] flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-emerald-950/30 group"
                >
                  {newPhotoFileBase64 ? (
                    <div className="flex flex-col items-center space-y-2">
                      <img
                        src={newPhotoFileBase64}
                        alt="Preview"
                        className="w-24 h-24 rounded-xl object-cover border border-emerald-500 shadow-md"
                      />
                      <span className="text-emerald-400 font-bold text-xs flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Photo chosen • Click to change file</span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2 text-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-950/80 flex items-center justify-center text-emerald-400 border border-emerald-800/60 group-hover:scale-105 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs">Click to browse file</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">JPEG, PNG, WEBP or GIF from your device</p>
                      </div>
                    </div>
                  )}
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewPhotoFileBase64('');
                    setIsAddPhotoOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPhotoFileBase64}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold cursor-pointer shadow-md flex items-center space-x-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Save Specimen Photo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD DOCUMENT MODAL */}
      {isAddDocOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4 ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-emerald-950/40">
              <h3 className="font-extrabold text-sm sm:text-base">Attach Medical Document</h3>
              <button onClick={() => setIsAddDocOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDocumentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Document Title</label>
                <input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="e.g. CBC_Bloodwork_Results"
                  required
                  className={`w-full px-3 py-2 rounded-xl border font-bold ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Document Classification</label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-bold ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="Diagnostic Lab Bloodwork">Diagnostic Lab Bloodwork</option>
                  <option value="Veterinary Health Certificate">Veterinary Health Certificate</option>
                  <option value="Quarantine Clearance Certificate">Quarantine Clearance Certificate</option>
                  <option value="Specimen Tag Registration">Specimen Tag Registration</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDocOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md"
                >
                  Attach File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
