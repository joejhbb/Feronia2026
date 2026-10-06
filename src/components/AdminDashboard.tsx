import React, { useState, useEffect, useMemo, useCallback, useRef, FormEvent, ChangeEvent } from 'react';
import { motion } from 'motion/react';
import {
  Search, Bell, Users, Compass, Shield, Heart, User,
  FileText, Settings, LogOut, Plus, QrCode, Layers, FileDown, Sun, Moon, Menu, X,
  Leaf, PawPrint, Package, FolderArchive, LayoutGrid, List, ChevronRight, ChevronDown, CheckCircle2, HelpCircle, Trash2, Edit2,
  Calendar, ArrowRight, ArrowLeft, Utensils, Sparkles, Dna, AlertTriangle, Check, Clipboard, Box, Clock, AlertCircle, PieChart, Camera,
  Thermometer, Droplets, UserPlus, KeyRound, Copy, RefreshCw, Eye, EyeOff, Phone, Mail, Key, Database, Server, Stethoscope,
  ClipboardCheck
} from 'lucide-react';
import { Animal, Enclosure, Task, MedicalRecord, Appointment, BreedingRecord, BreedingAssessment, TransferRecord, InventoryItem, DeletedInventoryItem, StaffMember, DeletedStaffMember, DeletedEnclosure, DeletedTask, DeletedMedicalRecord, DeletedBreedingRecord, DeletedAppointment, getTaskAssignedBy, getTaskComputedStatus, getAppointmentRequesterInfo } from '../types';
import { INITIAL_STAFF_MEMBERS, generateUniqueStaffId } from '../data';
import { subscribeToStaff, saveStaffMember as saveStaffToFirestore, deleteStaffMember as deleteStaffFromFirestore, deleteAllStaffMembers } from '../lib/dbClient';
import { SPECIES_BREEDING_STANDARDS, evaluateBreedingPair, findSpeciesBreedingStandard } from '../utils/breedingStandards';
import { sortTasksByTime } from '../utils/timeUtils';
import AddAnimalModal from './admin/AddAnimalModal';
import EditAnimalModal from './admin/EditAnimalModal';
import EnclosureDetailModal from './admin/EnclosureDetailModal';
import EnclosureQrModal from './common/EnclosureQrModal';
import QrScannerModal from './common/QrScannerModal';
import EnclosureInspectionModal from './common/EnclosureInspectionModal';
import { KeeperClimateModal } from './keeper/KeeperClimateModal';
import { ArchiveRecordsModule } from './admin/ArchiveRecordsModule';
import { DeleteAnimalConfirmModal } from './admin/DeleteAnimalConfirmModal';
import { StaffManagementView } from './admin/StaffManagementView';
import { ReassignStaffAllocationModal } from './admin/ReassignStaffAllocationModal';
import { EditTaskModal } from './admin/EditTaskModal';
import { AddStaffMemberModal } from './admin/AddStaffMemberModal';
import { StaffAddedSuccessModal } from './admin/StaffAddedSuccessModal';
import { AdminAnimalsView } from './admin/AdminAnimalsView';
import { AdminEnclosuresView } from './admin/AdminEnclosuresView';
import AdminNotificationDropdown from './admin/AdminNotificationDropdown';
import SystemDateBadge from './common/SystemDateBadge';
import UserAvatar from './common/UserAvatar';
import ProfileSettingsModal from './common/ProfileSettingsModal';
import AnimalDetailOverlay from './admin/AnimalDetailOverlay';
import InventoryModule from './admin/InventoryModule';
import BreedingModule from './admin/BreedingModule';
import AdminReportsView from './admin/AdminReportsView';

const REPTILE_SPECIES_LIST = [
  'Ball Python',
  'Bearded Dragon',
  'Green Iguana',
  'Crested Gecko',
  'Corn Snake',
  'Leopard Gecko',
  'Red-Eared Slider',
  'Burmese Python',
  'Reticulated Python',
  'Chameleon',
  'Tokay Gecko',
  'Blue-Tongued Skink',
  'Monitor Lizard',
  'Sulcata Tortoise',
  'Milk Snake',
  'Boa Constrictor',
];

