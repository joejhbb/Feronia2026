import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Activity,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Pill,
  Stethoscope,
  Scale,
  Utensils,
  FileText,
  Plus,
  Eye,
  Camera,
  Upload,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Thermometer,
  Droplets,
  Award,
  Sparkles,
  Star,
  ClipboardList,
  Check,
  Package,
  Sliders,
  Heart,
  Ruler,
  Home,
  MapPin,
  FileCheck,
  Puzzle,
  MoreVertical,
  RotateCcw,
  BookOpen,
  Sun,
  Flame,
  Zap,
  Info,
  ArrowRight
} from 'lucide-react';
import {
  Animal,
  Enclosure,
  Task,
  Appointment,
  InventoryItem,
  KeeperLogEntry,
  StaffMember,
  BreedingRecord,
  BreedingObservationLog,
  BreedingLifecycleStatus,
  getAppointmentRequesterInfo,
  resolveVeterinarianName
} from '../../types';
import { getUnifiedAnimalCare } from '../../utils/careUtils';
import { findSpeciesBreedingStandard } from '../../utils/breedingStandards';
import { calculatePreciseAge, getEffectiveSystemDate } from '../../utils/timeUtils';

interface KeeperAnimalDetailModalProps {
  animal: Animal;
  onClose: () => void;
  enclosure?: Enclosure;
  tasks: Task[];
  appointments?: Appointment[];
  staffMembers?: StaffMember[];
  inventory?: InventoryItem[];
  profileName?: string;
  isDarkMode?: boolean;
  initialTab?: 'overview' | 'care-guide' | 'observations' | 'breeding';
  animals?: Animal[];
  breedingRecords?: BreedingRecord[];
  onUpdateBreedingRecord?: (record: BreedingRecord) => void;
  onAddBreedingRecord?: (record: BreedingRecord) => void;
  onUpdateAnimal: (updated: Animal) => void;
  onOpenMedAdminModal?: (animalId: string) => void;
  onOpenHealthVetModal?: (animalId: string) => void;
  onAddAppointment?: (appointment: Appointment) => void;
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

export const KeeperAnimalDetailModal: React.FC<KeeperAnimalDetailModalProps> = ({
  animal,
  onClose,
  enclosure,
  tasks,
  appointments = [],
  staffMembers = [],
  inventory = [],
  profileName = 'Animal Keeper',
  isDarkMode = true,
  initialTab = 'overview',
  animals = [],
  breedingRecords = [],
  onUpdateBreedingRecord,
  onAddBreedingRecord,
  onUpdateAnimal,
  onOpenMedAdminModal,
  onOpenHealthVetModal,
  onAddAppointment
}) => {
  // Tabs: Overview | Care Guide | Observations | Breeding
  const [activeTab, setActiveTab] = useState<'overview' | 'care-guide' | 'observations'>(initialTab === 'breeding' ? 'observations' : initialTab);
  const [observationSubTab, setObservationSubTab] = useState<'daily' | 'breeding'>(initialTab === 'breeding' ? 'breeding' : 'daily');
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Notes state
  const [notesText, setNotesText] = useState(animal.notes || '');
  const [savedNotesFeedback, setSavedNotesFeedback] = useState<string | null>(null);

  // Three-dots menu & submodals
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isAddPhotoOpen, setIsAddPhotoOpen] = useState(false);
  const [isRecordWeightOpen, setIsRecordWeightOpen] = useState(false);
  const [newPhotoFileBase64, setNewPhotoFileBase64] = useState<string>('');

  // Breeding state & form hooks
  const [isAddingBreedingLog, setIsAddingBreedingLog] = useState(false);
  const [breedingObsType, setBreedingObsType] = useState<BreedingObservationLog['type']>('Behavior');
  const [breedingObsNotes, setBreedingObsNotes] = useState('');
  const [breedingObsNesting, setBreedingObsNesting] = useState(false);
  const [breedingObsTailFlagging, setBreedingObsTailFlagging] = useState(false);
  const [breedingObsSwelling, setBreedingObsSwelling] = useState(false);
  const [breedingObsAggression, setBreedingObsAggression] = useState<'None' | 'Mild' | 'Moderate' | 'Severe'>('None');
  const [breedingObsWeightChange, setBreedingObsWeightChange] = useState<string>('');
  
