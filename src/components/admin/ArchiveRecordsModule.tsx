import React, { useState } from 'react';
import {
  FolderArchive,
  Skull,
  Truck,
  Trash2,
  FileText,
  Search,
  Filter,
  RotateCcw,
  AlertTriangle,
  Calendar,
  Clock,
  Eye,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Info,
  Package,
  MapPin,
  Users,
  Home,
  Shield,
  Stethoscope,
  PawPrint,
  Phone,
  Mail,
  UserCheck,
  ArrowLeft,
  ClipboardList,
  Activity,
  Heart,
  Dna
} from 'lucide-react';
import {
  Animal,
  DeletedInventoryItem,
  DeletedStaffMember,
  DeletedEnclosure,
  DeletedTask,
  DeletedMedicalRecord,
  DeletedBreedingRecord,
  DeletedAppointment,
  getAnimalArchiveCategory
} from '../../types';

interface ArchiveRecordsModuleProps {
  archivedAnimals: Animal[];
  onUpdateAnimal: (animal: Animal) => void;
  onDeleteAnimal?: (id: string) => void;
  onPermanentDeleteAnimal?: (id: string) => void;
  onSelectAnimalForDetail: (animal: Animal) => void;
  isDarkMode?: boolean;
  deletedInventory?: DeletedInventoryItem[];
  onRestoreInventoryItem?: (item: DeletedInventoryItem) => void;
  onPermanentDeleteInventoryItem?: (id: string) => void;
  deletedStaff?: DeletedStaffMember[];
  onRestoreStaff?: (staff: DeletedStaffMember) => void;
  onPermanentDeleteStaff?: (id: string) => void;
  deletedEnclosures?: DeletedEnclosure[];
  onRestoreEnclosure?: (enc: DeletedEnclosure) => void;
  onPermanentDeleteEnclosure?: (id: string) => void;
  deletedTasks?: DeletedTask[];
  onRestoreTask?: (task: DeletedTask) => void;
  onPermanentDeleteTask?: (id: string) => void;
  deletedMedicalRecords?: DeletedMedicalRecord[];
  onRestoreMedicalRecord?: (record: DeletedMedicalRecord) => void;
  onPermanentDeleteMedicalRecord?: (id: string) => void;
  deletedBreedingRecords?: DeletedBreedingRecord[];
  onRestoreBreedingRecord?: (record: DeletedBreedingRecord) => void;
  onPermanentDeleteBreedingRecord?: (id: string) => void;
  deletedAppointments?: DeletedAppointment[];
  onRestoreAppointment?: (appointment: DeletedAppointment) => void;
  onPermanentDeleteAppointment?: (id: string) => void;
  onClearAllArchives?: () => void;
  onBackToDashboard?: () => void;
  onBack?: () => void;
}

