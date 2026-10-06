import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Shield, Activity, Calendar, Clock, ChevronDown, ChevronRight, ChevronLeft, Heart, ArrowLeftRight, FileText, Check, Plus, Trash2, Edit2, HelpCircle, FileDown, Upload, Sparkles, QrCode, CheckCircle2, PawPrint, Layout, ZoomIn, ZoomOut, RotateCcw, Sliders, Maximize2, Camera, Image as ImageIcon, Move, Filter, Utensils, Stethoscope, Repeat, Syringe, Package, FileCheck, Info, AlertTriangle, Thermometer, Droplets, Egg, Star, ArrowRight, ArrowLeft, Scale, Building2, ArrowDown, Paperclip, AlertCircle, FilePlus, Pill } from 'lucide-react';
import { Animal, Enclosure, Task, MedicalRecord, Appointment, BreedingRecord, BreedingAssessment, TransferRecord, InventoryItem, KeeperLogEntry, StaffMember, DeletedBreedingRecord, getAppointmentRequesterInfo, resolveVeterinarianName, resolveAdminName, resolveKeeperName } from '../../types';
import { getCroppedImg } from '../../utils/cropImage';
import { evaluateAnimalBreedingReadiness, evaluateBreedingPair, findSpeciesBreedingStandard, isEnclosureSpeciesCompatible, evaluateEnclosureClimateQualification, isEnclosureQualifiedForBreedingClimate, getEnclosureCapacityLimit, getEnclosureOccupants } from '../../utils/breedingStandards';
import { isBreedingRecordActive } from '../../utils/breedingStateMachine';
import { sortTasksByTime, calculatePreciseAge, getEffectiveSystemDate } from '../../utils/timeUtils';
import { BreedingWizardSection } from './breeding/BreedingWizardSection';
import EditAnimalModal from './EditAnimalModal';
import { DeleteAnimalConfirmModal } from './DeleteAnimalConfirmModal';
import { saveSpeciesScheduleTemplate, getSavedSpeciesScheduleTemplates, getTemplateForSpeciesAndAge, SpeciesScheduleTemplate } from '../../utils/careUtils';
import { EditTaskModal } from './EditTaskModal';
import { ConfirmApplyScheduleModal, ScheduleToConfirm } from './ConfirmApplyScheduleModal';

interface AnimalDetailOverlayProps {
  animal: Animal;
  onClose: () => void;
  enclosures: Enclosure[];
  onUpdateEnclosure?: (updated: Enclosure) => void;
  tasks: Task[];
  medicalRecords: MedicalRecord[];
  breedingRecords: BreedingRecord[];
  breedingAssessments?: BreedingAssessment[];
  onAddBreedingAssessment?: (assessment: BreedingAssessment) => void;
  onUpdateBreedingAssessment?: (assessment: BreedingAssessment) => void;
  transfers: TransferRecord[];
  animals: Animal[];
  onUpdateAnimal: (updated: Animal) => void;
  onDeleteAnimal?: (id: string) => void;
  onAddTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddMedicalRecord: (record: MedicalRecord) => void;
  onAddBreedingRecord: (record: BreedingRecord) => void;
  onUpdateBreedingRecord?: (record: BreedingRecord) => void;
  onDeleteBreedingRecord?: (id: string) => void;
  onRestoreBreedingRecord?: (record: DeletedBreedingRecord) => void;
  deletedBreedingRecords?: DeletedBreedingRecord[];
  onDeleteBreedingAssessment?: (id: string) => void;
  onNavigateToBreeding?: () => void;
  onAddTransfer: (transfer: TransferRecord) => void;
  inventory?: InventoryItem[];
  onUpdateInventory?: (items: InventoryItem[]) => void;
  appointments?: Appointment[];
  staffMembers?: StaffMember[];
  onAddAppointment?: (appointment: Appointment) => void;
  onUpdateAppointment?: (appointment: Appointment) => void;
  onUpdateAppointmentStatus?: (id: string, status: Appointment['status']) => void;
  onDeleteAppointment?: (id: string) => void;
  isSidePanel?: boolean;
  isDarkMode?: boolean;
  initialTab?: 'overview' | 'enclosure' | 'feeding' | 'medical' | 'breeding' | 'transfer' | 'documents';
}

interface ParsedTaskDetails {
  foodItem?: string;
  quantity?: string;
  method?: string;
  supply?: string;
  routine?: string;
  notes?: string;
  otherDetails?: string[];
}

const parseTaskDetails = (detailsStr: string): ParsedTaskDetails => {
  if (!detailsStr) return {};
  
  const lines = detailsStr.split('\n');
  const result: ParsedTaskDetails = {};
  const otherDetails: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip redundant lines that duplicate frequency or routine title
    if (trimmed.startsWith('Frequency:')) continue;

    if (trimmed.startsWith('Food:')) {
      result.foodItem = trimmed.replace(/^Food:\s*/, '').replace(/\[ID:.*?\]/g, '').trim();
    } else if (trimmed.startsWith('Quantity:')) {
      result.quantity = trimmed.replace(/^Quantity:\s*/, '').trim();
    } else if (trimmed.startsWith('Method:')) {
      result.method = trimmed.replace(/^Method:\s*/, '').trim();
    } else if (trimmed.startsWith('Supply:') || trimmed.startsWith('Supply/Med Required:')) {
      result.supply = trimmed.replace(/^(Supply:|Supply\/Med Required:)\s*/, '').replace(/\[ID:.*?\]/g, '').trim();
    } else if (trimmed.startsWith('Animal Care Routine:')) {
      result.routine = trimmed.replace(/^Animal Care Routine:\s*/, '').trim();
    } else if (trimmed.startsWith('Routine:')) {
      result.routine = trimmed.replace(/^Routine:\s*/, '').trim();
    } else if (trimmed.startsWith('Notes:')) {
      result.notes = trimmed.replace(/^Notes:\s*/, '').trim();
    } else {
      const cleanVal = trimmed.replace(/\[ID:.*?\]/g, '').trim();
      if (cleanVal) {
        otherDetails.push(cleanVal);
      }
    }
  }

  if (otherDetails.length > 0) {
    result.otherDetails = otherDetails;
  }

  return result;
};

export const isEnclosureInBreedingRange = (enc: Enclosure, species: string): boolean => {
  const speciesStd = findSpeciesBreedingStandard(species);
  if (!speciesStd?.coolingTempRange) return true;
  if (!enc.temperature) return false;
  
  const tempMatch = enc.temperature.match(/(\d+(?:\.\d+)?)/);
  if (!tempMatch) return false;
  const actualTemp = parseFloat(tempMatch[1]);

  const rangeMatch = speciesStd.coolingTempRange.match(/(\d+(?:\.\d+)?)\s*°?C?\s*[-–~]\s*(\d+(?:\.\d+)?)\s*°?C/i) ||
                     speciesStd.coolingTempRange.match(/(\d+(?:\.\d+)?)\s*[-–~]\s*(\d+(?:\.\d+)?)/);
  if (!rangeMatch) return false;
  const minTemp = parseFloat(rangeMatch[1]);
  const maxTemp = parseFloat(rangeMatch[2]);
  return actualTemp >= minTemp && actualTemp <= maxTemp;
};

export interface TransferDocumentItem {
  id: string;
  title: string;
  subtitle?: string;
  required: boolean;
  isOther?: boolean;
  fileName?: string;
  fileSize?: string;
  uploadedAt?: string;
}

const DEFAULT_TRANSFER_DOCS: TransferDocumentItem[] = [
  {
    id: 'wfp',
    title: 'Wildlife Farm Permit (WFP)',
    subtitle: 'DENR facility registration & breeding authorization permit',
    required: true,
  },
  {
    id: 'wltp',
    title: 'Wildlife Local Transport Permit (WLTP)',
    subtitle: 'DENR transport clearance required for local movement & transfer',
    required: true,
  },
  {
    id: 'deed_sale',
    title: 'Official Receipt / Deed of Sale',
    subtitle: 'Proof of purchase, ownership turnover deed, or legal voucher',
    required: true,
  },
  {
    id: 'cwr',
    title: 'Certificate of Wildlife Registration',
    subtitle: 'Official wildlife registration record under DENR regulations',
    required: true,
  },
  {
    id: 'import_permit',
    title: 'Import Permit (If Applicable)',
    subtitle: 'Customs & national clearance for exotic or imported bloodlines',
    required: false,
  },
  {
    id: 'cites_permit',
    title: 'CITES Permit (If Applicable)',
    subtitle: 'Appendix I/II international wildlife conservation certificate',
    required: false,
  },
  {
    id: 'health_cert',
    title: 'Health Certificate / Veterinary Certificate',
    subtitle: 'Signed veterinary fit-to-travel and quarantine clearance',
    required: false,
  }
];