  // Clutch & Hatch Reporting Modals
  const [isClutchReportModalOpen, setIsClutchReportModalOpen] = useState(false);
  const [clutchDateInput, setClutchDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [clutchSizeInput, setClutchSizeInput] = useState<string>('8');
  const [fertileEggsInput, setFertileEggsInput] = useState<string>('7');
  const [infertileEggsInput, setInfertileEggsInput] = useState<string>('1');
  const [incubatorUnitInput, setIncubatorUnitInput] = useState<string>('Incubator Unit A');

  const [isHatchReportModalOpen, setIsHatchReportModalOpen] = useState(false);
  const [hatchDateInput, setHatchDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [hatchlingsInput, setHatchlingsInput] = useState<string>('7');

  // Edit details form state
  const [editName, setEditName] = useState(animal.name || '');
  const [editMorph, setEditMorph] = useState(animal.morph || '');
  const [editSex, setEditSex] = useState<'Male' | 'Female'>(animal.sex || 'Male');
  const [editWeight, setEditWeight] = useState(animal.weight || 0);
  const [editLength, setEditLength] = useState(animal.length || 0);
  const [editHealthStatus, setEditHealthStatus] = useState(animal.healthStatus || 'Healthy');
  const [editBreedingStatus, setEditBreedingStatus] = useState(animal.breedingStatus || 'Unassessed');
  const [editSource, setEditSource] = useState(animal.source || 'Local Breeder');
  const [editDob, setEditDob] = useState(animal.dob || '');
  const [editDateAcquired, setEditDateAcquired] = useState(animal.dateAcquired || '');
  const [editDateError, setEditDateError] = useState<string | null>(null);

  // Quick weight update form
  const [newWeightInput, setNewWeightInput] = useState<string>(animal.weight ? animal.weight.toString() : '');
  const [newLengthInput, setNewLengthInput] = useState<string>(animal.length ? animal.length.toString() : '');
  const [weightNotes, setWeightNotes] = useState<string>('');

  // Inline Keeper Log Form (Observations Tab)
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [logType, setLogType] = useState<KeeperLogEntry['logType']>('Observation');
  const [logPriority, setLogPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Low');
  const [logNotes, setLogNotes] = useState('');
  const [logClinicalObs, setLogClinicalObs] = useState('');
  const [logFeedItem, setLogFeedItem] = useState('');
  const [logFeedAmount, setLogFeedAmount] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'feeding' | 'clinical'>('all');

  const standard = findSpeciesBreedingStandard(animal.species);
  const care = getUnifiedAnimalCare(animal, enclosure, tasks);

  // Active & Past Breeding Records for this Animal
  const activeBreedingRecord = breedingRecords.find(b => 
    (b.femaleId === animal.id || b.maleId === animal.id) &&
    b.status !== 'FAILED' &&
    b.status !== 'COMPLETED' &&
    b.status !== 'SUCCESSFUL'
  );
  const partnerId = activeBreedingRecord ? (activeBreedingRecord.femaleId === animal.id ? activeBreedingRecord.maleId : activeBreedingRecord.femaleId) : null;
  const partnerAnimal = partnerId ? animals.find(a => a.id === partnerId) : null;
  const pastBreedingRecords = breedingRecords.filter(b => 
    (b.femaleId === animal.id || b.maleId === animal.id) &&
    b.id !== activeBreedingRecord?.id
  );

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Associated pending & authorized appointments for this animal
  const animalAppointments = appointments.filter(apt => apt.animalId === animal.id);

  const pendingAppointments = animalAppointments.filter(a => a.status === 'Pending Approval' || a.status === 'Pending' || a.status === 'Reschedule Requested');
  const approvedAppointments = animalAppointments.filter(a => a.status === 'Approved' || a.status === 'Ongoing');

  // Associated tasks for this animal
  const animalTasks = tasks.filter(t => t.animalId === animal.id);

  // Photos list
  const basePhoto = (animal.image || animal.imageUrl || animal.photoUrl || '').trim();
  const rawExtraPhotos: string[] = (animal as any).photos || (animal as any).additionalImages || [];
  const photos: string[] = [
    ...(basePhoto ? [basePhoto] : []),
    ...rawExtraPhotos.filter(p => typeof p === 'string' && p.trim().length > 0 && p.trim() !== basePhoto)
  ];
  const currentPhoto: string | null = photos.length > 0 ? (photos[activePhotoIdx] || photos[0]) : null;

  // All keeper logs (unified from animal.keeperLogs and tasks/history)
  const existingLogs: KeeperLogEntry[] = animal.keeperLogs || [];
  const taskLogs: KeeperLogEntry[] = animalTasks.filter(t => t.status === 'Completed').map(t => ({
    id: `task-log-${t.id}`,
    animalId: animal.id,
    date: t.date || new Date().toISOString().split('T')[0],
    time: '11:00 AM',
    keeperName: t.completedBy || t.assignedByName || profileName,
    logType: t.type === 'Feeding' ? 'Feeding Log' : 'General Care',
    notes: `Completed task: ${t.title}. ${t.notes || ''}`,
    createdAt: t.createdAt || new Date().toISOString()
  }));

  const allLogs: KeeperLogEntry[] = [...existingLogs, ...taskLogs].sort((a, b) => {
    const dA = new Date(`${a.date} ${a.time || '12:00'}`).getTime();
    const dB = new Date(`${b.date} ${b.time || '12:00'}`).getTime();
    return dB - dA;
  });

  const filteredLogs = allLogs.filter(log => {
    if (logFilter === 'all') return true;
    if (logFilter === 'feeding') return log.logType === 'Feeding Log';
    if (logFilter === 'clinical') return log.logType === 'Clinical Checkup' || log.logType === 'Medicine Administration';
    return true;
  });

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditingDetails) setIsEditingDetails(false);
        else if (isAddPhotoOpen) setIsAddPhotoOpen(false);
        else if (isRecordWeightOpen) setIsRecordWeightOpen(false);
        else if (isOptionsOpen) setIsOptionsOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isEditingDetails, isAddPhotoOpen, isRecordWeightOpen, isOptionsOpen]);