interface AdminDashboardProps {
  onLogout: () => void;
  animals: Animal[];
  onAddAnimal: (animal: Animal) => void;
  onUpdateAnimal: (updated: Animal) => void;
  onDeleteAnimal?: (id: string) => void;
  onDeleteAllAnimals?: () => void;
  enclosures: Enclosure[];
  onAddEnclosure?: (enclosure: Enclosure) => void;
  onUpdateEnclosure?: (enclosure: Enclosure) => void;
  onDeleteEnclosure?: (id: string) => void;
  onDeleteAllEnclosures?: () => void;
  facilities?: string[];
  onAddFacility?: (facilityName: string) => void;
  tasks: Task[];
  medicalRecords: MedicalRecord[];
  onAddMedicalRecord: (record: MedicalRecord) => void;
  breedingRecords: BreedingRecord[];
  onAddBreedingRecord: (record: BreedingRecord) => void;
  onUpdateBreedingRecord?: (record: BreedingRecord) => void;
  onDeleteBreedingRecord?: (id: string) => void;
  breedingAssessments?: BreedingAssessment[];
  onAddBreedingAssessment?: (assessment: BreedingAssessment) => void;
  onUpdateBreedingAssessment?: (assessment: BreedingAssessment) => void;
  onDeleteBreedingAssessment?: (id: string) => void;
  transfers: TransferRecord[];
  onAddTransfer: (transfer: TransferRecord) => void;
  onAddTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTaskStatus?: (id: string, status: 'Pending' | 'Completed' | 'Overdue') => void;
  inventory: InventoryItem[];
  onUpdateInventory: (list: InventoryItem[], changeMeta?: {
    action: 'updated' | 'restocked' | 'added' | 'deleted' | 'status_changed';
    item: InventoryItem;
    details: string;
  }) => void;
  onInventoryAction?: (
    action: 'updated' | 'restocked' | 'added' | 'deleted' | 'status_changed',
    item: InventoryItem,
    details: string
  ) => void;
  appointments?: Appointment[];
  onAddAppointment?: (appointment: Appointment) => void;
  onUpdateAppointment?: (appointment: Appointment) => void;
  onUpdateAppointmentStatus?: (id: string, status: 'Pending' | 'Ongoing' | 'Completed' | 'Cancelled') => void;
  onDeleteAppointment?: (id: string) => void;
  deletedInventory?: DeletedInventoryItem[];
  onRestoreInventoryItem?: (item: DeletedInventoryItem) => void;
  onPermanentDeleteInventoryItem?: (id: string) => void;
  deletedEnclosures?: DeletedEnclosure[];
  onRestoreEnclosure?: (enc: DeletedEnclosure) => void;
  onPermanentDeleteEnclosure?: (id: string) => void;
  deletedTasks?: DeletedTask[];
  onRestoreTask?: (task: DeletedTask) => void;
  onPermanentDeleteTask?: (id: string) => void;
  deletedMedicalRecords?: DeletedMedicalRecord[];
  onDeleteMedicalRecord?: (id: string) => void;
  onRestoreMedicalRecord?: (record: DeletedMedicalRecord) => void;
  onPermanentDeleteMedicalRecord?: (id: string) => void;
  deletedBreedingRecords?: DeletedBreedingRecord[];
  onRestoreBreedingRecord?: (record: DeletedBreedingRecord) => void;
  onPermanentDeleteBreedingRecord?: (id: string) => void;
  deletedAppointments?: DeletedAppointment[];
  onRestoreAppointment?: (appointment: DeletedAppointment) => void;
  onPermanentDeleteAppointment?: (id: string) => void;
  onPermanentDeleteAnimal?: (id: string) => void;
  onClearAllArchives?: () => void;
  onClearOperationalData?: () => Promise<void> | void;
  onRestoreDemoData?: () => void;
  onOpenSupabaseConfig?: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

const getFallbackTaskImage = (type: string) => {
  switch (type) {
    case 'Feeding':
      return 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&q=80&w=150';
    case 'Cleaning':
      return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=150';
    case 'Water Change':
      return 'https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&q=80&w=150';
    case 'Health Check':
      return 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=150';
    default:
      return 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=150';
  }
};

const getActivityImage = (title: string) => {
  switch (title) {
    case 'New animal added':
      return 'https://images.unsplash.com/photo-1531386151447-fd76ad50012f?auto=format&fit=crop&q=80&w=150';
    case 'Medical examination logged':
      return 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=150';
    case 'Inventory count updated':
      return 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=150';
    case 'Breeding lock confirmed':
      return 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&q=80&w=150';
    default:
      return 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=150';
  }
};

const formatSystemDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const dateObj = new Date(year, month - 1, day);
  return dateObj.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

export default function AdminDashboard({
  onLogout,
  animals,
  onAddAnimal,
  onUpdateAnimal,
  onDeleteAnimal,
  onDeleteAllAnimals,
  enclosures,
  onAddEnclosure,
  onUpdateEnclosure,
  onDeleteEnclosure,
  onDeleteAllEnclosures,
  facilities,
  onAddFacility,
  tasks,
  medicalRecords,
  onAddMedicalRecord,
  breedingRecords,
  onAddBreedingRecord,
  onUpdateBreedingRecord,
  onDeleteBreedingRecord,
  breedingAssessments = [],
  onAddBreedingAssessment,
  onUpdateBreedingAssessment,
  onDeleteBreedingAssessment,
  transfers,
  onAddTransfer,
  onAddTask,
  onDeleteTask,
  onUpdateTaskStatus,
  inventory,
  onUpdateInventory,
  onInventoryAction,
  deletedInventory = [],
  onRestoreInventoryItem,
  onPermanentDeleteInventoryItem,
  deletedEnclosures = [],
  onRestoreEnclosure,
  onPermanentDeleteEnclosure,
  deletedTasks = [],
  onRestoreTask,
  onPermanentDeleteTask,
  deletedMedicalRecords = [],
  onDeleteMedicalRecord,
  onRestoreMedicalRecord,
  onPermanentDeleteMedicalRecord,
  deletedBreedingRecords = [],
  onRestoreBreedingRecord,
  onPermanentDeleteBreedingRecord,
  deletedAppointments = [],
  onRestoreAppointment,
  onPermanentDeleteAppointment,
  onPermanentDeleteAnimal,
  onClearAllArchives,
  onClearOperationalData,
  onRestoreDemoData,
  onOpenSupabaseConfig,
  appointments = [],
  onAddAppointment,
  onUpdateAppointment,
  onUpdateAppointmentStatus,
  onDeleteAppointment,
  isDarkMode,
  setIsDarkMode
}: AdminDashboardProps) {
  type AdminMenu = 'dashboard' | 'animals' | 'enclosures' | 'inventory' | 'breeding' | 'users' | 'reports' | 'archive' | 'approvals' | 'health-vet';
  const [activeMenu, setActiveMenu] = useState<AdminMenu>('dashboard');
  const [navigationHistory, setNavigationHistory] = useState<AdminMenu[]>([]);
  const [editingTaskAdmin, setEditingTaskAdmin] = useState<Task | null>(null);
  const [deletingTaskIdAdmin, setDeletingTaskIdAdmin] = useState<string | null>(null);

  // Helper for today's date in YYYY-MM-DD format (Asia/Manila PHT timezone aware)
  const getTodayString = () => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' });
      const dateFormatted = formatter.format(now);
      if (dateFormatted && dateFormatted.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateFormatted;
      }
    } catch {}
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Editable System Date
  const [systemDate, setSystemDate] = useState(() => {
    const today = getTodayString();
    const saved = localStorage.getItem('feronia_system_date');
    if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
      if (saved < today) {
        localStorage.setItem('feronia_system_date', today);
        return today;
      }
      return saved;
    }
    localStorage.setItem('feronia_system_date', today);
    return today;
  });

  const navigateToMenu = (targetMenu: AdminMenu) => {
    if (targetMenu === activeMenu) return;
    setNavigationHistory(prev => [...prev, activeMenu]);
    setActiveMenu(targetMenu);
  };

  const handleGoBack = () => {
    if (navigationHistory.length > 0) {
      const prevMenu = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, prev.length - 1));
      setActiveMenu(prevMenu);
    } else {
      setActiveMenu('dashboard');
    }
  };
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedAnimalInitialTab, setSelectedAnimalInitialTab] = useState<'overview' | 'medical' | 'enclosure' | 'feeding' | 'breeding' | 'transfer' | 'documents'>('overview');
  const [isAdminNotificationOpen, setIsAdminNotificationOpen] = useState(false);

  // Admin Notification Read IDs State
  const [adminReadIds, setAdminReadIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('feronia_admin_read_notifs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleMarkAdminNotifRead = (id: string) => {
    setAdminReadIds(prev => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      try {
        localStorage.setItem('feronia_admin_read_notifs', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Helper to check if an appointment was ordered by the Facility Admin
  const isAptFromAdmin = (apt: Appointment) => {
    return apt.requestedByRole === 'admin' || 
           apt.requestedBy?.toLowerCase().includes('admin') || 
           apt.id?.startsWith('APT-ADM-');
  };

  // Veterinary appointments awaiting administrative authorization (Keepers & Vets requests only, plus reschedule proposals)
  const pendingApprovalsCount = appointments.filter(a => 
    a.status === 'Reschedule Requested' ||
    ((a.status === 'Pending Approval' || a.status === 'Pending') && !isAptFromAdmin(a))
  ).length;

  // Aggregate Admin Notification List to compute exact unread count
  const adminNotifList = useMemo(() => {
    const list: { id: string }[] = [];
    // 1. Pending Approvals & Requests (Excluding admin self-orders, including reschedule proposals)
    appointments.filter(a => a.status === 'Reschedule Requested' || ((a.status === 'Pending Approval' || a.status === 'Pending') && !isAptFromAdmin(a))).forEach(apt => {
      list.push({ id: `approval-apt-${apt.id}` });
    });
    // 2. Pending Transfers
    (transfers || []).filter(t => t.status === 'Pending' || t.status === 'Ready for Approval').forEach(tr => {
      list.push({ id: `approval-tr-${tr.id}` });
    });
    // 3. Critical Inventory Items
    inventory.filter(i => i.status === 'Out of Stock' || i.status === 'Low Stock' || i.currentStock <= 5).forEach(i => {
      list.push({ id: `inventory-${i.id}` });
    });
    // 4. Animal Health Attention
    animals.filter(a => !a.isArchived && (a.healthStatus === 'Under Treatment' || a.healthStatus === 'Under Observation' || a.healthStatus === 'Injured' || (a.healthStatus as string) === 'Sick')).forEach(a => {
      list.push({ id: `health-${a.id}` });
    });
    // 5. All Keeper Tasks Accomplished Alert
    const activeKeeperTasks = tasks.filter(t => {
      if (t.title?.toLowerCase().includes('tiger') || t.details?.toLowerCase().includes('tiger')) return false;
      if (t.animalId && !animals.some(an => an.id === t.animalId)) return false;
      return true;
    });
    const allTasksAccomplished = activeKeeperTasks.length > 0 && activeKeeperTasks.every(t => t.status === 'Completed');
    if (allTasksAccomplished) {
      list.push({ id: `tasks-completed-today-${systemDate}` });
    }
    return list;
  }, [appointments, transfers, inventory, animals, tasks, systemDate]);

  const totalAdminAlertsCount = useMemo(() => {
    return adminNotifList.filter(n => !adminReadIds.includes(n.id)).length;
  }, [adminNotifList, adminReadIds]);

  const activeKeeperTasksForBanner = useMemo(() => {
    return tasks.filter(t => {
      if (t.title?.toLowerCase().includes('tiger') || t.details?.toLowerCase().includes('tiger')) return false;
      if (t.animalId && !animals.some(a => a.id === t.animalId)) return false;
      return true;
    });
  }, [tasks, animals]);

  const allKeeperTasksAccomplished = useMemo(() => {
    return activeKeeperTasksForBanner.length > 0 && activeKeeperTasksForBanner.every(t => t.status === 'Completed');
  }, [activeKeeperTasksForBanner]);

  const handleMarkAllAdminNotifsRead = () => {
    const allIds = adminNotifList.map(n => n.id);
    setAdminReadIds(allIds);
    try {
      localStorage.setItem('feronia_admin_read_notifs', JSON.stringify(allIds));
    } catch {}
  };

  // If redirected to approvals / health-vet menu, automatically route to Animals with Pending Request filter
  useEffect(() => {
    if (activeMenu === 'approvals' || (activeMenu as string) === 'health-vet') {
      setActiveMenu('animals');
      setStatusFilter('Pending Request');
    }
  }, [activeMenu]);

  // Breeding module sub-views and simulator
  const [breedingTab, setBreedingTab] = useState<'records' | 'standards' | 'simulator'>('records');
  const [standardsFilterFamily, setStandardsFilterFamily] = useState('All');
  const [standardsSearchQuery, setStandardsSearchQuery] = useState('');
  const [simulatorFemaleId, setSimulatorFemaleId] = useState('');
  const [simulatorMaleId, setSimulatorMaleId] = useState('');

  // Enclosures module state & branch filter
  const facilitiesList = useMemo(() => {
    const customFacs = facilities || [];
    const encFacs = enclosures.map(e => e.facility).filter((f): f is string => Boolean(f));
    const combined = Array.from(new Set([...customFacs, ...encFacs])).filter(f => f !== 'Reptile Lounge 1');
    return combined.length > 0 ? combined : ['Main Facility'];
  }, [facilities, enclosures]);

  const [selectedBranch, setSelectedBranch] = useState('All Facilities');
  const [enclosureSearch, setEnclosureSearch] = useState('');
  const [enclosureSpeciesFilter, setEnclosureSpeciesFilter] = useState('All Species');
  const [enclosureViewMode, setEnclosureViewMode] = useState<'list' | 'grid'>('list');
  const [selectedEnclosureForModal, setSelectedEnclosureForModal] = useState<Enclosure | null>(null);
  const [selectedEnclosureForClimate, setSelectedEnclosureForClimate] = useState<Enclosure | null>(null);
  const [isAddEnclosureModalOpen, setIsAddEnclosureModalOpen] = useState(false);
  const [isAddEnclosureTaskModalOpen, setIsAddEnclosureTaskModalOpen] = useState(false);

  // QR Code Generation & Scanner States
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [qrTargetEnclosure, setQrTargetEnclosure] = useState<Enclosure | null>(null);
  const [inspectedEnclosure, setInspectedEnclosure] = useState<Enclosure | null>(null);

  // New Enclosure Form State
  const [newEncFacility, setNewEncFacility] = useState(facilitiesList[0] || 'Main Facility');
  const [customFacilityName, setCustomFacilityName] = useState('');
  const [newEncReptileSpecies, setNewEncReptileSpecies] = useState('Ball Python');
  const [customReptileSpecies, setCustomReptileSpecies] = useState('');
  const [newEncId, setNewEncId] = useState('');
  const [newEncType, setNewEncType] = useState('Glass Terrarium');
  const [customEncType, setCustomEncType] = useState('');
  const [newEncTempNum, setNewEncTempNum] = useState('');
  const [newEncCapacity, setNewEncCapacity] = useState('1');
  const [newEncImage, setNewEncImage] = useState('');
  const [newEncNotes, setNewEncNotes] = useState('');

  // Draggable Enclosure Photo Position
  const [newEncPan, setNewEncPan] = useState({ x: 0, y: 0 });
  const [isDraggingEnc, setIsDraggingEnc] = useState(false);
  const [dragStartEnc, setDragStartEnc] = useState({ x: 0, y: 0 });

  const handleEncMouseDown = (e: React.MouseEvent) => {
    setIsDraggingEnc(true);
    setDragStartEnc({ x: e.clientX - newEncPan.x, y: e.clientY - newEncPan.y });
  };

  const handleEncMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingEnc) return;
    const rawX = e.clientX - dragStartEnc.x;
    const rawY = e.clientY - dragStartEnc.y;
    setNewEncPan({
      x: Math.min(Math.max(rawX, -400), 400),
      y: Math.min(Math.max(rawY, -400), 400)
    });
  };

  const handleEncMouseUp = () => {
    setIsDraggingEnc(false);
  };

  const handleEncTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDraggingEnc(true);
      setDragStartEnc({ x: e.touches[0].clientX - newEncPan.x, y: e.touches[0].clientY - newEncPan.y });
    }
  };

  const handleEncTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingEnc || e.touches.length !== 1) return;
    const rawX = e.touches[0].clientX - dragStartEnc.x;
    const rawY = e.touches[0].clientY - dragStartEnc.y;
    setNewEncPan({
      x: Math.min(Math.max(rawX, -400), 400),
      y: Math.min(Math.max(rawY, -400), 400)
    });
  };

  // New Task Form State
  const [newEncTaskTitle, setNewEncTaskTitle] = useState('Cleaning');
  const [newEncTaskDueDate, setNewEncTaskDueDate] = useState('');
  const [newEncTaskStatus, setNewEncTaskStatus] = useState<'Pending' | 'Completed' | 'Overdue'>('Pending');

  const generateAutomatedEnclosureId = (facName: string, speciesName: string, existingEnclosures: Enclosure[]) => {
    const cleanFac = (facName || 'Main Facility').trim();
    const cleanSpecies = (speciesName || 'Reptile').trim();
    
    // Facility Code
    let facPrefix = '';
    if (cleanFac === '+ Add New Facility' || cleanFac === 'Others') {
      facPrefix = 'FAC';
    } else {
      const facWords = cleanFac.split(/\s+/);
      if (facWords.length >= 2) {
        facPrefix = facWords.map(w => w.replace(/[^a-zA-Z0-9]/g, '')[0] || '').join('').toUpperCase();
      } else {
        facPrefix = cleanFac.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
      }
    }
    if (!facPrefix) facPrefix = 'FAC';

    // Species Code (e.g. Ball Python -> BP, Bearded Dragon -> BD, Iguana -> IGU)
    let specPrefix = '';
    const specWords = cleanSpecies.split(/\s+/);
    if (specWords.length >= 2) {
      specPrefix = specWords.map(w => w.replace(/[^a-zA-Z0-9]/g, '')[0] || '').join('').toUpperCase();
    } else if (cleanSpecies.length >= 3) {
      specPrefix = cleanSpecies.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
    } else {
      specPrefix = cleanSpecies.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    }
    if (!specPrefix) specPrefix = 'ENC';

    const baseCode = `${facPrefix}-${specPrefix}`;
    let num = 1;
    let candidate = `${baseCode}-${String(num).padStart(3, '0')}`;
    while (existingEnclosures.some(e => (e.id || '').toUpperCase() === candidate.toUpperCase())) {
      num++;
      candidate = `${baseCode}-${String(num).padStart(3, '0')}`;
    }
    return candidate;
  };

  const handleOpenAddEnclosureModal = () => {
    const targetFac = newEncFacility === '+ Add New Facility' ? customFacilityName : newEncFacility;
    const targetSpecies = newEncReptileSpecies === 'Other' ? customReptileSpecies : newEncReptileSpecies;
    setNewEncId(generateAutomatedEnclosureId(targetFac, targetSpecies, enclosures));
    setNewEncTempNum('');
    setNewEncNotes('');
    setNewEncImage('');
    setNewEncPan({ x: 0, y: 0 });
    setIsAddEnclosureModalOpen(true);
  };

  const handleFacilityChange = (val: string) => {
    setNewEncFacility(val);
    const targetFac = val === '+ Add New Facility' ? customFacilityName : val;
    const targetSpecies = newEncReptileSpecies === 'Other' ? customReptileSpecies : newEncReptileSpecies;
    setNewEncId(generateAutomatedEnclosureId(targetFac, targetSpecies, enclosures));
  };

  const handleCustomFacilityChange = (val: string) => {
    setCustomFacilityName(val);
    const targetSpecies = newEncReptileSpecies === 'Other' ? customReptileSpecies : newEncReptileSpecies;
    setNewEncId(generateAutomatedEnclosureId(val, targetSpecies, enclosures));
  };

  const handleReptileSpeciesChange = (val: string) => {
    setNewEncReptileSpecies(val);
    const targetSpecies = val === 'Other' ? customReptileSpecies : val;
    const targetFac = newEncFacility === '+ Add New Facility' ? customFacilityName : newEncFacility;
    setNewEncId(generateAutomatedEnclosureId(targetFac, targetSpecies, enclosures));
  };

  const handleCustomReptileSpeciesChange = (val: string) => {
    setCustomReptileSpecies(val);
    const targetFac = newEncFacility === '+ Add New Facility' ? customFacilityName : newEncFacility;
    setNewEncId(generateAutomatedEnclosureId(targetFac, val, enclosures));
  };

  const handleEnclosureImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEncImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCardImageUpload = (enc: Enclosure, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateEnclosure) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateEnclosure({
          ...enc,
          image: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateEnclosureSubmit = (e: FormEvent) => {
    e.preventDefault();
    const finalSpecies = (newEncReptileSpecies === 'Other' ? customReptileSpecies.trim() : newEncReptileSpecies.trim()) || 'Reptile';
    const finalFacility = (newEncFacility === '+ Add New Facility' || newEncFacility === 'Others' ? customFacilityName.trim() : newEncFacility.trim()) || 'Main Facility';

    if (onAddFacility) {
      onAddFacility(finalFacility);
    }

    let autoId = newEncId.trim();
    if (!autoId || enclosures.some(e => e.id.toUpperCase() === autoId.toUpperCase())) {
      autoId = generateAutomatedEnclosureId(finalFacility, finalSpecies, enclosures);
    }
    const finalType = newEncType === 'Other' ? (customEncType.trim() || 'Custom Enclosure') : newEncType;
    const finalTemp = newEncTempNum.trim() ? `${newEncTempNum.trim()}°C` : '31°C';
    const finalCapacity = newEncCapacity.trim() || '1';

    const newEnc: Enclosure = {
      id: autoId,
      name: `${finalSpecies} Enclosure`,
      facility: finalFacility,
      type: finalType,
      capacity: finalCapacity,
      status: 'Available',
      condition: 'Good',
      temperature: finalTemp,
      image: newEncImage || undefined,
      notes: newEncNotes.trim() || undefined,
      assignedDate: new Date().toISOString().split('T')[0]
    };

    if (onAddEnclosure) {
      onAddEnclosure(newEnc);
    }
    setSelectedBranch('All Facilities');
    setEnclosureSpeciesFilter('All Species');
    setNewEncId('');
    setNewEncReptileSpecies('Ball Python');
    setCustomReptileSpecies('');
    setCustomEncType('');
    setNewEncCapacity('1');
    setNewEncImage('');
    setNewEncNotes('');
    setCustomFacilityName('');
    setIsAddEnclosureModalOpen(false);
  };

  const handleCreateEnclosureTaskSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newEncTaskTitle.trim()) return;
    const newTask: Task = {
      id: `TASK-${Date.now()}`,
      animalId: 'GENERAL',
      title: `${newEncTaskTitle} Task`,
      type: newEncTaskTitle as any,
      time: '09:00 AM',
      date: newEncTaskDueDate || new Date().toISOString().split('T')[0],
      details: 'Routine maintenance and inspection.',
      frequency: 'Once',
      status: newEncTaskStatus,
      enclosureId: enclosures[0]?.id || 'E-01'
    };
    if (onAddTask) {
      onAddTask(newTask);
    }
    setNewEncTaskTitle('Cleaning');
    setNewEncTaskDueDate('');
    setIsAddEnclosureTaskModalOpen(false);
  };

  // Profile & Settings states
  const [profileName, setProfileName] = useState(() => {
    const saved = localStorage.getItem('feronia_profile_name');
    if (saved && saved !== 'Maria Reyes' && saved !== 'Facility Admin (Maria Reyes)') return saved;
    return 'Justin Admin';
  });
  const [profileEmail, setProfileEmail] = useState(() => {
    const saved = localStorage.getItem('feronia_profile_email');
    if (saved && !saved.includes('maria.reyes')) return saved;
    return 'justunme0423@gmail.com';
  });
  const [profilePhone, setProfilePhone] = useState(() => localStorage.getItem('feronia_profile_phone') || '+63 919 345 6789');
  const [profileAvatar, setProfileAvatar] = useState(() => localStorage.getItem('feronia_profile_avatar') || '👑');
  const [profileBio, setProfileBio] = useState(() => localStorage.getItem('feronia_profile_bio') || 'Lead conservationist and park operations manager at Feronia Zoo.');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Form states for profile modal editing
  const [tempName, setTempName] = useState(profileName);
  const [tempEmail, setTempEmail] = useState(profileEmail);
  const [tempPhone, setTempPhone] = useState(profilePhone);
  const [tempAvatar, setTempAvatar] = useState(profileAvatar);
  const [tempBio, setTempBio] = useState(profileBio);

  // Sync temp state whenever the modal opens
  const openProfileModal = () => {
    setTempName(profileName);
    setTempEmail(profileEmail);
    setTempPhone(profilePhone);
    setTempAvatar(profileAvatar);
    setTempBio(profileBio);
    setIsProfileModalOpen(true);
  };
  
  // Searching & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [sexFilter, setSexFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [speciesFilter, setSpeciesFilter] = useState('All');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [isEditAnimalModalOpen, setIsEditAnimalModalOpen] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [animalToDelete, setAnimalToDelete] = useState<Animal | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Admin Tasks State (100% automatic & simple based on system events)
  const defaultAdminDuties: Array<{
    id: string;
    title: string;
    category: string;
    dueTime: string;
    priority: string;
    dept: string;
    status: string;
    actionKey?: string;
    actionLabel?: string;
  }> = [];

  const [adminTasks, setAdminTasks] = useState<Array<{
    id: string;
    title: string;
    category: string;
    dueTime: string;
    priority: string;
    dept: string;
    status: string;
    actionKey?: string;
    actionLabel?: string;
  }>>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('feronia_empty_mode_active') === 'true') {
      return [];
    }
    const saved = localStorage.getItem('feronia_admin_tasks_v2');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // Fall through to defaults
      }
    }
    return defaultAdminDuties;
  });

  // Keep localStorage in sync with adminTasks
  useEffect(() => {
    localStorage.setItem('feronia_admin_tasks_v2', JSON.stringify(adminTasks));
  }, [adminTasks]);

  // Dynamically ensure real-time inventory alerts, pending care requests, and incomplete animal tasks exist in real-time
  useEffect(() => {
    setAdminTasks(prev => {
      const isEmptyMode = typeof window !== 'undefined' && localStorage.getItem('feronia_empty_mode_active') === 'true';
      if (isEmptyMode && animals.length === 0 && inventory.length === 0 && appointments.length === 0) {
        return [];
      }

      // Create a copy of tasks and filter out auto-generated tasks that are no longer valid (either resolved, approved, or deleted)
      let updated = prev.filter(t => {
        // 1. Low Stock tasks: remove if item restocked or deleted
        if (t.id.startsWith('at-low-stock-')) {
          const itemId = t.id.replace('at-low-stock-', '');
          const item = inventory.find(i => i.id === itemId);
          if (!item) return false;
          return item.status === 'Low Stock' || item.status === 'Out of Stock';
        }
        // 2. Pending approval tasks: remove if appointment approved, completed, or deleted
        if (t.id.startsWith('at-pending-approval-')) {
          const aptId = t.id.replace('at-pending-approval-', '');
          const apt = appointments.find(a => a.id === aptId);
          if (!apt) return false;
          return apt.status === 'Pending' || apt.status === 'Pending Approval';
        }
        // 3. Filter out legacy auto-generated animal tasks if any
        if (t.id.startsWith('at-incomplete-animal-')) {
          return false;
        }
        return true;
      });

      // 1. Add alerts for strictly low stock items
      const lowStockItems = inventory.filter(item => item.status === 'Low Stock' || item.status === 'Out of Stock');
      lowStockItems.forEach(item => {
        const autoId = `at-low-stock-${item.id}`;
        const existing = updated.find(t => t.id === autoId);
        if (!existing) {
          updated.unshift({
            id: autoId,
            title: `Reorder Low Stock: ${item.name} (${item.currentStock} ${item.unit} left)`,
            category: 'Stock & Inventory',
            dueTime: 'URGENT',
            priority: 'High',
            dept: 'Inventory Management',
            status: 'Pending',
            actionKey: 'inventory',
            actionLabel: 'Restock'
          });
        }
      });

      // 2. Add tasks for pending appointment/care approval requests
      const pendingApts = appointments.filter(a => a.status === 'Pending' || a.status === 'Pending Approval');
      pendingApts.forEach(apt => {
        const autoId = `at-pending-approval-${apt.id}`;
        const existing = updated.find(t => t.id === autoId);
        if (!existing) {
          updated.unshift({
            id: autoId,
            title: `Approve Care Request: ${apt.type} for ${apt.animalId}`,
            category: 'Care Approvals',
            dueTime: '09:30 AM',
            priority: 'High',
            dept: 'Clinical Oversight',
            status: 'Pending',
            actionKey: 'dashboard',
            actionLabel: 'Review'
          });
        }
      });

      return updated;
    });
  }, [inventory, animals, appointments]);

  const [isTaskManagerModalOpen, setIsTaskManagerModalOpen] = useState(false);
  const [taskManagerTab, setTaskManagerTab] = useState<'pending' | 'completed' | 'keeper_routines' | 'create'>('pending');
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<any | null>(null);
  const [adminTaskFilter, setAdminTaskFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [newAdminTaskTitle, setNewAdminTaskTitle] = useState('');
  const [newAdminTaskCategory, setNewAdminTaskCategory] = useState('Animal Management');
  const [newAdminTaskCustomCategory, setNewAdminTaskCustomCategory] = useState('');
  const [newAdminTaskPriority, setNewAdminTaskPriority] = useState('High');
  const [newAdminTaskDept, setNewAdminTaskDept] = useState('Operations');

  const handleCreateAdminTask = (e: FormEvent) => {
    e.preventDefault();
    if (!newAdminTaskTitle.trim()) return;
    const finalCategory = newAdminTaskCategory === 'Other' 
      ? (newAdminTaskCustomCategory.trim() || 'General / Other')
      : newAdminTaskCategory;
    const newTask = {
      id: `at-${Date.now()}`,
      title: newAdminTaskTitle,
      category: finalCategory,
      dueTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      priority: newAdminTaskPriority,
      dept: newAdminTaskDept || 'Operations',
      status: 'Pending'
    };
    setAdminTasks(prev => [newTask, ...prev]);
    setNewAdminTaskTitle('');
    setNewAdminTaskCustomCategory('');
    setTaskManagerTab('pending');
  };

  const handleCompleteAdminTask = (id: string) => {
    setAdminTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'Completed' } : t));
  };

  const handleToggleAdminTaskStatus = (id: string) => {
    setAdminTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' } : t));
  };

  const handleDeleteAdminTask = (id: string) => {
    setAdminTasks(prev => prev.filter(t => t.id !== id));
    if (selectedTaskForDetail?.id === id) {
      setSelectedTaskForDetail(null);
    }
  };

  const handleDeleteAllAdminTasks = () => {
    setAdminTasks([]);
    localStorage.setItem('feronia_admin_tasks_v2', JSON.stringify([]));
    localStorage.setItem('feronia_admin_tasks_cleared_v1', 'true');
    if (selectedTaskForDetail) {
      setSelectedTaskForDetail(null);
    }
  };

  const handleExecuteTaskAction = (task: typeof adminTasks[0]) => {
    if (task.actionKey === 'add_animal') {
      setIsAddModalOpen(true);
      setIsTaskManagerModalOpen(false);
    } else if (task.actionKey === 'add_staff' || task.actionKey === 'users') {
      setActiveMenu('users');
      setIsTaskManagerModalOpen(false);
    } else if (task.actionKey === 'inventory') {
      setActiveMenu('inventory');
      setIsTaskManagerModalOpen(false);
    } else if (task.actionKey === 'enclosures') {
      setActiveMenu('enclosures');
      setIsTaskManagerModalOpen(false);
    } else if (task.actionKey === 'animals') {
      setActiveMenu('animals');
      setIsTaskManagerModalOpen(false);
    } else if (task.actionKey === 'dashboard') {
      setActiveMenu('dashboard');
      setIsTaskManagerModalOpen(false);
    } else if (task.actionKey === 'schedule' || task.actionKey === 'keeper_tasks') {
      setTaskManagerTab('keeper_routines');
      setIsTaskManagerModalOpen(true);
    } else {
      handleCompleteAdminTask(task.id);
    }
  };

  const handleUpdateSystemDate = (newDate: string) => {
    setSystemDate(newDate);
    localStorage.setItem('feronia_system_date', newDate);
    window.dispatchEvent(new CustomEvent('feronia_system_date_changed', { detail: newDate }));
  };

  useEffect(() => {
    const handleDateChange = (e: any) => {
      if (e.detail) {
        setSystemDate(e.detail);
      }
    };
    window.addEventListener('feronia_system_date_changed', handleDateChange);
    return () => window.removeEventListener('feronia_system_date_changed', handleDateChange);
  }, []);

  // Staff Members State Helper: Guarantee Administrator is always present
  const ensureAdminInStaff = (list: StaffMember[]): StaffMember[] => {
    const activeAdminName = profileName && !profileName.includes('Maria Reyes') ? profileName : 'Justin Admin';
    const activeAdminEmail = profileEmail && !profileEmail.includes('maria.reyes') ? profileEmail : 'justunme0423@gmail.com';
    const adminStaff: StaffMember = {
      id: 'STF-ADM-001',
      name: activeAdminName,
      email: activeAdminEmail,
      role: 'admin',
      status: 'Active',
      assignedFacilities: ['Main Facility', 'All Sectors'],
      dutyLoad: 'Facility Management & Operations',
      phone: profilePhone || '+63 919 345 6789',
      assignedAnimalIds: []
    };
    let currentList = Array.isArray(list) ? list.map(s => {
      if (s.role === 'admin' && (s.name?.includes('Maria Reyes') || s.email?.includes('maria.reyes'))) {
        return {
          ...s,
          name: activeAdminName,
          email: activeAdminEmail
        };
      }
      // Veterinarians cannot be assigned to animals or enclosures
      if (s.role === 'vet') {
        return {
          ...s,
          assignedAnimalIds: [],
          assignedEnclosureIds: []
        };
      }
      return s;
    }) : [];
    const hasAdmin = currentList.some(s => s.role === 'admin' || s.id === 'STF-ADM-001' || s.email?.toLowerCase() === 'justunme0423@gmail.com');
    if (!hasAdmin) {
      currentList = [adminStaff, ...currentList];
    }
    return currentList;
  };

  // Staff Members State (Synced with TiDB Cloud/Supabase and local fallback)
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() => {
    const saved = localStorage.getItem('feronia_staff_members');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return ensureAdminInStaff(parsed);
      } catch {}
    }
    return ensureAdminInStaff([]);
  });

  useEffect(() => {
    // Subscribe to real-time staff updates from database
    const unsubscribe = subscribeToStaff((databaseStaff) => {
      if (databaseStaff && databaseStaff.length > 0) {
        setStaffMembers(prev => {
          const map = new Map<string, StaffMember>();
          prev.forEach(s => map.set(s.id, s));
          databaseStaff.forEach(s => map.set(s.id, s));
          const merged = ensureAdminInStaff(Array.from(map.values()));
          localStorage.setItem('feronia_staff_members', JSON.stringify(merged));
          return merged;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('feronia_staff_members', JSON.stringify(staffMembers));
  }, [staffMembers]);

  // Archived / Deleted Staff Accounts State
  const [deletedStaff, setDeletedStaff] = useState<DeletedStaffMember[]>(() => {
    const saved = localStorage.getItem('feronia_deleted_staff_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse saved deleted staff members', e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('feronia_deleted_staff_v1', JSON.stringify(deletedStaff));
  }, [deletedStaff]);

  // Modal states for Staff Management
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [handoffStaff, setHandoffStaff] = useState<StaffMember | null>(null);
  const [staffCopied, setStaffCopied] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [isDeletingStaff, setIsDeletingStaff] = useState(false);

  // Staff Added Success Modal state (exact visual from user design)
  const [staffAddedSuccessData, setStaffAddedSuccessData] = useState<{
    name: string;
    role: string;
    email: string;
    tempPassword?: string;
  } | null>(null);
  const [isStaffAddedSuccessOpen, setIsStaffAddedSuccessOpen] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  // Form states for adding staff
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRole, setStaffRole] = useState<'keeper' | 'vet'>('keeper');
  const [staffTempPassword, setStaffTempPassword] = useState('Feronia2026!');
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [staffFormError, setStaffFormError] = useState('');

  // Keeper animal assignment state in Add Staff modal
  const [keeperTargetAnimalCount, setKeeperTargetAnimalCount] = useState<number>(3);
  const [selectedKeeperAnimalIds, setSelectedKeeperAnimalIds] = useState<string[]>([]);
  const [keeperAnimalSearchQuery, setKeeperAnimalSearchQuery] = useState<string>('');
  const [keeperAnimalSpeciesFilter, setKeeperAnimalSpeciesFilter] = useState<string>('All');

  // Reassignment Modal for Existing Keepers
  const [reassigningKeeper, setReassigningKeeper] = useState<StaffMember | null>(null);
  const [reassignSelectedAnimalIds, setReassignSelectedAnimalIds] = useState<string[]>([]);
  const [reassignTargetCount, setReassignTargetCount] = useState<number>(3);
  const [reassignSearchQuery, setReassignSearchQuery] = useState<string>('');

  // Helper to auto-select N animals with priority to unassigned ones
  const autoSelectAnimalsForCount = (targetCount: number, currentSelected: string[] = []): string[] => {
    const activeList = animals.filter(a => !a.isArchived);
    const sorted = [...activeList].sort((a, b) => {
      const aSelected = currentSelected.includes(a.id);
      const bSelected = currentSelected.includes(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      const aUnassigned = !a.assignedKeeperId;
      const bUnassigned = !b.assignedKeeperId;
      if (aUnassigned && !bUnassigned) return -1;
      if (!aUnassigned && bUnassigned) return 1;
      return 0;
    });
    return sorted.slice(0, Math.min(targetCount, sorted.length)).map(a => a.id);
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pass = 'Feronia';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += '2026!';
    setStaffTempPassword(pass);
  };

  const handleOpenAddStaff = () => {
    setStaffName('');
    setStaffEmail('');
    setStaffPhone('');
    setStaffRole('keeper');
    setKeeperTargetAnimalCount(3);
    const initialAutoSelected = autoSelectAnimalsForCount(3);
    setSelectedKeeperAnimalIds(initialAutoSelected);
    setKeeperAnimalSearchQuery('');
    setKeeperAnimalSpeciesFilter('All');
    generateTempPassword();
    setStaffFormError('');
    setIsAddStaffOpen(true);
  };

  const handleOpenReassignModal = (keeper: StaffMember) => {
    if (keeper.role === 'vet') {
      return; // Veterinarians cannot be assigned to animals or enclosures
    }
    setReassigningKeeper(keeper);
    const keeperNameLower = (keeper?.name || '').toLowerCase();
    const existingIds = keeper.assignedAnimalIds && keeper.assignedAnimalIds.length > 0
      ? keeper.assignedAnimalIds
      : animals.filter(a => a.assignedKeeperId === keeper.id || (a.assignedKeeperName && keeperNameLower && (a.assignedKeeperName || '').toLowerCase() === keeperNameLower)).map(a => a.id);
    setReassignSelectedAnimalIds(existingIds);
    setReassignTargetCount(existingIds.length > 0 ? existingIds.length : 3);
    setReassignSearchQuery('');
  };

  const handleSaveReassignStaff = async (newAnimalIds: string[], newEnclosureIds: string[]) => {
    if (!reassigningKeeper || reassigningKeeper.role === 'vet') return;
    const keeperId = reassigningKeeper.id;
    const keeperName = reassigningKeeper.name;

    // Determine facilities from assigned enclosures
    const facilitySet = new Set<string>();
    enclosures
      .filter(e => newEnclosureIds.includes(e.id))
      .forEach(e => {
        if (e.facility) facilitySet.add(e.facility);
        else if (e.name) facilitySet.add(e.name);
      });

    const assignedFacilities = facilitySet.size > 0 
      ? Array.from(facilitySet) 
      : (reassigningKeeper.assignedFacilities || ['Main Facility']);

    const updatedStaff: StaffMember = {
      ...reassigningKeeper,
      assignedAnimalIds: newAnimalIds,
      assignedEnclosureIds: newEnclosureIds,
      assignedFacilities: assignedFacilities,
      dutyLoad: `Primary Care for ${newAnimalIds.length} Reptile${newAnimalIds.length === 1 ? '' : 's'}${newEnclosureIds.length > 0 ? ` (${newEnclosureIds.length} Enclosure${newEnclosureIds.length === 1 ? '' : 's'})` : ''}`
    };

    setStaffMembers(prev => prev.map(s => s.id === keeperId ? updatedStaff : s));
    await saveStaffToFirestore(updatedStaff);
    fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedStaff)
    }).catch(() => {});

    // Update animals
    animals.forEach(anim => {
      const isNowAssigned = newAnimalIds.includes(anim.id);
      const keeperNameLower = (keeperName || '').toLowerCase();
      const wasAssignedToThisKeeper = anim.assignedKeeperId === keeperId || (anim.assignedKeeperName && keeperNameLower && (anim.assignedKeeperName || '').toLowerCase() === keeperNameLower);

      if (isNowAssigned && !wasAssignedToThisKeeper) {
        onUpdateAnimal({
          ...anim,
          assignedKeeperId: keeperId,
          assignedKeeperName: keeperName
        });
      } else if (!isNowAssigned && wasAssignedToThisKeeper) {
        onUpdateAnimal({
          ...anim,
          assignedKeeperId: undefined,
          assignedKeeperName: undefined
        });
      }
    });

    setReassigningKeeper(null);
  };

  const handleStaffCreated = async (newMember: StaffMember, emailResult?: any) => {
    // Safely retrieve latest staff list from localStorage to avoid stale state closures
    let currentStaff = staffMembers;
    try {
      const saved = localStorage.getItem('feronia_staff_members');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const map = new Map<string, StaffMember>();
          currentStaff.forEach(s => { if (s && s.id) map.set(s.id, s); });
          parsed.forEach(s => { if (s && s.id) map.set(s.id, s); });
          currentStaff = Array.from(map.values());
        }
      }
    } catch {}

    const updatedStaffMembers = ensureAdminInStaff([
      newMember,
      ...currentStaff.filter(s => s.id !== newMember.id && (s.email || '').toLowerCase() !== (newMember.email || '').toLowerCase())
    ]);
    setStaffMembers(updatedStaffMembers);
    localStorage.setItem('feronia_staff_members', JSON.stringify(updatedStaffMembers));

    await saveStaffToFirestore(newMember);
    fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMember)
    }).catch(() => {});

    if (newMember.role === 'keeper') {
      localStorage.setItem('feronia_last_created_keeper_id', newMember.id);
      localStorage.setItem('feronia_last_created_keeper_name', newMember.name);
      localStorage.setItem('feronia_last_created_keeper_email', newMember.email);
      localStorage.setItem('feronia_last_created_keeper_phone', newMember.phone || '');
      localStorage.setItem('feronia_keeper_name', newMember.name);
      localStorage.setItem('feronia_keeper_email', newMember.email);
      localStorage.setItem('feronia_keeper_phone', newMember.phone || '');
      if (newMember.dutyLoad) {
        localStorage.setItem('feronia_keeper_bio', newMember.dutyLoad);
      }
    } else if (newMember.role === 'vet') {
      localStorage.setItem('feronia_last_created_vet_id', newMember.id);
      localStorage.setItem('feronia_last_created_vet_name', newMember.name);
      localStorage.setItem('feronia_last_created_vet_email', newMember.email);
      localStorage.setItem('feronia_last_created_vet_phone', newMember.phone || '');
      localStorage.setItem('feronia_vet_name', newMember.name);
      localStorage.setItem('feronia_vet_email', newMember.email);
      localStorage.setItem('feronia_vet_phone', newMember.phone || '');
      if (newMember.dutyLoad) {
        localStorage.setItem('feronia_vet_bio', newMember.dutyLoad);
      }
    }

    // Emit live cross-component events
    window.dispatchEvent(new CustomEvent('feronia_staff_updated', { detail: newMember }));
    window.dispatchEvent(new CustomEvent('feronia_staff_list_updated', { detail: updatedStaffMembers }));

    setIsAddStaffOpen(false);

    // Open user's exact success popup
    setStaffAddedSuccessData({
      name: newMember.name,
      role: newMember.role,
      email: newMember.email,
      tempPassword: newMember.password || 'Feronia2026!'
    });
    setIsStaffAddedSuccessOpen(true);
  };

  const handleTriggerSendEmailInvitation = async (member: StaffMember, customTargetEmail?: string) => {
    setIsResendingEmail(true);
    try {
      await fetch('/api/email/send-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customTargetEmail || member.email,
          name: member.name,
          role: member.role,
          facility: member.assignedFacilities?.[0] || 'Main Facility',
          staffId: member.id,
          tempPassword: member.password || 'Feronia2026!',
          phone: member.phone || '',
          loginUrl: window.location.origin
        })
      });

      setStaffAddedSuccessData({
        name: member.name,
        role: member.role,
        email: customTargetEmail || member.email,
        tempPassword: member.password || 'Feronia2026!'
      });
      setIsStaffAddedSuccessOpen(true);
    } catch {
      setStaffAddedSuccessData({
        name: member.name,
        role: member.role,
        email: customTargetEmail || member.email,
        tempPassword: member.password || 'Feronia2026!'
      });
      setIsStaffAddedSuccessOpen(true);
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleCreateStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim() || !staffEmail.trim() || !staffTempPassword.trim()) {
      setStaffFormError('Please fill in Full Name, Email Address, and Temporary Password.');
      return;
    }

    if (staffMembers.some(s => (s.email || '').toLowerCase() === staffEmail.trim().toLowerCase())) {
      setStaffFormError('A staff member account with this email address already exists.');
      return;
    }

    if (staffRole === 'keeper' && animals.length > 0 && selectedKeeperAnimalIds.length === 0) {
      setStaffFormError('Please allocate at least 1 reptile to this keeper as per facility protocol.');
      return;
    }

    const initialsArr = staffName.trim().split(' ');
    const initials = (initialsArr[0][0] + (initialsArr.length > 1 ? initialsArr[initialsArr.length - 1][0] : '')).toUpperCase();

    const uniqueId = generateUniqueStaffId(staffMembers);

    const newMember: StaffMember = {
      id: uniqueId,
      name: staffName.trim(),
      email: staffEmail.trim(),
      phone: staffPhone.trim(),
      role: staffRole,
      password: staffTempPassword.trim(),
      mustChangePassword: true,
      createdAt: getTodayString(),
      initials,
      dutyLoad: staffRole === 'vet'
        ? 'Medical Checkups & Treatments'
        : (selectedKeeperAnimalIds.length > 0
            ? `Primary Care for ${selectedKeeperAnimalIds.length} Reptile${selectedKeeperAnimalIds.length === 1 ? '' : 's'}`
            : 'Reptile Husbandry & Enclosure Management'),
      assignedAnimalIds: staffRole === 'keeper' ? selectedKeeperAnimalIds : []
    };

    let currentStaff = staffMembers;
    try {
      const saved = localStorage.getItem('feronia_staff_members');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const map = new Map<string, StaffMember>();
          currentStaff.forEach(s => { if (s && s.id) map.set(s.id, s); });
          parsed.forEach(s => { if (s && s.id) map.set(s.id, s); });
          currentStaff = Array.from(map.values());
        }
      }
    } catch {}

    const updatedStaffMembers = ensureAdminInStaff([
      newMember,
      ...currentStaff.filter(s => s.id !== newMember.id && (s.email || '').toLowerCase() !== (newMember.email || '').toLowerCase())
    ]);
    setStaffMembers(updatedStaffMembers);
    localStorage.setItem('feronia_staff_members', JSON.stringify(updatedStaffMembers));

    // Save to TiDB Cloud & MySQL API endpoint
    await saveStaffToFirestore(newMember);
    fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMember)
    }).catch(() => {});

    // Update animals to reflect new keeper assignment
    if (staffRole === 'keeper' && selectedKeeperAnimalIds.length > 0) {
      selectedKeeperAnimalIds.forEach(animId => {
        const anim = animals.find(a => a.id === animId);
        if (anim) {
          onUpdateAnimal({
            ...anim,
            assignedKeeperId: newMember.id,
            assignedKeeperName: newMember.name
          });
        }
      });
    }

    if (staffRole === 'keeper') {
      localStorage.setItem('feronia_last_created_keeper_id', newMember.id);
      localStorage.setItem('feronia_last_created_keeper_name', newMember.name);
      localStorage.setItem('feronia_last_created_keeper_email', newMember.email);
      localStorage.setItem('feronia_last_created_keeper_phone', newMember.phone || '');
      localStorage.setItem('feronia_keeper_name', newMember.name);
      localStorage.setItem('feronia_keeper_email', newMember.email);
      localStorage.setItem('feronia_keeper_phone', newMember.phone || '');
      localStorage.setItem('feronia_current_user_id', newMember.id);
      localStorage.setItem('feronia_current_user_name', newMember.name);
      localStorage.setItem('feronia_current_user_email', newMember.email);
      localStorage.setItem('feronia_current_user_phone', newMember.phone || '');
      if (newMember.dutyLoad) {
        localStorage.setItem('feronia_keeper_bio', newMember.dutyLoad);
      }
    } else if (staffRole === 'vet') {
      localStorage.setItem('feronia_last_created_vet_id', newMember.id);
      localStorage.setItem('feronia_last_created_vet_name', newMember.name);
      localStorage.setItem('feronia_last_created_vet_email', newMember.email);
      localStorage.setItem('feronia_last_created_vet_phone', newMember.phone || '');
      localStorage.setItem('feronia_vet_name', newMember.name);
      localStorage.setItem('feronia_vet_email', newMember.email);
      localStorage.setItem('feronia_vet_phone', newMember.phone || '');
      localStorage.setItem('feronia_current_user_id', newMember.id);
      localStorage.setItem('feronia_current_user_name', newMember.name);
      localStorage.setItem('feronia_current_user_email', newMember.email);
      localStorage.setItem('feronia_current_user_phone', newMember.phone || '');
      if (newMember.dutyLoad) {
        localStorage.setItem('feronia_vet_bio', newMember.dutyLoad);
      }
    }

    // Emit live cross-component events
    window.dispatchEvent(new CustomEvent('feronia_staff_updated', { detail: newMember }));
    window.dispatchEvent(new CustomEvent('feronia_staff_list_updated', { detail: updatedStaffMembers }));

    setIsAddStaffOpen(false);
    setHandoffStaff(newMember);
  };

  const handleCopyHandoffCredentials = (staff: StaffMember) => {
    const text = `FERONIA WILDLIFE FACILITY - NEW ACCOUNT CREDENTIALS
Name: ${staff.name}
Role: ${staff.role.toUpperCase()}
Email: ${staff.email}
Temporary Password: ${staff.password}
Status: Temporary Password (Must change on first login)`;

    navigator.clipboard.writeText(text);
    setStaffCopied(true);
    setTimeout(() => setStaffCopied(false), 2500);
  };

  const handleResetStaffPassword = async (id: string) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let newTemp = 'Feronia';
    for (let i = 0; i < 3; i++) {
      newTemp += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    newTemp += '!';

    let updatedTarget: StaffMember | null = null;
    setStaffMembers(prev => prev.map(s => {
      if (s.id === id) {
        const updated = { ...s, password: newTemp, mustChangePassword: true };
        updatedTarget = updated;
        setHandoffStaff(updated);
        return updated;
      }
      return s;
    }));

    if (updatedTarget) {
      await saveStaffToFirestore(updatedTarget);
      fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTarget)
      }).catch(() => {});
    }
  };

  const handleDeleteStaff = (id: string) => {
    const target = staffMembers.find(s => s.id === id);
    if (target) {
      setStaffToDelete(target);
    }
  };

  const handleToggleStaffStatus = async (id: string) => {
    const target = staffMembers.find(s => s.id === id);
    if (!target) return;
    const currentStatus = target.status || 'Active';
    const newStatus: 'Active' | 'Inactive' = currentStatus === 'Active' ? 'Inactive' : 'Active';
    const updatedTarget: StaffMember = {
      ...target,
      status: newStatus
    };
    setStaffMembers(prev => prev.map(s => s.id === id ? updatedTarget : s));
    await saveStaffToFirestore(updatedTarget);
    fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTarget)
    }).catch(() => {});
  };

  const handleConfirmDeleteSingleStaff = async () => {
    if (!staffToDelete) return;
    const targetId = staffToDelete.id;
    const targetName = staffToDelete.name;
    setIsDeletingStaff(true);
    try {
      // 1. Archive the staff member with all their information
      const assignedAnims = animals.filter(anim => anim.assignedKeeperId === targetId || (targetName && anim.assignedKeeperName === targetName));
      const deletedMember: DeletedStaffMember = {
        ...staffToDelete,
        deletedAt: new Date().toISOString(),
        deletedBy: `${profileName || 'Justin Admin'} (Administrator)`,
        deletionReason: 'Staff account removed from active roster by Administrator',
        previousAssignedAnimalsCount: assignedAnims.length,
        previousAssignedAnimalNames: assignedAnims.map(a => a.name ? `${a.name} (${a.id})` : a.id)
      };
      setDeletedStaff(prev => [deletedMember, ...prev.filter(s => s.id !== targetId)]);

      // 2. Remove from local state and update local storage
      setStaffMembers(prev => {
        const next = prev.filter(s => s.id !== targetId);
        localStorage.setItem('feronia_staff_members', JSON.stringify(next));
        return next;
      });

      // 3. Unassign any animals that were allocated to this keeper
      animals.forEach(anim => {
        if (anim.assignedKeeperId === targetId || (targetName && anim.assignedKeeperName === targetName)) {
          onUpdateAnimal({
            ...anim,
            assignedKeeperId: undefined,
            assignedKeeperName: undefined
          });
        }
      });

      // 4. Delete from database & backend API
      await deleteStaffFromFirestore(targetId);
      fetch(`/api/staff/${targetId}`, { method: 'DELETE' }).catch(() => {});
    } finally {
      setIsDeletingStaff(false);
      setStaffToDelete(null);
    }
  };

  const handleRestoreStaff = async (staffToRestore: DeletedStaffMember) => {
    const { deletedAt, deletedBy, deletionReason, previousAssignedAnimalsCount, previousAssignedAnimalNames, ...cleanStaff } = staffToRestore;
    setStaffMembers(prev => [cleanStaff, ...prev.filter(s => s.id !== cleanStaff.id)]);
    setDeletedStaff(prev => prev.filter(s => s.id !== cleanStaff.id));
    await saveStaffToFirestore(cleanStaff);
    fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanStaff)
    }).catch(() => {});
  };

  const handlePermanentDeleteStaff = (id: string) => {
    setDeletedStaff(prev => prev.filter(s => s.id !== id));
  };

  const handleRestoreDefaultStaff = () => {
    setStaffMembers(INITIAL_STAFF_MEMBERS);
    localStorage.setItem('feronia_staff_members', JSON.stringify(INITIAL_STAFF_MEMBERS));
    INITIAL_STAFF_MEMBERS.forEach(member => {
      saveStaffToFirestore(member);
      fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member)
      }).catch(() => {});
    });
  };

  // Filtered active (non-archived) animals
  const activeAnimals = animals.filter(a => !a.isArchived);
  const archivedAnimals = animals.filter(a => a.isArchived);

  // Dynamic unique species list from active animals
  const uniqueSpecies = Array.from(new Set(activeAnimals.map(a => a.species)));

  const filteredAnimals = activeAnimals.filter(animal => {
    const matchesSearch = (animal.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (animal.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (animal.species || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSex = sexFilter === 'All' || animal.sex === sexFilter;
    const hasPendingApproval = appointments.some(a => (a.status === 'Pending Approval' || a.status === 'Pending') && a.animalId === animal.id);
    const matchesStatus = statusFilter === 'All'
      ? true
      : statusFilter === 'Pending Request'
      ? hasPendingApproval
      : animal.healthStatus === statusFilter;
    const matchesSpecies = speciesFilter === 'All' || animal.species === speciesFilter;
    return matchesSearch && matchesSex && matchesStatus && matchesSpecies;
  });

  // Calculations for stats
  const totalAnimalsCount = activeAnimals.length;
  const maleCount = activeAnimals.filter(a => a.sex === 'Male').length;
  const femaleCount = activeAnimals.filter(a => a.sex === 'Female').length;
  const uniqueSpeciesCount = uniqueSpecies.length;

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${
      isDarkMode ? 'bg-[#04140D] text-white' : 'bg-[#F4F7F5] text-slate-800'
    }`}>
      
      {/* Sidebar - Desktop */}
      <aside className={`hidden lg:flex w-64 flex-col justify-between shrink-0 border-r z-20 h-full overflow-hidden transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-[#06180F] text-emerald-100 border-emerald-950/60' 
          : 'bg-white text-slate-800 border-slate-200/80 shadow-xs'
      }`}>
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar justify-between pb-4">
          <div className="flex flex-col">
            {/* Logo */}
            <div className={`p-4 border-b flex items-center space-x-3 transition-colors ${
              isDarkMode ? 'border-emerald-950/60 bg-[#04110A]' : 'border-slate-200/80 bg-emerald-50/50'
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                isDarkMode ? 'bg-emerald-900/50 border-emerald-500/30' : 'bg-emerald-100 border-emerald-300'
              }`}>
                <Leaf className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400 fill-emerald-400/20' : 'text-emerald-700 fill-emerald-700/20'}`} />
              </div>
              <div>
                <span className={`font-black text-base tracking-wider block leading-none ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>FERONIA</span>
                <span className={`text-[10px] font-extrabold tracking-wider block mt-1.5 leading-none ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>WILDLIFE FACILITY</span>
              </div>
            </div>

            {/* Profile Card */}
            <div className={`p-3.5 border-b transition-colors ${
              isDarkMode ? 'border-emerald-950/40 bg-[#05160E]/50' : 'border-slate-200/80 bg-slate-50/60'
            }`}>
              <div className={`w-full text-left p-2.5 rounded-2xl border flex items-center space-x-3 transition-colors ${
                isDarkMode ? 'bg-emerald-950/40 border-emerald-900/30' : 'bg-white border-slate-200 shadow-2xs'
              }`}>
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full overflow-hidden border-2 flex items-center justify-center font-bold text-base shadow-inner ${
                    isDarkMode ? 'bg-emerald-800 border-emerald-500 text-white' : 'bg-emerald-700 border-emerald-500 text-white'
                  }`}>
                    {profileAvatar}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 rounded-full animate-pulse ${
                    isDarkMode ? 'border-[#06180F]' : 'border-white'
                  }`}></span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-black leading-tight truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{profileName}</p>
                  <p className={`text-[10px] font-bold leading-tight mt-0.5 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Administrator</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <span className={`text-[9px] font-extrabold uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>● ONLINE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="p-3 space-y-1">
              {/* 1. Dashboard */}
              <button
                type="button"
                onClick={() => setActiveMenu('dashboard')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMenu === 'dashboard'
                    ? (isDarkMode ? 'bg-[#113C24] text-white shadow-md border-l-4 border-emerald-400' : 'bg-emerald-800 text-white shadow-md border-l-4 border-emerald-500')
                    : (isDarkMode ? 'text-emerald-100/60 hover:bg-emerald-900/20 hover:text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900')
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <LayoutGrid className={`w-3.5 h-3.5 shrink-0 ${activeMenu === 'dashboard' ? 'text-white' : (isDarkMode ? 'text-emerald-300/60' : 'text-slate-400')}`} />
                  <span className="truncate">Dashboard</span>
                </div>
              </button>

              <div className={`my-1.5 border-t ${isDarkMode ? 'border-emerald-950/60' : 'border-slate-200/60'}`} />

              {/* 2. Sanctuary Assets & Operations (Flat list without Operations accordion) */}
              {[
                { id: 'animals', label: 'Animals', icon: PawPrint, badge: pendingApprovalsCount },
                { id: 'enclosures', label: 'Enclosures', icon: Shield },
                { id: 'inventory', label: 'Inventory', icon: Package },
                { id: 'breeding', label: 'Breeding', icon: Heart },
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === 'animals') {
                        setStatusFilter('All');
                        setSpeciesFilter('All');
                        setSexFilter('All');
                        setSearchQuery('');
                      }
                      setActiveMenu(item.id as any);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive 
                        ? (isDarkMode ? 'bg-[#113C24] text-white shadow-md border-l-4 border-emerald-400' : 'bg-emerald-800 text-white shadow-md border-l-4 border-emerald-500')
                        : (isDarkMode ? 'text-emerald-100/60 hover:bg-emerald-900/20 hover:text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900')
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : (isDarkMode ? 'text-emerald-300/60' : 'text-slate-400')}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full shrink-0 ml-1.5 ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`} title={`${item.badge} Health & Vet Request(s) awaiting authorization`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className={`my-1.5 border-t ${isDarkMode ? 'border-emerald-950/60' : 'border-slate-200/60'}`} />

              {/* 4. User Management */}
              {[
                { id: 'users', label: 'User Management', icon: Users },
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveMenu(item.id as any)}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive 
                        ? (isDarkMode ? 'bg-[#113C24] text-white shadow-md border-l-4 border-emerald-400' : 'bg-emerald-800 text-white shadow-md border-l-4 border-emerald-500')
                        : (isDarkMode ? 'text-emerald-100/60 hover:bg-emerald-900/20 hover:text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900')
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : (isDarkMode ? 'text-emerald-300/60' : 'text-slate-400')}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                  </button>
                );
              })}

              <div className={`my-1.5 border-t ${isDarkMode ? 'border-emerald-950/60' : 'border-slate-200/60'}`} />

              {/* 5. Reports & Archive */}
              {[
                { id: 'reports', label: 'Reports', icon: FileText },
                { id: 'archive', label: 'Archive', icon: FolderArchive }
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveMenu(item.id as any)}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive 
                        ? (isDarkMode ? 'bg-[#113C24] text-white shadow-md border-l-4 border-emerald-400' : 'bg-emerald-800 text-white shadow-md border-l-4 border-emerald-500')
                        : (isDarkMode ? 'text-emerald-100/60 hover:bg-emerald-900/20 hover:text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900')
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : (isDarkMode ? 'text-emerald-300/60' : 'text-slate-400')}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Clean footer */}
          <div className={`p-3 text-center border-t ${
            isDarkMode ? 'border-emerald-950/40 bg-[#04110A]/30 text-emerald-500/50' : 'border-slate-200/80 bg-slate-50/50 text-slate-400'
          }`}>
            <p className="text-[9px] font-bold uppercase tracking-widest leading-none">© 2026 FERONIA</p>
            <p className="text-[8px] mt-1 leading-none opacity-80">All rights reserved.</p>
          </div>
        </div>
      </aside>

      {/* Sidebar - Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/80 backdrop-blur-xs">
          <div className={`w-64 flex flex-col justify-between h-full border-r shadow-2xl relative ${
            isDarkMode ? 'bg-[#06180F] text-emerald-100 border-emerald-950' : 'bg-white text-slate-800 border-slate-200'
          }`}>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors cursor-pointer z-50 border ${
                isDarkMode ? 'bg-emerald-950 hover:bg-emerald-900/50 text-emerald-300 border-emerald-900/40' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex flex-col h-full overflow-y-auto no-scrollbar justify-between pb-4">
              <div className="flex flex-col">
                {/* Logo */}
                <div className={`p-6 border-b flex items-center space-x-3 ${
                  isDarkMode ? 'border-emerald-950 bg-[#04110A]' : 'border-slate-200 bg-emerald-50/50'
                }`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                    isDarkMode ? 'bg-emerald-900/50 border-emerald-500/30' : 'bg-emerald-100 border-emerald-300'
                  }`}>
                    <Leaf className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400 fill-emerald-400/20' : 'text-emerald-700 fill-emerald-700/20'}`} />
                  </div>
                  <div>
                    <span className={`font-black text-base tracking-wider block leading-none ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>FERONIA</span>
                    <span className={`text-[10px] font-extrabold tracking-wider block mt-1.5 leading-none ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>WILDLIFE FACILITY</span>
                  </div>
                </div>

                {/* Profile Card */}
                <div className={`p-5 border-b ${
                  isDarkMode ? 'border-emerald-950/40 bg-[#05160E]/50' : 'border-slate-200 bg-slate-50/60'
                }`}>
                  <div className={`p-3 rounded-2xl border flex items-center space-x-3 ${
                    isDarkMode ? 'bg-emerald-950/40 border-emerald-900/30' : 'bg-white border-slate-200 shadow-2xs'
                  }`}>
                    <div className="relative">
                      <div className={`w-11 h-11 rounded-full overflow-hidden border-2 flex items-center justify-center font-bold text-sm ${
                        isDarkMode ? 'bg-emerald-800 border-emerald-500 text-white' : 'bg-emerald-700 border-emerald-500 text-white'
                      }`}>
                        {profileName ? profileName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'JA'}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 rounded-full ${
                        isDarkMode ? 'border-[#06180F]' : 'border-white'
                      }`}></span>
                    </div>
                    <div>
                      <p className={`text-sm font-black leading-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{profileName || 'Justin Admin'}</p>
                      <p className={`text-xs font-bold leading-tight mt-1 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Administrator</p>
                      <div className="flex items-center space-x-1 mt-1.5">
                        <span className={`text-[10px] font-extrabold uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>● ONLINE</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation Items */}
                <nav className="p-4 space-y-1.5">
                  {/* 1. Dashboard */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenu('dashboard');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeMenu === 'dashboard'
                        ? (isDarkMode ? 'bg-[#113C24] text-white shadow-md border-l-4 border-emerald-400' : 'bg-emerald-800 text-white shadow-md border-l-4 border-emerald-500')
                        : (isDarkMode ? 'text-emerald-100/60 hover:bg-emerald-900/20 hover:text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900')
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <LayoutGrid className={`w-4 h-4 shrink-0 ${activeMenu === 'dashboard' ? 'text-white' : (isDarkMode ? 'text-emerald-300/60' : 'text-slate-400')}`} />
                      <span className="truncate">Dashboard</span>
                    </div>
                  </button>

                  <div className={`my-2 border-t ${isDarkMode ? 'border-emerald-950/60' : 'border-slate-200/60'}`} />

                  {/* 2. Sanctuary Assets & Operations (Flat list without Operations accordion) */}
                  {[
                    { id: 'animals', label: 'Animals', icon: PawPrint, badge: pendingApprovalsCount },
                    { id: 'enclosures', label: 'Enclosures', icon: Shield },
                    { id: 'inventory', label: 'Inventory', icon: Package },
                    { id: 'breeding', label: 'Breeding', icon: Heart },
                  ].map(item => {
                    const Icon = item.icon;
                    const isActive = activeMenu === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (item.id === 'animals') {
                            setStatusFilter('All');
                            setSpeciesFilter('All');
                            setSexFilter('All');
                            setSearchQuery('');
                          }
                          setActiveMenu(item.id as any);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive 
                            ? (isDarkMode ? 'bg-[#113C24] text-white shadow-md border-l-4 border-emerald-400' : 'bg-emerald-800 text-white shadow-md border-l-4 border-emerald-500')
                            : (isDarkMode ? 'text-emerald-100/60 hover:bg-emerald-900/20 hover:text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900')
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : (isDarkMode ? 'text-emerald-300/60' : 'text-slate-400')}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ml-1.5 ${
                            isActive
                              ? 'bg-amber-400 text-slate-950 shadow-xs'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  <div className={`my-2 border-t ${isDarkMode ? 'border-emerald-950/60' : 'border-slate-200/60'}`} />

                  {/* 4. User Management */}
                  {[
                    { id: 'users', label: 'User Management', icon: Users },
                  ].map(item => {
                    const Icon = item.icon;
                    const isActive = activeMenu === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveMenu(item.id as any);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive 
                            ? (isDarkMode ? 'bg-[#113C24] text-white shadow-md border-l-4 border-emerald-400' : 'bg-emerald-800 text-white shadow-md border-l-4 border-emerald-500')
                            : (isDarkMode ? 'text-emerald-100/60 hover:bg-emerald-900/20 hover:text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900')
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : (isDarkMode ? 'text-emerald-300/60' : 'text-slate-400')}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                      </button>
                    );
                  })}

                  <div className={`my-2 border-t ${isDarkMode ? 'border-emerald-950/60' : 'border-slate-200/60'}`} />

                  {/* 5. Reports & Archive */}
                  {[
                    { id: 'reports', label: 'Reports', icon: FileText },
                    { id: 'archive', label: 'Archive', icon: FolderArchive }
                  ].map(item => {
                    const Icon = item.icon;
                    const isActive = activeMenu === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveMenu(item.id as any);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive 
                            ? (isDarkMode ? 'bg-[#113C24] text-white shadow-md border-l-4 border-emerald-400' : 'bg-emerald-800 text-white shadow-md border-l-4 border-emerald-500')
                            : (isDarkMode ? 'text-emerald-100/60 hover:bg-emerald-900/20 hover:text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900')
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : (isDarkMode ? 'text-emerald-300/60' : 'text-slate-400')}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Footer inside mobile sidebar */}
              <div className="p-4 text-center">
                <p className="text-[9px] text-emerald-500/50 font-bold uppercase tracking-widest leading-none">© 2026 FERONIA</p>
                <p className="text-[8px] text-emerald-500/30 mt-1 leading-none">All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Topbar */}
        <header className={`h-20 border-b flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 transition-colors duration-300 ${
          isDarkMode ? 'bg-[#061A10] border-emerald-950/60 text-white' : 'bg-white border-slate-100 text-slate-800'
        }`}>
          <div className="flex items-center space-x-3 flex-1 max-w-xs md:max-w-md mr-3">
            {/* Hamburger menu button for mobile screens */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`p-2 rounded-xl border transition-colors lg:hidden shrink-0 cursor-pointer ${
                isDarkMode 
                  ? 'border-emerald-900/60 bg-[#04140D] hover:bg-emerald-950/60 text-emerald-300' 
                  : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100 text-[#113C24]'
              }`}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs focus:outline-none transition-all ${
                  isDarkMode 
                    ? 'border-emerald-950 bg-[#04140D] text-white focus:border-emerald-500' 
                    : 'border-slate-100 bg-slate-50/50 text-slate-800 focus:border-[#113C24]'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
            {/* System Date Badge */}
            <SystemDateBadge
              systemDate={systemDate}
              onUpdateSystemDate={handleUpdateSystemDate}
              isDarkMode={isDarkMode}
            />

            <button
              onClick={() => setIsQrScannerOpen(true)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 border text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                isDarkMode 
                  ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300 hover:bg-emerald-900/30' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title="Scan Enclosure QR Code"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">QR Scan</span>
            </button>

            {/* Dark Mode toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                isDarkMode 
                  ? 'bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/60 border-emerald-800/40 hover:text-emerald-300' 
                  : 'bg-emerald-50 text-[#113C24] hover:bg-emerald-100 border-emerald-100 hover:text-[#1B5234]'
              }`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification Bell with System Alerts Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsAdminNotificationOpen(!isAdminNotificationOpen)}
                className={`relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                  isAdminNotificationOpen
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/40'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
                title="System Alerts, Pending Requests & Inventory Notifications"
              >
                {totalAdminAlertsCount > 0 && (
                  <>
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full animate-ping bg-rose-500" />
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-black text-white bg-rose-600 shadow-xs">
                      {totalAdminAlertsCount > 9 ? '9+' : totalAdminAlertsCount}
                    </span>
                  </>
                )}
                <Bell className="w-4 h-4" />
              </button>

              <AdminNotificationDropdown
                isOpen={isAdminNotificationOpen}
                onClose={() => setIsAdminNotificationOpen(false)}
                appointments={appointments}
                animals={animals}
                inventory={inventory}
                transfers={transfers}
                staffMembers={staffMembers}
                systemDate={systemDate}
                isDarkMode={isDarkMode}
                readIds={adminReadIds}
                onMarkAsRead={handleMarkAdminNotifRead}
                onMarkAllAsRead={handleMarkAllAdminNotifsRead}
                tasks={tasks}
                onNavigateToAnimal={(animal, initialTab) => {
                  setSelectedAnimal(animal);
                  setSelectedAnimalInitialTab(initialTab);
                  setActiveMenu('animals');
                }}
                onNavigateToInventory={() => {
                  setActiveMenu('inventory');
                }}
                onNavigateToReports={() => {
                  setActiveMenu('reports');
                }}
                onNavigateToApprovals={() => {
                  setActiveMenu('animals');
                  setStatusFilter('Pending Request');
                }}
              />
            </div>

            <div className={`relative flex items-center sm:pl-4 sm:border-l ${isDarkMode ? 'border-emerald-950' : 'border-slate-200'}`}>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Profile & Settings"
              >
                <UserAvatar
                  avatar={profileAvatar}
                  name={profileName}
                  size="md"
                  isDarkMode={isDarkMode}
                />
              </button>

              {isProfileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)} />
                  <div className={`absolute right-0 top-12 w-64 rounded-2xl border shadow-2xl z-50 p-4 transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-[#061A10] border-emerald-950/60 text-white shadow-emerald-950/20' 
                      : 'bg-white border-slate-100 text-slate-800 shadow-slate-200/50'
                  }`}>
                    <div className="flex items-center space-x-3 border-b pb-3 mb-3 border-emerald-950/20 dark:border-emerald-950/60">
                      <UserAvatar
                        avatar={profileAvatar}
                        name={profileName}
                        size="lg"
                        isDarkMode={isDarkMode}
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className={`text-xs font-black truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{profileName}</h4>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{profileEmail}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          openProfileModal();
                        }}
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left ${
                          isDarkMode ? 'hover:bg-emerald-900/20 text-emerald-100' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <Settings className="w-4 h-4 text-emerald-400" />
                        <span>Settings</span>
                      </button>
                      
                      <div className="border-t my-2 border-emerald-950/10 dark:border-emerald-950/40" />
                      
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left text-red-500 hover:bg-red-500/10"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className={`flex-1 overflow-y-auto p-8 transition-colors duration-300 ${isDarkMode ? 'bg-[#05160E]' : 'bg-[#F4F7F5]'}`}>
          
          {/* 1. ANIMALS MODULE */}
          {activeMenu === 'animals' && (
            <AdminAnimalsView
              animals={animals}
              enclosures={enclosures}
              appointments={appointments}
              staffMembers={staffMembers}
              isDarkMode={isDarkMode}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              speciesFilter={speciesFilter}
              setSpeciesFilter={setSpeciesFilter}
              sexFilter={sexFilter}
              setSexFilter={setSexFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              selectedAnimal={selectedAnimal}
              onSelectAnimal={(animal, initialTab) => {
                setSelectedAnimalInitialTab(initialTab);
                setSelectedAnimal(animal);
              }}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenEditModal={(animal) => {
                setEditingAnimal(animal);
                setIsEditAnimalModalOpen(true);
              }}
              onOpenDeleteModal={(animal) => {
                setAnimalToDelete(animal);
                setIsDeleteModalOpen(true);
              }}
              onDeleteAppointment={onDeleteAppointment}
              onUpdateAppointmentStatus={onUpdateAppointmentStatus}
              onBackToDashboard={handleGoBack}
              onBack={handleGoBack}
            />
          )}

          {/* 2. ENCLOSURES MODULE */}
          {activeMenu === 'enclosures' && (
            <AdminEnclosuresView
              enclosures={enclosures}
              animals={animals}
              facilitiesList={facilitiesList}
              isDarkMode={isDarkMode}
              selectedBranch={selectedBranch}
              setSelectedBranch={setSelectedBranch}
              enclosureSpeciesFilter={enclosureSpeciesFilter}
              setEnclosureSpeciesFilter={setEnclosureSpeciesFilter}
              enclosureSearch={enclosureSearch}
              setEnclosureSearch={setEnclosureSearch}
              enclosureViewMode={enclosureViewMode}
              setEnclosureViewMode={setEnclosureViewMode}
              onOpenAddEnclosureModal={handleOpenAddEnclosureModal}
              onOpenQrScanner={() => setIsQrScannerOpen(true)}
              onSelectEnclosure={(enc) => setSelectedEnclosureForModal(enc)}
              onSelectQrPass={(enc) => setQrTargetEnclosure(enc)}
              onCardImageUpload={handleCardImageUpload}
              onBackToDashboard={handleGoBack}
              onBack={handleGoBack}
            />
          )}

          {/* 3. BREEDING MODULE */}
          {activeMenu === 'breeding' && (
            <BreedingModule
              animals={animals}
              enclosures={enclosures}
              onUpdateEnclosure={onUpdateEnclosure}
              medicalRecords={medicalRecords}
              breedingRecords={breedingRecords}
              onAddBreedingRecord={onAddBreedingRecord}
              onUpdateBreedingRecord={onUpdateBreedingRecord}
              onDeleteBreedingRecord={onDeleteBreedingRecord}
              breedingAssessments={breedingAssessments}
              onAddBreedingAssessment={onAddBreedingAssessment || (() => {})}
              onUpdateBreedingAssessment={onUpdateBreedingAssessment}
              onDeleteBreedingAssessment={onDeleteBreedingAssessment}
              onAddTask={onAddTask}
              onUpdateAnimal={onUpdateAnimal}
              staffMembers={staffMembers}
              isDarkMode={isDarkMode}
              systemDate={systemDate}
              onBackToDashboard={handleGoBack}
              onBack={handleGoBack}
            />
          )}

          {/* 4. USERS / STAFF MANAGEMENT MODULE */}
          {activeMenu === 'users' && (
            <StaffManagementView
              staffMembers={staffMembers}
              animals={animals}
              enclosures={enclosures}
              isDarkMode={isDarkMode}
              onAddStaff={handleOpenAddStaff}
              onOpenReassign={handleOpenReassignModal}
              onOpenCredentials={(member) => setHandoffStaff(member)}
              onResetPassword={handleResetStaffPassword}
              onDeleteStaff={handleDeleteStaff}
              onToggleStatus={handleToggleStaffStatus}
              onRestoreDefaultRoster={handleRestoreDefaultStaff}
              onSendEmailInvitation={handleTriggerSendEmailInvitation}
              onBackToDashboard={handleGoBack}
              onBack={handleGoBack}
            />
          )}

          {/* 5. REPORTS MODULE */}
          {activeMenu === 'reports' && (
            <AdminReportsView
              animals={animals}
              enclosures={enclosures}
              inventory={inventory}
              medicalRecords={medicalRecords}
              transfers={transfers}
              breedingRecords={breedingRecords}
              staffMembers={staffMembers}
              isDarkMode={isDarkMode}
              systemDate={systemDate}
              onBackToDashboard={handleGoBack}
              onBack={handleGoBack}
            />
          )}

          {/* 6. INVENTORY MODULE */}
          {activeMenu === 'inventory' && (
            <InventoryModule
              inventory={inventory}
              onUpdateInventory={onUpdateInventory}
              isDarkMode={isDarkMode}
              canDelete={true}
              userRole="admin"
              onItemAction={onInventoryAction}
              onBackToDashboard={handleGoBack}
              onBack={handleGoBack}
            />
          )}

          {/* 7. ARCHIVE MODULE */}
          {activeMenu === 'archive' && (
            <ArchiveRecordsModule
              archivedAnimals={archivedAnimals}
              onUpdateAnimal={onUpdateAnimal}
              onDeleteAnimal={onDeleteAnimal}
              onPermanentDeleteAnimal={onPermanentDeleteAnimal}
              onSelectAnimalForDetail={(animal) => setSelectedAnimal(animal)}
              isDarkMode={isDarkMode}
              deletedInventory={deletedInventory}
              onRestoreInventoryItem={onRestoreInventoryItem}
              onPermanentDeleteInventoryItem={onPermanentDeleteInventoryItem}
              deletedStaff={deletedStaff}
              onRestoreStaff={handleRestoreStaff}
              onPermanentDeleteStaff={handlePermanentDeleteStaff}
              deletedEnclosures={deletedEnclosures}
              onRestoreEnclosure={onRestoreEnclosure}
              onPermanentDeleteEnclosure={onPermanentDeleteEnclosure}
              deletedTasks={deletedTasks}
              onRestoreTask={onRestoreTask}
              onPermanentDeleteTask={onPermanentDeleteTask}
              deletedMedicalRecords={deletedMedicalRecords}
              onRestoreMedicalRecord={onRestoreMedicalRecord}
              onPermanentDeleteMedicalRecord={onPermanentDeleteMedicalRecord}
              deletedBreedingRecords={deletedBreedingRecords}
              onRestoreBreedingRecord={onRestoreBreedingRecord}
              onPermanentDeleteBreedingRecord={onPermanentDeleteBreedingRecord}
              deletedAppointments={deletedAppointments}
              onRestoreAppointment={onRestoreAppointment}
              onPermanentDeleteAppointment={onPermanentDeleteAppointment}
              onClearAllArchives={() => {
                setDeletedStaff([]);
                localStorage.setItem('feronia_deleted_staff_v1', JSON.stringify([]));
                onClearAllArchives?.();
              }}
              onBackToDashboard={handleGoBack}
              onBack={handleGoBack}
            />
          )}

          {/* 8. DASHBOARD MODULE */}
          {activeMenu === 'dashboard' && (
            <div className="space-y-6">
              {/* Header section with welcome and facility status */}
              <div className="p-5 rounded-2xl border transition-all bg-gradient-to-r from-emerald-950 via-[#071F11] to-emerald-950 text-white border-emerald-900/40 shadow-md">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
                      Operational
                    </span>
                    <span className="text-xs text-emerald-300/80 font-medium">Feronia Wildlife Facility</span>
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-white">
                    Good day, {profileName || 'Justin Admin'}! 👋
                  </h1>
                  <p className="text-xs text-emerald-200/80 font-medium">
                    All wildlife systems are active. Manage species records, enclosure health, and staff schedules.
                  </p>
                </div>
              </div>

              {/* Veterinary Approvals Action Banner */}
              {pendingApprovalsCount > 0 && (
                <div 
                  onClick={() => setActiveMenu('approvals')}
                  className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-amber-500/15 transition-all group shadow-xs"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <ClipboardCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-amber-400 transition-colors">
                          {pendingApprovalsCount} Follow-up Check-up Request{pendingApprovalsCount === 1 ? '' : 's'} Awaiting Authorization
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                          Action Required
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Clinical staff submitted follow-up examinations and check-up recommendations for administrative review and scheduling.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shrink-0 shadow-xs">
                    <span>Review & Authorize</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              )}

              {/* Top Row KPI Cards - Matching screenshot layout */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {/* 1. Total Animals */}
                <div 
                  onClick={() => setActiveMenu('animals')}
                  className={`p-4 rounded-2xl border flex items-center space-x-3.5 transition-all cursor-pointer group hover:-translate-y-0.5 ${
                    isDarkMode 
                      ? 'bg-[#05150D] border-emerald-950/60 hover:border-emerald-800 text-white' 
                      : 'bg-white border-slate-100 hover:border-emerald-200 shadow-xs text-slate-800'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <PawPrint className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Total Animals</p>
                    <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none mt-1">{totalAnimalsCount}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">All facilities</p>
                  </div>
                </div>

                {/* 2. Male */}
                <div 
                  onClick={() => setActiveMenu('animals')}
                  className={`p-4 rounded-2xl border flex items-center space-x-3.5 transition-all cursor-pointer group hover:-translate-y-0.5 ${
                    isDarkMode 
                      ? 'bg-[#05150D] border-emerald-950/60 hover:border-emerald-800 text-white' 
                      : 'bg-white border-slate-100 hover:border-emerald-200 shadow-xs text-slate-800'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100/80 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-black text-lg">
                    ♂
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Male</p>
                    <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none mt-1">{maleCount}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                      {totalAnimalsCount > 0 ? Math.round((maleCount / totalAnimalsCount) * 100) : 0}% of total
                    </p>
                  </div>
                </div>

                {/* 3. Female */}
                <div 
                  onClick={() => setActiveMenu('animals')}
                  className={`p-4 rounded-2xl border flex items-center space-x-3.5 transition-all cursor-pointer group hover:-translate-y-0.5 ${
                    isDarkMode 
                      ? 'bg-[#05150D] border-emerald-950/60 hover:border-emerald-800 text-white' 
                      : 'bg-white border-slate-100 hover:border-emerald-200 shadow-xs text-slate-800'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-purple-100/80 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 font-black text-lg">
                    ♀
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Female</p>
                    <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none mt-1">{femaleCount}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                      {totalAnimalsCount > 0 ? Math.round((femaleCount / totalAnimalsCount) * 100) : 0}% of total
                    </p>
                  </div>
                </div>

                {/* 4. Enclosures */}
                <div 
                  onClick={() => setActiveMenu('enclosures')}
                  className={`p-4 rounded-2xl border flex items-center space-x-3.5 transition-all cursor-pointer group hover:-translate-y-0.5 ${
                    isDarkMode 
                      ? 'bg-[#05150D] border-emerald-950/60 hover:border-emerald-800 text-white' 
                      : 'bg-white border-slate-100 hover:border-emerald-200 shadow-xs text-slate-800'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-amber-100/80 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Enclosures</p>
                    <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none mt-1">{enclosures.length}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">Active enclosures</p>
                  </div>
                </div>

                {/* 5. Keeper Care & Feeding Tasks */}
                <div 
                  onClick={() => {
                    setTaskManagerTab('keeper_routines');
                    setIsTaskManagerModalOpen(true);
                  }}
                  className={`p-4 rounded-2xl border flex items-center space-x-3.5 transition-all cursor-pointer group hover:-translate-y-0.5 ${
                    isDarkMode 
                      ? 'bg-[#05150D] border-emerald-950/60 hover:border-emerald-800 text-white' 
                      : 'bg-white border-slate-100 hover:border-emerald-200 shadow-xs text-slate-800'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Clipboard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Keeper Tasks</p>
                    <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none mt-1">
                      {animals.length === 0 ? 0 : tasks.filter(t => t.animalId && animals.some(a => a.id === t.animalId)).length}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">Daily care schedule</p>
                  </div>
                </div>
              </div>

              {/* Middle Grid: My Tasks Today & Inventory Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. MY TASKS TODAY */}
                <div className={`p-5 rounded-2xl border transition-all ${isDarkMode ? 'bg-[#05150D] border-emerald-950/40' : 'bg-white border-slate-100 shadow-xs'}`}>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-950/40 pb-3.5 mb-4">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      My Tasks Today
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setTaskManagerTab('pending');
                          setIsTaskManagerModalOpen(true);
                        }}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <span>View All Tasks</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {adminTasks.filter(t => t.status !== 'Completed').length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="relative">
                        <div className="w-16 h-20 bg-amber-100/90 dark:bg-amber-950/80 border-2 border-amber-300 dark:border-amber-700 rounded-lg flex flex-col items-center p-2.5 shadow-2xs">
                          <div className="w-7 h-2 bg-amber-400 rounded-xs mb-2"></div>
                          <div className="w-11 h-1 bg-amber-200/80 dark:bg-amber-800/80 rounded mb-1"></div>
                          <div className="w-9 h-1 bg-amber-200/80 dark:bg-amber-800/80 rounded mb-1"></div>
                          <div className="w-11 h-1 bg-amber-200/80 dark:bg-amber-800/80 rounded"></div>
                        </div>
                        <div className="absolute -bottom-1 -right-2 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-[#05150D]">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      </div>
                      <div className="pt-1">
                        <h4 className="text-base font-extrabold text-slate-900 dark:text-white">No tasks for today!</h4>
                        <p className="text-xs text-slate-400 font-medium mt-1">Great job! You're all caught up.</p>
                        <p className="text-xs text-slate-400 font-medium">New tasks will appear here.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sortTasksByTime(adminTasks.filter(t => t.status !== 'Completed')).map(task => (
                        <div 
                          key={task.id} 
                          className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                            isDarkMode 
                              ? 'bg-[#04110A] border-emerald-950/40 text-slate-200' 
                              : 'bg-slate-50 border-slate-100 text-slate-800 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start space-x-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                              <Shield className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                {task.title}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-emerald-300/80 font-medium truncate mt-0.5">
                                {task.category} • Due {task.dueTime}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                            {task.actionLabel && (
                              <button
                                onClick={() => handleExecuteTaskAction(task)}
                                className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              >
                                {task.actionLabel}
                              </button>
                            )}
                            <button
                              onClick={() => handleCompleteAdminTask(task.id)}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              Done ✓
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. INVENTORY ALERTS */}
                <div className={`p-5 rounded-2xl border transition-all ${isDarkMode ? 'bg-[#05150D] border-emerald-950/40' : 'bg-white border-slate-100 shadow-xs'}`}>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-950/40 pb-3.5 mb-4">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      Inventory Alerts
                    </h3>
                    <button 
                      onClick={() => setActiveMenu('inventory')} 
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Go to Inventory</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-4 py-1">
                    {/* Low Stock */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          inventory.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock' || (i.currentStock <= i.maxStock * 0.2)).length > 0
                            ? 'bg-rose-100/80 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
                            : 'bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          <Leaf className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-extrabold text-sm text-slate-900 dark:text-white">Low Stock</p>
                          <p className={`text-xs font-medium ${
                            inventory.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock' || (i.currentStock <= i.maxStock * 0.2)).length > 0 ? 'text-rose-500 font-semibold' : 'text-slate-400'
                          }`}>
                            {inventory.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock' || (i.currentStock <= i.maxStock * 0.2)).length} items running low
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveMenu('inventory')}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center cursor-pointer"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    </div>

                    {/* Expiring Soon */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-emerald-950/30">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-100/80 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-black text-xs">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-extrabold text-sm text-slate-900 dark:text-white">Expiring Soon</p>
                          <p className="text-xs text-slate-400 font-medium">0 items expiring soon</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveMenu('inventory')}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center cursor-pointer"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    </div>

                    {/* Expired Items */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-emerald-950/30">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-10 h-10 rounded-xl bg-rose-100/80 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                          <X className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <div>
                          <p className="font-extrabold text-sm text-slate-900 dark:text-white">Expired Items</p>
                          <p className="text-xs text-slate-400 font-medium">0 items expired</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveMenu('inventory')}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center cursor-pointer"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Grid: Recent Activities & Facility Operations Oversight */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 1. RECENT ACTIVITIES (Dynamic Feed) */}
                <div className={`p-5 rounded-2xl border transition-all ${isDarkMode ? 'bg-[#05150D] border-emerald-950/40' : 'bg-white border-slate-100 shadow-xs'}`}>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-950/40 pb-3.5 mb-4">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        Recent Facility Activities
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">Live audit log & record updates</p>
                    </div>
                    <button 
                      onClick={() => setActiveMenu('reports')}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <span>View All Records</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {/* Build dynamic recent activity items */}
                    {(() => {
                      const dynamicActivities: Array<{ id: string; title: string; subtitle: string; time: string; type: 'animal' | 'med' | 'apt' | 'breed' }> = [];
                      const activeAnimals = animals.filter(a => !a.isArchived);

                      // Add recent animals
                      activeAnimals.slice(-3).reverse().forEach(a => {
                        dynamicActivities.push({
                          id: `animal-${a.id}`,
                          title: `Reptile Profile: ${a.name ? `${a.name} (${a.id})` : a.id}`,
                          subtitle: `${a.species} • ${a.healthStatus} • Enclosure: ${a.enclosureId || 'Holding'}`,
                          time: a.dateAcquired || 'Recently',
                          type: 'animal'
                        });
                      });

                      // Add recent medical records for existing active animals
                      medicalRecords
                        .filter(m => activeAnimals.some(a => a.id === m.animalId))
                        .slice(-2).reverse().forEach(m => {
                        dynamicActivities.push({
                          id: `med-${m.id}`,
                          title: `Medical Log: ${m.animalId}`,
                          subtitle: `${m.diagnosis || m.recordType || 'Clinical Record'} • Status: ${m.status || 'Active'}`,
                          time: m.recordDate || 'Recent',
                          type: 'med'
                        });
                      });

                      // Add recent appointments for existing active animals
                      appointments
                        .filter(apt => activeAnimals.some(a => a.id === apt.animalId))
                        .slice(-2).reverse().forEach(apt => {
                        dynamicActivities.push({
                          id: `apt-${apt.id}`,
                          title: `Vet Appointment: ${apt.animalId}`,
                          subtitle: `${apt.purpose} • ${apt.priority} Priority`,
                          time: apt.date || 'Scheduled',
                          type: 'apt'
                        });
                      });

                      const displayList = dynamicActivities.slice(0, 4);

                      if (displayList.length === 0) {
                        return (
                          <div className="py-8 text-center text-slate-400">
                            <PawPrint className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                            <p className="text-xs font-bold">No facility events recorded yet</p>
                            <p className="text-[11px] text-slate-500">Activities will show here automatically as animals and records are created.</p>
                          </div>
                        );
                      }

                      return displayList.map((act) => {
                        let iconBg = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
                        let IconComp = PawPrint;

                        if (act.type === 'med') {
                          iconBg = 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
                          IconComp = Heart;
                        } else if (act.type === 'apt') {
                          iconBg = 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
                          IconComp = Stethoscope;
                        } else if (act.type === 'breed') {
                          iconBg = 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
                          IconComp = Dna;
                        }

                        return (
                          <div key={act.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-950/20 transition-colors">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                                <IconComp className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-xs text-slate-900 dark:text-white truncate">{act.title}</p>
                                <p className="text-[11px] text-slate-400 truncate">{act.subtitle}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-emerald-500/70 shrink-0 ml-2">{act.time}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* 2. FACILITY OPERATIONS & OVERSIGHT (Admin Actionable Metrics) */}
                <div className={`p-5 rounded-2xl border transition-all ${isDarkMode ? 'bg-[#05150D] border-emerald-950/40' : 'bg-white border-slate-100 shadow-xs'}`}>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-950/40 pb-3.5 mb-4">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        Facility Operations & Oversight
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">Administrative action items & facility status</p>
                    </div>
                    <button 
                      onClick={() => {
                        setActiveMenu('animals');
                        setStatusFilter('Pending Request');
                      }}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Review Requests</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {/* Item 1: Pending Approvals / Triage */}
                    {(() => {
                      const pendingCount = appointments.filter(a => (a.status === 'Reschedule Requested' || ((a.status === 'Pending Approval' || a.status === 'Pending') && !isAptFromAdmin(a))) && animals.some(anim => anim.id === a.animalId)).length;
                      return (
                        <div 
                          onClick={() => {
                            setActiveMenu('animals');
                            setStatusFilter('Pending Request');
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group ${
                            isDarkMode ? 'hover:bg-emerald-950/20' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                              <ClipboardCheck className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                Vet & Care Approvals
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                {pendingCount > 0 ? `${pendingCount} item(s) awaiting administrative sign-off` : 'All clinical appointments approved'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xl font-black ${pendingCount > 0 ? (isDarkMode ? 'text-amber-400' : 'text-amber-600') : 'text-slate-400'}`}>
                              {pendingCount}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Item 2: Animals Under Clinical Care / Treatment */}
                    {(() => {
                      const underCareCount = animals.filter(a => a.healthStatus === 'Under Treatment' || a.healthStatus === 'Sick' || a.healthStatus === 'Injured').length;
                      return (
                        <div 
                          onClick={() => setActiveMenu('animals')}
                          className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group ${
                            isDarkMode ? 'hover:bg-emerald-950/20' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3.5">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shrink-0">
                              <Heart className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                Critical / Under Treatment
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                {underCareCount > 0 ? `${underCareCount} reptile(s) under veterinary quarantine` : 'No animals currently in critical status'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xl font-black ${underCareCount > 0 ? (isDarkMode ? 'text-rose-400' : 'text-rose-600') : (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')}`}>
                              {underCareCount}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Item 3: Active Breeding Programs */}
                    {(() => {
                      const activeBreedingCount = breedingRecords.filter(b => b.status === 'IN PROGRESS').length;
                      return (
                        <div 
                          onClick={() => setActiveMenu('breeding')}
                          className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group ${
                            isDarkMode ? 'hover:bg-emerald-950/20' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3.5">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center shrink-0">
                              <Dna className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                Active Breeding Programs
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                {activeBreedingCount > 0 ? `${activeBreedingCount} project(s) in progress` : 'No active pairing projects'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xl font-black ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                              {activeBreedingCount}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Item 4: Terrarium & Facility Occupancy */}
                    {(() => {
                      const occupiedCount = enclosures.filter(e => e.status === 'Occupied' || animals.some(a => a.enclosureId === e.id)).length;
                      const totalEnclosures = enclosures.length;
                      return (
                        <div 
                          onClick={() => setActiveMenu('enclosures')}
                          className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group ${
                            isDarkMode ? 'hover:bg-emerald-950/20' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3.5">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
                              <Shield className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                Terrarium Occupancy
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                {occupiedCount} of {totalEnclosures} units occupied ({totalEnclosures > 0 ? Math.round((occupiedCount / totalEnclosures) * 100) : 0}% capacity)
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-bold font-mono ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                              {occupiedCount}/{totalEnclosures}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODALS */}
      <AddAnimalModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={onAddAnimal}
        existingAnimals={animals}
        enclosures={enclosures}
        tasks={tasks}
        systemDate={systemDate}
      />

      {isEditAnimalModalOpen && editingAnimal && (
        <EditAnimalModal
          isOpen={isEditAnimalModalOpen}
          onClose={() => {
            setIsEditAnimalModalOpen(false);
            setEditingAnimal(null);
          }}
          animal={editingAnimal}
          onSave={(updated) => {
            onUpdateAnimal(updated);
            if (selectedAnimal && selectedAnimal.id === updated.id) {
              setSelectedAnimal(updated);
            }
          }}
          enclosures={enclosures}
          existingAnimals={animals}
          systemDate={systemDate}
        />
      )}

      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
              isDarkMode 
                ? 'bg-[#061A10] border-emerald-950 text-white shadow-emerald-950/20' 
                : 'bg-white border-slate-100 text-slate-800 shadow-slate-200/50'
            }`}
          >
            {/* Header */}
            <div className={`p-6 border-b flex items-center justify-between ${
              isDarkMode ? 'border-emerald-950/60' : 'border-slate-100'
            }`}>
              <div>
                <h3 className="text-base font-black">Profile & Settings</h3>
                <p className="text-xs text-slate-400 font-mono">Manage your administrator account & system config</p>
              </div>
              <button 
                onClick={() => setIsProfileModalOpen(false)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isDarkMode 
                    ? 'border-emerald-900/60 bg-[#04140D] hover:bg-emerald-950/60 text-emerald-300' 
                    : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content / Form */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto no-scrollbar">
              
              {/* Profile Details Card */}
              <div className={`p-4 rounded-2xl border ${
                isDarkMode ? 'border-emerald-950/40 bg-emerald-950/10' : 'border-slate-100 bg-slate-50/30'
              }`}>
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Account Profile</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  
                  {/* Avatar Picker */}
                  <div className="col-span-1 md:col-span-2 flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center font-bold text-2xl text-[#113C24] shrink-0 shadow-inner border border-emerald-500/10">
                      {tempAvatar}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <label className="text-[10px] text-slate-400 font-bold block uppercase">Select Emoji Avatar</label>
                      <div className="flex flex-wrap gap-2">
                        {['👑', '🦁', '🦉', '🌿', '👩‍💼', '🦊', '🐨', '🐼'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setTempAvatar(emoji)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all border cursor-pointer ${
                              tempAvatar === emoji 
                                ? 'border-emerald-500 bg-[#113C24] text-white font-bold scale-105' 
                                : isDarkMode 
                                  ? 'border-emerald-950 bg-[#04140D] text-emerald-200 hover:border-emerald-800' 
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-all ${
                        isDarkMode 
                          ? 'border-emerald-950 bg-[#04140D] text-white focus:border-emerald-500' 
                          : 'border-slate-200 bg-white text-slate-800 focus:border-[#113C24]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      value={tempEmail}
                      onChange={(e) => setTempEmail(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-all ${
                        isDarkMode 
                          ? 'border-emerald-950 bg-[#04140D] text-white focus:border-emerald-500' 
                          : 'border-slate-200 bg-white text-slate-800 focus:border-[#113C24]'
                      }`}
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold block uppercase mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={tempPhone}
                      onChange={(e) => setTempPhone(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-all ${
                        isDarkMode 
                          ? 'border-emerald-950 bg-[#04140D] text-white focus:border-emerald-500' 
                          : 'border-slate-200 bg-white text-slate-800 focus:border-[#113C24]'
                      }`}
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold block uppercase mb-1">Bio / Role Description</label>
                    <textarea
                      value={tempBio}
                      onChange={(e) => setTempBio(e.target.value)}
                      rows={2}
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-all resize-none ${
                        isDarkMode 
                          ? 'border-emerald-950 bg-[#04140D] text-white focus:border-emerald-500' 
                          : 'border-slate-200 bg-white text-slate-800 focus:border-[#113C24]'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* System Configuration Settings Card */}
              <div className={`p-4 rounded-2xl border ${
                isDarkMode ? 'border-emerald-950/40 bg-emerald-950/10' : 'border-slate-100 bg-slate-50/30'
              }`}>
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">System Settings</span>
                
                <div className="space-y-4 mt-3">
                  {/* System Date */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold">System Calendar Date</p>
                      <p className="text-[10px] text-slate-400 font-mono">Simulates active date for tasks/records</p>
                    </div>
                    <div className="relative flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-emerald-950 bg-white dark:bg-[#04140D] cursor-pointer">
                      <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                        {formatSystemDate(systemDate)}
                      </span>
                      <input
                        type="date"
                        value={systemDate}
                        onChange={(e) => handleUpdateSystemDate(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Dark Mode toggle inside */}
                  <div className="flex items-center justify-between border-t pt-3 dark:border-emerald-950/40">
                    <div>
                      <p className="text-xs font-bold">Theme Mode</p>
                      <p className="text-[10px] text-slate-400 font-mono">Toggle light or dark visual skin</p>
                    </div>
                    <button
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                        isDarkMode 
                          ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/60' 
                          : 'bg-emerald-50 border-emerald-100 text-[#113C24] hover:bg-emerald-100'
                      }`}
                    >
                      {isDarkMode ? (
                        <>
                          <Sun className="w-3.5 h-3.5" />
                          <span>Light Mode</span>
                        </>
                      ) : (
                        <>
                          <Moon className="w-3.5 h-3.5" />
                          <span>Dark Mode</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className={`p-6 border-t flex justify-end space-x-3 ${
              isDarkMode ? 'border-emerald-950/60 bg-[#04110A]/50' : 'border-slate-100 bg-slate-50/50'
            }`}>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  isDarkMode 
                    ? 'hover:bg-emerald-950/40 text-slate-400' 
                    : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileName(tempName);
                  setProfileEmail(tempEmail);
                  setProfilePhone(tempPhone);
                  setProfileAvatar(tempAvatar);
                  setProfileBio(tempBio);
                  
                  localStorage.setItem('feronia_profile_name', tempName);
                  localStorage.setItem('feronia_profile_email', tempEmail);
                  localStorage.setItem('feronia_profile_phone', tempPhone);
                  localStorage.setItem('feronia_profile_avatar', tempAvatar);
                  localStorage.setItem('feronia_profile_bio', tempBio);
                  
                  setIsProfileModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#113C24] hover:bg-[#1B5234] text-white shadow-md cursor-pointer flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Comprehensive Facility Tasks & Operations Center Modal */}
      {isTaskManagerModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
              isDarkMode ? 'bg-[#05150D] border-emerald-950/80 text-white' : 'bg-white border-slate-100 text-slate-800'
            }`}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-emerald-950/60 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Clipboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Facility Administrative Tasks & Operations Center
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Manage pending duties, automated alerts, and inspect daily keeper care routines.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsTaskManagerModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/20 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="px-5 pt-3 pb-2 border-b border-slate-100 dark:border-emerald-950/40 flex items-center space-x-2 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setTaskManagerTab('pending')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  taskManagerTab === 'pending'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isDarkMode ? 'bg-[#04110A] text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Tasks</span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-black/30 text-yellow-300">
                  {adminTasks.filter(t => t.status !== 'Completed').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTaskManagerTab('keeper_routines')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  taskManagerTab === 'keeper_routines'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isDarkMode ? 'bg-[#04110A] text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Keeper Daily Care & Feeding</span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-blue-500/20 text-blue-400">
                  {tasks.filter(t => !t.title?.toLowerCase().includes('tiger') && (!t.animalId || animals.some(a => a.id === t.animalId))).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTaskManagerTab('completed')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  taskManagerTab === 'completed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isDarkMode ? 'bg-[#04110A] text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Completed Log</span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-400">
                  {adminTasks.filter(t => t.status === 'Completed').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTaskManagerTab('create')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ml-auto ${
                  taskManagerTab === 'create'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isDarkMode ? 'bg-[#04110A] text-emerald-400 border border-emerald-900/50 hover:bg-emerald-950/40' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>

            {/* Modal Body with Scroll */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              
              {/* TAB 1: PENDING TASKS */}
              {taskManagerTab === 'pending' && (
                <div>
                  {adminTasks.filter(t => t.status !== 'Completed').length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                        <Check className="w-7 h-7 stroke-[3]" />
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900 dark:text-white">All Pending Tasks Cleared!</h4>
                        <p className="text-xs text-slate-400 mt-1 font-medium">All routine facility obligations and stock alerts are settled.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTaskManagerTab('create')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                      >
                        Create a New Task
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-emerald-950/40">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {adminTasks.filter(t => t.status !== 'Completed').length} Pending Task{adminTasks.filter(t => t.status !== 'Completed').length > 1 ? 's' : ''}
                        </span>
                      </div>
                      {sortTasksByTime(adminTasks.filter(t => t.status !== 'Completed')).map(task => (
                        <div 
                          key={task.id}
                          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                            isDarkMode 
                              ? 'bg-[#04110A] border-emerald-950/60 hover:border-emerald-800' 
                              : 'bg-slate-50 border-slate-200 hover:border-slate-300 shadow-2xs'
                          }`}
                        >
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                task.priority === 'High'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : task.priority === 'Medium'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                {task.priority} Priority
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-emerald-950/80 text-slate-700 dark:text-emerald-300">
                                {task.category}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-400">
                                Due: {task.dueTime}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {task.title}
                            </h4>
                            <p className="text-xs text-slate-400 font-medium">
                              Department: {task.dept}
                            </p>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            {task.actionLabel && (
                              <button
                                type="button"
                                onClick={() => handleExecuteTaskAction(task)}
                                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold transition-all cursor-pointer border border-emerald-500/20"
                              >
                                {task.actionLabel}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCompleteAdminTask(task.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center space-x-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark Done</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAdminTask(task.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Delete Task"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: KEEPER CARE & FEEDING CHECKLIST */}
              {taskManagerTab === 'keeper_routines' && (() => {
                const activeKeeperTasks = tasks.filter(t => {
                  if (t.title?.toLowerCase().includes('tiger') || t.details?.toLowerCase().includes('tiger')) return false;
                  if (t.animalId && !animals.some(a => a.id === t.animalId)) return false;
                  return true;
                });

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-emerald-950/40">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                          Daily Reptile Care & Feeding Schedule
                        </h4>
                        <p className="text-xs text-slate-400 font-medium">
                          Live checklist assigned to keepers across all terrariums and racks for registered animals.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {activeKeeperTasks.filter(t => t.status === 'Completed').length} / {activeKeeperTasks.length} Completed
                      </span>
                    </div>

                    {activeKeeperTasks.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
                        <Shield className="w-8 h-8 text-slate-500/40" />
                        <p className="font-semibold">No active care or feeding tasks for registered animals.</p>
                        <p className="text-[11px] text-slate-500">Tasks are automatically generated when you add schedules or routine care to an animal.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sortTasksByTime(activeKeeperTasks).map(kTask => {
                          const targetAnimal = animals.find(a => a.id === kTask.animalId);
                          const targetDisplay = targetAnimal
                            ? `${targetAnimal.name || targetAnimal.id} (${targetAnimal.species})`
                            : (kTask.animalId || 'Facility General');
                          const assignedBy = getTaskAssignedBy(kTask);
                          const computedStatus = getTaskComputedStatus(kTask, systemDate);

                          return (
                            <div 
                              key={kTask.id} 
                              className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2.5 transition-all ${
                                computedStatus === 'Overdue'
                                  ? (isDarkMode ? 'bg-[#0A160F] border-rose-900/60' : 'bg-rose-50/40 border-rose-200')
                                  : isDarkMode ? 'bg-[#04110A] border-emerald-950/60' : 'bg-slate-50 border-slate-200 shadow-2xs'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                      kTask.type === 'Feeding' 
                                        ? 'bg-amber-500/20 text-amber-400' 
                                        : kTask.type === 'Cleaning' 
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : kTask.type === 'Health Check'
                                        ? 'bg-purple-500/20 text-purple-400'
                                        : 'bg-emerald-500/20 text-emerald-400'
                                    }`}>
                                      {kTask.type}
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-400">
                                      {kTask.time}
                                    </span>
                                  </div>
                                  <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                                    {kTask.title}
                                  </h5>
                                </div>
                                <div>
                                  {computedStatus === 'Completed' ? (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-400 flex items-center space-x-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      <span>COMPLETED</span>
                                    </span>
                                  ) : computedStatus === 'Overdue' ? (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-400 flex items-center space-x-1 animate-pulse">
                                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                                      <span>OVERDUE</span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-400 flex items-center space-x-1">
                                      <Clock className="w-3 h-3 text-amber-400" />
                                      <span>PENDING</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                                {assignedBy === 'Veterinarian' ? (
                                  <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/30 flex items-center space-x-1">
                                    <Stethoscope className="w-3 h-3 text-purple-500" />
                                    <span>Assigned by: Veterinarian</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/30 flex items-center space-x-1">
                                    <Shield className="w-3 h-3 text-blue-500" />
                                    <span>Assigned by: Admin</span>
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-extrabold border border-emerald-500/30 dark:border-emerald-500/25 flex items-center space-x-1 shadow-xs">
                                  <Calendar className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                                  <span className="tracking-wide">Created: {kTask.createdAt || kTask.date || 'Today'}</span>
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-400 border-t border-slate-200/60 dark:border-emerald-950/40 pt-2 flex items-center justify-between">
                                <span>
                                  Target: <strong className="text-slate-700 dark:text-slate-300">{targetDisplay}</strong>
                                </span>
                                <span>Freq: {kTask.frequency}</span>
                              </div>

                              {kTask.details && (
                                <p className="text-[11px] text-slate-500 dark:text-emerald-300/70 italic">
                                  "{kTask.details}"
                                </p>
                              )}

                              <div className="pt-2 border-t border-slate-200/40 dark:border-emerald-950/40 flex items-center justify-end space-x-2">
                                {onUpdateTaskStatus && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => onUpdateTaskStatus(kTask.id, computedStatus === 'Completed' ? 'Pending' : 'Completed')}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                                        computedStatus === 'Completed'
                                          ? 'bg-slate-200 dark:bg-emerald-950/60 text-slate-600 dark:text-emerald-400 hover:bg-slate-300'
                                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs'
                                      }`}
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>{computedStatus === 'Completed' ? 'Reopen' : 'Mark Done'}</span>
                                    </button>
                                    {computedStatus !== 'Overdue' && computedStatus !== 'Completed' && (
                                      <button
                                        type="button"
                                        onClick={() => onUpdateTaskStatus(kTask.id, 'Overdue')}
                                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer"
                                        title="Mark as Overdue"
                                      >
                                        Mark Overdue
                                      </button>
                                    )}
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskAdmin(kTask)}
                                  className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors cursor-pointer"
                                  title="Edit Task Schedule & Parameters"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingTaskIdAdmin(kTask.id)}
                                  className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
                                  title="Delete Task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB 3: COMPLETED LOG */}
              {taskManagerTab === 'completed' && (
                <div>
                  {adminTasks.filter(t => t.status === 'Completed').length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No completed administrative tasks logged yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {sortTasksByTime(adminTasks.filter(t => t.status === 'Completed')).map(task => (
                        <div 
                          key={task.id}
                          className={`p-3.5 rounded-xl border flex items-center justify-between transition-all opacity-85 ${
                            isDarkMode ? 'bg-[#04110A] border-emerald-950/40' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400">
                                Completed
                              </span>
                              <span className="text-[11px] font-semibold text-slate-400">{task.category}</span>
                            </div>
                            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white line-through text-slate-500">
                              {task.title}
                            </h4>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleAdminTaskStatus(task.id)}
                              className="px-2.5 py-1 text-xs font-bold text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              Reopen
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAdminTask(task.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CREATE TASK FORM */}
              {taskManagerTab === 'create' && (
                <form onSubmit={handleCreateAdminTask} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Task Title *
                    </label>
                    <input 
                      type="text" 
                      value={newAdminTaskTitle}
                      onChange={(e) => setNewAdminTaskTitle(e.target.value)}
                      placeholder="e.g. Audit DENR wildlife permits or perform incubator calibration"
                      required
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-hidden transition-all ${
                        isDarkMode 
                          ? 'bg-[#04110A] border-emerald-950 text-white focus:border-emerald-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Category *
                      </label>
                      <select 
                        value={newAdminTaskCategory}
                        onChange={(e) => setNewAdminTaskCategory(e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs font-medium focus:outline-hidden transition-all ${
                          isDarkMode 
                            ? 'bg-[#04110A] border-emerald-950 text-white focus:border-emerald-500' 
                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                        }`}
                      >
                        <option value="Animal Management">Animal Management</option>
                        <option value="Staff & HR">Staff & HR</option>
                        <option value="Stock & Inventory">Stock & Inventory</option>
                        <option value="Facility & Enclosures">Facility & Enclosures</option>
                        <option value="Administrative Oversight">Administrative Oversight</option>
                        <option value="Other">Other (Custom Category)...</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Priority *
                      </label>
                      <select 
                        value={newAdminTaskPriority}
                        onChange={(e) => setNewAdminTaskPriority(e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs font-medium focus:outline-hidden transition-all ${
                          isDarkMode 
                            ? 'bg-[#04110A] border-emerald-950 text-white focus:border-emerald-500' 
                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                        }`}
                      >
                        <option value="High">High Priority</option>
                        <option value="Medium">Medium Priority</option>
                        <option value="Normal">Normal Priority</option>
                      </select>
                    </div>
                  </div>

                  {newAdminTaskCategory === 'Other' && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-emerald-500 dark:text-emerald-400 mb-1">
                        Specify Custom Category *
                      </label>
                      <input 
                        type="text" 
                        value={newAdminTaskCustomCategory}
                        onChange={(e) => setNewAdminTaskCustomCategory(e.target.value)}
                        placeholder="e.g. Legal & Permits, External Audit, Maintenance"
                        required
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-hidden transition-all ${
                          isDarkMode 
                            ? 'bg-[#04110A] border-emerald-950 text-white focus:border-emerald-500' 
                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                        }`}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Department / Office
                    </label>
                    <input 
                      type="text" 
                      value={newAdminTaskDept}
                      onChange={(e) => setNewAdminTaskDept(e.target.value)}
                      placeholder="e.g. DENR Wildlife Bureau / Operations"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-hidden transition-all ${
                        isDarkMode 
                          ? 'bg-[#04110A] border-emerald-950 text-white focus:border-emerald-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                      }`}
                    />
                  </div>

                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setTaskManagerTab('pending')}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
                    >
                      Save Task
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ADD ENCLOSURE MODAL */}
      {isAddEnclosureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-lg p-6 rounded-2xl shadow-2xl border max-h-[90vh] overflow-y-auto ${
              isDarkMode ? 'bg-[#071F11] border-emerald-900/60 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100 dark:border-emerald-950">
              <h3 className="text-base font-extrabold flex items-center space-x-2">
                <Shield className="w-5 h-5 text-[#113C24] dark:text-emerald-400" />
                <span>Add New Enclosure</span>
              </h3>
              <button
                onClick={() => setIsAddEnclosureModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-emerald-950 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEnclosureSubmit} className="space-y-4">
              {/* Photo Upload Section */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Enclosure Photo
                </label>
                {newEncImage ? (
                  <div 
                    className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 dark:border-emerald-900/60 bg-slate-950 flex items-center justify-center select-none cursor-grab active:cursor-grabbing touch-none group"
                    onMouseDown={handleEncMouseDown}
                    onMouseMove={handleEncMouseMove}
                    onMouseUp={handleEncMouseUp}
                    onMouseLeave={handleEncMouseUp}
                    onTouchStart={handleEncTouchStart}
                    onTouchMove={handleEncTouchMove}
                    onTouchEnd={handleEncMouseUp}
                  >
                    {/* Ambient Blur Background */}
                    <img 
                      src={newEncImage} 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover filter blur-md scale-125 opacity-30 pointer-events-none"
                      referrerPolicy="no-referrer"
                    />

                    <img
                      src={newEncImage}
                      alt="Enclosure Preview"
                      draggable={false}
                      style={{
                        transform: `translate(${newEncPan.x}px, ${newEncPan.y}px)`,
                        transition: isDraggingEnc ? 'none' : 'transform 0.05s ease-out'
                      }}
                      className="max-w-full max-h-full object-contain pointer-events-none select-none"
                      referrerPolicy="no-referrer"
                    />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewEncImage('');
                        setNewEncPan({ x: 0, y: 0 });
                      }}
                      className="absolute top-2 right-2 z-20 p-1.5 bg-rose-600 text-white rounded-lg opacity-90 hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                      title="Remove photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 dark:border-emerald-900/60 rounded-xl cursor-pointer bg-slate-50 dark:bg-[#04110A] hover:bg-slate-100/80 dark:hover:bg-emerald-950/40 transition-colors">
                    <Camera className="w-6 h-6 text-slate-400 dark:text-emerald-400 mb-1" />
                    <span className="text-xs font-bold text-slate-600 dark:text-emerald-300">Click to upload photo</span>
                    <span className="text-[10px] text-slate-400">PNG, JPG up to 5MB</span>
                    <input type="file" accept="image/*" onChange={handleEnclosureImageUpload} className="hidden" />
                  </label>
                )}
              </div>

              {/* Facility Branch Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Facility Branch
                </label>
                <select
                  value={newEncFacility}
                  onChange={(e) => handleFacilityChange(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                    isDarkMode
                      ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#113C24]'
                  }`}
                >
                  {facilitiesList.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                  <option value="+ Add New Facility">+ Add New Facility...</option>
                </select>

                {/* Custom Facility Name Input if + Add New Facility selected */}
                {newEncFacility === '+ Add New Facility' && (
                  <div className="mt-2.5">
                    <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                      Enter New Facility Name:
                    </label>
                    <input
                      type="text"
                      required
                      value={customFacilityName}
                      onChange={(e) => handleCustomFacilityChange(e.target.value)}
                      placeholder="e.g. Reptile Lounge 2 or Aviary Complex..."
                      className={`w-full px-3.5 py-2 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                        isDarkMode
                          ? 'bg-[#04110A] border-emerald-500 text-white'
                          : 'bg-emerald-50/50 border-emerald-600 text-slate-800'
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* Reptile Species Dropdown & Auto Enclosure ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Reptile / Species Inside
                  </label>
                  <select
                    value={newEncReptileSpecies}
                    onChange={(e) => handleReptileSpeciesChange(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#113C24]'
                    }`}
                  >
                    {REPTILE_SPECIES_LIST.map(sp => (
                      <option key={sp} value={sp}>{sp}</option>
                    ))}
                    <option value="Other">Other...</option>
                  </select>

                  {/* Custom Species Input if 'Other' selected */}
                  {newEncReptileSpecies === 'Other' && (
                    <div className="mt-2.5">
                      <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                        Enter Custom Species Name:
                      </label>
                      <input
                        type="text"
                        required
                        value={customReptileSpecies}
                        onChange={(e) => handleCustomReptileSpeciesChange(e.target.value)}
                        placeholder="e.g. Emerald Tree Boa..."
                        className={`w-full px-3.5 py-2 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                          isDarkMode
                            ? 'bg-[#04110A] border-emerald-500 text-white'
                            : 'bg-emerald-50/50 border-emerald-600 text-slate-800'
                        }`}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Enclosure ID (Automated)
                  </label>
                  <input
                    type="text"
                    required
                    value={newEncId}
                    onChange={(e) => setNewEncId(e.target.value)}
                    placeholder="e.g. RL1-BP-001"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#04110A] border-emerald-900/60 text-emerald-400 focus:border-emerald-500'
                        : 'bg-slate-100 border-slate-200 text-emerald-800 focus:border-[#113C24]'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Generated from facility & species code.</span>
                </div>
              </div>

              {/* Type & Condition */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Enclosure Type
                  </label>
                  <select
                    value={newEncType}
                    onChange={(e) => setNewEncType(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#113C24]'
                    }`}
                  >
                    <option value="Glass Terrarium">Glass Terrarium</option>
                    <option value="PVC Enclosure">PVC Enclosure</option>
                    <option value="Acrylic Terrarium">Acrylic Terrarium</option>
                    <option value="Mesh Aviary">Mesh Aviary</option>
                    <option value="Outdoor Paddock">Outdoor Paddock</option>
                    <option value="Aquarium">Aquarium</option>
                    <option value="Other">Other...</option>
                  </select>

                  {/* Custom Enclosure Type Input if 'Other' selected */}
                  {newEncType === 'Other' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        required
                        value={customEncType}
                        onChange={(e) => setCustomEncType(e.target.value)}
                        placeholder="Specify enclosure type..."
                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-none ${
                          isDarkMode
                            ? 'bg-[#04110A] border-emerald-500 text-white'
                            : 'bg-white border-emerald-600 text-slate-800'
                        }`}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Condition Status
                  </label>
                  <div className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 ${
                    isDarkMode
                      ? 'bg-[#04110A] border-emerald-900/60 text-emerald-400'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Good (Clean & Ready)</span>
                  </div>
                </div>
              </div>

              {/* Temperature & Capacity Limit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center space-x-1">
                    <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                    <span>Temperature</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={newEncTempNum}
                      onChange={(e) => setNewEncTempNum(e.target.value)}
                      placeholder="31"
                      className={`w-full pl-3.5 pr-8 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                        isDarkMode
                          ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500'
                          : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#113C24]'
                      }`}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">°C</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Capacity Limit</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newEncCapacity}
                    onChange={(e) => setNewEncCapacity(e.target.value)}
                    placeholder="1"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#113C24]'
                    }`}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Notes / Environmental Details (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newEncNotes}
                  onChange={(e) => setNewEncNotes(e.target.value)}
                  placeholder="e.g. Radiant heat panel installed, misting system active every 4 hours..."
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-none transition-all ${
                    isDarkMode
                      ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#113C24]'
                  }`}
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100 dark:border-emerald-950">
                <button
                  type="button"
                  onClick={() => setIsAddEnclosureModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#113C24] hover:bg-[#1B5234] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs active:scale-95"
                >
                  Save Enclosure
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ADD TASK MODAL */}
      {isAddEnclosureTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border ${
              isDarkMode ? 'bg-[#071F11] border-emerald-900/60 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100 dark:border-emerald-950">
              <h3 className="text-base font-extrabold flex items-center space-x-2">
                <Clipboard className="w-5 h-5 text-[#113C24] dark:text-emerald-400" />
                <span>Add Maintenance Task</span>
              </h3>
              <button
                onClick={() => setIsAddEnclosureTaskModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-emerald-950 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEnclosureTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Task Action
                </label>
                <select
                  value={newEncTaskTitle}
                  onChange={(e) => setNewEncTaskTitle(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                    isDarkMode
                      ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#113C24]'
                  }`}
                >
                  <option value="Cleaning">Cleaning</option>
                  <option value="Disinfection">Disinfection</option>
                  <option value="Water Change">Water Change</option>
                  <option value="Substrate Change">Substrate Change</option>
                  <option value="Feeding & Health Check">Feeding & Health Check</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newEncTaskDueDate}
                  onChange={(e) => setNewEncTaskDueDate(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                    isDarkMode
                      ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#113C24]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Initial Status
                </label>
                <select
                  value={newEncTaskStatus}
                  onChange={(e) => setNewEncTaskStatus(e.target.value as any)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                    isDarkMode
                      ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#113C24]'
                  }`}
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddEnclosureTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#113C24] hover:bg-[#1B5234] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs active:scale-95"
                >
                  Save Task
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {selectedAnimal && (
        <AnimalDetailOverlay
          animal={animals.find(a => a.id === selectedAnimal.id) || selectedAnimal}
          initialTab={selectedAnimalInitialTab}
          onClose={() => {
            setSelectedAnimal(null);
            setSelectedAnimalInitialTab('overview');
          }}
          enclosures={enclosures}
          onUpdateEnclosure={onUpdateEnclosure}
          tasks={tasks}
          medicalRecords={medicalRecords}
          breedingRecords={breedingRecords}
          transfers={transfers}
          animals={animals}
          onUpdateAnimal={(updated) => {
            onUpdateAnimal(updated);
            setSelectedAnimal(updated);
          }}
          onDeleteAnimal={(id) => {
            if (onDeleteAnimal) onDeleteAnimal(id);
            setSelectedAnimal(null);
          }}
          onAddTask={onAddTask}
          onDeleteTask={onDeleteTask}
          onAddMedicalRecord={onAddMedicalRecord}
          onAddBreedingRecord={onAddBreedingRecord}
          onUpdateBreedingRecord={onUpdateBreedingRecord}
          onDeleteBreedingRecord={onDeleteBreedingRecord}
          onRestoreBreedingRecord={onRestoreBreedingRecord}
          deletedBreedingRecords={deletedBreedingRecords}
          breedingAssessments={breedingAssessments}
          onAddBreedingAssessment={onAddBreedingAssessment}
          onUpdateBreedingAssessment={onUpdateBreedingAssessment}
          onDeleteBreedingAssessment={onDeleteBreedingAssessment}
          onNavigateToBreeding={() => {
            setSelectedAnimal(null);
            setActiveMenu('breeding');
          }}
          onAddTransfer={onAddTransfer}
          inventory={inventory}
          onUpdateInventory={onUpdateInventory}
          appointments={appointments}
          staffMembers={staffMembers}
          onAddAppointment={onAddAppointment}
          onUpdateAppointment={onUpdateAppointment}
          onUpdateAppointmentStatus={onUpdateAppointmentStatus}
          onDeleteAppointment={onDeleteAppointment}
          isDarkMode={isDarkMode}
        />
      )}

      {selectedEnclosureForModal && (
        <EnclosureDetailModal
          enclosure={selectedEnclosureForModal}
          onClose={() => setSelectedEnclosureForModal(null)}
          animals={animals}
          facilities={facilitiesList}
          onUpdateEnclosure={(updated) => {
            if (onUpdateEnclosure) onUpdateEnclosure(updated);
            setSelectedEnclosureForModal(updated);
          }}
          onDeleteEnclosure={(id) => {
            if (onDeleteEnclosure) onDeleteEnclosure(id);
            setSelectedEnclosureForModal(null);
          }}
          onOpenQrPass={(enc) => setQrTargetEnclosure(enc)}
          onOpenClimateModal={(enc) => setSelectedEnclosureForClimate(enc)}
          isDarkMode={isDarkMode}
        />
      )}

      {/* CLIMATE PROFILE / OFF-SEASON SETUP MODAL */}
      {selectedEnclosureForClimate && (
        <KeeperClimateModal
          enclosure={selectedEnclosureForClimate}
          onClose={() => setSelectedEnclosureForClimate(null)}
          onSave={(updated) => {
            if (onUpdateEnclosure) onUpdateEnclosure(updated);
            setSelectedEnclosureForClimate(null);
            if (selectedEnclosureForModal && selectedEnclosureForModal.id === updated.id) {
              setSelectedEnclosureForModal(updated);
            }
          }}
          animals={animals}
          keeperName={profileName || 'Admin'}
          isDarkMode={isDarkMode}
        />
      )}

      {/* ENCLOSURE QR PASS MODAL */}
      {qrTargetEnclosure && (
        <EnclosureQrModal
          enclosure={qrTargetEnclosure}
          animals={animals}
          onClose={() => setQrTargetEnclosure(null)}
          onInspectEnclosure={(enc) => {
            setQrTargetEnclosure(null);
            setInspectedEnclosure(enc);
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {/* ENCLOSURE QR SCANNER MODAL */}
      {isQrScannerOpen && (
        <QrScannerModal
          enclosures={enclosures}
          animals={animals}
          onClose={() => setIsQrScannerOpen(false)}
          onEnclosureDetected={(enc) => {
            setIsQrScannerOpen(false);
            setInspectedEnclosure(enc);
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {/* ENCLOSURE INSPECTION VIEW (AFTER SCAN) */}
      {inspectedEnclosure && (
        <EnclosureInspectionModal
          enclosure={inspectedEnclosure}
          animals={animals}
          tasks={tasks}
          medicalRecords={medicalRecords}
          currentView="admin"
          onClose={() => setInspectedEnclosure(null)}
          onScanAnother={() => {
            setInspectedEnclosure(null);
            setIsQrScannerOpen(true);
          }}
          onSelectAnimal={(animal) => {
            setInspectedEnclosure(null);
            setSelectedAnimal(animal);
          }}
          onQuickLogAction={(type, enc) => {
            if (onAddTask) {
              const newTask: Task = {
                id: `TASK-QR-${Date.now().toString().slice(-4)}`,
                animalId: animals.find(a => a.enclosureId === enc.id)?.id || enc.id,
                type: type === 'feed' ? 'Feeding' : type === 'clean' ? 'Cleaning' : 'Health Check',
                title: `${type === 'feed' ? 'Feeding Round' : type === 'clean' ? 'Sanitization' : 'Enclosure Check'} (${enc.id})`,
                details: `${type === 'feed' ? 'Feeding round' : type === 'clean' ? 'Sanitization' : 'Inspection'} logged via QR field scan for ${enc.name} (${enc.id}).`,
                date: new Date().toISOString().split('T')[0],
                time: '12:00 PM',
                frequency: 'Once',
                status: 'Completed',
                assignedBy: 'Admin',
                enclosureId: enc.id
              };
              onAddTask(newTask);
            }
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {/* ADD STAFF MEMBER MODAL */}
      <AddStaffMemberModal
        isOpen={isAddStaffOpen}
        isDarkMode={isDarkMode}
        facilities={Array.from(new Set(enclosures.map(e => e.facility?.trim()).filter((f): f is string => Boolean(f))))}
        existingStaff={staffMembers}
        onClose={() => setIsAddStaffOpen(false)}
        onSubmit={handleStaffCreated}
      />

      {/* ACCOUNT HANDOFF MODAL */}
      {handoffStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl border transition-all ${
              isDarkMode ? 'bg-[#071F11] border-emerald-900/60 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="text-center space-y-2 pb-4 border-b border-slate-100 dark:border-emerald-950">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20 text-emerald-400">
                <KeyRound className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Account Handoff Credentials</h3>
              <p className="text-xs text-slate-400">
                Give these temporary credentials to the new employee.
              </p>
            </div>

            <div className="space-y-4 my-6">
              <div className={`p-4 rounded-2xl border space-y-2.5 font-sans text-xs ${
                isDarkMode ? 'bg-[#04110A] border-emerald-950/80 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                <div className="flex justify-between items-center border-b border-emerald-950/20 pb-2">
                  <span className="text-slate-400">Employee Name:</span>
                  <span className="font-extrabold text-slate-800 dark:text-white">{handoffStaff.name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-emerald-950/20 pb-2">
                  <span className="text-slate-400">Assigned Role:</span>
                  <span className="font-black uppercase tracking-wider text-emerald-400">{handoffStaff.role}</span>
                </div>
                <div className="flex justify-between items-center border-b border-emerald-950/20 pb-2">
                  <span className="text-slate-400">Login Email:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{handoffStaff.email}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-400">Temporary Password:</span>
                  <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {handoffStaff.password}
                  </span>
                </div>

                {handoffStaff.role === 'keeper' && handoffStaff.assignedAnimalIds && handoffStaff.assignedAnimalIds.length > 0 && (
                  <div className="border-t border-emerald-950/20 pt-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-slate-400 font-bold text-[11px] flex items-center space-x-1 text-emerald-400">
                        <PawPrint className="w-3.5 h-3.5" />
                        <span>Assigned Roster ({handoffStaff.assignedAnimalIds.length} Reptiles):</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
                      {handoffStaff.assignedAnimalIds.map(id => {
                        const anim = animals.find(a => a.id === id);
                        return (
                          <span
                            key={id}
                            className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30"
                          >
                            {anim ? `${anim.name} (${anim.id})` : id}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] leading-relaxed">
                <strong className="block font-bold mb-0.5">🔑 First-Time Login Notice:</strong>
                When {handoffStaff.name} logs in with this temporary password, the system will force them to set a new personal password before entering the dashboard.
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleCopyHandoffCredentials(handoffStaff)}
                className={`w-full py-3 text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  staffCopied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#113C24] hover:bg-[#1B5234] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white'
                }`}
              >
                {staffCopied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{staffCopied ? 'Credentials Copied to Clipboard!' : 'Copy Account Credentials'}</span>
              </button>

              <a
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(handoffStaff.email)}&su=${encodeURIComponent(`Welcome to Feronia Wildlife - Staff Account Credentials (${handoffStaff.name})`)}&body=${encodeURIComponent(`Hello ${handoffStaff.name},\n\nWelcome to Feronia Wildlife Facility Management Information System!\n\nYour staff account has been created with the following details:\n- Role: ${handoffStaff.role}\n- Login Email: ${handoffStaff.email}\n- Temporary Password: ${handoffStaff.password}\n\nLogin URL: ${window.location.origin}\n\nPlease log in and update your temporary password upon first login.\n\nBest regards,\nFeronia Wildlife Facility Administration`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl border border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-all flex items-center justify-center space-x-2 text-center"
              >
                <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Open & Send via Gmail to {handoffStaff.email}</span>
              </a>

              <button
                onClick={() => setHandoffStaff(null)}
                className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-center block"
              >
                Done & Return to Staff List
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* STAFF ADDED SUCCESS MODAL (Exact match to requested UI) */}
      {staffAddedSuccessData && (
        <StaffAddedSuccessModal
          isOpen={isStaffAddedSuccessOpen}
          onClose={() => setIsStaffAddedSuccessOpen(false)}
          onViewStaffList={() => {
            setIsStaffAddedSuccessOpen(false);
            setActiveMenu('users');
          }}
          staffName={staffAddedSuccessData.name}
          role={staffAddedSuccessData.role}
          email={staffAddedSuccessData.email}
          tempPassword={staffAddedSuccessData.tempPassword || 'Feronia2026!'}
        />
      )}

      {/* REASSIGN KEEPER ANIMALS & ENCLOSURES MODAL */}
      {reassigningKeeper && (
        <ReassignStaffAllocationModal
          keeper={reassigningKeeper}
          animals={animals}
          enclosures={enclosures}
          isDarkMode={isDarkMode}
          onClose={() => setReassigningKeeper(null)}
          onSave={handleSaveReassignStaff}
        />
      )}

      {/* DELETE / ARCHIVE ANIMAL CONFIRMATION MODAL */}
      {isDeleteModalOpen && animalToDelete && (
        <DeleteAnimalConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setAnimalToDelete(null);
          }}
          animal={animalToDelete}
          isDarkMode={isDarkMode}
          onConfirmArchive={(animal, data) => {
            setAdminTasks(prev => prev.filter(t => {
              if (t.id.includes(animal.id)) return false;
              if (t.title && t.title.includes(animal.id)) return false;
              if (animal.name && animal.name.length >= 2 && t.title && t.title.toLowerCase().includes(animal.name.toLowerCase())) return false;
              return true;
            }));
            onUpdateAnimal({
              ...animal,
              isArchived: true,
              archiveCategory: data.category,
              archiveReason: data.reason,
              archiveDate: data.date,
              archiveNotes: data.notes,
              mortalityCause: data.mortalityCause
            });
            setIsDeleteModalOpen(false);
            setAnimalToDelete(null);
          }}
          onConfirmPermanentDelete={(animalId) => {
            const targetAnimal = animals.find(a => a.id === animalId);
            const animalName = targetAnimal?.name?.toLowerCase();
            setAdminTasks(prev => prev.filter(t => {
              if (t.id.includes(animalId)) return false;
              if (t.title && t.title.includes(animalId)) return false;
              if (animalName && animalName.length >= 2 && t.title && t.title.toLowerCase().includes(animalName)) return false;
              return true;
            }));
            if (onDeleteAnimal) onDeleteAnimal(animalId);
            setIsDeleteModalOpen(false);
            setAnimalToDelete(null);
          }}
        />
      )}

      {/* DELETE SINGLE STAFF ACCOUNT CONFIRMATION MODAL */}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-md p-6 rounded-3xl shadow-2xl border transition-all ${
              isDarkMode ? 'bg-[#071F11] border-rose-900/40 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-100 dark:border-emerald-950">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">Remove Staff Account</h3>
                  <p className="text-[11px] text-slate-400">Revoke portal access & duties</p>
                </div>
              </div>
              <button
                onClick={() => setStaffToDelete(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-emerald-950 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#04110A] border-emerald-950/80' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-sm">
                    {staffToDelete.initials || 'ST'}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white">{staffToDelete.name}</h4>
                    <p className="text-xs text-slate-400">{staffToDelete.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] font-mono font-bold text-slate-400">{staffToDelete.id}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {staffToDelete.role}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs leading-relaxed">
                <p className="font-bold mb-1 flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Permanent Account Removal</span>
                </p>
                <span>
                  Are you sure you want to delete this staff member? Their login credentials will be revoked immediately and any assigned reptiles will become unallocated.
                </span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-emerald-950">
                <button
                  type="button"
                  onClick={() => setStaffToDelete(null)}
                  disabled={isDeletingStaff}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-100 dark:hover:bg-emerald-950 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteSingleStaff}
                  disabled={isDeletingStaff}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isDeletingStaff ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>{isDeletingStaff ? 'Removing...' : 'Delete Account'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* PROFILE & SETTINGS MODAL */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Admin Profile & Settings"
        subtitle="Manage administrator account credentials, profile photo, and facility details"
        roleLabel="Administrator"
        initialName={profileName}
        initialEmail={profileEmail}
        initialPhone={profilePhone}
        initialAvatar={profileAvatar}
        initialBio={profileBio}
        isDarkMode={isDarkMode}
        onSave={(data) => {
          setProfileName(data.name);
          setProfileEmail(data.email);
          setProfilePhone(data.phone);
          setProfileAvatar(data.avatar);
          setProfileBio(data.bio);

          localStorage.setItem('feronia_profile_name', data.name);
          localStorage.setItem('feronia_profile_email', data.email);
          localStorage.setItem('feronia_profile_phone', data.phone);
          localStorage.setItem('feronia_profile_avatar', data.avatar);
          localStorage.setItem('feronia_profile_bio', data.bio);
          localStorage.setItem('feronia_current_user_name', data.name);
          localStorage.setItem('feronia_current_user_email', data.email);
          localStorage.setItem('feronia_current_user_phone', data.phone);
        }}
      />

      {/* EDIT TASK MODAL */}
      <EditTaskModal
        isOpen={!!editingTaskAdmin}
        onClose={() => setEditingTaskAdmin(null)}
        task={editingTaskAdmin}
        onSave={(updatedTask) => {
          onAddTask(updatedTask);
          setEditingTaskAdmin(null);
        }}
        staffMembers={staffMembers}
        inventory={inventory}
        isDarkMode={isDarkMode}
      />

      {/* DELETE TASK CONFIRMATION MODAL */}
      {deletingTaskIdAdmin && (
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
              Are you sure you want to delete this task? This action will remove the task from keeper active routines.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTaskIdAdmin(null)}
                className={`px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                  isDarkMode ? 'border-emerald-900/60 text-slate-300 hover:bg-emerald-950/60' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTask(deletingTaskIdAdmin);
                  setDeletingTaskIdAdmin(null);
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
  );
}