export default function AnimalDetailOverlay({
  animal,
  onClose,
  enclosures,
  onUpdateEnclosure,
  tasks,
  medicalRecords,
  breedingRecords,
  breedingAssessments = [],
  onAddBreedingAssessment,
  onUpdateBreedingAssessment,
  transfers,
  animals,
  onUpdateAnimal,
  onDeleteAnimal,
  onAddTask,
  onDeleteTask,
  onAddMedicalRecord,
  onAddBreedingRecord,
  onUpdateBreedingRecord,
  onDeleteBreedingRecord,
  onRestoreBreedingRecord,
  deletedBreedingRecords = [],
  onDeleteBreedingAssessment,
  onNavigateToBreeding,
  onAddTransfer,
  inventory = [],
  onUpdateInventory,
  appointments = [],
  staffMembers: propStaffMembers,
  onAddAppointment,
  onUpdateAppointment,
  onUpdateAppointmentStatus,
  onDeleteAppointment,
  isSidePanel = false,
  isDarkMode = false,
  initialTab = 'overview'
}: AnimalDetailOverlayProps) {
  const staffMembers = propStaffMembers || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('feronia_staff_members') || '[]') : []);
  const [activeTab, setActiveTab] = useState<'overview' | 'enclosure' | 'feeding' | 'medical' | 'breeding' | 'transfer' | 'documents'>(initialTab);
  const [redirectSource, setRedirectSource] = useState<'overview' | 'enclosure' | 'feeding' | 'medical' | 'breeding' | 'transfer' | 'documents' | null>(null);
  
  // For un-bred animals that have never been assessed, start at step 0 (Ready for Breeding Assessment landing);
  // For actively paired animals, open monitoring/step 4;
  // For animals that have already been assessed, go directly to Step 1 (Readiness & Assessment) and never return to step 0!
  const hasActiveBreeding = useMemo(() => {
    return (breedingRecords || []).some(
      r => isBreedingRecordActive(r) && (r.femaleId === animal.id || r.maleId === animal.id)
    );
  }, [breedingRecords, animal.id]);

  const hasCompletedAssessment = useMemo(() => {
    const hasRecord = (breedingAssessments || []).some(
      a => a.animalId === animal.id || a.partnerId === animal.id
    );
    const statusStr = animal.breedingStatus as string;
    const hasStatus = !!(statusStr && 
      statusStr !== 'Pending Assessment' && 
      statusStr !== 'Not Ready' &&
      statusStr !== 'Unassessed');
    const savedStatus = typeof window !== 'undefined' 
      ? localStorage.getItem(`feronia_breeding_status_${animal.id}`)
      : null;
    return hasRecord || hasStatus || savedStatus === 'InProgress' || savedStatus === 'Completed';
  }, [breedingAssessments, animal.id, animal.breedingStatus]);

  const resolveInitialBreedingStep = () => {
    if (hasActiveBreeding) return 4;
    const savedStep = typeof window !== 'undefined' ? localStorage.getItem(`feronia_breeding_step_${animal.id}`) : null;
    if (savedStep !== null) {
      const p = parseInt(savedStep, 10);
      if (!isNaN(p) && p >= 1 && p <= 4) return p;
    }
    if (hasCompletedAssessment) {
      return animal.breedingStatus === 'Ready for Pairing' ? 2 : 1;
    }
    return 0;
  };

  const [breedingStep, setBreedingStep] = useState<number>(resolveInitialBreedingStep);

  useEffect(() => {
    setBreedingStep(resolveInitialBreedingStep());
  }, [animal.id, hasActiveBreeding, hasCompletedAssessment]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Photo Adjustment States
  const [imageZoom, setImageZoom] = useState<number>(100);
  const [imageFit, setImageFit] = useState<'cover' | 'contain' | 'fill'>('contain');
  const [imagePositionY, setImagePositionY] = useState<'top' | 'center' | 'bottom'>('top');
  const [imagePositionX, setImagePositionX] = useState<'left' | 'center' | 'right'>('center');
  const [isAdjustingPhoto, setIsAdjustingPhoto] = useState<boolean>(false);
  const [currentImage, setCurrentImage] = useState<string>(animal.image || animal.imageUrl || animal.photoUrl || '');

  // Keep currentImage in sync when animal prop updates
  useEffect(() => {
    const resolved = animal.image || animal.imageUrl || animal.photoUrl || '';
    setCurrentImage(resolved);
  }, [animal.id, animal.image, animal.imageUrl, animal.photoUrl]);
  const [showFullscreenPhoto, setShowFullscreenPhoto] = useState<boolean>(false);
  const [customPhotoInput, setCustomPhotoInput] = useState<string>('');

  // Photo Drag & Pan States
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rawX = e.clientX - startPos.x;
    const rawY = e.clientY - startPos.y;
    const maxPanX = Math.max(500, Math.floor((imageZoom / 100) * 600));
    const maxPanY = Math.max(500, Math.floor((imageZoom / 100) * 600));

    setPan({
      x: Math.min(Math.max(rawX, -maxPanX), maxPanX),
      y: Math.min(Math.max(rawY, -maxPanY), maxPanY)
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setStartPos({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const rawX = e.touches[0].clientX - startPos.x;
    const rawY = e.touches[0].clientY - startPos.y;
    const maxPanX = Math.max(500, Math.floor((imageZoom / 100) * 600));
    const maxPanY = Math.max(500, Math.floor((imageZoom / 100) * 600));

    setPan({
      x: Math.min(Math.max(rawX, -maxPanX), maxPanX),
      y: Math.min(Math.max(rawY, -maxPanY), maxPanY)
    });
  };

  const formatDateString = (dateStr: string): string => {
    if (!dateStr) return '';
    if (/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(dateStr)) return dateStr;
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    } catch (e) {}
    return dateStr;
  };

  // Enclosure States
  const [isAssigningEnclosure, setIsAssigningEnclosure] = useState(false);
  const [selectedEnclosureId, setSelectedEnclosureId] = useState('');
  const [enclosureNotes, setEnclosureNotes] = useState('');

  // Transfer Enclosure Filters (Reptile Type, Facility, Search, Passed Climate)
  const [transferFilterReptileType, setTransferFilterReptileType] = useState('All');
  const [transferFilterFacility, setTransferFilterFacility] = useState('All');
  const [transferSearchQuery, setTransferSearchQuery] = useState('');
  const [transferFilterOnlyPassedClimate, setTransferFilterOnlyPassedClimate] = useState(false);

  // Auto-sync selected enclosure to first species-compatible/passed-climate enclosure when assigning
  useEffect(() => {
    if (isAssigningEnclosure && enclosures.length > 0) {
      const inService = enclosures.filter(enc => enc.condition !== 'Out of Service');
      const speciesCompatible = inService.filter(enc => isEnclosureSpeciesCompatible(enc, animal.species, animals));
      const climatePassed = speciesCompatible.filter(enc => evaluateEnclosureClimateQualification(enc, animal.species).isQualified);

      const base = (transferFilterOnlyPassedClimate && climatePassed.length > 0)
        ? climatePassed
        : speciesCompatible;

      const compatibleList = base
        .filter(enc => transferFilterReptileType === 'All' || enc.type === transferFilterReptileType)
        .filter(enc => transferFilterFacility === 'All' || enc.facility === transferFilterFacility)
        .filter(enc => {
          if (!transferSearchQuery.trim()) return true;
          const q = transferSearchQuery.toLowerCase().trim();
          return (enc.name || '').toLowerCase().includes(q) ||
                 (enc.id || '').toLowerCase().includes(q) ||
                 (enc.type || '').toLowerCase().includes(q) ||
                 (enc.facility || '').toLowerCase().includes(q);
        });

      const listToUse = compatibleList.length > 0 ? compatibleList : base;

      if (listToUse.length > 0) {
        if (!selectedEnclosureId || !listToUse.some(enc => enc.id === selectedEnclosureId)) {
          const currentMatch = listToUse.find(enc => enc.id === animal.enclosureId);
          const target = currentMatch || listToUse[0];
          setSelectedEnclosureId(target.id);
        }
      } else {
        setSelectedEnclosureId('');
      }
    }
  }, [isAssigningEnclosure, animal.species, animal.enclosureId, enclosures, animals, transferFilterReptileType, transferFilterFacility, transferSearchQuery, transferFilterOnlyPassedClimate]);

  // Feeding & Care States
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [scheduleStep, setScheduleStep] = useState<0 | 1 | 2 | 3>(0);
  const [scheduleType, setScheduleType] = useState<'both' | 'feeding' | 'care'>('both');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [scheduleToConfirm, setScheduleToConfirm] = useState<ScheduleToConfirm | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [foodItem, setFoodItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [method, setMethod] = useState('Live Feed');
  const [customMethod, setCustomMethod] = useState('');
  const [feedingFreq, setFeedingFreq] = useState('Every 7 days');
  const [customFeedingFreq, setCustomFeedingFreq] = useState('');
  const [feedingTime, setFeedingTime] = useState('08:00 AM');
  const todayIso = new Date().toISOString().split('T')[0];
  const [feedingDate, setFeedingDate] = useState(todayIso);
  // Helper to ensure only actual food/prey items appear in Feeding selections
  const isStrictFoodItem = (item: { name?: string; category?: string }) => {
    const nameLower = (item.name || '').toLowerCase();
    const catLower = (item.category || '').toLowerCase();
    
    // Explicitly exclude any medical, dewormer, supplement, cleaning, or non-food items
    const nonFoodKeywords = [
      'deworm', 'wormer', 'med', 'pill', 'tablet', 'antibiotic', 'vaccin', 
      'supplement', 'calcium', 'vitamin', 'disinfect', 'clean', 'bleach', 
      'soap', 'shampoo', 'bedding', 'substrate', 'lamp', 'bulb', 'tank', 
      'cage', 'bottle', 'ointment', 'antiseptic', 'spray', 'needle', 'syringe'
    ];
    
    if (nonFoodKeywords.some(kw => nameLower.includes(kw))) {
      return false;
    }
    
    if (catLower && catLower !== 'feeding') {
      return false;
    }
    
    return true;
  };

  // Animal-specific care presets (direct animal husbandry)
  const ANIMAL_CARE_PRESETS = [
    { label: 'Health & Physical Examination', note: 'Perform full visual & physical check (eyes, scales, nostrils, vent).' },
    { label: 'Weight & Growth Measurement', note: 'Record mass in grams using calibrated digital scale.' },
    { label: 'Oral Deworming & Parasite Control', note: 'Administer prescribed oral dewormer / anti-parasitic treatment as directed.' },
    { label: 'Calcium & Vitamin D3 Supplementation', note: 'Dust food item or provide calcium + D3 reptile supplement.' },
    { label: 'Shedding Check & Assistance', note: 'Inspect ecdysis completeness; check eye caps, tail tip, and toes.' },
    { label: 'Hydration & Soaking Bath', note: 'Provide 20-30 min lukewarm shallow soak for hydration and digestion.' },
    { label: 'Parasite & Mite Inspection', note: 'Check skin folds, under scales, throat fold, and vent for mites.' },
    { label: 'Behavioral & Temperament Check', note: 'Observe alertness, activity levels, locomotion, and stress signs.' },
    { label: 'Claw / Scale Grooming & Trimming', note: 'Gently trim sharp claw tips or check spur condition.' },
    { label: 'Egg & Clutch Monitoring', note: 'Palpate abdomen for eggs/follicles and inspect lay box readiness.' },
    { label: 'Respiratory & Eye Inspection', note: 'Check for clear eye condition and listen for respiratory clicking/wheezing.' },
    { label: 'Other Husbandry Task', note: '' }
  ];

  const [careTaskName, setCareTaskName] = useState('');
  const [customCareTaskName, setCustomCareTaskName] = useState('');
  const [careFreq, setCareFreq] = useState('Every 7 days');
  const [customCareFreq, setCustomCareFreq] = useState('');
  const [careTime, setCareTime] = useState('09:00 AM');
  const [careDate, setCareDate] = useState(todayIso);
  const [careNotes, setCareNotes] = useState('');
  const [careSupplyItemId, setCareSupplyItemId] = useState('');
  const [careSupplyQty, setCareSupplyQty] = useState<number | string>(1);
  const [careSupplyUnitSelect, setCareSupplyUnitSelect] = useState('doses');
  const [careSupplyCustomUnit, setCareSupplyCustomUnit] = useState('');
  const [feedingQtyNumber, setFeedingQtyNumber] = useState<number | string>(1);
  const [feedingQtyUnit, setFeedingQtyUnit] = useState('pc');
  const [feedingQtyCustomUnit, setFeedingQtyCustomUnit] = useState('');
  const [feedingNotes, setFeedingNotes] = useState('');
  const [saveOption, setSaveOption] = useState<'same_species_age' | 'all_species' | 'single'>('same_species_age');
  const [assignedKeeperForSchedule, setAssignedKeeperForSchedule] = useState<string>(animal.assignedKeeperId || '');
  const [scheduleActionFeedback, setScheduleActionFeedback] = useState<string | null>(null);
  const [expandedScheduleIds, setExpandedScheduleIds] = useState<Record<string, boolean>>({});

  const toggleExpandSchedule = (taskId: string) => {
    setExpandedScheduleIds(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Edit Basic Information States
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [editName, setEditName] = useState(animal.name || '');
  const [editSpecies, setEditSpecies] = useState(animal.species);
  const [editMorph, setEditMorph] = useState(animal.morph);
  const [editSex, setEditSex] = useState<'Male' | 'Female'>(animal.sex);
  const [editDob, setEditDob] = useState(animal.dob);
  const [editDateAcquired, setEditDateAcquired] = useState(animal.dateAcquired);
  const [editSource, setEditSource] = useState(animal.source || 'Captive Bred');
  const [editWeight, setEditWeight] = useState<number | string>(animal.weight ?? 350);
  const [editLength, setEditLength] = useState<number | string>(animal.length ?? 40);
  const [editHealthStatus, setEditHealthStatus] = useState<string>(animal.healthStatus || 'Healthy');
  const [editBreedingStatus, setEditBreedingStatus] = useState<string>(animal.breedingStatus || 'Pending Assessment');
  const [editEnclosureId, setEditEnclosureId] = useState<string>(animal.enclosureId || '');

  // Sync state when animal changes or overlay opens
  useEffect(() => {
    setEditName(animal.name || '');
    setEditSpecies(animal.species);
    setEditMorph(animal.morph);
    setEditSex(animal.sex);
    setEditDob(animal.dob);
    setEditDateAcquired(animal.dateAcquired);
    setEditSource(animal.source || 'Captive Bred');
    setEditWeight(animal.weight ?? 350);
    setEditLength(animal.length ?? 40);
    setEditHealthStatus(animal.healthStatus || 'Healthy');
    setEditBreedingStatus(animal.breedingStatus || 'Pending Assessment');
    setEditEnclosureId(animal.enclosureId || '');
  }, [animal.id, animal.dob, animal.species, animal.weight, animal.healthStatus, animal.breedingStatus, animal.enclosureId]);

  // Medical States (Admin attaching certs and requesting Vet consultations)
  const [isAttachingMedical, setIsAttachingMedical] = useState(false);
  const [docType, setDocType] = useState('Health Certificate / Vet Clearance');
  const [customDocType, setCustomDocType] = useState('');
  const [medRecordDate, setMedRecordDate] = useState(todayIso);
  const [medDescription, setMedDescription] = useState('');
  const [certifiedHealthStatus, setCertifiedHealthStatus] = useState<'Healthy' | 'Under Observation' | 'Under Treatment' | 'Injured' | 'Sick'>('Healthy');
  const [issuingAuthority, setIssuingAuthority] = useState('Licensed Veterinarian / Admin Verified');
  const [uploadedMedFile, setUploadedMedFile] = useState<string | null>(null);
  const [medActionFeedback, setMedActionFeedback] = useState<string | null>(null);
  const medFileInputRef = useRef<HTMLInputElement>(null);

  // Admin Requesting Vet Consultation State
  const [isRequestingConsult, setIsRequestingConsult] = useState(false);
  const [consultType, setConsultType] = useState('Routine Health Checkup');
  const [customConsultType, setCustomConsultType] = useState('');
  const [consultPriority, setConsultPriority] = useState<'Normal' | 'High' | 'Emergency'>('Normal');
  const [consultDate, setConsultDate] = useState(todayIso);
  const [consultTime, setConsultTime] = useState('09:00 AM');
  const [consultVet, setConsultVet] = useState(() => (staffMembers || []).find(s => s.role === 'vet' && s.status !== 'Inactive')?.name || 'Attending Veterinarian');
  const [consultRequestedBy, setConsultRequestedBy] = useState(() => (staffMembers || []).find(s => s.role === 'admin')?.name || 'Facility Admin');
  const [consultReason, setConsultReason] = useState('');
  const [updateStatusToPending, setUpdateStatusToPending] = useState(false);

  // Vet Visit Scheduling Modal from Keeper Observation
  const [schedVetModalOpen, setSchedVetModalOpen] = useState(false);
  const [schedVetType, setSchedVetType] = useState('Medical Examination');
  const [customSchedVetType, setCustomSchedVetType] = useState('');
  const [schedVetDate, setSchedVetDate] = useState(todayIso);
  const [schedVetTime, setSchedVetTime] = useState('09:00 AM');
  const [schedVetName, setSchedVetName] = useState(() => (staffMembers || []).find(s => s.role === 'vet' && s.status !== 'Inactive')?.name || 'Attending Veterinarian');
  const [schedVetPriority, setSchedVetPriority] = useState<'Normal' | 'High' | 'Emergency'>('Normal');
  const [schedVetReason, setSchedVetReason] = useState('');

  // Reschedule Appointment Modal States
  const [reschedAptModalOpen, setReschedAptModalOpen] = useState(false);
  const [selectedAptToResched, setSelectedAptToResched] = useState<Appointment | null>(null);
  const [reschedNewDate, setReschedNewDate] = useState(todayIso);
  const [reschedNewTime, setReschedNewTime] = useState('09:00 AM');

  // Documents Tab States
  const [customAttachedDocs, setCustomAttachedDocs] = useState<Array<{ name: string; size: string; date: string }>>([]);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleMedFileSelect = (file: File) => {
    const sizeStr = formatFileSize(file.size);
    setUploadedMedFile(`${file.name} (${sizeStr})`);
  };

  const handleDocumentUploadFromDevice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = formatFileSize(file.size);
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      setCustomAttachedDocs(prev => [...prev, { name: file.name, size: sizeStr, date: today }]);
    }
  };

  // Breeding States
  const [breedingWizardStep, setBreedingWizardStep] = useState<1 | 2 | 3>(1);
  const [breedingSubTab, setBreedingSubTab] = useState<'records' | 'readiness'>('readiness');
  const [selectedOppositeId, setSelectedOppositeId] = useState('');
  const [partnerFilterSpecies, setPartnerFilterSpecies] = useState('All');
  const [partnerFilterSex, setPartnerFilterSex] = useState<'All' | 'Male' | 'Female'>('All');
  const [partnerFilterEnclosure, setPartnerFilterEnclosure] = useState('All');
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [favoritedPartnerIds, setFavoritedPartnerIds] = useState<string[]>([]);
  const [showPartnerFilters, setShowPartnerFilters] = useState(false);
  const [breedingAssessmentNotes, setBreedingAssessmentNotes] = useState('Keep monitoring weight and health weekly.');
  const [pairingSeasonDateRange, setPairingSeasonDateRange] = useState(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} – ${endStr}`;
  });
  const [pairingTransferEnclosureId, setPairingTransferEnclosureId] = useState('');
  const [pairingTransferDate, setPairingTransferDate] = useState(todayIso);
  const [showBreedingHistory, setShowBreedingHistory] = useState(false);
  const [isAddingPair, setIsAddingPair] = useState(false);
  const [pairNotes, setPairNotes] = useState('');
  const [savedAssessmentFeedback, setSavedAssessmentFeedback] = useState<string | null>(null);
  const [isAddingBreedingLog, setIsAddingBreedingLog] = useState(false);
  const [breedingType, setBreedingType] = useState('Natural Mating');
  const [customBreedingType, setCustomBreedingType] = useState('');
  const [breedingLogDate, setBreedingLogDate] = useState(todayIso);
  const [clutchSize, setClutchSize] = useState<string | number>('');
  const [hatchDate, setHatchDate] = useState('');
  const [hatchlings, setHatchlings] = useState<string | number>('');
  const [unhatchedEggs, setUnhatchedEggs] = useState<string | number>('');
  const [breedingStatusInput, setBreedingStatusInput] = useState<'IN PROGRESS' | 'SUCCESSFUL' | 'FAILED'>('IN PROGRESS');
  const [selectedBreedingRecord, setSelectedBreedingRecord] = useState<BreedingRecord | null>(null);

  // Transfer Wizard States
  const [isStartingTransfer, setIsStartingTransfer] = useState(false);
  const [transferStep, setTransferStep] = useState(1);
  const [transferType, setTransferType] = useState<string>('To New Owner');
  const [customTransferType, setCustomTransferType] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerContact, setNewOwnerContact] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [govIdType, setGovIdType] = useState('Passport');
  const [customGovIdType, setCustomGovIdType] = useState('');
  const [govIdNumber, setGovIdNumber] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [uploadedTransferPermits, setUploadedTransferPermits] = useState<string[]>([]);
  const [transferDocuments, setTransferDocuments] = useState<TransferDocumentItem[]>(DEFAULT_TRANSFER_DOCS);
  const [transferDocError, setTransferDocError] = useState<string | null>(null);
  const [transferOwnerError, setTransferOwnerError] = useState<string | null>(null);
  const [allowPendingPermits, setAllowPendingPermits] = useState(false);

  // Custom "Other" Document Form State
  const [showAddOtherDoc, setShowAddOtherDoc] = useState(false);
  const [otherDocTitle, setOtherDocTitle] = useState('');
  const [otherDocSubtitle, setOtherDocSubtitle] = useState('');
  const [otherDocIsRequired, setOtherDocIsRequired] = useState(false);
  const [otherDocFile, setOtherDocFile] = useState<File | null>(null);

  const handleUploadTransferDocFile = (docId: string, file: File) => {
    const sizeStr = formatFileSize(file.size);
    const timeStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setTransferDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          fileName: file.name,
          fileSize: sizeStr,
          uploadedAt: timeStr,
        };
      }
      return doc;
    }));
    setTransferDocError(null);
  };

  const handleRemoveTransferDocFile = (docId: string) => {
    setTransferDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        const { fileName, fileSize, uploadedAt, ...rest } = doc;
        return rest;
      }
      return doc;
    }));
  };

  const handleAddOtherDocumentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otherDocTitle.trim()) return;

    const newId = 'other-' + Date.now();
    const sizeStr = otherDocFile ? formatFileSize(otherDocFile.size) : undefined;
    const timeStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const newDoc: TransferDocumentItem = {
      id: newId,
      title: otherDocTitle.trim(),
      subtitle: otherDocSubtitle.trim() || 'Custom administrative / facility document',
      required: otherDocIsRequired,
      isOther: true,
      fileName: otherDocFile ? otherDocFile.name : undefined,
      fileSize: sizeStr,
      uploadedAt: otherDocFile ? timeStr : undefined,
    };

    setTransferDocuments(prev => [...prev, newDoc]);
    setOtherDocTitle('');
    setOtherDocSubtitle('');
    setOtherDocIsRequired(false);
    setOtherDocFile(null);
    setShowAddOtherDoc(false);
    setTransferDocError(null);
  };

  const handleDeleteOtherDoc = (docId: string) => {
    setTransferDocuments(prev => prev.filter(doc => doc.id !== docId));
  };

  // Removal States
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);

  const handlePermanentDelete = () => {
    if (onDeleteAnimal) {
      onDeleteAnimal(animal.id);
    } else {
      onUpdateAnimal({
        ...animal,
        isArchived: true,
        archiveReason: 'Removed by Admin',
        archiveDate: new Date().toISOString().split('T')[0]
      });
    }
    setIsRemoveModalOpen(false);
    onClose();
  };

  // -------------------------
  // Helpers & Preset Generators
  // -------------------------
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Automation of animal age: Age is strictly calculated from Date of Birth (dob) and current date (effectiveSystemDate),
  // not when the animal was acquired.
  const calculationDate = getEffectiveSystemDate();

  const calculateAge = (dobString: string) => {
    if (!dobString) return 'Unknown';
    const res = calculatePreciseAge(dobString, calculationDate);
    if (!res) return 'Unknown';
    if (res.isFuture) return 'Future Date (Not born)';
    return res.text;
  };

  const getAgeStage = (dobString: string): { stage: 'Hatchling / Baby' | 'Juvenile / Sub-Adult' | 'Adult'; ageMonths: number; ageDays: number } => {
    if (!dobString) return { stage: 'Adult', ageMonths: 24, ageDays: 720 };
    const res = calculatePreciseAge(dobString, calculationDate);
    if (!res) return { stage: 'Adult', ageMonths: 24, ageDays: 720 };
    return {
      stage: res.stage === 'N/A' ? 'Adult' : res.stage,
      ageMonths: res.totalMonths,
      ageDays: res.totalDays
    };
  };

  const getRecommendedFeedingAndCare = (speciesName: string, dobString: string) => {
    const cleanSpecies = (speciesName || 'Reptile').split('(')[0].trim();
    const { stage } = getAgeStage(dobString);

    let foodItemName = 'Live Insects / Greens';
    let feedingMethod = 'Live Feed';
    let feedingFreq = 'Every 2 days';
    let feedingTime = '08:00 AM';
    let feedingQuantity = '1 portion';
    let feedingNotes = 'Adjust portion based on animal size and appetite.';
    let careTaskName = 'Health & Physical Examination';
    let careFreq = 'Every 1 day';
    let careTime = '09:00 AM';
    let careNotes = 'Check enclosure environment, clean waste, and verify water supply.';

    if (cleanSpecies === 'Bearded Dragon') {
      if (stage === 'Hatchling / Baby') {
        foodItemName = 'Small Dubia Roaches & Daily Salad';
        feedingMethod = 'Live Insects & Salad Bowl';
        feedingFreq = 'Every 1 day';
        feedingTime = '08:30 AM';
        feedingQuantity = '10-15 small roaches + fresh salad';
        feedingNotes = 'Dust insects with Calcium + D3 5x/week. Provide fresh leafy greens daily.';
        careTaskName = 'Daily Habitat Misting & Temp Check';
        careFreq = 'Every 1 day';
        careTime = '09:00 AM';
        careNotes = 'Verify basking spot temp (105°F-110°F), mist hatchling lightly for hydration, clean waste.';
      } else if (stage === 'Juvenile / Sub-Adult') {
        foodItemName = 'Medium Dubia Roaches / Mealworms & Salad';
        feedingMethod = 'Bowl Feed & Tongs';
        feedingFreq = 'Every 2 days';
        feedingTime = '09:00 AM';
        feedingQuantity = '8-12 medium roaches + fresh salad';
        feedingNotes = 'Feed insects every 2 days; offer salad daily. Calcium dust 3x/week.';
        careTaskName = 'Habitat Misting, Basking & Spot Clean';
        careFreq = 'Every 1 day';
        careTime = '09:30 AM';
        careNotes = 'Check basking spot temp (100°F-105°F), refill clean water dish, spot clean substrate.';
      } else {
        foodItemName = 'Fresh Collard/Mustard Greens & Large Roaches';
        feedingMethod = 'Salad Bowl & Live Feed';
        feedingFreq = 'Every 3 days';
        feedingTime = '09:00 AM';
        feedingQuantity = '1 bowl greens daily + 5-8 large roaches 2x/week';
        feedingNotes = '80% greens diet for adult bearded dragons. Provide calcium dust twice a week.';
        careTaskName = 'Weekly Deep Sanitation & Daily Spot Clean';
        careFreq = 'Every 1 day';
        careTime = '10:00 AM';
        careNotes = 'Clean basking tiles, remove fecal matter immediately, verify 95-100°F basking temp.';
      }
    } else if (cleanSpecies === 'Ball Python') {
      if (stage === 'Hatchling / Baby') {
        foodItemName = 'Rat Pup / Hopper Mouse (10-15g)';
        feedingMethod = 'Thawed / Frozen-Thawed';
        feedingFreq = 'Every 5 days';
        feedingTime = '07:00 PM';
        feedingQuantity = '1 rat pup';
        feedingNotes = 'Feed in evening using tongs. Warm prey in warm water before offering.';
        careTaskName = 'Humidity & Hide Box Check (60-70%)';
        careFreq = 'Every 2 days';
        careTime = '10:00 AM';
        careNotes = 'Maintain 60-70% humidity. Ensure humid hide sphagnum moss is moist.';
      } else if (stage === 'Juvenile / Sub-Adult') {
        foodItemName = 'Small Rat (30-50g)';
        feedingMethod = 'Thawed / Frozen-Thawed';
        feedingFreq = 'Every 7 days';
        feedingTime = '07:30 PM';
        feedingQuantity = '1 small rat';
        feedingNotes = 'Offer every 7 days. Do not handle snake for 48 hours post-feeding.';
        careTaskName = 'Water Refresh & Substrate Spot Clean';
        careFreq = 'Every 2 days';
        careTime = '10:00 AM';
        careNotes = 'Refill clean water bowl, spot clean urates, check tub warm side temp (88-92°F).';
      } else {
        foodItemName = 'Medium / Large Rat (100-150g)';
        feedingMethod = 'Thawed / Frozen-Thawed';
        feedingFreq = 'Every 10 days';
        feedingTime = '08:00 PM';
        feedingQuantity = '1 medium rat';
        feedingNotes = 'Adult maintenance feeding every 10-14 days. Monitor weight monthly.';
        careTaskName = 'Enclosure Sanitation & Water Bowl Refill';
        careFreq = 'Every 3 days';
        careTime = '10:00 AM';
        careNotes = 'Check humidity (60%), refresh water, full substrate replacement monthly.';
      }
    } else if (cleanSpecies === 'Leopard Gecko') {
      if (stage === 'Hatchling / Baby') {
        foodItemName = 'Small Mealworms & Crickets';
        feedingMethod = 'Bowl Feed with Calcium';
        feedingFreq = 'Every 1 day';
        feedingTime = '06:30 PM';
        feedingQuantity = '5-7 small mealworms';
        feedingNotes = 'Coat insects in Pure Calcium Powder. Keep dish available in enclosure.';
        careTaskName = 'Moist Hide Mist & Water Dish';
        careFreq = 'Every 1 day';
        careTime = '09:00 AM';
        careNotes = 'Mist moist hide daily to assist shedding. Keep fresh water available.';
      } else if (stage === 'Juvenile / Sub-Adult') {
        foodItemName = 'Medium Mealworms / Crickets';
        feedingMethod = 'Bowl Feed & Tongs';
        feedingFreq = 'Every 2 days';
        feedingTime = '07:00 PM';
        feedingQuantity = '6-8 medium insects';
        feedingNotes = 'Alternate crickets and mealworms. Dust with D3 calcium twice a week.';
        careTaskName = 'Moist Hide & Spot Clean';
        careFreq = 'Every 2 days';
        careTime = '09:30 AM';
        careNotes = 'Check warm hide temp (88-92°F), mist humid hide, spot clean latrine corner.';
      } else {
        foodItemName = 'Large Mealworms / Dubia Roaches';
        feedingMethod = 'Bowl Feed';
        feedingFreq = 'Every 3 days';
        feedingTime = '07:00 PM';
        feedingQuantity = '6-8 large mealworms';
        feedingNotes = 'Feed adult 2-3 times per week. Monitor tail plumpness.';
        careTaskName = 'Enclosure Clean & Calcium Dish Refill';
        careFreq = 'Every 3 days';
        careTime = '10:00 AM';
        careNotes = 'Spot clean poop corner, check moist hide, ensure calcium dish is stocked.';
      }
    } else if (cleanSpecies === 'Corn Snake') {
      if (stage === 'Hatchling / Baby') {
        foodItemName = 'Pinky Mouse';
        feedingMethod = 'Thawed / Frozen-Thawed';
        feedingFreq = 'Every 5 days';
        feedingTime = '06:00 PM';
        feedingQuantity = '1 pinky mouse';
        feedingNotes = 'Offer 1 pinky mouse every 5 days using feeding tongs.';
        careTaskName = 'Water Dish & Hide Check';
        careFreq = 'Every 2 days';
        careTime = '09:00 AM';
        careNotes = 'Keep fresh shallow water dish and check warm hide temp (82-85°F).';
      } else if (stage === 'Juvenile / Sub-Adult') {
        foodItemName = 'Fuzzy / Hopper Mouse';
        feedingMethod = 'Thawed / Frozen-Thawed';
        feedingFreq = 'Every 7 days';
        feedingTime = '06:30 PM';
        feedingQuantity = '1 fuzzy mouse';
        feedingNotes = 'Feed every 7 days. Leave undisturbed in dark tub after feeding.';
        careTaskName = 'Spot Clean & Substrate Check';
        careFreq = 'Every 2 days';
        careTime = '09:30 AM';
        careNotes = 'Check substrate moisture, spot clean waste, change water.';
      } else {
        foodItemName = 'Adult Mouse / Small Rat';
        feedingMethod = 'Thawed / Frozen-Thawed';
        feedingFreq = 'Every 10 days';
        feedingTime = '07:00 PM';
        feedingQuantity = '1 adult mouse';
        feedingNotes = 'Feed adult snake every 10-12 days.';
        careTaskName = 'Enclosure Sanitation & Water Refresh';
        careFreq = 'Every 3 days';
        careTime = '10:00 AM';
        careNotes = 'Spot clean waste, refresh large water bowl.';
      }
    } else if (cleanSpecies === 'Green Iguana') {
      foodItemName = 'Chopped Leafy Greens & Squash';
      feedingMethod = 'Salad Bowl';
      feedingFreq = 'Every 1 day';
      feedingTime = '08:00 AM';
      feedingQuantity = '1 large bowl fresh greens';
      feedingNotes = 'Provide fresh chopped collard/mustard greens daily with calcium dust.';
      careTaskName = 'Misting & UV Basking Lamp Check';
      careFreq = 'Every 1 day';
      careTime = '08:30 AM';
      careNotes = 'Mist thoroughly 2-3x daily for high humidity (70%+). Basking temp 95-100°F.';
    }

    return {
      foodItemName,
      feedingMethod,
      feedingFreq,
      feedingTime,
      feedingQuantity,
      feedingNotes,
      careTaskName,
      careFreq,
      careTime,
      careNotes,
      cleanSpecies,
      stage
    };
  };

  const applySpeciesAndAgeDefaults = (targetAnimal: Animal) => {
    const rec = getRecommendedFeedingAndCare(targetAnimal.species, targetAnimal.dob);
    
    // Check if there's an inventory item that matches
    if (inventory && inventory.length > 0) {
      const feedingOnly = inventory.filter(isStrictFoodItem);
      const matched = feedingOnly.find(i => 
        i.name.toLowerCase().includes(rec.foodItemName.toLowerCase().split(' ')[0]) ||
        rec.foodItemName.toLowerCase().includes(i.name.toLowerCase())
      ) || feedingOnly[0];
      if (matched) {
        setFoodItem(matched.name);
      } else {
        setFoodItem(rec.foodItemName);
      }
    } else {
      setFoodItem(rec.foodItemName);
    }

    setQuantity(rec.feedingQuantity);
    setMethod(rec.feedingMethod);
    setFeedingFreq(rec.feedingFreq);
    setFeedingTime(rec.feedingTime);
    setFeedingNotes(rec.feedingNotes);

    setCareTaskName(rec.careTaskName);
    setCareFreq(rec.careFreq);
    setCareTime(rec.careTime);
    setCareNotes(rec.careNotes);
  };

  const handleOpenAddSchedule = (type: 'both' | 'feeding' | 'care' = 'both', initialStep: 0 | 1 | 2 = 0) => {
    setFoodItem('');
    setQuantity('1');
    setMethod('Live Feed');
    setFeedingFreq('Daily');
    setFeedingTime('08:00 AM');
    setFeedingNotes('');
    setCareTaskName('');
    setCareFreq('Daily');
    setCareTime('09:00 AM');
    setCareNotes('');
    setScheduleType(type);
    setScheduleStep(initialStep);
    setIsAddingSchedule(true);
  };

  const applySelectedTemplate = (tmpl: SpeciesScheduleTemplate) => {
    if (!tmpl) return;
    setScheduleType(tmpl.scheduleType || 'both');
    if (tmpl.foodItemName) setFoodItem(tmpl.foodItemName);
    if (tmpl.feedingQuantity) setQuantity(tmpl.feedingQuantity);
    if (tmpl.feedingMethod) setMethod(tmpl.feedingMethod);
    if (tmpl.feedingFreq) setFeedingFreq(tmpl.feedingFreq);
    if (tmpl.feedingTime) setFeedingTime(tmpl.feedingTime);
    if (tmpl.feedingNotes) setFeedingNotes(tmpl.feedingNotes);
    if (tmpl.careTaskName) setCareTaskName(tmpl.careTaskName);
    if (tmpl.careFreq) setCareFreq(tmpl.careFreq);
    if (tmpl.careTime) setCareTime(tmpl.careTime);
    if (tmpl.careNotes) setCareNotes(tmpl.careNotes);
    if (tmpl.assignedKeeperId) setAssignedKeeperForSchedule(tmpl.assignedKeeperId);
  };

  const currentAgeStage = getAgeStage(animal.dob).stage;
  const currentCleanSpecies = (animal.species || 'Reptile').split('(')[0].trim();
  const currentSpeciesLower = currentCleanSpecies.toLowerCase();

  const availableKeepers = useMemo(() => {
    return (staffMembers || []).filter(s => {
      if (s.role === 'vet') return false; // Veterinarians cannot be assigned to animals or enclosures
      const r = (s.role || '').toLowerCase();
      return r.includes('keeper') || r.includes('caretaker') || r.includes('husbandry');
    });
  }, [staffMembers]);

  const matchingAgeGroupAnimals = useMemo(() => {
    return (animals || []).filter(a => 
      !a.isArchived && 
      (a.species || '').split('(')[0].trim().toLowerCase() === currentSpeciesLower &&
      getAgeStage(a.dob).stage === currentAgeStage
    );
  }, [animals, currentSpeciesLower, currentAgeStage]);

  const otherMatchingAgeGroupAnimals = useMemo(() => {
    return matchingAgeGroupAnimals.filter(a => a.id !== animal.id);
  }, [matchingAgeGroupAnimals, animal.id]);

  const matchingSpeciesAnimals = useMemo(() => {
    return (animals || []).filter(a => 
      !a.isArchived && 
      (a.species || '').split('(')[0].trim().toLowerCase() === currentSpeciesLower
    );
  }, [animals, currentSpeciesLower]);

  const handleQuickApplyReusableSchedule = (tmpl: SpeciesScheduleTemplate) => {
    if (!tmpl) return;
    const cleanSpec = currentCleanSpecies;
    const ageStage = currentAgeStage;

    const resolvedKeeperId = assignedKeeperForSchedule || animal.assignedKeeperId || tmpl.assignedKeeperId || '';
    const resolvedKeeperObj = (staffMembers || []).find(s => s.id === resolvedKeeperId);
    const resolvedKeeperName = resolvedKeeperObj ? resolvedKeeperObj.name : (animal.assignedKeeperName || tmpl.assignedKeeperName || '');

    const todayIso = new Date().toISOString().split('T')[0];

    setScheduleToConfirm({
      animal,
      targetAnimals: [animal],
      scheduleType: tmpl.scheduleType || 'both',
      foodItem: tmpl.foodItemName || 'Standard Prey',
      quantity: tmpl.feedingQuantity || '1 portion',
      method: tmpl.feedingMethod || 'Standard',
      feedingFreq: tmpl.feedingFreq || 'Weekly',
      feedingTime: tmpl.feedingTime || '08:00 AM',
      feedingDate: todayIso,
      feedingNotes: tmpl.feedingNotes || `Reused schedule for ${cleanSpec} (${ageStage})`,
      careTaskName: tmpl.careTaskName || 'Animal Care & Exam',
      careFreq: tmpl.careFreq || 'Every 3 days',
      careTime: tmpl.careTime || '09:00 AM',
      careDate: todayIso,
      careNotes: tmpl.careNotes || `Reused care routine for ${cleanSpec} (${ageStage})`,
      assignedKeeperId: resolvedKeeperId,
      assignedKeeperName: resolvedKeeperName,
      isSyncingSiblings: false
    });
  };

  const handlePropagateScheduleToSiblings = () => {
    if (otherMatchingAgeGroupAnimals.length === 0) return;
    const cleanSpec = currentCleanSpecies;
    const ageStage = currentAgeStage;

    const currentFeeding = animalTasks.find(t => t.type === 'Feeding' || t.title.toLowerCase().includes('feed'));
    const currentCare = animalTasks.find(t => t.type === 'Care' || t.type === 'Health Check' || (t.type !== 'Feeding' && (t.title.toLowerCase().includes('care') || t.title.toLowerCase().includes('clean'))));

    if (!currentFeeding && !currentCare) return;

    const parsedFeedingDetails = parseTaskDetails(currentFeeding?.details || '');
    const parsedCareDetails = parseTaskDetails(currentCare?.details || '');

    setScheduleToConfirm({
      animal,
      targetAnimals: otherMatchingAgeGroupAnimals,
      scheduleType: currentFeeding && currentCare ? 'both' : currentFeeding ? 'feeding' : 'care',
      foodItem: parsedFeedingDetails.foodItem || currentFeeding?.title || 'Standard Food',
      quantity: parsedFeedingDetails.quantity || '1 portion',
      method: parsedFeedingDetails.method || 'Standard',
      feedingFreq: currentFeeding?.frequency || 'Weekly',
      feedingTime: currentFeeding?.time || '08:00 AM',
      feedingDate: currentFeeding?.date || new Date().toISOString().split('T')[0],
      feedingNotes: parsedFeedingDetails.notes || currentFeeding?.details || '',
      careTaskName: currentCare?.title || 'Animal Care',
      careFreq: currentCare?.frequency || 'Every 3 days',
      careTime: currentCare?.time || '09:00 AM',
      careDate: currentCare?.date || new Date().toISOString().split('T')[0],
      careNotes: parsedCareDetails.notes || currentCare?.details || '',
      assignedKeeperName: animal.assignedKeeperName || 'Duty Keepers',
      isSyncingSiblings: true
    });
  };

  // Registered Veterinarians list (filtered from staffMembers)
  const registeredVets = (staffMembers || []).filter(s => {
    const role = (s.role || '').toLowerCase();
    const name = (s.name || '').toLowerCase();
    return role.includes('vet') || role.includes('veterinarian') || role.includes('doctor') || role.includes('dvm') || name.startsWith('dr.');
  });

  useEffect(() => {
    if (registeredVets.length > 0) {
      const currentSelectedExists = registeredVets.some(v => `${v.name} (${v.role || 'Veterinarian'})` === consultVet || v.name === consultVet);
      if (!currentSelectedExists) {
        setConsultVet(`${registeredVets[0].name} (${registeredVets[0].role || 'Veterinarian'})`);
      }
      const schedSelectedExists = registeredVets.some(v => v.name === schedVetName);
      if (!schedSelectedExists) {
        setSchedVetName(registeredVets[0].name);
      }
    }
    const adminStaff = (staffMembers || []).find(s => s.role === 'admin');
    if (adminStaff) {
      setConsultRequestedBy(adminStaff.name);
    }
  }, [staffMembers]);

  const handleSaveBasicInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Animal = {
      ...animal,
      name: editName.trim() || undefined,
      species: editSpecies,
      morph: editMorph,
      sex: editSex,
      dob: editDob,
      dateAcquired: editDateAcquired,
      source: editSource,
      weight: Number(editWeight) >= 0 ? Number(editWeight) : animal.weight,
      length: Number(editLength) >= 0 ? Number(editLength) : animal.length,
      healthStatus: editHealthStatus as any,
      breedingStatus: editBreedingStatus as any,
      enclosureId: editEnclosureId || undefined,
    };
    onUpdateAnimal(updated);
    setIsEditingBasicInfo(false);
  };

  const currentEnclosure = enclosures.find(e => e.id === animal.enclosureId);
  const parseTemperature = (tempStr?: string): number | null => {
    if (!tempStr) return null;
    const match = tempStr.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  };

  const actualTempNum = parseTemperature(currentEnclosure?.temperature);
  const isTempInTargetRange = actualTempNum !== null && actualTempNum >= 15 && actualTempNum <= 20;
  const isClimateApproved = !!(isTempInTargetRange || (currentEnclosure?.climateProfile?.status === 'Approved' && currentEnclosure?.climateProfile?.isActive));

  const animalTasks = sortTasksByTime(tasks.filter(t => t.animalId === animal.id));
  const animalMedRecords = medicalRecords.filter(m => m.animalId === animal.id);
  const animalBreedingRecords = breedingRecords.filter(b => b.femaleId === animal.id || b.maleId === animal.id);
  const animalBreedingAssessments = (breedingAssessments || []).filter(a => a.animalId === animal.id || (a.partnerId && a.partnerId === animal.id));

  // Breeding Readiness Evaluation based on facility species matrix standards
  const speciesStandard = findSpeciesBreedingStandard(animal.species || '');
  const breedingEvaluation = evaluateAnimalBreedingReadiness(animal, animalMedRecords, breedingRecords, isClimateApproved);
  
  const readinessAgePassed = breedingEvaluation.agePassed;
  const readinessWeightPassed = breedingEvaluation.weightPassed;
  const readinessSeasonPassed = breedingEvaluation.seasonPassed;
  const readinessHealthPassed = breedingEvaluation.healthPassed;
  const readinessCooldownPassed = breedingEvaluation.cooldownPassed;
  const isOverallReady = breedingEvaluation.overallReady;

  const hasHealthAssessment = animalMedRecords.length > 0 || (animal.healthStatus !== 'Pending Checkup' && animal.healthStatus !== 'Unassessed' && animal.healthStatus !== 'Require Vet');
  const hasBreedingAssessment = animalBreedingAssessments.length > 0 || animalBreedingRecords.length > 0 || (animal.breedingStatus !== 'Pending Assessment' && animal.breedingStatus !== 'Unassessed' && animal.breedingStatus !== 'Require Vet' && isOverallReady);

  // Opposite sex animals for pairing (matching species or compatible)
  const oppositeSexAnimals = animals.filter(a => 
    (a.species || '').toLowerCase().trim() === (animal.species || '').toLowerCase().trim() && 
    (a.sex || '').toLowerCase() !== (animal.sex || '').toLowerCase() && 
    a.id !== animal.id && 
    !a.isArchived
  );

  // Active selected partner evaluation (if a partner is selected during pairing)
  const selectedPartnerAnimal = animals.find(a => a.id === selectedOppositeId);
  const pairEvaluation = selectedPartnerAnimal ? evaluateBreedingPair(
    (animal.sex || '').toLowerCase().startsWith('f') ? animal : selectedPartnerAnimal,
    (animal.sex || '').toLowerCase().startsWith('f') ? selectedPartnerAnimal : animal,
    medicalRecords,
    breedingRecords
  ) : null;

  // -------------------------
  // Actions
  // -------------------------
  const handleAssignEnclosureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnclosureId) return;
    
    // Update the main selected animal
    const updatedAnimal = { ...animal, enclosureId: selectedEnclosureId };
    onUpdateAnimal(updatedAnimal);

    // Automatically update the partner animal's enclosure ID as well!
    const activePair = breedingRecords.find(
      r => isBreedingRecordActive(r) && (r.femaleId === animal.id || r.maleId === animal.id)
    );
    if (activePair) {
      const partnerId = activePair.femaleId === animal.id ? activePair.maleId : activePair.femaleId;
      const partnerAnimal = animals.find(a => a.id === partnerId);
      if (partnerAnimal) {
        onUpdateAnimal({ ...partnerAnimal, enclosureId: selectedEnclosureId });
      }
    }

    setIsAssigningEnclosure(false);
  };

  const handleCreateScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleStep(3);
  };

  const handleConfirmSchedule = () => {
    let targetAnimals: Animal[] = [animal];
    const currentSpeciesName = (animal.species || '').split('(')[0].trim().toLowerCase();
    const currentStageName = getAgeStage(animal.dob).stage;

    if (saveOption === 'same_species_age') {
      const matched = (animals || []).filter(a => 
        !a.isArchived && 
        (a.species || '').split('(')[0].trim().toLowerCase() === currentSpeciesName &&
        getAgeStage(a.dob).stage === currentStageName
      );
      targetAnimals = matched.length > 0 ? matched : [animal];
    } else if (saveOption === 'all_species') {
      const matched = (animals || []).filter(a => 
        !a.isArchived && 
        (a.species || '').split('(')[0].trim().toLowerCase() === currentSpeciesName
      );
      targetAnimals = matched.length > 0 ? matched : [animal];
    } else {
      targetAnimals = [animal];
    }

    const selectedKeeperObj = (staffMembers || []).find(s => s.id === assignedKeeperForSchedule);
    const defaultKeeperName = selectedKeeperObj ? selectedKeeperObj.name : (animal.assignedKeeperName || '');
    const defaultKeeperId = selectedKeeperObj ? selectedKeeperObj.id : (animal.assignedKeeperId || '');

    const activeFeedingUnit = feedingQtyUnit === 'Other' ? (feedingQtyCustomUnit.trim() || 'pcs') : feedingQtyUnit;
    const finalFeedingQty = quantity || `${feedingQtyNumber} ${activeFeedingUnit}`.trim();
    const finalCareTaskName = careTaskName === 'Other' ? (customCareTaskName.trim() || 'Custom Animal Care') : careTaskName;

    setScheduleToConfirm({
      animal,
      targetAnimals,
      scheduleType,
      foodItem,
      quantity: finalFeedingQty,
      method,
      feedingFreq,
      feedingTime,
      feedingDate,
      feedingNotes,
      careTaskName: finalCareTaskName,
      careFreq,
      careTime,
      careDate,
      careNotes,
      assignedKeeperId: defaultKeeperId,
      assignedKeeperName: defaultKeeperName,
      isSyncingSiblings: false
    });
  };

  const executeApplySchedule = (data: ScheduleToConfirm) => {
    const {
      animal: targetAnimal,
      targetAnimals,
      scheduleType: confirmType,
      foodItem: confirmFood,
      quantity: confirmQty,
      method: confirmMethod,
      feedingFreq: confirmFFreq,
      feedingTime: confirmFTime,
      feedingDate: confirmFDate,
      feedingNotes: confirmFNotes,
      careTaskName: confirmCName,
      careFreq: confirmCFreq,
      careTime: confirmCTime,
      careDate: confirmCDate,
      careNotes: confirmCNotes,
      assignedKeeperId: confirmKId,
      assignedKeeperName: confirmKName
    } = data;

    const actualTargets = targetAnimals && targetAnimals.length > 0 ? targetAnimals : [targetAnimal];

    actualTargets.forEach((tgt, idx) => {
      const keeperId = confirmKId || tgt.assignedKeeperId || '';
      const keeperObj = (staffMembers || []).find(s => s.id === keeperId);
      const keeperName = keeperObj ? keeperObj.name : (confirmKName || tgt.assignedKeeperName || '');

      if (confirmType === 'both' || confirmType === 'feeding') {
        const inventoryFoodItem = (inventory || []).find(i => i.name.toLowerCase() === (confirmFood || '').toLowerCase());
        const foodIdText = inventoryFoodItem ? ` [ID:${inventoryFoodItem.id}]` : '';

        const feedingTask: Task = {
          id: 'TASK-' + (Date.now().toString().slice(-5) + (idx * 2) + Math.floor(Math.random() * 100)),
          animalId: tgt.id,
          type: 'Feeding',
          title: `Feed ${tgt.name || tgt.species}`,
          time: confirmFTime || '08:00 AM',
          date: confirmFDate || new Date().toISOString().split('T')[0],
          details: `Food: ${confirmQty || '1 portion'} ${confirmFood || 'Standard Prey'}${foodIdText}\nMethod: ${confirmMethod || 'Tongs'}\nNotes: ${confirmFNotes || ''}${keeperName ? `\nAssigned Keeper: ${keeperName}` : ''}`,
          frequency: confirmFFreq || 'Weekly',
          status: 'Pending',
          assignedBy: 'Admin',
          assignedByName: 'Sanctuary Administration',
          assignedKeeperId: keeperId || undefined,
          assignedKeeperName: keeperName || undefined,
          enclosureId: tgt.enclosureId,
          createdAt: new Date().toISOString()
        };
        onAddTask(feedingTask);
      }

      if (confirmType === 'both' || confirmType === 'care') {
        const careTask: Task = {
          id: 'TASK-' + (Date.now().toString().slice(-5) + (idx * 2 + 1) + Math.floor(Math.random() * 100)),
          animalId: tgt.id,
          type: 'Care',
          title: `${confirmCName || 'Animal Care'} - ${tgt.name || tgt.species}`,
          time: confirmCTime || '09:00 AM',
          date: confirmCDate || new Date().toISOString().split('T')[0],
          details: `Routine: ${confirmCName || 'General Care'}\nNotes: ${confirmCNotes || ''}${keeperName ? `\nAssigned Keeper: ${keeperName}` : ''}`,
          frequency: confirmCFreq || 'Every 3 days',
          status: 'Pending',
          assignedBy: 'Admin',
          assignedByName: 'Sanctuary Administration',
          assignedKeeperId: keeperId || undefined,
          assignedKeeperName: keeperName || undefined,
          enclosureId: tgt.enclosureId,
          createdAt: new Date().toISOString()
        };
        onAddTask(careTask);
      }
    });

    const cleanSpec = (targetAnimal.species || 'Reptile').split('(')[0].trim();
    const ageStage = getAgeStage(targetAnimal.dob).stage;

    saveSpeciesScheduleTemplate({
      id: `TMPL-${Date.now().toString().slice(-6)}`,
      species: targetAnimal.species,
      cleanSpecies: cleanSpec,
      ageStage: ageStage,
      title: `${cleanSpec} (${ageStage}) Custom Schedule`,
      scheduleType: confirmType,
      foodItemName: confirmFood,
      feedingMethod: confirmMethod,
      feedingFreq: confirmFFreq,
      feedingQuantity: confirmQty,
      feedingTime: confirmFTime,
      feedingNotes: confirmFNotes,
      careTaskName: confirmCName,
      careFreq: confirmCFreq,
      careTime: confirmCTime,
      careNotes: confirmCNotes,
      assignedKeeperId: confirmKId,
      assignedKeeperName: confirmKName,
      createdAt: new Date().toISOString(),
      isDefaultForSpeciesAge: true
    });

    setScheduleActionFeedback(`✓ Schedule confirmed and applied to ${actualTargets.length} ${cleanSpec} specimen(s)! Tasks assigned to: ${confirmKName || 'Duty Keepers'}`);
    setTimeout(() => setScheduleActionFeedback(null), 6000);

    setIsAddingSchedule(false);
    setScheduleStep(0);
  };

  const handleAttachMedicalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const activeDocType = (docType === 'Others' || docType === 'Other')
      ? (customDocType.trim() || 'Custom Health Certificate')
      : docType;

    const newRecord: MedicalRecord = {
      id: 'MED-' + Math.floor(10000 + Math.random() * 90000),
      animalId: animal.id,
      recordType: activeDocType,
      recordDate: medRecordDate,
      purpose: docType === 'Health Certificate / Vet Clearance'
        ? 'Official Veterinary Certificate & Health Clearance'
        : (docType === 'Lab Result' ? 'Lab work evaluation & blood/fecal panel' : `${activeDocType} attached by Admin`),
      clinicalObservation: medDescription || `Document verified on file: ${activeDocType}`,
      diagnosis: certifiedHealthStatus === 'Healthy' ? 'Clinically Cleared / Healthy' : certifiedHealthStatus,
      treatment: 'Document on official record.',
      veterinarian: issuingAuthority || 'Licensed Veterinarian (Verified)',
      status: 'Document',
      attachments: uploadedMedFile ? [{ name: uploadedMedFile, size: '245 KB' }] : []
    };
    onAddMedicalRecord(newRecord);

    // Update animal's health clearance status
    onUpdateAnimal({
      ...animal,
      healthStatus: certifiedHealthStatus
    });

    setIsAttachingMedical(false);
    setMedDescription('');
    setUploadedMedFile(null);
    setCustomDocType('');
    setMedActionFeedback(`✓ ${activeDocType} successfully attached. Health status updated to "${certifiedHealthStatus}".`);
    setTimeout(() => setMedActionFeedback(null), 5000);
  };

  const handleRequestConsultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const requestDate = consultDate || todayIso;
    const activeConsultType = (consultType === 'Others' || consultType === 'Other')
      ? (customConsultType.trim() || 'Custom Veterinary Checkup')
      : consultType;

    // 1. Create Vet Appointment (Sent to Veterinarian for Approval & Confirmation)
    const newApt: Appointment = {
      id: `APT-ADM-${Date.now().toString().slice(-6)}`,
      animalId: animal.id,
      type: activeConsultType,
      veterinarian: consultVet,
      requestedBy: consultRequestedBy || staffMembers?.find(s => s.role === 'admin')?.name || 'Facility Administrator',
      requestedByRole: 'admin',
      date: requestDate,
      time: consultTime || '09:00 AM',
      purpose: consultReason || `Veterinary Checkup Request: ${activeConsultType} for ${animal.name || animal.species}`,
      status: 'Pending',
      priority: consultPriority,
      createdOn: todayIso,
      adminNotes: `Consultation requested by Facility Admin. Waiting for ${consultVet} to accept & confirm in Vet Portal.`
    };

    if (onAddAppointment) {
      onAddAppointment(newApt);
    }

    // 2. Create Keeper Health Check Task
    const consultTask: Task = {
      id: `TASK-REQ-${Date.now().toString().slice(-6)}`,
      animalId: animal.id,
      type: 'Health Check',
      title: `Vet Visit: ${activeConsultType} (${animal.name || animal.species})`,
      time: consultTime || '09:00 AM',
      date: requestDate,
      details: `Consultation requested by ${consultRequestedBy || 'Facility Admin'} for ${consultVet} (Awaiting Vet Confirmation).\nType: ${activeConsultType}\nPriority: ${consultPriority}\nReason: ${consultReason || 'Routine exam'}`,
      frequency: 'Once',
      status: 'Pending',
      enclosureId: animal.enclosureId || 'General'
    };
    onAddTask(consultTask);

    // 3. Update Animal Health Status if indicated
    if (updateStatusToPending || consultPriority === 'Emergency' || consultPriority === 'High' || animal.healthStatus === 'Unassessed') {
      onUpdateAnimal({
        ...animal,
        healthStatus: consultPriority === 'Emergency' ? 'Injured' : 'Under Observation'
      });
    }

    setIsRequestingConsult(false);
    setConsultReason('');
    setCustomConsultType('');
    setConsultPriority('Normal');
    setUpdateStatusToPending(false);
    setMedActionFeedback(`✓ Consultation request sent to ${consultVet} for ${requestDate} (${consultTime || '09:00 AM'})! Status: Waiting for Vet Approval.`);
    setTimeout(() => setMedActionFeedback(null), 5000);
  };

  const handleSaveIndividualAssessment = (overrideStatus?: 'ELIGIBLE' | 'NOT ELIGIBLE') => {
    const isEligible = overrideStatus ? overrideStatus === 'ELIGIBLE' : isOverallReady;
    const today = new Date().toISOString().split('T')[0];
    const isAnimalFemale = (animal.sex || '').toLowerCase().startsWith('f');
    const newAssessment: BreedingAssessment = {
      id: `ASM-${Date.now().toString().slice(-4)}`,
      animalId: animal.id,
      femaleId: isAnimalFemale ? animal.id : undefined,
      femaleName: isAnimalFemale ? (animal.name || animal.species) : undefined,
      maleId: !isAnimalFemale ? animal.id : undefined,
      maleName: !isAnimalFemale ? (animal.name || animal.species) : undefined,
      species: animal.species || 'Wildlife Species',
      scientificName: animal.scientificName,
      assessmentDate: today,
      assessedBy: 'Admin Supervisor',
      status: isEligible ? 'ELIGIBLE' : (breedingEvaluation.failureReasons.length > 0 ? 'NOT ELIGIBLE' : 'REVIEW'),
      notes: isEligible
        ? `Individual breeding benchmarks satisfied for ${speciesStandard?.name || animal.species} (Age: ${breedingEvaluation.ageMonths}m, Wt: ${animal.weight}g). Qualified for mate pairing.`
        : `Assessment completed - Not Eligible. Deficits: ${breedingEvaluation.failureReasons.length > 0 ? breedingEvaluation.failureReasons.join('; ') : 'Species target weight/age benchmark not met'}.`,
      benchmarks: {
        weightGrams: animal.weight || 0,
        ageMonths: breedingEvaluation.ageMonths || 0,
        healthCleared: readinessHealthPassed,
        quarantineCleared: true,
        seasonalCycleMatched: readinessSeasonPassed,
      },
      readinessScore: breedingEvaluation.scorePercentage,
      compatibilityScore: breedingEvaluation.scorePercentage,
      recommendations: breedingEvaluation.recommendations.length > 0
        ? breedingEvaluation.recommendations
        : [isEligible ? 'Animal qualified. Proceed with mate selection and pairing lock.' : 'Continue dietary conditioning and monitor growth towards species targets.'],
      failureReasons: breedingEvaluation.failureReasons,
    };

    if (onAddBreedingAssessment) {
      onAddBreedingAssessment(newAssessment);
    }

    onUpdateAnimal({
      ...animal,
      breedingStatus: isEligible ? 'Ready for Pairing' : 'Not Eligible',
    });

    setSavedAssessmentFeedback(
      isEligible
        ? '✓ Individual Breeding Assessment saved as ELIGIBLE. Animal is qualified for mate pairing!'
        : '✓ Breeding Assessment saved as NOT ELIGIBLE. Logged into facility breeding database for monitoring.'
    );
    setTimeout(() => setSavedAssessmentFeedback(null), 6000);
  };

  const handleConfirmPairing = () => {
    if (!selectedOppositeId) return;
    const isAnimalFemale = (animal.sex || '').toLowerCase().startsWith('f');
    const femaleId = isAnimalFemale ? animal.id : selectedOppositeId;
    const maleId = isAnimalFemale ? selectedOppositeId : animal.id;
    const today = new Date().toISOString().split('T')[0];

    // 1. Create Enclosure Transfer Task if selected
    const targetEnc = enclosures.find(e => e.id === pairingTransferEnclosureId) || enclosures[0];
    if (targetEnc) {
      const transferTask: Task = {
        id: 'TASK-' + Math.floor(10000 + Math.random() * 90000),
        animalId: animal.id,
        type: 'Transfer' as any,
        title: `Transfer ${animal.name || animal.species} to ${targetEnc.name} for Breeding Pairing`,
        time: '08:30 AM',
        date: pairingTransferDate || today,
        details: `Breeding Transfer: Pair with candidate ${selectedPartnerAnimal?.name || selectedOppositeId}.\nTarget Enclosure: ${targetEnc.name}\nNotes: ${pairNotes || breedingAssessmentNotes}`,
        frequency: 'Once',
        status: 'Pending',
        enclosureId: targetEnc.id
      };
      onAddTask(transferTask);
    }

    // 2. Log the pair assessment
    if (onAddBreedingAssessment) {
      const partnerAnimal = animals.find(a => a.id === selectedOppositeId);
      const femaleAnimal = isAnimalFemale ? animal : partnerAnimal;
      const maleAnimal = isAnimalFemale ? partnerAnimal : animal;
      const pairAsm: BreedingAssessment = {
        id: `ASM-${Date.now().toString().slice(-4)}`,
        animalId: animal.id,
        partnerId: selectedOppositeId,
        femaleId,
        femaleName: femaleAnimal?.name || femaleId,
        maleId,
        maleName: maleAnimal?.name || maleId,
        species: animal.species || 'Wildlife Species',
        scientificName: animal.scientificName,
        assessmentDate: today,
        assessedBy: 'Admin Supervisor',
        status: pairEvaluation && !pairEvaluation.bothQualified ? 'NOT ELIGIBLE' : 'ELIGIBLE',
        notes: pairNotes || `Paired breeding assessment and lock initiated between ${femaleId} (F) and ${maleId} (M). ${breedingAssessmentNotes}`,
        benchmarks: {
          weightGrams: animal.weight || 0,
          ageMonths: breedingEvaluation.ageMonths || 0,
          healthCleared: readinessHealthPassed,
          quarantineCleared: true,
          seasonalCycleMatched: readinessSeasonPassed,
        },
        readinessScore: pairEvaluation ? pairEvaluation.compatibilityScore : breedingEvaluation.scorePercentage,
        compatibilityScore: pairEvaluation ? pairEvaluation.compatibilityScore : breedingEvaluation.scorePercentage,
        recommendations: pairEvaluation ? [pairEvaluation.summaryNote] : ['Monitor pairing behavior and lock status.'],
        failureReasons: pairEvaluation && !pairEvaluation.bothQualified ? (pairEvaluation.femaleEval.failureReasons.concat(pairEvaluation.maleEval.failureReasons)) : [],
      };
      onAddBreedingAssessment(pairAsm);
    }

    // 3. Log the breeding record
    const partnerAnimal = animals.find(a => a.id === selectedOppositeId);
    const femaleAnimal = isAnimalFemale ? animal : partnerAnimal;
    const maleAnimal = isAnimalFemale ? partnerAnimal : animal;
    const femaleImg = (femaleAnimal?.image || femaleAnimal?.imageUrl || femaleAnimal?.photoUrl || '').trim();
    const maleImg = (maleAnimal?.image || maleAnimal?.imageUrl || maleAnimal?.photoUrl || '').trim();

    const newBreeding: BreedingRecord = {
      id: 'BRD-' + Math.floor(1000 + Math.random() * 9000),
      femaleId,
      maleId,
      femaleName: femaleAnimal?.name,
      maleName: maleAnimal?.name,
      femaleImage: femaleImg || undefined,
      maleImage: maleImg || undefined,
      species: animal.species,
      breedingType: 'Natural Mating',
      breedingDate: pairingTransferDate || today,
      status: 'PAIRED',
      notes: pairNotes || `Breeding plan initiated. Recommended window: ${pairingSeasonDateRange}. ${breedingAssessmentNotes}`,
      createdBy: 'Admin Owner',
      createdAt: today,
    };
    onAddBreedingRecord(newBreeding);

    // 4. Update animal breeding status
    onUpdateAnimal({
      ...animal,
      breedingStatus: 'In Progress',
    });

    setIsAddingPair(false);
    setPairNotes('');
    setSavedAssessmentFeedback('✓ Breeding Plan created and Transfer Task added to schedule!');
    setTimeout(() => setSavedAssessmentFeedback(null), 6000);
  };

  const handleAddBreedingLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalBreedingType = (breedingType === 'Others' || breedingType === 'Other')
      ? (customBreedingType.trim() || 'Other Breeding Method')
      : breedingType;

    const activePair = breedingRecords.find(b => isBreedingRecordActive(b) && (b.femaleId === animal.id || b.maleId === animal.id));
    if (activePair && onUpdateBreedingRecord) {
      onUpdateBreedingRecord({
        ...activePair,
        breedingType: finalBreedingType,
        breedingDate: breedingLogDate,
        clutchSize: clutchSize !== '' ? Number(clutchSize) : activePair.clutchSize,
        hatchDate: hatchDate || activePair.hatchDate,
        hatchlings: hatchlings !== '' ? Number(hatchlings) : activePair.hatchlings,
        unhatchedEggs: unhatchedEggs !== '' ? Number(unhatchedEggs) : activePair.unhatchedEggs,
        status: breedingStatusInput,
        notes: pairNotes ? `${activePair.notes ? activePair.notes + ' | ' : ''}${pairNotes}` : activePair.notes,
      });
    } else {
      const isAnimalFemale = (animal.sex || '').toLowerCase().startsWith('f');
      const partnerAnimal = animals.find(a => a.id === selectedOppositeId);
      const femaleAnimal = isAnimalFemale ? animal : partnerAnimal;
      const maleAnimal = isAnimalFemale ? partnerAnimal : animal;
      const resolvedFemaleImg = (femaleAnimal?.image || femaleAnimal?.imageUrl || femaleAnimal?.photoUrl || '').trim();
      const resolvedMaleImg = (maleAnimal?.image || maleAnimal?.imageUrl || maleAnimal?.photoUrl || '').trim();

      const newRecord: BreedingRecord = {
        id: 'BRD-' + Math.floor(1000 + Math.random() * 9000),
        femaleId: femaleAnimal?.id || animal.id,
        maleId: maleAnimal?.id || (selectedOppositeId || (isAnimalFemale ? `${animal.id}-SIRE` : animal.id)),
        femaleName: femaleAnimal?.name || (isAnimalFemale ? animal.name : undefined),
        maleName: maleAnimal?.name || (!isAnimalFemale ? animal.name : undefined),
        femaleImage: resolvedFemaleImg || undefined,
        maleImage: resolvedMaleImg || undefined,
        species: animal.species,
        breedingType: finalBreedingType,
        breedingDate: breedingLogDate || new Date().toISOString().split('T')[0],
        clutchSize: clutchSize !== '' ? Number(clutchSize) : undefined,
        hatchDate: hatchDate || undefined,
        hatchlings: hatchlings !== '' ? Number(hatchlings) : undefined,
        unhatchedEggs: unhatchedEggs !== '' ? Number(unhatchedEggs) : undefined,
        status: breedingStatusInput,
        notes: pairNotes || 'Clutch logged by Admin.',
        createdBy: 'Admin Owner',
        createdAt: new Date().toISOString().split('T')[0]
      };
      onAddBreedingRecord(newRecord);
    }
    setIsAddingBreedingLog(false);
  };

  const handleNextTransferStep = () => {
    if (transferStep === 1) {
      setTransferStep(2);
    } else if (transferStep === 2) {
      if (!newOwnerName.trim()) {
        setTransferOwnerError('Please enter the recipient Full Name or Facility Name.');
        return;
      }
      setTransferOwnerError(null);
      setTransferStep(3);
    } else if (transferStep === 3) {
      // Validate that all required documents have an attached file unless pending clearance is allowed
      const missingRequired = transferDocuments.filter(doc => doc.required && !doc.fileName);
      if (missingRequired.length > 0 && !allowPendingPermits) {
        const missingNames = missingRequired.map(d => d.title).join(', ');
        setTransferDocError(`Required Document(s) Missing: Please attach a file for: ${missingNames} before proceeding, or check "Permits filed physically / Upload later" below.`);
        return;
      }
      setTransferDocError(null);

      // Generate list of attached document summaries
      const attachedList = transferDocuments
        .filter(doc => doc.fileName)
        .map(doc => `${doc.title} [${doc.fileName} - ${doc.fileSize || 'Attached'}]`);
      setUploadedTransferPermits(attachedList);
      setTransferStep(4);
    } else if (transferStep === 4) {
      // Execute Transfer & Archive Animal!
      const refNo = 'TR-2026-' + Math.floor(1000 + Math.random() * 9000);
      const attachedList = transferDocuments
        .filter(doc => doc.fileName)
        .map(doc => `${doc.title} [${doc.fileName} - ${doc.fileSize || 'Attached'}]`);

      const finalTransferType = (transferType === 'Others' || transferType === 'Other')
        ? (customTransferType.trim() || 'Other Transfer')
        : transferType;

      const finalGovIdType = (govIdType === 'Others' || govIdType === 'Other')
        ? (customGovIdType.trim() || 'Other ID')
        : govIdType;

      const newTransfer: TransferRecord = {
        id: 'TFR-' + Math.floor(10000 + Math.random() * 90000),
        animalId: animal.id,
        transferType: finalTransferType,
        transferDate: new Date().toISOString().split('T')[0],
        oldOwner: 'Admin Owner',
        newOwnerName,
        newOwnerContact,
        newOwnerEmail,
        newOwnerAddress,
        governmentIdType: finalGovIdType,
        governmentIdNumber: govIdNumber,
        additionalNotes: transferNotes,
        status: 'Completed',
        documents: attachedList,
        referenceNo: refNo,
        createdBy: 'Admin Owner'
      };
      onAddTransfer(newTransfer);

      // Archive animal
      const archivedAnimal = {
        ...animal,
        isArchived: true,
        archiveCategory: 'Transferred' as const,
        archiveReason: `Transferred to ${newOwnerName} (${finalTransferType})`,
        archiveDate: new Date().toISOString().split('T')[0],
        archiveNotes: `Transferred to ${newOwnerName}. Ref: ${refNo}. Notes: ${transferNotes || 'None'}`
      };
      onUpdateAnimal(archivedAnimal);

      setTransferStep(5);
    }
  };

  return (
    <div className={isSidePanel ? "w-full h-full flex flex-col overflow-hidden" : "fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-1 sm:p-4"}>
      <div className={isSidePanel 
        ? `w-full h-full flex flex-col overflow-hidden ${isDarkMode ? 'bg-[#071F11]' : 'bg-white shadow-xl rounded-3xl'}`
        : `bg-white dark:bg-[#071F11] rounded-2xl sm:rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col md:flex-row h-[96vh] sm:h-[92vh] md:h-[90vh] max-h-[98vh]`}>
        
        {/* Left Column (Animal Media) - Only shown in modal view */}
        {!isSidePanel && (
          <div className="w-full h-28 sm:h-36 md:h-full md:w-[36%] lg:w-[33%] shrink-0 flex flex-col bg-slate-950 dark:bg-[#04110A] overflow-hidden border-b md:border-b-0 md:border-r border-slate-800 dark:border-emerald-950/80 relative">
            
            {/* Full-Height Photo Display Box */}
            <div className="relative w-full h-full overflow-hidden bg-black group flex items-center justify-center">
              {(currentImage || animal.image || animal.imageUrl || animal.photoUrl) ? (
                <>
                  {/* Subtle Ambient Blurred Background */}
                  <img 
                    src={currentImage || animal.image || animal.imageUrl || animal.photoUrl} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-cover filter blur-xl scale-125 opacity-40 pointer-events-none"
                    referrerPolicy="no-referrer"
                  />

                  {/* Clean Static Specimen Photo Area */}
                  <div className="w-full h-full overflow-hidden flex items-center justify-center relative z-5 select-none">
                    <img 
                      src={currentImage || animal.image || animal.imageUrl || animal.photoUrl} 
                      alt={animal.name || animal.species} 
                      draggable={false}
                      className="max-w-full max-h-full object-contain pointer-events-none select-none transition-all duration-200" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>

                  {/* Discrete Corner Action Controls on Hover */}
                  <div className="absolute top-2 right-2 md:top-3 md:right-3 flex items-center space-x-1.5 z-20 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setIsAdjustingPhoto(true)}
                      className="p-1.5 md:p-2 bg-black/70 hover:bg-black/90 backdrop-blur-md text-white rounded-lg md:rounded-xl border border-white/20 shadow-lg cursor-pointer transition-all"
                      title="Adjust Photo Framing"
                    >
                      <Camera className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    </button>
                    <button
                      onClick={() => setShowFullscreenPhoto(true)}
                      className="p-1.5 md:p-2 bg-black/70 hover:bg-black/90 backdrop-blur-md text-white rounded-lg md:rounded-xl border border-white/20 shadow-lg cursor-pointer transition-all"
                      title="View Full Resolution"
                    >
                      <Maximize2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-3 md:p-6 text-center text-slate-500 space-y-1 md:space-y-2">
                  <div className="p-2 md:p-4 rounded-full bg-slate-900 border border-slate-800/80 shadow-inner">
                    <Camera className="w-5 h-5 md:w-8 md:h-8 text-emerald-500/80" />
                  </div>
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">No Photo</span>
                  <button
                    onClick={() => setIsAdjustingPhoto(true)}
                    className="mt-1 px-3 py-1 md:px-3.5 md:py-1.5 bg-[#113C24] hover:bg-[#1B5234] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-[11px] md:text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm"
                  >
                    Upload Photo
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Column (Header, Tabs, and Content) */}
        <div className={`flex-1 flex flex-col min-h-0 h-full overflow-hidden ${
          isDarkMode ? 'bg-[#071F11]' : 'bg-white'
        }`}>
          
          {/* Header */}
          <div className={`p-3 sm:p-4 md:p-6 shrink-0 ${
            isDarkMode ? 'bg-[#071F11] text-emerald-100' : 'bg-white text-slate-800'
          }`}>
            <span className={`text-[10px] font-extrabold uppercase tracking-wider block mb-1 md:mb-2 ${
              isDarkMode ? 'text-emerald-400' : 'text-emerald-800'
            }`}>
              Animals
            </span>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3 md:space-x-5">
                {/* Show standard banner image only if we are in side panel mode */}
                {isSidePanel && (
                  <div 
                    onClick={() => setIsAdjustingPhoto(true)}
                    className="w-14 h-14 md:w-20 md:h-20 rounded-2xl overflow-hidden border border-slate-200/40 shrink-0 bg-slate-900 shadow-xs cursor-pointer relative group flex items-center justify-center"
                    title="Click to adjust photo"
                  >
                    {(currentImage || animal.image) ? (
                      <img 
                        src={currentImage || animal.image} 
                        alt={animal.name || animal.species} 
                        style={{ transform: `scale(${imageZoom / 100})` }}
                        className={`w-full h-full ${
                          imageFit === 'contain' ? 'object-contain' : imageFit === 'fill' ? 'object-fill' : 'object-cover'
                        }`} 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                        <Camera className="w-5 h-5 text-emerald-500/80" />
                        <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">No Photo</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Sliders className="w-4 h-4" />
                    </div>
                  </div>
                )}
                <div className="space-y-0.5 md:space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-[#113C24] dark:text-white leading-tight">
                      {animal.name ? `${animal.name} (${animal.id})` : animal.id}
                    </h2>
                    <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                      animal.healthStatus === 'Healthy' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800' 
                        : animal.healthStatus === 'Under Treatment'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
                    }`}>
                      {animal.healthStatus || 'Healthy'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-emerald-300/60 leading-tight">
                    {animal.species} {animal.scientificName && <span className="italic font-normal opacity-85">({animal.scientificName})</span>} • {animal.morph}
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-400 dark:text-emerald-300/40 leading-tight pt-0.5">
                    Enclosure: {currentEnclosure?.name || 'Unassigned'} • {currentEnclosure?.facility || 'Reptile House 1'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 md:space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditingBasicInfo(true)}
                  className={`px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    isDarkMode
                      ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  }`}
                  title="Edit Animal Profile"
                >
                  <Edit2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Edit Animal</span>
                </button>
                <button
                  onClick={() => setIsRemoveModalOpen(true)}
                  className={`px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    isDarkMode
                      ? 'bg-rose-950/40 border-rose-900/60 text-rose-300 hover:bg-rose-900/60'
                      : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                  }`}
                  title="Remove / Delete Animal"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden sm:inline">Delete Animal</span>
                </button>
                <button onClick={onClose} className={`p-1.5 rounded-xl cursor-pointer transition-colors ${
                  isDarkMode ? 'bg-emerald-950/60 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-900/20' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                }`}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Tab Selection (Sleek horizontal pills, minimal height) */}
          <div className={`flex gap-1.5 overflow-x-auto no-scrollbar scroll-smooth shrink-0 pb-2 px-3 sm:px-5 ${
            isDarkMode ? 'bg-[#071F11]' : 'bg-white'
          }`}>
            {[
              { id: 'overview', label: 'Overview', icon: PawPrint },
              { id: 'enclosure', label: 'Enclosure', icon: Layout },
              { id: 'feeding', label: 'Feeding & Care', icon: Calendar },
              { id: 'medical', label: 'Medical', icon: Activity },
              { id: 'breeding', label: 'Breeding', icon: Heart },
              { id: 'transfer', label: 'Transfer', icon: ArrowLeftRight },
              { id: 'documents', label: 'Documents', icon: FileText }
            ].map(tab => {
              const Icon = tab.icon;
              const isTabActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setIsAssigningEnclosure(false);
                    setIsAddingSchedule(false);
                    setScheduleStep(1);
                    setIsAttachingMedical(false);
                    setIsAddingPair(false);
                    setIsStartingTransfer(false);
                  }}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isTabActive 
                      ? (isDarkMode ? 'bg-emerald-950/70 text-emerald-300 font-black border border-emerald-800/40' : 'bg-emerald-50 text-[#113C24] font-extrabold border border-emerald-200/60') 
                      : (isDarkMode ? 'text-emerald-200/50 hover:text-white' : 'text-slate-400 hover:text-slate-800')
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isTabActive ? (isDarkMode ? 'text-emerald-400' : 'text-[#113C24]') : 'text-slate-400/60'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Main Body */}
          <div className={`flex-1 min-h-0 overflow-y-auto ${isSidePanel ? 'p-3 sm:p-4' : 'p-4 sm:p-6'} ${isDarkMode ? 'bg-[#05160E]' : 'bg-[#FAF8F2]'}`}>
          
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 animate-fadeIn">
              {/* BASIC INFORMATION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-emerald-900/30">
                  <h4 className="font-extrabold text-sm text-[#113C24] dark:text-emerald-400">Basic Information</h4>
                  <button
                    type="button"
                    onClick={() => setIsEditingBasicInfo(true)}
                    className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer border border-emerald-500/30"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Edit Details</span>
                  </button>
                </div>
                <div className="space-y-1 text-xs">
                  {[
                    { label: 'Animal ID', value: animal.id },
                    { label: 'Name (Optional)', value: animal.name || 'None' },
                    { label: 'Species', value: animal.species },
                    { label: 'Morph / Breed', value: animal.morph },
                    { label: 'Sex', value: animal.sex, isSex: true },
                    { label: 'Date of Birth (Est.)', value: formatDateString(animal.dob) },
                    { label: 'Age (Auto)', value: calculateAge(animal.dob) },
                    { label: 'Age Group', value: getAgeStage(animal.dob).stage },
                    { label: 'Date Acquired', value: formatDateString(animal.dateAcquired) },
                    { label: 'Source', value: animal.source || 'Captive Bred' }
                  ].map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 px-1 hover:bg-slate-50/50 dark:hover:bg-emerald-950/10 rounded-lg transition-colors">
                      <span className="text-slate-400 dark:text-emerald-300/40 font-semibold">{item.label}</span>
                      {item.isSex ? (
                        <span className={`font-bold ${animal.sex === 'Female' ? 'text-pink-500 dark:text-pink-400' : 'text-blue-500 dark:text-blue-400'}`}>
                          {animal.sex === 'Female' ? '♀ Female' : '♂ Male'}
                        </span>
                      ) : (
                        <span className="font-bold text-slate-800 dark:text-slate-200">{item.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* MEASUREMENTS & STATUSES */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-sm text-[#113C24] dark:text-emerald-400 pb-1">Measurement</h4>
                <div className="space-y-2 text-xs">
                  
                  {/* Weight Row */}
                  <div className="flex items-center justify-between py-2 px-1 hover:bg-slate-50/50 dark:hover:bg-emerald-950/10 rounded-lg transition-colors">
                    <div>
                      <span className="text-slate-400 dark:text-emerald-300/40 font-semibold">Latest Weight</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                        {animal.weight} g
                      </span>
                    </div>
                    <button className="px-3 py-1.5 text-[11px] font-bold text-[#113C24] bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-lg hover:bg-emerald-100/60 dark:hover:bg-emerald-950/80 transition-colors">
                      View History
                    </button>
                  </div>

                  {/* Length Row */}
                  <div className="flex items-center justify-between py-2 px-1 hover:bg-slate-50/50 dark:hover:bg-emerald-950/10 rounded-lg transition-colors">
                    <div>
                      <span className="text-slate-400 dark:text-emerald-300/40 font-semibold">Latest Length</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                        {animal.length} cm
                      </span>
                    </div>
                    <button className="px-3 py-1.5 text-[11px] font-bold text-[#113C24] bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-lg hover:bg-emerald-100/60 dark:hover:bg-emerald-950/80 transition-colors">
                      View History
                    </button>
                  </div>

                  {/* Health Status Row */}
                  <div className="flex items-center justify-between py-2 px-1 hover:bg-slate-50/50 dark:hover:bg-emerald-950/10 rounded-lg transition-colors">
                    <span className="text-slate-400 dark:text-emerald-300/40 font-semibold">Health Status</span>
                    <div className="flex items-center space-x-2">
                      {hasHealthAssessment ? (
                        <>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {animal.healthStatus}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                            animal.healthStatus === 'Healthy'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400'
                              : 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-[#201605] dark:text-amber-400'
                          }`}>
                            {animal.healthStatus}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 italic">
                            No medical record yet
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-100 dark:bg-[#201605] dark:text-amber-400">
                            Pending Checkup
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Breeding Status Row */}
                  <div className="flex items-center justify-between py-2 px-1 hover:bg-slate-50/50 dark:hover:bg-emerald-950/10 rounded-lg transition-colors">
                    <span className="text-slate-400 dark:text-emerald-300/40 font-semibold">Breeding Status</span>
                    <div className="flex items-center space-x-2">
                      {hasBreedingAssessment ? (
                        <>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {animal.breedingStatus}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400">
                            {animal.breedingStatus}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 italic">
                            No assessment yet
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
                            Unassessed
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* 2. ENCLOSURE TAB */}
          {activeTab === 'enclosure' && (
            <div className="space-y-6">
              {/* Back to Previous / Breeding Banner */}
              {redirectSource && (
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-700/60 shadow-md">
                  <button
                    type="button"
                    onClick={() => {
                      const target = redirectSource;
                      setRedirectSource(null);
                      setActiveTab(target);
                      setIsAssigningEnclosure(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-black text-xs flex items-center space-x-2 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4 text-black" />
                    <span>Back to {redirectSource === 'breeding' ? 'Breeding' : 'Previous Section'}</span>
                  </button>
                  <span className="text-xs text-emerald-300 font-medium">
                    Select destination vivarium for pairing transfer
                  </span>
                </div>
              )}

              {!animal.enclosureId && !isAssigningEnclosure ? (
                <div className="bg-[#071F11]/40 rounded-2xl p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-950/40 rounded-full flex items-center justify-center text-emerald-300 mx-auto">
                    📦
                  </div>
                  <h4 className="font-bold text-base text-white">No enclosure assigned yet.</h4>
                  <p className="text-xs text-emerald-300/60 max-w-sm mx-auto">Assigning an enclosure helps you track the animal's location, environmental conditions, cleaning schedule, and security.</p>
                  <button
                    onClick={() => {
                      setIsAssigningEnclosure(true);
                      setTransferFilterOnlyPassedClimate(false);
                      setSelectedEnclosureId(enclosures[0]?.id || '');
                    }}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-xl cursor-pointer shadow-md transition-all active:scale-95"
                  >
                    + Assign Enclosure
                  </button>
                </div>
              ) : isAssigningEnclosure ? (
                <form onSubmit={handleAssignEnclosureSubmit} className="bg-[#04160C] p-6 rounded-2xl space-y-6 border border-emerald-900/60 shadow-xl">
                  <div className="pb-3 border-b border-emerald-900/40 flex justify-between items-center">
                    <h3 className="font-extrabold text-base text-emerald-400">
                      {animal.enclosureId ? 'Transfer Enclosure' : 'Assign Enclosure'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAssigningEnclosure(false);
                        if (redirectSource) {
                          const target = redirectSource;
                          setRedirectSource(null);
                          setActiveTab(target);
                        }
                      }}
                      className="text-emerald-300/80 hover:text-white text-xs font-bold cursor-pointer flex items-center space-x-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{redirectSource ? `Back to ${redirectSource === 'breeding' ? 'Breeding' : 'Previous'}` : 'Cancel'}</span>
                    </button>
                  </div>
                  <div className="space-y-5">
                    {/* Enclosure & Reptile Type Filter Header */}
                      <div className="bg-[#020D07] p-3.5 rounded-2xl border border-emerald-900/60 space-y-3 mb-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="text-xs font-extrabold text-emerald-400 flex items-center space-x-1.5">
                            <Filter className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Filter Destination Enclosures</span>
                          </label>
                          <div className="flex items-center space-x-2">
                            {/* Passed Climate Quick Toggle (Only shown for breeding transfers where target climate is required) */}
                            {redirectSource === 'breeding' && (
                              <button
                                type="button"
                                onClick={() => setTransferFilterOnlyPassedClimate(prev => !prev)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                                  transferFilterOnlyPassedClimate
                                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-sm'
                                    : 'bg-[#04160C] text-emerald-400 border-emerald-800/80 hover:bg-emerald-950/80'
                                }`}
                              >
                                <Thermometer className="w-3 h-3" />
                                <span>{transferFilterOnlyPassedClimate ? '✓ Target Climate Filter' : 'Show All Enclosures'}</span>
                              </button>
                            )}

                            {(transferFilterReptileType !== 'All' || transferFilterFacility !== 'All' || transferSearchQuery !== '' || (redirectSource === 'breeding' && transferFilterOnlyPassedClimate)) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTransferFilterReptileType('All');
                                  setTransferFilterFacility('All');
                                  setTransferSearchQuery('');
                                  setTransferFilterOnlyPassedClimate(false);
                                }}
                                className="text-[10px] text-emerald-400 hover:underline font-bold"
                              >
                                Reset Filters
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {/* 1. Reptile Habitat / Enclosure Type Filter */}
                          <div>
                            <span className="text-[10px] font-bold text-emerald-300/60 block mb-1">Reptile / Enclosure Type</span>
                            <select
                              value={transferFilterReptileType}
                              onChange={(e) => setTransferFilterReptileType(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#04160C] text-white border border-emerald-900/80 focus:border-emerald-400 outline-none cursor-pointer"
                            >
                              <option value="All">All Enclosure Types</option>
                              {Array.from(new Set([
                                ...enclosures.map(e => e.type),
                                'Glass Terrarium',
                                'PVC Enclosure',
                                'Acrylic Terrarium',
                                'Mesh Aviary',
                                'Screen Enclosure',
                                'Tub Rack System',
                                'Outdoor Paddock',
                                'Aquarium',
                                'Wooden Vivarium',
                                'Aquatic Tank'
                              ])).filter(Boolean).map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>

                          {/* 2. Facility / Facility Location Filter */}
                          <div>
                            <span className="text-[10px] font-bold text-emerald-300/60 block mb-1">Facility Room</span>
                            <select
                              value={transferFilterFacility}
                              onChange={(e) => setTransferFilterFacility(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#04160C] text-white border border-emerald-900/80 focus:border-emerald-400 outline-none cursor-pointer"
                            >
                              <option value="All">All Facilities</option>
                              {Array.from(new Set(enclosures.map(e => e.facility))).filter(Boolean).map(fac => (
                                <option key={fac} value={fac}>{fac}</option>
                              ))}
                            </select>
                          </div>

                          {/* 3. Search Bar */}
                          <div>
                            <span className="text-[10px] font-bold text-emerald-300/60 block mb-1">Search Enclosure</span>
                            <input
                              type="text"
                              placeholder="Name, ID, or species..."
                              value={transferSearchQuery}
                              onChange={(e) => setTransferSearchQuery(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#04160C] text-white border border-emerald-900/80 focus:border-emerald-400 outline-none placeholder-emerald-800"
                            />
                          </div>
                        </div>
                      </div>

                    {/* Interactive Selection List of Available Destination Enclosures */}
                    <div>
                      {(() => {
                        const inService = enclosures.filter(enc => enc.condition !== 'Out of Service');
                        const speciesCompatible = inService.filter(enc => isEnclosureSpeciesCompatible(enc, animal.species, animals));
                        const climatePassed = speciesCompatible.filter(enc => evaluateEnclosureClimateQualification(enc, animal.species).isQualified);

                        const baseList = (redirectSource === 'breeding' && transferFilterOnlyPassedClimate)
                          ? climatePassed 
                          : speciesCompatible;

                        const filteredList = baseList
                          .filter(enc => transferFilterReptileType === 'All' || enc.type === transferFilterReptileType)
                          .filter(enc => transferFilterFacility === 'All' || enc.facility === transferFilterFacility)
                          .filter(enc => {
                            if (!transferSearchQuery.trim()) return true;
                            const q = transferSearchQuery.toLowerCase().trim();
                            return (enc.name || '').toLowerCase().includes(q) ||
                                   (enc.id || '').toLowerCase().includes(q) ||
                                   (enc.type || '').toLowerCase().includes(q) ||
                                   (enc.facility || '').toLowerCase().includes(q);
                          })
                          .sort((a, b) => {
                            if (redirectSource === 'breeding') {
                              const aQual = evaluateEnclosureClimateQualification(a, animal.species).isQualified ? 1 : 0;
                              const bQual = evaluateEnclosureClimateQualification(b, animal.species).isQualified ? 1 : 0;
                              return bQual - aQual;
                            }
                            return 0;
                          });

                        return (
                          <div>
                            <div className="flex flex-wrap justify-between items-center gap-1.5 mb-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400/70">
                                  Available Destination Enclosures ({filteredList.length}{filteredList.length !== enclosures.length ? ` of ${enclosures.length}` : ''}) — <span className="text-emerald-300">Species: {animal.species}</span>
                                </label>
                                {redirectSource === 'breeding' && speciesStandard?.coolingTempRange && (
                                  <span className="text-[10px] text-emerald-300 font-extrabold bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-800/80">
                                    🌡️ Target Climate: {speciesStandard.coolingTempRange.split('(')[0].trim()}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-emerald-300/60">
                                Click enclosure card to select
                              </span>
                            </div>

                            {filteredList.length === 0 ? (
                              <div className="p-6 text-center bg-[#020B06] rounded-2xl border border-emerald-900/40 text-emerald-300/80 space-y-2.5">
                                <div className="text-amber-400 font-bold text-sm">
                                  {redirectSource === 'breeding' && transferFilterOnlyPassedClimate
                                    ? '⚠️ No Enclosures Matching Target Climate'
                                    : 'No Matching Enclosures Found'}
                                </div>
                                <p className="text-xs text-slate-300 max-w-md mx-auto">
                                  {redirectSource === 'breeding' && transferFilterOnlyPassedClimate
                                    ? `None of the available enclosures for ${animal.species} currently have a recorded temperature in the required target range (${speciesStandard?.coolingTempRange || 'target climate requirement'}).`
                                    : 'No enclosures found matching your current filter criteria.'}
                                </p>
                                {redirectSource === 'breeding' && transferFilterOnlyPassedClimate && (
                                  <button
                                    type="button"
                                    onClick={() => setTransferFilterOnlyPassedClimate(false)}
                                    className="px-4 py-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 text-xs font-bold rounded-xl cursor-pointer transition-all"
                                  >
                                    View All Enclosures (Show Unfiltered)
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {filteredList.map(enc => {
                                  const isSelected = enc.id === selectedEnclosureId;
                                  const qual = evaluateEnclosureClimateQualification(enc, animal.species);
                                  const maxCap = getEnclosureCapacityLimit(enc);
                                  const housedAnimals = getEnclosureOccupants(enc, animals);
                                  const currentCount = housedAnimals.length;
                                  const availableSpace = Math.max(0, maxCap - currentCount);
                                  const defaultImg = "https://images.unsplash.com/photo-1544943910-4c1dc44aeee2?auto=format&fit=crop&w=300&q=80";

                                  // Reptile suitability label
                                  let suitability = '🦎 General Reptile Enclosure';
                                  const encNameLower = enc.name.toLowerCase();
                                  if (encNameLower.includes('bearded') || encNameLower.includes('basking') || encNameLower.includes('pogona') || encNameLower.includes('arid')) {
                                    suitability = '🦎 Arid & Desert Terrarium (Bearded Dragons, Agamids)';
                                  } else if (encNameLower.includes('python') || encNameLower.includes('snake') || encNameLower.includes('boa')) {
                                    suitability = '🐍 Tropical Snake & Python Enclosure (Ball Pythons, Boas)';
                                  } else if (encNameLower.includes('gecko') || encNameLower.includes('crested')) {
                                    suitability = '🦎 Arboreal Bioactive Enclosure (Crested Geckos, Day Geckos)';
                                  } else if (encNameLower.includes('tortoise') || encNameLower.includes('paddock') || encNameLower.includes('sulcata')) {
                                    suitability = '🐢 Terrestrial Paddock & Enclosure (Tortoises, Turtles)';
                                  } else if (enc.type.toLowerCase().includes('screen')) {
                                    suitability = '🦎 Mesh Arboreal Habitat (Chameleons, Geckos)';
                                  } else if (enc.type.toLowerCase().includes('aquatic')) {
                                    suitability = '🐢 Semi-Aquatic Tank (Turtles & Water Reptiles)';
                                  } else if (enc.type.toLowerCase().includes('glass') || enc.type.toLowerCase().includes('pvc')) {
                                    suitability = `🦎 ${enc.type} Enclosure`;
                                  }

                                  return (
                                    <div
                                      key={enc.id}
                                      onClick={() => setSelectedEnclosureId(enc.id)}
                                      className={`p-3 rounded-2xl border flex items-center space-x-3.5 transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-[#041C0F] border-emerald-400 shadow-md ring-1 ring-emerald-400/40'
                                          : 'bg-[#020B06] border-emerald-900/40 hover:border-emerald-700/60 hover:bg-[#031109]'
                                      }`}
                                    >
                                      <img
                                        src={enc.image || defaultImg}
                                        alt={enc.name}
                                        className="w-12 h-12 object-cover rounded-xl border border-emerald-800/60 shrink-0"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="font-mono text-emerald-400 font-bold text-xs">{enc.id}</span>
                                          <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold">
                                            {enc.condition || 'Good'}
                                          </span>
                                          {/* Temperature badge (Only show climate status warning/passed if transferring specifically for breeding) */}
                                          {redirectSource === 'breeding' ? (
                                            <>
                                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center space-x-1 border ${
                                                qual.isQualified
                                                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80'
                                                  : 'bg-amber-950/80 text-amber-300 border-amber-700/70'
                                              }`}>
                                                <span>🌡️</span>
                                                <span>{enc.temperature || 'Not Set'}</span>
                                                <span className="ml-1">{qual.isQualified ? '✓ PASSED' : '⚠️ OUT OF RANGE'}</span>
                                              </span>
                                              {qual.isQualified && (
                                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[9px] font-black">
                                                  ★ Target Matched
                                                </span>
                                              )}
                                            </>
                                          ) : (
                                            <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center space-x-1">
                                              <span>🌡️</span>
                                              <span>{enc.temperature || 'Not Set'}</span>
                                            </span>
                                          )}
                                        </div>
                                        <h5 className="font-extrabold text-white text-sm leading-tight truncate mt-0.5">
                                          {enc.name}
                                        </h5>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                          <span className="text-emerald-300/80 text-[10px] font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/60">
                                            🏢 {enc.facility} • {enc.type}
                                          </span>
                                          <span className="text-emerald-400/90 text-[9px] font-bold bg-emerald-900/30 px-2 py-0.5 rounded">
                                            {suitability}
                                          </span>
                                          <span className="text-amber-300/90 text-[9px] font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900/60">
                                            🐾 {currentCount}/{maxCap} Occupant{currentCount !== 1 ? 's' : ''}{housedAnimals.length > 0 ? `: ${housedAnimals.map(a => a.name || a.id).join(', ')}` : ''}
                                          </span>
                                          {availableSpace > 0 ? (
                                            <span className="text-emerald-300 font-extrabold text-[9px] bg-emerald-950/90 border border-emerald-700/80 px-2 py-0.5 rounded">
                                              📦 Available Space: {availableSpace} animal{availableSpace > 1 ? 's' : ''} can be added
                                            </span>
                                          ) : (
                                            <span className="text-rose-300 font-extrabold text-[9px] bg-rose-950/90 border border-rose-800/80 px-2 py-0.5 rounded">
                                              ⛔ At Capacity Limit ({currentCount}/{maxCap})
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <div className="text-emerald-400 font-extrabold text-[11px] px-2.5 py-1 bg-emerald-950 rounded-lg border border-emerald-800/80 shrink-0">
                                          ✓ Selected
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-emerald-300/60 mb-1">Notes (Optional)</label>
                      <textarea
                        rows={2}
                        value={enclosureNotes}
                        onChange={(e) => setEnclosureNotes(e.target.value)}
                        placeholder="Enter any initial assignment notes or environmental goals..."
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[#020B06] text-white placeholder-emerald-100/20 focus:outline-none focus:ring-1 focus:ring-emerald-500 border border-emerald-900/60"
                      ></textarea>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-2 border-t border-emerald-900/40">
                    <button type="button" onClick={() => setIsAssigningEnclosure(false)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-300/80 bg-emerald-950/40 hover:bg-emerald-900/60 cursor-pointer">Cancel</button>
                    <button type="submit" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-xl cursor-pointer transition-all shadow-md active:scale-95">
                      {animal.enclosureId ? 'Confirm Transfer' : 'Assign Enclosure'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="bg-[#071F11]/40 p-6 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center pb-1">
                      <h4 className="font-extrabold text-sm text-emerald-400">Current Enclosure</h4>
                      <button
                        onClick={() => {
                          setIsAssigningEnclosure(true);
                          setTransferFilterOnlyPassedClimate(false);
                          setSelectedEnclosureId(animal.enclosureId || '');
                        }}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-xl cursor-pointer shadow-md transition-all active:scale-95"
                      >
                        {currentEnclosure ? 'Transfer Enclosure' : 'Assign Enclosure'}
                      </button>
                    </div>

                    {/* Rich Enclosure Card matching Image 2 */}
                    {currentEnclosure ? (
                      <div className="p-3.5 bg-[#031109] rounded-2xl border border-emerald-800/80 flex items-center space-x-3.5 shadow-sm">
                        <img
                          src={currentEnclosure.image || "https://images.unsplash.com/photo-1544943910-4c1dc44aeee2?auto=format&fit=crop&w=300&q=80"}
                          alt={currentEnclosure.name}
                          className="w-14 h-14 object-cover rounded-xl border border-emerald-800/60 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="font-mono text-emerald-400 font-bold text-xs">{currentEnclosure.id}</span>
                            <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide">
                              {currentEnclosure.condition || 'Good'}
                            </span>
                            <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide flex items-center space-x-1">
                              <span>🌡️</span>
                              <span>{currentEnclosure.temperature || 'Not Set'}</span>
                            </span>
                            {currentEnclosure.climateProfile?.status === 'Pending Setup' && (
                              <span className="bg-cyan-950/90 text-cyan-300 border border-cyan-500/80 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide flex items-center space-x-1">
                                <span className="animate-pulse">🌡️</span>
                                <span>Breeding Temp Change Req: {currentEnclosure.climateProfile.coolingTempRange || '18°C–20°C'} (Keeper Setup)</span>
                              </span>
                            )}
                            {currentEnclosure.climateProfile?.status === 'Pending Approval' && (
                              <span className="bg-amber-950/90 text-amber-300 border border-amber-500/80 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide flex items-center space-x-1">
                                <span className="animate-pulse">🌡️</span>
                                <span>Readings Submitted: {currentEnclosure.climateProfile.dayTemp}°C Day / {currentEnclosure.climateProfile.nightTemp}°C Night (Pending Admin)</span>
                              </span>
                            )}
                            {currentEnclosure.climateProfile?.status === 'Approved' && currentEnclosure.climateProfile.isActive && (
                              <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/80 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide flex items-center space-x-1">
                                <span>❄️ Climate Active: {currentEnclosure.climateProfile.dayTemp}°C Day / {currentEnclosure.climateProfile.nightTemp}°C Night</span>
                              </span>
                            )}
                          </div>
                          <h5 className="font-extrabold text-white text-base leading-tight truncate mt-0.5">
                            {currentEnclosure.name}
                          </h5>
                          <p className="text-emerald-300/70 text-xs font-medium flex items-center space-x-1.5 mt-0.5">
                            <span>🏢</span>
                            <span>{currentEnclosure.facility} • {currentEnclosure.type} • 🌡️ {currentEnclosure.temperature || 'Not Set'}</span>
                          </p>
                          {currentEnclosure.climateProfile?.status === 'Pending Setup' && (
                            <div className="mt-2 p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-[11px] text-cyan-200 flex items-center justify-between">
                              <span><strong>Breeding Climate Request:</strong> Target {currentEnclosure.climateProfile.coolingTempRange || '18°C–20°C'} cooling assigned to Animal Keeper ({currentEnclosure.climateProfile.requestedAt || 'Recently requested'}).</span>
                              <span className="font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0 ml-2">Awaiting Calibration</span>
                            </div>
                          )}
                          {currentEnclosure.climateProfile?.status === 'Pending Approval' && (
                            <div className="mt-2 p-2 rounded-xl bg-amber-950/60 border border-amber-500/40 text-[11px] text-amber-200 flex items-center justify-between">
                              <span><strong>Keeper Vivarium Readings:</strong> {currentEnclosure.climateProfile.dayTemp}°C Day / {currentEnclosure.climateProfile.nightTemp}°C Night configured by {currentEnclosure.climateProfile.configuredByKeeper || 'Keeper'}.</span>
                              <span className="font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 ml-2">Pending Admin Approval</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-[#031109] rounded-2xl border border-emerald-900/60 text-center space-y-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-xl mx-auto">
                          🏠
                        </div>
                        <div>
                          <h5 className="font-extrabold text-white text-sm">No Enclosure Assigned</h5>
                          <p className="text-xs text-emerald-300/70 mt-1 max-w-sm mx-auto">
                            This specimen currently has no habitat assigned. Assign an enclosure when ready.
                          </p>
                        </div>
                      </div>
                    )}

                    {currentEnclosure && (() => {
                      const curMaxCap = getEnclosureCapacityLimit(currentEnclosure);
                      const curOccupants = getEnclosureOccupants(currentEnclosure, animals);
                      const curAvail = Math.max(0, curMaxCap - curOccupants.length);

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-xs pt-2 border-t border-emerald-900/30">
                          <div><span className="text-emerald-300/40 block font-medium">Enclosure ID</span><span className="font-bold text-slate-200">{currentEnclosure.id}</span></div>
                          <div><span className="text-emerald-300/40 block font-medium">Enclosure Name</span><span className="font-bold text-slate-200">{currentEnclosure.name}</span></div>
                          <div><span className="text-emerald-300/40 block font-medium">Facility Location</span><span className="font-bold text-slate-200">{currentEnclosure.facility}</span></div>
                          <div><span className="text-emerald-300/40 block font-medium">Type</span><span className="font-bold text-slate-200">{currentEnclosure.type}</span></div>
                          <div><span className="text-emerald-300/40 block font-medium">Occupancy Limit</span><span className="font-bold text-emerald-300">{curOccupants.length} / {curMaxCap} Animals</span></div>
                          <div><span className="text-emerald-300/40 block font-medium">Available Space</span><span className="font-extrabold text-emerald-400 font-mono text-xs">{curAvail} space{curAvail !== 1 ? 's' : ''} left</span></div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className={`${isDarkMode ? 'bg-[#071F11]/40 text-slate-200' : 'bg-white border border-slate-200 text-slate-800 shadow-2xs'} p-6 rounded-2xl space-y-4`}>
                    <h4 className={`font-bold text-sm ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'} pb-2`}>Enclosure History</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className={`${isDarkMode ? 'text-emerald-300/60 border-emerald-950/60' : 'text-slate-500 border-slate-200 bg-slate-50/80'} border-b font-bold`}>
                            <th className="py-2.5 px-3">Enclosure ID</th>
                            <th className="py-2.5 px-3">Enclosure Name</th>
                            <th className="py-2.5 px-3">Facility</th>
                            <th className="py-2.5 px-3">Current Temp</th>
                            <th className="py-2.5 px-3">Date Assigned</th>
                          </tr>
                        </thead>
                        <tbody className={isDarkMode ? 'divide-emerald-950/40' : 'divide-slate-100'}>
                          {currentEnclosure ? (
                            <tr className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                              <td className={`py-2.5 px-3 font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>{currentEnclosure.id}</td>
                              <td className="py-2.5 px-3">{currentEnclosure.name}</td>
                              <td className="py-2.5 px-3">{currentEnclosure.facility}</td>
                              <td className={`py-2.5 px-3 font-mono font-bold ${isDarkMode ? 'text-emerald-300' : 'text-slate-800'}`}>{currentEnclosure.temperature || 'Not Set'}</td>
                              <td className="py-2.5 px-3">
                                {formatDateString(currentEnclosure.assignedDate || animal.dateAcquired || todayIso)}
                              </td>
                            </tr>
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-6 px-3 text-center text-slate-400 italic">
                                No enclosure assignment on record. Assign an enclosure to house this specimen.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. FEEDING & CARE TAB */}
          {activeTab === 'feeding' && (
            <div className="space-y-6">
              {animalTasks.length === 0 && !isAddingSchedule ? (
                <div className="bg-white dark:bg-[#071F11] rounded-3xl p-10 border border-slate-200 dark:border-emerald-900/60 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-emerald-950/80 rounded-2xl flex items-center justify-center text-3xl mx-auto border border-slate-100 dark:border-emerald-900/50">
                    🍽
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-slate-800 dark:text-white">
                      No Feeding & Care Schedule Yet
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                      No tasks have been added for {animal.name || animal.id} yet. Click below to add a custom feeding or care schedule when needed.
                    </p>
                  </div>
                   <button
                     onClick={() => handleOpenAddSchedule('both', 0)}
                     className="px-6 py-2.5 bg-[#113C24] hover:bg-[#1B5234] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
                   >
                     <Plus className="w-4 h-4" />
                     <span>+ Add Feeding & Care Schedule</span>
                   </button>
                </div>
              ) : isAddingSchedule ? (
                <div className={`rounded-3xl border overflow-hidden shadow-lg transition-colors ${
                  isDarkMode ? 'bg-[#071F11] border-emerald-900/60 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  {/* Modal Header & Step Indicator */}
                  <div className={`p-6 border-b ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-white border-slate-100'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className={`text-lg font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {scheduleStep === 0 && 'Select Schedule Category'}
                          {scheduleStep === 1 && 'Configure Feeding Task'}
                          {scheduleStep === 2 && 'Configure Animal Care Task'}
                          {scheduleStep === 3 && 'Review & Confirm Schedule'}
                        </h2>
                        <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-emerald-300/60' : 'text-slate-500'}`}>
                          {scheduleStep === 0 && 'Choose whether to schedule Feeding only, Care routine only, or Both.'}
                          {scheduleStep === 1 && 'Set food prey, feeding frequency, method, and schedule time.'}
                          {scheduleStep === 2 && 'Specify physical exams, shedding assistance, or supplement tasks.'}
                          {scheduleStep === 3 && 'Verify schedule details before creating active tasks.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setIsAddingSchedule(false); setScheduleStep(0); }}
                        className={`p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors ${
                          isDarkMode ? 'hover:bg-emerald-900/40 hover:text-white' : 'hover:bg-slate-100'
                        }`}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Step Wizard Progress Bar */}
                    <div className="flex items-center justify-between pt-2 overflow-x-auto gap-1">
                      {/* Step 0 Pill */}
                      <button
                        type="button"
                        onClick={() => setScheduleStep(0)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          scheduleStep === 0
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                            : scheduleStep > 0
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                            : 'bg-slate-800/40 text-slate-400 border-slate-700/60'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-slate-950/30 flex items-center justify-center text-[11px]">
                          {scheduleStep > 0 ? '✓' : '1'}
                        </span>
                        <span>Type</span>
                      </button>

                      {scheduleType !== 'care' && (
                        <>
                          <div className={`h-0.5 flex-1 min-w-[8px] transition-colors ${scheduleStep >= 1 ? 'bg-emerald-500' : 'bg-slate-700/50'}`} />

                          {/* Step 1 Pill */}
                          <button
                            type="button"
                            onClick={() => setScheduleStep(1)}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${
                              scheduleStep === 1
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                                : scheduleStep > 1
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                : 'bg-slate-800/40 text-slate-400 border-slate-700/60'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-slate-950/30 flex items-center justify-center text-[11px]">
                              {scheduleStep > 1 ? '✓' : '2'}
                            </span>
                            <span>Feeding</span>
                          </button>
                        </>
                      )}

                      {scheduleType !== 'feeding' && (
                        <>
                          <div className={`h-0.5 flex-1 min-w-[8px] transition-colors ${scheduleStep >= 2 ? 'bg-emerald-500' : 'bg-slate-700/50'}`} />

                          {/* Step 2 Pill */}
                          <button
                            type="button"
                            onClick={() => setScheduleStep(2)}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${
                              scheduleStep === 2
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                                : scheduleStep > 2
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                : 'bg-slate-800/40 text-slate-400 border-slate-700/60'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-slate-950/30 flex items-center justify-center text-[11px]">
                              {scheduleStep > 2 ? '✓' : (scheduleType === 'care' ? '2' : '3')}
                            </span>
                            <span>Care</span>
                          </button>
                        </>
                      )}

                      <div className={`h-0.5 flex-1 min-w-[8px] transition-colors ${scheduleStep >= 3 ? 'bg-emerald-500' : 'bg-slate-700/50'}`} />

                      {/* Step 3 Pill */}
                      <button
                        type="button"
                        onClick={() => setScheduleStep(3)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          scheduleStep === 3
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                            : 'bg-slate-800/40 text-slate-400 border-slate-700/60'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-slate-950/30 flex items-center justify-center text-[11px]">
                          {scheduleType === 'both' ? '4' : '3'}
                        </span>
                        <span>Review & Save</span>
                      </button>
                    </div>
                  </div>

                  {/* STEP 0: SELECT SCHEDULE SCOPE */}
                  {scheduleStep === 0 && (
                    <div className="p-6 space-y-6">
                      {/* Animal Details Box */}
                      <div className={`p-3.5 rounded-2xl border flex items-center space-x-3.5 ${
                        isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-slate-50/60 border-slate-100'
                      }`}>
                        <img
                          src={animal.image || 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&q=80&w=200'}
                          alt={animal.id}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200/80 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className={`font-extrabold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {animal.id} - {animal.name || animal.species}
                            </span>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full">
                              {animal.healthStatus || 'Healthy'}
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-emerald-300/70' : 'text-slate-500'}`}>
                            {animal.species} {animal.scientificName ? `(${animal.scientificName})` : ''} • Age Group: <strong className="text-emerald-400">{currentAgeStage}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className={`block text-xs font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-emerald-300' : 'text-slate-600'}`}>
                          What schedule task would you like to add?
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Feeding Only */}
                          <button
                            type="button"
                            onClick={() => setScheduleType('feeding')}
                            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                              scheduleType === 'feeding'
                                ? 'bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/30'
                                : isDarkMode
                                ? 'bg-[#04110A] border-emerald-900/60 hover:border-emerald-700'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-2xl">🍽</span>
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                scheduleType === 'feeding' ? 'border-emerald-500 bg-emerald-500 text-slate-950 font-bold text-xs' : 'border-slate-500'
                              }`}>
                                {scheduleType === 'feeding' && '✓'}
                              </div>
                            </div>
                            <div>
                              <h4 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                Feeding Only
                              </h4>
                              <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-emerald-300/70' : 'text-slate-500'}`}>
                                Food item, prey quantity, feeding method, frequency & time.
                              </p>
                            </div>
                          </button>

                          {/* Care Only */}
                          <button
                            type="button"
                            onClick={() => setScheduleType('care')}
                            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                              scheduleType === 'care'
                                ? 'bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/30'
                                : isDarkMode
                                ? 'bg-[#04110A] border-emerald-900/60 hover:border-emerald-700'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-2xl">🦎</span>
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                scheduleType === 'care' ? 'border-emerald-500 bg-emerald-500 text-slate-950 font-bold text-xs' : 'border-slate-500'
                              }`}>
                                {scheduleType === 'care' && '✓'}
                              </div>
                            </div>
                            <div>
                              <h4 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                Care Routine Only
                              </h4>
                              <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-emerald-300/70' : 'text-slate-500'}`}>
                                Health exams, weight logs, shedding, or hydration baths.
                              </p>
                            </div>
                          </button>

                          {/* Both Feeding & Care */}
                          <button
                            type="button"
                            onClick={() => setScheduleType('both')}
                            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                              scheduleType === 'both'
                                ? 'bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/30'
                                : isDarkMode
                                ? 'bg-[#04110A] border-emerald-900/60 hover:border-emerald-700'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-2xl">✨</span>
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                scheduleType === 'both' ? 'border-emerald-500 bg-emerald-500 text-slate-950 font-bold text-xs' : 'border-slate-500'
                              }`}>
                                {scheduleType === 'both' && '✓'}
                              </div>
                            </div>
                            <div>
                              <h4 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                Both Feeding & Care
                              </h4>
                              <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-emerald-300/70' : 'text-slate-500'}`}>
                                Complete schedule setup (Feeding task + Animal care routine).
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Step 0 Footer Actions */}
                      <div className={`flex justify-between items-center pt-4 border-t ${isDarkMode ? 'border-emerald-900/60' : 'border-slate-100'}`}>
                        <button
                          type="button"
                          onClick={() => { setIsAddingSchedule(false); setScheduleStep(0); }}
                          className={`px-5 py-2.5 border rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            isDarkMode ? 'border-emerald-900/60 text-emerald-300 hover:bg-emerald-950/60' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (scheduleType === 'care') {
                              setScheduleStep(2);
                            } else {
                              setScheduleStep(1);
                            }
                          }}
                          className="px-6 py-2.5 bg-[#113C24] hover:bg-[#1B5234] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
                        >
                          <span>Next Step →</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 1: FEEDING TASK CONFIGURATION */}
                  {scheduleStep === 1 && (
                    <div className="p-6 space-y-6">
                      {/* Animal Details Box */}
                      <div className={`p-3.5 rounded-2xl border flex items-center space-x-3.5 ${
                        isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-slate-50/60 border-slate-100'
                      }`}>
                        <img
                          src={animal.image || 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&q=80&w=200'}
                          alt={animal.id}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200/80 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className={`font-extrabold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {animal.id} - {animal.name || animal.species}
                            </span>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full">
                              {animal.healthStatus || 'Healthy'}
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-emerald-300/70' : 'text-slate-500'}`}>
                            {animal.species} {animal.scientificName ? `(${animal.scientificName})` : ''} • Age Group: <strong className="text-emerald-400">{currentAgeStage}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Feeding Form Card */}
                      <div className={`p-5 rounded-2xl border space-y-4 ${
                        isDarkMode ? 'bg-[#04110A]/80 border-emerald-900/50' : 'bg-white border-slate-200/80 shadow-xs'
                      }`}>
                        <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2.5">
                          <h3 className={`font-bold text-sm flex items-center space-x-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            <span>🍽 Feeding Details</span>
                          </h3>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800">
                            {scheduleType === 'feeding' ? 'Task 1 of 1' : 'Task 1 of 2'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-emerald-200' : 'text-slate-500'}`}>
                              Food / Prey Item (From Inventory) *
                            </label>
                            <div className="relative">
                              <select
                                value={foodItem}
                                onChange={(e) => setFoodItem(e.target.value)}
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold appearance-none outline-none transition-colors pr-8 ${
                                  isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60 focus:border-emerald-400' : 'bg-slate-50/50 text-slate-900 border-slate-200 focus:border-[#113C24]'
                                }`}
                              >
                                {(() => {
                                  const feedingItems = inventory.filter(isStrictFoodItem);
                                  const fallbackFoodList = [
                                    { id: 'f-def-1', name: 'Small Dubia Roaches', currentStock: 100, unit: 'pcs', category: 'Feeding' },
                                    { id: 'f-def-2', name: 'Medium Dubia Roaches', currentStock: 80, unit: 'pcs', category: 'Feeding' },
                                    { id: 'f-def-3', name: 'Large Dubia Roaches', currentStock: 50, unit: 'pcs', category: 'Feeding' },
                                    { id: 'f-def-4', name: 'Mealworms', currentStock: 200, unit: 'pcs', category: 'Feeding' },
                                    { id: 'f-def-5', name: 'Crickets', currentStock: 150, unit: 'pcs', category: 'Feeding' },
                                    { id: 'f-def-6', name: 'Fresh Salad Greens & Veggies', currentStock: 20, unit: 'portions', category: 'Feeding' },
                                    { id: 'f-def-7', name: 'Pinky Mouse', currentStock: 30, unit: 'pcs', category: 'Feeding' },
                                    { id: 'f-def-8', name: 'Fuzzy / Hopper Mouse', currentStock: 25, unit: 'pcs', category: 'Feeding' },
                                    { id: 'f-def-9', name: 'Small / Medium Rat', currentStock: 20, unit: 'pcs', category: 'Feeding' },
                                  ];
                                  const itemsToDisplay = feedingItems.length > 0 ? feedingItems : fallbackFoodList;
                                  const isCurrentInList = itemsToDisplay.some(i => i.name.toLowerCase() === (foodItem || '').toLowerCase());

                                  return (
                                    <>
                                      {!isCurrentInList && foodItem && foodItem !== 'Other' && (
                                        <option value={foodItem}>
                                          🐁 {foodItem} (Selected Prey)
                                        </option>
                                      )}
                                      {itemsToDisplay.map(item => (
                                        <option key={item.id} value={item.name}>
                                          {item.name.toLowerCase().includes('mouse') || item.name.toLowerCase().includes('rat') ? '🐁' : '🦗'} {item.name} ({item.currentStock} {item.unit} available)
                                        </option>
                                      ))}
                                      <option value="Other">➕ Other / Custom Prey Item...</option>
                                    </>
                                  );
                                })()}
                              </select>
                              <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Custom Prey Name Input if Other is chosen or if custom item is typed */}
                            {(foodItem === 'Other' || (!inventory.filter(isStrictFoodItem).some(i => i.name.toLowerCase() === (foodItem || '').toLowerCase()) && foodItem && !['Small Dubia Roaches', 'Medium Dubia Roaches', 'Large Dubia Roaches', 'Mealworms', 'Crickets', 'Fresh Salad Greens & Veggies', 'Pinky Mouse', 'Fuzzy / Hopper Mouse', 'Small / Medium Rat'].includes(foodItem))) && (
                              <div className="mt-2.5 animate-fadeIn">
                                <label className={`block text-[11px] font-semibold mb-1 ${isDarkMode ? 'text-emerald-300' : 'text-slate-600'}`}>
                                  Custom Prey Name / Description *
                                </label>
                                <input
                                  type="text"
                                  value={foodItem === 'Other' ? '' : foodItem}
                                  onChange={(e) => setFoodItem(e.target.value)}
                                  placeholder="e.g. Mice, Pinky Mice, Hopper Mice, Repashy..."
                                  className={`w-full px-3.5 py-2 rounded-xl border text-xs font-bold outline-none transition-colors ${
                                    isDarkMode ? 'bg-[#04110A] text-white border-emerald-900/60 focus:border-emerald-400' : 'bg-white text-slate-900 border-slate-200 focus:border-[#113C24]'
                                  }`}
                                />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-emerald-200' : 'text-slate-500'}`}>
                              Quantity & Unit *
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={feedingQtyNumber}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFeedingQtyNumber(val);
                                  const unit = feedingQtyUnit === 'Other' ? (feedingQtyCustomUnit || 'pcs') : feedingQtyUnit;
                                  setQuantity(`${val} ${unit}`.trim());
                                }}
                                placeholder="e.g. 1, 5, 10"
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold text-center outline-none transition-colors ${
                                  isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60 focus:border-emerald-400' : 'bg-slate-50/50 text-slate-900 border-slate-200 focus:border-[#113C24]'
                                }`}
                              />
                              <div className="relative">
                                <select
                                  value={feedingQtyUnit}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFeedingQtyUnit(val);
                                    const unit = val === 'Other' ? (feedingQtyCustomUnit || 'pcs') : val;
                                    setQuantity(`${feedingQtyNumber} ${unit}`.trim());
                                  }}
                                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold appearance-none outline-none transition-colors pr-7 cursor-pointer ${
                                    isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60 focus:border-emerald-400' : 'bg-slate-50/50 text-slate-900 border-slate-200 focus:border-[#113C24]'
                                  }`}
                                >
                                  <option value="pc">pc (Piece)</option>
                                  <option value="pcs">pcs (Pieces)</option>
                                  <option value="g">g (Grams)</option>
                                  <option value="kg">kg (Kilograms)</option>
                                  <option value="insects">insects</option>
                                  <option value="roaches">roaches</option>
                                  <option value="crickets">crickets</option>
                                  <option value="worms">worms</option>
                                  <option value="mice">mice</option>
                                  <option value="rats">rats</option>
                                  <option value="bowl">bowl</option>
                                  <option value="bowls">bowls</option>
                                  <option value="portions">portions</option>
                                  <option value="Other">Other (Custom unit...)</option>
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
                              </div>
                            </div>
                            {feedingQtyUnit === 'Other' && (
                              <input
                                type="text"
                                placeholder="Specify custom feeding unit (e.g. slices, scoops, leaves)"
                                value={feedingQtyCustomUnit}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFeedingQtyCustomUnit(val);
                                  setQuantity(`${feedingQtyNumber} ${val}`.trim());
                                }}
                                className={`w-full mt-2 px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                                  isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60' : 'bg-slate-50/50 text-slate-900 border-slate-200'
                                }`}
                              />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-emerald-200' : 'text-slate-500'}`}>
                              Feeding Method
                            </label>
                            <div className="relative">
                              <select
                                value={method}
                                onChange={(e) => setMethod(e.target.value)}
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold appearance-none outline-none transition-colors pr-8 ${
                                  isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60 focus:border-emerald-400' : 'bg-slate-50/50 text-slate-900 border-slate-200 focus:border-[#113C24]'
                                }`}
                              >
                                <option value="Tongs">Tongs</option>
                                <option value="Bowl">Bowl</option>
                                <option value="Hand">Hand</option>
                                <option value="Scatter">Scatter</option>
                                <option value="Live Hunt">Live Hunt / Free Roam</option>
                                <option value="Assist / Force Feed">Assist / Force Feed</option>
                                <option value="Other">Other (Custom Method...)</option>
                              </select>
                              <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                            </div>
                            {method === 'Other' && (
                              <input
                                type="text"
                                placeholder="Specify custom feeding method..."
                                value={customMethod}
                                onChange={(e) => setCustomMethod(e.target.value)}
                                className={`w-full mt-2 px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                                  isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60' : 'bg-slate-50/50 text-slate-900 border-slate-200'
                                }`}
                              />
                            )}
                          </div>

                          <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-emerald-200' : 'text-slate-500'}`}>
                              Frequency
                            </label>
                            <div className="relative">
                              <select
                                value={feedingFreq}
                                onChange={(e) => setFeedingFreq(e.target.value)}
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold appearance-none outline-none transition-colors pr-8 ${
                                  isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60 focus:border-emerald-400' : 'bg-slate-50/50 text-slate-900 border-slate-200 focus:border-[#113C24]'
                                }`}
                              >
                                <option value="Every 7 days">Every 7 days</option>
                                <option value="Every 3 days">Every 3 days</option>
                                <option value="Every 2 days">Every 2 days</option>
                                <option value="Every 5 days">Every 5 days</option>
                                <option value="Daily">Daily</option>
                                <option value="Bi-weekly">Bi-weekly</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Other">Other (Custom Frequency...)</option>
                              </select>
                              <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                            </div>
                            {feedingFreq === 'Other' && (
                              <input
                                type="text"
                                placeholder="Specify custom frequency (e.g. 2x a week, every 10 days)..."
                                value={customFeedingFreq}
                                onChange={(e) => setCustomFeedingFreq(e.target.value)}
                                className={`w-full mt-2 px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                                  isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60' : 'bg-slate-50/50 text-slate-900 border-slate-200'
                                }`}
                              />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-emerald-200' : 'text-slate-500'}`}>
                              Scheduled Time
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={feedingTime}
                                onChange={(e) => setFeedingTime(e.target.value)}
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-colors pr-8 ${
                                  isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60 focus:border-emerald-400' : 'bg-slate-50/50 text-slate-900 border-slate-200 focus:border-[#113C24]'
                                }`}
                              />
                              <Clock className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                            </div>
                          </div>

                          <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-emerald-200' : 'text-slate-500'}`}>
                              Start Date
                            </label>
                            <div className="relative">
                              <input
                                type="date"
                                value={feedingDate}
                                onChange={(e) => setFeedingDate(e.target.value)}
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-colors ${
                                  isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60 focus:border-emerald-400' : 'bg-slate-50/50 text-slate-900 border-slate-200 focus:border-[#113C24]'
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-emerald-200' : 'text-slate-500'}`}>
                            Feeding Notes / Special Instructions
                          </label>
                          <input
                            type="text"
                            value={feedingNotes}
                            onChange={(e) => setFeedingNotes(e.target.value)}
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none transition-colors ${
                              isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60 focus:border-emerald-400' : 'bg-slate-50/50 text-slate-900 border-slate-200 focus:border-[#113C24]'
                            }`}
                            placeholder="e.g. Adjust quantity based on body condition and digestion cycle."
                          />
                        </div>
                      </div>

                      {/* Step 1 Footer Actions */}
                      <div className={`flex justify-between items-center pt-4 border-t ${isDarkMode ? 'border-emerald-900/60' : 'border-slate-100'}`}>
                        <button
                          type="button"
                          onClick={() => setScheduleStep(0)}
                          className={`px-5 py-2.5 border rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                            isDarkMode ? 'border-emerald-900/60 text-emerald-300 hover:bg-emerald-950/60' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>←</span>
                          <span>Back to Category</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleStep(scheduleType === 'feeding' ? 3 : 2)}
                          className="px-6 py-2.5 bg-[#113C24] hover:bg-[#1B5234] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
                        >
                          <span>Next: {scheduleType === 'feeding' ? 'Review Schedule' : 'Animal Care Task'}</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: ANIMAL CARE TASK CONFIGURATION */}
                  {scheduleStep === 2 && (
                    <div className="p-6 space-y-6">
                      {/* Care Task Form Card */}
                      <div className={`p-5 rounded-2xl border space-y-4 ${
                        isDarkMode ? 'bg-[#04110A]/80 border-emerald-900/50' : 'bg-white border-slate-200/80 shadow-xs'
                      }`}>
                        <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2.5">
                          <h3 className={`font-bold text-sm flex items-center space-x-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            <span>🦎 Animal Care Routine Details</span>
                          </h3>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800">
                            {scheduleType === 'care' ? 'Task 1 of 1' : 'Task 2 of 2'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-emerald-200' : 'text-slate-500'}`}>
                              Animal Care Task
                            </label>
                            <div className="relative">
                              <select
                                value={careTaskName}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCareTaskName(val);
                                }}
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold appearance-none outline-none transition-colors pr-8 ${
                                  isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60 focus:border-emerald-400' : 'bg-slate-50/50 text-slate-900 border-slate-200 focus:border-[#113C24]'
                                }`}
                              >
                                {ANIMAL_CARE_PRESETS.map((p) => (
                                  <option key={p.label} value={p.label}>
                                    {p.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Custom Care Task Input when 'Other' is selected */}
                            {careTaskName === 'Other' && (
                              <div className="mt-2.5">
                                <label className={`block text-[11px] font-bold mb-1 ${isDarkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                                  Specify Custom Care Task Name *
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={customCareTaskName}
                                  onChange={(e) => setCustomCareTaskName(e.target.value)}
                                  placeholder="e.g. Nebulizer Therapy, UV Light Basking Check..."
                                  className={`w-full px-3.5 py-2 rounded-xl border text-xs font-bold outline-none transition-colors ${
                                    isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60 focus:border-emerald-400' : 'bg-slate-50 text-slate-900 border-slate-200 focus:border-[#113C24]'
                                  }`}
                                />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-emerald-200' : 'text-slate-500'}`}>
                              Care Frequency
                            </label>
                            <div className="relative">
                              <select
                                value={careFreq}
                                onChange={(e) => setCareFreq(e.target.value)}
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold appearance-none outline-none transition-colors pr-8 ${
                                  isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60 focus:border-emerald-400' : 'bg-slate-50/50 text-slate-900 border-slate-200 focus:border-[#113C24]'
                                }`}
                              >
                                <option value="Every 3 days">Every 3 days</option>
                                <option value="Every 2 days">Every 2 days</option>
                                <option value="Daily">Daily</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Bi-weekly">Bi-weekly</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Other">Other (Custom Frequency...)</option>
                              </select>
                              <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                            </div>
                            {careFreq === 'Other' && (
                              <input
                                type="text"
                                placeholder="Specify custom care frequency (e.g. As needed, 2x daily)..."
                                value={customCareFreq}
                                onChange={(e) => setCustomCareFreq(e.target.value)}
                                className={`w-full mt-2 px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                                  isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60' : 'bg-slate-50/50 text-slate-900 border-slate-200'
                                }`}
                              />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-emerald-200' : 'text-slate-500'}`}>
                              Care Time
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={careTime}
                                onChange={(e) => setCareTime(e.target.value)}
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-colors pr-8 ${
                                  isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60 focus:border-emerald-400' : 'bg-slate-50/50 text-slate-900 border-slate-200 focus:border-[#113C24]'
                                }`}
                              />
                              <Clock className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                            </div>
                          </div>

                          <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-emerald-200' : 'text-slate-500'}`}>
                              Start Date
                            </label>
                            <div className="relative">
                              <input
                                type="date"
                                value={careDate}
                                onChange={(e) => setCareDate(e.target.value)}
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-colors ${
                                  isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60 focus:border-emerald-400' : 'bg-slate-50/50 text-slate-900 border-slate-200 focus:border-[#113C24]'
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Inventory Vitamin / Medicine / Supply Link */}
                        <div className={`p-4 rounded-2xl border space-y-3 ${
                          isDarkMode ? 'bg-[#071F11]/80 border-emerald-900/60' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <label className={`block text-xs font-bold ${isDarkMode ? 'text-emerald-200' : 'text-slate-700'}`}>
                              💊 Use Vitamins / Medicine / Supplies from Inventory? (Optional)
                            </label>
                            <span className="text-[10px] text-slate-400 font-medium">Auto-deducts when routine is completed</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className={careSupplyItemId ? "sm:col-span-6" : "sm:col-span-12"}>
                              <select
                                value={careSupplyItemId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCareSupplyItemId(val);
                                  const found = inventory.find(i => i.id === val);
                                  if (found) {
                                    setCareSupplyUnitSelect(found.unit || 'doses');
                                    setCareSupplyCustomUnit('');
                                  }
                                }}
                                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold outline-none ${
                                  isDarkMode ? 'bg-[#04110A] text-white border-emerald-900/60' : 'bg-white text-slate-900 border-slate-200'
                                }`}
                              >
                                <option value="">-- No Vitamins / Medicine Used --</option>
                                {inventory.filter(item => !isStrictFoodItem(item)).map(item => (
                                  <option key={item.id} value={item.id}>
                                    [{item.category}] {item.name} — Stock: {item.currentStock} {item.unit}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {careSupplyItemId && (
                              <div className="sm:col-span-6 grid grid-cols-2 gap-2">
                                <div>
                                  <input
                                    type="text"
                                    placeholder="Dose (e.g. 0.5, 1, 2)"
                                    value={careSupplyQty}
                                    onChange={(e) => setCareSupplyQty(e.target.value)}
                                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold text-center outline-none ${
                                      isDarkMode ? 'bg-[#04110A] text-white border-emerald-900/60 focus:border-emerald-400' : 'bg-white text-slate-900 border-slate-200 focus:border-[#113C24]'
                                    }`}
                                  />
                                </div>
                                <div className="relative">
                                  <select
                                    value={careSupplyUnitSelect}
                                    onChange={(e) => setCareSupplyUnitSelect(e.target.value)}
                                    className={`w-full px-2.5 py-2.5 rounded-xl border text-xs font-bold appearance-none outline-none pr-7 cursor-pointer ${
                                      isDarkMode ? 'bg-[#04110A] text-white border-emerald-900/60 focus:border-emerald-400' : 'bg-white text-slate-900 border-slate-200 focus:border-[#113C24]'
                                    }`}
                                  >
                                    <option value="ml">ml (Milliliters)</option>
                                    <option value="drops">drops (Drops)</option>
                                    <option value="doses">doses (Doses)</option>
                                    <option value="tablets">tablets (Tablets)</option>
                                    <option value="mg">mg (Milligrams)</option>
                                    <option value="g">g (Grams)</option>
                                    <option value="bottles">bottles (Bottles)</option>
                                    <option value="vials">vials (Vials)</option>
                                    <option value="scoops">scoops (Scoops)</option>
                                    <option value="sprays">sprays (Sprays / Puffs)</option>
                                    <option value="capsules">capsules (Capsules)</option>
                                    <option value="pcs">pcs (Pieces)</option>
                                    <option value="Other">Other (Custom unit...)</option>
                                  </select>
                                  <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-3 text-slate-400 pointer-events-none" />
                                </div>
                              </div>
                            )}
                          </div>

                          {careSupplyItemId && careSupplyUnitSelect === 'Other' && (
                            <div className="mt-2">
                              <input
                                type="text"
                                placeholder="Specify custom unit of measurement (e.g. pumps, pipettes, sachets)"
                                value={careSupplyCustomUnit}
                                onChange={(e) => setCareSupplyCustomUnit(e.target.value)}
                                className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                                  isDarkMode ? 'bg-[#04110A] text-white border-emerald-900/60' : 'bg-white text-slate-900 border-slate-200'
                                }`}
                              />
                            </div>
                          )}

                          {careSupplyItemId && (
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              ✓ Attached: <strong>{careSupplyQty} {careSupplyUnitSelect === 'Other' ? (careSupplyCustomUnit || 'units') : careSupplyUnitSelect}</strong> of <strong>{inventory.find(i => i.id === careSupplyItemId)?.name}</strong> will be administered and logged upon task completion.
                            </p>
                          )}
                        </div>

                        <div>
                          <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-emerald-200' : 'text-slate-500'}`}>
                            Care Notes / Instructions for Keeper
                          </label>
                          <input
                            type="text"
                            value={careNotes}
                            onChange={(e) => setCareNotes(e.target.value)}
                            placeholder="Instructions for keeper..."
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none transition-colors ${
                              isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60 focus:border-emerald-400' : 'bg-slate-50/50 text-slate-900 border-slate-200 focus:border-[#113C24]'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Step 2 Footer Actions */}
                      <div className={`flex justify-between items-center pt-4 border-t ${isDarkMode ? 'border-emerald-900/60' : 'border-slate-100'}`}>
                        <button
                          type="button"
                          onClick={() => setScheduleStep(scheduleType === 'care' ? 0 : 1)}
                          className={`px-5 py-2.5 border rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                            isDarkMode ? 'border-emerald-900/60 text-emerald-300 hover:bg-emerald-950/60' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>←</span>
                          <span>{scheduleType === 'care' ? 'Back to Category' : 'Back to Feeding Task'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleStep(3)}
                          className="px-6 py-2.5 bg-[#113C24] hover:bg-[#1B5234] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
                        >
                          <span>Next: Review Schedule</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: REVIEW & CONFIRM SCHEDULE */}
                  {scheduleStep === 3 && (
                    <div className="p-6 space-y-6">
                      {/* Summary Grid */}
                      <div className={`grid grid-cols-1 ${scheduleType === 'both' ? 'md:grid-cols-2' : ''} gap-6`}>
                        {/* Feeding Summary Card */}
                        {(scheduleType === 'both' || scheduleType === 'feeding') && (
                          <div className={`p-5 rounded-2xl border space-y-3 ${
                            isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-white border-slate-200/80 shadow-xs'
                          }`}>
                            <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2">
                              <h4 className={`font-bold text-sm ${isDarkMode ? 'text-emerald-400' : 'text-[#113C24]'}`}>
                                🍽 Feeding Summary
                              </h4>
                              <button
                                type="button"
                                onClick={() => setScheduleStep(1)}
                                className="text-[10px] text-emerald-400 hover:underline font-bold"
                              >
                                Edit Feeding
                              </button>
                            </div>
                            <ul className={`space-y-2 text-xs ${isDarkMode ? 'text-emerald-100' : 'text-slate-700'}`}>
                              <li className="flex items-start space-x-2">
                                <span className="text-slate-400">•</span>
                                <span><strong>Food / Prey:</strong> {foodItem}</span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <span className="text-slate-400">•</span>
                                <span><strong>Quantity:</strong> {quantity}</span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <span className="text-slate-400">•</span>
                                <span><strong>Method:</strong> {method}</span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <span className="text-slate-400">•</span>
                                <span><strong>Frequency:</strong> {feedingFreq}</span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <span className="text-slate-400">•</span>
                                <span><strong>Time:</strong> {feedingTime}</span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <span className="text-slate-400">•</span>
                                <span><strong>Start Date:</strong> {feedingDate}</span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <span className="text-slate-400">•</span>
                                <span><strong>Notes:</strong> {feedingNotes}</span>
                              </li>
                              <li className="flex items-start space-x-2 pt-1.5 border-t border-emerald-950/40">
                                <span className="text-emerald-400 font-bold">👤</span>
                                <span><strong>Assigned Keeper:</strong> {(() => {
                                  const k = availableKeepers.find(s => s.id === assignedKeeperForSchedule);
                                  return k ? `${k.name} (${k.role || 'Keeper'})` : (animal.assignedKeeperName ? `${animal.assignedKeeperName} (Designated Keeper)` : 'Duty Keepers / General Pool');
                                })()}</span>
                              </li>
                            </ul>
                          </div>
                        )}

                        {/* Care Summary Card */}
                        {(scheduleType === 'both' || scheduleType === 'care') && (
                          <div className={`p-5 rounded-2xl border space-y-3 ${
                            isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-white border-slate-200/80 shadow-xs'
                          }`}>
                            <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2">
                              <h4 className={`font-bold text-sm ${isDarkMode ? 'text-emerald-400' : 'text-[#113C24]'}`}>
                                🦎 Care Routine Summary
                              </h4>
                              <button
                                type="button"
                                onClick={() => setScheduleStep(2)}
                                className="text-[10px] text-emerald-400 hover:underline font-bold"
                              >
                                Edit Care Task
                              </button>
                            </div>
                            <ul className={`space-y-2 text-xs ${isDarkMode ? 'text-emerald-100' : 'text-slate-700'}`}>
                              <li className="flex items-start space-x-2">
                                <span className="text-slate-400">•</span>
                                <span><strong>Task Name:</strong> {careTaskName === 'Other' ? (customCareTaskName || 'Custom Animal Care') : careTaskName}</span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <span className="text-slate-400">•</span>
                                <span><strong>Frequency:</strong> {careFreq}</span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <span className="text-slate-400">•</span>
                                <span><strong>Time:</strong> {careTime}</span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <span className="text-slate-400">•</span>
                                <span><strong>Start Date:</strong> {careDate}</span>
                              </li>
                              {careSupplyItemId && (
                                <li className="flex items-start space-x-2 text-emerald-400">
                                  <span>•</span>
                                  <span><strong>Supplies/Med:</strong> {careSupplyQty} {careSupplyUnitSelect === 'Other' ? (careSupplyCustomUnit || 'units') : careSupplyUnitSelect} of {inventory.find(i => i.id === careSupplyItemId)?.name}</span>
                                </li>
                              )}
                              <li className="flex items-start space-x-2">
                                <span className="text-slate-400">•</span>
                                <span><strong>Notes:</strong> {careNotes}</span>
                              </li>
                              <li className="flex items-start space-x-2 pt-1.5 border-t border-emerald-950/40">
                                <span className="text-emerald-400 font-bold">👤</span>
                                <span><strong>Assigned Keeper:</strong> {(() => {
                                  const k = availableKeepers.find(s => s.id === assignedKeeperForSchedule);
                                  return k ? `${k.name} (${k.role || 'Keeper'})` : (animal.assignedKeeperName ? `${animal.assignedKeeperName} (Designated Keeper)` : 'Duty Keepers / General Pool');
                                })()}</span>
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Save & Batch Assignment Scope */}
                      {(() => {
                        const currentSpeciesName = (animal.species || '').split('(')[0].trim().toLowerCase();
                        const currentStageName = getAgeStage(animal.dob).stage;
                        const matchingAgeGroup = (animals || []).filter(a => 
                          !a.isArchived && 
                          (a.species || '').split('(')[0].trim().toLowerCase() === currentSpeciesName &&
                          getAgeStage(a.dob).stage === currentStageName
                        );
                        const matchingAllSpecies = (animals || []).filter(a => 
                          !a.isArchived && 
                          (a.species || '').split('(')[0].trim().toLowerCase() === currentSpeciesName
                        );

                        return (
                          <div className={`p-5 rounded-2xl border space-y-4 ${
                            isDarkMode ? 'bg-[#04110A] border-emerald-900/50' : 'bg-white border-slate-200 shadow-xs'
                          }`}>
                            <div className="border-b border-emerald-900/30 pb-2.5">
                              <h4 className={`font-bold text-sm flex items-center space-x-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                <span>🎯 Assignment Scope & Target Animals</span>
                              </h4>
                              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-emerald-300/70' : 'text-slate-500'}`}>
                                Choose whether to assign this schedule to all animals in this species/age group or only to this specimen.
                              </p>
                            </div>

                            <div className="space-y-3">
                              {/* Option 1: Same Species & Age Group */}
                              <label className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                saveOption === 'same_species_age'
                                  ? (isDarkMode ? 'bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500/50' : 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500/50')
                                  : (isDarkMode ? 'bg-[#071F11]/40 border-emerald-900/40 hover:border-emerald-800' : 'bg-slate-50 border-slate-200 hover:border-slate-300')
                              }`}>
                                <input
                                  type="radio"
                                  name="saveOption"
                                  checked={saveOption === 'same_species_age'}
                                  onChange={() => setSaveOption('same_species_age')}
                                  className="w-4 h-4 mt-0.5 text-emerald-600 accent-[#113C24]"
                                />
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-800 dark:text-emerald-100">
                                      Same Species & Age Group ({animal.species} • {currentStageName})
                                    </span>
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                      {matchingAgeGroup.length} {matchingAgeGroup.length === 1 ? 'Animal' : 'Animals'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Automatically applies and assigns this schedule to all specimens belonging to the same species and age group.
                                  </p>
                                  {matchingAgeGroup.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {matchingAgeGroup.map(m => (
                                        <span key={m.id} className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/20 dark:bg-emerald-950 border border-emerald-900/60 text-emerald-300">
                                          {m.id} {m.name ? `(${m.name})` : ''}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </label>

                              {/* Option 2: All Animals of this Species */}
                              {matchingAllSpecies.length > matchingAgeGroup.length && (
                                <label className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                  saveOption === 'all_species'
                                    ? (isDarkMode ? 'bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500/50' : 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500/50')
                                    : (isDarkMode ? 'bg-[#071F11]/40 border-emerald-900/40 hover:border-emerald-800' : 'bg-slate-50 border-slate-200 hover:border-slate-300')
                                }`}>
                                  <input
                                    type="radio"
                                    name="saveOption"
                                    checked={saveOption === 'all_species'}
                                    onChange={() => setSaveOption('all_species')}
                                    className="w-4 h-4 mt-0.5 text-emerald-600 accent-[#113C24]"
                                  />
                                  <div className="space-y-1 flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-slate-800 dark:text-emerald-100">
                                        All specimens of this species ({animal.species})
                                      </span>
                                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-600">
                                        {matchingAllSpecies.length} Animals
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                      Assigns this schedule to every active {animal.species} in the facility regardless of age stage.
                                    </p>
                                  </div>
                                </label>
                              )}

                              {/* Option 3: Single Animal Only */}
                              <label className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                saveOption === 'single'
                                  ? (isDarkMode ? 'bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500/50' : 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500/50')
                                  : (isDarkMode ? 'bg-[#071F11]/40 border-emerald-900/40 hover:border-emerald-800' : 'bg-slate-50 border-slate-200 hover:border-slate-300')
                              }`}>
                                <input
                                  type="radio"
                                  name="saveOption"
                                  checked={saveOption === 'single'}
                                  onChange={() => setSaveOption('single')}
                                  className="w-4 h-4 mt-0.5 text-emerald-600 accent-[#113C24]"
                                />
                                <div className="space-y-1 flex-1 min-w-0">
                                  <span className="text-xs font-bold text-slate-800 dark:text-emerald-100 block">
                                    This specimen only ({animal.id} - {animal.name || animal.species})
                                  </span>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Save this routine exclusively for {animal.id}. Other specimens will not be affected.
                                  </p>
                                </div>
                              </label>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Step 3 Footer Actions */}
                      <div className={`flex justify-between items-center pt-4 border-t ${isDarkMode ? 'border-emerald-900/60' : 'border-slate-100'}`}>
                        <button
                          type="button"
                          onClick={() => setScheduleStep(scheduleType === 'feeding' ? 1 : 2)}
                          className={`px-5 py-2.5 border rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                            isDarkMode ? 'border-emerald-900/60 text-emerald-300 hover:bg-emerald-950/60' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>←</span>
                          <span>{scheduleType === 'feeding' ? 'Back to Feeding Task' : 'Back to Care Task'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmSchedule}
                          className="px-6 py-2.5 bg-[#113C24] hover:bg-[#1B5234] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
                        >
                          <span>Save & Assign Schedule ✓</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {scheduleActionFeedback && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between animate-in fade-in">
                      <span>{scheduleActionFeedback}</span>
                      <button type="button" onClick={() => setScheduleActionFeedback(null)} className="text-emerald-400 hover:text-white ml-2 cursor-pointer">✕</button>
                    </div>
                  )}

                  {/* Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-emerald-900/60">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`font-bold text-base flex items-center space-x-2.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          <Calendar className="w-5 h-5 text-emerald-500" />
                          <span>Feeding & Care Schedule</span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            isDarkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}>
                            {animalTasks.length} {animalTasks.length === 1 ? 'task' : 'tasks'}
                          </span>
                        </h3>
                      </div>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Active routines and schedule parameters for {animal.name || animal.species}.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button 
                        onClick={() => handleOpenAddSchedule('both', 0)} 
                        className="px-4 py-2 bg-[#113C24] hover:bg-[#1B5234] dark:bg-emerald-800 dark:hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Schedule</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 1. Feeding Column */}
                    <div className={`p-5 rounded-2xl border space-y-4 ${
                      isDarkMode ? 'bg-[#071F11]/60 border-emerald-900/60' : 'bg-white border-slate-200 shadow-xs'
                    }`}>
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-900/40 pb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`p-2 rounded-lg ${
                            isDarkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            <Utensils className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className={`font-bold text-xs uppercase tracking-wider ${
                              isDarkMode ? 'text-emerald-400' : 'text-emerald-900'
                            }`}>
                              Feeding Schedule
                            </h4>
                            <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              Dietary schedule & meal items
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          isDarkMode ? 'bg-emerald-950 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {animalTasks.filter(t => t.type === 'Feeding').length}
                        </span>
                      </div>

                      {animalTasks.filter(t => t.type === 'Feeding').length === 0 ? (
                        <div className={`p-6 text-center rounded-xl border border-dashed ${
                          isDarkMode ? 'border-emerald-900/40 text-slate-400' : 'border-slate-200 text-slate-400'
                        }`}>
                          <p className="text-xs">No feeding schedule created yet.</p>
                          <button 
                            onClick={() => handleOpenAddSchedule('feeding', 1)}
                            className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            + Add Feeding Schedule
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {animalTasks.filter(t => t.type === 'Feeding').map(task => {
                            const details = parseTaskDetails(task.details);
                            const isExpanded = !!expandedScheduleIds[task.id];
                            return (
                              <div 
                                key={task.id} 
                                className={`p-3.5 rounded-xl border transition-all relative ${
                                  isDarkMode 
                                    ? 'bg-[#04110A] border-emerald-900/50 hover:border-emerald-800' 
                                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2 pr-6">
                                  <div className="min-w-0">
                                    <h5 className={`font-bold text-xs truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                      {task.title}
                                    </h5>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                        isDarkMode ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                      }`}>
                                        Active
                                      </span>
                                      {task.frequency && (
                                        <span className={`text-[11px] flex items-center space-x-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                          <Repeat className="w-3 h-3 text-emerald-500" />
                                          <span>{task.frequency}</span>
                                        </span>
                                      )}
                                      <span className={`text-[11px] flex items-center space-x-1 ${isDarkMode ? 'text-emerald-300/80' : 'text-slate-500'}`}>
                                        <Clock className="w-3 h-3 text-emerald-500" />
                                        <span>{task.time || '08:00 AM'}</span>
                                      </span>
                                      {task.assignedKeeperName && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center space-x-1 ${
                                          isDarkMode ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        }`}>
                                          <span>👤 {task.assignedKeeperName}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="absolute top-3 right-3 flex items-center space-x-1">
                                    <button 
                                      type="button"
                                      onClick={() => setEditingTask(task)} 
                                      title="Edit schedule parameters"
                                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                                        isDarkMode ? 'text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/60' : 'text-slate-400 hover:text-emerald-700 hover:bg-slate-200'
                                      }`}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => setDeletingTaskId(task.id)} 
                                      title="Delete schedule"
                                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                                        isDarkMode ? 'text-slate-500 hover:text-red-400 hover:bg-rose-950/60' : 'text-slate-400 hover:text-red-600 hover:bg-rose-50'
                                      }`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Compact quick summary when collapsed */}
                                {!isExpanded && details.foodItem && (
                                  <div className="mt-2 text-xs text-slate-400 truncate flex items-center space-x-1.5">
                                    <Package className="w-3 h-3 text-emerald-500 shrink-0" />
                                    <span className="truncate">{details.foodItem}</span>
                                  </div>
                                )}

                                {/* Small toggle button */}
                                <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-emerald-900/40 flex items-center justify-between">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandSchedule(task.id)}
                                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 flex items-center space-x-1 cursor-pointer transition-colors"
                                  >
                                    <span>{isExpanded ? 'Hide details' : 'View all details'}</span>
                                    <span className="text-[9px]">{isExpanded ? '▴' : '▾'}</span>
                                  </button>
                                  {task.date && !isExpanded && (
                                    <span className="text-[10px] text-slate-400">
                                      Start: {task.date}
                                    </span>
                                  )}
                                </div>

                                {/* Expanded Full Details */}
                                {isExpanded && (
                                  <div className="mt-3 space-y-2.5 pt-1">
                                    <div className={`p-2.5 rounded-lg space-y-1.5 text-xs ${
                                      isDarkMode ? 'bg-[#071F11]/60 text-slate-200' : 'bg-white text-slate-700 border border-slate-100'
                                    }`}>
                                      <div className="flex items-center justify-between">
                                        <span className="flex items-center space-x-1.5">
                                          <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                          <span className="text-slate-400">Time:</span>
                                          <span className="font-semibold">{task.time || '08:00 AM'}</span>
                                        </span>
                                        {task.date && (
                                          <span className="flex items-center space-x-1 text-[11px] text-slate-400">
                                            <Calendar className="w-3 h-3" />
                                            <span>Start: {task.date}</span>
                                          </span>
                                        )}
                                      </div>

                                      {details.foodItem && (
                                        <div className="flex items-start space-x-1.5 pt-1 border-t border-slate-100 dark:border-emerald-900/30">
                                          <Package className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                          <div>
                                            <span className="text-slate-400 mr-1">Prey / Item:</span>
                                            <span className="font-semibold">{details.foodItem}</span>
                                          </div>
                                        </div>
                                      )}

                                      {details.method && (
                                        <div className="flex items-start space-x-1.5">
                                          <Utensils className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                          <div>
                                            <span className="text-slate-400 mr-1">Method:</span>
                                            <span className="font-semibold">{details.method}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {details.notes && (
                                      <p className={`text-xs px-3 py-2 rounded-lg italic ${
                                        isDarkMode ? 'bg-[#071F11]/30 text-slate-300' : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        "{details.notes}"
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 2. Care Column */}
                    <div className={`p-5 rounded-2xl border space-y-4 ${
                      isDarkMode ? 'bg-[#071F11]/60 border-emerald-900/60' : 'bg-white border-slate-200 shadow-xs'
                    }`}>
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-900/40 pb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`p-2 rounded-lg ${
                            isDarkMode ? 'bg-teal-950 text-teal-400 border border-teal-900' : 'bg-teal-50 text-teal-800'
                          }`}>
                            <Stethoscope className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className={`font-bold text-xs uppercase tracking-wider ${
                              isDarkMode ? 'text-teal-400' : 'text-teal-900'
                            }`}>
                              Care & Health Schedule
                            </h4>
                            <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              Exams, supplements & checkups
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          isDarkMode ? 'bg-teal-950 text-teal-400' : 'bg-teal-50 text-teal-700'
                        }`}>
                          {animalTasks.filter(t => t.type !== 'Feeding').length}
                        </span>
                      </div>

                      {animalTasks.filter(t => t.type !== 'Feeding').length === 0 ? (
                        <div className={`p-6 text-center rounded-xl border border-dashed ${
                          isDarkMode ? 'border-emerald-900/40 text-slate-400' : 'border-slate-200 text-slate-400'
                        }`}>
                          <p className="text-xs">No care schedule created yet.</p>
                          <button 
                            onClick={() => handleOpenAddSchedule('care', 2)}
                            className="mt-2 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                          >
                            + Add Care Schedule
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {animalTasks.filter(t => t.type !== 'Feeding').map(task => {
                            const details = parseTaskDetails(task.details);
                            const isExpanded = !!expandedScheduleIds[task.id];
                            return (
                              <div 
                                key={task.id} 
                                className={`p-3.5 rounded-xl border transition-all relative ${
                                  isDarkMode 
                                    ? 'bg-[#04110A] border-emerald-900/50 hover:border-emerald-800' 
                                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2 pr-6">
                                  <div className="min-w-0">
                                    <h5 className={`font-bold text-xs truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                      {task.title}
                                    </h5>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                        isDarkMode ? 'bg-teal-950 text-teal-400 border-teal-800' : 'bg-teal-100 text-teal-800 border-teal-200'
                                      }`}>
                                        Active Care
                                      </span>
                                      {task.frequency && (
                                        <span className={`text-[11px] flex items-center space-x-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                          <Repeat className="w-3 h-3 text-teal-500" />
                                          <span>{task.frequency}</span>
                                        </span>
                                      )}
                                      <span className={`text-[11px] flex items-center space-x-1 ${isDarkMode ? 'text-teal-300/80' : 'text-slate-500'}`}>
                                        <Clock className="w-3 h-3 text-teal-500" />
                                        <span>{task.time || '09:00 AM'}</span>
                                      </span>
                                      {task.assignedKeeperName && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center space-x-1 ${
                                          isDarkMode ? 'bg-teal-950/80 text-teal-300 border-teal-800' : 'bg-teal-50 text-teal-800 border-teal-200'
                                        }`}>
                                          <span>👤 {task.assignedKeeperName}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="absolute top-3 right-3 flex items-center space-x-1">
                                    <button 
                                      type="button"
                                      onClick={() => setEditingTask(task)} 
                                      title="Edit schedule parameters"
                                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                                        isDarkMode ? 'text-slate-400 hover:text-teal-300 hover:bg-teal-950/60' : 'text-slate-400 hover:text-teal-700 hover:bg-slate-200'
                                      }`}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => setDeletingTaskId(task.id)} 
                                      title="Delete schedule"
                                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                                        isDarkMode ? 'text-slate-500 hover:text-red-400 hover:bg-rose-950/60' : 'text-slate-400 hover:text-red-600 hover:bg-rose-50'
                                      }`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Compact quick summary when collapsed */}
                                {!isExpanded && (details.supply || details.routine) && (
                                  <div className="mt-2 text-xs text-slate-400 truncate flex items-center space-x-1.5">
                                    {details.supply ? (
                                      <>
                                        <Syringe className="w-3 h-3 text-teal-500 shrink-0" />
                                        <span className="truncate">{details.supply}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Stethoscope className="w-3 h-3 text-teal-500 shrink-0" />
                                        <span className="truncate">{details.routine}</span>
                                      </>
                                    )}
                                  </div>
                                )}

                                {/* Small toggle button */}
                                <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-emerald-900/40 flex items-center justify-between">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandSchedule(task.id)}
                                    className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 flex items-center space-x-1 cursor-pointer transition-colors"
                                  >
                                    <span>{isExpanded ? 'Hide details' : 'View all details'}</span>
                                    <span className="text-[9px]">{isExpanded ? '▴' : '▾'}</span>
                                  </button>
                                  {task.date && !isExpanded && (
                                    <span className="text-[10px] text-slate-400">
                                      Start: {task.date}
                                    </span>
                                  )}
                                </div>

                                {/* Expanded Full Details */}
                                {isExpanded && (
                                  <div className="mt-3 space-y-2.5 pt-1">
                                    <div className={`p-2.5 rounded-lg space-y-1.5 text-xs ${
                                      isDarkMode ? 'bg-[#071F11]/60 text-slate-200' : 'bg-white text-slate-700 border border-slate-100'
                                    }`}>
                                      <div className="flex items-center justify-between">
                                        <span className="flex items-center space-x-1.5">
                                          <Clock className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                                          <span className="text-slate-400">Time:</span>
                                          <span className="font-semibold">{task.time || '09:00 AM'}</span>
                                        </span>
                                        {task.date && (
                                          <span className="flex items-center space-x-1 text-[11px] text-slate-400">
                                            <Calendar className="w-3 h-3" />
                                            <span>Start: {task.date}</span>
                                          </span>
                                        )}
                                      </div>

                                      {details.supply && (
                                        <div className="flex items-start space-x-1.5 pt-1 border-t border-slate-100 dark:border-emerald-900/30">
                                          <Syringe className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
                                          <div>
                                            <span className="text-slate-400 mr-1">Supply / Med:</span>
                                            <span className="font-semibold">{details.supply}</span>
                                          </div>
                                        </div>
                                      )}

                                      {details.routine && (
                                        <div className="flex items-start space-x-1.5">
                                          <Stethoscope className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
                                          <div>
                                            <span className="text-slate-400 mr-1">Routine:</span>
                                            <span className="font-semibold">{details.routine}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {details.notes && (
                                      <p className={`text-xs px-3 py-2 rounded-lg italic ${
                                        isDarkMode ? 'bg-[#071F11]/30 text-slate-300' : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        "{details.notes}"
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. MEDICAL RECORDS TAB */}
          {activeTab === 'medical' && (
            <div className="space-y-6">
              {/* Action Feedback Banner */}
              {medActionFeedback && (
                <div className={`p-4 rounded-2xl border flex items-center space-x-3 text-xs font-bold animate-fade-in ${
                  isDarkMode ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                }`}>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>{medActionFeedback}</span>
                </div>
              )}

              {/* Health Clearance & Veterinary Control Bar */}
              <div className={`p-5 rounded-2xl border ${
                isDarkMode ? 'bg-[#071F11] border-emerald-900/60' : 'bg-white border-slate-200/80 shadow-xs'
              }`}>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      animal.healthStatus === 'Healthy'
                        ? (isDarkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-800')
                        : (animal.healthStatus === 'Under Treatment' || animal.healthStatus === 'Under Observation'
                            ? (isDarkMode ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-amber-100 text-amber-800')
                            : (isDarkMode ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-rose-100 text-rose-800'))
                    }`}>
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h3 className={`font-bold text-sm sm:text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Health & Veterinary Clearance
                        </h3>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          animal.healthStatus === 'Healthy'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : (animal.healthStatus === 'Under Treatment' || animal.healthStatus === 'Under Observation'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30')
                        }`}>
                          {animal.healthStatus || 'Healthy'}
                        </span>
                      </div>
                      <p className={`text-xs sm:text-sm mt-1.5 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {animalMedRecords.length > 0
                          ? 'Veterinary records and certificates on file. As the Administrator, you can attach official certificates or request an in-house veterinary consultation whenever needed.'
                          : 'No medical certificates on file yet. You can attach acquisition/vet certificates or request the facility veterinarian to conduct a checkup.'}
                      </p>
                    </div>
                  </div>

                  {/* Primary Action Buttons Bar */}
                  <div className={`pt-3.5 border-t flex flex-wrap items-center gap-2.5 ${
                    isDarkMode ? 'border-emerald-900/60' : 'border-slate-100'
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRequestingConsult(true);
                        setIsAttachingMedical(false);
                      }}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center justify-center space-x-2 transition-all cursor-pointer grow-0"
                    >
                      <Stethoscope className="w-4 h-4 shrink-0" />
                      <span>Request Vet Consultation / Checkup</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAttachingMedical(true);
                        setIsRequestingConsult(false);
                      }}
                      className={`px-4 py-2.5 border font-bold text-xs rounded-xl transition-all inline-flex items-center justify-center space-x-2 cursor-pointer grow-0 ${
                        isDarkMode
                          ? 'bg-[#04110A] border-emerald-800 text-emerald-300 hover:bg-emerald-950/60'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <FileCheck className="w-4 h-4 shrink-0" />
                      <span>+ Attach Vet Cert / Record</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Form 1: REQUEST VET CONSULTATION */}
              {isRequestingConsult && (
                <form onSubmit={handleRequestConsultSubmit} className={`p-6 rounded-2xl border space-y-5 animate-fade-in ${
                  isDarkMode ? 'bg-[#04110A] border-emerald-500/40 ring-1 ring-emerald-500/20 text-white' : 'bg-white border-emerald-300 ring-1 ring-emerald-200 text-slate-900 shadow-md'
                }`}>
                  <div className={`border-b pb-3 flex justify-between items-center ${isDarkMode ? 'border-emerald-900/60' : 'border-slate-100'}`}>
                    <div className="flex items-center space-x-2">
                      <Stethoscope className="w-4 h-4 text-emerald-400" />
                      <h3 className={`font-bold text-sm ${isDarkMode ? 'text-emerald-100' : 'text-slate-800'}`}>
                        Schedule Veterinary Consultation & Request Checkup
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRequestingConsult(false)}
                      className={`text-xs font-bold ${isDarkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-400 hover:text-slate-600'} cursor-pointer`}
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                    <div className="space-y-3.5">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-emerald-200' : 'text-slate-700'}`}>
                          Consultation / Checkup Type *
                        </label>
                        <select
                          value={consultType}
                          onChange={(e) => setConsultType(e.target.value)}
                          className={`w-full px-3.5 py-2 rounded-xl border text-xs font-semibold outline-none ${
                            isDarkMode ? 'bg-[#06180F] border-emerald-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <option value="Routine Health Checkup">Routine Health Checkup</option>
                          <option value="Follow-up Exam">Follow-up Exam / Progress Review</option>
                          <option value="Pre-Breeding Clearance">Pre-Breeding Health Clearance</option>
                          <option value="Quarantine Release Exam">Quarantine Release Examination</option>
                          <option value="Injury / Illness Evaluation">Injury / Illness Evaluation</option>
                          <option value="Diagnostic / Lab Work">Diagnostic / Blood & Fecal Panel</option>
                          <option value="Emergency Checkup">Emergency Veterinary Checkup</option>
                          <option value="Others">Others / Custom Consultation Type</option>
                        </select>

                        {(consultType === 'Others' || consultType === 'Other') && (
                          <div className="mt-2.5">
                            <label className={`block text-[11px] font-bold mb-1 ${isDarkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                              Specify Custom Consultation / Checkup Type *
                            </label>
                            <input
                              type="text"
                              required
                              value={customConsultType}
                              onChange={(e) => setCustomConsultType(e.target.value)}
                              placeholder="e.g. Parasitology Panel, Radiograph Check, Eye Inspection..."
                              className={`w-full px-3.5 py-2 rounded-xl border text-xs font-semibold outline-none ${
                                isDarkMode ? 'bg-[#06180F] border-emerald-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-emerald-200' : 'text-slate-700'}`}>
                            Requested By *
                          </label>
                          <input
                            type="text"
                            value={consultRequestedBy}
                            onChange={(e) => setConsultRequestedBy(e.target.value)}
                            className={`w-full px-3.5 py-2 rounded-xl border text-xs font-semibold outline-none ${
                              isDarkMode ? 'bg-[#06180F] border-emerald-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-emerald-200' : 'text-slate-700'}`}>
                            Assigned Veterinarian *
                          </label>
                          <select
                            value={consultVet}
                            onChange={(e) => setConsultVet(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${
                              isDarkMode ? 'bg-[#06180F] border-emerald-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            {registeredVets.length > 0 ? (
                              registeredVets.map(v => {
                                const roleLabel = v.role === 'vet' ? 'Veterinarian' : (v.role || 'Veterinarian');
                                return (
                                  <option key={v.id} value={`${v.name} (${roleLabel})`}>
                                    {v.name} ({roleLabel})
                                  </option>
                                );
                              })
                            ) : (
                              <option value="" disabled>-- No Registered Veterinarian in User Management --</option>
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-emerald-200' : 'text-slate-700'}`}>
                            Priority Level *
                          </label>
                          <select
                            value={consultPriority}
                            onChange={(e) => setConsultPriority(e.target.value as any)}
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${
                              isDarkMode ? 'bg-[#06180F] border-emerald-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <option value="Normal">Normal</option>
                            <option value="High">High (Urgent Attention)</option>
                            <option value="Emergency">Emergency (Immediate)</option>
                          </select>
                        </div>
                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-emerald-200' : 'text-slate-700'}`}>
                            Preferred Date *
                          </label>
                          <input
                            type="date"
                            value={consultDate}
                            onChange={(e) => setConsultDate(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                              isDarkMode ? 'bg-[#06180F] border-emerald-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-emerald-200' : 'text-slate-700'}`}>
                          Preferred Time
                        </label>
                        <input
                          type="text"
                          value={consultTime}
                          onChange={(e) => setConsultTime(e.target.value)}
                          placeholder="09:00 AM"
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
                            isDarkMode ? 'bg-[#06180F] border-emerald-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-emerald-200' : 'text-slate-700'}`}>
                          Reason for Consultation / Symptoms / Special Notes
                        </label>
                        <textarea
                          rows={4}
                          value={consultReason}
                          onChange={(e) => setConsultReason(e.target.value)}
                          placeholder="Detail observations (e.g., routine physical clearance, appetite changes, skin shedding irregularities, pre-transfer certification)..."
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none ${
                            isDarkMode ? 'bg-[#06180F] border-emerald-800 text-white placeholder-emerald-400/40' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        ></textarea>
                      </div>

                      <div className={`p-3 rounded-xl border space-y-2 ${
                        isDarkMode ? 'bg-[#06180F] border-emerald-900/80' : 'bg-emerald-50/60 border-emerald-200'
                      }`}>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={updateStatusToPending}
                            onChange={(e) => setUpdateStatusToPending(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                          <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-emerald-200' : 'text-emerald-950'}`}>
                            Flag animal status as "Under Observation" until vet checkup is complete
                          </span>
                        </label>
                        <p className={`text-[10px] ${isDarkMode ? 'text-emerald-400/70' : 'text-emerald-700'}`}>
                          ✨ Submitting creates a consultation appointment for the veterinarian and informs keepers with a scheduled checkup task.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`flex justify-end space-x-3 pt-4 border-t ${isDarkMode ? 'border-emerald-900/60' : 'border-slate-100'}`}>
                    <button
                      type="button"
                      onClick={() => setIsRequestingConsult(false)}
                      className={`px-4 py-2 border rounded-xl text-xs font-bold cursor-pointer ${
                        isDarkMode ? 'border-emerald-900/60 text-emerald-300 hover:bg-emerald-950/60' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Send Request & Schedule Consult</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Form 2: ATTACH VET CERTIFICATE / HEALTH RECORD */}
              {isAttachingMedical && (
                <form onSubmit={handleAttachMedicalSubmit} className={`p-6 rounded-2xl border space-y-5 animate-fade-in ${
                  isDarkMode ? 'bg-[#071F11] border-emerald-900/60 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'
                }`}>
                  <div className={`border-b pb-3 flex justify-between items-center ${isDarkMode ? 'border-emerald-900/60' : 'border-slate-100'}`}>
                    <div className="flex items-center space-x-2">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <h3 className={`font-bold text-sm ${isDarkMode ? 'text-emerald-100' : 'text-slate-800'}`}>
                        Attach Health Certificate / Veterinary Record
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAttachingMedical(false)}
                      className={`text-xs font-bold ${isDarkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-400 hover:text-slate-600'} cursor-pointer`}
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-emerald-200' : 'text-slate-700'}`}>
                          Document Type *
                        </label>
                        <select
                          value={docType}
                          onChange={(e) => setDocType(e.target.value)}
                          className={`w-full px-3.5 py-2 rounded-xl border text-xs font-semibold outline-none ${
                            isDarkMode ? 'bg-[#04110A] text-white border-emerald-900/60' : 'bg-white text-slate-900 border-slate-200'
                          }`}
                        >
                          <option value="Health Certificate / Vet Clearance">Health Certificate / Vet Clearance</option>
                          <option value="Deworming / Parasitology Record">Deworming / Parasitology Record</option>
                          <option value="Acquisition Clearance">Acquisition Clearance</option>
                          <option value="Previous Vet Record">Previous Vet Record</option>
                          <option value="Lab Result">Lab Result (Blood/Fecal)</option>
                          <option value="Routine Physical Clearance">Routine Physical Clearance</option>
                          <option value="Others">Others / Custom Document Type</option>
                        </select>

                        {(docType === 'Others' || docType === 'Other') && (
                          <div className="mt-2.5">
                            <label className={`block text-[11px] font-bold mb-1 ${isDarkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                              Specify Custom Document Type *
                            </label>
                            <input
                              type="text"
                              required
                              value={customDocType}
                              onChange={(e) => setCustomDocType(e.target.value)}
                              placeholder="e.g. Surgery Clearance, Radiograph Certificate, Bloodwork Report..."
                              className={`w-full px-3.5 py-2 rounded-xl border text-xs font-semibold outline-none ${
                                isDarkMode ? 'bg-[#04110A] text-white border-emerald-900/60' : 'bg-white text-slate-900 border-slate-200'
                              }`}
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-emerald-200' : 'text-slate-700'}`}>
                            Certified Health Status *
                          </label>
                          <select
                            value={certifiedHealthStatus}
                            onChange={(e) => setCertifiedHealthStatus(e.target.value as any)}
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${
                              isDarkMode ? 'bg-[#04110A] text-white border-emerald-900/60' : 'bg-white text-slate-900 border-slate-200'
                            }`}
                          >
                            <option value="Healthy">Healthy (Cleared)</option>
                            <option value="Under Observation">Under Observation</option>
                            <option value="Under Treatment">Under Treatment</option>
                            <option value="Injured">Injured</option>
                            <option value="Sick">Sick</option>
                          </select>
                        </div>

                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-emerald-200' : 'text-slate-700'}`}>
                            Record Date *
                          </label>
                          <input
                            type="date"
                            value={medRecordDate}
                            onChange={(e) => setMedRecordDate(e.target.value)}
                            className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none ${
                              isDarkMode ? 'bg-[#04110A] text-white border-emerald-900/60' : 'bg-white text-slate-900 border-slate-200'
                            }`}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-emerald-200' : 'text-slate-700'}`}>
                          Issuing Authority / Clinic / Veterinarian
                        </label>
                        <input
                          type="text"
                          value={issuingAuthority}
                          onChange={(e) => setIssuingAuthority(e.target.value)}
                          placeholder="e.g. Dr. M. Santos, DVM / Animal Haven Clinic"
                          className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none ${
                            isDarkMode ? 'bg-[#04110A] text-white border-emerald-900/60' : 'bg-white text-slate-900 border-slate-200'
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-emerald-200' : 'text-slate-700'}`}>
                          Summary / Key Observations
                        </label>
                        <textarea
                          rows={2}
                          value={medDescription}
                          onChange={(e) => setMedDescription(e.target.value)}
                          placeholder="Enter summary of certificate clearance, negative fecal results, physical exam findings..."
                          className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none ${
                            isDarkMode ? 'bg-[#04110A] text-white border-emerald-900/60 placeholder-emerald-300/40' : 'bg-white text-slate-900 border-slate-200'
                          }`}
                        ></textarea>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-emerald-200' : 'text-slate-700'}`}>
                          Certificate File Attachment
                        </label>
                        <input
                          type="file"
                          ref={medFileInputRef}
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleMedFileSelect(file);
                          }}
                        />
                        <div
                          onClick={() => medFileInputRef.current?.click()}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleMedFileSelect(file);
                          }}
                          className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
                            isDarkMode ? 'border-emerald-900/60 bg-[#04110A] hover:border-emerald-500 hover:bg-emerald-950/30' : 'border-slate-200 bg-slate-50 hover:bg-emerald-50/40 hover:border-[#113C24]'
                          }`}
                        >
                          <Upload className={`w-8 h-8 mx-auto mb-2 ${isDarkMode ? 'text-emerald-400' : 'text-[#113C24]'}`} />
                          <p className={`text-xs font-bold ${isDarkMode ? 'text-emerald-100' : 'text-slate-800'}`}>Choose or drop certificate files here</p>
                          <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-emerald-300/60' : 'text-slate-500'}`}>
                            Click to open local device file picker (PDF, JPG, PNG up to 10MB)
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              medFileInputRef.current?.click();
                            }}
                            className="mt-3 px-3.5 py-1.5 bg-[#113C24] hover:bg-[#1B5234] text-white text-xs font-semibold rounded-lg shadow-xs inline-flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Browse Local Device</span>
                          </button>
                        </div>
                      </div>

                      {uploadedMedFile && (
                        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          isDarkMode ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        }`}>
                          <div className="flex items-center space-x-2 truncate">
                            <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="font-semibold truncate">{uploadedMedFile}</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => {
                              setUploadedMedFile(null);
                              if (medFileInputRef.current) medFileInputRef.current.value = '';
                            }} 
                            className="text-red-500 hover:text-red-700 font-bold text-xs ml-2 shrink-0 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`flex justify-end space-x-3 pt-4 border-t ${isDarkMode ? 'border-emerald-900/60' : 'border-slate-100'}`}>
                    <button
                      type="button"
                      onClick={() => setIsAttachingMedical(false)}
                      className={`px-4 py-2 border rounded-xl text-xs font-bold cursor-pointer ${
                        isDarkMode ? 'border-emerald-900/60 text-emerald-300 hover:bg-emerald-950/60' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#113C24] hover:bg-[#1B5234] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Attach & Update Health Status</span>
                    </button>
                  </div>
                </form>
              )}

              {/* CONSULTATION REQUESTS WAITING FOR VET APPROVAL (Initiated by Admin, Waiting for Vet Confirmation) */}
              {appointments && appointments.filter(a => 
                a.animalId === animal.id && 
                (a.status === 'Pending Approval' || a.status === 'Pending') &&
                (a.requestedByRole === 'admin' || a.requestedBy?.toLowerCase().includes('admin') || a.id?.startsWith('APT-ADM-'))
              ).length > 0 && (
                <div className={`p-4 rounded-2xl border ${
                  isDarkMode ? 'bg-[#031d16] border-emerald-500/40 text-emerald-200' : 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-2xs'
                }`}>
                  <div className="flex items-start space-x-3">
                    <Clock className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0 animate-pulse" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                          <span>⏳ Waiting for Vet Approval ({
                            appointments.filter(a => 
                              a.animalId === animal.id && 
                              (a.status === 'Pending Approval' || a.status === 'Pending') &&
                              (a.requestedByRole === 'admin' || a.requestedBy?.toLowerCase().includes('admin') || a.id?.startsWith('APT-ADM-'))
                            ).length
                          })</span>
                        </h4>
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                          Awaiting Vet Confirmation
                        </span>
                      </div>
                      <p className="text-[11px] mt-1 text-slate-300 dark:text-emerald-200/80 leading-relaxed">
                        Consultation requested by Administrator. Currently awaiting confirmation and approval from the Veterinarian in the Vet Portal before proceeding.
                      </p>
                      <div className="mt-3 space-y-2.5">
                        {appointments.filter(a => 
                          a.animalId === animal.id && 
                          (a.status === 'Pending Approval' || a.status === 'Pending') &&
                          (a.requestedByRole === 'admin' || a.requestedBy?.toLowerCase().includes('admin') || a.id?.startsWith('APT-ADM-'))
                        ).map(p => {
                          return (
                            <div key={p.id} className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isDarkMode ? 'bg-[#04140e] border-emerald-500/30' : 'bg-white border-emerald-200 shadow-2xs'
                            }`}>
                              <div>
                                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                  <span className="px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                                    <span>🛡️</span>
                                    <span>Admin Request</span>
                                  </span>
                                  <span className="font-extrabold text-emerald-400">{p.type}</span>
                                  <span className="text-slate-500">•</span>
                                  <span className={isDarkMode ? 'text-slate-300 font-medium' : 'text-slate-700 font-medium'}>
                                    Assigned Vet: <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{resolveVeterinarianName(p.veterinarian, staffMembers)}</strong>
                                  </span>
                                  <span className="text-slate-500">•</span>
                                  <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>📅 {p.date} • ⏰ {p.time}</span>
                                </div>
                                {p.purpose && (
                                  <p className={`text-[11px] mt-1.5 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                    {p.purpose}
                                  </p>
                                )}
                                <div className="mt-2 flex items-center space-x-2 text-[10px] text-amber-400 font-semibold">
                                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                                  <span>Waiting for {resolveVeterinarianName(p.veterinarian, staffMembers)} to accept & confirm in Vet Portal</span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                                {onDeleteAppointment && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteAppointment(p.id)}
                                    className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-slate-700/50 hover:border-rose-500/30 cursor-pointer transition-colors active:scale-95 flex items-center space-x-1"
                                    title="Cancel this consult request"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Cancel Request</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PENDING HEALTH & VET REQUESTS (Direct Authorization in Animal Medical Profile - Keeper & Vet requests only) */}
              {appointments && appointments.filter(a => 
                a.animalId === animal.id && 
                (a.status === 'Pending Approval' || a.status === 'Pending' || a.status === 'Reschedule Requested') &&
                a.requestedByRole !== 'admin' &&
                !a.requestedBy?.toLowerCase().includes('admin') &&
                !a.id?.startsWith('APT-ADM-')
              ).length > 0 && (
                <div className={`p-4 rounded-2xl border ${
                  isDarkMode ? 'bg-amber-950/20 border-amber-800/40 text-amber-200' : 'bg-amber-50/80 border-amber-200 text-amber-900'
                }`}>
                  <div className="flex items-start space-x-3">
                    <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0 animate-pulse" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                          {appointments.filter(a => 
                            a.animalId === animal.id && 
                            (a.status === 'Pending Approval' || a.status === 'Pending' || a.status === 'Reschedule Requested') &&
                            a.requestedByRole !== 'admin' &&
                            !a.requestedBy?.toLowerCase().includes('admin') &&
                            !a.id?.startsWith('APT-ADM-')
                          ).length} Request Awaiting Admin Authorization
                        </h4>
                        <span className="text-[10px] font-bold text-amber-300/90 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          Direct Authorization
                        </span>
                      </div>
                      <p className="text-[11px] mt-1 text-slate-400 dark:text-amber-200/80 leading-relaxed">
                        Clinical requests from Veterinarians and observation checkups from Keepers can be reviewed and authorized directly here. Upon approval, the appointment immediately transitions to the active medical schedule.
                      </p>
                      <div className="mt-3 space-y-2.5">
                        {appointments.filter(a => 
                          a.animalId === animal.id && 
                          (a.status === 'Pending Approval' || a.status === 'Pending' || a.status === 'Reschedule Requested') &&
                          a.requestedByRole !== 'admin' &&
                          !a.requestedBy?.toLowerCase().includes('admin') &&
                          !a.id?.startsWith('APT-ADM-')
                        ).map(p => {
                          const reqInfo = getAppointmentRequesterInfo(p, staffMembers);
                          const isVet = reqInfo.role === 'vet';
                          const isAdmin = reqInfo.role === 'admin';
                          const isResched = p.status === 'Reschedule Requested';
                          return (
                            <div key={p.id} className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isDarkMode 
                                ? (isVet ? 'bg-[#041916] border-cyan-500/30' : isAdmin ? 'bg-[#061d12] border-emerald-500/30' : 'bg-[#191404] border-amber-500/30')
                                : (isVet ? 'bg-cyan-50/70 border-cyan-200' : isAdmin ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50/70 border-amber-200')
                            }`}>
                              <div>
                                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                  <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-wider flex items-center space-x-1 ${
                                    isVet 
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                                      : isAdmin
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}>
                                    <span>{reqInfo.badgeIcon}</span>
                                    <span>{reqInfo.roleLabel}</span>
                                  </span>
                                  <span className={`font-extrabold ${isVet ? 'text-cyan-400' : isAdmin ? 'text-emerald-400' : 'text-amber-400'}`}>{p.type}</span>
                                  <span className="text-slate-500">•</span>
                                  <span className={isDarkMode ? 'text-slate-300 font-medium' : 'text-slate-700 font-medium'}>
                                    Requester: <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{reqInfo.name}</strong>
                                    {reqInfo.email && <span className="text-slate-400 text-[10px] ml-1">({reqInfo.email})</span>}
                                  </span>
                                  <span className="text-slate-500">•</span>
                                  {isResched ? (
                                    <span className={isDarkMode ? 'text-purple-300 font-bold' : 'text-purple-800 font-bold'}>
                                      📅 {p.date} @ {p.time} ➔ 📅 {p.proposedDate} @ {p.proposedTime} (Reschedule)
                                    </span>
                                  ) : (
                                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>📅 {p.date} • ⏰ {p.time}</span>
                                  )}
                                </div>
                                {p.purpose && (
                                  <p className={`text-[11px] mt-1.5 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                    {p.purpose}
                                  </p>
                                )}
                                {isResched && p.rescheduleReason && (
                                  <p className={`text-[11px] mt-1 italic ${isDarkMode ? 'text-purple-300/80' : 'text-purple-800/80'}`}>
                                    <strong>Reschedule Reason:</strong> {p.rescheduleReason} {p.rescheduleNotes ? `(${p.rescheduleNotes})` : ''}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                                {onDeleteAppointment && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteAppointment(p.id)}
                                    className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-slate-700/50 hover:border-rose-500/30 cursor-pointer transition-colors active:scale-95 flex items-center space-x-1"
                                    title="Delete this request"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onUpdateAppointment) {
                                      onUpdateAppointment({
                                        ...p,
                                        status: 'Declined',
                                        declineReason: 'Declined by Administrator during profile review',
                                        adminNotes: `Declined request from ${reqInfo.name} via Animal Medical Tab`
                                      });
                                    } else if (onUpdateAppointmentStatus) {
                                      onUpdateAppointmentStatus(p.id, 'Declined');
                                    }
                                  }}
                                  className="px-2.5 py-1.5 text-[11px] font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg border border-rose-500/30 cursor-pointer transition-colors active:scale-95"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onUpdateAppointment) {
                                      onUpdateAppointment({
                                        ...p,
                                        status: 'Approved',
                                        date: p.proposedDate || p.date,
                                        time: p.proposedTime || p.time,
                                        approvedBy: staffMembers?.find(s => s.role === 'admin')?.name || 'Facility Administrator',
                                        approvedAt: new Date().toISOString(),
                                        adminNotes: p.status === 'Reschedule Requested'
                                          ? `Authorized Reschedule request submitted by ${reqInfo.name} (${reqInfo.roleLabel}). New schedule: ${p.proposedDate} at ${p.proposedTime}`
                                          : `Authorized request submitted by ${reqInfo.name} (${reqInfo.roleLabel})`
                                      });
                                    } else if (onUpdateAppointmentStatus) {
                                      onUpdateAppointmentStatus(p.id, 'Approved');
                                    }
                                  }}
                                  className={`px-3 py-1.5 text-[11px] font-black text-white rounded-lg cursor-pointer shadow-xs transition-all active:scale-95 ${
                                    isVet 
                                      ? 'bg-cyan-600 hover:bg-cyan-500' 
                                      : 'bg-emerald-600 hover:bg-emerald-500'
                                  }`}
                                >
                                  Approve & Add to Medical
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AUTHORIZED CLINICAL APPOINTMENTS & CONSULTATIONS (After Approval Only) */}
              {appointments && appointments.filter(a => a.animalId === animal.id && (a.status === 'Approved' || a.status === 'Ongoing' || a.status === 'Completed')).length > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className={`font-bold text-sm flex items-center space-x-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span>Authorized Clinical Appointments & Consultations</span>
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">
                      {appointments.filter(a => a.animalId === animal.id && (a.status === 'Approved' || a.status === 'Ongoing' || a.status === 'Completed')).length} Authorized Record{appointments.filter(a => a.animalId === animal.id && (a.status === 'Approved' || a.status === 'Ongoing' || a.status === 'Completed')).length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {appointments.filter(a => a.animalId === animal.id && (a.status === 'Approved' || a.status === 'Ongoing' || a.status === 'Completed')).map(apt => (
                      <div
                        key={apt.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isDarkMode
                            ? 'bg-[#071F11] border-emerald-900/60 text-white'
                            : 'bg-white border-slate-200/80 text-slate-800 shadow-2xs'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-800/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              {apt.type}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              apt.priority === 'Emergency' 
                                ? 'bg-rose-950/80 text-rose-300 border-rose-800/60' 
                                : apt.priority === 'High' 
                                  ? 'bg-amber-950/80 text-amber-300 border-amber-800/60' 
                                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                            }`}>
                              {apt.priority} Priority
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              apt.status === 'Completed'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                : apt.status === 'Approved'
                                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            }`}>
                              {apt.status === 'Approved' ? '✓ Approved by Admin' : apt.status}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-400">
                            📅 {apt.date} • ⏰ {apt.time}
                          </span>
                        </div>

                        <p className={`text-xs font-semibold mb-3 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          {apt.purpose}
                        </p>

                        <div className={`pt-2.5 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
                          isDarkMode ? 'border-emerald-950/80 text-slate-300' : 'border-slate-100 text-slate-600'
                        }`}>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <div className="flex items-center space-x-1.5 bg-emerald-950/50 dark:bg-emerald-950/80 border border-emerald-800/40 px-2.5 py-1 rounded-lg">
                              <span className="text-slate-400 font-medium">Requested By:</span>
                              <span className="font-bold text-emerald-300">{getAppointmentRequesterInfo(apt, staffMembers).name}</span>
                            </div>
                            <div className="flex items-center space-x-1.5 bg-blue-950/50 dark:bg-blue-950/80 border border-blue-800/40 px-2.5 py-1 rounded-lg">
                              <span className="text-slate-400 font-medium">Assigned Veterinarian:</span>
                              <span className="font-bold text-blue-300">{resolveVeterinarianName(apt.veterinarian, staffMembers)}</span>
                            </div>
                            {apt.approvedBy && (
                              <div className="text-[11px] text-emerald-400 font-medium">
                                ✓ Authorized by {resolveAdminName(apt.approvedBy, staffMembers)}
                              </div>
                            )}
                          </div>

                          {/* Reschedule & Cancel Action Buttons */}
                          {apt.status !== 'Completed' && apt.status !== 'Cancelled' && (
                            <div className="flex items-center space-x-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAptToResched(apt);
                                  setReschedNewDate(apt.date || todayIso);
                                  setReschedNewTime(apt.time || '09:00 AM');
                                  setReschedAptModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                                title="Reschedule this appointment date and time"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>Reschedule</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to cancel this appointment for ${animal.name || animal.id}?`)) {
                                    if (onUpdateAppointment) {
                                      onUpdateAppointment({ ...apt, status: 'Cancelled' });
                                    } else if (onUpdateAppointmentStatus) {
                                      onUpdateAppointmentStatus(apt.id, 'Cancelled');
                                    }
                                    setMedActionFeedback(`✓ Appointment on ${apt.date} has been cancelled.`);
                                    setTimeout(() => setMedActionFeedback(null), 5000);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                                title="Cancel this appointment"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Cancel Appointment</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={`p-4 rounded-2xl border text-center ${
                  isDarkMode ? 'bg-[#04140D]/40 border-emerald-950/60 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
                }`}>
                  <p className="text-xs font-medium">
                    No authorized clinical appointments recorded yet. Requests submitted by Keepers or Vets in <strong>Animals → Health & Vet Queue</strong> will officially appear here once approved by Admin.
                  </p>
                </div>
              )}

              {/* TIMELINE OF RECORDS & UPCOMING APPOINTMENTS */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    Medical Records & Timeline
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {animalMedRecords.length} Record{animalMedRecords.length === 1 ? '' : 's'} on file
                  </span>
                </div>

                {animalMedRecords.length === 0 ? (
                  <div className={`rounded-2xl p-8 border text-center space-y-3 ${
                    isDarkMode ? 'bg-[#071F11] border-emerald-950 text-slate-300' : 'bg-slate-50 border-slate-200/80 text-slate-600'
                  }`}>
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-medium">No recorded medical evaluations yet for this animal.</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      You can attach an official certificate from acquisition or schedule a veterinary consultation above.
                    </p>
                  </div>
                ) : (
                  <div className={`relative border-l-2 pl-6 ml-4 space-y-6 ${isDarkMode ? 'border-emerald-950' : 'border-slate-200'}`}>
                    {animalMedRecords.map(record => (
                      <div key={record.id} className={`relative p-5 rounded-2xl border shadow-2xs transition-all ${
                        isDarkMode ? 'bg-[#071F11] border-emerald-900/60 text-white' : 'bg-white border-slate-200/80 text-slate-800'
                      }`}>
                        <div className={`absolute -left-[33px] top-5 w-4 h-4 rounded-full border-4 ${
                          isDarkMode ? 'border-[#071F11] bg-emerald-500' : 'border-white bg-[#113C24]'
                        }`}></div>
                        
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-800/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              {record.recordType}
                            </span>
                            <h4 className={`font-bold text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                              {record.purpose}
                            </h4>
                          </div>
                          <span className="text-xs text-slate-400 font-mono font-semibold">{record.recordDate}</span>
                        </div>

                        <div className={`text-xs space-y-1.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                          <p><strong className={isDarkMode ? 'text-emerald-300 font-semibold' : 'text-slate-900 font-semibold'}>Clinical Observation:</strong> {record.clinicalObservation}</p>
                          <p><strong className={isDarkMode ? 'text-emerald-300 font-semibold' : 'text-slate-900 font-semibold'}>Diagnosis / Clearance:</strong> {record.diagnosis}</p>
                          <p><strong className={isDarkMode ? 'text-emerald-300 font-semibold' : 'text-slate-900 font-semibold'}>Treatment / Medication:</strong> {record.treatment}</p>
                          <p><strong className={isDarkMode ? 'text-emerald-300 font-semibold' : 'text-slate-900 font-semibold'}>Issuing Authority / Vet:</strong> {resolveVeterinarianName(record.veterinarian, staffMembers)}</p>
                          {record.nextCheckup && (
                            <p className="text-emerald-400 font-semibold">
                              <strong>Scheduled Follow-up Checkup:</strong> {record.nextCheckup}
                            </p>
                          )}
                        </div>

                        {record.attachments && record.attachments.length > 0 && (
                          <div className={`mt-3 pt-3 border-t flex flex-wrap items-center gap-2 ${isDarkMode ? 'border-emerald-950' : 'border-slate-100'}`}>
                            {record.attachments.map(att => (
                              <span key={att.name} className={`inline-flex items-center space-x-1 px-3 py-1 font-bold text-[10px] rounded-lg border ${
                                isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-emerald-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                              }`}>
                                <FileText className="w-3 h-3 text-emerald-500" />
                                <span>{att.name}</span>
                                <span className="opacity-60 font-normal">({att.size})</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* KEEPER'S LOGS & MEDICINE ADMINISTRATION HISTORY */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-emerald-950">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Pill className="w-4 h-4 text-emerald-500" />
                    <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      Keeper's Medication Administration & Care Logs
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {(() => {
                      const logs = animal.keeperLogs || [];
                      return `${logs.length} Logged Administration${logs.length === 1 ? '' : 's'}`;
                    })()}
                  </span>
                </div>

                {(() => {
                  const structuredLogs = (animal.keeperLogs || []).filter(
                    log => log.logType !== 'Clinical Checkup' && !log.id?.startsWith('VETLOG-') && !log.notes?.toLowerCase().includes('vet consultation')
                  );
                  if (structuredLogs.length === 0) {
                    return (
                      <div className={`rounded-2xl p-6 border text-center space-y-2 ${
                        isDarkMode ? 'bg-[#071F11] border-emerald-950 text-slate-300' : 'bg-slate-50 border-slate-200/80 text-slate-600'
                      }`}>
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                          <Pill className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold">No keeper medication logs recorded yet for this animal.</p>
                        <p className="text-[11px] text-slate-400">
                          When keepers administer prescribed medicine or complete daily care tasks, logs will automatically record here.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {structuredLogs.map((log, idx) => (
                        <div
                          key={log.id || `klog-${idx}`}
                          className={`p-4 rounded-2xl border transition-all ${
                            isDarkMode ? 'bg-[#071F11] border-emerald-900/60 text-slate-200' : 'bg-white border-slate-200/80 text-slate-800 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-emerald-950/60 pb-2.5 mb-2.5">
                            <div className="flex items-center space-x-2 flex-wrap gap-1">
                              <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                                {log.logType || 'Medicine Administration'}
                              </span>
                              {log.priority && (
                                <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${
                                  log.priority === 'Urgent'
                                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                    : log.priority === 'High'
                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                    : log.priority === 'Medium'
                                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                                    : 'bg-slate-500/20 text-slate-400 border-slate-500/40'
                                }`}>
                                  {log.priority} Priority
                                </span>
                              )}
                              {log.administrationStatus && (
                                <span className="text-[10px] font-bold text-emerald-500">
                                  ✓ {log.administrationStatus}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-400">
                              📅 {log.date} {log.time && log.time !== 'Logged' ? `• ⏰ ${log.time}` : ''}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs mb-2">
                            {log.clinicalObservation && (
                              <div className={`p-2.5 rounded-xl border ${
                                isDarkMode ? 'bg-[#04110A] border-emerald-950 text-slate-200' : 'bg-emerald-50/50 border-emerald-100 text-slate-800'
                              }`}>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5 text-[11px]">
                                  Clinical Observation:
                                </span>
                                <p className="font-medium text-[11px] leading-relaxed">{log.clinicalObservation}</p>
                              </div>
                            )}
                            {log.prescribedTreatment && (
                              <div className={`p-2.5 rounded-xl border ${
                                isDarkMode ? 'bg-[#04110A] border-emerald-950 text-slate-200' : 'bg-teal-50/50 border-teal-100 text-slate-800'
                              }`}>
                                <span className="font-bold text-teal-600 dark:text-teal-400 block mb-0.5 text-[11px]">
                                  Prescribed Treatment:
                                </span>
                                <p className="font-medium text-[11px] leading-relaxed">{log.prescribedTreatment}</p>
                              </div>
                            )}
                          </div>

                          {log.medicineName && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                              <strong>Medication / Supply:</strong> {log.medicineName} {log.dosage ? `(${log.dosage})` : ''}
                            </div>
                          )}

                          {log.notes && log.notes !== log.clinicalObservation && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                              "{log.notes}"
                            </p>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-emerald-950/40 mt-2">
                            <span>Logged by: <strong>{resolveKeeperName(log.keeperName, staffMembers)}</strong></span>
                            {onAddAppointment && log.logType !== 'Clinical Checkup' && !log.notes?.toLowerCase().includes('vet consultation') && (
                              <button
                                type="button"
                                onClick={() => {
                                  const prio = log.priority === 'Urgent' ? 'Emergency' : (log.priority === 'High' ? 'High' : 'Normal');
                                  setSchedVetType(log.logType === 'Clinical Checkup' ? 'Medical Examination' : 'Follow-up Checkup');
                                  setSchedVetDate(todayIso);
                                  setSchedVetTime('09:00 AM');
                                  setSchedVetName(registeredVets.length > 0 ? registeredVets[0].name : 'Attending Veterinarian');
                                  setSchedVetPriority(prio);
                                  setSchedVetReason(`[Keeper Observation - ${log.keeperName || 'Keeper'}]: ${log.notes || log.clinicalObservation || ''}`);
                                  setSchedVetModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center space-x-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                              >
                                <Stethoscope className="w-3 h-3" />
                                <span>Schedule Vet Visit for this Observation</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 5. BREEDING TAB */}
          {activeTab === 'breeding' && (
            <BreedingWizardSection
              animal={animal}
              animals={animals}
              enclosures={enclosures}
              medicalRecords={medicalRecords}
              breedingRecords={breedingRecords}
              breedingAssessments={breedingAssessments}
              staffMembers={staffMembers}
              onAddBreedingAssessment={onAddBreedingAssessment}
              onAddTask={onAddTask}
              onAddBreedingRecord={onAddBreedingRecord}
              onUpdateBreedingRecord={onUpdateBreedingRecord}
              onDeleteBreedingRecord={onDeleteBreedingRecord}
              onRestoreBreedingRecord={onRestoreBreedingRecord}
              deletedBreedingRecords={deletedBreedingRecords}
              onNavigateToBreeding={onNavigateToBreeding}
              onUpdateAnimal={onUpdateAnimal}
              onUpdateEnclosure={onUpdateEnclosure}
              isCompact={true}
              initialStep={breedingStep}
              onStepChange={(s) => setBreedingStep(s)}
              onRedirectToEnclosureTab={() => {
                setRedirectSource('breeding');
                setBreedingStep(3);
                setActiveTab('enclosure');
                setIsAssigningEnclosure(true);
                setTransferFilterOnlyPassedClimate(true);
                const qualifiedList = enclosures
                  .filter(enc => enc.condition !== 'Out of Service')
                  .filter(enc => isEnclosureSpeciesCompatible(enc, animal.species, animals))
                  .filter(enc => evaluateEnclosureClimateQualification(enc, animal.species).isQualified);
                if (qualifiedList.length > 0) {
                  setSelectedEnclosureId(qualifiedList[0].id);
                } else {
                  setSelectedEnclosureId(animal.enclosureId || (enclosures[0]?.id || ''));
                }
              }}
            />
          )}

          {false && (
            <div className="space-y-6">
              <div className="flex space-x-4 border-b border-slate-100 pb-2">
                <button
                  onClick={() => { setBreedingSubTab('records'); setIsAddingPair(false); }}
                  className={`text-xs font-bold pb-2 border-b-2 cursor-pointer ${breedingSubTab === 'records' ? 'border-[#113C24] text-[#113C24] font-extrabold' : 'border-transparent text-slate-400'}`}
                >
                  Breeding Records
                </button>
                <button
                  onClick={() => { setBreedingSubTab('readiness'); setIsAddingPair(false); }}
                  className={`text-xs font-bold pb-2 border-b-2 cursor-pointer ${breedingSubTab === 'readiness' ? 'border-[#113C24] text-[#113C24] font-extrabold' : 'border-transparent text-slate-400'}`}
                >
                  Breeding Readiness Assessment
                </button>
              </div>

              {breedingSubTab === 'readiness' && (
                <div className="space-y-6">
                  {/* Assessment Saved Feedback Banner */}
                  {savedAssessmentFeedback && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-2xs animate-fade-in">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{savedAssessmentFeedback}</span>
                      </div>
                      <button onClick={() => setSavedAssessmentFeedback(null)} className="text-slate-400 hover:text-slate-600 text-xs ml-4">✕</button>
                    </div>
                  )}

                  {/* Species Benchmark Header */}
                  {speciesStandard && (
                    <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-emerald-800 text-white rounded text-[10px] font-mono font-bold">{speciesStandard.code}</span>
                          <h4 className="font-bold text-sm text-[#113C24]">{speciesStandard.name} <span className="italic font-normal text-xs text-emerald-800/80">({speciesStandard.scientificName})</span></h4>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Family: <strong className="text-slate-800">{speciesStandard.taxonomicFamily}</strong> ({speciesStandard.familyCode}) • Cooling: <strong>{speciesStandard.brumationCoolingRequired}</strong> • Season: <strong>{speciesStandard.pairingSeasonText}</strong>
                        </p>
                        {speciesStandard.preLayBehavioralIndicators && (
                          <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                            <span className="text-[10px] font-extrabold uppercase text-amber-800 block">
                              ⚠️ Pre-Lay Behavioral Indicators:
                            </span>
                            <span className="text-slate-700 italic">
                              "{speciesStandard.preLayBehavioralIndicators}"
                            </span>
                          </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-white/80 border border-emerald-100">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Gestation / Pre-Lay</span>
                            <strong className="text-[#113C24]">{speciesStandard.gestationPreLayPeriod}</strong>
                          </div>
                          <div className="p-2 rounded-lg bg-white/80 border border-emerald-100">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Cooling / Temp</span>
                            <strong className="text-[#113C24]">{speciesStandard.coolingTempRange || 'N/A'}</strong>
                          </div>
                          <div className="p-2 rounded-lg bg-white/80 border border-emerald-100">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Incubation Climate</span>
                            <strong className="text-[#113C24]">{speciesStandard.incubationTempTarget} ({speciesStandard.incubationHumidity})</strong>
                          </div>
                          <div className="p-2 rounded-lg bg-white/80 border border-emerald-100">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Clutch & Incubation</span>
                            <strong className="text-[#113C24]">{speciesStandard.avgClutchLitterSize} • {speciesStandard.incubationPeriod}</strong>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 text-xs shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Readiness Score</span>
                          <span className="font-extrabold text-sm text-[#113C24]">{breedingEvaluation.scorePercentage}%</span>
                        </div>
                        <div className="w-10 h-10 rounded-full border-2 border-emerald-600 flex items-center justify-center font-bold text-xs bg-white text-emerald-800 shadow-2xs">
                          {breedingEvaluation.scorePercentage}%
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5-Criteria Evaluation Cards */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm text-slate-800 flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>Individual Scientific Assessment ({animal.sex || 'Unknown Sex'})</span>
                      </h4>
                      <span className="text-xs text-slate-400">Target metrics tailored to species biology</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                      {/* 1. Age */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Age Benchmark</span>
                          <span className="text-xs font-bold text-slate-800 block mt-1">{breedingEvaluation.ageMonths} mos</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Min: {breedingEvaluation.standard ? (animal.sex === 'Female' ? breedingEvaluation.standard.minAgeTextFemale : breedingEvaluation.standard.minAgeTextMale) : '18 mos'}</span>
                        </div>
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 mt-2 text-[9px] font-bold rounded ${readinessAgePassed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {readinessAgePassed ? '✓ Qualified' : '✗ Too Young'}
                        </span>
                      </div>

                      {/* 2. Weight */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Weight / Condition</span>
                          <span className="text-xs font-bold text-slate-800 block mt-1">{animal.weight} g</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Target: {breedingEvaluation.standard ? (animal.sex === 'Female' ? breedingEvaluation.standard.minWeightTextFemale : breedingEvaluation.standard.minWeightTextMale) : '>= 1000g'}</span>
                        </div>
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 mt-2 text-[9px] font-bold rounded ${readinessWeightPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {readinessWeightPassed ? '✓ Optimal Weight' : '✗ Underweight'}
                        </span>
                      </div>

                      {/* 3. Season */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Pairing Season</span>
                          <span className="text-xs font-bold text-slate-800 block mt-1">{breedingEvaluation.seasonText}</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Captive Cycle Window</span>
                        </div>
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 mt-2 text-[9px] font-bold rounded ${readinessSeasonPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {readinessSeasonPassed ? '✓ Active Season' : 'Off-Season'}
                        </span>
                      </div>

                      {/* 4. Health */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Health & Clearance</span>
                          <span className="text-xs font-bold text-slate-800 block mt-1">{animal.healthStatus || 'Healthy'}</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">{animalMedRecords.length} Vet Records</span>
                        </div>
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 mt-2 text-[9px] font-bold rounded ${
                          readinessHealthPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {readinessHealthPassed ? '✓ Clinically Cleared' : '✗ Needs Vet Clearance'}
                        </span>
                      </div>

                      {/* 5. Cooldown */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Breeding Cooldown</span>
                          <span className="text-xs font-bold text-slate-800 block mt-1 truncate" title={breedingEvaluation.cooldownText}>{breedingEvaluation.cooldownPassed ? 'Rested & Ready' : 'Resting'}</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Cycle Fatigue Check</span>
                        </div>
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 mt-2 text-[9px] font-bold rounded ${readinessCooldownPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {readinessCooldownPassed ? '✓ Cooldown Passed' : 'In Recovery'}
                        </span>
                      </div>
                    </div>

                    {/* Pre-breeding Cooling/Brumation recommendation if any */}
                    {breedingEvaluation.recommendations.length > 0 && (
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-900 text-xs flex items-start space-x-2">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Husbandry & Environmental Protocol:</p>
                          <ul className="list-disc pl-4 space-y-0.5 mt-1 text-[11px]">
                            {breedingEvaluation.recommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assessment Decision & Pairing Selection */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">Breeding Assessment & Pairing Decision</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Evaluate and log animal readiness before introducing a pairing candidate</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${isOverallReady ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                        {isOverallReady ? '✓ READY FOR PAIRING' : '✗ NOT READY / INELIGIBLE'}
                      </span>
                    </div>
                    
                    {!isOverallReady ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-red-50 text-red-900 border border-red-100 rounded-xl space-y-2">
                          <h4 className="font-extrabold text-xs uppercase tracking-wider flex items-center space-x-1.5 text-red-800">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Deficit Breakdown (Unmet Readiness Criteria)</span>
                          </h4>
                          <ul className="list-disc pl-5 text-xs space-y-1.5 mt-2 font-medium">
                            {breedingEvaluation.failureReasons.map((reason, idx) => (
                              <li key={idx} className="text-red-800">{reason}</li>
                            ))}
                            {breedingEvaluation.warnings.map((warn, idx) => (
                              <li key={idx} className="text-amber-800">{warn}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              Save Assessment for Facility Breeding Records
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Saving will record this assessment as <strong>NOT ELIGIBLE</strong> in the facility breeding database and set status for monitoring until targets are met.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveIndividualAssessment('NOT ELIGIBLE')}
                            className="px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center space-x-2 shrink-0"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Save Assessment (Not Eligible)</span>
                          </button>
                        </div>
                      </div>
                    ) : isAddingPair ? (
                      <div className="space-y-6 p-5 bg-slate-50 rounded-2xl border border-slate-200/80">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-xs text-[#113C24] uppercase tracking-wider flex items-center space-x-2">
                            <Heart className="w-4 h-4 text-rose-500" />
                            <span>Step 2: Select & Evaluate Pairing Partner</span>
                          </h4>
                          <span className="text-xs text-slate-500">Opposite sex candidates: <strong>{oppositeSexAnimals.length}</strong></span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Select Compatible Opposite Sex Partner *</label>
                            {oppositeSexAnimals.length === 0 ? (
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                                No available opposite sex {animal.species} found in facility. Add or acquire a compatible {animal.sex === 'Female' ? 'Male' : 'Female'}.
                              </div>
                            ) : (
                              <select
                                value={selectedOppositeId}
                                onChange={(e) => setSelectedOppositeId(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                required
                              >
                                <option value="">-- Choose pairing candidate --</option>
                                {oppositeSexAnimals.map(opp => (
                                  <option key={opp.id} value={opp.id}>
                                    {opp.id} - {opp.name} ({opp.sex} • {opp.morph} • {opp.weight}g)
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Pairing Instructions / Special Notes</label>
                            <input
                              type="text"
                              value={pairNotes}
                              onChange={(e) => setPairNotes(e.target.value)}
                              placeholder="e.g. Natural lock attempt, introduce in evening..."
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                        </div>

                        {/* Dual-Animal Qualification Breakdown */}
                        {pairEvaluation && selectedPartnerAnimal && (
                          <div className="space-y-4 pt-2">
                            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Dual Animal Qualification Result</span>
                                  <div className="flex items-center space-x-2 mt-0.5">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${pairEvaluation.statusBadgeColor}`}>
                                      {pairEvaluation.overallStatus === 'QUALIFIED' ? '✓ PAIR QUALIFIED FOR BREEDING' : (pairEvaluation.overallStatus === 'CONDITIONAL' ? '⚠ CONDITIONAL PAIRING' : '✗ DISQUALIFIED PAIR')}
                                    </span>
                                    <span className="text-xs font-bold text-slate-700">Score: {pairEvaluation.compatibilityScore}%</span>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-500 sm:text-right max-w-sm">{pairEvaluation.summaryNote}</p>
                              </div>

                              {/* Side-by-Side Female vs Male Checklist */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                {/* Female Card */}
                                <div className={`p-3.5 rounded-xl border ${pairEvaluation.femaleEval.overallReady ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50/50 border-red-200'}`}>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-xs text-slate-900 flex items-center space-x-1.5">
                                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                                      <span>Female: {pairEvaluation.femaleAnimal.name} ({pairEvaluation.femaleAnimal.id})</span>
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${pairEvaluation.femaleEval.overallReady ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                      {pairEvaluation.femaleEval.overallReady ? 'Qualified' : 'Not Qualified'}
                                    </span>
                                  </div>
                                  <div className="space-y-1 text-xs text-slate-600">
                                    <div className="flex justify-between">
                                      <span>Age:</span>
                                      <strong className={pairEvaluation.femaleEval.agePassed ? 'text-emerald-700' : 'text-red-700'}>
                                        {pairEvaluation.femaleEval.ageText} {pairEvaluation.femaleEval.agePassed ? '✓' : '✗'}
                                      </strong>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Weight:</span>
                                      <strong className={pairEvaluation.femaleEval.weightPassed ? 'text-emerald-700' : 'text-red-700'}>
                                        {pairEvaluation.femaleEval.weightText} {pairEvaluation.femaleEval.weightPassed ? '✓' : '✗'}
                                      </strong>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Health Status:</span>
                                      <strong className={pairEvaluation.femaleEval.healthPassed ? 'text-emerald-700' : 'text-red-700'}>
                                        {pairEvaluation.femaleEval.healthStatus} {pairEvaluation.femaleEval.healthPassed ? '✓' : '✗'}
                                      </strong>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Post-Lay Rest:</span>
                                      <strong className={pairEvaluation.femaleEval.cooldownPassed ? 'text-emerald-700' : 'text-amber-700'}>
                                        {pairEvaluation.femaleEval.cooldownText}
                                      </strong>
                                    </div>
                                  </div>
                                </div>

                                {/* Male Card */}
                                <div className={`p-3.5 rounded-xl border ${pairEvaluation.maleEval.overallReady ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50/50 border-red-200'}`}>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-xs text-slate-900 flex items-center space-x-1.5">
                                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                                      <span>Male: {pairEvaluation.maleAnimal.name} ({pairEvaluation.maleAnimal.id})</span>
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${pairEvaluation.maleEval.overallReady ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                      {pairEvaluation.maleEval.overallReady ? 'Qualified' : 'Not Qualified'}
                                    </span>
                                  </div>
                                  <div className="space-y-1 text-xs text-slate-600">
                                    <div className="flex justify-between">
                                      <span>Age:</span>
                                      <strong className={pairEvaluation.maleEval.agePassed ? 'text-emerald-700' : 'text-red-700'}>
                                        {pairEvaluation.maleEval.ageText} {pairEvaluation.maleEval.agePassed ? '✓' : '✗'}
                                      </strong>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Weight:</span>
                                      <strong className={pairEvaluation.maleEval.weightPassed ? 'text-emerald-700' : 'text-red-700'}>
                                        {pairEvaluation.maleEval.weightText} {pairEvaluation.maleEval.weightPassed ? '✓' : '✗'}
                                      </strong>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Health Status:</span>
                                      <strong className={pairEvaluation.maleEval.healthPassed ? 'text-emerald-700' : 'text-red-700'}>
                                        {pairEvaluation.maleEval.healthStatus} {pairEvaluation.maleEval.healthPassed ? '✓' : '✗'}
                                      </strong>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Vigor / Vitals:</span>
                                      <strong className="text-emerald-700">Active & Alert ✓</strong>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Reproductive Expectations based on matrix */}
                              {pairEvaluation.standard && (
                                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 mt-2">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                                    Expected Reproductive Milestones for {pairEvaluation.standard.name}
                                  </span>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                                      <span className="text-[9px] text-slate-400 block">Pre-lay / Gestation</span>
                                      <span className="font-bold text-slate-800 text-[11px]">{pairEvaluation.clutchExpectations.gestationPreLay}</span>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                                      <span className="text-[9px] text-slate-400 block">Avg. Clutch / Litter</span>
                                      <span className="font-bold text-slate-800 text-[11px]">{pairEvaluation.clutchExpectations.avgClutchSize}</span>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                                      <span className="text-[9px] text-slate-400 block">Incubation Target</span>
                                      <span className="font-bold text-slate-800 text-[11px]">{pairEvaluation.clutchExpectations.incubationTemp}</span>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                                      <span className="text-[9px] text-slate-400 block">Incubation Period</span>
                                      <span className="font-bold text-slate-800 text-[11px]">{pairEvaluation.clutchExpectations.incubationPeriod}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end space-x-3 pt-2">
                          <button
                            type="button"
                            onClick={() => { setIsAddingPair(false); setSelectedOppositeId(''); }}
                            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmPairing}
                            disabled={!selectedOppositeId || (pairEvaluation && !pairEvaluation.bothQualified && pairEvaluation.overallStatus === 'DISQUALIFIED')}
                            className="px-5 py-2.5 bg-[#113C24] hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
                          >
                            <Heart className="w-4 h-4" />
                            <span>Confirm & Log Pairing Lock</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 text-emerald-950 border border-emerald-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h4 className="font-extrabold text-sm text-[#113C24] flex items-center space-x-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>INDIVIDUAL BREEDING CRITERIA SATISFIED</span>
                            </h4>
                            <p className="text-xs text-slate-600 mt-1">
                              This animal matches all minimum weight, age, and health benchmarks defined in the 16-species facility matrix.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSaveIndividualAssessment('ELIGIBLE')}
                              className="px-4 py-2.5 bg-white border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl shadow-2xs hover:bg-emerald-50 transition-all cursor-pointer flex items-center space-x-1.5"
                            >
                              <FileText className="w-4 h-4 text-emerald-700" />
                              <span>Save Assessment (Eligible)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingPair(true);
                                setSelectedOppositeId(oppositeSexAnimals[0]?.id || '');
                              }}
                              className="px-5 py-2.5 bg-[#113C24] hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-2"
                            >
                              <Heart className="w-4 h-4" />
                              <span>Pair with Compatible Partner →</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Saved Breeding Assessments History for this Animal */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-[#113C24]" />
                          <span>Breeding Assessment History for {animal.name} ({animal.id})</span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">Recorded assessments tracked in the facility breeding module</p>
                      </div>
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                        {animalBreedingAssessments.length} Record{animalBreedingAssessments.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {animalBreedingAssessments.length === 0 ? (
                      <div className="p-6 bg-slate-50 rounded-xl text-center text-slate-500 text-xs border border-dashed border-slate-200">
                        No prior breeding assessments recorded for this animal yet. Perform an assessment above to log eligibility or deficits.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {animalBreedingAssessments.map(asm => (
                          <div key={asm.id} className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/80 transition-colors space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-xs text-[#113C24] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{asm.id}</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  asm.status === 'ELIGIBLE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : (asm.status === 'REVIEW' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-red-100 text-red-800 border-red-300')
                                }`}>
                                  {asm.status}
                                </span>
                                {asm.partnerId && (
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    Paired with: <strong>{asm.partnerId}</strong>
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center space-x-3">
                                <span>Date: <strong>{asm.assessmentDate}</strong></span>
                                <span>Assessor: <strong>{asm.assessedBy}</strong></span>
                                <span>Score: <strong className="text-[#113C24]">{asm.readinessScore}%</strong></span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">{asm.notes}</p>
                            {asm.failureReasons && asm.failureReasons.length > 0 && (
                              <div className="text-[11px] text-red-700 bg-red-50 p-2 rounded-lg border border-red-100">
                                <strong>Recorded Deficits:</strong> {asm.failureReasons.join('; ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {breedingSubTab === 'records' && (
                <div className="space-y-6">
                  {selectedBreedingRecord ? (
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-6 relative">
                      <button onClick={() => setSelectedBreedingRecord(null)} className="absolute top-4 right-4 text-xs font-bold text-[#113C24] border border-emerald-100 px-3 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                        ← Back to List
                      </button>
                      <h3 className="font-bold text-base text-slate-800 border-b border-slate-100 pb-3">Breeding Record Details</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                          <h4 className="font-bold text-xs text-emerald-800 uppercase tracking-wider">Pair Information</h4>
                          <div className="text-xs space-y-1">
                            <p><strong>Female partner:</strong> {selectedBreedingRecord.femaleId}</p>
                            <p><strong>Male partner:</strong> {selectedBreedingRecord.maleId}</p>
                            <p><strong>Breeding Type:</strong> {selectedBreedingRecord.breedingType}</p>
                            <p><strong>Created By:</strong> {selectedBreedingRecord.createdBy}</p>
                            <p><strong>Created At:</strong> {selectedBreedingRecord.createdAt}</p>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                          <h4 className="font-bold text-xs text-[#113C24] uppercase tracking-wider">Status & Result</h4>
                          <div className="text-xs space-y-1">
                            <p><strong>Status:</strong> <span className="font-bold text-emerald-700">{selectedBreedingRecord.status}</span></p>
                            {selectedBreedingRecord.clutchSize && <p><strong>Clutch Size:</strong> {selectedBreedingRecord.clutchSize}</p>}
                            {selectedBreedingRecord.hatchDate && <p><strong>Hatch Date:</strong> {selectedBreedingRecord.hatchDate}</p>}
                            {selectedBreedingRecord.hatchlings && <p><strong>Hatchlings count:</strong> {selectedBreedingRecord.hatchlings}</p>}
                            {selectedBreedingRecord.unhatchedEggs && <p><strong>Unhatched Eggs:</strong> {selectedBreedingRecord.unhatchedEggs}</p>}
                            <p><strong>Notes:</strong> {selectedBreedingRecord.notes}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : isAddingBreedingLog ? (
                    <form onSubmit={handleAddBreedingLogSubmit} className="bg-white p-6 rounded-2xl border border-slate-100 space-y-6">
                      <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                        <h3 className="font-bold text-sm text-slate-800">Add Breeding Record / History</h3>
                        <button type="button" onClick={() => setIsAddingBreedingLog(false)} className="text-slate-400 hover:text-slate-655 text-xs font-bold">Cancel</button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Breeding Type *</label>
                            <select value={breedingType} onChange={(e) => setBreedingType(e.target.value)} className="w-full px-3.5 py-2 border rounded-xl bg-white focus:outline-none text-xs font-semibold">
                              <option value="Natural Mating">Natural Mating</option>
                              <option value="Artificial Insemination">Artificial Insemination</option>
                              <option value="Controlled Pairing / Introduction">Controlled Pairing / Introduction</option>
                              <option value="Environmental Cycle Induction">Environmental Cycle Induction</option>
                              <option value="Others">Others (Specify Custom Method)</option>
                            </select>

                            {(breedingType === 'Others' || breedingType === 'Other') && (
                              <div className="mt-2">
                                <input
                                  type="text"
                                  required
                                  value={customBreedingType}
                                  onChange={(e) => setCustomBreedingType(e.target.value)}
                                  placeholder="Specify custom breeding method..."
                                  className="w-full px-3 py-1.5 border rounded-xl bg-white text-xs outline-none"
                                />
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Breeding Date *</label>
                            <input type="date" value={breedingLogDate} onChange={(e) => setBreedingLogDate(e.target.value)} className="w-full px-3.5 py-2 border rounded-xl bg-white focus:outline-none" required />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Clutch Size</label>
                            <input type="number" value={clutchSize} onChange={(e) => setClutchSize(e.target.value)} placeholder="e.g. 8" className="w-full px-3.5 py-2 border rounded-xl bg-white focus:outline-none" />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Hatch Date</label>
                            <input type="date" value={hatchDate} onChange={(e) => setHatchDate(e.target.value)} className="w-full px-3.5 py-2 border rounded-xl bg-white focus:outline-none" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Hatchlings</label>
                              <input type="number" value={hatchlings} onChange={(e) => setHatchlings(e.target.value)} placeholder="e.g. 6" className="w-full px-3.5 py-2 border rounded-xl bg-white focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Unhatched Eggs</label>
                              <input type="number" value={unhatchedEggs} onChange={(e) => setUnhatchedEggs(e.target.value)} placeholder="e.g. 2" className="w-full px-3.5 py-2 border rounded-xl bg-white focus:outline-none" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Result / Status *</label>
                            <select value={breedingStatusInput} onChange={(e) => setBreedingStatusInput(e.target.value as any)} className="w-full px-3.5 py-2 border rounded-xl bg-white focus:outline-none">
                              <option value="IN PROGRESS">IN PROGRESS</option>
                              <option value="SUCCESSFUL">SUCCESSFUL</option>
                              <option value="FAILED">FAILED</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setIsAddingBreedingLog(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold">Cancel</button>
                        <button type="submit" className="px-5 py-2 bg-[#113C24] text-white rounded-lg text-xs font-bold">Add Record</button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-sm text-slate-800">Breeding Record History</h3>
                        <button onClick={() => setIsAddingBreedingLog(true)} className="px-4 py-2 bg-[#113C24] text-white text-xs font-bold rounded-xl cursor-pointer">
                          + Add Breeding Log
                        </button>
                      </div>

                      {animalBreedingRecords.length === 0 ? (
                        <div className="bg-white p-8 rounded-2xl text-center text-slate-500">
                          No breeding records found for this animal. Start pairing in the "Readiness" tab.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-2xs">
                            <thead>
                              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                                <th className="p-4">Pair</th>
                                <th className="p-4">Breeding Type</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Created By</th>
                                <th className="p-4">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {animalBreedingRecords.map(b => (
                                <tr key={b.id} className="border-b border-slate-50 text-slate-600 hover:bg-slate-50">
                                  <td className="p-4 font-bold text-slate-800">{b.femaleId} x {b.maleId}</td>
                                  <td className="p-4">{b.breedingType}</td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${b.status === 'SUCCESSFUL' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                      {b.status}
                                    </span>
                                  </td>
                                  <td className="p-4">{b.createdBy}</td>
                                  <td className="p-4">
                                    <button onClick={() => setSelectedBreedingRecord(b)} className="text-[#113C24] font-bold hover:underline cursor-pointer">View Details</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 6. TRANSFER TAB */}
          {activeTab === 'transfer' && (
            <div className="space-y-6">
              {!isStartingTransfer ? (
                <div className="bg-white rounded-2xl p-12 border border-slate-100 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto border border-slate-100">
                    ✈
                  </div>
                  <h4 className="font-bold text-base text-slate-800">No transfer records yet.</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">Manage ownership and location transfers. Start a transfer wizard to comply with DENR/permit laws.</p>
                  <button
                    onClick={() => {
                      setIsStartingTransfer(true);
                      setTransferStep(1);
                    }}
                    className="px-5 py-2.5 bg-[#113C24] hover:bg-[#1B5234] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    + New Transfer
                  </button>
                </div>
              ) : (
                <div className={`rounded-2xl border overflow-hidden shadow-xs ${
                  isDarkMode ? 'bg-[#071F11] border-emerald-900/60 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <div className={`p-4 border-b flex flex-wrap items-center justify-between text-xs font-bold gap-2 ${
                    isDarkMode ? 'bg-[#05170d] border-emerald-950 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
                  }`}>
                    <span className={`px-2.5 py-1 rounded-lg transition-colors ${transferStep === 1 ? (isDarkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-[#113C24]') : ''}`}>
                      1. Select Animal
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg transition-colors ${transferStep === 2 ? (isDarkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-[#113C24]') : ''}`}>
                      2. New Owner
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg transition-colors ${transferStep === 3 ? (isDarkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-[#113C24]') : ''}`}>
                      3. Documents & Permits
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg transition-colors ${transferStep === 4 ? (isDarkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-[#113C24]') : ''}`}>
                      4. Review & Confirm
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg transition-colors ${transferStep === 5 ? (isDarkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-[#113C24]') : ''}`}>
                      5. Completed
                    </span>
                  </div>

                  <div className={`p-6 space-y-6 text-xs ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    {transferStep === 1 && (
                      <div className="space-y-4">
                        <h4 className={`font-bold text-sm ${isDarkMode ? 'text-emerald-300' : 'text-slate-900'}`}>Select Animal for Transfer</h4>
                        <div className={`p-4 rounded-xl flex items-center justify-between border ${
                          isDarkMode 
                            ? 'bg-[#05170d] border-emerald-900/80' 
                            : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div>
                            <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{animal.id}{animal.name ? ` - ${animal.name}` : ''}</p>
                            <p className={`mt-0.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{animal.species} • Enclosure: {currentEnclosure?.name || 'Unassigned'}</p>
                          </div>
                          <span className={`px-3 py-1.5 font-extrabold rounded-lg border text-xs ${
                            isDarkMode 
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}>
                            Selected ✓
                          </span>
                        </div>
                        <div>
                          <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Transfer Type *</label>
                          <select 
                            value={transferType} 
                            onChange={(e) => setTransferType(e.target.value)} 
                            className={`w-full px-3.5 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                              isDarkMode 
                                ? 'bg-[#05170d] border-emerald-900/80 text-white' 
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          >
                            <option value="To New Owner" className={isDarkMode ? 'bg-[#061c10] text-white' : ''}>To New Owner (Ownership Transfer)</option>
                            <option value="Local Sale" className={isDarkMode ? 'bg-[#061c10] text-white' : ''}>Local Sale (Commercial / Hobbyist)</option>
                            <option value="Export / International" className={isDarkMode ? 'bg-[#061c10] text-white' : ''}>Export / International Transfer</option>
                            <option value="Donation / Rehoming" className={isDarkMode ? 'bg-[#061c10] text-white' : ''}>Donation / Rehoming</option>
                            <option value="To Another Facility" className={isDarkMode ? 'bg-[#061c10] text-white' : ''}>To Another Facility (Lending/Exchange)</option>
                            <option value="Breeding Loan" className={isDarkMode ? 'bg-[#061c10] text-white' : ''}>Breeding Loan / Custody Transfer</option>
                            <option value="Others" className={isDarkMode ? 'bg-[#061c10] text-white' : ''}>Others (Specify Custom Transfer Type)</option>
                          </select>

                          {(transferType === 'Others' || transferType === 'Other') && (
                            <div className="mt-2.5">
                              <label className={`block text-[11px] font-bold mb-1 ${isDarkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                                Specify Custom Transfer Type *
                              </label>
                              <input
                                type="text"
                                required
                                value={customTransferType}
                                onChange={(e) => setCustomTransferType(e.target.value)}
                                placeholder="e.g. Educational Sanctuary Loan, Special Exhibit Transfer..."
                                className={`w-full px-3.5 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-semibold ${
                                  isDarkMode 
                                    ? 'bg-[#05170d] border-emerald-900/80 text-white placeholder:text-slate-500' 
                                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                                }`}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {transferStep === 2 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-bold text-sm ${isDarkMode ? 'text-emerald-300' : 'text-slate-900'}`}>Provide New Owner Information</h4>
                          <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            Only Full Name is required • Other fields optional
                          </span>
                        </div>

                        {transferOwnerError && (
                          <div className={`p-3 border rounded-xl flex items-center space-x-2 text-xs font-semibold ${
                            isDarkMode ? 'bg-rose-950/60 border-rose-800 text-rose-200' : 'bg-rose-50 border-rose-300 text-rose-800'
                          }`}>
                            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                            <span>{transferOwnerError}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Full Name *</label>
                            <input 
                              type="text" 
                              value={newOwnerName} 
                              onChange={(e) => {
                                setNewOwnerName(e.target.value);
                                if (transferOwnerError) setTransferOwnerError(null);
                              }} 
                              placeholder="Juan Dela Cruz / Facility Name" 
                              className={`w-full px-3.5 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                isDarkMode 
                                  ? 'bg-[#05170d] border-emerald-900/80 text-white placeholder:text-slate-500' 
                                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                              }`} 
                              required 
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                              Contact Number <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <input 
                              type="text" 
                              value={newOwnerContact} 
                              onChange={(e) => setNewOwnerContact(e.target.value)} 
                              placeholder="0917 123 4567" 
                              className={`w-full px-3.5 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                isDarkMode 
                                  ? 'bg-[#05170d] border-emerald-900/80 text-white placeholder:text-slate-500' 
                                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                              }`} 
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Email (Optional)</label>
                            <input 
                              type="email" 
                              value={newOwnerEmail} 
                              onChange={(e) => setNewOwnerEmail(e.target.value)} 
                              placeholder="juandelacruz@email.com" 
                              className={`w-full px-3.5 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                isDarkMode 
                                  ? 'bg-[#05170d] border-emerald-900/80 text-white placeholder:text-slate-500' 
                                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                              }`} 
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                              Gov ID Type <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <select 
                              value={govIdType} 
                              onChange={(e) => setGovIdType(e.target.value)} 
                              className={`w-full px-3.5 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                isDarkMode 
                                  ? 'bg-[#05170d] border-emerald-900/80 text-white' 
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            >
                              <option value="Passport" className={isDarkMode ? 'bg-[#061c10] text-white' : ''}>Passport</option>
                              <option value="National ID" className={isDarkMode ? 'bg-[#061c10] text-white' : ''}>National ID (PhilSys)</option>
                              <option value="Driver's License" className={isDarkMode ? 'bg-[#061c10] text-white' : ''}>Driver's License</option>
                              <option value="UMID" className={isDarkMode ? 'bg-[#061c10] text-white' : ''}>UMID</option>
                              <option value="Voter's ID" className={isDarkMode ? 'bg-[#061c10] text-white' : ''}>Voter's ID</option>
                              <option value="Postal ID" className={isDarkMode ? 'bg-[#061c10] text-white' : ''}>Postal ID</option>
                              <option value="PRC ID" className={isDarkMode ? 'bg-[#061c10] text-white' : ''}>PRC Professional ID</option>
                              <option value="SSS / GSIS" className={isDarkMode ? 'bg-[#061c10] text-white' : ''}>SSS / GSIS E-Card</option>
                              <option value="Senior / PWD ID" className={isDarkMode ? 'bg-[#061c10] text-white' : ''}>Senior Citizen / PWD ID</option>
                              <option value="Not Specified" className={isDarkMode ? 'bg-[#061c10] text-white' : ''}>None / Not Specified</option>
                              <option value="Others" className={isDarkMode ? 'bg-[#061c10] text-white' : ''}>Others (Specify Custom ID Type)</option>
                            </select>

                            {(govIdType === 'Others' || govIdType === 'Other') && (
                              <div className="mt-2">
                                <input
                                  type="text"
                                  value={customGovIdType}
                                  onChange={(e) => setCustomGovIdType(e.target.value)}
                                  placeholder="Specify ID Type (e.g. Barangay ID, TIN ID, Company ID...)"
                                  className={`w-full px-3 py-1.5 border rounded-xl text-xs outline-none ${
                                    isDarkMode 
                                      ? 'bg-[#05170d] border-emerald-900/80 text-white placeholder:text-slate-500' 
                                      : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                                  }`}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                              Address <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <input 
                              type="text" 
                              value={newOwnerAddress} 
                              onChange={(e) => setNewOwnerAddress(e.target.value)} 
                              placeholder="123 Reptile Street, Quezon City" 
                              className={`w-full px-3.5 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                isDarkMode 
                                  ? 'bg-[#05170d] border-emerald-900/80 text-white placeholder:text-slate-500' 
                                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                              }`} 
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                              ID Number <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <input 
                              type="text" 
                              value={govIdNumber} 
                              onChange={(e) => setGovIdNumber(e.target.value)} 
                              placeholder="P0546708 (or leave blank)" 
                              className={`w-full px-3.5 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                isDarkMode 
                                  ? 'bg-[#05170d] border-emerald-900/80 text-white placeholder:text-slate-500' 
                                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                              }`} 
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {transferStep === 3 && (
                      <div className="space-y-5">
                        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3 ${
                          isDarkMode ? 'border-emerald-900/60' : 'border-slate-200'
                        }`}>
                          <div>
                            <h4 className={`font-extrabold text-sm flex items-center space-x-2 ${
                              isDarkMode ? 'text-emerald-300' : 'text-slate-900'
                            }`}>
                              <FileCheck className={`w-4 h-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`} />
                              <span>Documents & Permits Dossier</span>
                            </h4>
                            <p className={`text-[11px] mt-0.5 ${
                              isDarkMode ? 'text-slate-300' : 'text-slate-600'
                            }`}>
                              Attach mandatory regulatory DENR permits and optional transfer documents. You can also add custom document types.
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            {(() => {
                              const reqDocs = transferDocuments.filter(d => d.required);
                              const reqAttached = reqDocs.filter(d => d.fileName).length;
                              const isComplete = reqAttached === reqDocs.length;
                              return (
                                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                                  isComplete 
                                    ? (isDarkMode 
                                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                                        : 'bg-emerald-50 text-emerald-800 border-emerald-300')
                                    : (isDarkMode 
                                        ? 'bg-rose-950/80 text-rose-300 border-rose-800' 
                                        : 'bg-rose-50 text-rose-700 border-rose-300')
                                }`}>
                                  Required: {reqAttached} / {reqDocs.length} Attached
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Validation Error Alert */}
                        {transferDocError && (
                          <div className={`p-3.5 border rounded-xl flex items-start space-x-3 text-xs font-semibold animate-pulse ${
                            isDarkMode 
                              ? 'bg-rose-950/50 border-rose-800 text-rose-200' 
                              : 'bg-rose-50 border-rose-300 text-rose-800'
                          }`}>
                            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className={`font-bold ${isDarkMode ? 'text-rose-200' : 'text-rose-900'}`}>Required Documents Missing</p>
                              <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-rose-300' : 'text-rose-700'}`}>{transferDocError}</p>
                            </div>
                          </div>
                        )}

                        {/* Option: Allow proceeding with pending physical paperwork */}
                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                          allowPendingPermits 
                            ? (isDarkMode ? 'bg-emerald-950/40 border-emerald-700/60' : 'bg-emerald-50/70 border-emerald-300')
                            : (isDarkMode ? 'bg-[#04140b] border-emerald-900/60' : 'bg-slate-50 border-slate-200')
                        }`}>
                          <div className="flex items-center space-x-2.5">
                            <input 
                              type="checkbox"
                              id="allowPendingPermitsCheck"
                              checked={allowPendingPermits}
                              onChange={(e) => {
                                setAllowPendingPermits(e.target.checked);
                                if (e.target.checked) setTransferDocError(null);
                              }}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <label htmlFor="allowPendingPermitsCheck" className={`text-xs font-semibold cursor-pointer ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                              Permits filed physically / Upload later (Allow proceeding if digital copy is not ready)
                            </label>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            allowPendingPermits 
                              ? (isDarkMode ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' : 'bg-emerald-100 text-emerald-800 border border-emerald-200')
                              : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600')
                          }`}>
                            {allowPendingPermits ? 'Pending Allowed' : 'Strict Mode'}
                          </span>
                        </div>

                        {/* SECTION 1: MANDATORY REQUIRED DOCUMENTS */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-extrabold uppercase tracking-wider flex items-center space-x-1.5 ${
                              isDarkMode ? 'text-emerald-300' : 'text-slate-800'
                            }`}>
                              <Shield className="w-3.5 h-3.5 text-rose-500" />
                              <span>Mandatory Regulatory Documents (Required *)</span>
                            </span>
                            <span className={`text-[10px] font-bold ${
                              isDarkMode ? 'text-rose-400' : 'text-rose-600'
                            }`}>
                              Must be attached before proceeding
                            </span>
                          </div>

                          <div className="space-y-2">
                            {transferDocuments.filter(doc => doc.required && !doc.isOther).map(doc => (
                              <div
                                key={doc.id}
                                className={`p-3 rounded-xl border transition-all ${
                                  doc.fileName
                                    ? (isDarkMode 
                                        ? 'bg-[#092b19]/80 border-emerald-700/80 shadow-xs' 
                                        : 'bg-emerald-50/80 border-emerald-300 shadow-xs')
                                    : (isDarkMode 
                                        ? 'bg-[#05170d] border-emerald-900/80' 
                                        : 'bg-slate-50 border-slate-200')
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                      <span className={`font-bold text-xs ${
                                        isDarkMode ? 'text-white' : 'text-slate-900'
                                      }`}>
                                        {doc.title}
                                      </span>
                                      {doc.fileName ? (
                                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                                          isDarkMode 
                                            ? 'bg-emerald-950 text-emerald-300 border-emerald-600' 
                                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                        }`}>
                                          Attached ✓
                                        </span>
                                      ) : (
                                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                                          isDarkMode 
                                            ? 'bg-rose-950/80 text-rose-300 border-rose-800' 
                                            : 'bg-rose-50 text-rose-700 border-rose-300'
                                        }`}>
                                          Required *
                                        </span>
                                      )}
                                    </div>
                                    {doc.subtitle && (
                                      <p className={`text-[11px] mt-0.5 leading-tight ${
                                        isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                      }`}>
                                        {doc.subtitle}
                                      </p>
                                    )}

                                    {/* Uploaded File Details */}
                                    {doc.fileName && (
                                      <div className={`mt-1.5 flex items-center space-x-2 text-[11px] p-2 rounded-lg border ${
                                        isDarkMode 
                                          ? 'bg-[#031208] text-emerald-200 border-emerald-800/80' 
                                          : 'bg-white text-emerald-950 border-emerald-200'
                                      }`}>
                                        <Paperclip className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span className="font-semibold truncate">{doc.fileName}</span>
                                        <span className={`text-[10px] shrink-0 ${isDarkMode ? 'text-emerald-400/80' : 'text-slate-500'}`}>
                                          • {doc.fileSize}
                                        </span>
                                        {doc.uploadedAt && (
                                          <span className={`text-[10px] shrink-0 ${isDarkMode ? 'text-emerald-400/80' : 'text-slate-500'}`}>
                                            • {doc.uploadedAt}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Upload / Replace Action */}
                                  <div className="flex items-center space-x-2 shrink-0">
                                    <label className="cursor-pointer">
                                      <input
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleUploadTransferDocFile(doc.id, file);
                                        }}
                                      />
                                      <span className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs ${
                                        doc.fileName
                                          ? (isDarkMode 
                                              ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800' 
                                              : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300')
                                          : (isDarkMode 
                                              ? 'bg-[#1b5e39] hover:bg-[#237849] text-white border border-emerald-600' 
                                              : 'bg-[#113C24] hover:bg-[#1B5234] text-white')
                                      }`}>
                                        <Upload className="w-3 h-3" />
                                        <span>{doc.fileName ? 'Replace File' : 'Attach File *'}</span>
                                      </span>
                                    </label>

                                    {doc.fileName && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveTransferDocFile(doc.id)}
                                        className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                          isDarkMode 
                                            ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/60' 
                                            : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'
                                        }`}
                                        title="Remove attached file"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SECTION 2: OPTIONAL & CONDITIONAL DOCUMENTS */}
                        <div className={`space-y-2.5 pt-2 border-t ${
                          isDarkMode ? 'border-emerald-900/60' : 'border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-extrabold uppercase tracking-wider flex items-center space-x-1.5 ${
                              isDarkMode ? 'text-emerald-300' : 'text-slate-800'
                            }`}>
                              <FileText className={`w-3.5 h-3.5 ${isDarkMode ? 'text-emerald-400' : 'text-slate-500'}`} />
                              <span>Optional & Conditional Documents (If Applicable)</span>
                            </span>
                            <span className={`text-[10px] font-semibold ${
                              isDarkMode ? 'text-slate-300' : 'text-slate-500'
                            }`}>
                              Attach if applicable to this animal
                            </span>
                          </div>

                          <div className="space-y-2">
                            {transferDocuments.filter(doc => !doc.required && !doc.isOther).map(doc => (
                              <div
                                key={doc.id}
                                className={`p-3 rounded-xl border transition-all ${
                                  doc.fileName
                                    ? (isDarkMode 
                                        ? 'bg-[#092b19]/80 border-emerald-700/80 shadow-xs' 
                                        : 'bg-emerald-50/80 border-emerald-300 shadow-xs')
                                    : (isDarkMode 
                                        ? 'bg-[#05170d] border-emerald-900/80' 
                                        : 'bg-slate-50 border-slate-200')
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                      <span className={`font-bold text-xs ${
                                        isDarkMode ? 'text-white' : 'text-slate-900'
                                      }`}>
                                        {doc.title}
                                      </span>
                                      {doc.fileName ? (
                                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                                          isDarkMode 
                                            ? 'bg-emerald-950 text-emerald-300 border-emerald-600' 
                                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                        }`}>
                                          Attached ✓
                                        </span>
                                      ) : (
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                          isDarkMode 
                                            ? 'bg-emerald-950 text-emerald-200 border-emerald-800' 
                                            : 'bg-slate-200 text-slate-800 border-slate-300'
                                        }`}>
                                          If Applicable
                                        </span>
                                      )}
                                    </div>
                                    {doc.subtitle && (
                                      <p className={`text-[11px] mt-0.5 leading-tight ${
                                        isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                      }`}>
                                        {doc.subtitle}
                                      </p>
                                    )}

                                    {/* Uploaded File Details */}
                                    {doc.fileName && (
                                      <div className={`mt-1.5 flex items-center space-x-2 text-[11px] p-2 rounded-lg border ${
                                        isDarkMode 
                                          ? 'bg-[#031208] text-emerald-200 border-emerald-800/80' 
                                          : 'bg-white text-emerald-950 border-emerald-200'
                                      }`}>
                                        <Paperclip className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span className="font-semibold truncate">{doc.fileName}</span>
                                        <span className={`text-[10px] shrink-0 ${isDarkMode ? 'text-emerald-400/80' : 'text-slate-500'}`}>
                                          • {doc.fileSize}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Upload / Replace Action */}
                                  <div className="flex items-center space-x-2 shrink-0">
                                    <label className="cursor-pointer">
                                      <input
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleUploadTransferDocFile(doc.id, file);
                                        }}
                                      />
                                      <span className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs ${
                                        doc.fileName
                                          ? (isDarkMode 
                                              ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800' 
                                              : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300')
                                          : (isDarkMode 
                                              ? 'bg-[#0f3d24] hover:bg-[#165633] text-emerald-100 border border-emerald-700/70' 
                                              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300')
                                      }`}>
                                        <Upload className="w-3 h-3" />
                                        <span>{doc.fileName ? 'Replace File' : 'Attach (Optional)'}</span>
                                      </span>
                                    </label>

                                    {doc.fileName && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveTransferDocFile(doc.id)}
                                        className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                          isDarkMode 
                                            ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/60' 
                                            : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'
                                        }`}
                                        title="Remove attached file"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SECTION 3: OTHER / CUSTOM DOCUMENTS */}
                        <div className={`space-y-2.5 pt-2 border-t ${
                          isDarkMode ? 'border-emerald-900/60' : 'border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-extrabold uppercase tracking-wider flex items-center space-x-1.5 ${
                              isDarkMode ? 'text-purple-300' : 'text-purple-700'
                            }`}>
                              <FilePlus className={`w-3.5 h-3.5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                              <span>Other / Custom Facility Documents</span>
                            </span>
                            <span className={`text-[10px] font-semibold ${
                              isDarkMode ? 'text-slate-300' : 'text-slate-500'
                            }`}>
                              Add any other type of document
                            </span>
                          </div>

                          {/* List of Custom Documents */}
                          {transferDocuments.filter(doc => doc.isOther).length > 0 && (
                            <div className="space-y-2">
                              {transferDocuments.filter(doc => doc.isOther).map(doc => (
                                <div
                                  key={doc.id}
                                  className={`p-3 rounded-xl border transition-all ${
                                    doc.fileName
                                      ? (isDarkMode 
                                          ? 'bg-purple-950/40 border-purple-800/80 shadow-xs' 
                                          : 'bg-purple-50/70 border-purple-200 shadow-xs')
                                      : (isDarkMode 
                                          ? 'bg-[#05170d] border-emerald-900/80' 
                                          : 'bg-slate-50 border-slate-200')
                                  }`}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                        <span className={`font-bold text-xs ${
                                          isDarkMode ? 'text-purple-200' : 'text-slate-900'
                                        }`}>
                                          {doc.title}
                                        </span>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                          isDarkMode 
                                            ? 'bg-purple-950 text-purple-200 border-purple-700' 
                                            : 'bg-purple-100 text-purple-800 border-purple-300'
                                        }`}>
                                          Other / Custom
                                        </span>
                                        {doc.required && (
                                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                                            isDarkMode 
                                              ? 'bg-rose-950/80 text-rose-300 border-rose-800' 
                                              : 'bg-rose-50 text-rose-700 border-rose-300'
                                          }`}>
                                            Required *
                                          </span>
                                        )}
                                      </div>
                                      {doc.subtitle && (
                                        <p className={`text-[11px] mt-0.5 leading-tight ${
                                          isDarkMode ? 'text-purple-200/90' : 'text-slate-600'
                                        }`}>
                                          {doc.subtitle}
                                        </p>
                                      )}

                                      {/* Uploaded File Details */}
                                      {doc.fileName && (
                                        <div className={`mt-1.5 flex items-center space-x-2 text-[11px] p-2 rounded-lg border ${
                                          isDarkMode 
                                            ? 'bg-[#0e071a] text-purple-200 border-purple-800/80' 
                                            : 'bg-white text-purple-900 border-purple-200'
                                        }`}>
                                          <Paperclip className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                          <span className="font-semibold truncate">{doc.fileName}</span>
                                          <span className={`text-[10px] shrink-0 ${isDarkMode ? 'text-purple-300/80' : 'text-slate-500'}`}>
                                            • {doc.fileSize}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Upload / Delete Action */}
                                    <div className="flex items-center space-x-2 shrink-0">
                                      <label className="cursor-pointer">
                                        <input
                                          type="file"
                                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUploadTransferDocFile(doc.id, file);
                                          }}
                                        />
                                        <span className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs ${
                                          doc.fileName
                                            ? (isDarkMode 
                                                ? 'bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-700' 
                                                : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300')
                                            : (isDarkMode 
                                                ? 'bg-purple-900 hover:bg-purple-800 text-white border border-purple-600' 
                                                : 'bg-purple-700 hover:bg-purple-800 text-white')
                                        }`}>
                                          <Upload className="w-3 h-3" />
                                          <span>{doc.fileName ? 'Replace File' : 'Attach File'}</span>
                                        </span>
                                      </label>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteOtherDoc(doc.id)}
                                        className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                          isDarkMode 
                                            ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/60' 
                                            : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'
                                        }`}
                                        title="Delete custom document"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Inline Add Other Document Form */}
                          {!showAddOtherDoc ? (
                            <button
                              type="button"
                              onClick={() => setShowAddOtherDoc(true)}
                              className={`w-full py-2.5 px-4 border border-dashed rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                                isDarkMode 
                                  ? 'border-purple-800/80 text-purple-300 hover:border-purple-500 hover:bg-purple-950/30' 
                                  : 'border-purple-300 text-purple-700 hover:border-purple-500 hover:bg-purple-50/50'
                              }`}
                            >
                              <Plus className="w-4 h-4" />
                              <span>+ Add Other Document / Custom Permit</span>
                            </button>
                          ) : (
                            <div className={`p-4 rounded-xl border space-y-3 ${
                              isDarkMode 
                                ? 'border-purple-900/80 bg-[#12061e]/70' 
                                : 'border-purple-200 bg-purple-50/50'
                            }`}>
                              <div className={`flex items-center justify-between pb-2 border-b ${
                                isDarkMode ? 'border-purple-900/60' : 'border-purple-100'
                              }`}>
                                <h5 className={`font-bold text-xs flex items-center space-x-1.5 ${
                                  isDarkMode ? 'text-purple-300' : 'text-purple-900'
                                }`}>
                                  <FilePlus className="w-3.5 h-3.5 text-purple-500" />
                                  <span>Add Custom Document</span>
                                </h5>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowAddOtherDoc(false);
                                    setOtherDocTitle('');
                                    setOtherDocSubtitle('');
                                    setOtherDocFile(null);
                                  }}
                                  className={`cursor-pointer ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="space-y-2.5">
                                <div>
                                  <label className={`block text-[11px] font-bold mb-1 ${
                                    isDarkMode ? 'text-slate-200' : 'text-slate-700'
                                  }`}>
                                    Document Type / Title *
                                  </label>
                                  <input
                                    type="text"
                                    value={otherDocTitle}
                                    onChange={(e) => setOtherDocTitle(e.target.value)}
                                    placeholder="e.g. DENR Inspection Clearance, DNA Lineage Certificate, Waiver"
                                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                                      isDarkMode 
                                        ? 'bg-[#05170d] border-purple-900/80 text-white placeholder:text-slate-500' 
                                        : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                                    }`}
                                    required
                                  />
                                </div>

                                <div>
                                  <label className={`block text-[11px] font-bold mb-1 ${
                                    isDarkMode ? 'text-slate-200' : 'text-slate-700'
                                  }`}>
                                    Description / Purpose (Optional)
                                  </label>
                                  <input
                                    type="text"
                                    value={otherDocSubtitle}
                                    onChange={(e) => setOtherDocSubtitle(e.target.value)}
                                    placeholder="e.g. Supporting clearance issued by regional DENR office"
                                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                                      isDarkMode 
                                        ? 'bg-[#05170d] border-purple-900/80 text-white placeholder:text-slate-500' 
                                        : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                                    }`}
                                  />
                                </div>

                                <div>
                                  <label className={`block text-[11px] font-bold mb-1 ${
                                    isDarkMode ? 'text-slate-200' : 'text-slate-700'
                                  }`}>
                                    Attach File (PDF, Image, DOC)
                                  </label>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="file"
                                      id="otherDocFileInput"
                                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setOtherDocFile(file);
                                      }}
                                    />
                                    <label
                                      htmlFor="otherDocFileInput"
                                      className={`px-3.5 py-1.5 border rounded-lg text-xs font-bold cursor-pointer flex items-center space-x-1.5 transition-colors ${
                                        isDarkMode 
                                          ? 'border-purple-800 bg-[#0e071a] text-purple-200 hover:bg-purple-950/80' 
                                          : 'border-purple-300 bg-white text-purple-700 hover:bg-purple-50'
                                      }`}
                                    >
                                      <Upload className="w-3.5 h-3.5" />
                                      <span>{otherDocFile ? 'Change File' : 'Browse File...'}</span>
                                    </label>
                                    {otherDocFile && (
                                      <span className={`text-xs font-semibold truncate ${
                                        isDarkMode ? 'text-purple-200' : 'text-purple-900'
                                      }`}>
                                        {otherDocFile.name} ({formatFileSize(otherDocFile.size)})
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2 pt-1">
                                  <input
                                    type="checkbox"
                                    id="requireOtherDocCheck"
                                    checked={otherDocIsRequired}
                                    onChange={(e) => setOtherDocIsRequired(e.target.checked)}
                                    className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                                  />
                                  <label htmlFor="requireOtherDocCheck" className={`text-xs font-bold cursor-pointer ${
                                    isDarkMode ? 'text-slate-200' : 'text-slate-700'
                                  }`}>
                                    Mark as Mandatory / Required for this transfer
                                  </label>
                                </div>

                                <div className="flex justify-end space-x-2 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowAddOtherDoc(false);
                                      setOtherDocTitle('');
                                      setOtherDocSubtitle('');
                                      setOtherDocFile(null);
                                    }}
                                    className={`px-3 py-1.5 border rounded-lg text-xs font-semibold cursor-pointer ${
                                      isDarkMode 
                                        ? 'border-emerald-900 text-slate-300 hover:bg-emerald-950' 
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleAddOtherDocumentSubmit}
                                    disabled={!otherDocTitle.trim()}
                                    className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                                  >
                                    Add Document
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {transferStep === 4 && (
                      <div className="space-y-4">
                        <div className={`flex items-center justify-between border-b pb-3 ${
                          isDarkMode ? 'border-emerald-900/60' : 'border-slate-200'
                        }`}>
                          <h4 className={`font-extrabold text-sm flex items-center space-x-2 ${
                            isDarkMode ? 'text-emerald-300' : 'text-slate-800'
                          }`}>
                            <FileCheck className={`w-4 h-4 ${isDarkMode ? 'text-emerald-400' : 'text-[#113C24]'}`} />
                            <span>Review & Confirm Transfer</span>
                          </h4>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            isDarkMode 
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}>
                            Ready for Approval
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Animal Details Box */}
                          <div className={`p-4 rounded-xl border space-y-2 ${
                            isDarkMode 
                              ? 'bg-[#05170d] border-emerald-900/80 text-slate-200' 
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}>
                            <p className={`font-extrabold text-xs uppercase tracking-wider ${
                              isDarkMode ? 'text-emerald-400' : 'text-[#113C24]'
                            }`}>
                              Animal Details
                            </p>
                            <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {animal.id}{animal.name ? ` - ${animal.name}` : ''}
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                              {animal.species} • Sex: {animal.sex} • Morph: {animal.morph || 'Normal'}
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                              Current Enclosure: <span className="font-semibold">{currentEnclosure?.name || 'Unassigned'}</span>
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                              Transfer Type: <span className={`font-bold ${isDarkMode ? 'text-emerald-300' : 'text-slate-700'}`}>{transferType}</span>
                            </p>
                          </div>

                          {/* New Owner Details Box */}
                          <div className={`p-4 rounded-xl border space-y-2 ${
                            isDarkMode 
                              ? 'bg-[#05170d] border-emerald-900/80 text-slate-200' 
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}>
                            <p className={`font-extrabold text-xs uppercase tracking-wider ${
                              isDarkMode ? 'text-emerald-400' : 'text-[#113C24]'
                            }`}>
                              New Owner Information
                            </p>
                            <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {newOwnerName}
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                              Contact: {newOwnerContact.trim() ? newOwnerContact : 'Not specified'} {newOwnerEmail ? `• ${newOwnerEmail}` : ''}
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                              Address: {newOwnerAddress.trim() ? newOwnerAddress : 'Not specified'}
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                              Gov ID: <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                                {govIdNumber.trim() ? `${govIdType} - ${govIdNumber}` : 'Not provided'}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Attached Permits & Documents Review Box */}
                        <div className={`p-4 rounded-xl border space-y-3 ${
                          isDarkMode 
                            ? 'bg-[#05170d] border-emerald-900/80' 
                            : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <p className={`font-extrabold text-xs uppercase tracking-wider ${
                              isDarkMode ? 'text-emerald-400' : 'text-[#113C24]'
                            }`}>
                              Attached Legal & Regulatory Dossier ({transferDocuments.filter(d => d.fileName).length} Files)
                            </p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              isDarkMode 
                                ? 'text-emerald-300 bg-emerald-950 border-emerald-700' 
                                : 'text-emerald-700 bg-emerald-100 border-emerald-200'
                            }`}>
                              Compliant ✓
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {transferDocuments.filter(d => d.fileName).map((doc, idx) => (
                              <div 
                                key={idx} 
                                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                                  isDarkMode 
                                    ? 'bg-[#031208] border-emerald-800/80 text-slate-200' 
                                    : 'bg-white border-slate-200 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center space-x-2 min-w-0">
                                  <Paperclip className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <div className="min-w-0">
                                    <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{doc.title}</span>
                                    <span className={`ml-1.5 text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>({doc.fileName})</span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 shrink-0">
                                  <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{doc.fileSize}</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                    doc.isOther 
                                      ? (isDarkMode ? 'bg-purple-950 text-purple-200 border-purple-700' : 'bg-purple-100 text-purple-700 border-purple-200')
                                      : doc.required 
                                        ? (isDarkMode ? 'bg-rose-950/80 text-rose-300 border-rose-800' : 'bg-rose-100 text-rose-700 border-rose-200')
                                        : (isDarkMode ? 'bg-emerald-950 text-emerald-200 border-emerald-800' : 'bg-slate-100 text-slate-700 border-slate-200')
                                  }`}>
                                    {doc.isOther ? 'Other' : doc.required ? 'Required' : 'Optional'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {transferStep === 5 && (
                      <div className="text-center p-8 space-y-4">
                        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/80 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto border border-emerald-200 dark:border-emerald-800 text-2xl shadow-xs">
                          ✓
                        </div>
                        <h4 className="font-extrabold text-base text-slate-800 dark:text-white">Transfer Completed!</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                          The ownership of the animal has been successfully registered to the new owner, all compliance permits have been logged, and the animal profile has been safely archived.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsStartingTransfer(false);
                            onClose();
                          }}
                          className="px-5 py-2.5 bg-[#113C24] hover:bg-[#1B5234] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-colors"
                        >
                          Return to Animal Profiles
                        </button>
                      </div>
                    )}

                    {transferStep < 5 && (
                      <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-emerald-950">
                        <button
                          type="button"
                          onClick={() => {
                            setTransferDocError(null);
                            setTransferOwnerError(null);
                            setTransferStep(prev => Math.max(1, prev - 1));
                          }}
                          className="px-4 py-2 border border-slate-200 dark:border-emerald-950 hover:bg-slate-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer transition-colors"
                          disabled={transferStep === 1}
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleNextTransferStep}
                          className="px-5 py-2 bg-[#113C24] hover:bg-[#1B5234] text-white rounded-xl font-bold shadow-xs cursor-pointer transition-colors"
                        >
                          {transferStep === 4 ? 'Approve & Archive Animal' : 'Next Step →'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-6">
              <h4 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-3">Attached Documents</h4>
              
              {customAttachedDocs.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-500">No attached documents found.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Use the button below to upload documents for this animal.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {customAttachedDocs.map((doc, idx) => (
                    <div key={idx} className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between animate-fadeIn">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-xs text-emerald-900 truncate">{doc.name}</p>
                        <p className="text-[10px] text-emerald-700">{doc.size} • Added {doc.date}</p>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-emerald-800 bg-white px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200">Local Device</span>
                        <button
                          type="button"
                          onClick={() => setCustomAttachedDocs(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1 rounded-lg bg-white border border-rose-100 hover:border-rose-200 text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center space-x-3">
                <input
                  type="file"
                  ref={docFileInputRef}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  className="hidden"
                  onChange={handleDocumentUploadFromDevice}
                />
                <button
                  onClick={() => docFileInputRef.current?.click()}
                  className="px-4 py-2 bg-[#113C24] hover:bg-[#1B5234] text-white text-xs font-bold rounded-xl cursor-pointer flex items-center space-x-1.5 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ Upload New Document</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* PHOTO ADJUSTMENT MODAL */}
      {isAdjustingPhoto && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 rounded-3xl shadow-2xl border ${
            isDarkMode ? 'bg-[#071F11] border-emerald-900/60 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-emerald-950">
              <h3 className="text-base font-extrabold flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-[#113C24] dark:text-emerald-400" />
                <span>Adjust Photo & Framing</span>
              </h3>
              <button
                onClick={() => setIsAdjustingPhoto(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-emerald-950 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 my-4">
              {/* Live Preview Box */}
              <div 
                className="relative w-full h-56 rounded-2xl overflow-hidden border border-slate-200 dark:border-emerald-950 bg-slate-950 flex items-center justify-center select-none cursor-grab active:cursor-grabbing touch-none group"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              >
                {(currentImage || animal.image) ? (
                  <img
                    src={currentImage || animal.image}
                    alt={animal.name || animal.species}
                    draggable={false}
                    style={{ 
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${imageZoom / 100})`,
                      transition: isDragging ? 'none' : 'transform 0.05s ease-out'
                    }}
                    className="max-w-full max-h-full object-contain pointer-events-none select-none transition-all duration-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <Camera className="w-8 h-8 text-emerald-500/80 mb-1" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">No Photo Available</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/60 text-white text-[10px] font-mono rounded-md backdrop-blur-xs flex items-center space-x-1.5 pointer-events-none">
                  <Move className="w-3 h-3 text-emerald-400" />
                  <span>Drag photo to align face</span>
                </div>
              </div>

              {/* Controls Grid */}
              <div className="space-y-4">
                {/* 1. Zoom Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1 text-xs font-bold text-slate-500 dark:text-emerald-300">
                    <span>Zoom Scale</span>
                    <span>{imageZoom}%</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setImageZoom(prev => Math.max(50, prev - 10))}
                      className="p-2 rounded-xl border border-slate-200 dark:border-emerald-900/60 hover:bg-slate-100 dark:hover:bg-emerald-950 cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <input
                      type="range"
                      min="50"
                      max="250"
                      step="5"
                      value={imageZoom}
                      onChange={(e) => setImageZoom(Number(e.target.value))}
                      className="flex-1 accent-[#113C24] dark:accent-emerald-400 cursor-pointer"
                    />
                    <button
                      onClick={() => setImageZoom(prev => Math.min(250, prev + 10))}
                      className="p-2 rounded-xl border border-slate-200 dark:border-emerald-900/60 hover:bg-slate-100 dark:hover:bg-emerald-950 cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setImageZoom(100); setPan({ x: 0, y: 0 }); setImageFit('cover'); setImagePositionY('top'); }}
                      className="p-2 rounded-xl border border-slate-200 dark:border-emerald-900/60 hover:bg-slate-100 dark:hover:bg-emerald-950 cursor-pointer"
                      title="Reset Settings"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 3. Vertical Framing Alignment */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-emerald-300 mb-1.5 uppercase tracking-wider">
                    Vertical Position
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['top', 'center', 'bottom'] as const).map(pos => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setImagePositionY(pos)}
                        className={`py-2 text-xs font-bold rounded-xl border capitalize transition-all cursor-pointer ${
                          imagePositionY === pos
                            ? 'bg-[#113C24] text-white border-[#113C24] dark:bg-emerald-600 dark:border-emerald-500'
                            : 'bg-slate-50 dark:bg-[#04110A] border-slate-200 dark:border-emerald-900/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Upload / Replace Photo */}
                <div className="pt-2 border-t border-slate-100 dark:border-emerald-950">
                  <label className="block text-xs font-bold text-slate-500 dark:text-emerald-300 mb-1.5 uppercase tracking-wider">
                    Change / Replace Photo
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      id="overlay-photo-file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const res = reader.result as string;
                            setCurrentImage(res);
                            onUpdateAnimal({ ...animal, image: res, imageUrl: res, photoUrl: res });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label
                      htmlFor="overlay-photo-file"
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl border border-emerald-500 cursor-pointer transition-all flex items-center justify-center space-x-2 shadow-sm"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Choose Image File from Device (Upload Photo)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-emerald-950 flex justify-end space-x-2">
              <button
                type="button"
                onClick={async () => {
                  const targetImage = currentImage || animal.image;
                  if (targetImage) {
                    const cropped = await getCroppedImg(targetImage, pan, imageZoom, 400, 224, 8);
                    setCurrentImage(cropped);
                    onUpdateAnimal({ ...animal, image: cropped, imageUrl: cropped, photoUrl: cropped });
                  }
                  setIsAdjustingPhoto(false);
                }}
                className="px-5 py-2.5 bg-[#113C24] hover:bg-[#1B5234] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer active:scale-95 flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Save & Apply</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN PHOTO LIGHTBOX */}
      {showFullscreenPhoto && (
        <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col items-center justify-center p-4">
          <div className="absolute top-6 right-6 flex items-center space-x-3 z-10">
            <button
              onClick={() => setImageZoom(prev => Math.max(50, prev - 25))}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-white text-xs font-mono font-bold bg-white/10 px-3 py-2 rounded-xl">
              {imageZoom}%
            </span>
            <button
              onClick={() => setImageZoom(prev => Math.min(300, prev + 25))}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowFullscreenPhoto(false)}
              className="p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-md cursor-pointer"
              title="Close Fullscreen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full h-full max-w-5xl max-h-[85vh] flex items-center justify-center overflow-hidden relative">
            {(currentImage || animal.image) ? (
              <img
                src={currentImage || animal.image}
                alt={animal.name || animal.species}
                style={{ transform: `scale(${imageZoom / 100})` }}
                className={`max-w-full max-h-full transition-transform duration-300 ${
                  imageFit === 'contain' ? 'object-contain' : 'object-cover'
                }`}
                referrerPolicy="no-referrer"
              />
            ) : null}
          </div>

          <div className="absolute bottom-6 text-center text-white/80 text-xs font-medium">
            {animal.name ? `${animal.name} (${animal.species})` : animal.species} — Fullscreen View
          </div>
        </div>
      )}

      {/* REMOVAL / MORTALITY / ARCHIVE MODAL */}
      {isRemoveModalOpen && animal && (
        <DeleteAnimalConfirmModal
          isOpen={isRemoveModalOpen}
          onClose={() => setIsRemoveModalOpen(false)}
          animal={animal}
          isDarkMode={isDarkMode}
          onConfirmArchive={(targetAnimal, data) => {
            onUpdateAnimal({
              ...targetAnimal,
              isArchived: true,
              archiveCategory: data.category,
              archiveReason: data.reason,
              archiveDate: data.date,
              archiveNotes: data.notes,
              mortalityCause: data.mortalityCause
            });
            setIsRemoveModalOpen(false);
            onClose();
          }}
          onConfirmPermanentDelete={(animalId) => {
            if (onDeleteAnimal) {
              onDeleteAnimal(animalId);
            } else {
              onUpdateAnimal({
                ...animal,
                isArchived: true,
                archiveCategory: 'Deleted',
                archiveReason: 'Removed by Admin',
                archiveDate: new Date().toISOString().split('T')[0]
              });
            }
            setIsRemoveModalOpen(false);
            onClose();
          }}
        />
      )}

      {/* EDIT ANIMAL PROFILE MODAL */}
      {isEditingBasicInfo && animal && (
        <EditAnimalModal
          isOpen={isEditingBasicInfo}
          onClose={() => setIsEditingBasicInfo(false)}
          animal={animal}
          onSave={(updated) => {
            onUpdateAnimal(updated);
            setIsEditingBasicInfo(false);
          }}
          enclosures={enclosures}
          existingAnimals={animals}
        />
      )}

      {/* SCHEDULE VET VISIT MODAL (FROM KEEPER OBSERVATION) */}
      {schedVetModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#06180F] border border-slate-200 dark:border-emerald-950 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-950/60">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Schedule Vet Visit for {animal.name || animal.id}</h3>
                  <p className="text-xs text-slate-400">Custom Vet Scheduling based on Keeper Observation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSchedVetModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const newApt: Appointment = {
                  id: `APT-ADM-SCHED-${Date.now()}`,
                  animalId: animal.id,
                  type: schedVetType,
                  veterinarian: schedVetName,
                  requestedBy: staffMembers?.find(s => s.role === 'admin')?.name || 'Facility Administrator',
                  requestedByRole: 'admin',
                  date: schedVetDate,
                  time: schedVetTime,
                  purpose: schedVetReason,
                  status: 'Pending',
                  priority: schedVetPriority,
                  createdOn: todayIso,
                  adminNotes: `Scheduled from Keeper Log by Admin on ${todayIso}`
                };
                if (onAddAppointment) {
                  onAddAppointment(newApt);
                }

                if (onAddTask) {
                  const consultTask: Task = {
                    id: `TASK-OBS-${Date.now()}`,
                    animalId: animal.id,
                    type: 'Health Check',
                    title: `Vet Visit: ${schedVetType} (${animal.name || animal.species})`,
                    time: schedVetTime,
                    date: schedVetDate,
                    details: `Admin scheduled Vet Visit with ${schedVetName}:\nReason: ${schedVetReason}`,
                    frequency: 'Once',
                    status: 'Pending',
                    enclosureId: animal.enclosureId || 'General'
                  };
                  onAddTask(consultTask);
                }

                if (schedVetPriority === 'Emergency' || schedVetPriority === 'High' || animal.healthStatus === 'Unassessed') {
                  onUpdateAnimal({
                    ...animal,
                    healthStatus: schedVetPriority === 'Emergency' ? 'Injured' : 'Under Observation'
                  });
                }

                setSchedVetModalOpen(false);
                setActiveTab('medical');
                setMedActionFeedback(`✓ Vet Visit (${schedVetType}) scheduled for ${schedVetDate} at ${schedVetTime}! Added to Health & Vet schedule.`);
                setTimeout(() => setMedActionFeedback(null), 5000);
              }}
              className="space-y-4 text-xs"
            >
              {/* Type & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Checkup / Visit Type</label>
                  <select
                    value={schedVetType}
                    onChange={(e) => setSchedVetType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#04110A] border border-slate-200 dark:border-emerald-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Medical Examination">Medical Examination</option>
                    <option value="Follow-up Checkup">Follow-up Checkup</option>
                    <option value="Emergency Treatment">Emergency Treatment</option>
                    <option value="Routine Health Check">Routine Health Check</option>
                    <option value="Lab Work & Diagnostics">Lab Work & Diagnostics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Priority Level</label>
                  <select
                    value={schedVetPriority}
                    onChange={(e) => setSchedVetPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#04110A] border border-slate-200 dark:border-emerald-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Normal">Normal Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Emergency">Emergency / Urgent</option>
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={schedVetDate}
                    onChange={(e) => setSchedVetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#04110A] border border-slate-200 dark:border-emerald-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Scheduled Time</label>
                  <input
                    type="text"
                    required
                    value={schedVetTime}
                    onChange={(e) => setSchedVetTime(e.target.value)}
                    placeholder="e.g. 09:00 AM or 02:30 PM"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#04110A] border border-slate-200 dark:border-emerald-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Veterinarian Selection */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Assigned Veterinarian</label>
                <select
                  value={schedVetName}
                  onChange={(e) => setSchedVetName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#04110A] border border-slate-200 dark:border-emerald-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-emerald-500"
                >
                  {registeredVets.length > 0 ? (
                    registeredVets.map(v => (
                      <option key={v.id} value={v.name}>
                        {v.name} ({v.role === 'vet' ? 'Veterinarian' : (v.role || 'Veterinarian')})
                      </option>
                    ))
                  ) : (
                    <option value="Attending Veterinarian">Attending Veterinarian</option>
                  )}
                </select>
              </div>

              {/* Purpose / Notes */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Purpose & Clinical Instructions</label>
                <textarea
                  rows={3}
                  required
                  value={schedVetReason}
                  onChange={(e) => setSchedVetReason(e.target.value)}
                  placeholder="Reason for visit, observation notes, or specific instructions for vet..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#04110A] border border-slate-200 dark:border-emerald-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-emerald-950/60">
                <button
                  type="button"
                  onClick={() => setSchedVetModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Confirm & Schedule Visit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESCHEDULE APPOINTMENT MODAL */}
      {reschedAptModalOpen && selectedAptToResched && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[75] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#06180F] border border-slate-200 dark:border-emerald-950 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-950/60">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Reschedule Appointment</h3>
                  <p className="text-xs text-slate-400">{animal.name || animal.id} • {selectedAptToResched.type}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReschedAptModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const updatedApt: Appointment = {
                  ...selectedAptToResched,
                  date: reschedNewDate,
                  time: reschedNewTime,
                  status: 'Approved',
                  adminNotes: `Rescheduled by Admin to ${reschedNewDate} at ${reschedNewTime}`
                };
                if (onUpdateAppointment) {
                  onUpdateAppointment(updatedApt);
                }
                setReschedAptModalOpen(false);
                setMedActionFeedback(`✓ Appointment rescheduled to ${reschedNewDate} at ${reschedNewTime}.`);
                setTimeout(() => setMedActionFeedback(null), 5000);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-400 font-bold mb-1">Appointment Details</label>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#04110A] border border-slate-200 dark:border-emerald-950 space-y-1">
                  <span className="font-bold text-slate-200 block">{selectedAptToResched.purpose}</span>
                  <span className="text-[11px] text-slate-400 block">Vet: {resolveVeterinarianName(selectedAptToResched.veterinarian, staffMembers)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">New Date</label>
                  <input
                    type="date"
                    required
                    value={reschedNewDate}
                    onChange={(e) => setReschedNewDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#04110A] border border-slate-200 dark:border-emerald-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">New Time</label>
                  <input
                    type="text"
                    required
                    value={reschedNewTime}
                    onChange={(e) => setReschedNewTime(e.target.value)}
                    placeholder="e.g. 10:30 AM"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#04110A] border border-slate-200 dark:border-emerald-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-emerald-950/60">
                <button
                  type="button"
                  onClick={() => setReschedAptModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer shadow-md transition-all active:scale-95"
                >
                  Save Rescheduled Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      <EditTaskModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        task={editingTask}
        onSave={(updatedTask) => {
          onAddTask(updatedTask);
          setEditingTask(null);
          setScheduleActionFeedback('✓ Schedule task updated successfully!');
          setTimeout(() => setScheduleActionFeedback(null), 5000);
        }}
        staffMembers={staffMembers}
        inventory={inventory}
        isDarkMode={isDarkMode}
      />

      {/* CONFIRM APPLY SCHEDULE MODAL */}
      <ConfirmApplyScheduleModal
        isOpen={!!scheduleToConfirm}
        onClose={() => setScheduleToConfirm(null)}
        scheduleData={scheduleToConfirm}
        onConfirm={() => {
          if (scheduleToConfirm) {
            executeApplySchedule(scheduleToConfirm);
            setScheduleToConfirm(null);
          }
        }}
        isDarkMode={isDarkMode}
      />

      {/* DELETE TASK CONFIRMATION MODAL */}
      {deletingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-[#071F11] border-rose-900/60 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center space-x-3 text-rose-500">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center text-xl">
                ⚠️
              </div>
              <h3 className="font-extrabold text-base text-rose-400">
                Delete Schedule Task?
              </h3>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Are you sure you want to delete this feeding or care task for {animal.name || animal.species}? This action will remove the task from keeper active routines.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTaskId(null)}
                className={`px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                  isDarkMode ? 'border-emerald-900/60 text-slate-300 hover:bg-emerald-950/60' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deletingTaskId) onDeleteTask(deletingTaskId);
                  setDeletingTaskId(null);
                  setScheduleActionFeedback('✓ Task deleted successfully.');
                  setTimeout(() => setScheduleActionFeedback(null), 5000);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-md transition-all cursor-pointer"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  </div>
);
}