  // Handle Save Notes
  const handleSaveNotes = () => {
    onUpdateAnimal({
      ...animal,
      notes: notesText
    });
    setSavedNotesFeedback('✓ Keeper notes saved successfully!');
    setTimeout(() => setSavedNotesFeedback(null), 3500);
  };

  // Handle Save Edited Details
  const handleSaveEditedDetails = (e: React.FormEvent) => {
    e.preventDefault();

    if (editDob && editDateAcquired && new Date(editDateAcquired) < new Date(editDob)) {
      setEditDateError(`Invalid dates: Date Acquired (${editDateAcquired}) cannot be earlier than Date of Birth (${editDob}).`);
      return;
    }
    setEditDateError(null);

    onUpdateAnimal({
      ...animal,
      name: editName.trim() || undefined,
      morph: editMorph.trim() || animal.morph,
      sex: editSex,
      weight: Number(editWeight),
      length: Number(editLength),
      healthStatus: editHealthStatus,
      breedingStatus: editBreedingStatus as any,
      source: editSource,
      dob: editDob,
      dateAcquired: editDateAcquired
    });
    setIsEditingDetails(false);
    showToast('✓ Specimen details updated successfully!');
  };

  // Handle Add Photo Submit
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
    showToast('✓ Specimen photo updated!');
  };

  // Handle Weight & Length Save
  const handleRecordWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numWeight = parseFloat(newWeightInput);
    const numLength = parseFloat(newLengthInput);

    if (isNaN(numWeight) || numWeight <= 0) {
      alert('Please enter a valid weight in grams.');
      return;
    }

    const prevWeight = animal.weight || 0;
    const diff = numWeight - prevWeight;
    const diffText = prevWeight > 0 
      ? `(${diff >= 0 ? '+' : ''}${diff.toFixed(1)}g change)` 
      : '(Baseline recorded)';

    const todayDate = new Date().toISOString().split('T')[0];
    const newLogEntry: KeeperLogEntry = {
      id: `weight-log-${Date.now()}`,
      animalId: animal.id,
      date: todayDate,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      keeperName: profileName,
      logType: 'General Care',
      notes: `Scale check: ${numWeight}g ${diffText}. Length: ${numLength || animal.length || 0}cm. ${weightNotes ? `Observations: ${weightNotes}` : 'Normal body condition.'}`,
      clinicalObservation: weightNotes || `Routine weight check recorded by ${profileName}`,
      createdAt: new Date().toISOString()
    };

    onUpdateAnimal({
      ...animal,
      weight: numWeight,
      length: numLength || animal.length,
      keeperLogs: [newLogEntry, ...(animal.keeperLogs || [])]
    });

    setIsRecordWeightOpen(false);
    setWeightNotes('');
    showToast(`✓ Recorded new weight of ${numWeight}g ${diffText}!`);
  };

  // Handle Add Keeper Observation Log
  const handleAddKeeperLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logNotes.trim() && !logClinicalObs.trim() && !logFeedItem.trim()) return;

    const todayDate = new Date().toISOString().split('T')[0];
    let constructedNotes = logNotes;
    if (logType === 'Feeding Log' && logFeedItem) {
      constructedNotes = `Food Offered: ${logFeedAmount || '1 portion'} of ${logFeedItem}. ${logNotes ? `Response/Notes: ${logNotes}` : 'Consumed readily.'}`;
    }

    const newLogEntry: KeeperLogEntry = {
      id: `keeper-log-${Date.now()}`,
      animalId: animal.id,
      date: todayDate,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      keeperName: profileName,
      logType: logType,
      priority: logPriority,
      notes: constructedNotes.trim() || 'Daily check conducted and verified normal.',
      clinicalObservation: logClinicalObs.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    const updated = {
      ...animal,
      keeperLogs: [newLogEntry, ...(animal.keeperLogs || [])]
    };

    onUpdateAnimal(updated);

    // Forward keeper observation to Admin's Pending Approvals & Vet Scheduling Queue
    if (onAddAppointment) {
      const newApt: Appointment = {
        id: `APT-KP-OBS-${Date.now()}`,
        animalId: animal.id,
        type: logType === 'Clinical Checkup' ? 'Medical Examination' : 'Routine Check-up',
        veterinarian: resolveVeterinarianName(undefined, staffMembers),
        requestedBy: profileName || 'Keeper Staff',
        requestedByRole: 'keeper',
        date: todayDate,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        purpose: `[Keeper Observation • ${logType} • ${logPriority} Priority]: ${constructedNotes.trim() || logClinicalObs.trim() || 'Keeper observation submitted for Admin review.'}`,
        status: 'Pending Approval',
        priority: logPriority === 'Urgent' ? 'Emergency' : (logPriority === 'High' ? 'High' : 'Normal'),
        createdOn: todayDate
      };
      onAddAppointment(newApt);
    }

    setIsAddingLog(false);
    setLogNotes('');
    setLogClinicalObs('');
    setLogFeedItem('');
    setLogFeedAmount('');
    setLogPriority('Low');
    showToast('✓ Observation recorded & sent to Admin! Admin will review and schedule Vet/care actions.');
  };

  // Standard checks
  const minBreedingWeight = standard
    ? (animal.sex === 'Female' ? standard.minWeightGramsFemale : standard.minWeightGramsMale)
    : 200;
  const currentWeight = animal.weight || 0;
  const meetsWeight = currentWeight >= minBreedingWeight;
  const weightPercent = Math.min(100, Math.round((currentWeight / minBreedingWeight) * 100));

  const isHealthy = animal.healthStatus === 'Healthy';
  const isTreatment = animal.healthStatus === 'Under Treatment' || animal.healthStatus === 'Injured' || animal.healthStatus === 'Sick';
  const enclosureLocationText = enclosure ? `${enclosure.facility} • ${enclosure.name || enclosure.id}` : (animal.enclosureId || 'Unassigned Enclosure');

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className={`bg-white dark:bg-[#071F11] rounded-2xl sm:rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 dark:border-emerald-950/80 overflow-hidden flex flex-col h-[94vh] sm:h-[90vh] max-h-[96vh] relative animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOAST FEEDBACK */}
        {feedbackToast && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 text-center flex items-center justify-center space-x-2 animate-in fade-in shrink-0">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{feedbackToast}</span>
          </div>
        )}

        {/* TOP HEADER (Matching the Vet modal design from Image 2) */}
        <div className={`p-4 sm:p-5 border-b shrink-0 ${
          isDarkMode ? 'bg-[#071F11] border-emerald-950/80 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          {/* Subtitle tag & Close 'X' Button */}
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
              isDarkMode ? 'text-emerald-400' : 'text-emerald-800'
            }`}>
              Animals • Keeper Care & Observations
            </span>

            <button
              type="button"
              onClick={onClose}
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
                title="Click to change or add photo"
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

                <div className="flex items-center space-x-3 text-xs flex-wrap gap-y-1">
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{enclosureLocationText}</span>
                  </div>
                  {animal.assignedKeeperName && (
                    <div className="flex items-center space-x-1.5 text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shadow-2xs">
                      <Star className="w-3 h-3 fill-amber-400 shrink-0" />
                      <span>Assigned Keeper: {animal.assignedKeeperName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right action buttons matching Vet layout */}
            <div className="flex items-center space-x-2 shrink-0 flex-wrap">
              <button
                onClick={() => onOpenHealthVetModal ? onOpenHealthVetModal(animal.id) : setActiveTab('observations')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                  isDarkMode 
                    ? 'bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800/80' 
                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900'
                }`}
              >
                <Stethoscope className="w-4 h-4 text-emerald-400" />
                <span>Request Health & Vet</span>
              </button>

              <button
                onClick={() => onOpenMedAdminModal ? onOpenMedAdminModal(animal.id) : setActiveTab('observations')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95"
              >
                <Pill className="w-4 h-4" />
                <span>Administer Meds</span>
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
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors cursor-pointer ${
                          isDarkMode ? 'hover:bg-emerald-950/60 text-emerald-200' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Edit Details</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsOptionsOpen(false);
                          setIsRecordWeightOpen(true);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors cursor-pointer ${
                          isDarkMode ? 'hover:bg-emerald-950/60 text-emerald-200' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <Scale className="w-3.5 h-3.5 text-teal-400" />
                        <span>Record Weight</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsOptionsOpen(false);
                          setIsAddPhotoOpen(true);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors cursor-pointer ${
                          isDarkMode ? 'hover:bg-emerald-950/60 text-emerald-200' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Change Photo</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PINNED NAVIGATION TABS: EXACTLY Overview | Care Guide | Observations */}
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
            onClick={() => setActiveTab('care-guide')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'care-guide'
                ? (isDarkMode ? 'bg-[#08301D] text-emerald-300 border border-emerald-500/60 shadow-xs' : 'bg-emerald-800 text-white border border-emerald-700 shadow-xs')
                : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-emerald-950/30' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Care Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('observations')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'observations'
                ? (isDarkMode ? 'bg-[#08301D] text-emerald-300 border border-emerald-500/60 shadow-xs' : 'bg-emerald-800 text-white border border-emerald-700 shadow-xs')
                : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-emerald-950/30' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Observations</span>
            {allLogs.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
                {allLogs.length}
              </span>
            )}
            {pendingAppointments.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            )}
          </button>
        </div>

        {/* SCROLLABLE MODAL BODY */}
        <div className="overflow-y-auto min-h-0 flex-1 p-4 sm:p-6 space-y-6">

          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW (Exact matching layout from Vet Modal in Image 2)          */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* PENDING APPOINTMENT / VET REQUEST BANNER (If any exists) */}
              {pendingAppointments.length > 0 && (() => {
                const pendingApt = pendingAppointments[0];
                return (
                  <div className={`p-4 sm:p-5 rounded-2xl border-2 transition-all shadow-md relative overflow-hidden ${
                    isDarkMode 
                      ? 'bg-gradient-to-br from-[#201804] via-[#161003] to-[#0d0a02] border-amber-400 text-white' 
                      : 'bg-amber-50 border-amber-400 text-amber-950'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-amber-400/20">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                          <Eye className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-black text-sm sm:text-base text-white">
                              {pendingApt.status === 'Reschedule Requested' ? 'Appointment Reschedule In Progress' : 'Health & Clinical Consultation Requested'}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              Awaiting Admin Authorization
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {pendingApt.type} • Target Date: <strong className="text-white">{formatDateString(pendingApt.date)} ({pendingApt.time || '10:00 AM'})</strong>
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 self-start sm:self-center">
                        Priority: {pendingApt.priority}
                      </span>
                    </div>

                    <div className="mt-2.5 text-xs text-slate-200">
                      <span className="text-amber-300 font-bold uppercase tracking-wider text-[10px] block mb-0.5">Clinical Purpose / Observations:</span>
                      <p className="leading-relaxed">{pendingApt.purpose || 'Veterinary assessment requested by keeper.'}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Single Column Content (Basic Information & Notes & Logs) */}
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

                    {/* 2 columns inside Basic Information: Left keys/values, Right photo gallery */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Left key-value items */}
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-emerald-950/20">
                          <span className="text-slate-400 font-semibold">Animal ID</span>
                          <span className="font-mono font-bold text-emerald-400">{animal.id}</span>
                        </div>

                        <div className="flex justify-between py-1 border-b border-emerald-950/20">
                          <span className="text-slate-400 font-semibold">Assigned Care Keeper</span>
                          <span className="font-bold text-amber-400 flex items-center space-x-1">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{animal.assignedKeeperName || 'Unassigned (Sanctuary Pool)'}</span>
                          </span>
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
                          <div className="relative aspect-4/3 rounded-2xl overflow-hidden border border-emerald-950/60 bg-slate-900 group">
                            <img
                              src={currentPhoto}
                              alt={animal.name || animal.id}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />

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

                        {/* Add Photo dashed button */}
                        <button
                          type="button"
                          onClick={() => setIsAddPhotoOpen(true)}
                          className="w-full py-2.5 rounded-xl border border-dashed border-emerald-500/50 hover:border-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-300 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Add / Update Photo</span>
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

          {/* ========================================================================= */}
          {/* TAB 2: CARE GUIDE (Concise, User-Friendly Species Husbandry Guide)       */}
          {/* ========================================================================= */}
          {activeTab === 'care-guide' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Header Banner */}
              <div className="p-4 rounded-2xl bg-[#041f12] border border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                    <BookOpen className="w-4.5 h-4.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      Species Care Guide
                    </h3>
                    <p className="text-xs text-emerald-300/80">
                      Quick daily husbandry guidelines for <span className="font-bold text-white">{animal.species}</span> ({animal.scientificName || standard?.scientificName || 'Reptilia'})
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/70 text-emerald-300 text-[11px] font-bold self-start sm:self-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Daily Reference</span>
                </div>
              </div>

              {/* Grid of 4 Clean, Scannable Care Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Feeding & Diet */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-[#06180F] border-emerald-950/80 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <div className="flex items-center space-x-2.5 pb-2.5 mb-3 border-b border-emerald-950/40">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <Utensils className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="font-extrabold text-xs sm:text-sm">Feeding & Nutrition</h4>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* Primary Diet Box */}
                    <div className="p-3 rounded-xl bg-[#04110A] border border-emerald-900/40 space-y-1">
                      <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block">
                        Primary Diet & Schedule
                      </span>
                      <p className="text-slate-200 font-medium leading-relaxed">
                        {care.feeding.replace(/\[ID:.*?\]/g, '').trim()}
                      </p>
                    </div>

                    {/* Quick Rules */}
                    <div className="space-y-1.5">
                      <div className="flex items-start space-x-2 text-[11px] text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Water:</strong> Fresh, shallow dechlorinated water dish refreshed daily.</span>
                      </div>
                      <div className="flex items-start space-x-2 text-[11px] text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Supplements:</strong> Dust food with Calcium (without D3), add D3/multivitamin twice a month.</span>
                      </div>
                    </div>

                    {/* Foods to Avoid */}
                    <div className="pt-2 border-t border-emerald-950/40">
                      <span className="text-[10px] font-bold text-rose-400 block mb-1.5">🚫 Foods to Avoid:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {['Avocado', 'Rhubarb', 'Fireflies', 'Wild-caught Insects', 'Excess Spinach'].map(item => (
                          <span key={item} className="px-2 py-0.5 rounded-lg bg-rose-950/40 border border-rose-900/50 text-rose-300 text-[10px] font-semibold">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Temperature, Lighting & Environment */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-[#06180F] border-emerald-950/80 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <div className="flex items-center space-x-2.5 pb-2.5 mb-3 border-b border-emerald-950/40">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Sun className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="font-extrabold text-xs sm:text-sm">Climate & Lighting</h4>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* 3 Metric Chips */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-[#04110A] border border-amber-900/30">
                        <div className="flex items-center space-x-1.5 text-amber-400 mb-0.5">
                          <Thermometer className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase">Temperature</span>
                        </div>
                        <span className="font-bold text-white text-xs block">{care.temperature}</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#04110A] border border-cyan-900/30">
                        <div className="flex items-center space-x-1.5 text-cyan-400 mb-0.5">
                          <Droplets className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase">Humidity</span>
                        </div>
                        <span className="font-bold text-white text-xs block">{care.humidity}</span>
                      </div>
                    </div>

                    {/* Quick Guidelines */}
                    <div className="space-y-1.5">
                      <div className="flex items-start space-x-2 text-[11px] text-slate-300">
                        <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span><strong>Basking Spot:</strong> Check optimum surface temperature daily with infrared temp gun.</span>
                      </div>
                      <div className="flex items-start space-x-2 text-[11px] text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Photoperiod:</strong> 12 hours daylight (07:00–19:00) / 12 hours night darkness on timer.</span>
                      </div>
                      <div className="flex items-start space-x-2 text-[11px] text-slate-300">
                        <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span><strong>UVB Lighting:</strong> Linear T5 UVB tube active across basking gradient; replace every 10–12 mos.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Enclosure Hygiene & Routine */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-[#06180F] border-emerald-950/80 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <div className="flex items-center space-x-2.5 pb-2.5 mb-3 border-b border-emerald-950/40">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <FileCheck className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="font-extrabold text-xs sm:text-sm">Hygiene & Enclosure Care</h4>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#04110A] border border-emerald-900/40 space-y-1">
                      <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block">
                        Routine Maintenance
                      </span>
                      <p className="text-slate-200 font-medium leading-relaxed">
                        {care.careRoutine}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-start space-x-2 text-[11px] text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Daily Spot Cleaning:</strong> Remove waste and urates immediately with sanitized tongs.</span>
                      </div>
                      <div className="flex items-start space-x-2 text-[11px] text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Disinfection:</strong> Deep sanitize enclosure and wash furnishings on scheduled cycle.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Health Watchouts & Red Flags */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-[#06180F] border-emerald-950/80 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <div className="flex items-center space-x-2.5 pb-2.5 mb-3 border-b border-emerald-950/40">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="font-extrabold text-xs sm:text-sm">Health Watchouts & Warning Signs</h4>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-900/40 space-y-1.5">
                      <span className="text-[10px] font-bold text-rose-300 block">⚠️ Report to Vet if observing:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
                          <span>Refusing 2+ consecutive meals</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
                          <span>Wheezing or mouth breathing</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
                          <span>Lethargy or weakness</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
                          <span>Retained shed on toes/tail</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenHealthVetModal ? onOpenHealthVetModal(animal.id) : setActiveTab('observations')}
                      className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer shadow-md transition-all active:scale-95"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Request Health Check / Vet</span>
                    </button>
                  </div>
                </div>

                {/* 5. Breeding & Climate Conditioning Standards */}
                {standard && (
                  <div className={`p-4 rounded-2xl border transition-all md:col-span-2 ${
                    isDarkMode ? 'bg-[#06180F] border-emerald-950/80 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    <div className="flex items-center space-x-2.5 pb-2.5 mb-3 border-b border-emerald-950/40">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex items-center justify-between flex-1">
                        <h4 className="font-extrabold text-xs sm:text-sm">Species Breeding &amp; Climate Conditioning Standards</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-400">
                          {standard.code} • {standard.taxonomicFamily}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      {standard.preLayBehavioralIndicators && (
                        <div className="p-3 rounded-xl bg-[#141006] border border-amber-900/50 text-amber-200/90 space-y-1">
                          <span className="text-[10px] font-black uppercase text-amber-400 block tracking-wider">
                            ⚠️ Pre-Lay Behavioral Indicators:
                          </span>
                          <p className="italic text-[11px] leading-relaxed">
                            "{standard.preLayBehavioralIndicators}"
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="p-2 rounded-xl bg-[#04110A] border border-emerald-900/30">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Pairing Season</span>
                          <span className="font-bold text-emerald-400 text-xs block mt-0.5">{standard.pairingSeasonText}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#04110A] border border-cyan-900/30">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Cooling / Brumation</span>
                          <span className="font-bold text-cyan-400 text-xs block mt-0.5">{standard.coolingTempRange || standard.brumationCoolingRequired}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#04110A] border border-amber-900/30">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Incubation Climate</span>
                          <span className="font-bold text-amber-400 text-xs block mt-0.5">{standard.incubationTempTarget} ({standard.incubationHumidity})</span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#04110A] border border-purple-900/30">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Clutch / Incubation</span>
                          <span className="font-bold text-purple-400 text-xs block mt-0.5">{standard.avgClutchLitterSize} • {standard.incubationPeriod}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: OBSERVATIONS (Care & Log Entries Grid Layout matching screenshot)  */}
          {/* ========================================================================= */}
          {activeTab === 'observations' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Banner matching user image */}
              <div className="p-5 rounded-2xl bg-[#06180F] border border-emerald-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                    <Eye className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-white">Care & Log Entries</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Record daily observations and care activities for this animal.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 animate-in fade-in">
                  {/* Single General Observation Card */}
                  <div className="p-5 rounded-2xl bg-[#06180F] border border-emerald-950/80 hover:border-emerald-600/50 transition-all space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                          <Eye className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-base text-white">General Observation</h4>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                            Record health status, feeding activity, medication, or general observations for {animal.name || animal.id}.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsAddingLog(!isAddingLog)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isAddingLog ? 'Close Form' : 'Record Observation'}</span>
                      </button>
                    </div>

                    {/* Expandable Observation Form */}
                    {isAddingLog && (
                      <div className="pt-4 border-t border-emerald-950/80 space-y-3.5 animate-in fade-in duration-200">
                        <form onSubmit={handleAddKeeperLog} className="space-y-3 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-slate-400 font-bold mb-1">Observation Category</label>
                              <select
                                value={logType}
                                onChange={(e) => setLogType(e.target.value as KeeperLogEntry['logType'])}
                                className="w-full px-3 py-2 rounded-xl bg-[#04110A] border border-emerald-900 text-white font-semibold text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                              >
                                <option value="Observation">General Behavior & Notes</option>
                                <option value="Clinical Checkup">Health & Clinical Assessment</option>
                                <option value="Feeding Log">Feeding Log</option>
                                <option value="Medicine Administration">Medicine Administration</option>
                                <option value="General Care">General Care & Husbandry</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-slate-400 font-bold mb-1">Priority Level</label>
                              <select
                                value={logPriority}
                                onChange={(e) => setLogPriority(e.target.value as 'Low' | 'Medium' | 'High' | 'Urgent')}
                                className={`w-full px-3 py-2 rounded-xl bg-[#04110A] border font-bold text-xs focus:outline-none cursor-pointer transition-all ${
                                  logPriority === 'Urgent'
                                    ? 'border-rose-500/80 text-rose-300 bg-rose-950/20'
                                    : logPriority === 'High'
                                      ? 'border-amber-500/80 text-amber-300 bg-amber-950/20'
                                      : logPriority === 'Medium'
                                        ? 'border-cyan-500/80 text-cyan-300 bg-cyan-950/20'
                                        : 'border-emerald-900 text-slate-200'
                                }`}
                              >
                                <option value="Low">Low / Routine Check</option>
                                <option value="Medium">Medium / Monitor Closely</option>
                                <option value="High">High / Attention Needed</option>
                                <option value="Urgent">Urgent / Vet Attention Required</option>
                              </select>
                            </div>

                            {logType === 'Feeding Log' ? (
                              <div>
                                <label className="block text-slate-400 font-bold mb-1">Prey / Food Item</label>
                                <input
                                  type="text"
                                  value={logFeedItem}
                                  onChange={(e) => setLogFeedItem(e.target.value)}
                                  placeholder="e.g. 8 Medium Dubia Roaches, Fresh Mustard Greens"
                                  className="w-full px-3 py-2 rounded-xl bg-[#04110A] border border-emerald-900 text-white text-xs focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            ) : (
                              <div>
                                <label className="block text-slate-400 font-bold mb-1">Clinical Observation / Symptoms</label>
                                <input
                                  type="text"
                                  value={logClinicalObs}
                                  onChange={(e) => setLogClinicalObs(e.target.value)}
                                  placeholder="e.g. Active basking, clear eyes, normal tongue reflex"
                                  className="w-full px-3 py-2 rounded-xl bg-[#04110A] border border-emerald-900 text-white text-xs focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            )}
                          </div>

                          {logType === 'Feeding Log' && (
                            <div>
                              <label className="block text-slate-400 font-bold mb-1">Quantity / Amount Consumed</label>
                              <input
                                type="text"
                                value={logFeedAmount}
                                onChange={(e) => setLogFeedAmount(e.target.value)}
                                placeholder="e.g. 100% consumed, dusted with Calcium"
                                className="w-full px-3 py-2 rounded-xl bg-[#04110A] border border-emerald-900 text-white text-xs focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-slate-400 font-bold mb-1">Notes & Details</label>
                            <textarea
                              value={logNotes}
                              onChange={(e) => setLogNotes(e.target.value)}
                              placeholder="Detailed observations regarding behavior, appetite, locomotion..."
                              rows={2}
                              className="w-full p-3 rounded-xl bg-[#04110A] border border-emerald-900 text-white text-xs focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div className="flex justify-end space-x-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setIsAddingLog(false)}
                              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md"
                            >
                              Save Entry
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                  {/* Observation History Feed */}

              {/* LOG ENTRIES FEED */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 px-1">
                  Observation History ({filteredLogs.length})
                </h4>

                {filteredLogs.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#06180F] border border-emerald-950/80 text-center space-y-2">
                    <ClipboardList className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-400">No logs found matching filter</p>
                    <p className="text-[11px] text-slate-500">Click &quot;New Observation / Log&quot; above to record a new entry.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredLogs.map(log => (
                      <div
                        key={log.id}
                        className="p-4 rounded-xl bg-[#06180F] border border-emerald-950/80 hover:border-emerald-800/60 transition-all space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              log.logType === 'Feeding Log'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : log.logType === 'Clinical Checkup' || log.logType === 'Medicine Administration'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {log.logType}
                            </span>
                            <span className="text-slate-400 font-semibold">{log.date}</span>
                            {log.time && <span className="text-slate-500 font-mono text-[11px]">{log.time}</span>}
                          </div>

                          <span className="text-slate-400 text-[11px]">
                            Keeper: <strong className="text-emerald-300">{log.keeperName}</strong>
                          </span>
                        </div>

                        <p className="text-slate-200 leading-relaxed text-xs">
                          {log.notes}
                        </p>

                        {log.clinicalObservation && (
                          <div className="p-2 rounded-lg bg-[#04110A] border border-emerald-950/60 text-[11px] text-slate-300">
                            <span className="font-bold text-emerald-400 block mb-0.5">Clinical Observation:</span>
                            {log.clinicalObservation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM FOOTER STATUS */}
        <div className={`px-4 sm:px-6 py-3 border-t shrink-0 flex items-center justify-between text-xs ${
          isDarkMode ? 'bg-[#04110A] border-emerald-950 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Record ID: <strong className="text-white font-mono">{animal.id}</strong></span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-800 text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-MODAL 1: EDIT DETAILS (Matching Vet modal)                            */}
      {/* ========================================================================= */}
      {isEditingDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-emerald-950/40">
              <h3 className="font-extrabold text-sm sm:text-base">Edit Specimen Details ({animal.id})</h3>
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
                    placeholder="Specimen name..."
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
                    onChange={(e) => setEditSex(e.target.value as 'Male' | 'Female')}
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
                    <option value="Under Treatment">Under Treatment</option>
                    <option value="Injured">Injured</option>
                    <option value="Sick">Sick</option>
                    <option value="Quarantine">Quarantine</option>
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

      {/* ========================================================================= */}
      {/* SUB-MODAL 2: ADD / UPDATE PHOTO                                           */}
      {/* ========================================================================= */}
      {isAddPhotoOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4 ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-emerald-950/40">
              <h3 className="font-extrabold text-sm sm:text-base">Update Photo for {animal.id}</h3>
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
                  id="keeper-photo-upload-file"
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
                  htmlFor="keeper-photo-upload-file"
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
                        <span>Photo selected • Click to choose different file</span>
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

      {/* ========================================================================= */}
      {/* SUB-MODAL 3: RECORD WEIGHT                                                */}
      {/* ========================================================================= */}
      {isRecordWeightOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4 ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-emerald-950/40">
              <div className="flex items-center space-x-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <h3 className="font-extrabold text-sm sm:text-base">Record Scale Check ({animal.id})</h3>
              </div>
              <button onClick={() => setIsRecordWeightOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordWeightSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">New Weight (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newWeightInput}
                    onChange={(e) => setNewWeightInput(e.target.value)}
                    placeholder="e.g. 385"
                    required
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Length (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newLengthInput}
                    onChange={(e) => setNewLengthInput(e.target.value)}
                    placeholder="e.g. 46"
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Physical Observations</label>
                <textarea
                  value={weightNotes}
                  onChange={(e) => setWeightNotes(e.target.value)}
                  placeholder="e.g. Good muscle tone, fat pads visible at tail base..."
                  rows={3}
                  className={`w-full p-3 rounded-xl border font-medium ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRecordWeightOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md"
                >
                  Save Weight
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  </div>
  );
};

export default KeeperAnimalDetailModal;