export const ArchiveRecordsModule: React.FC<ArchiveRecordsModuleProps> = ({
  archivedAnimals,
  onUpdateAnimal,
  onDeleteAnimal,
  onPermanentDeleteAnimal,
  onSelectAnimalForDetail,
  isDarkMode = true,
  deletedInventory = [],
  onRestoreInventoryItem,
  onPermanentDeleteInventoryItem,
  deletedStaff = [],
  onRestoreStaff,
  onPermanentDeleteStaff,
  deletedEnclosures = [],
  onRestoreEnclosure,
  onPermanentDeleteEnclosure,
  deletedTasks = [],
  onRestoreTask,
  onPermanentDeleteTask,
  deletedMedicalRecords = [],
  onRestoreMedicalRecord,
  onPermanentDeleteMedicalRecord,
  deletedBreedingRecords = [],
  onRestoreBreedingRecord,
  onPermanentDeleteBreedingRecord,
  deletedAppointments = [],
  onRestoreAppointment,
  onPermanentDeleteAppointment,
  onClearAllArchives,
  onBackToDashboard,
  onBack
}) => {
  const handleBack = onBack || onBackToDashboard;
  const [activeTab, setActiveTab] = useState<'all' | 'mortality' | 'transferred' | 'deleted' | 'others'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('All');
  const [deletionTypeFilter, setDeletionTypeFilter] = useState<'all' | 'animals' | 'staff' | 'enclosures' | 'inventory' | 'tasks' | 'medical' | 'breeding' | 'appointments'>('all');

  const handleSmartBack = () => {
    if (deletionTypeFilter !== 'all') {
      setDeletionTypeFilter('all');
    } else if (activeTab !== 'all') {
      setActiveTab('all');
    } else if (handleBack) {
      handleBack();
    }
  };
  const [animalToPermanentDelete, setAnimalToPermanentDelete] = useState<Animal | null>(null);
  const [inventoryToPermanentDelete, setInventoryToPermanentDelete] = useState<DeletedInventoryItem | null>(null);
  const [staffToPermanentDelete, setStaffToPermanentDelete] = useState<DeletedStaffMember | null>(null);
  const [enclosureToPermanentDelete, setEnclosureToPermanentDelete] = useState<DeletedEnclosure | null>(null);
  const [taskToPermanentDelete, setTaskToPermanentDelete] = useState<DeletedTask | null>(null);
  const [medicalToPermanentDelete, setMedicalToPermanentDelete] = useState<DeletedMedicalRecord | null>(null);
  const [breedingToPermanentDelete, setBreedingToPermanentDelete] = useState<DeletedBreedingRecord | null>(null);
  const [appointmentToPermanentDelete, setAppointmentToPermanentDelete] = useState<DeletedAppointment | null>(null);

  // Grouped counts
  const mortalityAnimals = archivedAnimals.filter(a => getAnimalArchiveCategory(a) === 'Mortality');
  const transferredAnimals = archivedAnimals.filter(a => getAnimalArchiveCategory(a) === 'Transferred');
  const deletedAnimals = archivedAnimals.filter(a => getAnimalArchiveCategory(a) === 'Deleted');
  const othersAnimals = archivedAnimals.filter(a => getAnimalArchiveCategory(a) === 'Others');

  // Species list from archived
  const uniqueArchivedSpecies = ['All', ...Array.from(new Set(archivedAnimals.map(a => a.species).filter(Boolean)))];

  // Helper for lifespan
  const formatLifespan = (dob?: string, archiveDate?: string) => {
    if (!dob) return 'Unknown age';
    const birth = new Date(dob);
    const end = archiveDate ? new Date(archiveDate) : new Date();
    if (isNaN(birth.getTime()) || isNaN(end.getTime())) return 'Unknown age';
    const diffMonths = (end.getFullYear() - birth.getFullYear()) * 12 + (end.getMonth() - birth.getMonth());
    if (diffMonths < 1) return '< 1 month';
    if (diffMonths < 12) return `${diffMonths} mo${diffMonths > 1 ? 's' : ''}`;
    const yrs = Math.floor(diffMonths / 12);
    const mos = diffMonths % 12;
    return mos > 0 ? `${yrs} yr${yrs > 1 ? 's' : ''}, ${mos} mo` : `${yrs} yr${yrs > 1 ? 's' : ''}`;
  };

  // Filter animals based on active category tab, search query, and species
  const displayedAnimals = archivedAnimals.filter(animal => {
    const cat = getAnimalArchiveCategory(animal);

    if (activeTab === 'mortality' && cat !== 'Mortality') return false;
    if (activeTab === 'transferred' && cat !== 'Transferred') return false;
    if (activeTab === 'deleted' && cat !== 'Deleted') return false;
    if (activeTab === 'others' && cat !== 'Others') return false;

    if (speciesFilter !== 'All' && animal.species !== speciesFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (animal.name || '').toLowerCase().includes(q);
      const matchId = animal.id.toLowerCase().includes(q);
      const matchSpecies = animal.species.toLowerCase().includes(q);
      const matchReason = (animal.archiveReason || '').toLowerCase().includes(q);
      const matchNotes = (animal.archiveNotes || '').toLowerCase().includes(q);
      const matchCause = (animal.mortalityCause || '').toLowerCase().includes(q);
      return matchName || matchId || matchSpecies || matchReason || matchNotes || matchCause;
    }

    return true;
  });

  // Filter deleted inventory items for Admin Deletions & All Archives
  const displayedDeletedInventory = deletedInventory.filter(item => {
    if (activeTab !== 'all' && activeTab !== 'deleted') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (item.name || '').toLowerCase().includes(q);
      const matchId = (item.id || '').toLowerCase().includes(q);
      const matchCat = (item.category || '').toLowerCase().includes(q);
      const matchReason = (item.deletionReason || '').toLowerCase().includes(q);
      const matchSupplier = (item.supplier || '').toLowerCase().includes(q);
      const matchLoc = (item.location || '').toLowerCase().includes(q);
      return matchName || matchId || matchCat || matchReason || matchSupplier || matchLoc;
    }

    return true;
  });

  // Filter deleted staff members for Admin Deletions & All Archives
  const displayedDeletedStaff = deletedStaff.filter(item => {
    if (activeTab !== 'all' && activeTab !== 'deleted') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (item.name || '').toLowerCase().includes(q);
      const matchId = (item.id || '').toLowerCase().includes(q);
      const matchEmail = (item.email || '').toLowerCase().includes(q);
      const matchPhone = (item.phone || '').toLowerCase().includes(q);
      const matchRole = (item.role || '').toLowerCase().includes(q);
      const matchReason = (item.deletionReason || '').toLowerCase().includes(q);
      const matchDuty = (item.dutyLoad || '').toLowerCase().includes(q);
      return matchName || matchId || matchEmail || matchPhone || matchRole || matchReason || matchDuty;
    }

    return true;
  });

  // Filter deleted enclosures for Admin Deletions & All Archives
  const displayedDeletedEnclosures = deletedEnclosures.filter(item => {
    if (activeTab !== 'all' && activeTab !== 'deleted') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (item.name || '').toLowerCase().includes(q);
      const matchId = (item.id || '').toLowerCase().includes(q);
      const matchFacility = (item.facility || '').toLowerCase().includes(q);
      const matchType = (item.type || '').toLowerCase().includes(q);
      const matchCondition = (item.condition || '').toLowerCase().includes(q);
      const matchReason = (item.deletionReason || '').toLowerCase().includes(q);
      return matchName || matchId || matchFacility || matchType || matchCondition || matchReason;
    }

    return true;
  });

  // Filter deleted tasks for Admin Deletions & All Archives
  const displayedDeletedTasks = deletedTasks.filter(item => {
    if (activeTab !== 'all' && activeTab !== 'deleted') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchId = (item.id || '').toLowerCase().includes(q);
      const matchAnimal = (item.animalId || '').toLowerCase().includes(q);
      const matchDetails = (item.details || '').toLowerCase().includes(q);
      const matchReason = (item.deletionReason || '').toLowerCase().includes(q);
      const matchType = (item.type || '').toLowerCase().includes(q);
      return matchTitle || matchId || matchAnimal || matchDetails || matchReason || matchType;
    }

    return true;
  });

  // Filter deleted medical records for Admin Deletions & All Archives
  const displayedDeletedMedicalRecords = deletedMedicalRecords.filter(item => {
    if (activeTab !== 'all' && activeTab !== 'deleted') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDiag = (item.diagnosis || '').toLowerCase().includes(q);
      const matchId = (item.id || '').toLowerCase().includes(q);
      const matchAnimal = (item.animalId || '').toLowerCase().includes(q);
      const matchVet = (item.veterinarian || '').toLowerCase().includes(q);
      const matchTreat = (item.treatment || '').toLowerCase().includes(q);
      const matchNotes = (item.notes || '').toLowerCase().includes(q);
      const matchReason = (item.deletionReason || '').toLowerCase().includes(q);
      return matchDiag || matchId || matchAnimal || matchVet || matchTreat || matchNotes || matchReason;
    }

    return true;
  });

  // Filter deleted breeding records for Admin Deletions & All Archives
  const displayedDeletedBreedingRecords = deletedBreedingRecords.filter(item => {
    if (activeTab !== 'all' && activeTab !== 'deleted') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = (item.id || '').toLowerCase().includes(q);
      const matchSp = (item.species || '').toLowerCase().includes(q);
      const matchFem = (item.femaleName || item.femaleId || '').toLowerCase().includes(q);
      const matchMal = (item.maleName || item.maleId || '').toLowerCase().includes(q);
      const matchNotes = (item.notes || '').toLowerCase().includes(q);
      const matchReason = (item.deletionReason || '').toLowerCase().includes(q);
      return matchId || matchSp || matchFem || matchMal || matchNotes || matchReason;
    }

    return true;
  });

  // Filter deleted appointments for Admin Deletions & All Archives
  const displayedDeletedAppointments = deletedAppointments.filter(item => {
    if (activeTab !== 'all' && activeTab !== 'deleted') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPurpose = (item.purpose || item.type || '').toLowerCase().includes(q);
      const matchId = (item.id || '').toLowerCase().includes(q);
      const matchAnimal = (item.animalId || '').toLowerCase().includes(q);
      const matchBy = (item.requestedBy || item.veterinarian || '').toLowerCase().includes(q);
      const matchNotes = (item.adminNotes || '').toLowerCase().includes(q);
      const matchReason = (item.deletionReason || '').toLowerCase().includes(q);
      return matchPurpose || matchId || matchAnimal || matchBy || matchNotes || matchReason;
    }

    return true;
  });

  const handleRestoreAnimal = (animal: Animal) => {
    const nameOrId = animal.name ? `${animal.name} (${animal.id})` : animal.id;
    if (confirm(`Restore "${nameOrId}" back to the active facility registry?`)) {
      onUpdateAnimal({
        ...animal,
        isArchived: false,
        archiveReason: undefined,
        archiveDate: undefined,
        archiveCategory: undefined,
        archiveNotes: undefined,
        mortalityCause: undefined
      });
    }
  };

  const handleConfirmPermanentDelete = () => {
    if (!animalToPermanentDelete) return;
    if (onPermanentDeleteAnimal) {
      onPermanentDeleteAnimal(animalToPermanentDelete.id);
    } else if (onDeleteAnimal) {
      onDeleteAnimal(animalToPermanentDelete.id);
    }
    setAnimalToPermanentDelete(null);
  };

  const handleRestoreInventory = (item: DeletedInventoryItem) => {
    const nameOrId = item.name ? `${item.name} (${item.id})` : item.id;
    if (confirm(`Restore inventory item "${nameOrId}" back to active inventory?`)) {
      onRestoreInventoryItem?.(item);
    }
  };

  const handleConfirmPermanentDeleteInventory = () => {
    if (!inventoryToPermanentDelete) return;
    if (onPermanentDeleteInventoryItem) {
      onPermanentDeleteInventoryItem(inventoryToPermanentDelete.id);
    }
    setInventoryToPermanentDelete(null);
  };

  const handleRestoreStaff = (staff: DeletedStaffMember) => {
    if (confirm(`Restore staff account "${staff.name} (${staff.role.toUpperCase()})" back to active facility roster?`)) {
      onRestoreStaff?.(staff);
    }
  };

  const handleConfirmPermanentDeleteStaff = () => {
    if (!staffToPermanentDelete) return;
    if (onPermanentDeleteStaff) {
      onPermanentDeleteStaff(staffToPermanentDelete.id);
    }
    setStaffToPermanentDelete(null);
  };

  const handleRestoreEnclosure = (enc: DeletedEnclosure) => {
    if (confirm(`Restore habitat "${enc.name} (${enc.facility})" back to active enclosures registry?`)) {
      onRestoreEnclosure?.(enc);
    }
  };

  const handleConfirmPermanentDeleteEnclosure = () => {
    if (!enclosureToPermanentDelete) return;
    if (onPermanentDeleteEnclosure) {
      onPermanentDeleteEnclosure(enclosureToPermanentDelete.id);
    }
    setEnclosureToPermanentDelete(null);
  };

  const handleRestoreTask = (task: DeletedTask) => {
    if (confirm(`Restore care task "${task.title} (${task.id})" back to active tasks?`)) {
      onRestoreTask?.(task);
    }
  };

  const handleConfirmPermanentDeleteTask = () => {
    if (!taskToPermanentDelete) return;
    onPermanentDeleteTask?.(taskToPermanentDelete.id);
    setTaskToPermanentDelete(null);
  };

  const handleRestoreMedicalRecord = (record: DeletedMedicalRecord) => {
    if (confirm(`Restore medical record "${record.diagnosis || record.recordType} (${record.id})" back to active clinical history?`)) {
      onRestoreMedicalRecord?.(record);
    }
  };

  const handleConfirmPermanentDeleteMedical = () => {
    if (!medicalToPermanentDelete) return;
    onPermanentDeleteMedicalRecord?.(medicalToPermanentDelete.id);
    setMedicalToPermanentDelete(null);
  };

  const handleRestoreBreedingRecord = (record: DeletedBreedingRecord) => {
    if (confirm(`Restore breeding pair/record "${record.id} (${record.species})" back to active breeding records?`)) {
      onRestoreBreedingRecord?.(record);
    }
  };

  const handleConfirmPermanentDeleteBreeding = () => {
    if (!breedingToPermanentDelete) return;
    onPermanentDeleteBreedingRecord?.(breedingToPermanentDelete.id);
    setBreedingToPermanentDelete(null);
  };

  const handleRestoreAppointment = (appointment: DeletedAppointment) => {
    if (confirm(`Restore appointment "${appointment.purpose || appointment.type} (${appointment.id})" back to active veterinary schedule?`)) {
      onRestoreAppointment?.(appointment);
    }
  };

  const handleConfirmPermanentDeleteAppointment = () => {
    if (!appointmentToPermanentDelete) return;
    onPermanentDeleteAppointment?.(appointmentToPermanentDelete.id);
    setAppointmentToPermanentDelete(null);
  };

  const totalArchivedCount = 
    archivedAnimals.length + 
    deletedInventory.length + 
    deletedStaff.length + 
    deletedEnclosures.length +
    deletedTasks.length +
    deletedMedicalRecords.length +
    deletedBreedingRecords.length +
    deletedAppointments.length;

  const totalDeletedCount = 
    deletedAnimals.length + 
    othersAnimals.length + 
    deletedInventory.length + 
    deletedStaff.length + 
    deletedEnclosures.length +
    deletedTasks.length +
    deletedMedicalRecords.length +
    deletedBreedingRecords.length +
    deletedAppointments.length;

  const isTabContentEmpty = (() => {
    if (activeTab === 'mortality') return displayedAnimals.length === 0;
    if (activeTab === 'transferred') return displayedAnimals.length === 0;
    if (activeTab === 'others') return displayedAnimals.length === 0;
    if (activeTab === 'deleted') {
      if (deletionTypeFilter === 'all') {
        return (
          displayedAnimals.length === 0 &&
          displayedDeletedInventory.length === 0 &&
          displayedDeletedStaff.length === 0 &&
          displayedDeletedEnclosures.length === 0 &&
          displayedDeletedTasks.length === 0 &&
          displayedDeletedMedicalRecords.length === 0 &&
          displayedDeletedBreedingRecords.length === 0 &&
          displayedDeletedAppointments.length === 0
        );
      }
      if (deletionTypeFilter === 'animals') return displayedAnimals.length === 0;
      if (deletionTypeFilter === 'staff') return displayedDeletedStaff.length === 0;
      if (deletionTypeFilter === 'enclosures') return displayedDeletedEnclosures.length === 0;
      if (deletionTypeFilter === 'inventory') return displayedDeletedInventory.length === 0;
      if (deletionTypeFilter === 'tasks') return displayedDeletedTasks.length === 0;
      if (deletionTypeFilter === 'medical') return displayedDeletedMedicalRecords.length === 0;
      if (deletionTypeFilter === 'breeding') return displayedDeletedBreedingRecords.length === 0;
      if (deletionTypeFilter === 'appointments') return displayedDeletedAppointments.length === 0;
      return false;
    }
    // activeTab === 'all'
    return (
      displayedAnimals.length === 0 &&
      displayedDeletedInventory.length === 0 &&
      displayedDeletedStaff.length === 0 &&
      displayedDeletedEnclosures.length === 0 &&
      displayedDeletedTasks.length === 0 &&
      displayedDeletedMedicalRecords.length === 0 &&
      displayedDeletedBreedingRecords.length === 0 &&
      displayedDeletedAppointments.length === 0
    );
  })();

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          {(handleBack || activeTab !== 'all' || deletionTypeFilter !== 'all') && (
            <button
              type="button"
              onClick={handleSmartBack}
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
            <h1 className="text-2xl font-black flex items-center space-x-2.5 text-slate-900 dark:text-white">
              <span className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <FolderArchive className="w-6 h-6" />
              </span>
              <span>Archived Wildlife & Facility Records</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Official de-accessioned records repository. Segregated into <strong>Mortality</strong>, <strong>Transferred/Sold</strong>, and <strong>Administrative Deletions</strong> (specimens, users/staff, habitats, and supplies).
            </p>
          </div>
        </div>

        {totalArchivedCount > 0 && onClearAllArchives && (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Permanently purge all ${totalArchivedCount} archived & deleted records? This action cannot be undone.`)) {
                onClearAllArchives();
              }
            }}
            className="px-3.5 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 self-start sm:self-center"
            title="Permanently Delete All Archived Records"
          >
            <Trash2 className="w-4 h-4" />
            <span>Empty Archive ({totalArchivedCount})</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Archived */}
        <div
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'ring-2 ring-emerald-500 shadow-md'
              : 'hover:border-slate-300 dark:hover:border-emerald-800'
          } ${isDarkMode ? 'bg-[#071F11] border-emerald-950/80' : 'bg-white border-slate-200'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">All Archives</span>
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <FolderArchive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {totalArchivedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total archived records</p>
        </div>

        {/* Mortality Records */}
        <div
          onClick={() => setActiveTab('mortality')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'mortality'
              ? 'ring-2 ring-rose-500 shadow-md'
              : 'hover:border-slate-300 dark:hover:border-rose-900/60'
          } ${isDarkMode ? 'bg-[#071F11] border-emerald-950/80' : 'bg-white border-slate-200'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Mortality Records</span>
            <div className="p-1.5 rounded-xl bg-rose-500/15 text-rose-500">
              <Skull className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-500">
            {mortalityAnimals.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Deceased / Clinical losses</p>
        </div>

        {/* Transferred / Sold */}
        <div
          onClick={() => setActiveTab('transferred')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'transferred'
              ? 'ring-2 ring-sky-500 shadow-md'
              : 'hover:border-slate-300 dark:hover:border-sky-900/60'
          } ${isDarkMode ? 'bg-[#071F11] border-emerald-950/80' : 'bg-white border-slate-200'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sky-500 uppercase tracking-wider">Transferred / Sold</span>
            <div className="p-1.5 rounded-xl bg-sky-500/15 text-sky-500">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-500">
            {transferredAnimals.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Rehomed / Relocated</p>
        </div>

        {/* Admin Deletions & Others */}
        <div
          onClick={() => setActiveTab('deleted')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'deleted'
              ? 'ring-2 ring-amber-500 shadow-md'
              : 'hover:border-slate-300 dark:hover:border-amber-900/60'
          } ${isDarkMode ? 'bg-[#071F11] border-emerald-950/80' : 'bg-white border-slate-200'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Admin Deletions</span>
            <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-500">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-500">
            {totalDeletedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {deletedAnimals.length + othersAnimals.length} specimens • {deletedStaff.length} staff • {deletedEnclosures.length} habitats • {deletedInventory.length} supplies • {deletedTasks.length} tasks • {deletedMedicalRecords.length} medical • {deletedBreedingRecords.length} breeding • {deletedAppointments.length} appointments
          </p>
        </div>
      </div>

      {/* Categorized Tab Navigation */}
      <div className={`p-1.5 rounded-2xl border flex flex-wrap gap-1.5 ${
        isDarkMode ? 'bg-[#04110A] border-emerald-950/80' : 'bg-slate-100 border-slate-200'
      }`}>
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'all'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderArchive className="w-3.5 h-3.5" />
          <span>All Archives</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white">
            {totalArchivedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mortality')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'mortality'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-rose-400'
          }`}
        >
          <Skull className="w-3.5 h-3.5" />
          <span>💀 Mortality Records</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white">
            {mortalityAnimals.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transferred')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'transferred'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-sky-400'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>🚚 Transferred & Sold</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white">
            {transferredAnimals.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('deleted')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'deleted'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-amber-400'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>🗑️ Administrative Deletions</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white">
            {totalDeletedCount}
          </span>
        </button>

        {othersAnimals.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('others')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'others'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>📋 Others</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white">
              {othersAnimals.length}
            </span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search archives (ID, Name, Reason)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium border outline-none ${
              isDarkMode
                ? 'bg-[#071F11] border-emerald-950/80 text-white placeholder-slate-500 focus:border-emerald-500'
                : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-600'
            }`}
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={speciesFilter}
            onChange={e => setSpeciesFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none ${
              isDarkMode
                ? 'bg-[#071F11] border-emerald-950/80 text-slate-200'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {uniqueArchivedSpecies.map(sp => (
              <option key={sp} value={sp}>
                {sp === 'All' ? 'All Species' : sp}
              </option>
            ))}
          </select>

          {(searchQuery || speciesFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSpeciesFilter('All');
              }}
              className="text-xs text-emerald-500 font-bold hover:underline px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      {isTabContentEmpty ? (
        <div
          className={`p-16 rounded-3xl border text-center space-y-4 transition-colors ${
            isDarkMode ? 'bg-[#071F11] border-emerald-950/60' : 'bg-white border-slate-100'
          }`}
        >
          <div className="w-16 h-16 bg-slate-50 dark:bg-emerald-950/20 rounded-full flex items-center justify-center text-slate-400 dark:text-emerald-500 mx-auto border border-slate-100 dark:border-emerald-900/30 text-2xl">
            {activeTab === 'mortality' ? '🕊️' : activeTab === 'transferred' ? '🚚' : activeTab === 'deleted' ? '🗑️' : '📦'}
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            {activeTab === 'mortality'
              ? 'No Mortality Records'
              : activeTab === 'transferred'
              ? 'No Transferred Records'
              : activeTab === 'deleted'
              ? (deletionTypeFilter === 'all' ? 'No Administrative Deletions' : `No Deleted ${deletionTypeFilter.charAt(0).toUpperCase() + deletionTypeFilter.slice(1)} Records`)
              : 'No archived records found.'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery || speciesFilter !== 'All'
              ? 'Try modifying your search query or filter.'
              : 'All active specimens, habitats, staff, tasks, and inventory supplies currently reside in active facility registries.'}
          </p>

          {(deletionTypeFilter !== 'all' || activeTab !== 'all' || searchQuery || speciesFilter !== 'All') && (
            <div className="pt-3">
              <button
                type="button"
                onClick={handleSmartBack}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl inline-flex items-center space-x-2 transition-all cursor-pointer shadow-md active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>
                  {deletionTypeFilter !== 'all'
                    ? 'Back to All Administrative Deletions'
                    : activeTab !== 'all'
                    ? 'Back to All Archives'
                    : 'Reset Filters'}
                </span>
              </button>
            </div>
          )}
        </div>
      ) : activeTab === 'mortality' ? (
        /* ================= DEDICATED MORTALITY SECTION ================= */
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-300 font-semibold">
              <Skull className="w-4 h-4 text-rose-500 shrink-0" />
              <span>
                <strong>Mortality & Necropsy Archive:</strong> Registry of deceased specimens, including verified causes of death, lifespan, and post-mortem observations.
              </span>
            </div>
            <span className="font-bold text-rose-500">
              {displayedAnimals.length} Record{displayedAnimals.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedAnimals.map(animal => (
              <div
                key={animal.id}
                className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                  isDarkMode
                    ? 'bg-[#071F11] border-rose-950/80 hover:border-rose-800/80'
                    : 'bg-white border-rose-100 hover:border-rose-200 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      {animal.image || animal.photoUrl ? (
                        <img
                          src={animal.image || animal.photoUrl}
                          alt={animal.name || animal.species}
                          className="w-14 h-14 rounded-2xl object-cover border border-rose-500/20 grayscale-30"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-lg border border-rose-500/20">
                          💀
                        </div>
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-black text-sm text-slate-900 dark:text-white">
                            {animal.name || animal.species}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/25">
                            {animal.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {animal.species} {animal.morph ? `• ${animal.morph}` : ''} • {animal.sex}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-500 border border-rose-500/30">
                      Deceased
                    </span>
                  </div>

                  {/* Mortality Details Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div className={`p-2.5 rounded-xl border ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[10px] text-slate-400 block font-medium">Date of Mortality:</span>
                      <strong className="text-rose-500 dark:text-rose-400 font-bold block mt-0.5">
                        {animal.archiveDate || 'N/A'}
                      </strong>
                    </div>

                    <div className={`p-2.5 rounded-xl border ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[10px] text-slate-400 block font-medium">Age at Passing:</span>
                      <strong className="text-slate-700 dark:text-slate-200 font-bold block mt-0.5">
                        {formatLifespan(animal.dob, animal.archiveDate)}
                      </strong>
                    </div>
                  </div>

                  {/* Cause of death & notes */}
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex items-start space-x-1.5">
                      <span className="font-bold text-slate-400 shrink-0">Cause of Loss:</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-300">
                        {animal.mortalityCause || animal.archiveReason || 'Clinical Loss'}
                      </span>
                    </div>

                    {(animal.archiveNotes || animal.notes) && (
                      <div className={`p-2.5 rounded-xl text-[11px] leading-relaxed border ${
                        isDarkMode ? 'bg-[#04110A] border-rose-950/60 text-slate-300' : 'bg-rose-50/50 border-rose-100 text-slate-700'
                      }`}>
                        <span className="font-bold text-slate-400 block mb-0.5">Necropsy / Remarks:</span>
                        {animal.archiveNotes || animal.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-emerald-950/80">
                  <button
                    type="button"
                    onClick={() => onSelectAnimalForDetail(animal)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Lifetime History</span>
                  </button>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleRestoreAnimal(animal)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 transition-all cursor-pointer"
                      title="Restore back to active list"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAnimalToPermanentDelete(animal)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Permanently Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'transferred' ? (
        /* ================= DEDICATED TRANSFERRED SECTION ================= */
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-sky-700 dark:text-sky-300 font-semibold">
              <Truck className="w-4 h-4 text-sky-500 shrink-0" />
              <span>
                <strong>Transferred & Sold Registry:</strong> Log of specimens sold to breeders/customers, rehomed to partner sanctuaries, or released for conservation.
              </span>
            </div>
            <span className="font-bold text-sky-500">
              {displayedAnimals.length} Record{displayedAnimals.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedAnimals.map(animal => (
              <div
                key={animal.id}
                className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                  isDarkMode
                    ? 'bg-[#071F11] border-sky-950/80 hover:border-sky-800/80'
                    : 'bg-white border-sky-100 hover:border-sky-200 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      {animal.image || animal.photoUrl ? (
                        <img
                          src={animal.image || animal.photoUrl}
                          alt={animal.name || animal.species}
                          className="w-14 h-14 rounded-2xl object-cover border border-sky-500/20"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold text-lg border border-sky-500/20">
                          🚚
                        </div>
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-black text-sm text-slate-900 dark:text-white">
                            {animal.name || animal.species}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/25">
                            {animal.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {animal.species} {animal.morph ? `• ${animal.morph}` : ''} • {animal.sex}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-sky-500/20 text-sky-500 border border-sky-500/30">
                      Transferred
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div className={`p-2.5 rounded-xl border ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[10px] text-slate-400 block font-medium">Date of Transfer:</span>
                      <strong className="text-sky-500 dark:text-sky-400 font-bold block mt-0.5">
                        {animal.archiveDate || 'N/A'}
                      </strong>
                    </div>

                    <div className={`p-2.5 rounded-xl border ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[10px] text-slate-400 block font-medium">Origin Enclosure:</span>
                      <strong className="text-slate-700 dark:text-slate-200 font-bold block mt-0.5">
                        {animal.enclosureId || 'None assigned'}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex items-start space-x-1.5">
                      <span className="font-bold text-slate-400 shrink-0">Reason / Recipient:</span>
                      <span className="font-semibold text-sky-600 dark:text-sky-300">
                        {animal.archiveReason || 'Transferred out'}
                      </span>
                    </div>

                    {animal.archiveNotes && (
                      <div className={`p-2.5 rounded-xl text-[11px] leading-relaxed border ${
                        isDarkMode ? 'bg-[#04110A] border-sky-950/60 text-slate-300' : 'bg-sky-50/50 border-sky-100 text-slate-700'
                      }`}>
                        <span className="font-bold text-slate-400 block mb-0.5">Permit / Transfer Notes:</span>
                        {animal.archiveNotes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-emerald-950/80">
                  <button
                    type="button"
                    onClick={() => onSelectAnimalForDetail(animal)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Record</span>
                  </button>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleRestoreAnimal(animal)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAnimalToPermanentDelete(animal)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Permanently Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'deleted' ? (
        /* ================= DEDICATED ADMIN DELETIONS SECTION ================= */
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-300 font-semibold">
              <Trash2 className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Administrative Deletions Repository:</strong> Comprehensive audit space for all deleted wildlife specimens, staff accounts, habitats, supplies, care tasks, clinical medical records, breeding pairs, and vet appointments.
              </span>
            </div>
            <span className="font-bold text-amber-500 shrink-0">
              {displayedAnimals.length + displayedDeletedInventory.length + displayedDeletedStaff.length + displayedDeletedEnclosures.length + displayedDeletedTasks.length + displayedDeletedMedicalRecords.length + displayedDeletedBreedingRecords.length + displayedDeletedAppointments.length} Total Deleted Records
            </span>
          </div>

          {/* Sub-filtering tabs for Deletions: All / Wildlife / Staff / Habitats / Inventory / Tasks / Medical / Breeding / Appointments */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDeletionTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                deletionTypeFilter === 'all'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-[#071F11] border border-emerald-950/80 text-slate-400 hover:text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All Deletions</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white">
                {displayedAnimals.length + displayedDeletedInventory.length + displayedDeletedStaff.length + displayedDeletedEnclosures.length + displayedDeletedTasks.length + displayedDeletedMedicalRecords.length + displayedDeletedBreedingRecords.length + displayedDeletedAppointments.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDeletionTypeFilter('animals')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                deletionTypeFilter === 'animals'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-[#071F11] border border-emerald-950/80 text-slate-400 hover:text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🐾 Wildlife Specimens</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white">
                {displayedAnimals.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDeletionTypeFilter('staff')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                deletionTypeFilter === 'staff'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-[#071F11] border border-emerald-950/80 text-slate-400 hover:text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>👥 Staff & Users</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white">
                {displayedDeletedStaff.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDeletionTypeFilter('enclosures')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                deletionTypeFilter === 'enclosures'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-[#071F11] border border-emerald-950/80 text-slate-400 hover:text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>🏡 Habitats & Enclosures</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white">
                {displayedDeletedEnclosures.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDeletionTypeFilter('inventory')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                deletionTypeFilter === 'inventory'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-[#071F11] border border-emerald-950/80 text-slate-400 hover:text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Inventory Supplies</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white">
                {displayedDeletedInventory.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDeletionTypeFilter('tasks')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                deletionTypeFilter === 'tasks'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-[#071F11] border border-emerald-950/80 text-slate-400 hover:text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Care Tasks</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white">
                {displayedDeletedTasks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDeletionTypeFilter('medical')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                deletionTypeFilter === 'medical'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-[#071F11] border border-emerald-950/80 text-slate-400 hover:text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Medical Records</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white">
                {displayedDeletedMedicalRecords.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDeletionTypeFilter('breeding')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                deletionTypeFilter === 'breeding'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-[#071F11] border border-emerald-950/80 text-slate-400 hover:text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Dna className="w-3.5 h-3.5" />
              <span>Breeding Records</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white">
                {displayedDeletedBreedingRecords.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDeletionTypeFilter('appointments')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                deletionTypeFilter === 'appointments'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-[#071F11] border border-emerald-950/80 text-slate-400 hover:text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Vet Appointments</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white">
                {displayedDeletedAppointments.length}
              </span>
            </button>
          </div>

          {/* 1. DELETED STAFF & USERS SECTION */}
          {(deletionTypeFilter === 'all' || deletionTypeFilter === 'staff') && displayedDeletedStaff.length > 0 && (
            <div className="space-y-3 pt-1">
              {deletionTypeFilter === 'all' && (
                <div className="flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider text-amber-500">
                  <Users className="w-3.5 h-3.5" />
                  <span>Deleted Staff & User Accounts ({displayedDeletedStaff.length})</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedDeletedStaff.map(member => {
                  const roleLabel = member.role === 'admin' ? 'Administrator' : member.role === 'vet' ? 'Veterinarian' : 'Keeper';
                  const roleBadgeColor = member.role === 'admin'
                    ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                    : member.role === 'vet'
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                  const roleIcon = member.role === 'admin'
                    ? <Shield className="w-3 h-3 mr-1" />
                    : member.role === 'vet'
                    ? <Stethoscope className="w-3 h-3 mr-1" />
                    : <PawPrint className="w-3 h-3 mr-1" />;

                  return (
                    <div
                      key={member.id}
                      className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                        isDarkMode
                          ? 'bg-[#071F11] border-amber-950/80 hover:border-amber-800/80'
                          : 'bg-white border-amber-100 hover:border-amber-200 shadow-xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-base border border-amber-500/20 shrink-0">
                              {member.initials || member.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                                  {member.name}
                                </h4>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/25">
                                  {member.id}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5 flex items-center space-x-1.5">
                                <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleBadgeColor}`}>
                                  {roleIcon}
                                  {roleLabel}
                                </span>
                                {member.dutyLoad && (
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    • {member.dutyLoad}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30 shrink-0">
                            Archived Staff
                          </span>
                        </div>

                        <div className="mt-3 space-y-1.5 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/15 text-[11px]">
                            <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 truncate">
                              <Mail className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="truncate">{member.email || 'No email on record'}</span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 truncate">
                              <Phone className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="truncate">{member.phone || 'No contact number'}</span>
                            </div>
                          </div>

                          {member.previousAssignedAnimalsCount !== undefined && member.previousAssignedAnimalsCount > 0 && (
                            <div className="p-2 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/15">
                              <span className="font-bold text-slate-400 block mb-1">
                                Assigned Wildlife at Deletion ({member.previousAssignedAnimalsCount}):
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {member.previousAssignedAnimalNames?.map((aName, idx) => (
                                  <span key={idx} className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/20">
                                    {aName}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex items-start space-x-1.5">
                            <span className="font-bold text-slate-400 shrink-0">Reason:</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-300">
                              {member.deletionReason || 'Removed from active facility roster'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <div>
                              <span className="font-bold">Deleted At: </span>
                              <span className="font-mono text-slate-600 dark:text-slate-300">
                                {member.deletedAt ? new Date(member.deletedAt).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'N/A'}
                              </span>
                            </div>
                            {member.deletedBy && (
                              <div>
                                <span className="font-bold">By: </span>
                                <span className="text-slate-600 dark:text-slate-300">{member.deletedBy}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-emerald-950/80">
                        <button
                          type="button"
                          onClick={() => handleRestoreStaff(member)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore Staff Account</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setStaffToPermanentDelete(member)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Permanently</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. DELETED HABITATS & ENCLOSURES SECTION */}
          {(deletionTypeFilter === 'all' || deletionTypeFilter === 'enclosures') && displayedDeletedEnclosures.length > 0 && (
            <div className="space-y-3 pt-1">
              {deletionTypeFilter === 'all' && (
                <div className="flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider text-amber-500">
                  <Home className="w-3.5 h-3.5" />
                  <span>Deleted Habitats & Enclosures ({displayedDeletedEnclosures.length})</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedDeletedEnclosures.map(enc => (
                  <div
                    key={enc.id}
                    className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                      isDarkMode
                        ? 'bg-[#071F11] border-amber-950/80 hover:border-amber-800/80'
                        : 'bg-white border-amber-100 hover:border-amber-200 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-base border border-amber-500/20 shrink-0">
                            <Home className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-black text-sm text-slate-900 dark:text-white">
                                {enc.name}
                              </h4>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/25">
                                {enc.id}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center space-x-1.5">
                              <span className="font-semibold text-emerald-500">{enc.facility}</span>
                              <span>• Type: {enc.type}</span>
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30 shrink-0">
                          Archived Habitat
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs">
                        <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/15 text-[11px]">
                          <div>
                            <span className="text-slate-400 block">Climate Target:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {enc.temperature || 'Ambient'} • {enc.humidity || 'Optimal'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Capacity:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {enc.capacity || 'Standard spec'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/15 text-[11px]">
                          <span className="font-bold text-slate-400">Condition at Deletion:</span>
                          <span className="font-extrabold text-amber-600 dark:text-amber-300">
                            {enc.condition || 'Operational'}
                          </span>
                        </div>

                        <div className="flex items-start space-x-1.5">
                          <span className="font-bold text-slate-400 shrink-0">Reason:</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-300">
                            {enc.deletionReason || 'Habitat removed from facility inventory'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <div>
                            <span className="font-bold">Deleted At: </span>
                            <span className="font-mono text-slate-600 dark:text-slate-300">
                              {enc.deletedAt ? new Date(enc.deletedAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </span>
                          </div>
                          {enc.deletedBy && (
                            <div>
                              <span className="font-bold">By: </span>
                              <span className="text-slate-600 dark:text-slate-300">{enc.deletedBy}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-emerald-950/80">
                      <button
                        type="button"
                        onClick={() => handleRestoreEnclosure(enc)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore Enclosure</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEnclosureToPermanentDelete(enc)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Permanently</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. DELETED INVENTORY SUPPLIES SECTION */}
          {(deletionTypeFilter === 'all' || deletionTypeFilter === 'inventory') && displayedDeletedInventory.length > 0 && (
            <div className="space-y-3 pt-1">
              {deletionTypeFilter === 'all' && (
                <div className="flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider text-amber-500">
                  <Package className="w-3.5 h-3.5" />
                  <span>Deleted Inventory Supplies ({displayedDeletedInventory.length})</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedDeletedInventory.map(item => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                      isDarkMode
                        ? 'bg-[#071F11] border-amber-950/80 hover:border-amber-800/80'
                        : 'bg-white border-amber-100 hover:border-amber-200 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-base border border-amber-500/20 shrink-0">
                            <Package className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-black text-sm text-slate-900 dark:text-white">
                                {item.name}
                              </h4>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/25">
                                {item.id}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center space-x-1.5">
                              <span className="font-semibold text-emerald-500">{item.category}</span>
                              {item.unit && <span>• Unit: {item.unit}</span>}
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30 shrink-0">
                          Deleted Item
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/15">
                          <span className="font-bold text-slate-400">Recorded Stock at Deletion:</span>
                          <span className="font-extrabold font-mono text-amber-600 dark:text-amber-300">
                            {item.previousStock ?? item.currentStock} {item.unit}
                          </span>
                        </div>

                        <div className="flex items-start space-x-1.5">
                          <span className="font-bold text-slate-400 shrink-0">Reason:</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-300">
                            {item.deletionReason || 'Removed from active inventory registry'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <div>
                            <span className="font-bold">Deleted At: </span>
                            <span className="font-mono text-slate-600 dark:text-slate-300">
                              {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </span>
                          </div>
                          {item.deletedBy && (
                            <div>
                              <span className="font-bold">By: </span>
                              <span className="text-slate-600 dark:text-slate-300">{item.deletedBy}</span>
                            </div>
                          )}
                        </div>

                        {(item.location || item.supplier) && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {item.location && (
                              <span className="inline-flex items-center text-[10px] text-slate-400 bg-slate-100 dark:bg-[#04110A] px-2 py-0.5 rounded-md border border-slate-200 dark:border-emerald-950/60">
                                <MapPin className="w-2.5 h-2.5 mr-1 text-slate-400" />
                                {item.location}
                              </span>
                            )}
                            {item.supplier && (
                              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-[#04110A] px-2 py-0.5 rounded-md border border-slate-200 dark:border-emerald-950/60">
                                Supplier: {item.supplier}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-emerald-950/80">
                      <button
                        type="button"
                        onClick={() => handleRestoreInventory(item)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore to Inventory</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInventoryToPermanentDelete(item)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Permanently</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. DELETED WILDLIFE SPECIMENS SECTION */}
          {(deletionTypeFilter === 'all' || deletionTypeFilter === 'animals') && displayedAnimals.length > 0 && (
            <div className="space-y-3 pt-1">
              {deletionTypeFilter === 'all' && (
                <div className="flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider text-amber-500 mt-2">
                  <span>🐾</span>
                  <span>Deleted Wildlife Specimens ({displayedAnimals.length})</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedAnimals.map(animal => (
                  <div
                    key={animal.id}
                    className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                      isDarkMode
                        ? 'bg-[#071F11] border-amber-950/80 hover:border-amber-800/80'
                        : 'bg-white border-amber-100 hover:border-amber-200 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-base border border-amber-500/20 shrink-0">
                            🗑️
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-black text-sm text-slate-900 dark:text-white">
                                {animal.name || animal.species}
                              </h4>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/25">
                                {animal.id}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {animal.species} • {animal.sex}
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30 shrink-0">
                          Removed Log
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs">
                        <div className="flex items-start space-x-1.5">
                          <span className="font-bold text-slate-400 shrink-0">Reason:</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-300">
                            {animal.archiveReason || 'Administrative Deletion'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-400">Deletion Date:</span>
                          <span className="text-slate-600 dark:text-slate-300 font-mono">
                            {animal.archiveDate || 'N/A'}
                          </span>
                        </div>

                        {animal.archiveNotes && (
                          <div className={`p-2.5 rounded-xl text-[11px] leading-relaxed border ${
                            isDarkMode ? 'bg-[#04110A] border-amber-950/60 text-slate-300' : 'bg-amber-50/50 border-amber-100 text-slate-700'
                          }`}>
                            <span className="font-bold text-slate-400 block mb-0.5">Remarks:</span>
                            {animal.archiveNotes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-emerald-950/80">
                      <button
                        type="button"
                        onClick={() => handleRestoreAnimal(animal)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore to Active</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAnimalToPermanentDelete(animal)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Permanently</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. DELETED CARE TASKS & CHECKLISTS SECTION */}
          {(deletionTypeFilter === 'all' || deletionTypeFilter === 'tasks') && displayedDeletedTasks.length > 0 && (
            <div className="space-y-3 pt-1">
              {deletionTypeFilter === 'all' && (
                <div className="flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider text-amber-500 mt-2">
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Deleted Care Tasks & Checklists ({displayedDeletedTasks.length})</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedDeletedTasks.map(task => (
                  <div
                    key={task.id}
                    className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                      isDarkMode
                        ? 'bg-[#071F11] border-amber-950/80 hover:border-amber-800/80'
                        : 'bg-white border-amber-100 hover:border-amber-200 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-base border border-amber-500/20 shrink-0">
                            <ClipboardList className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-black text-sm text-slate-900 dark:text-white">
                                {task.title}
                              </h4>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/25">
                                {task.id}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center space-x-1.5">
                              <span className="font-semibold text-emerald-500">Type: {task.type}</span>
                              {task.animalId && <span>• Target: {task.animalId}</span>}
                              {task.frequency && <span>• {task.frequency}</span>}
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30 shrink-0">
                          Archived Task
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs">
                        {task.details && (
                          <div className="p-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/15 text-[11px] text-slate-700 dark:text-slate-300">
                            {task.details}
                          </div>
                        )}

                        <div className="flex items-start space-x-1.5 pt-1">
                          <span className="font-bold text-slate-400 shrink-0">Reason:</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-300">
                            {task.deletionReason || 'Removed from active tasks'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <div>
                            <span className="font-bold">Deleted At: </span>
                            <span className="font-mono text-slate-600 dark:text-slate-300">
                              {task.deletedAt ? new Date(task.deletedAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </span>
                          </div>
                          {task.deletedBy && (
                            <div>
                              <span className="font-bold">By: </span>
                              <span className="text-slate-600 dark:text-slate-300">{task.deletedBy}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-emerald-950/80">
                      <button
                        type="button"
                        onClick={() => handleRestoreTask(task)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore Care Task</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTaskToPermanentDelete(task)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Permanently</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. DELETED MEDICAL & CLINICAL RECORDS SECTION */}
          {(deletionTypeFilter === 'all' || deletionTypeFilter === 'medical') && displayedDeletedMedicalRecords.length > 0 && (
            <div className="space-y-3 pt-1">
              {deletionTypeFilter === 'all' && (
                <div className="flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider text-amber-500 mt-2">
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Deleted Medical & Clinical Records ({displayedDeletedMedicalRecords.length})</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedDeletedMedicalRecords.map(rec => (
                  <div
                    key={rec.id}
                    className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                      isDarkMode
                        ? 'bg-[#071F11] border-amber-950/80 hover:border-amber-800/80'
                        : 'bg-white border-amber-100 hover:border-amber-200 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-base border border-amber-500/20 shrink-0">
                            <Stethoscope className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-black text-sm text-slate-900 dark:text-white">
                                {rec.diagnosis || rec.recordType || 'Clinical Entry'}
                              </h4>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/25">
                                {rec.id}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center space-x-1.5">
                              <span className="font-semibold text-rose-400">Specimen: {rec.animalId}</span>
                              {rec.veterinarian && <span>• Dr: {rec.veterinarian}</span>}
                              {rec.recordDate && <span>• {rec.recordDate}</span>}
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30 shrink-0">
                          Archived Clinical
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs">
                        {rec.treatment && (
                          <div className="p-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/15 text-[11px] text-slate-700 dark:text-slate-300">
                            <strong>Treatment / Rx: </strong>{rec.treatment}
                          </div>
                        )}
                        {rec.notes && (
                          <p className="text-[11px] text-slate-400 italic">"{rec.notes}"</p>
                        )}

                        <div className="flex items-start space-x-1.5 pt-1">
                          <span className="font-bold text-slate-400 shrink-0">Reason:</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-300">
                            {rec.deletionReason || 'Removed from medical registry'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <div>
                            <span className="font-bold">Deleted At: </span>
                            <span className="font-mono text-slate-600 dark:text-slate-300">
                              {rec.deletedAt ? new Date(rec.deletedAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </span>
                          </div>
                          {rec.deletedBy && (
                            <div>
                              <span className="font-bold">By: </span>
                              <span className="text-slate-600 dark:text-slate-300">{rec.deletedBy}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-emerald-950/80">
                      <button
                        type="button"
                        onClick={() => handleRestoreMedicalRecord(rec)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore Medical Record</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMedicalToPermanentDelete(rec)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Permanently</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. DELETED BREEDING RECORDS & PAIRS SECTION */}
          {(deletionTypeFilter === 'all' || deletionTypeFilter === 'breeding') && displayedDeletedBreedingRecords.length > 0 && (
            <div className="space-y-3 pt-1">
              {deletionTypeFilter === 'all' && (
                <div className="flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider text-amber-500 mt-2">
                  <Dna className="w-3.5 h-3.5" />
                  <span>Deleted Breeding Records & Pairs ({displayedDeletedBreedingRecords.length})</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedDeletedBreedingRecords.map(b => (
                  <div
                    key={b.id}
                    className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                      isDarkMode
                        ? 'bg-[#071F11] border-amber-950/80 hover:border-amber-800/80'
                        : 'bg-white border-amber-100 hover:border-amber-200 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-base border border-amber-500/20 shrink-0">
                            <Dna className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-black text-sm text-slate-900 dark:text-white">
                                {b.femaleName || b.femaleId} × {b.maleName || b.maleId}
                              </h4>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/25">
                                {b.id}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center space-x-1.5">
                              <span className="font-semibold text-pink-400">Species: {b.species}</span>
                              {b.breedingDate && <span>• Date: {b.breedingDate}</span>}
                              {b.clutchSize && <span>• Clutch: {b.clutchSize} eggs</span>}
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30 shrink-0">
                          Archived Pair
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs">
                        {b.notes && (
                          <div className="p-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/15 text-[11px] text-slate-700 dark:text-slate-300">
                            {b.notes}
                          </div>
                        )}

                        <div className="flex items-start space-x-1.5 pt-1">
                          <span className="font-bold text-slate-400 shrink-0">Reason:</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-300">
                            {b.deletionReason || 'Breeding pair or cycle archived'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <div>
                            <span className="font-bold">Deleted At: </span>
                            <span className="font-mono text-slate-600 dark:text-slate-300">
                              {b.deletedAt ? new Date(b.deletedAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </span>
                          </div>
                          {b.deletedBy && (
                            <div>
                              <span className="font-bold">By: </span>
                              <span className="text-slate-600 dark:text-slate-300">{b.deletedBy}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-emerald-950/80">
                      <button
                        type="button"
                        onClick={() => handleRestoreBreedingRecord(b)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore Breeding Pair</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBreedingToPermanentDelete(b)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Permanently</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. DELETED VETERINARY APPOINTMENTS SECTION */}
          {(deletionTypeFilter === 'all' || deletionTypeFilter === 'appointments') && displayedDeletedAppointments.length > 0 && (
            <div className="space-y-3 pt-1">
              {deletionTypeFilter === 'all' && (
                <div className="flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider text-amber-500 mt-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Deleted Veterinary Appointments ({displayedDeletedAppointments.length})</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedDeletedAppointments.map(apt => (
                  <div
                    key={apt.id}
                    className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                      isDarkMode
                        ? 'bg-[#071F11] border-amber-950/80 hover:border-amber-800/80'
                        : 'bg-white border-amber-100 hover:border-amber-200 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-base border border-amber-500/20 shrink-0">
                            <Calendar className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-black text-sm text-slate-900 dark:text-white">
                                {apt.purpose || apt.type || 'Veterinary Appointment'}
                              </h4>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/25">
                                {apt.id}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center space-x-1.5">
                              <span className="font-semibold text-sky-400">Specimen: {apt.animalId}</span>
                              {apt.date && <span>• Date: {apt.date} {apt.time || ''}</span>}
                              {apt.requestedBy && <span>• By: {apt.requestedBy}</span>}
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30 shrink-0">
                          Archived Vet Appt
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs">
                        {apt.adminNotes && (
                          <div className="p-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/15 text-[11px] text-slate-700 dark:text-slate-300">
                            {apt.adminNotes}
                          </div>
                        )}

                        <div className="flex items-start space-x-1.5 pt-1">
                          <span className="font-bold text-slate-400 shrink-0">Reason:</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-300">
                            {apt.deletionReason || 'Appointment canceled or deleted'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <div>
                            <span className="font-bold">Deleted At: </span>
                            <span className="font-mono text-slate-600 dark:text-slate-300">
                              {apt.deletedAt ? new Date(apt.deletedAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </span>
                          </div>
                          {apt.deletedBy && (
                            <div>
                              <span className="font-bold">By: </span>
                              <span className="text-slate-600 dark:text-slate-300">{apt.deletedBy}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-emerald-950/80">
                      <button
                        type="button"
                        onClick={() => handleRestoreAppointment(apt)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore Appointment</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAppointmentToPermanentDelete(apt)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Permanently</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-tab empty feedback */}
          {deletionTypeFilter === 'staff' && displayedDeletedStaff.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No deleted staff members or user accounts found matching your criteria.
            </div>
          )}
          {deletionTypeFilter === 'enclosures' && displayedDeletedEnclosures.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No deleted habitats or enclosures found matching your criteria.
            </div>
          )}
          {deletionTypeFilter === 'inventory' && displayedDeletedInventory.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No deleted inventory supplies found matching your criteria.
            </div>
          )}
          {deletionTypeFilter === 'animals' && displayedAnimals.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No deleted wildlife specimens found matching your criteria.
            </div>
          )}
          {deletionTypeFilter === 'tasks' && displayedDeletedTasks.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No deleted care tasks or daily checklists found matching your criteria.
            </div>
          )}
          {deletionTypeFilter === 'medical' && displayedDeletedMedicalRecords.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No deleted medical records or clinical entries found matching your criteria.
            </div>
          )}
          {deletionTypeFilter === 'breeding' && displayedDeletedBreedingRecords.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No deleted breeding pairs or records found matching your criteria.
            </div>
          )}
          {deletionTypeFilter === 'appointments' && displayedDeletedAppointments.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No deleted veterinary appointments found matching your criteria.
            </div>
          )}
        </div>
      ) : (
        /* ================= COMPREHENSIVE ALL RECORDS TABLE ================= */
        <div
          className={`rounded-2xl border overflow-hidden transition-colors ${
            isDarkMode ? 'bg-[#071F11] border-emerald-950/60 text-slate-200' : 'bg-white border-slate-100 text-slate-800'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr
                  className={`border-b font-bold ${
                    isDarkMode
                      ? 'border-emerald-950 bg-[#04110A] text-emerald-300'
                      : 'border-slate-100 bg-slate-50 text-slate-500'
                  }`}
                >
                  <th className="p-4">Category</th>
                  <th className="p-4">Record Details</th>
                  <th className="p-4">Species / Type</th>
                  <th className="p-4">Archive Date</th>
                  <th className="p-4">Reason / Remarks</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/10 dark:divide-emerald-950/30">
                {displayedAnimals.map(animal => {
                  const cat = getAnimalArchiveCategory(animal);
                  return (
                    <tr
                      key={animal.id}
                      className="hover:bg-emerald-950/5 dark:hover:bg-emerald-900/10 transition-all"
                    >
                      <td className="p-4">
                        {cat === 'Mortality' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                            <Skull className="w-3 h-3 mr-1" />
                            Mortality
                          </span>
                        ) : cat === 'Transferred' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25">
                            <Truck className="w-3 h-3 mr-1" />
                            Transferred
                          </span>
                        ) : cat === 'Deleted' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                            <Trash2 className="w-3 h-3 mr-1" />
                            Deleted
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-500/15 text-slate-400 border border-slate-500/25">
                            <FileText className="w-3 h-3 mr-1" />
                            Other
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2.5">
                          {animal.image || animal.photoUrl ? (
                            <img
                              src={animal.image || animal.photoUrl}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-emerald-900 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs shrink-0">
                              {animal.sex === 'Female' ? '♀' : '♂'}
                            </div>
                          )}
                          <div>
                            <span className="font-extrabold text-slate-800 dark:text-white block">
                              {animal.name || animal.species}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {animal.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">{animal.species}</td>
                      <td className="p-4 font-mono text-slate-400">{animal.archiveDate || 'N/A'}</td>
                      <td className="p-4 max-w-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                          {animal.archiveReason || 'De-accessioned Record'}
                        </span>
                        {animal.archiveNotes && (
                          <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                            {animal.archiveNotes}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            type="button"
                            onClick={() => onSelectAnimalForDetail(animal)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                            title="View Lifetime History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRestoreAnimal(animal)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-[#113C24] dark:text-emerald-400 rounded-xl text-[10px] font-bold border border-emerald-500/10 cursor-pointer transition-colors"
                          >
                            Restore
                          </button>

                          <button
                            type="button"
                            onClick={() => setAnimalToPermanentDelete(animal)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Permanently Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Deleted Staff Rows in All Records */}
                {displayedDeletedStaff.map(member => (
                  <tr
                    key={member.id}
                    className="hover:bg-amber-950/5 dark:hover:bg-amber-900/10 transition-all"
                  >
                    <td className="p-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                        <Users className="w-3 h-3 mr-1" />
                        Deleted Staff
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {member.initials || member.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-800 dark:text-white block">
                            {member.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {member.id} • {member.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-slate-600 dark:text-slate-300 capitalize">
                        Role: {member.role} ({member.dutyLoad || 'Inactive'})
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {member.deletedAt ? new Date(member.deletedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 max-w-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                        {member.deletionReason || 'Removed from active staff roster'}
                      </span>
                      {member.previousAssignedAnimalsCount !== undefined && member.previousAssignedAnimalsCount > 0 && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 block truncate mt-0.5">
                          Had {member.previousAssignedAnimalsCount} assigned reptiles
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleRestoreStaff(member)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-[#113C24] dark:text-emerald-400 rounded-xl text-[10px] font-bold border border-emerald-500/10 cursor-pointer transition-colors"
                        >
                          Restore
                        </button>

                        <button
                          type="button"
                          onClick={() => setStaffToPermanentDelete(member)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Permanently Delete Staff Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Deleted Enclosure Rows in All Records */}
                {displayedDeletedEnclosures.map(enc => (
                  <tr
                    key={enc.id}
                    className="hover:bg-amber-950/5 dark:hover:bg-amber-900/10 transition-all"
                  >
                    <td className="p-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                        <Home className="w-3 h-3 mr-1" />
                        Deleted Habitat
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0">
                          <Home className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-800 dark:text-white block">
                            {enc.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {enc.id} • {enc.facility}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        Habitat: {enc.type} ({enc.capacity || 'Spec'})
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {enc.deletedAt ? new Date(enc.deletedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 max-w-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                        {enc.deletionReason || 'Removed from facility enclosures'}
                      </span>
                      {enc.temperature && (
                        <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                          Climate: {enc.temperature} / {enc.humidity || 'Optimal'}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleRestoreEnclosure(enc)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-[#113C24] dark:text-emerald-400 rounded-xl text-[10px] font-bold border border-emerald-500/10 cursor-pointer transition-colors"
                        >
                          Restore
                        </button>

                        <button
                          type="button"
                          onClick={() => setEnclosureToPermanentDelete(enc)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Permanently Delete Habitat Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Deleted Inventory Rows in All Records */}
                {displayedDeletedInventory.map(item => (
                  <tr
                    key={item.id}
                    className="hover:bg-amber-950/5 dark:hover:bg-amber-900/10 transition-all"
                  >
                    <td className="p-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                        <Package className="w-3 h-3 mr-1" />
                        Deleted Supply
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-800 dark:text-white block">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {item.id} • Stock: {item.previousStock ?? item.currentStock} {item.unit}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-slate-600 dark:text-slate-300">Supply: {item.category}</span>
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 max-w-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                        {item.deletionReason || 'Removed from active inventory'}
                      </span>
                      {item.location && (
                        <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                          Location: {item.location}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleRestoreInventory(item)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-[#113C24] dark:text-emerald-400 rounded-xl text-[10px] font-bold border border-emerald-500/10 cursor-pointer transition-colors"
                        >
                          Restore
                        </button>

                        <button
                          type="button"
                          onClick={() => setInventoryToPermanentDelete(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Permanently Delete Supply Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Deleted Task Rows in All Records */}
                {displayedDeletedTasks.map(task => (
                  <tr
                    key={task.id}
                    className="hover:bg-amber-950/5 dark:hover:bg-amber-900/10 transition-all"
                  >
                    <td className="p-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                        <ClipboardList className="w-3 h-3 mr-1" />
                        Deleted Task
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs shrink-0">
                          <ClipboardList className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-800 dark:text-white block">
                            {task.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {task.id} {task.animalId ? `• For: ${task.animalId}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        Task: {task.type} ({task.frequency || 'Once'})
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {task.deletedAt ? new Date(task.deletedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 max-w-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                        {task.deletionReason || 'Removed from care schedule'}
                      </span>
                      {task.details && (
                        <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                          {task.details}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleRestoreTask(task)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-[#113C24] dark:text-emerald-400 rounded-xl text-[10px] font-bold border border-emerald-500/10 cursor-pointer transition-colors"
                        >
                          Restore
                        </button>

                        <button
                          type="button"
                          onClick={() => setTaskToPermanentDelete(task)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Permanently Delete Care Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Deleted Medical Record Rows in All Records */}
                {displayedDeletedMedicalRecords.map(rec => (
                  <tr
                    key={rec.id}
                    className="hover:bg-amber-950/5 dark:hover:bg-amber-900/10 transition-all"
                  >
                    <td className="p-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                        <Stethoscope className="w-3 h-3 mr-1" />
                        Deleted Medical
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-xs shrink-0">
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-800 dark:text-white block">
                            {rec.diagnosis || rec.recordType || 'Clinical Entry'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {rec.id} • Specimen: {rec.animalId}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        Dr: {rec.veterinarian || 'Unassigned'} • {rec.recordType || 'Log'}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {rec.deletedAt ? new Date(rec.deletedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 max-w-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                        {rec.deletionReason || 'Removed from medical registry'}
                      </span>
                      {rec.treatment && (
                        <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                          Rx: {rec.treatment}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleRestoreMedicalRecord(rec)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-[#113C24] dark:text-emerald-400 rounded-xl text-[10px] font-bold border border-emerald-500/10 cursor-pointer transition-colors"
                        >
                          Restore
                        </button>

                        <button
                          type="button"
                          onClick={() => setMedicalToPermanentDelete(rec)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Permanently Delete Medical Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Deleted Breeding Record Rows in All Records */}
                {displayedDeletedBreedingRecords.map(b => (
                  <tr
                    key={b.id}
                    className="hover:bg-amber-950/5 dark:hover:bg-amber-900/10 transition-all"
                  >
                    <td className="p-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/25">
                        <Dna className="w-3 h-3 mr-1" />
                        Deleted Breeding
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center font-bold text-xs shrink-0">
                          <Dna className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-800 dark:text-white block">
                            {b.femaleName || b.femaleId} × {b.maleName || b.maleId}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {b.id} • {b.species}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {b.breedingType || 'Natural Mating'} {b.clutchSize ? `• Clutch: ${b.clutchSize}` : ''}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {b.deletedAt ? new Date(b.deletedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 max-w-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                        {b.deletionReason || 'Breeding pair or cycle archived'}
                      </span>
                      {b.notes && (
                        <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                          {b.notes}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleRestoreBreedingRecord(b)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-[#113C24] dark:text-emerald-400 rounded-xl text-[10px] font-bold border border-emerald-500/10 cursor-pointer transition-colors"
                        >
                          Restore
                        </button>

                        <button
                          type="button"
                          onClick={() => setBreedingToPermanentDelete(b)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Permanently Delete Breeding Pair"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Deleted Appointment Rows in All Records */}
                {displayedDeletedAppointments.map(apt => (
                  <tr
                    key={apt.id}
                    className="hover:bg-amber-950/5 dark:hover:bg-amber-900/10 transition-all"
                  >
                    <td className="p-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25">
                        <Calendar className="w-3 h-3 mr-1" />
                        Deleted Appointment
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold text-xs shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-800 dark:text-white block">
                            {apt.purpose || apt.type || 'Veterinary Appointment'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {apt.id} • Target: {apt.animalId}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {apt.date} {apt.time || ''} {apt.requestedBy ? `• By: ${apt.requestedBy}` : ''}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {apt.deletedAt ? new Date(apt.deletedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 max-w-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                        {apt.deletionReason || 'Appointment canceled or deleted'}
                      </span>
                      {apt.adminNotes && (
                        <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                          {apt.adminNotes}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleRestoreAppointment(apt)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-[#113C24] dark:text-emerald-400 rounded-xl text-[10px] font-bold border border-emerald-500/10 cursor-pointer transition-colors"
                        >
                          Restore
                        </button>

                        <button
                          type="button"
                          onClick={() => setAppointmentToPermanentDelete(apt)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Permanently Delete Appointment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Dialog (Animal) */}
      {animalToPermanentDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-3xl p-6 shadow-2xl border transition-all ${
            isDarkMode ? 'bg-[#06180F] border-rose-900/60 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center space-x-2.5 pb-3 border-b border-rose-500/20">
              <div className="p-2 bg-rose-500/20 text-rose-500 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
                  Permanent Deletion
                </h3>
                <p className="text-[11px] text-slate-400">
                  {animalToPermanentDelete.id} — {animalToPermanentDelete.name || animalToPermanentDelete.species}
                </p>
              </div>
            </div>

            <div className="space-y-3 my-4 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Are you sure you want to permanently delete <strong>{animalToPermanentDelete.name || animalToPermanentDelete.id}</strong> from the database?
              </p>
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-300 text-[11px] leading-relaxed">
                Warning: This action is irreversible. All historical records, weight logs, feeding logs, and medical tasks associated with this specimen will be permanently erased.
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setAnimalToPermanentDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Dialog (Staff) */}
      {staffToPermanentDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-3xl p-6 shadow-2xl border transition-all ${
            isDarkMode ? 'bg-[#06180F] border-rose-900/60 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center space-x-2.5 pb-3 border-b border-rose-500/20">
              <div className="p-2 bg-rose-500/20 text-rose-500 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
                  Permanent Staff Deletion
                </h3>
                <p className="text-[11px] text-slate-400">
                  {staffToPermanentDelete.id} — {staffToPermanentDelete.name} ({staffToPermanentDelete.email})
                </p>
              </div>
            </div>

            <div className="space-y-3 my-4 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Are you sure you want to permanently delete staff account <strong>{staffToPermanentDelete.name}</strong> from the archive?
              </p>
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-300 text-[11px] leading-relaxed">
                Warning: This will permanently purge this user profile, credentials, and audit footprint from the archive. This action cannot be reversed.
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStaffToPermanentDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDeleteStaff}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Dialog (Enclosure) */}
      {enclosureToPermanentDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-3xl p-6 shadow-2xl border transition-all ${
            isDarkMode ? 'bg-[#06180F] border-rose-900/60 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center space-x-2.5 pb-3 border-b border-rose-500/20">
              <div className="p-2 bg-rose-500/20 text-rose-500 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
                  Permanent Habitat Deletion
                </h3>
                <p className="text-[11px] text-slate-400">
                  {enclosureToPermanentDelete.id} — {enclosureToPermanentDelete.name} ({enclosureToPermanentDelete.facility})
                </p>
              </div>
            </div>

            <div className="space-y-3 my-4 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Are you sure you want to permanently delete enclosure <strong>{enclosureToPermanentDelete.name}</strong> from the archive?
              </p>
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-300 text-[11px] leading-relaxed">
                Warning: This action cannot be undone. All configuration data and history for this enclosure will be permanently purged.
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEnclosureToPermanentDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDeleteEnclosure}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Dialog (Inventory) */}
      {inventoryToPermanentDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-3xl p-6 shadow-2xl border transition-all ${
            isDarkMode ? 'bg-[#06180F] border-rose-900/60 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center space-x-2.5 pb-3 border-b border-rose-500/20">
              <div className="p-2 bg-rose-500/20 text-rose-500 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
                  Permanent Inventory Deletion
                </h3>
                <p className="text-[11px] text-slate-400">
                  {inventoryToPermanentDelete.id} — {inventoryToPermanentDelete.name}
                </p>
              </div>
            </div>

            <div className="space-y-3 my-4 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Are you sure you want to permanently delete supply item <strong>{inventoryToPermanentDelete.name} ({inventoryToPermanentDelete.id})</strong> from the archive?
              </p>
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-300 text-[11px] leading-relaxed">
                Warning: This action is permanent and cannot be undone. The inventory supply record will be purged from the database and historical tracking.
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setInventoryToPermanentDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDeleteInventory}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Dialog (Task) */}
      {taskToPermanentDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-3xl p-6 shadow-2xl border transition-all ${
            isDarkMode ? 'bg-[#06180F] border-rose-900/60 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center space-x-2.5 pb-3 border-b border-rose-500/20">
              <div className="p-2 bg-rose-500/20 text-rose-500 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
                  Permanent Task Deletion
                </h3>
                <p className="text-[11px] text-slate-400">
                  {taskToPermanentDelete.id} — {taskToPermanentDelete.title}
                </p>
              </div>
            </div>

            <div className="space-y-3 my-4 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Are you sure you want to permanently delete care task <strong>{taskToPermanentDelete.title} ({taskToPermanentDelete.id})</strong> from the archive?
              </p>
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-300 text-[11px] leading-relaxed">
                Warning: This action cannot be reversed. The task entry and its completion history will be permanently erased.
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setTaskToPermanentDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDeleteTask}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Dialog (Medical Record) */}
      {medicalToPermanentDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-3xl p-6 shadow-2xl border transition-all ${
            isDarkMode ? 'bg-[#06180F] border-rose-900/60 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center space-x-2.5 pb-3 border-b border-rose-500/20">
              <div className="p-2 bg-rose-500/20 text-rose-500 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
                  Permanent Medical Record Deletion
                </h3>
                <p className="text-[11px] text-slate-400">
                  {medicalToPermanentDelete.id} — {medicalToPermanentDelete.diagnosis || medicalToPermanentDelete.recordType}
                </p>
              </div>
            </div>

            <div className="space-y-3 my-4 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Are you sure you want to permanently delete clinical record <strong>{medicalToPermanentDelete.diagnosis || medicalToPermanentDelete.recordType} ({medicalToPermanentDelete.id})</strong>?
              </p>
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-300 text-[11px] leading-relaxed">
                Warning: Clinical audit records and veterinary treatments will be permanently purged from the sanctuary records.
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setMedicalToPermanentDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDeleteMedical}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Dialog (Breeding Record) */}
      {breedingToPermanentDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-3xl p-6 shadow-2xl border transition-all ${
            isDarkMode ? 'bg-[#06180F] border-rose-900/60 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center space-x-2.5 pb-3 border-b border-rose-500/20">
              <div className="p-2 bg-rose-500/20 text-rose-500 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
                  Permanent Breeding Record Deletion
                </h3>
                <p className="text-[11px] text-slate-400">
                  {breedingToPermanentDelete.id} — {breedingToPermanentDelete.species}
                </p>
              </div>
            </div>

            <div className="space-y-3 my-4 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Are you sure you want to permanently delete breeding record <strong>{breedingToPermanentDelete.id} ({breedingToPermanentDelete.femaleName || breedingToPermanentDelete.femaleId} × {breedingToPermanentDelete.maleName || breedingToPermanentDelete.maleId})</strong>?
              </p>
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-300 text-[11px] leading-relaxed">
                Warning: Historical lineage tracing and clutch outcome logs will be purged permanently from the system.
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setBreedingToPermanentDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDeleteBreeding}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Dialog (Appointment) */}
      {appointmentToPermanentDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-3xl p-6 shadow-2xl border transition-all ${
            isDarkMode ? 'bg-[#06180F] border-rose-900/60 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center space-x-2.5 pb-3 border-b border-rose-500/20">
              <div className="p-2 bg-rose-500/20 text-rose-500 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
                  Permanent Appointment Deletion
                </h3>
                <p className="text-[11px] text-slate-400">
                  {appointmentToPermanentDelete.id} — {appointmentToPermanentDelete.purpose || appointmentToPermanentDelete.type}
                </p>
              </div>
            </div>

            <div className="space-y-3 my-4 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Are you sure you want to permanently delete appointment <strong>{appointmentToPermanentDelete.purpose || appointmentToPermanentDelete.type} ({appointmentToPermanentDelete.id})</strong>?
              </p>
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-300 text-[11px] leading-relaxed">
                Warning: This veterinary appointment record will be completely erased from the archive database.
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setAppointmentToPermanentDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDeleteAppointment}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
