import React, { useState, useEffect, useMemo, ChangeEvent, FormEvent } from 'react';
import { motion } from 'motion/react';
import {
  Search, Bell, CheckCircle2, ClipboardList, Shield, LogOut, FileText, Settings, User, Compass, Check, X,
  Trash2, HelpCircle, Heart, Star, CloudRain, Sun, Moon, Camera, Calendar, Pill, Stethoscope, Activity,
  Syringe, AlertCircle, Plus, Eye, History, Sparkles, Filter, CheckCheck, Package, AlertTriangle, Clock, UserCheck,
  QrCode, Info, Utensils, Droplets, ChevronDown, MoreVertical, LayoutDashboard, Zap, ChevronRight, ArrowRight, ArrowLeft,
  Sprout, PawPrint, Circle, Menu, Warehouse, Thermometer, Leaf, LayoutGrid, List, Box, Users, ExternalLink, Database
} from 'lucide-react';
import { Animal, Enclosure, Task, MedicalRecord, BreedingRecord, TransferRecord, Role, InventoryItem, KeeperLogEntry, InventoryNotification, Appointment, StaffMember, getTaskAssignedBy, getTaskComputedStatus, getAppointmentRequesterInfo, resolveVeterinarianName, resolveAdminName } from '../types';
import { deductInventoryStock } from '../utils/inventory';
import { sortTasksByTime, sortTasksByPriorityAndDue } from '../utils/timeUtils';
import { subscribeToStaff, saveStaffMember } from '../lib/dbClient';
import InventoryModule from './admin/InventoryModule';
import EnclosureDetailModal from './admin/EnclosureDetailModal';
import QrScannerModal from './common/QrScannerModal';
import EnclosureInspectionModal from './common/EnclosureInspectionModal';
import EnclosureQrModal from './common/EnclosureQrModal';
import KeeperReportsView from './keeper/KeeperReportsView';
import { KeeperClimateModal } from './keeper/KeeperClimateModal';
import KeeperAnimalDetailModal from './keeper/KeeperAnimalDetailModal';
import KeeperNotificationDropdown from './keeper/KeeperNotificationDropdown';
import KeeperBreedingView from './keeper/KeeperBreedingView';
import UserAvatar from './common/UserAvatar';
import ProfileSettingsModal from './common/ProfileSettingsModal';

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
  'Tortoise'
];

interface KeeperDashboardProps {
  onLogout: () => void;
  animals: Animal[];
  onUpdateAnimal: (updated: Animal) => void;
  enclosures: Enclosure[];
  facilities?: string[];
  onAddFacility?: (facName: string) => void;
  onAddEnclosure?: (newEnc: Enclosure) => void;
  onUpdateEnclosure?: (updated: Enclosure) => void;
  onDeleteEnclosure?: (id: string) => void;
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
  onUpdateTaskStatus: (id: string, status: 'Pending' | 'Completed' | 'Overdue') => void;
  inventory?: InventoryItem[];
  onUpdateInventory?: (items: InventoryItem[], changeMeta?: {
    action: 'updated' | 'restocked' | 'added' | 'deleted' | 'status_changed';
    item: InventoryItem;
    details: string;
  }) => void;
  inventoryNotifications?: InventoryNotification[];
  onMarkNotificationAsRead?: (id: string) => void;
  onMarkAllNotificationsAsRead?: () => void;
  onClearNotifications?: () => void;
  appointments?: Appointment[];
  staffMembers?: StaffMember[];
  onAddAppointment?: (appointment: Appointment) => void;
  breedingRecords?: BreedingRecord[];
  onAddBreedingRecord?: (record: BreedingRecord) => void;
  onUpdateBreedingRecord?: (record: BreedingRecord) => void;
  onOpenSupabaseConfig?: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

const getAnimalImage = (species: string) => {
  switch (species) {
    case 'Ball Python':
      return 'https://images.unsplash.com/photo-1531386151447-fd76ad50012f?auto=format&fit=crop&q=80&w=150';
    case 'Green Iguana':
      return 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=150';
    case 'Leopard Gecko':
      return 'https://images.unsplash.com/photo-1504450874802-0ba2bac975ef?auto=format&fit=crop&q=80&w=150';
    case 'Bearded Dragon':
      return 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?auto=format&fit=crop&q=80&w=150';
    default:
      return 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=150';
  }
};

const getTaskImage = (type: string) => {
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

const formatTaskDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  return formatSystemDate(clean) || clean;
};

const formatShortTaskDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = clean.split('-').map(Number);
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return clean;
};

const formatNotificationTime = (isoStr: string) => {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch (e) {
    return '';
  }
};

export const resolveTaskTitle = (task: Task | null | undefined, animal?: Animal | null): string => {
  if (!task) return 'Care Task';
  let title = task.title || '';
  const animalName = animal?.name 
    ? `${animal.name} (${animal.id})` 
    : (animal?.id && animal.id !== 'null' ? animal.id : (task.animalId && task.animalId !== 'null' ? task.animalId : 'Animal'));

  if (!title || title === 'null' || title.includes('null Task') || title.includes('null: null') || title === 'Scheduled Task' || title.startsWith('Scheduled Task (')) {
    const typeLabel = (task.type && (task.type as any) !== 'null') ? task.type : 'Daily Care';
    if (typeLabel === 'Feeding') {
      title = `Scheduled Feeding: ${animalName}`;
    } else if (typeLabel === 'Cleaning') {
      title = `Misting & Sanitation: ${animalName}`;
    } else if (typeLabel === 'Health Check') {
      title = `Administer Treatment / Recheck: ${animalName}`;
    } else {
      title = `${typeLabel} Task: ${animalName}`;
    }
  }

  // Clean up any extraneous "(null)" or "null Task" or "null" substrings
  title = title.replace(/\s*\(\s*null\s*\)/gi, '').replace(/\bnull Task\b/gi, 'Care Task').replace(/\bnull\b/gi, 'Animal').replace(/\s+/g, ' ').trim();
  return title;
};

export const getTaskCategory = (task: Task | null | undefined): 'feeding' | 'climate' | 'care' | 'cleaning' | 'general' => {
  if (!task) return 'general';
  const tType = (task.type || '').toLowerCase();
  const tTitle = (task.title || '').toLowerCase();
  const tDetails = (task.details || '').toLowerCase();

  if (tType.includes('feed') || tTitle.includes('feed') || tTitle.includes('diet') || tDetails.includes('food') || tDetails.includes('greens') || tDetails.includes('prey') || tDetails.includes('roaches') || tDetails.includes('mouse')) {
    return 'feeding';
  }
  if (tType.includes('climate') || tType.includes('temp') || tType.includes('misting') || tTitle.includes('climate') || tTitle.includes('thermostat') || tTitle.includes('off-season') || tTitle.includes('brumation') || tDetails.includes('thermostat')) {
    return 'climate';
  }
  if (tType.includes('health') || tType.includes('med') || tType.includes('check') || tType.includes('care') || tTitle.includes('deworm') || tTitle.includes('parasite') || tTitle.includes('treatment') || tTitle.includes('oral') || tDetails.includes('deworming') || tDetails.includes('parasite') || tDetails.includes('prescription')) {
    return 'care';
  }
  if (tType.includes('clean') || tType.includes('sanit') || tType.includes('water') || tTitle.includes('clean') || tTitle.includes('water') || tTitle.includes('sanitat') || tDetails.includes('sanitization') || tDetails.includes('substrate')) {
    return 'cleaning';
  }
  return 'general';
};

// Helper function to extract or normalize all keeper logs from an animal
export const getAllKeeperLogsForAnimal = (animal: Animal): KeeperLogEntry[] => {
  return animal.keeperLogs || [];
};

const getFormattedDateWithDay = (dateStr: string) => {
  if (!dateStr) return { dateFormatted: 'Sep 16, 2026', dayOfWeek: 'Wednesday' };
  try {
    const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = clean.split('-').map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
      return { dateFormatted, dayOfWeek };
    }
  } catch {
    // fallback
  }
  return { dateFormatted: dateStr, dayOfWeek: 'Wednesday' };
};

export default function KeeperDashboard({
  onLogout,
  animals,
  onUpdateAnimal,
  enclosures,
  facilities = ['Reptile Lounge 1'],
  onAddFacility,
  onAddEnclosure,
  onUpdateEnclosure,
  onDeleteEnclosure,
  tasks,
  onAddTask,
  onDeleteTask,
  onUpdateTaskStatus,
  inventory = [],
  onUpdateInventory,
  inventoryNotifications = [],
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onClearNotifications,
  appointments = [],
  staffMembers = [],
  onAddAppointment,
  breedingRecords = [],
  onAddBreedingRecord,
  onUpdateBreedingRecord,
  onOpenSupabaseConfig,
  isDarkMode,
  setIsDarkMode
}: KeeperDashboardProps) {
  type KeeperMenu = 'dashboard' | 'checklist' | 'inventory' | 'breeding' | 'animals' | 'enclosures' | 'reports';
  const [activeMenu, setActiveMenu] = useState<KeeperMenu>('dashboard');
  const [navigationHistory, setNavigationHistory] = useState<KeeperMenu[]>([]);

  const navigateToMenu = (targetMenu: KeeperMenu) => {
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
  const [selectedEnclosureForQr, setSelectedEnclosureForQr] = useState<Enclosure | null>(null);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [selectedInventorySearch, setSelectedInventorySearch] = useState('');
  const [dashboardChecked, setDashboardChecked] = useState<Record<string, boolean>>({});

  // Keeper Read Notifications State
  const [keeperReadNotifIds, setKeeperReadNotifIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('feronia_keeper_read_notifs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Animal List module state & filters matching Admin layout
  const [animalSearchQuery, setAnimalSearchQuery] = useState('');
  const [animalSpeciesFilter, setAnimalSpeciesFilter] = useState('All');
  const [animalSexFilter, setAnimalSexFilter] = useState('All');
  const [animalStatusFilter, setAnimalStatusFilter] = useState('All');
  const [selectedAnimalForKeeperModal, setSelectedAnimalForKeeperModal] = useState<Animal | null>(null);
  const [selectedAnimalInitialTab, setSelectedAnimalInitialTab] = useState<'overview' | 'care-guide' | 'observations'>('overview');

  // Enclosures module state & filters matching Admin
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

  const generateAutomatedEnclosureId = (facName: string, speciesName: string, existingEnclosures: Enclosure[]) => {
    const cleanFac = (facName || 'Main Facility').trim();
    const cleanSpecies = (speciesName || 'Reptile').trim();
    
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

  const unreadNotifCount = inventoryNotifications.filter(n => !n.read).length;
  const lowStockCount = (inventory || []).filter(item => item.status === 'Low Stock' || item.status === 'Out of Stock').length;

  // Health & Vet Request modal states for Keeper
  const [isHealthVetModalOpen, setIsHealthVetModalOpen] = useState(false);
  const [reqAnimalId, setReqAnimalId] = useState('');
  const [reqType, setReqType] = useState('Need of Observation / Monitoring');
  const [customReqType, setCustomReqType] = useState('');
  const [reqPriority, setReqPriority] = useState<'Normal' | 'High' | 'Emergency'>('High');
  const [reqObservations, setReqObservations] = useState('');
  const [reqDate, setReqDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reqTime, setReqTime] = useState('10:00 AM');

  // Profile & Settings states - Synchronized with active keeper
  const [profileName, setProfileName] = useState(() => {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('feronia_keeper_name') || localStorage.getItem('feronia_current_user_name')) : null;
    return saved || 'Animal Keeper';
  });
  const [profileEmail, setProfileEmail] = useState(() => {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('feronia_keeper_email') || localStorage.getItem('feronia_current_user_email')) : null;
    return saved || 'keeper@feroniasanctuary.org';
  });
  const [profilePhone, setProfilePhone] = useState(() => {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('feronia_keeper_phone') || localStorage.getItem('feronia_current_user_phone')) : null;
    return saved || '';
  });
  const [profileAvatar, setProfileAvatar] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('feronia_keeper_avatar') : null) || '🙋‍♂️');
  const [profileBio, setProfileBio] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('feronia_keeper_bio') : null) || 'Primary keeper specializing in reptile husbandry, habitat management, and feed schedules.');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Staff list & Keeper Allocation Synchronization
  const [staffList, setStaffList] = useState<StaffMember[]>(() => {
    try {
      const saved = localStorage.getItem('feronia_staff_members');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const unsub = subscribeToStaff((list) => {
      if (list && list.length > 0) {
        setStaffList(list);
        try {
          localStorage.setItem('feronia_staff_members', JSON.stringify(list));
        } catch {}
      }
    });

    const handleStaffUpdated = (e: any) => {
      const updated = e.detail;
      if (updated) {
        if (updated.role === 'keeper' || updated.id === currentUserId) {
          if (updated.name) setProfileName(updated.name);
          if (updated.email) setProfileEmail(updated.email);
          setProfilePhone(updated.phone || '');
          if (updated.dutyLoad) setProfileBio(updated.dutyLoad);
        }
      }
    };

    const handleStaffListUpdated = (e: any) => {
      if (Array.isArray(e.detail)) {
        setStaffList(e.detail);
      }
    };

    window.addEventListener('feronia_staff_updated', handleStaffUpdated as EventListener);
    window.addEventListener('feronia_staff_list_updated', handleStaffListUpdated as EventListener);

    return () => {
      unsub();
      window.removeEventListener('feronia_staff_updated', handleStaffUpdated as EventListener);
      window.removeEventListener('feronia_staff_list_updated', handleStaffListUpdated as EventListener);
    };
  }, []);

  const currentUserId = typeof window !== 'undefined' ? (localStorage.getItem('feronia_current_user_id') || '') : '';
  const currentKeeperEmail = typeof window !== 'undefined' ? (localStorage.getItem('feronia_keeper_email') || localStorage.getItem('feronia_current_user_email') || '') : '';
  const currentKeeperName = typeof window !== 'undefined' ? (localStorage.getItem('feronia_keeper_name') || localStorage.getItem('feronia_current_user_name') || '') : '';
  const lastCreatedKeeperId = typeof window !== 'undefined' ? (localStorage.getItem('feronia_last_created_keeper_id') || '') : '';

  const currentKeeperStaff = useMemo(() => {
    if (!staffList || staffList.length === 0) return null;
    return staffList.find(s => 
      (s.id && currentUserId && s.id === currentUserId) ||
      (s.id && lastCreatedKeeperId && s.id === lastCreatedKeeperId) ||
      (s.email && currentKeeperEmail && s.email.toLowerCase() === currentKeeperEmail.toLowerCase()) ||
      (s.name && currentKeeperName && s.name.toLowerCase() === currentKeeperName.toLowerCase())
    ) || staffList.find(s => s.role === 'keeper') || null;
  }, [staffList, currentUserId, lastCreatedKeeperId, currentKeeperEmail, currentKeeperName]);

  // Synchronize profile name, email, phone, and bio whenever active keeper record is updated
  useEffect(() => {
    if (currentKeeperStaff) {
      if (currentKeeperStaff.name && currentKeeperStaff.name !== profileName) {
        setProfileName(currentKeeperStaff.name);
      }
      if (currentKeeperStaff.email && currentKeeperStaff.email !== profileEmail) {
        setProfileEmail(currentKeeperStaff.email);
      }
      const staffPhone = currentKeeperStaff.phone || '';
      if (staffPhone !== profilePhone) {
        setProfilePhone(staffPhone);
      }
      if (currentKeeperStaff.dutyLoad && currentKeeperStaff.dutyLoad !== profileBio) {
        setProfileBio(currentKeeperStaff.dutyLoad);
      }
    }
  }, [currentKeeperStaff]);

  const assignedAnimalIds: string[] = useMemo(() => {
    // 1. Check if staff member record explicitly lists assignedAnimalIds
    if (currentKeeperStaff && Array.isArray(currentKeeperStaff.assignedAnimalIds) && currentKeeperStaff.assignedAnimalIds.length > 0) {
      return currentKeeperStaff.assignedAnimalIds;
    }

    // 2. Direct lookup on animals (assignedKeeperId or assignedKeeperName)
    const directAssigned = animals.filter(a => 
      !a.isArchived && (
        (a.assignedKeeperId && (a.assignedKeeperId === currentUserId || (currentKeeperStaff && a.assignedKeeperId === currentKeeperStaff.id))) ||
        (a.assignedKeeperName && currentKeeperName && (
          a.assignedKeeperName.toLowerCase() === currentKeeperName.toLowerCase() ||
          currentKeeperName.toLowerCase().includes(a.assignedKeeperName.toLowerCase())
        ))
      )
    ).map(a => a.id);

    if (directAssigned.length > 0) {
      return directAssigned;
    }

    // 3. Fallback for primary initial keeper profile (Jason Lee / STF-KP-001)
    if (currentUserId === 'STF-KP-001' || (currentKeeperName && currentKeeperName.toLowerCase().includes('jason'))) {
      return ['BP-21', 'BP-22', 'CG-01'].filter(id => animals.some(a => a.id === id));
    }

    return [];
  }, [currentKeeperStaff, animals, currentUserId, currentKeeperName]);

  // Roster View Mode: 'assigned' (default) or 'all'
  const [rosterViewMode, setRosterViewMode] = useState<'assigned' | 'all'>('assigned');

  const allActiveAnimals = useMemo(() => animals.filter(a => !a.isArchived), [animals]);

  const myAssignedAnimals = useMemo(() => {
    if (assignedAnimalIds.length === 0) return [];
    return allActiveAnimals.filter(a => 
      assignedAnimalIds.includes(a.id) ||
      (a.assignedKeeperId && (a.assignedKeeperId === currentUserId || (currentKeeperStaff && a.assignedKeeperId === currentKeeperStaff.id))) ||
      (a.assignedKeeperName && currentKeeperName && (
        a.assignedKeeperName.toLowerCase() === currentKeeperName.toLowerCase() ||
        currentKeeperName.toLowerCase().includes(a.assignedKeeperName.toLowerCase())
      ))
    );
  }, [allActiveAnimals, assignedAnimalIds, currentUserId, currentKeeperName, currentKeeperStaff]);

  // Filtered active animals for the Keeper interface:
  // When keeper has assigned animals and roster view is 'assigned', limits strictly to their assigned animals
  const activeAnimals = (rosterViewMode === 'assigned' && myAssignedAnimals.length > 0)
    ? myAssignedAnimals
    : allActiveAnimals;

  const handleMarkKeeperNotifRead = (id: string) => {
    setKeeperReadNotifIds(prev => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      try {
        localStorage.setItem('feronia_keeper_read_notifs', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (onMarkNotificationAsRead) {
      if (id.startsWith('inv-notif-')) {
        onMarkNotificationAsRead(id.replace('inv-notif-', ''));
      } else {
        onMarkNotificationAsRead(id);
      }
    }
  };

  // Compute exact list of notification items for Keeper matching KeeperNotificationDropdown
  const keeperNotifList = useMemo(() => {
    const list: { id: string }[] = [];
    const targetAnimals = myAssignedAnimals.length > 0 ? myAssignedAnimals : activeAnimals;

    // 1. Tasks
    tasks.filter(t => t.status !== 'Completed' && (!t.animalId || t.animalId === 'GENERAL' || animals.some(a => a.id === t.animalId)) && (!t.enclosureId || enclosures.some(e => e.id === t.enclosureId))).forEach(t => {
      list.push({ id: `task-${t.id}` });
    });

    // 2. Supplies (Inventory notifications)
    (inventoryNotifications || []).forEach(notif => {
      list.push({ id: `inv-notif-${notif.id}` });
    });

    // 3. Animal Health
    targetAnimals.forEach(animal => {
      if (animal.healthStatus === 'Under Treatment' || animal.healthStatus === 'Under Observation' || animal.healthStatus === 'Injured' || (animal.healthStatus as string) === 'Sick') {
        list.push({ id: `animal-health-${animal.id}` });
      }
    });

    // 4. Appointments
    const myAnimalIds = new Set(targetAnimals.map(a => a.id));
    const relatedAppointments = (appointments || []).filter(apt => myAnimalIds.has(apt.animalId) || apt.requestedBy?.toLowerCase().includes('keeper'));
    relatedAppointments.forEach(apt => {
      list.push({ id: `apt-${apt.id}` });
    });

    return list;
  }, [tasks, inventoryNotifications, myAssignedAnimals, activeAnimals, appointments]);

  const totalKeeperUnreadCount = useMemo(() => {
    return keeperNotifList.filter(item => !keeperReadNotifIds.includes(item.id)).length;
  }, [keeperNotifList, keeperReadNotifIds]);

  const handleMarkAllKeeperNotifsRead = () => {
    const allIds = keeperNotifList.map(n => n.id);
    setKeeperReadNotifIds(allIds);
    try {
      localStorage.setItem('feronia_keeper_read_notifs', JSON.stringify(allIds));
    } catch {}
    if (onMarkAllNotificationsAsRead) {
      onMarkAllNotificationsAsRead();
    }
  };

  // Form states for profile modal editing
  const [tempName, setTempName] = useState(profileName);
  const [tempEmail, setTempEmail] = useState(profileEmail);
  const [tempPhone, setTempPhone] = useState(profilePhone);
  const [tempAvatar, setTempAvatar] = useState(profileAvatar);
  const [tempBio, setTempBio] = useState(profileBio);

  const openProfileModal = () => {
    const activeStaff = currentKeeperStaff;
    const name = activeStaff?.name || localStorage.getItem('feronia_keeper_name') || localStorage.getItem('feronia_current_user_name') || profileName;
    const email = activeStaff?.email || localStorage.getItem('feronia_keeper_email') || localStorage.getItem('feronia_current_user_email') || profileEmail;
    const phone = activeStaff?.phone !== undefined ? activeStaff.phone : (localStorage.getItem('feronia_keeper_phone') || localStorage.getItem('feronia_current_user_phone') || profilePhone || '');
    const bio = activeStaff?.dutyLoad || localStorage.getItem('feronia_keeper_bio') || profileBio;

    setTempName(name);
    setTempEmail(email);
    setTempPhone(phone || '');
    setTempAvatar(profileAvatar);
    setTempBio(bio);
    setIsProfileModalOpen(true);
  };

  // Searching & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [taskTypeFilter, setTaskTypeFilter] = useState('All');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'All' | 'Pending' | 'Completed' | 'Overdue'>('All');
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<'All' | 'Admin' | 'Veterinarian'>('All');
  const [logTypeFilter, setLogTypeFilter] = useState('All');
  const [logCategoryFilter, setLogCategoryFilter] = useState('All');
  const [logAnimalFilter, setLogAnimalFilter] = useState('All');
  const [logDateFilter, setLogDateFilter] = useState('Today');
  const [selectedLogDetail, setSelectedLogDetail] = useState<any | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Tappable note expansion state
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});
  const toggleTaskExpand = (taskId: string) => {
    setExpandedTaskIds(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Full task note modal state
  const [viewingTaskNote, setViewingTaskNote] = useState<Task | null>(null);

  // QR Enclosure Field Scanner States
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [inspectedEnclosure, setInspectedEnclosure] = useState<Enclosure | null>(null);

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

  // Keeper Task Logging states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [logNotes, setLogNotes] = useState('');
  const [logEnclosureTemp, setLogEnclosureTemp] = useState('');
  const [logClinicalObs, setLogClinicalObs] = useState('');
  const [logPrescribedTreatment, setLogPrescribedTreatment] = useState('');
  const [logAdminStatus, setLogAdminStatus] = useState<'Full Dosage Administered' | 'Partial Dosage Administered' | 'Refused' | 'Topical Application' | 'Completed'>('Full Dosage Administered');
  const [logFeedSuccess, setLogFeedSuccess] = useState<'Successful' | 'Refused' | 'Regurgitated'>('Successful');
  const [logPoopObserved, setLogPoopObserved] = useState<'Observed' | 'Not Observed'>('Observed');
  const [logShedObserved, setLogShedObserved] = useState<'No Shedding' | 'Shedding (Incomplete)' | 'Shedding (Complete)'>('No Shedding');
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string>('');
  const [inventoryDeductQty, setInventoryDeductQty] = useState<number>(1);

  // Dedicated Medicine Administration Modal states
  const [isMedAdminModalOpen, setIsMedAdminModalOpen] = useState(false);
  const [medAdminAnimalId, setMedAdminAnimalId] = useState('');
  const [medAdminDate, setMedAdminDate] = useState(systemDate);
  const [medAdminClinicalObs, setMedAdminClinicalObs] = useState('');
  const [medAdminPrescribedTreatment, setMedAdminPrescribedTreatment] = useState('');
  const [medAdminItemId, setMedAdminItemId] = useState('');
  const [medAdminQty, setMedAdminQty] = useState(1);
  const [medAdminStatus, setMedAdminStatus] = useState<'Full Dosage Administered' | 'Partial Dosage Administered' | 'Refused' | 'Topical Application' | 'Completed'>('Full Dosage Administered');
  const [medAdminHealthStatus, setMedAdminHealthStatus] = useState<'Healthy' | 'Under Treatment' | 'Under Observation' | 'Injured' | 'Sick' | 'Require Vet'>('Under Treatment');
  const [medAdminNotes, setMedAdminNotes] = useState('');

  // Open Health & Vet Request Modal
  const handleOpenHealthVetModal = (targetAnimalId?: string) => {
    const defaultAnimal = targetAnimalId || (activeAnimals.length > 0 ? activeAnimals[0].id : '');
    setReqAnimalId(defaultAnimal);
    setReqType('Need of Observation / Monitoring');
    setReqPriority('High');
    setReqObservations('');
    setReqDate(systemDate || new Date().toISOString().split('T')[0]);
    setReqTime('10:00 AM');
    setIsHealthVetModalOpen(true);
  };

  // Submit Health & Vet Request to Operations -> Health & Vet
  const handleSubmitHealthVetRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqAnimalId) return;
    if (reqType === 'Other' && !customReqType.trim()) return;

    const patient = animals.find(a => a.id === reqAnimalId);
    const patientName = patient?.name || reqAnimalId;
    const currentUserId = typeof window !== 'undefined' ? (localStorage.getItem('feronia_current_user_id') || 'STF-KP-001') : 'STF-KP-001';
    const finalType = reqType === 'Other' ? (customReqType.trim() || 'Other Health Request') : reqType;

    const newApt: Appointment = {
      id: `APT-REQ-KEEPER-${Date.now().toString().slice(-5)}`,
      animalId: reqAnimalId,
      type: finalType,
      veterinarian: resolveVeterinarianName(undefined, staffMembers),
      requestedBy: `${profileName} (Keeper)`,
      requestedByRole: 'keeper',
      requestedById: currentUserId,
      requestedByEmail: profileEmail,
      date: reqDate || systemDate || new Date().toISOString().split('T')[0],
      time: reqTime || '10:00 AM',
      purpose: `Keeper Request: ${reqObservations}`,
      status: 'Pending Approval',
      priority: reqPriority,
      createdOn: systemDate || new Date().toISOString().split('T')[0]
    };

    if (onAddAppointment) {
      onAddAppointment(newApt);
    }

    setIsHealthVetModalOpen(false);
    setReqType('Need of Observation / Monitoring');
    setCustomReqType('');
    setReqObservations('');
    setActionToast(`✓ Request for ${patientName} submitted to Health & Vet! Awaiting Admin authorization in Animals → Health & Vet Queue.`);
    setTimeout(() => setActionToast(null), 5000);
  };

  // Quick Open Med Admin Modal
  const handleOpenMedAdminModal = (targetAnimalId?: string) => {
    const defaultAnimal = targetAnimalId || (activeAnimals.length > 0 ? activeAnimals[0].id : '');
    setMedAdminAnimalId(defaultAnimal);
    setMedAdminDate(systemDate);
    setMedAdminClinicalObs('Active, alert reflex, respiration unlabored, clean nares and vent.');
    setMedAdminPrescribedTreatment('Prescribed therapeutic medicine regimen');
    setMedAdminItemId(inventory.find(i => i.category === 'Medical' && i.currentStock > 0)?.id || '');
    setMedAdminQty(1);
    setMedAdminStatus('Full Dosage Administered');
    setMedAdminHealthStatus('Under Treatment');
    setMedAdminNotes('');
    setIsMedAdminModalOpen(true);
  };

  // Helper to open task modal and auto-suggest matching inventory item & details
  const handleOpenTaskModal = (task: Task) => {
    setSelectedTask(task);
    setInventoryDeductQty(1);
    setLogAdminStatus('Full Dosage Administered');

    // Extract clinical observation and prescribed treatment from task.details if present
    let extractedObs = '';
    let extractedTreatment = '';

    if (task.details) {
      const treatMatch = task.details.match(/Prescribed Treatment:\s*([^\n]+)/i);
      if (treatMatch && treatMatch[1]) extractedTreatment = treatMatch[1].trim();

      const obsMatch = task.details.match(/(?:Clinical Observation|Observation):\s*([^\n]+)/i);
      if (obsMatch && obsMatch[1]) extractedObs = obsMatch[1].trim();
    }

    if (!extractedTreatment && (task.type === 'Health Check' || (task.type as string) === 'Medical')) {
      extractedTreatment = task.title.replace(/^Administer Treatment \/ Follow-up:\s*/i, '').replace(/^Administer Treatment \/ Medication:\s*/i, '');
    }

    setLogClinicalObs(extractedObs || 'Alert, normal respiration, clean vent, responsive posture.');
    setLogPrescribedTreatment(extractedTreatment || (task.type === 'Health Check' ? 'Daily clinical checkup & therapy' : ''));

    if (inventory && inventory.length > 0) {
      let matchedItem: InventoryItem | undefined;
      
      // 1. Check if task details explicitly contains an item ID [ID:xxx]
      if (task.details && task.details.includes('[ID:')) {
        const idMatch = task.details.match(/\[ID:(.*?)\]/);
        if (idMatch && idMatch[1]) {
          const foundId = idMatch[1];
          matchedItem = inventory.find(i => i.id === foundId);
        }
      }

      // 2. Check if task details mentions an inventory item name
      if (!matchedItem && task.details) {
        matchedItem = inventory.find(i => task.details.toLowerCase().includes(i.name.toLowerCase()));
      }

      // 3. Fallback matching based on category
      if (!matchedItem) {
        if (task.type === 'Feeding') {
          matchedItem = inventory.find(i => i.category === 'Feeding' && i.currentStock > 0) || inventory.find(i => i.category === 'Feeding') || inventory[0];
        } else if ((task.type as string) === 'Care' || (task.type as string) === 'Supplement' || task.type === 'Cleaning' || task.type === 'Water Change') {
          matchedItem = inventory.find(i => (i.category === 'Supplement' || i.category === 'Medical' || i.category === 'Cleaning') && i.currentStock > 0);
        } else if (task.type === 'Health Check' || (task.type as string) === 'Medical') {
          matchedItem = inventory.find(i => i.category === 'Medical' && i.currentStock > 0);
        }
      }

      if (matchedItem) {
        setSelectedInventoryItemId(matchedItem.id);
      } else {
        setSelectedInventoryItemId('');
      }
    } else {
      setSelectedInventoryItemId('');
    }
  };

  // Active tasks corresponding to active animals (excluding pure vet checkups unless prescription/treatment instructions are given for keepers)
  const seenTaskKeys = new Set<string>();
  const allActiveAnimalTasks = tasks.filter(task => {
    if (!task || !task.id || task.id === 'null') return false;
    if (!task.animalId || task.animalId === 'null' || task.animalId === 'undefined' || task.animalId === 'GENERAL' || task.animalId === 'Animal') return false;
    if (task.title === 'null' || task.title?.includes('null Task') || task.title?.includes('null: null') || task.title?.includes('Daily Care Task') || task.title?.includes('Daily Care Task: Animal')) return false;
    if (task.title?.toLowerCase().includes('tiger') || task.details?.toLowerCase().includes('tiger')) return false;

    // Must belong to an active real animal
    const hasAnimal = animals.some(a => a.id === task.animalId) || activeAnimals.some(a => a.id === task.animalId);
    if (!hasAnimal) return false;

    if (task.enclosureId && task.enclosureId !== 'General' && !enclosures.some(e => e.id === task.enclosureId)) return false;

    const isFeedingOrCareTask = task.type === 'Feeding' || 
                                (task.type as string) === 'Care' || 
                                task.title?.toLowerCase().includes('feed') || 
                                task.title?.toLowerCase().includes('diet') || 
                                task.details?.toLowerCase().includes('routine:') ||
                                task.details?.toLowerCase().includes('food:');

    const isVetCheckup = !isFeedingOrCareTask && (
      task.assignedBy === 'Veterinarian' || 
      task.title?.toLowerCase().includes('checkup') || 
      task.title?.toLowerCase().includes('consultation') ||
      task.title?.toLowerCase().includes('veterinary')
    );

    const hasTreatmentInstruction = task.title?.toLowerCase().includes('administer') || 
                                    task.title?.toLowerCase().includes('treatment') || 
                                    task.details?.toLowerCase().includes('prescription') || 
                                    task.details?.toLowerCase().includes('treatment') || 
                                    task.details?.toLowerCase().includes('medication');
    if (isVetCheckup && !hasTreatmentInstruction) {
      return false;
    }

    // Deduplicate repetitive cloned tasks (e.g. dozens of identical deworming or feeding tasks)
    let cleanTitle = (task.title || '').trim();
    if (cleanTitle.includes(' - ') && (cleanTitle.match(/ - /g) || []).length > 1) {
      const parts = cleanTitle.split(' - ');
      cleanTitle = parts[0] + ' - ' + parts[1];
    }
    const normTitle = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
    const dedupKey = `${task.animalId}_${normTitle}_${task.frequency || 'Daily'}`;
    if (seenTaskKeys.has(dedupKey)) {
      return false;
    }
    seenTaskKeys.add(dedupKey);

    return true;
  });

  // Filter and sort tasks by priority & urgency (Overdue first, then earliest due time, completed last)
  const filteredTasks = sortTasksByPriorityAndDue(
    allActiveAnimalTasks.filter(task => {
      const resolvedAnimal = animals.find(a => a.id === task.animalId) || activeAnimals.find(a => a.id === task.animalId);
      const isAnimalInActiveScope = activeAnimals.some(a => a.id === task.animalId) || rosterViewMode === 'all';
      const isAssignedToMe = (task.assignedKeeperId && (task.assignedKeeperId === currentUserId || (currentKeeperStaff && task.assignedKeeperId === currentKeeperStaff.id))) ||
                             (task.assignedKeeperName && currentKeeperName && (task.assignedKeeperName.toLowerCase() === currentKeeperName.toLowerCase() || currentKeeperName.toLowerCase().includes(task.assignedKeeperName.toLowerCase())));

      if (!isAnimalInActiveScope && !isAssignedToMe) {
        return false;
      }

      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            task.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (resolvedAnimal && ((resolvedAnimal.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (resolvedAnimal.species || '').toLowerCase().includes(searchQuery.toLowerCase())));
      const matchesType = (() => {
        if (taskTypeFilter === 'All') return true;
        const cat = getTaskCategory(task);
        if (taskTypeFilter === 'Feeding') return cat === 'feeding';
        if (taskTypeFilter === 'Climate Setup' || taskTypeFilter === 'Climate') return cat === 'climate';
        if (taskTypeFilter === 'Care & Health' || taskTypeFilter === 'Health Check' || taskTypeFilter === 'Care') return cat === 'care';
        if (taskTypeFilter === 'Cleaning' || taskTypeFilter === 'Water Change') return cat === 'cleaning';
        return task.type === taskTypeFilter;
      })();

      const computedStatus = getTaskComputedStatus(task, systemDate);
      const matchesStatus = taskStatusFilter === 'All' 
        ? computedStatus !== 'Completed' 
        : (taskStatusFilter === ('ShowAll' as any) ? true : computedStatus === taskStatusFilter);

      const assignedBy = getTaskAssignedBy(task);
      const matchesAssignee = taskAssigneeFilter === 'All' || assignedBy === taskAssigneeFilter;

      return matchesSearch && matchesType && matchesStatus && matchesAssignee;
    }),
    systemDate
  );

  // Task execution & logging submit
  const handleTaskLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    // Toggle Task status to Completed
    onUpdateTaskStatus(selectedTask.id, 'Completed');

    // Dynamically update Enclosure Temperature if provided by keeper
    const animalObj = activeAnimals.find(a => a.id === selectedTask.animalId);
    const targetEncId = animalObj?.enclosureId || selectedTask.enclosureId;
    if (targetEncId && logEnclosureTemp && onUpdateEnclosure) {
      const enclosure = enclosures.find(e => e.id === targetEncId);
      if (enclosure) {
        onUpdateEnclosure({
          ...enclosure,
          temperature: `${logEnclosureTemp}°C`
        });
      }
    }

    let inventoryMessage = '';
    let selectedItemObj: InventoryItem | undefined;

    // Handle Inventory Stock Deduction if item selected
    if (selectedInventoryItemId && onUpdateInventory && inventory.length > 0) {
      selectedItemObj = inventory.find(i => i.id === selectedInventoryItemId);
      if (selectedItemObj) {
        const { updatedInventory, deductedItem } = deductInventoryStock(
          inventory,
          selectedInventoryItemId,
          Number(inventoryDeductQty) || 1
        );
        onUpdateInventory(updatedInventory);
        if (deductedItem) {
          inventoryMessage = `\n📦 Inventory Deducted: ${inventoryDeductQty} ${deductedItem.unit} of "${deductedItem.name}". (New stock: ${deductedItem.currentStock} ${deductedItem.unit})`;
        }
      }
    }

    const animal = activeAnimals.find(a => a.id === selectedTask.animalId);
    if (animal) {
      const isMedical = selectedTask.type === 'Health Check' || 
                        (selectedTask.type as string) === 'Medical' || 
                        (selectedItemObj && selectedItemObj.category === 'Medical') || 
                        (logPrescribedTreatment && logPrescribedTreatment.trim().length > 0);

      const newLogEntry: KeeperLogEntry = {
        id: `KLOG-${Date.now().toString().slice(-6)}`,
        animalId: animal.id,
        date: systemDate,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        keeperName: profileName,
        logType: isMedical ? 'Medicine Administration' : (selectedTask.type === 'Feeding' ? 'Feeding Log' : 'General Care'),
        clinicalObservation: logClinicalObs || (isMedical ? 'Patient alert and observed' : undefined),
        prescribedTreatment: logPrescribedTreatment || selectedTask.title,
        medicineName: selectedItemObj ? selectedItemObj.name : (logPrescribedTreatment ? logPrescribedTreatment.slice(0, 40) : undefined),
        dosage: selectedItemObj ? `${inventoryDeductQty} ${selectedItemObj.unit}` : undefined,
        administrationStatus: logAdminStatus,
        inventoryItemId: selectedInventoryItemId || undefined,
        deductedQuantity: inventoryDeductQty > 0 && selectedInventoryItemId ? inventoryDeductQty : undefined,
        notes: logNotes || `Task "${selectedTask.title}" completed.`,
        createdAt: new Date().toISOString()
      };

      const existingLogs = animal.keeperLogs || [];

      onUpdateAnimal({
        ...animal,
        keeperLogs: [newLogEntry, ...existingLogs]
      });
    }

    // Reset logging
    setSelectedTask(null);
    setLogNotes('');
    setLogEnclosureTemp('');
    setLogClinicalObs('');
    setLogPrescribedTreatment('');
    setSelectedInventoryItemId('');
    setActionToast(`✓ Task recorded on Keeper's Log!${inventoryMessage ? ` ${inventoryMessage.trim()}` : ''}`);
    setTimeout(() => setActionToast(null), 4500);
  };

  // Dedicated Medicine Administration Submit
  const handleAdministerMedicineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medAdminAnimalId) {
      alert('Please select a target animal.');
      return;
    }
    const animal = activeAnimals.find(a => a.id === medAdminAnimalId);
    if (!animal) return;

    let inventoryMessage = '';
    let selectedItemObj: InventoryItem | undefined;

    if (medAdminItemId && onUpdateInventory && inventory.length > 0) {
      selectedItemObj = inventory.find(i => i.id === medAdminItemId);
      if (selectedItemObj) {
        const { updatedInventory, deductedItem } = deductInventoryStock(
          inventory,
          medAdminItemId,
          Number(medAdminQty) || 1
        );
        onUpdateInventory(updatedInventory);
        if (deductedItem) {
          inventoryMessage = `\n📦 Stock Deducted: ${medAdminQty} ${deductedItem.unit} of "${deductedItem.name}". (New stock: ${deductedItem.currentStock} ${deductedItem.unit})`;
        }
      }
    }

    const newLogEntry: KeeperLogEntry = {
      id: `KLOG-MED-${Date.now().toString().slice(-6)}`,
      animalId: animal.id,
      date: medAdminDate || systemDate,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      keeperName: profileName,
      logType: 'Medicine Administration',
      clinicalObservation: medAdminClinicalObs || 'Alert and responsive during clinical administration',
      prescribedTreatment: medAdminPrescribedTreatment || 'Prescribed medical regimen',
      medicineName: selectedItemObj ? selectedItemObj.name : (medAdminPrescribedTreatment ? medAdminPrescribedTreatment.slice(0, 40) : undefined),
      dosage: selectedItemObj ? `${medAdminQty} ${selectedItemObj.unit}` : undefined,
      administrationStatus: medAdminStatus,
      inventoryItemId: medAdminItemId || undefined,
      deductedQuantity: medAdminQty > 0 && medAdminItemId ? medAdminQty : undefined,
      notes: medAdminNotes || 'Administered according to prescription.',
      createdAt: new Date().toISOString()
    };

    const existingLogs = animal.keeperLogs || [];

    onUpdateAnimal({
      ...animal,
      healthStatus: medAdminHealthStatus,
      keeperLogs: [newLogEntry, ...existingLogs]
    });

    setIsMedAdminModalOpen(false);
    setMedAdminClinicalObs('');
    setMedAdminPrescribedTreatment('');
    setMedAdminItemId('');
    setMedAdminQty(1);
    setMedAdminNotes('');
    setActionToast(`✓ Medicine administration & clinical observation successfully recorded for ${animal.name || animal.id}!${inventoryMessage ? ` ${inventoryMessage.trim()}` : ''}`);
    setTimeout(() => setActionToast(null), 5000);
  };

  const pendingCount = allActiveAnimalTasks.filter(t => getTaskComputedStatus(t, systemDate) === 'Pending').length;
  const overdueCount = allActiveAnimalTasks.filter(t => getTaskComputedStatus(t, systemDate) === 'Overdue').length;
  const completedCount = allActiveAnimalTasks.filter(t => getTaskComputedStatus(t, systemDate) === 'Completed').length;

  // Keeper's Logs Category Badges & Dot Styling
  const getCategoryBadgeStyle = (type: string) => {
    switch (type) {
      case 'Medication':
        return 'bg-purple-950/70 text-purple-300 border-purple-800/60';
      case 'Feeding':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
      case 'Care':
        return 'bg-blue-950/70 text-blue-300 border-blue-800/60';
      case 'Habitat Care':
        return 'bg-teal-950/70 text-teal-300 border-teal-800/60';
      case 'Observation':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/60';
      case 'Treatment':
        return 'bg-rose-950/70 text-rose-300 border-rose-800/60';
      default:
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
    }
  };

  const getCategoryDotColor = (type: string) => {
    switch (type) {
      case 'Medication':
        return 'bg-purple-400 ring-4 ring-purple-950';
      case 'Feeding':
        return 'bg-emerald-400 ring-4 ring-emerald-950';
      case 'Care':
        return 'bg-blue-400 ring-4 ring-blue-950';
      case 'Habitat Care':
        return 'bg-teal-400 ring-4 ring-teal-950';
      case 'Observation':
        return 'bg-amber-400 ring-4 ring-amber-950';
      case 'Treatment':
        return 'bg-rose-400 ring-4 ring-rose-950';
      default:
        return 'bg-emerald-400 ring-4 ring-emerald-950';
    }
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'Medication':
        return Pill;
      case 'Feeding':
        return Utensils;
      case 'Care':
        return Sparkles;
      case 'Habitat Care':
        return Droplets;
      case 'Observation':
        return Eye;
      case 'Treatment':
        return Stethoscope;
      default:
        return ClipboardList;
    }
  };

  interface UnifiedKeeperRecord {
    id: string;
    type: 'Medication' | 'Feeding' | 'Care' | 'Habitat Care' | 'Observation' | 'Treatment';
    time: string;
    date: string;
    title: string;
    animalId: string;
    animalName: string;
    species: string;
    morph?: string;
    imageUrl?: string;
    animalDisplay: string;
    enclosureId: string;
    details: string;
    keeperName: string;
    notes?: string;
    clinicalObservation?: string;
    prescribedTreatment?: string;
    medicineName?: string;
    dosage?: string;
    administrationStatus?: string;
  }

  // Aggregate all keeper logs across all animals + completed tasks into unified record stream
  const unifiedKeeperRecords: UnifiedKeeperRecord[] = [];

  // 1. Logs from animal.keeperLogs (e.g. administered medicines, recorded checks, observations)
  activeAnimals.forEach(animal => {
    const animalLogs = getAllKeeperLogsForAnimal(animal);
    animalLogs.forEach(log => {
      let cat: UnifiedKeeperRecord['type'] = 'Care';
      const logLower = (log.logType || '').toLowerCase();
      const treatLower = (log.prescribedTreatment || '').toLowerCase();
      const notesLower = (log.notes || '').toLowerCase();

      if (log.logType === 'Medicine Administration' || log.medicineName || treatLower.includes('deworm') || treatLower.includes('med')) {
        cat = 'Medication';
      } else if (log.logType === 'Feeding Log' || treatLower.includes('feed') || notesLower.includes('salad') || notesLower.includes('roach') || notesLower.includes('mouse')) {
        cat = 'Feeding';
      } else if (treatLower.includes('misting') || notesLower.includes('humidity') || notesLower.includes('temperature') || treatLower.includes('temperature')) {
        cat = 'Habitat Care';
      } else if (log.logType === 'Clinical Checkup' || treatLower.includes('wound') || treatLower.includes('treatment') || treatLower.includes('follow-up') || treatLower.includes('soak')) {
        cat = 'Treatment';
      } else if (log.logType === 'Observation' || treatLower.includes('behavior') || notesLower.includes('behavior') || notesLower.includes('active')) {
        cat = 'Observation';
      } else {
        cat = 'Care';
      }

      const displayTitle = log.prescribedTreatment || (log.medicineName ? `${log.medicineName} administered` : log.logType);
      const animalDisplay = `${animal.id} • ${animal.name ? `${animal.name} (${animal.species})` : animal.species}`;

      unifiedKeeperRecords.push({
        id: log.id,
        type: cat,
        time: log.time || '08:00 AM',
        date: log.date || systemDate,
        title: displayTitle,
        animalId: animal.id,
        animalName: animal.name || animal.species,
        species: animal.species,
        morph: animal.morph,
        imageUrl: animal.image || animal.imageUrl || animal.photoUrl,
        animalDisplay,
        enclosureId: animal.enclosureId || 'General',
        details: log.notes || log.clinicalObservation || log.dosage || 'Observation recorded.',
        keeperName: log.keeperName ? log.keeperName.replace(/^Keeper\s*/i, '') || 'Keeper' : 'Keeper',
        notes: log.notes,
        clinicalObservation: log.clinicalObservation,
        prescribedTreatment: log.prescribedTreatment,
        medicineName: log.medicineName,
        dosage: log.dosage,
        administrationStatus: log.administrationStatus
      });
    });
  });

  // 2. Logs from completed tasks (Daily Tasks marked completed by keeper)
  tasks.forEach(task => {
    if (task.status === 'Completed' || task.completedAt) {
      const animal = activeAnimals.find(a => a.id === task.animalId);
      let cat: UnifiedKeeperRecord['type'] = 'Care';
      const taskTitleLower = (task.title || '').toLowerCase();
      const taskType = task.type;

      if (taskType === 'Feeding' || taskTitleLower.includes('feed')) {
        cat = 'Feeding';
      } else if (taskTitleLower.includes('deworm') || taskTitleLower.includes('med') || taskTitleLower.includes('calcium') || taskTitleLower.includes('antibiotic')) {
        cat = 'Medication';
      } else if (taskTitleLower.includes('misting') || taskTitleLower.includes('temp') || taskTitleLower.includes('humidity')) {
        cat = 'Habitat Care';
      } else if (taskTitleLower.includes('soak') || taskTitleLower.includes('wound') || taskTitleLower.includes('treatment') || taskTitleLower.includes('tail check')) {
        cat = 'Treatment';
      } else if (taskType === 'Health Check' || taskType === 'Observation' || taskTitleLower.includes('observation') || taskTitleLower.includes('behavior')) {
        cat = 'Observation';
      } else {
        cat = 'Care';
      }

      let displayTitle = task.title;
      if (task.title === 'Weekly Feeding') displayTitle = 'Feeding completed';
      else if (task.title === 'Morning Misting & Sanitize') displayTitle = 'Misting & sanitation completed';
      else if (task.title === 'Topical Treatment & Tail Check') displayTitle = 'Topical treatment completed';
      else if (task.title === 'Electrolyte Soak & Shell Check') displayTitle = 'Electrolyte soak completed';
      else if (task.title === 'Calcium Supplement Regimen') displayTitle = 'Calcium supplement administered';
      else if (!(displayTitle || '').toLowerCase().includes('completed') && !(displayTitle || '').toLowerCase().includes('administered')) {
        displayTitle = `${task.title} completed`;
      }

      const animalDisplay = animal
        ? `${animal.id} • ${animal.name ? `${animal.name} (${animal.species})` : animal.species}`
        : `${task.animalId} • Reptile`;

      // Avoid exact duplicate
      const isDuplicate = unifiedKeeperRecords.some(r => r.animalId === task.animalId && r.title === displayTitle && r.time === (task.completedAt || task.time));
      if (!isDuplicate) {
        unifiedKeeperRecords.push({
          id: `TASK-LOG-${task.id}`,
          type: cat,
          time: task.completedAt || task.time || '08:45 AM',
          date: task.date || systemDate,
          title: displayTitle,
          animalId: task.animalId,
          animalName: animal?.name || task.animalId,
          species: animal?.species || 'Reptile',
          morph: animal?.morph,
          imageUrl: animal?.image || animal?.imageUrl || animal?.photoUrl,
          animalDisplay,
          enclosureId: task.enclosureId || animal?.enclosureId || 'General',
          details: task.notes || task.details || 'Routine care completed.',
          keeperName: task.completedBy ? task.completedBy.replace(/^Keeper\s*/i, '') || 'Keeper' : 'Keeper',
          notes: task.notes || task.details
        });
      }
    }
  });

  // Sort by time descending (e.g. 09:05 AM > 08:30 AM > 08:10 AM...)
  const parseTimeToMinutes = (tStr: string) => {
    if (!tStr) return 0;
    const match = tStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const modifier = match[3] ? match[3].toUpperCase() : 'AM';
    if (hours === 12 && modifier === 'AM') hours = 0;
    if (hours !== 12 && modifier === 'PM') hours += 12;
    return hours * 60 + minutes;
  };

  unifiedKeeperRecords.sort((a, b) => {
    const tA = parseTimeToMinutes(a.time);
    const tB = parseTimeToMinutes(b.time);
    return tB - tA;
  });

  // Filter unified keeper records
  const finalFilteredRecords = unifiedKeeperRecords.filter(item => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (item.title || '').toLowerCase().includes(q) ||
        (item.animalDisplay || '').toLowerCase().includes(q) ||
        (item.details || '').toLowerCase().includes(q) ||
        (item.enclosureId || '').toLowerCase().includes(q) ||
        (item.keeperName || '').toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q) ||
        (item.medicineName || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // 2. Category Filter
    if (logCategoryFilter !== 'All') {
      if (logCategoryFilter === 'Care') {
        if (item.type !== 'Care' && item.type !== 'Habitat Care') return false;
      } else if (item.type !== logCategoryFilter) {
        return false;
      }
    }

    // 3. Animal Filter
    if (logAnimalFilter !== 'All') {
      if (item.animalId !== logAnimalFilter) return false;
    }

    // 4. Date Filter
    if (logDateFilter === 'Yesterday') {
      const yesterday = new Date(systemDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      if (item.date !== yStr) return false;
    }

    return true;
  });

  const checkClimateTaskCanBeCompleted = (task: Task | string): { allowed: boolean; reason?: string } => {
    const targetTask = typeof task === 'string' ? tasks.find(t => t.id === task) : task;
    if (!targetTask) return { allowed: true };

    const isClimate = getTaskCategory(targetTask) === 'climate';
    if (!isClimate) return { allowed: true };

    const animal = animals.find(a => a.id === targetTask.animalId);
    const targetEnclosure = enclosures.find(e => 
      (targetTask.enclosureId && (e.id === targetTask.enclosureId || e.name === targetTask.enclosureId)) ||
      (animal && animal.enclosureId && (e.id === animal.enclosureId || e.name === animal.enclosureId))
    );

    if (targetEnclosure && targetEnclosure.climateProfile?.status === 'Pending Setup') {
      return { 
        allowed: false, 
        reason: `⚠️ Cannot complete task: Enclosure "${targetEnclosure.name}" Climate Calibration is not yet set up.` 
      };
    }
    return { allowed: true };
  };

  const toggleDashboardTask = (taskId: string, title?: string, animalName?: string) => {
    const isCurrentlyChecked = !!dashboardChecked[taskId];
    if (!isCurrentlyChecked) {
      const check = checkClimateTaskCanBeCompleted(taskId);
      if (!check.allowed) {
        setActionToast(check.reason || '⚠️ Climate setup required first.');
        setTimeout(() => setActionToast(null), 5000);
        return;
      }
    }
    setDashboardChecked(prev => {
      const nextVal = !prev[taskId];
      if (nextVal) {
        setActionToast(`✓ Completed: "${title || animalName || 'Task'}"`);
        setTimeout(() => setActionToast(null), 3000);
      }
      return { ...prev, [taskId]: nextVal };
    });
  };

  const handleDeleteKeeperLog = (recordId: string, animalId: string, logTitle?: string) => {
    const animal = animals.find(a => a.id === animalId);
    if (animal) {
      const updatedLogs = (animal.keeperLogs || []).filter(l => l.id !== recordId);
      let updatedNotes = animal.notes || '';
      if (logTitle) {
        const escaped = logTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const blockRegex = new RegExp(`\\[(Keeper's Medical Log|Keeper's Log|Keeper Log|Log)[^\\]]*\\]:?[\\s\\S]*?${escaped}[\\s\\S]*?(?=(\\[(?:Keeper's Medical Log|Keeper's Log|Keeper Log|Log)|\\Z))`, 'gi');
        updatedNotes = updatedNotes.replace(blockRegex, '').trim();
      }
      onUpdateAnimal({
        ...animal,
        notes: updatedNotes,
        keeperLogs: updatedLogs
      });
      setSelectedLogDetail(null);
      setActionToast('✓ Keeper log removed');
      setTimeout(() => setActionToast(null), 3000);
    }
  };

  // Dynamic derivation of operational tasks
  const formattedDateInfo = getFormattedDateWithDay(systemDate);

  const fallbackTodayTasks = [
    {
      id: 'task-today-1',
      animalName: 'Bearded Dragon',
      species: 'Reptile',
      action: 'Feed & Water',
      time: '08:00 AM',
      status: 'Pending',
      statusStyle: 'bg-[#2D1F08] text-[#F3BA4F] border border-[#523B12]',
      imageUrl: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&q=80&w=400'
    },
    {
      id: 'task-today-2',
      animalName: 'Ball Python',
      species: 'Reptile',
      action: 'Check Enclosure',
      time: '09:00 AM',
      status: 'Pending',
      statusStyle: 'bg-[#2D1F08] text-[#F3BA4F] border border-[#523B12]',
      imageUrl: 'https://images.unsplash.com/photo-1531386151447-fd76ad50012f?auto=format&fit=crop&q=80&w=400'
    },
    {
      id: 'task-today-3',
      animalName: 'Sugar Glider',
      species: 'Mammal',
      action: 'Clean Enclosure',
      time: '10:00 AM',
      status: 'In Progress',
      statusStyle: 'bg-[#062919] text-[#2DD4BF] border border-[#0F5535]',
      imageUrl: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&q=80&w=400'
    },
    {
      id: 'task-today-4',
      animalName: 'Tarantula',
      species: 'Arachnid',
      action: 'Feed',
      time: '01:00 PM',
      status: 'Upcoming',
      statusStyle: 'bg-[#0D221A] text-slate-300 border border-slate-700/60',
      imageUrl: 'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?auto=format&fit=crop&q=80&w=400'
    }
  ];

  const dynamicTodayTasks = sortTasksByPriorityAndDue(
    allActiveAnimalTasks.filter(t => t.date === systemDate || t.status === 'Pending' || t.status === 'In Progress'),
    systemDate
  ).map(t => {
      const animal = activeAnimals.find(a => a.id === t.animalId) || animals.find(a => a.id === t.animalId);
      const isChecked = !!dashboardChecked[t.id] || t.status === 'Completed';
      return {
        id: t.id,
        animalName: animal?.name || t.animalId,
        species: animal?.species || 'Reptile',
        action: resolveTaskTitle(t, animal),
        time: t.time || '09:00 AM',
        status: isChecked ? 'Completed' : t.status,
        statusStyle: isChecked
          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
          : t.status === 'Overdue'
          ? 'bg-rose-950/50 text-rose-300 border border-rose-800/60'
          : t.status === 'In Progress'
          ? 'bg-[#062919] text-[#2DD4BF] border border-[#0F5535]'
          : 'bg-[#2D1F08] text-[#F3BA4F] border border-[#523B12]',
        imageUrl: animal?.image || animal?.imageUrl || getTaskImage(t.type)
      };
    });

  const todayTaskRows = dynamicTodayTasks;

  const dynamicUpcomingTasks = sortTasksByPriorityAndDue(
    allActiveAnimalTasks.filter(t => t.status !== 'Completed' && !dashboardChecked[t.id]),
    systemDate
  )
    .slice(0, 4)
    .map(t => {
      const animal = activeAnimals.find(a => a.id === t.animalId) || animals.find(a => a.id === t.animalId);
      const computedStatus = getTaskComputedStatus(t, systemDate);
      return {
        id: t.id,
        title: resolveTaskTitle(t, animal),
        time: t.time || '02:00 PM',
        status: computedStatus,
        statusStyle: computedStatus === 'Overdue'
          ? 'bg-rose-950/80 text-rose-400 border border-rose-700'
          : t.status === 'In Progress' 
          ? 'bg-[#062919] text-[#2DD4BF] border border-[#0F5535]' 
          : 'bg-[#2D1F08] text-[#F3BA4F] border border-[#523B12]',
        imageUrl: animal?.image || animal?.imageUrl || getTaskImage(t.type)
      };
    });

  const upcomingTaskRows = dynamicUpcomingTasks;

  const recentActivities = unifiedKeeperRecords.length > 0 
    ? unifiedKeeperRecords.slice(0, 5) 
    : [];

  const activeBreedingCount = breedingRecords.filter(r => r.status !== 'COMPLETED' && r.status !== 'SUCCESSFUL' && r.status !== 'FAILED').length;
  const pendingClimateSetupCount = enclosures.filter(e => e.climateProfile?.status === 'Pending Setup').length;

  const navMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'animals', label: 'Animals', icon: PawPrint },
    { id: 'checklist', label: 'Daily Tasks & Checklist', icon: ClipboardList, badge: (pendingCount + overdueCount) > 0 ? (pendingCount + overdueCount) : undefined },
    { id: 'breeding', label: 'Breeding & Incubation', icon: Heart, badge: activeBreedingCount > 0 ? activeBreedingCount : undefined },
    { id: 'inventory', label: 'Inventory & Supplies', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined },
    { id: 'enclosures', label: 'Enclosures', icon: Shield, badge: pendingClimateSetupCount > 0 ? pendingClimateSetupCount : undefined },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${
      isDarkMode ? 'bg-[#04140D] text-white' : 'bg-[#F4F7F5] text-slate-800'
    }`}>
      
      {/* Sidebar - Desktop (Harmonized with Admin & Vet layout & theme) */}
      <aside className={`hidden lg:flex w-64 flex-col justify-between shrink-0 border-r z-20 h-full overflow-hidden transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-[#06180F] text-emerald-100 border-emerald-950/60' 
          : 'bg-white text-slate-800 border-slate-200/80 shadow-xs'
      }`}>
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar justify-between pb-4">
          <div className="flex flex-col">
            {/* Logo Brand Header */}
            <div className={`p-4 border-b flex items-center space-x-3 transition-colors ${
              isDarkMode ? 'border-emerald-950/60 bg-[#04110A]' : 'border-slate-200/80 bg-emerald-50/50'
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                isDarkMode ? 'bg-emerald-900/50 border-emerald-500/30 text-emerald-400' : 'bg-emerald-100 border-emerald-300 text-emerald-700'
              }`}>
                <Leaf className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400 fill-emerald-400/20' : 'text-emerald-700 fill-emerald-700/20'}`} />
              </div>
              <div>
                <span className={`font-black text-base tracking-wider block leading-none ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>FERONIA</span>
                <span className={`text-[10px] font-extrabold tracking-wider block mt-1.5 leading-none ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>KEEPER STATION</span>
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
                  <p className={`text-xs font-black leading-tight truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{profileName || 'Animal Keeper'}</p>
                  <p className={`text-[10px] font-bold leading-tight mt-0.5 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Keeper</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <span className={`text-[9px] font-extrabold uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>● ONLINE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="p-3 space-y-1">
              {navMenuItems.map(item => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'inventory') {
                        setSelectedInventorySearch('');
                      }
                      navigateToMenu(item.id as any);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-[#00C274] text-white shadow-lg shadow-emerald-950/40 font-bold' 
                        : (isDarkMode ? 'text-emerald-100/70 hover:bg-emerald-900/20 hover:text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900')
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : (isDarkMode ? 'text-emerald-400' : 'text-slate-400')}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        isActive ? 'bg-white text-emerald-800' : 'bg-rose-500 text-white shadow-xs'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Clean Footer */}
          <div className={`p-4 text-center border-t relative overflow-hidden ${
            isDarkMode ? 'border-emerald-950/40 bg-[#04110A]/30 text-emerald-500/50' : 'border-slate-200/80 bg-slate-50/50 text-slate-400'
          }`}>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 pointer-events-none opacity-10 text-emerald-400">
              <Leaf className="w-full h-full" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider leading-none relative z-10">© 2026 FERONIA</p>
            <p className="text-[10px] mt-1 leading-none opacity-70 relative z-10">All rights reserved.</p>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (Matches Admin and Vet Dashboard format) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className={`relative w-72 max-w-[80vw] h-full flex flex-col justify-between shadow-2xl transition-colors duration-300 z-10 ${
            isDarkMode ? 'bg-[#06180F] text-emerald-100 border-r border-emerald-950/60' : 'bg-white text-slate-800 border-r border-slate-200'
          }`}>
            <div className="flex flex-col h-full overflow-y-auto no-scrollbar justify-between pb-4">
              <div className="flex flex-col">
                {/* Logo & Close */}
                <div className={`p-4 border-b flex items-center justify-between transition-colors ${
                  isDarkMode ? 'border-emerald-950/60 bg-[#04110A]' : 'border-slate-200/80 bg-emerald-50/50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                      isDarkMode ? 'bg-emerald-900/50 border-emerald-500/30 text-emerald-400' : 'bg-emerald-100 border-emerald-300 text-emerald-700'
                    }`}>
                      <Leaf className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400 fill-emerald-400/20' : 'text-emerald-700 fill-emerald-700/20'}`} />
                    </div>
                    <div>
                      <span className={`font-black text-base tracking-wider block leading-none ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>FERONIA</span>
                      <span className={`text-[10px] font-extrabold tracking-wider block mt-1.5 leading-none ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>KEEPER STATION</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
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
                      <p className={`text-xs font-black leading-tight truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{profileName || 'Animal Keeper'}</p>
                      <p className={`text-[10px] font-bold leading-tight mt-0.5 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Keeper</p>
                      <div className="flex items-center space-x-1 mt-1">
                        <span className={`text-[9px] font-extrabold uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>● ONLINE</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nav Links */}
                <nav className="p-3 space-y-1">
                  {navMenuItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeMenu === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.id === 'inventory') {
                            setSelectedInventorySearch('');
                          }
                          navigateToMenu(item.id as any);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-[#00C274] text-white shadow-lg shadow-emerald-950/40' 
                            : (isDarkMode ? 'text-emerald-100/70 hover:bg-emerald-900/20 hover:text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900')
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : (isDarkMode ? 'text-emerald-400' : 'text-slate-400')}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            isActive ? 'bg-white text-emerald-800' : 'bg-rose-500 text-white shadow-xs'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className={`p-4 text-center border-t relative overflow-hidden ${
                isDarkMode ? 'border-emerald-950/40 bg-[#04110A]/30 text-emerald-500/50' : 'border-slate-200/80 bg-slate-50/50 text-slate-400'
              }`}>
                <p className="text-xs font-bold uppercase tracking-wider leading-none">© 2026 FERONIA</p>
                <p className="text-[10px] mt-1 leading-none opacity-70">All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Topbar */}
        <header className={`h-20 border-b flex items-center justify-between px-6 shrink-0 transition-colors duration-300 ${
          isDarkMode ? 'bg-[#061A10] border-emerald-950/60 text-white' : 'bg-white border-slate-100 text-slate-800'
        }`}>
          <div className="flex items-center space-x-3 flex-1 max-w-xs md:max-w-md">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`p-2 rounded-xl border lg:hidden cursor-pointer transition-colors ${
                isDarkMode ? 'bg-[#061F13] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder={
                  activeMenu === 'breeding'
                    ? "Search breeding pairs, dams, sires, species..."
                    : activeMenu === 'reports'
                    ? "Search inventory reports, stock supplies..."
                    : activeMenu === 'enclosures'
                    ? "Search enclosures by ID or habitat..."
                    : "Search checklist or animals..."
                }
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

          <div className="flex items-center space-x-2.5 sm:space-x-3">
            {/* System Date selector with Date & Day of Week capsule */}
            <div 
              className={`relative hidden sm:flex items-center space-x-2.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer group ${
                isDarkMode 
                  ? 'bg-[#04110A] border-emerald-900/60 hover:border-emerald-500/80 text-emerald-300' 
                  : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-[#113C24]'
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-left leading-tight">
                <span className={`text-xs font-black tracking-wide block ${
                  isDarkMode ? 'text-emerald-200' : 'text-[#113C24]'
                }`}>
                  {formattedDateInfo.dateFormatted}
                </span>
                <span className={`text-[10px] font-medium block ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {formattedDateInfo.dayOfWeek}
                </span>
              </div>
              <input
                type="date"
                value={systemDate}
                onChange={(e) => handleUpdateSystemDate(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Change System Date"
              />
            </div>

            {/* QR Scanner Quick Button */}
            <button
              onClick={() => setIsQrScannerOpen(true)}
              className={`hidden sm:flex items-center space-x-1.5 px-3 py-2 border text-xs font-bold rounded-xl cursor-pointer transition-all ${
                isDarkMode 
                  ? 'bg-[#061F13] border-emerald-900/60 text-emerald-300 hover:bg-emerald-900/40 hover:border-emerald-500/50' 
                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-[#113C24]'
              }`}
              title="Scan Enclosure QR Code"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">QR Scan</span>
            </button>

            {/* Keeper Care & Task Alerts Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationDropdownOpen(!isNotificationDropdownOpen)}
                className={`relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                  isNotificationDropdownOpen
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isDarkMode 
                      ? 'bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-800/40' 
                      : 'bg-emerald-50 text-[#113C24] hover:bg-emerald-100 border border-emerald-100'
                }`}
                title="Keeper Care & Task Alerts, Supplies Updates & Health Notifications"
              >
                <Bell className="w-4 h-4" />
                {totalKeeperUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] h-4 px-1 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse shadow-xs">
                    {totalKeeperUnreadCount > 9 ? '9+' : totalKeeperUnreadCount}
                  </span>
                )}
              </button>

              <KeeperNotificationDropdown
                isOpen={isNotificationDropdownOpen}
                onClose={() => setIsNotificationDropdownOpen(false)}
                tasks={tasks}
                inventoryNotifications={inventoryNotifications}
                assignedAnimals={myAssignedAnimals.length > 0 ? myAssignedAnimals : activeAnimals}
                appointments={appointments}
                systemDate={systemDate}
                isDarkMode={isDarkMode}
                readIds={keeperReadNotifIds}
                onNavigateToTasks={() => {
                  setActiveMenu('checklist');
                }}
                onNavigateToInventory={(searchItem) => {
                  if (searchItem) setSelectedInventorySearch(searchItem);
                  setActiveMenu('inventory');
                }}
                onNavigateToAnimal={(animal) => {
                  setSelectedAnimalForKeeperModal(animal);
                  setSelectedAnimalInitialTab('overview');
                  setActiveMenu('animals');
                }}
                onNavigateToAppointments={() => {
                  setActiveMenu('dashboard');
                }}
                onMarkAllNotificationsAsRead={handleMarkAllKeeperNotifsRead}
                onMarkNotificationAsRead={handleMarkKeeperNotifRead}
              />
            </div>

            {/* Dark Mode toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                isDarkMode 
                  ? 'bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/60 border-emerald-800/40' 
                  : 'bg-emerald-50 text-[#113C24] hover:bg-emerald-100 border-emerald-100'
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Profile Dropdown */}
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
                      ? 'bg-[#061A10] border-emerald-950/60 text-white' 
                      : 'bg-white border-slate-100 text-slate-800'
                  }`}>
                    <div className="flex items-center space-x-3 border-b pb-3 mb-3 border-emerald-950/20 dark:border-emerald-950/60">
                      <UserAvatar
                        avatar={profileAvatar}
                        name={profileName}
                        size="lg"
                        isDarkMode={isDarkMode}
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black truncate">{profileName}</h4>
                        <p className="text-xs text-slate-400 font-mono truncate">{profileEmail}</p>
                        {profilePhone && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono truncate mt-0.5">{profilePhone}</p>
                        )}
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

        {/* Action Toast Notification */}
        {actionToast && (
          <div className={`px-6 py-3 border-b text-xs font-bold flex items-center space-x-2 animate-fade-in ${
            isDarkMode ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <CheckCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{actionToast}</span>
          </div>
        )}

        {/* Content Container */}
        <main className={`flex-1 overflow-y-auto p-5 sm:p-7 transition-colors duration-300 ${isDarkMode ? 'bg-[#04140D]' : 'bg-[#F4F7F5]'}`}>
          
          {/* 0. ANIMAL KEEPER DASHBOARD (OVERVIEW) */}
          {activeMenu === 'dashboard' && (
            <div className="space-y-6 max-w-[1440px] mx-auto">
              
              {/* Header Hero Banner: Greeting */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#03150D] via-[#052215] to-[#062B1A] border border-emerald-950/70 p-6 sm:p-7 shadow-xl">
                {/* Background foliage overlay and subtle image */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-1/2 sm:w-2/5 overflow-hidden pointer-events-none hidden md:block">
                  <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#052215]/80 to-[#052215] z-10" />
                  <img
                    src="https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&q=80&w=800"
                    alt="Sanctuary Reptile"
                    className="w-full h-full object-cover object-right opacity-40 mix-blend-luminosity filter saturate-150"
                  />
                </div>
                
                <div className="relative z-20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Left: Sprout icon & Greeting */}
                  <div className="flex items-center space-x-4">
                    <div className="w-13 h-13 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-950/60">
                      <Sprout className="w-7 h-7" />
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Good morning, {profileName.split(' ')[0] || 'Keeper'}!
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-300/80 mt-1 font-medium">
                        Here's your tasks and animal updates for today.
                      </p>
                    </div>
                  </div>

                  {/* Right: Signature Motto */}
                  <div className="hidden md:flex items-center space-x-2 text-right">
                    <span className="text-xs italic font-serif text-emerald-300/70 tracking-wide">
                      "Healthy Animals, Thriving Futures"
                    </span>
                  </div>
                </div>
              </div>

              {/* Off-Season Climate Conditioning Work Orders Alert Banner */}
              {(() => {
                const pendingSetupEnclosures = enclosures.filter(e => e.climateProfile?.status === 'Pending Setup');
                if (pendingSetupEnclosures.length === 0) return null;
                return (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/80 via-[#211605] to-[#2a1a03] border border-amber-500/50 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-md">
                        <Zap className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Keeper Action Required
                          </span>
                          <span className="text-xs font-bold text-white">
                            Off-Season Climate Setup Requested
                          </span>
                        </div>
                        <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                          Admin requested environmental conditioning calibration for <strong className="text-white">{pendingSetupEnclosures.map(e => e.name).join(', ')}</strong>. Set day/night temperatures and photoperiod timers to submit for Admin approval.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedEnclosureForClimate(pendingSetupEnclosures[0])}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-md cursor-pointer transition-all shrink-0 active:scale-95 flex items-center space-x-1.5"
                    >
                      <Thermometer className="w-4 h-4" />
                      <span>Configure Climate Now &rarr;</span>
                    </button>
                  </div>
                );
              })()}

              {/* 5 Summary Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {/* Card 1: Assigned Animals */}
                <div className={`p-4 sm:p-5 rounded-2xl relative shadow-2xs transition-all flex flex-col justify-between h-32 border ${
                  isDarkMode 
                    ? 'bg-[#061F13] border-emerald-950/80 hover:border-emerald-800/60 text-white' 
                    : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-800 shadow-xs'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
                      isDarkMode 
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    }`}>
                      <PawPrint className="w-4 h-4" />
                    </div>
                    {myAssignedAnimals.length > 0 && rosterViewMode === 'assigned' && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ⭐ Allocated
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    <span className={`text-xs font-medium block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {rosterViewMode === 'assigned' && myAssignedAnimals.length > 0 ? 'Assigned Reptiles' : 'All Facility Reptiles'}
                    </span>
                    <div className="flex items-baseline space-x-1.5 mt-0.5">
                      <span className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {activeAnimals.length}
                      </span>
                      {myAssignedAnimals.length > 0 && rosterViewMode === 'assigned' && (
                        <span className="text-[10px] text-emerald-500 font-bold">
                          of {allActiveAnimals.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveMenu('animals')}
                    className="absolute bottom-3.5 right-3.5 text-xs font-semibold text-emerald-500 hover:text-emerald-400 flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <span>View</span>
                    <span>&rarr;</span>
                  </button>
                </div>

                {/* Card 2: Today's Tasks */}
                <div className={`p-4 sm:p-5 rounded-2xl relative shadow-2xs transition-all flex flex-col justify-between h-32 border ${
                  isDarkMode 
                    ? 'bg-[#061F13] border-emerald-950/80 hover:border-emerald-800/60 text-white' 
                    : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-800 shadow-xs'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
                      isDarkMode 
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    }`}>
                      <ClipboardList className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className={`text-xs font-medium block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Today's Tasks</span>
                    <span className={`text-2xl font-black tracking-tight block mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {allActiveAnimalTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveMenu('checklist')}
                    className="absolute bottom-3.5 right-3.5 text-xs font-semibold text-emerald-500 hover:text-emerald-400 flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <span>View</span>
                    <span>&rarr;</span>
                  </button>
                </div>

                {/* Card 3: Breeding Pairs Station */}
                <div className={`p-4 sm:p-5 rounded-2xl relative shadow-2xs transition-all flex flex-col justify-between h-32 border ${
                  isDarkMode 
                    ? 'bg-[#061F13] border-emerald-950/80 hover:border-emerald-800/60 text-white' 
                    : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-800 shadow-xs'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
                      isDarkMode 
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' 
                        : 'bg-rose-50 border-rose-200 text-rose-600'
                    }`}>
                      <Heart className="w-4 h-4 fill-rose-400/20" />
                    </div>
                    {activeBreedingCount > 0 && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    <span className={`text-xs font-medium block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Breeding Pairs</span>
                    <span className={`text-2xl font-black tracking-tight block mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {breedingRecords.filter(r => r.status !== 'FAILED').length}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveMenu('breeding')}
                    className="absolute bottom-3.5 right-3.5 text-xs font-semibold text-emerald-500 hover:text-emerald-400 flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <span>Station</span>
                    <span>&rarr;</span>
                  </button>
                </div>

                {/* Card 4: Pending Alerts */}
                <div className={`p-4 sm:p-5 rounded-2xl relative shadow-2xs transition-all flex flex-col justify-between h-32 border ${
                  isDarkMode 
                    ? 'bg-[#061F13] border-emerald-950/80 hover:border-emerald-800/60 text-white' 
                    : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-800 shadow-xs'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
                      isDarkMode 
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' 
                        : 'bg-rose-50 border-rose-200 text-rose-600'
                    }`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className={`text-xs font-medium block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pending Alerts</span>
                    <span className={`text-2xl font-black tracking-tight block mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {overdueCount}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveMenu('checklist')}
                    className="absolute bottom-3.5 right-3.5 text-xs font-semibold text-emerald-500 hover:text-emerald-400 flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <span>View</span>
                    <span>&rarr;</span>
                  </button>
                </div>

                {/* Card 5: Low Stock Items */}
                <div className={`p-4 sm:p-5 rounded-2xl relative shadow-2xs transition-all flex flex-col justify-between h-32 border ${
                  isDarkMode 
                    ? 'bg-[#061F13] border-emerald-950/80 hover:border-emerald-800/60 text-white' 
                    : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-800 shadow-xs'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
                      isDarkMode 
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
                        : 'bg-amber-50 border-amber-200 text-amber-600'
                    }`}>
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className={`text-xs font-medium block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Low Stock Items</span>
                    <span className={`text-2xl font-black tracking-tight block mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {inventory.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock').length}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveMenu('inventory')}
                    className="absolute bottom-3.5 right-3.5 text-xs font-semibold text-emerald-500 hover:text-emerald-400 flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <span>View</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>

              {/* Main Content: Today's Tasks & Recent Activity */}
              <div className="space-y-5 sm:space-y-6">
                
                {/* Today's Tasks Card */}
                <div className={`rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs border ${
                  isDarkMode ? 'bg-[#061F13] border-emerald-950/80' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  {/* Card Header */}
                  <div className={`flex items-center justify-between pb-1 border-b ${
                    isDarkMode ? 'border-emerald-950/60' : 'border-slate-100'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isDarkMode 
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                          : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      }`}>
                        <ClipboardList className="w-5 h-5" />
                      </div>
                      <h2 className={`text-base font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Today's Tasks</h2>
                    </div>
                    <button
                      onClick={() => setActiveMenu('checklist')}
                      className="flex items-center space-x-1 text-xs font-semibold text-emerald-500 hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      <span>{formatShortTaskDate(systemDate)}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Task Rows List */}
                  {todayTaskRows.length === 0 ? (
                    <div className={`py-10 px-4 text-center rounded-2xl space-y-2 border ${
                      isDarkMode ? 'bg-[#05190F]/60 border-emerald-950/60 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto border ${
                        isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      }`}>
                        <ClipboardList className="w-5 h-5" />
                      </div>
                      <h4 className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>No tasks scheduled for today</h4>
                      <p className={`text-xs max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        No active operations or daily checklist items currently assigned.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {todayTaskRows.map(row => {
                        const isChecked = !!dashboardChecked[row.id];
                        return (
                          <div
                            key={row.id}
                            className={`flex items-center justify-between py-2.5 px-3 rounded-2xl border transition-all group gap-3 ${
                              isDarkMode 
                                ? 'bg-[#05190F]/70 border-emerald-950/40 hover:bg-[#082819] hover:border-emerald-800/60' 
                                : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                              {/* Checkbox circle */}
                              <button
                                onClick={() => toggleDashboardTask(row.id, row.action, row.animalName)}
                                className="cursor-pointer shrink-0 transition-transform active:scale-90"
                                title="Toggle complete"
                              >
                                {isChecked ? (
                                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xs">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className={`w-5 h-5 rounded-full border-2 transition-colors ${
                                    isDarkMode ? 'border-slate-600 group-hover:border-emerald-400' : 'border-slate-400 group-hover:border-emerald-500'
                                  }`} />
                                )}
                              </button>

                              {/* Circular Animal Avatar */}
                              <div className={`w-10 h-10 rounded-full overflow-hidden border shrink-0 shadow-2xs flex items-center justify-center ${
                                isDarkMode ? 'border-emerald-800/50 bg-emerald-950' : 'border-slate-200 bg-slate-100'
                              }`}>
                                {row.imageUrl ? (
                                  <img src={row.imageUrl} alt={row.animalName} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-emerald-950 flex items-center justify-center text-emerald-400 font-bold text-xs">
                                    {row.animalName ? row.animalName.slice(0, 2).toUpperCase() : 'AN'}
                                  </div>
                                )}
                              </div>

                              {/* Animal Name & Species */}
                              <div className="w-28 sm:w-36 shrink-0 truncate">
                                <h4 className={`text-xs sm:text-sm font-bold truncate ${
                                  isChecked 
                                    ? 'line-through text-slate-400' 
                                    : (isDarkMode ? 'text-white' : 'text-slate-900')
                                }`}>
                                  {row.animalName}
                                </h4>
                                <span className={`text-xs block truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{row.species}</span>
                              </div>

                              {/* Vertical divider */}
                              <div className={`w-px h-6 hidden sm:block shrink-0 ${isDarkMode ? 'bg-emerald-950/80' : 'bg-slate-200'}`} />

                              {/* Task Action */}
                              <div className="min-w-0 flex-1 truncate">
                                <span className={`text-xs sm:text-sm font-medium truncate block ${
                                  isChecked 
                                    ? 'line-through text-slate-500' 
                                    : (isDarkMode ? 'text-slate-200' : 'text-slate-700')
                                }`}>
                                  {row.action}
                                </span>
                              </div>
                            </div>

                            {/* Time & Status Badge */}
                            <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
                              <span className={`text-xs font-mono font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{row.time}</span>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                                isChecked 
                                  ? (isDarkMode ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' : 'bg-emerald-50 text-emerald-800 border-emerald-200')
                                  : row.statusStyle
                              }`}>
                                {isChecked ? 'Completed' : row.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer link to view all tasks */}
                  <div className={`flex justify-end pt-2 border-t ${isDarkMode ? 'border-emerald-950/60' : 'border-slate-100'}`}>
                    <button
                      onClick={() => setActiveMenu('checklist')}
                      className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <span>View all tasks</span>
                      <span>&rarr;</span>
                    </button>
                  </div>
                </div>

                {/* Recent Activity Card */}
                <div className={`rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs border ${
                  isDarkMode ? 'bg-[#061F13] border-emerald-950/80' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  {/* Header */}
                  <div className={`flex items-center justify-between pb-1 border-b ${isDarkMode ? 'border-emerald-950/60' : 'border-slate-100'}`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isDarkMode ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      }`}>
                        <Clock className="w-5 h-5" />
                      </div>
                      <h2 className={`text-base font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Recent Activity</h2>
                    </div>
                    <button
                      onClick={() => setActiveMenu('reports')}
                      className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <span>View all</span>
                      <span>&rarr;</span>
                    </button>
                  </div>

                  {/* Dynamic Activity Cards Grid */}
                  {recentActivities.length === 0 ? (
                    <div className={`py-8 px-4 text-center rounded-2xl space-y-2 border ${
                      isDarkMode ? 'bg-[#05190F]/60 border-emerald-950/60 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto border ${
                        isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      }`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <h4 className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>No recent activity recorded</h4>
                      <p className={`text-xs max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Completed feeding records, medication logs, and health observations will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {recentActivities.map(rec => {
                        const Icon = getCategoryIcon(rec.type);
                        return (
                          <div
                            key={rec.id}
                            onClick={() => setSelectedLogDetail(rec)}
                            className={`p-3.5 rounded-2xl border flex items-start space-x-3 transition-all cursor-pointer ${
                              isDarkMode 
                                ? 'bg-[#05190F] border-emerald-950/80 hover:border-emerald-800/60 hover:bg-[#072415]' 
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                              isDarkMode ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{rec.title}</h4>
                              <p className={`text-xs truncate mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{rec.animalName} • {rec.type}</p>
                              <span className={`text-xs font-mono block mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{rec.time}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 1. DAILY CHECKLIST */}
          {activeMenu === 'checklist' && (
            <div className="space-y-6">
              
              {/* Header with quick parameters */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
                      <ClipboardList className="w-6 h-6 text-[#113C24] dark:text-emerald-400" />
                      <span>Keeper Daily Tasks & Checklist</span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                      Manage and complete tasks assigned by Sanctuary Administration and Veterinary Staff, tracking creation dates, schedules, and completion states.
                    </p>
                  </div>
                </div>
              </div>

              {/* Care Allocation Roster Indicator */}
              <div className="flex items-center justify-between flex-wrap gap-3 p-3.5 rounded-2xl bg-[#071F11] border border-emerald-950/70 shadow-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Roster View:</span>
                  <div className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-xs flex items-center space-x-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>My Assigned ({myAssignedAnimals.length > 0 ? myAssignedAnimals.length : allActiveAnimals.length})</span>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {myAssignedAnimals.length > 0
                    ? `Showing daily tasks for your ${myAssignedAnimals.length} assigned reptiles`
                    : `Showing daily tasks for facility reptiles`}
                </span>
              </div>

              {/* Progress & Summary Panel */}
              <div className={`p-5 rounded-3xl border transition-colors ${isDarkMode ? 'bg-[#071F11] border-emerald-950/60' : 'bg-white border-slate-100'} shadow-2xs`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-800 dark:text-white text-sm flex items-center space-x-2">
                      <span>Daily Tasks</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/30">
                        {allActiveAnimalTasks.length} Assigned
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Today's care assignments and checklist.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 shrink-0">
                    <div className={`px-4 py-2.5 rounded-2xl border text-center ${
                      isDarkMode ? 'bg-[#04110A] border-amber-500/30' : 'bg-amber-50/70 border-amber-200'
                    }`}>
                      <div className="flex items-center justify-center space-x-1 text-amber-500 font-black text-xl leading-none">
                        <Clock className="w-4 h-4" />
                        <span>{pendingCount}</span>
                      </div>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider block mt-1">Pending</span>
                    </div>

                    <div className={`px-4 py-2.5 rounded-2xl border text-center ${
                      overdueCount > 0 
                        ? (isDarkMode ? 'bg-rose-950/40 border-rose-500/40' : 'bg-rose-50 border-rose-200')
                        : (isDarkMode ? 'bg-[#04110A] border-emerald-950' : 'bg-slate-50 border-slate-200')
                    }`}>
                      <div className={`flex items-center justify-center space-x-1 font-black text-xl leading-none ${
                        overdueCount > 0 ? 'text-rose-500' : 'text-slate-400'
                      }`}>
                        <AlertTriangle className="w-4 h-4" />
                        <span>{overdueCount}</span>
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wider block mt-1 ${
                        overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                      }`}>Overdue</span>
                    </div>

                    <div className={`px-4 py-2.5 rounded-2xl border text-center ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-500/30' : 'bg-emerald-50/70 border-emerald-200'
                    }`}>
                      <div className="flex items-center justify-center space-x-1 text-emerald-600 dark:text-emerald-400 font-black text-xl leading-none">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{completedCount}</span>
                      </div>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block mt-1">Completed</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters Bar: Status, Assignee, and Type */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
                  {[
                    { id: 'All', label: `Active Checklist (${pendingCount + overdueCount})` },
                    { id: 'Pending', label: `Pending (${pendingCount})` },
                    { id: 'Overdue', label: `Overdue (${overdueCount})` },
                    { id: 'Completed', label: `Completed (${completedCount})` },
                    { id: 'ShowAll', label: `Show All (${allActiveAnimalTasks.length})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setTaskStatusFilter(tab.id as any)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                        taskStatusFilter === tab.id
                          ? (tab.id === 'Overdue' 
                              ? 'bg-rose-600 text-white border-rose-500 shadow-xs' 
                              : tab.id === 'Pending'
                              ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                              : tab.id === 'Completed'
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                              : (isDarkMode ? 'bg-[#113C24] text-white border-emerald-700 shadow-xs' : 'bg-[#113C24] text-white border-[#113C24] shadow-xs'))
                          : (isDarkMode ? 'bg-[#04110A] border-emerald-950 text-slate-300 hover:border-emerald-800' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Assigned:</span>
                    {[
                      { id: 'All', label: 'All' },
                      { id: 'Admin', label: 'Admin', icon: Shield },
                      { id: 'Veterinarian', label: 'Vet', icon: Stethoscope }
                    ].map(tab => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setTaskAssigneeFilter(tab.id as any)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg border cursor-pointer transition-all flex items-center space-x-1.5 ${
                            taskAssigneeFilter === tab.id
                              ? (tab.id === 'Veterinarian'
                                  ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                                  : tab.id === 'Admin'
                                  ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                                  : (isDarkMode ? 'bg-emerald-800 text-white border-emerald-700' : 'bg-slate-800 text-white border-slate-700'))
                              : (isDarkMode ? 'bg-[#04110A] border-emerald-950 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')
                          }`}
                        >
                          {Icon && <Icon className="w-3 h-3" />}
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Type:</span>
                    {['All', 'Feeding', 'Climate Setup', 'Care & Health', 'Cleaning'].map(type => (
                      <button
                        key={type}
                        onClick={() => setTaskTypeFilter(type)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border cursor-pointer transition-colors ${
                          taskTypeFilter === type
                            ? (isDarkMode ? 'bg-[#113C24] text-white border-emerald-600' : 'bg-emerald-900 text-white border-emerald-800')
                            : (isDarkMode ? 'bg-[#04110A] text-slate-400 border-emerald-950/60' : 'bg-slate-100 text-slate-600 border-slate-200')
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              {filteredTasks.length === 0 ? (
                <div className={`p-12 text-center rounded-3xl border ${
                  isDarkMode ? 'bg-[#071F11] border-emerald-950/60 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                }`}>
                  <ClipboardList className="w-10 h-10 mx-auto mb-2 text-slate-400 opacity-40" />
                  <p className="font-bold text-sm">No tasks found.</p>
                  <p className="text-xs mt-1 text-slate-400">Try changing the filters above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTasks.map(task => {
                    const animal = activeAnimals.find(a => a.id === task.animalId) || animals.find(a => a.id === task.animalId);
                    const imageUrl = animal?.image || animal?.imageUrl || getTaskImage(task.type);
                    const assignedBy = getTaskAssignedBy(task);
                    const computedStatus = getTaskComputedStatus(task, systemDate);
                    const displayTitle = resolveTaskTitle(task, animal);

                    const displayEnclosure = animal?.enclosureId || task.enclosureId || 'General';

                    return (
                      <div 
                        key={task.id} 
                        className={`p-3 sm:p-3.5 rounded-xl border transition-all space-y-2 shadow-xs ${
                          computedStatus === 'Overdue'
                            ? (isDarkMode ? 'bg-[#12080A] border-rose-600/70' : 'bg-rose-50/70 border-rose-300')
                            : computedStatus === 'Completed'
                            ? (isDarkMode ? 'bg-[#05180E] border-emerald-950/60 opacity-80' : 'bg-white border-slate-200 opacity-80')
                            : (isDarkMode ? 'bg-[#071F11] border-emerald-950/60' : 'bg-white border-slate-200')
                        }`}
                      >
                        {/* Top Row: Animal Avatar, Title & Subtitle, Status Pill */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                            {/* Quick Checkbox Circle */}
                            <button
                              type="button"
                              onClick={() => {
                                if (computedStatus !== 'Completed') {
                                  const check = checkClimateTaskCanBeCompleted(task);
                                  if (!check.allowed) {
                                    setActionToast(check.reason || '⚠️ Climate setup required.');
                                    setTimeout(() => setActionToast(null), 5000);
                                    return;
                                  }
                                }
                                onUpdateTaskStatus(task.id, computedStatus === 'Completed' ? 'Pending' : 'Completed');
                              }}
                              className="cursor-pointer shrink-0 transition-transform active:scale-90 mr-0.5"
                              title={computedStatus === 'Completed' ? 'Mark as Pending' : 'Quick complete'}
                            >
                              {computedStatus === 'Completed' ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xs">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-slate-600 hover:border-emerald-400 transition-colors" />
                              )}
                            </button>

                            <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 dark:border-emerald-900/40 shrink-0 bg-slate-100 dark:bg-emerald-950 flex items-center justify-center">
                              {imageUrl ? (
                                <img src={imageUrl} alt={displayTitle} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-emerald-950 text-emerald-400 font-bold text-xs">
                                  <PawPrint className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className={`font-bold text-xs sm:text-sm leading-snug truncate ${
                                computedStatus === 'Completed' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white'
                              }`}>
                                {displayTitle}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {animal ? `${animal.name || animal.id} (${animal.species})` : task.animalId} • Enclosure: {displayEnclosure}
                              </p>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                            computedStatus === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40'
                              : computedStatus === 'Overdue'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40'
                          }`}>
                            {computedStatus}
                          </span>
                        </div>

                        {/* Task Instructions / Note */}
                        {(() => {
                          const isExpanded = !!expandedTaskIds[task.id];
                          const fullDetails = task.details || 'Routine care.';
                          const isClimateTask = getTaskCategory(task) === 'climate' || 
                                                (task.type || '').toLowerCase().includes('climate') || 
                                                (task.title || '').toLowerCase().includes('climate') || 
                                                (task.title || '').toLowerCase().includes('thermostat') || 
                                                (task.title || '').toLowerCase().includes('off-season') || 
                                                (task.title || '').toLowerCase().includes('brumation');
                          const targetEnc = enclosures.find(e => e.id === task.enclosureId || e.id === animal?.enclosureId || e.name === task.enclosureId)
                                         || enclosures.find(e => e.id === 'MF-BD-001' || e.id === 'RL1-BP-001')
                                         || enclosures[0];

                          return (
                            <div className="space-y-1.5 pt-0.5">
                              {/* 1-Line Truncated summary when collapsed */}
                              {!isExpanded ? (
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                                  <p className="truncate text-[11px] flex-1 text-slate-600 dark:text-slate-300">
                                    {fullDetails.replace(/\[ID:.*?\]/g, '').replace(/\n/g, ' • ')}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => toggleTaskExpand(task.id)}
                                    className="px-3 py-1 rounded-lg text-xs font-bold bg-[#113C24] hover:bg-[#1B5234] text-white border border-emerald-500/70 hover:border-emerald-400 shadow-xs shrink-0 cursor-pointer flex items-center space-x-1.5 transition-all active:scale-95"
                                    title="View full task instructions and details"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span>Details</span>
                                    <ChevronDown className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                                  </button>
                                </div>
                              ) : (
                                <div className="p-2.5 rounded-lg bg-black/10 dark:bg-emerald-950/40 border border-slate-200/50 dark:border-emerald-900/40 space-y-2">
                                  <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                                    {fullDetails}
                                  </p>
                                  {task.notes && task.notes !== task.details && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/50 dark:border-emerald-900/30 italic">
                                      Notes: {task.notes}
                                    </p>
                                  )}

                                  {/* Direct Go To Enclosure Callout inside Expanded View ONLY for Climate Tasks */}
                                  {isClimateTask && targetEnc && (
                                    <div className="pt-2 border-t border-slate-200/50 dark:border-emerald-900/40 flex flex-wrap items-center justify-between gap-2">
                                      <span className="text-[11px] font-bold text-amber-300 flex items-center space-x-1">
                                        <Thermometer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                        <span>Target Enclosure: {targetEnc.name || targetEnc.id}</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigateToMenu('enclosures');
                                          setSelectedEnclosureForClimate(targetEnc);
                                        }}
                                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg shadow-sm transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
                                      >
                                        <Thermometer className="w-3.5 h-3.5 text-slate-950" />
                                        <span>Go to Enclosure</span>
                                      </button>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setViewingTaskNote(task)}
                                      className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>Full popup view</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleTaskExpand(task.id)}
                                      className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 cursor-pointer flex items-center space-x-1 transition-colors"
                                    >
                                      <span>Hide details</span>
                                      <ChevronDown className="w-3 h-3 rotate-180" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Footer: Due Time, Assigner & Actions */}
                        {(() => {
                          const isClimateTask = getTaskCategory(task) === 'climate' || 
                                                (task.type || '').toLowerCase().includes('climate') || 
                                                (task.title || '').toLowerCase().includes('climate') || 
                                                (task.title || '').toLowerCase().includes('thermostat') || 
                                                (task.title || '').toLowerCase().includes('off-season') || 
                                                (task.title || '').toLowerCase().includes('brumation');
                          const targetEnc = enclosures.find(e => e.id === task.enclosureId || e.id === animal?.enclosureId || e.name === task.enclosureId)
                                         || enclosures.find(e => e.id === 'MF-BD-001' || e.id === 'RL1-BP-001')
                                         || enclosures[0];

                          return (
                            <div className="pt-2 border-t border-slate-100 dark:border-emerald-950/60 flex items-center justify-between gap-2 text-[11px]">
                              <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 truncate">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>Due {task.time || 'All Day'}</span>
                                <span>•</span>
                                <span className="font-medium truncate">{assignedBy}</span>
                              </div>

                              <div className="flex items-center space-x-1.5 shrink-0">
                                {isClimateTask && targetEnc && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigateToMenu('enclosures');
                                      setSelectedEnclosureForClimate(targetEnc);
                                    }}
                                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 active:scale-95 shrink-0 shadow-xs"
                                    title={`Go to Enclosures tab and configure climate for ${targetEnc.name || targetEnc.id}`}
                                  >
                                    <Thermometer className="w-3.5 h-3.5 shrink-0 text-amber-400 hover:text-slate-950" />
                                    <span>Go to Enclosure</span>
                                  </button>
                                )}

                                {computedStatus === 'Completed' ? (
                                  <button
                                    onClick={() => onUpdateTaskStatus(task.id, 'Pending')}
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-emerald-900/60 hover:bg-slate-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                                  >
                                    Reopen
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleOpenTaskModal(task)}
                                      className="px-3 py-1 bg-[#1B704C] hover:bg-[#155d3e] text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 shadow-2xs"
                                    >
                                      <Check className="w-3 h-3 stroke-[2.5]" />
                                      <span>Complete</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. INVENTORY & SUPPLIES MODULE (KEEPER ACCESS) */}
          {activeMenu === 'inventory' && (
            <div className="space-y-6">
              {unreadNotifCount > 0 && (
                <div className="p-4 rounded-2xl border bg-emerald-500/10 border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Admin Inventory Notice:</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white">
                          {unreadNotifCount} New Alert{unreadNotifCount > 1 ? 's' : ''}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Sanctuary Admin has recently updated supplies or restocked inventory. As Animal Keeper, please monitor operational statuses and stock levels.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onMarkAllNotificationsAsRead?.()}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Mark All as Read
                  </button>
                </div>
              )}

              <InventoryModule
                inventory={inventory}
                onUpdateInventory={(updated, changeMeta) => onUpdateInventory?.(updated, changeMeta)}
                isDarkMode={isDarkMode}
                canDelete={false}
                userRole="keeper"
                initialSearchTerm={selectedInventorySearch}
                onBackToDashboard={handleGoBack}
                onBack={handleGoBack}
              />
            </div>
          )}



          {/* 3. MY ENCLOSURES / ANIMALS REGISTER */}
          {activeMenu === 'animals' && (() => {
            const staffMembersList: StaffMember[] = (() => {
              try {
                const raw = localStorage.getItem('feronia_staff_members');
                return raw ? JSON.parse(raw) : [];
              } catch {
                return [];
              }
            })();

            const uniqueAnimalSpecies = Array.from(new Set(activeAnimals.map(a => a.species).filter(Boolean)));

            const pendingKeeperApprovalsCount = activeAnimals.filter(animal => 
              appointments.some(a => 
                (a.status === 'Pending Approval' || a.status === 'Pending') && a.animalId === animal.id
              )
            ).length;

            const filteredKeeperAnimals = activeAnimals.filter(animal => {
              const q = animalSearchQuery.toLowerCase().trim();
              if (q) {
                const matchName = (animal.name || '').toLowerCase().includes(q);
                const matchSpecies = (animal.species || '').toLowerCase().includes(q);
                const matchId = animal.id.toLowerCase().includes(q);
                const matchMorph = (animal.morph || '').toLowerCase().includes(q);
                const matchEnc = (animal.enclosureId || '').toLowerCase().includes(q);
                if (!matchName && !matchSpecies && !matchId && !matchMorph && !matchEnc) return false;
              }

              if (animalSpeciesFilter !== 'All' && animal.species !== animalSpeciesFilter) {
                return false;
              }

              if (animalSexFilter !== 'All' && animal.sex !== animalSexFilter) {
                return false;
              }

              if (animalStatusFilter !== 'All') {
                if (animalStatusFilter === 'Pending Request') {
                  const hasReq = appointments.some(a => 
                    (a.status === 'Pending Approval' || a.status === 'Pending') && a.animalId === animal.id
                  );
                  if (!hasReq) return false;
                } else if (animal.healthStatus !== animalStatusFilter) {
                  return false;
                }
              }

              return true;
            });

            return (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={handleGoBack}
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
                    <div>
                      <h1 className="text-2xl font-bold flex items-center space-x-2 text-slate-900 dark:text-white">
                        <Compass className="w-6 h-6 text-teal-600" />
                        <span>My Enclosures & Occupants</span>
                      </h1>
                      <p className="text-xs text-slate-400 mt-1">Review active animal profiles, administer treatments, record growth, and manage keeper logs.</p>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-2xl border shadow-2xs transition-colors ${
                  isDarkMode ? 'bg-[#071F11] border-emerald-950/60' : 'bg-white border-slate-100'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Animal List</h2>
                      <span className="text-xs font-bold text-slate-400">
                        {myAssignedAnimals.length > 0
                          ? `Showing your assigned roster (${filteredKeeperAnimals.length} of ${myAssignedAnimals.length} reptiles)`
                          : `Showing sanctuary reptiles (${filteredKeeperAnimals.length} of ${allActiveAnimals.length} reptiles)`}
                      </span>
                    </div>

                    {/* Care Allocation Roster Badge */}
                    <div className="flex items-center space-x-2">
                      <div className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-xs flex items-center space-x-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>My Assigned ({myAssignedAnimals.length > 0 ? myAssignedAnimals.length : allActiveAnimals.length})</span>
                      </div>
                    </div>
                  </div>

                  {/* Search and Filters Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
                    <div className="relative w-full sm:flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by name, species, or ID..."
                        value={animalSearchQuery}
                        onChange={(e) => setAnimalSearchQuery(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                          isDarkMode 
                            ? 'bg-[#04110A] border-emerald-900/60 text-white placeholder-slate-500 focus:border-emerald-500' 
                            : 'bg-slate-50/50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#113C24]'
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                      <select
                        value={animalSpeciesFilter}
                        onChange={(e) => setAnimalSpeciesFilter(e.target.value)}
                        className={`text-xs font-bold px-3 py-2 rounded-xl border outline-none transition-all cursor-pointer ${
                          isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-emerald-200' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <option value="All">Species: All</option>
                        {uniqueAnimalSpecies.map(sp => (
                          <option key={sp} value={sp}>{sp}</option>
                        ))}
                      </select>

                      <select
                        value={animalSexFilter}
                        onChange={(e) => setAnimalSexFilter(e.target.value)}
                        className={`text-xs font-bold px-3 py-2 rounded-xl border outline-none transition-all cursor-pointer ${
                          isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-emerald-200' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <option value="All">Sex: All</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>

                      <select
                        value={animalStatusFilter}
                        onChange={(e) => setAnimalStatusFilter(e.target.value)}
                        className={`text-xs font-bold px-3 py-2 rounded-xl border outline-none transition-all cursor-pointer ${
                          isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-emerald-200' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <option value="All">Status: All</option>
                        {pendingKeeperApprovalsCount > 0 && (
                          <option value="Pending Request">⚠️ Has Pending Request ({pendingKeeperApprovalsCount})</option>
                        )}
                        <option value="Healthy">Healthy</option>
                        <option value="Under Treatment">Under Treatment</option>
                        <option value="Under Observation">Under Observation</option>
                        <option value="Injured">Injured</option>
                      </select>
                    </div>
                  </div>

                  {/* Animal List Rows */}
                  <div className="space-y-3">
                    {filteredKeeperAnimals.length === 0 ? (
                      <div className="text-center py-12 border border-dashed rounded-2xl border-slate-200 dark:border-emerald-950/40">
                        <PawPrint className="w-10 h-10 mx-auto text-slate-300 dark:text-emerald-900/60 mb-2" />
                        <p className="text-sm font-bold text-slate-500">No animals match your search filters.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setAnimalSearchQuery('');
                            setAnimalSpeciesFilter('All');
                            setAnimalSexFilter('All');
                            setAnimalStatusFilter('All');
                          }}
                          className="mt-3 text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                        >
                          Clear all filters
                        </button>
                      </div>
                    ) : (
                      filteredKeeperAnimals.map(animal => {
                        const animalPendingAppointments = appointments.filter(apt => {
                          if (apt.status !== 'Pending Approval' && apt.status !== 'Pending') return false;
                          return apt.animalId === animal.id;
                        });

                        const hasPendingRequest = animalPendingAppointments.length > 0;
                        const primaryReq = animalPendingAppointments[0];
                        const requesterInfo = primaryReq ? getAppointmentRequesterInfo(primaryReq, staffMembersList) : null;
                        const isVetReq = requesterInfo?.role === 'vet';
                        const animalEnclosure = enclosures.find(e => e.id === animal.enclosureId);
                        const isSelected = selectedAnimalForKeeperModal?.id === animal.id;

                        return (
                          <div
                            key={animal.id}
                            onClick={() => {
                              setSelectedAnimalInitialTab(hasPendingRequest ? 'observations' : 'overview');
                              setSelectedAnimalForKeeperModal(animal);
                            }}
                            className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between hover:scale-[1.002] active:scale-[0.998] group relative ${
                              isSelected
                                ? (isDarkMode ? 'bg-[#113C24] border-emerald-400/80 shadow-sm' : 'bg-emerald-50 border-[#113C24]/30 shadow-xs')
                                : hasPendingRequest
                                ? isVetReq
                                  ? (isDarkMode ? 'bg-[#051e19] border-cyan-500/50 hover:border-cyan-400 text-slate-200 shadow-xs' : 'bg-cyan-50/50 border-cyan-300/90 hover:border-cyan-400 text-slate-800 shadow-xs')
                                  : (isDarkMode ? 'bg-[#1b1606] border-amber-500/50 hover:border-amber-400 text-slate-200 shadow-xs' : 'bg-amber-50/50 border-amber-300/90 hover:border-amber-400 text-slate-800 shadow-xs')
                                : (isDarkMode ? 'bg-[#071F11] border-emerald-950/60 text-slate-200 hover:bg-[#0a2f1a]' : 'bg-white border-slate-100 text-slate-800 hover:bg-slate-50/50')
                            }`}
                          >
                            <div className="flex items-center space-x-3.5 min-w-0">
                              {/* Photo */}
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

                              {/* Info stack */}
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

                                  {/* Assigned Keeper Status Badge */}
                                  {assignedAnimalIds.includes(animal.id) ||
                                   (animal.assignedKeeperId && (animal.assignedKeeperId === currentUserId || (currentKeeperStaff && animal.assignedKeeperId === currentKeeperStaff.id))) ||
                                   (animal.assignedKeeperName && currentKeeperName && (
                                     animal.assignedKeeperName.toLowerCase() === currentKeeperName.toLowerCase() ||
                                     currentKeeperName.toLowerCase().includes(animal.assignedKeeperName.toLowerCase())
                                   )) ? (
                                    <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-2xs">
                                      <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                                      <span>Assigned to You</span>
                                    </span>
                                  ) : animal.assignedKeeperName ? (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                      Keeper: {animal.assignedKeeperName}
                                    </span>
                                  ) : null}

                                  {hasPendingRequest && (
                                    <span className={`inline-flex lg:hidden items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-black border max-w-full truncate ${
                                      isVetReq 
                                        ? isDarkMode ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-cyan-100 text-cyan-900 border-cyan-300'
                                        : isDarkMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-amber-100 text-amber-900 border-amber-300'
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 animate-ping ${isVetReq ? 'bg-cyan-400' : 'bg-amber-400'}`}></span>
                                      <span className="truncate">{isVetReq ? `🩺 Vet Req` : `📋 Request for Admin`}</span>
                                    </span>
                                  )}
                                </div>

                                <h4 className={`font-bold text-sm leading-tight truncate mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {animal.name ? animal.name : animal.species}
                                </h4>

                                <p className={`text-[11px] font-semibold truncate mt-0.5 ${isDarkMode ? 'text-emerald-300/80' : 'text-slate-500'}`}>
                                  {animal.name ? `${animal.species} (${animal.morph})` : `Morph: ${animal.morph}`}
                                </p>
                              </div>
                            </div>

                            {/* Pending Request Banner */}
                            {hasPendingRequest && (
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAnimalInitialTab('observations');
                                  setSelectedAnimalForKeeperModal(animal);
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
                                title="Click to view health request status"
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
                                      {isVetReq ? '🩺 Vet Request' : '📋 Request for Admin'}
                                    </span>
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                                      isVetReq
                                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    }`}>
                                      Awaiting Admin Review
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
                                      {requesterInfo?.name || profileName}
                                    </span>
                                    <span className="text-slate-400 font-mono">•</span>
                                    <span className={`truncate max-w-[130px] lg:max-w-[200px] font-medium ${
                                      isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                    }`}>
                                      {primaryReq.purpose || primaryReq.type || (isVetReq ? 'Clinical Checkup' : 'Observation Request')}
                                    </span>
                                  </div>
                                </div>

                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-md transition-colors shrink-0 flex items-center space-x-0.5 shadow-2xs ${
                                  isVetReq
                                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                }`}>
                                  <span>View Status</span>
                                  <span>&rarr;</span>
                                </span>
                              </div>
                            )}

                            {/* Enclosure and Health Status Column */}
                            <div className="hidden sm:flex items-center space-x-6 lg:space-x-8 text-right pr-4 shrink-0">
                              <div className="text-left">
                                <span className={`text-[9px] uppercase tracking-wider block font-bold ${isDarkMode ? 'text-emerald-400' : 'text-slate-400'}`}>Enclosure</span>
                                <span className={`font-bold text-xs mt-0.5 block ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                                  {animal.enclosureId || 'None'}
                                </span>
                                <span className={`text-[10px] block mt-0.5 ${isDarkMode ? 'text-emerald-300/60 font-semibold' : 'text-slate-400'}`}>
                                  {animalEnclosure ? animalEnclosure.facility : 'Unassigned'}
                                </span>
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

                            {/* Keeper Action buttons & Chevron arrow */}
                            <div className="shrink-0 pl-1.5 flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenMedAdminModal(animal.id);
                                }}
                                className="p-1.5 rounded-lg opacity-85 hover:opacity-100 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer shadow-2xs"
                                title="Administer Medication"
                              >
                                <Pill className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenHealthVetModal(animal.id);
                                }}
                                className="p-1.5 rounded-lg opacity-85 hover:opacity-100 bg-amber-500/10 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-all cursor-pointer shadow-2xs"
                                title="Request Health & Vet Checkup"
                              >
                                <Stethoscope className="w-3.5 h-3.5" />
                              </button>
                              <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${
                                isDarkMode ? 'text-emerald-400' : 'text-slate-500'
                              }`} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ENCLOSURES VIEW */}
          {activeMenu === 'enclosures' && (() => {
            // Species options for filtering
            const enclosureSpeciesOptions = Array.from(
              new Set([
                ...animals.map(a => a.species),
                ...REPTILE_SPECIES_LIST
              ])
            ).sort();

            const filteredEnclosures = enclosures.filter(enc => {
              const q = enclosureSearch.toLowerCase();
              const matchesSearch = !q || (
                (enc.name || '').toLowerCase().includes(q) ||
                (enc.id || '').toLowerCase().includes(q) ||
                (enc.facility || '').toLowerCase().includes(q) ||
                (enc.type || '').toLowerCase().includes(q)
              );
              const matchesBranch = selectedBranch === 'All Facilities' || enc.facility === selectedBranch;
              const matchesSpecies = enclosureSpeciesFilter === 'All Species' || (
                (enc.name || '').toLowerCase().includes(enclosureSpeciesFilter.toLowerCase()) ||
                animals.some(a => (a.enclosureId === enc.id || a.enclosureId === enc.name) && a.species === enclosureSpeciesFilter)
              );
              return matchesSearch && matchesBranch && matchesSpecies;
            });

            return (
              <div className="space-y-6 max-w-[1440px] mx-auto animate-fade-in">
                {/* Header Bar matching admin exactly */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={handleGoBack}
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
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Enclosures</h1>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        Manage all enclosures, environment controls, and facility assignments.
                      </p>
                    </div>
                  </div>

                  {/* Header Right Controls */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Location Branch Selector */}
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className={`text-xs font-semibold px-3.5 py-2 rounded-xl border outline-none shadow-2xs transition-all cursor-pointer ${
                        isDarkMode 
                          ? 'bg-[#04110A] border-emerald-900/60 text-emerald-200 focus:border-emerald-500' 
                          : 'bg-white border-slate-200 text-slate-700 focus:border-[#113C24]'
                      }`}
                    >
                      <option value="All Facilities">All Facilities ({enclosures.length})</option>
                      {facilitiesList.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>

                    {/* Species Selector Filter */}
                    <select
                      value={enclosureSpeciesFilter}
                      onChange={(e) => setEnclosureSpeciesFilter(e.target.value)}
                      className={`text-xs font-semibold px-3.5 py-2 rounded-xl border outline-none shadow-2xs transition-all cursor-pointer ${
                        isDarkMode 
                          ? 'bg-[#04110A] border-emerald-900/60 text-emerald-200 focus:border-emerald-500' 
                          : 'bg-white border-slate-200 text-slate-700 focus:border-[#113C24]'
                      }`}
                    >
                      <option value="All Species">All Species</option>
                      {enclosureSpeciesOptions.map(sp => (
                        <option key={sp} value={sp}>{sp}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* FULL WIDTH ENCLOSURE LIST */}
                <div className={`p-6 rounded-2xl border shadow-2xs transition-colors w-full ${
                  isDarkMode ? 'bg-[#071F11] border-emerald-950/60' : 'bg-white border-slate-100'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-extrabold tracking-wider text-slate-900 dark:text-white uppercase">ENCLOSURE LIST</h2>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setIsQrScannerOpen(true)}
                        className={`px-3.5 py-2 border text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95 ${
                          isDarkMode 
                            ? 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-700/80 text-emerald-300' 
                            : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-[#113C24]'
                        }`}
                        title="Scan Enclosure QR Code using Camera or Image"
                      >
                        <QrCode className="w-4 h-4 text-emerald-400" />
                        <span>Scan Enclosure QR</span>
                      </button>
                    </div>
                  </div>

                  {/* Search Bar & View Mode Toggle */}
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search enclosure name, ID, or facility..."
                        value={enclosureSearch}
                        onChange={(e) => setEnclosureSearch(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                          isDarkMode 
                            ? 'bg-[#04110A] border-emerald-900/60 text-white placeholder-slate-500 focus:border-emerald-500' 
                            : 'bg-slate-50/50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#113C24]'
                        }`}
                      />
                    </div>

                    <div className={`flex items-center p-1 rounded-xl border ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-slate-100 border-slate-200'
                    }`}>
                      <button
                        onClick={() => setEnclosureViewMode('list')}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                          enclosureViewMode === 'list'
                            ? (isDarkMode ? 'bg-[#113C24] text-emerald-300 shadow-xs' : 'bg-white text-slate-800 shadow-xs')
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Compact List View"
                      >
                        <List className="w-4 h-4" />
                        <span className="hidden md:inline text-[11px]">List</span>
                      </button>
                      <button
                        onClick={() => setEnclosureViewMode('grid')}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                          enclosureViewMode === 'grid'
                            ? (isDarkMode ? 'bg-[#113C24] text-emerald-300 shadow-xs' : 'bg-white text-slate-800 shadow-xs')
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Grid View"
                      >
                        <LayoutGrid className="w-4 h-4" />
                        <span className="hidden md:inline text-[11px]">Grid</span>
                      </button>
                    </div>
                  </div>

                  {/* Enclosures Empty State or List */}
                  {filteredEnclosures.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-2xl border-2 border-slate-200 dark:border-emerald-900/60 flex items-center justify-center text-slate-300 dark:text-emerald-800 mb-2">
                        <Box className="w-8 h-8 stroke-[1.5]" />
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-2">No enclosures found.</h3>
                      <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">Please contact an administrator to register new enclosures to a facility.</p>

                      <span className="text-[11px] text-slate-400 font-medium mt-4 block">
                        Showing 0 of {enclosures.length} enclosures
                      </span>
                    </div>
                  ) : enclosureViewMode === 'list' ? (
                    <div className="space-y-3">
                      {filteredEnclosures.map(enc => (
                        <div
                          key={enc.id}
                          onClick={() => setSelectedEnclosureForModal(enc)}
                          className={`p-3 rounded-xl border transition-all duration-200 flex items-center justify-between group cursor-pointer hover:border-emerald-500/80 shadow-xs hover:shadow-md ${
                            isDarkMode
                              ? 'bg-[#04110A] border-emerald-900/40 text-slate-200 hover:bg-[#071F11]'
                              : 'bg-white border-slate-200/80 text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3.5 min-w-0">
                            {/* Compact Enclosure Photo Thumbnail */}
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-slate-200/80 dark:border-emerald-950/40 shrink-0 shadow-xs bg-slate-900 flex items-center justify-center relative group-hover:scale-102 transition-all duration-300">
                              {enc.image ? (
                                <img src={enc.image} alt={enc.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <label 
                                  onClick={(e) => e.stopPropagation()} 
                                  className="flex flex-col items-center justify-center text-slate-400 hover:text-emerald-400 cursor-pointer w-full h-full p-1 text-center" 
                                  title="Attach Photo"
                                >
                                  <Camera className="w-4 h-4 text-emerald-500/80" />
                                  <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Attach</span>
                                  <input type="file" accept="image/*" onChange={(e) => handleCardImageUpload(enc, e)} className="hidden" />
                                </label>
                              )}
                            </div>

                            {/* Info text stack */}
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDarkMode ? 'text-emerald-300' : 'text-[#113C24]'}`}>
                                  {enc.id}
                                </span>
                                <span className={`px-2 py-0.2 text-[9px] font-extrabold rounded-full ${
                                  enc.condition === 'Good' 
                                    ? (isDarkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-800')
                                    : (isDarkMode ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-amber-100 text-amber-800')
                                }`}>
                                  {enc.condition}
                                </span>
                              </div>
                              <h4 className={`font-bold text-sm leading-tight truncate mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {enc.name}
                              </h4>
                              <p className={`text-[11px] font-semibold truncate mt-0.5 ${isDarkMode ? 'text-emerald-300/80' : 'text-slate-500'}`}>
                                🏢 {enc.facility} • {enc.type}
                              </p>
                            </div>
                          </div>

                          {/* Middle Specs columns */}
                          <div className="hidden sm:flex items-center space-x-6 md:space-x-8 text-right pr-4 shrink-0">
                            <div className="text-left">
                              <span className={`text-[9px] uppercase tracking-wider block font-extrabold ${isDarkMode ? 'text-emerald-400' : 'text-slate-400'}`}>
                                TEMP
                              </span>
                              <span className={`font-black text-xs mt-0.5 block ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                                {enc.temperature || '31°C'}
                              </span>
                            </div>

                            <div className="text-left">
                              <span className={`text-[9px] uppercase tracking-wider block font-extrabold ${isDarkMode ? 'text-emerald-400' : 'text-slate-400'}`}>
                                MAX CAPACITY
                              </span>
                              <span className={`font-black text-xs mt-0.5 block ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                                {enc.capacity} Animals
                              </span>
                            </div>
                          </div>

                          {/* Chevron indicator, Climate action, and QR Pass action */}
                          <div className="shrink-0 pl-1.5 flex items-center space-x-2">
                            {/* Off-Season Climate Status / Setup Action */}
                            {enc.climateProfile?.status === 'Pending Setup' ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEnclosureForClimate(enc);
                                }}
                                className="px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all flex items-center space-x-1.5 cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs active:scale-95 animate-pulse"
                                title="Admin requested off-season climate conditioning setup for this enclosure"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Set Climate</span>
                              </button>
                            ) : enc.climateProfile?.status === 'Pending Approval' ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEnclosureForClimate(enc);
                                }}
                                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center space-x-1.5 border cursor-pointer ${
                                  isDarkMode 
                                    ? 'bg-cyan-950/70 hover:bg-cyan-900/80 border-cyan-700/80 text-cyan-300' 
                                    : 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-900'
                                }`}
                                title="Climate submitted — awaiting Admin approval"
                              >
                                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="hidden md:inline">Pending Admin Approval</span>
                                <span className="md:hidden">Pending</span>
                              </button>
                            ) : enc.climateProfile?.status === 'Approved' && enc.climateProfile.isActive ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEnclosureForClimate(enc);
                                }}
                                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center space-x-1.5 border cursor-pointer ${
                                  isDarkMode 
                                    ? 'bg-emerald-950/70 hover:bg-emerald-900/80 border-emerald-700/80 text-emerald-300' 
                                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-[#113C24]'
                                }`}
                                title="Simulated Climate Active & Approved by Admin"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="hidden md:inline">Climate Approved</span>
                                <span className="md:hidden">Approved</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEnclosureForClimate(enc);
                                }}
                                className={`px-2 py-1.5 rounded-xl border text-[11px] font-semibold transition-all flex items-center space-x-1 cursor-pointer ${
                                  isDarkMode
                                    ? 'bg-emerald-950/30 hover:bg-emerald-900/50 border-emerald-800/50 text-emerald-300/90'
                                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                                }`}
                                title="Set Off-Season Climate & Temperature Parameters"
                              >
                                <Thermometer className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="hidden lg:inline">Set Climate</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEnclosureForQr(enc);
                              }}
                              className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                                isDarkMode
                                  ? 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-700/80 text-emerald-300'
                                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-[#113C24]'
                              }`}
                              title="View & Print QR Code Pass"
                            >
                              <QrCode className="w-4 h-4 text-emerald-400" />
                              <span className="hidden md:inline text-[11px]">QR Pass</span>
                            </button>
                            <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${
                              isDarkMode ? 'text-emerald-400' : 'text-slate-500'
                            }`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredEnclosures.map(enc => (
                        <div 
                          key={enc.id} 
                          onClick={() => setSelectedEnclosureForModal(enc)}
                          className={`p-4 rounded-2xl border transition-all hover:shadow-lg flex flex-col cursor-pointer hover:border-emerald-500/80 group ${
                            isDarkMode ? 'bg-[#04110A] border-emerald-900/40 text-slate-200 hover:bg-[#071F11]' : 'bg-slate-50/60 border-slate-200/80 text-slate-800 hover:bg-white'
                          }`}
                        >
                          {/* Image or Photo Dropzone Banner */}
                          {enc.image ? (
                            <div className="w-full h-36 rounded-xl overflow-hidden mb-3.5 relative bg-slate-900 border border-slate-200/40 dark:border-emerald-900/40">
                              <img src={enc.image} alt={enc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-white border border-white/10 shadow-xs">
                                {enc.id}
                              </div>
                              <span className={`absolute top-2 right-2 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full backdrop-blur-md shadow-xs ${
                                enc.condition === 'Good' 
                                  ? 'bg-emerald-500/90 text-white'
                                  : 'bg-amber-500/90 text-white'
                              }`}>
                                {enc.condition}
                              </span>
                            </div>
                          ) : (
                            <div className="w-full h-28 rounded-xl border-2 border-dashed border-slate-300 dark:border-emerald-900/50 flex flex-col items-center justify-center p-2 mb-3.5 relative bg-slate-100/50 dark:bg-emerald-950/20">
                              <div className="flex items-center space-x-1.5 text-slate-400 dark:text-emerald-400 mb-1">
                                <Camera className="w-4 h-4" />
                                <span className="text-[11px] font-bold">No Photo Attached</span>
                              </div>
                              <label 
                                onClick={(e) => e.stopPropagation()} 
                                className="px-2.5 py-1 bg-[#113C24] text-white text-[10px] font-bold rounded-lg cursor-pointer hover:bg-[#1B5234] transition-all flex items-center space-x-1 shadow-2xs"
                              >
                                <span>Attach Photo</span>
                                <input type="file" accept="image/*" onChange={(e) => handleCardImageUpload(enc, e)} className="hidden" />
                              </label>
                            </div>
                          )}

                          {/* Enclosure Header */}
                          <div className="flex justify-between items-start">
                            <div>
                              {!enc.image && <span className={`text-[10px] font-bold font-mono block ${isDarkMode ? 'text-emerald-400' : 'text-slate-400'}`}>{enc.id}</span>}
                              <h4 className={`font-extrabold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{enc.name}</h4>
                              <span className={`inline-block mt-1 px-2.5 py-0.5 text-[10px] font-bold rounded-md border ${
                                isDarkMode 
                                  ? 'bg-[#082916] border-emerald-800/60 text-emerald-300' 
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              }`}>
                                🏢 {enc.facility}
                              </span>
                            </div>
                            <div className="flex flex-col items-end space-y-1.5 shrink-0">
                              {!enc.image && (
                                <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                                  enc.condition === 'Good' 
                                    ? (isDarkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-800')
                                    : (isDarkMode ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-amber-100 text-amber-800')
                                }`}>
                                  {enc.condition}
                                </span>
                              )}
                              {enc.climateProfile?.status === 'Pending Setup' && (
                                <span className="animate-pulse bg-rose-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full flex items-center space-x-1 shadow-md select-none">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
                                  <span>Needs Setup</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Metrics Grid */}
                          <div className={`grid grid-cols-2 gap-2 mt-3 pt-3 border-t ${
                            isDarkMode ? 'border-emerald-900/40' : 'border-slate-200'
                          }`}>
                            <div className={`flex items-center space-x-2.5 p-2.5 rounded-xl border ${
                              isDarkMode 
                                ? 'bg-[#0A2917] border-emerald-800/50' 
                                : 'bg-slate-50 border-slate-200'
                            }`}>
                              <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                                <Thermometer className="w-4 h-4" />
                              </div>
                              <div>
                                <span className={`text-[9px] font-extrabold uppercase tracking-wider block ${
                                  isDarkMode ? 'text-emerald-400' : 'text-slate-500'
                                }`}>TEMP</span>
                                <span className={`text-xs font-black ${
                                  isDarkMode ? 'text-white' : 'text-slate-900'
                                }`}>{enc.temperature || '31°C'}</span>
                              </div>
                            </div>

                            <div className={`flex items-center space-x-2.5 p-2.5 rounded-xl border ${
                              isDarkMode 
                                ? 'bg-[#0A2917] border-emerald-800/50' 
                                : 'bg-slate-50 border-slate-200'
                            }`}>
                              <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                                <Users className="w-4 h-4" />
                              </div>
                              <div>
                                <span className={`text-[9px] font-extrabold uppercase tracking-wider block ${
                                  isDarkMode ? 'text-emerald-400' : 'text-slate-500'
                                }`}>MAX CAPACITY</span>
                                <span className={`text-xs font-black ${
                                  isDarkMode ? 'text-white' : 'text-slate-900'
                                }`}>{enc.capacity} Animals</span>
                              </div>
                            </div>
                          </div>

                          {/* Climate Conditioning status banner in Grid item */}
                          {enc.climateProfile && enc.climateProfile.status !== 'Inactive' && (
                            <div className={`mt-2.5 px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-[11px] ${
                              enc.climateProfile.status === 'Pending Setup'
                                ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                                : enc.climateProfile.status === 'Pending Approval'
                                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-200'
                                : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                            }`}>
                              <div className="flex items-center space-x-1.5 truncate">
                                {enc.climateProfile.status === 'Pending Setup' && <Zap className="w-3 h-3 text-amber-400 shrink-0 animate-pulse" />}
                                {enc.climateProfile.status === 'Pending Approval' && <Clock className="w-3 h-3 text-cyan-400 shrink-0" />}
                                {enc.climateProfile.status === 'Approved' && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                                <span className="font-bold truncate">
                                  {enc.climateProfile.status === 'Pending Setup'
                                    ? 'Setup Requested by Admin'
                                    : enc.climateProfile.status === 'Pending Approval'
                                    ? `Pending Admin (${enc.climateProfile.dayTemp}°C/${enc.climateProfile.nightTemp}°C)`
                                    : `Approved (${enc.climateProfile.dayTemp}°C/${enc.climateProfile.nightTemp}°C)`}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEnclosureForClimate(enc);
                                }}
                                className="ml-1 text-[10px] font-black underline shrink-0 cursor-pointer hover:opacity-80"
                              >
                                {enc.climateProfile.status === 'Pending Setup' ? 'Set Now' : 'Edit'}
                              </button>
                            </div>
                          )}

                          {/* Secondary info bar */}
                          <div className={`mt-3 pt-2.5 flex items-center justify-between text-[11px] font-semibold border-t ${
                            isDarkMode ? 'border-emerald-950 text-emerald-300/90' : 'border-slate-100 text-slate-600'
                          }`}>
                            <span className="flex items-center space-x-1.5">
                              <Box className={`w-3.5 h-3.5 ${isDarkMode ? 'text-emerald-400' : 'text-slate-400'}`} />
                              <span>{enc.type}</span>
                            </span>
                            <div className="flex items-center space-x-2">
                              {(!enc.climateProfile || enc.climateProfile.status === 'Inactive') && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEnclosureForClimate(enc);
                                  }}
                                  className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-all ${
                                    isDarkMode
                                      ? 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-800/60 text-emerald-300'
                                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                                  }`}
                                  title="Configure Off-Season Climate"
                                >
                                  <Thermometer className="w-3 h-3 text-emerald-400" />
                                  <span>Climate</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEnclosureForQr(enc);
                                }}
                                className={`px-2 py-0.5 rounded-lg border text-[10px] font-extrabold flex items-center space-x-1 cursor-pointer transition-all ${
                                  isDarkMode
                                    ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-700/80 text-emerald-300'
                                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-[#113C24]'
                                }`}
                                title="View & Print QR Pass"
                              >
                                <QrCode className="w-3 h-3 text-emerald-400" />
                                <span>QR Pass</span>
                              </button>
                              <span className="flex items-center space-x-1 font-bold">
                                <Users className={`w-3.5 h-3.5 ${isDarkMode ? 'text-emerald-400' : 'text-slate-400'}`} />
                                <span>Cap: {enc.capacity}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {filteredEnclosures.length > 0 && (
                    <span className="text-[11px] text-slate-400 font-medium mt-4 block text-center">
                      Showing {filteredEnclosures.length} of {enclosures.length} enclosures
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* REPORTS VIEW */}
          {activeMenu === 'reports' && (
            <KeeperReportsView
              animals={animals}
              enclosures={enclosures}
              tasks={tasks}
              inventory={inventory}
              isDarkMode={isDarkMode}
              keeperName={profileName}
              keeperEmail={profileEmail}
              systemDate={systemDate}
              onBackToDashboard={handleGoBack}
              onBack={handleGoBack}
            />
          )}

          {/* BREEDING & INCUBATION VIEW */}
          {activeMenu === 'breeding' && (
            <KeeperBreedingView
              animals={animals}
              enclosures={enclosures}
              breedingRecords={breedingRecords}
              onAddBreedingRecord={onAddBreedingRecord}
              onUpdateBreedingRecord={onUpdateBreedingRecord}
              isDarkMode={isDarkMode}
              profileName={profileName}
              systemDate={systemDate}
              onOpenAnimalDetail={(animal) => setSelectedAnimalForKeeperModal(animal)}
            />
          )}

        </main>
      </div>

      {/* Task Checkoff & Simple Completion Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-3xl max-w-sm w-full border shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 ${
            isDarkMode ? 'bg-[#061A10] border-emerald-950 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            {/* Modal Header */}
            <div className={`px-5 py-4 border-b flex items-center justify-between ${
              isDarkMode ? 'bg-[#04140D] border-emerald-950' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Complete Task</h3>
                  <p className="text-[11px] text-slate-400">Quick checkoff & confirmation</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTask(null)} 
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-emerald-950 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTaskLogSubmit} className="p-5 space-y-4 text-xs">
              {/* Task Summary Box */}
              <div className={`p-3.5 rounded-2xl border space-y-1.5 ${
                isDarkMode ? 'bg-emerald-950/30 border-emerald-900/40' : 'bg-emerald-50 border-emerald-100'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-emerald-400 text-[10px] uppercase tracking-wider">
                    {selectedTask.type} Task
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 font-semibold">
                    {selectedTask.time || 'Today'}
                  </span>
                </div>
                <h4 className="font-extrabold text-xs text-white leading-snug">
                  {resolveTaskTitle(selectedTask, activeAnimals.find(a => a.id === selectedTask.animalId) || animals.find(a => a.id === selectedTask.animalId))}
                </h4>
                
                {/* Enclosure ID clearly labeled */}
                {(() => {
                  const animal = activeAnimals.find(a => a.id === selectedTask.animalId);
                  const encId = animal?.enclosureId || selectedTask.enclosureId || 'General';
                  return (
                    <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 mt-1 select-none">
                      <span className="bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/30 text-emerald-400">
                        📍 Enclosure: {encId}
                      </span>
                      {animal && (
                        <span className="bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/30 text-emerald-400">
                          🐾 Animal: {animal.name || animal.id}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {selectedTask.details && (
                  <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-line pt-1 border-t border-emerald-900/40">
                    {selectedTask.details.replace(/\[ID:.*?\]/g, '')}
                  </p>
                )}
              </div>

              {/* Simple Checkbox Option */}
              <label className={`flex items-start space-x-3 p-3.5 rounded-2xl border cursor-pointer select-none transition-all ${
                isDarkMode ? 'bg-[#04110A] border-emerald-900/50 hover:border-emerald-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <input
                  type="checkbox"
                  defaultChecked
                  required
                  className="w-4 h-4 mt-0.5 text-emerald-600 accent-emerald-500 rounded cursor-pointer"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-white block">Mark task as Done</span>
                  <span className="text-[11px] text-slate-400">Save checkoff to keeper history.</span>
                </div>
              </label>

              {/* Quick Note (Optional) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Quick Note (Optional)
                </label>
                <input
                  type="text"
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="e.g. Completed without issues, animal is active..."
                  className={`w-full px-3.5 py-2 rounded-xl border focus:outline-none text-xs ${
                    isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-emerald-950 flex items-center justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setSelectedTask(null)} 
                  className="px-3.5 py-2 border border-slate-200 dark:border-emerald-900 rounded-xl font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer shadow-md transition-all active:scale-95 text-xs"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirm Done</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Explicit Administer Medicine Modal */}
      {isMedAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-3xl max-w-lg w-full border shadow-2xl overflow-hidden flex flex-col ${
            isDarkMode ? 'bg-[#061A10] border-emerald-950 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDarkMode ? 'bg-[#04140D] border-emerald-950' : 'bg-emerald-50 border-emerald-100'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold">Administer Medicine & Keeper's Log</h3>
                  <p className="text-xs text-slate-400 font-medium">Record clinical observation and prescribed treatment</p>
                </div>
              </div>
              <button onClick={() => setIsMedAdminModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-emerald-950 text-slate-400 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdministerMedicineSubmit} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Target Patient Animal *</label>
                  <select
                    value={medAdminAnimalId}
                    onChange={(e) => setMedAdminAnimalId(e.target.value)}
                    required
                    className={`w-full px-3 py-2 border rounded-xl font-bold focus:outline-none ${
                      isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    {activeAnimals.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name ? `${a.name} (${a.id}) - ${a.species}` : `${a.id} - ${a.species}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Administration Date *</label>
                  <input
                    type="date"
                    required
                    value={medAdminDate}
                    onChange={(e) => setMedAdminDate(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl font-bold focus:outline-none ${
                      isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* 1. Clinical Observation */}
              <div>
                <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center space-x-1.5">
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Clinical Observation *</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={medAdminClinicalObs}
                  onChange={(e) => setMedAdminClinicalObs(e.target.value)}
                  placeholder="e.g. Active, alert reflex, respiration unlabored, clean nares and vent, slight skin dryness..."
                  className={`w-full px-3.5 py-2 rounded-xl border focus:outline-none ${
                    isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 focus:border-[#113C24]'
                  }`}
                />
              </div>

              {/* 2. Prescribed Treatment */}
              <div>
                <label className="block text-xs font-bold text-teal-600 dark:text-teal-400 mb-1 flex items-center space-x-1.5">
                  <Pill className="w-3.5 h-3.5" />
                  <span>Prescribed Treatment / Medication Regimen *</span>
                </label>
                <input
                  type="text"
                  required
                  value={medAdminPrescribedTreatment}
                  onChange={(e) => setMedAdminPrescribedTreatment(e.target.value)}
                  placeholder="e.g. Enrofloxacin (Baytril 2.5%) 0.1ml oral suspension once daily"
                  className={`w-full px-3.5 py-2 rounded-xl border focus:outline-none font-medium ${
                    isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 focus:border-[#113C24]'
                  }`}
                />
              </div>

              {/* 3. Link Pharmacy Supply */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDarkMode ? 'bg-[#04110A] border-emerald-950/60' : 'bg-slate-50 border-slate-200/80'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-emerald-200">
                    📦 Link Pharmacy Inventory Item
                  </label>
                  <span className="text-xs text-slate-400 font-semibold">Deduct pharmacy stock</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <select
                      value={medAdminItemId}
                      onChange={(e) => setMedAdminItemId(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none ${
                        isDarkMode ? 'bg-[#071F11] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="">-- No Specific Stock Item --</option>
                      {inventory.filter(item => {
                        const cat = (item.category || '').toLowerCase();
                        const name = (item.name || '').toLowerCase();
                        const isFeeding = cat.includes('feed') || cat.includes('food') || cat.includes('diet') || name.includes('rat') || name.includes('mice') || name.includes('roach') || name.includes('cricket') || name.includes('worm');
                        const isCleaning = cat.includes('clean') || cat.includes('sanit') || cat.includes('disinfect') || cat.includes('substrate') || name.includes('disinfectant') || name.includes('substrate');
                        return !isFeeding && !isCleaning;
                      }).map(item => (
                        <option key={item.id} value={item.id}>
                          [{item.category}] {item.name} — Stock: {item.currentStock} {item.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  {medAdminItemId && (
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={medAdminQty}
                        onChange={(e) => setMedAdminQty(Math.max(1, Number(e.target.value)))}
                        className={`w-full px-3 py-2 border rounded-xl text-xs font-bold text-center focus:outline-none ${
                          isDarkMode ? 'bg-[#071F11] border-emerald-900 text-white' : 'bg-white border-slate-200'
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-500 shrink-0">
                        {inventory.find(i => i.id === medAdminItemId)?.unit || 'dose'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Administration Status & Animal Health Clearance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Administration Status *</label>
                  <select
                    value={medAdminStatus}
                    onChange={(e) => setMedAdminStatus(e.target.value as any)}
                    className={`w-full px-3.5 py-2 border rounded-xl font-bold focus:outline-none ${
                      isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Full Dosage Administered">Full Dosage Administered ✓</option>
                    <option value="Partial Dosage Administered">Partial Dosage Administered</option>
                    <option value="Topical Application">Topical Application Completed ✓</option>
                    <option value="Refused">Refused / Regurgitated ✗</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Update Health Status</label>
                  <select
                    value={medAdminHealthStatus}
                    onChange={(e) => setMedAdminHealthStatus(e.target.value as any)}
                    className={`w-full px-3.5 py-2 border rounded-xl font-bold focus:outline-none ${
                      isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Under Treatment">Under Treatment</option>
                    <option value="Under Observation">Under Observation</option>
                    <option value="Healthy">Healthy (Cleared)</option>
                    <option value="Sick">Sick</option>
                    <option value="Injured">Injured</option>
                    <option value="Require Vet">Require Vet</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* 5. Keeper Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Keeper Remarks / Log Notes</label>
                <textarea
                  rows={2}
                  value={medAdminNotes}
                  onChange={(e) => setMedAdminNotes(e.target.value)}
                  placeholder="e.g. Swallowed suspension smoothly, placed in 28°C basking zone for observation..."
                  className={`w-full px-3.5 py-2 rounded-xl border focus:outline-none ${
                    isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 focus:border-[#113C24]'
                  }`}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-emerald-950 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsMedAdminModalOpen(false)} className="px-4 py-2 border border-slate-200 dark:border-emerald-900 rounded-xl font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer shadow-md">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save to Keeper's Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Keeper Health & Vet Request Modal */}
      {isHealthVetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            isDarkMode ? 'bg-[#061A10] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between ${
              isDarkMode ? 'border-emerald-950/80 bg-[#04140D]' : 'border-slate-100 bg-amber-50/60'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Submit Health & Vet Request</h3>
                  <p className="text-xs text-slate-400">Routes to Operations → Health & Vet for Admin Approval</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHealthVetModalOpen(false)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isDarkMode ? 'border-emerald-900/60 bg-[#04140D] hover:bg-emerald-950/60 text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitHealthVetRequest} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar text-xs">
              {/* 1. Animal Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Target Patient / Animal *</label>
                <select
                  value={reqAnimalId}
                  onChange={(e) => setReqAnimalId(e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-xl font-bold focus:outline-none ${
                    isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                  required
                >
                  <option value="">Select an animal...</option>
                  {myAssignedAnimals.length > 0 && (
                    <optgroup label="⭐ Your Assigned Care Roster">
                      {myAssignedAnimals.map(a => (
                        <option key={`my-${a.id}`} value={a.id}>
                          ⭐ {a.name || a.id} ({a.species}) • Enclosure: {a.enclosureId || 'General'}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label={myAssignedAnimals.length > 0 ? "Other Sanctuary Reptiles" : "All Sanctuary Reptiles"}>
                    {allActiveAnimals.filter(a => !myAssignedAnimals.some(ma => ma.id === a.id)).map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name || a.id} ({a.species}) • Enclosure: {a.enclosureId || 'General'} • Status: {a.healthStatus}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* 2. Request Type & Priority */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Request Type *</label>
                    <select
                      value={reqType}
                      onChange={(e) => setReqType(e.target.value)}
                      className={`w-full px-3.5 py-2.5 border rounded-xl font-bold focus:outline-none ${
                        isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="Need of Observation / Monitoring">Need of Observation / Monitoring</option>
                      <option value="Follow-up Checkup">Follow-up Checkup</option>
                      <option value="Clinical Health Check">Clinical Health Check</option>
                      <option value="Dietary / Appetite Evaluation">Dietary / Appetite Evaluation</option>
                      <option value="Skin / Shedding Check">Skin / Shedding Check</option>
                      <option value="Respiratory Evaluation">Respiratory Evaluation</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Priority Level *</label>
                    <select
                      value={reqPriority}
                      onChange={(e) => setReqPriority(e.target.value as any)}
                      className={`w-full px-3.5 py-2.5 border rounded-xl font-bold focus:outline-none ${
                        isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                  </div>
                </div>

                {reqType === 'Other' && (
                  <div className="p-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/20">
                    <label className="block text-xs font-bold text-emerald-400 mb-1">Specify Request Type *</label>
                    <input
                      type="text"
                      value={customReqType}
                      onChange={(e) => setCustomReqType(e.target.value)}
                      placeholder="e.g. Unusual Lethargy, Injured Tail Tip, Refusing Mice..."
                      required={reqType === 'Other'}
                      autoFocus
                      className={`w-full px-3.5 py-2.5 border rounded-xl font-semibold text-xs focus:outline-none ${
                        isDarkMode ? 'bg-[#04140D] border-emerald-900 text-white focus:border-emerald-400' : 'bg-white border-emerald-200 text-slate-800 focus:border-emerald-600'
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* 3. Preferred Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={reqDate}
                    onChange={(e) => setReqDate(e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-xl font-bold focus:outline-none ${
                      isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Target Time</label>
                  <input
                    type="text"
                    value={reqTime}
                    onChange={(e) => setReqTime(e.target.value)}
                    placeholder="e.g. 10:00 AM"
                    className={`w-full px-3.5 py-2.5 border rounded-xl font-bold focus:outline-none ${
                      isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* 4. Clinical Observations / Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Observation & Symptoms Observed *</label>
                <textarea
                  rows={3}
                  value={reqObservations}
                  onChange={(e) => setReqObservations(e.target.value)}
                  placeholder="Detail keeper observations (e.g. lethargic, wheezing sound, incomplete shed, refused feeding twice, needs follow-up observation)..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none ${
                    isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 focus:border-[#113C24]'
                  }`}
                  required
                />
              </div>

              {/* Policy Callout Banner */}
              <div className={`p-3.5 rounded-2xl border flex items-start space-x-2.5 ${
                isDarkMode ? 'bg-amber-950/20 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <strong>Standard Sanctuary Workflow:</strong>
                  <br />
                  1. Your request will appear in <strong>Operations → Health & Vet</strong>.
                  <br />
                  2. Admin reviews and approves or rejects the request.
                  <br />
                  3. After Admin approval, the appointment automatically syncs to <strong>Animals → Medical tab</strong>.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-emerald-950 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsHealthVetModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-emerald-900 rounded-xl font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-emerald-950/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Submit Request to Health & Vet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile & Settings Edit Modal */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Keeper Profile & Settings"
        subtitle="Manage keeper account details, profile photo, and facility assignments"
        roleLabel="Keeper"
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

          localStorage.setItem('feronia_keeper_name', data.name);
          localStorage.setItem('feronia_keeper_email', data.email);
          localStorage.setItem('feronia_keeper_phone', data.phone);
          localStorage.setItem('feronia_keeper_avatar', data.avatar);
          localStorage.setItem('feronia_keeper_bio', data.bio);
          localStorage.setItem('feronia_current_user_name', data.name);
          localStorage.setItem('feronia_current_user_email', data.email);
          localStorage.setItem('feronia_current_user_phone', data.phone);

          if (currentKeeperStaff) {
            const updatedStaff: StaffMember = {
              ...currentKeeperStaff,
              name: data.name,
              email: data.email,
              phone: data.phone,
              dutyLoad: data.bio
            };
            saveStaffMember(updatedStaff);
            fetch('/api/staff', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedStaff)
            }).catch(() => {});
            setStaffList(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));
          }
        }}
      />

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
          currentView="keeper"
          onCompleteTask={(id) => onUpdateTaskStatus && onUpdateTaskStatus(id, 'Completed')}
          onClose={() => setInspectedEnclosure(null)}
          onScanAnother={() => {
            setInspectedEnclosure(null);
            setIsQrScannerOpen(true);
          }}
          onQuickLogAction={(type, enc) => {
            if (onAddTask) {
              const newTask: Task = {
                id: `TASK-KEEPER-${Date.now().toString().slice(-4)}`,
                animalId: animals.find(a => a.enclosureId === enc.id)?.id || enc.id,
                type: type === 'feed' ? 'Feeding' : type === 'clean' ? 'Cleaning' : 'Health Check',
                title: `${type === 'feed' ? 'Feeding Round' : type === 'clean' ? 'Sanitization' : 'Enclosure Check'} (${enc.id})`,
                details: `${type === 'feed' ? 'Feeding round' : type === 'clean' ? 'Sanitization' : 'Inspection'} completed via QR scan for ${enc.name} (${enc.id}).`,
                date: systemDate,
                time: '12:00 PM',
                frequency: 'Once',
                status: 'Completed',
                assignedBy: 'Keeper',
                enclosureId: enc.id
              };
              onAddTask(newTask);
            }
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {/* ENCLOSURE QR MODAL */}
      {selectedEnclosureForQr && (
        <EnclosureQrModal
          enclosure={selectedEnclosureForQr}
          animals={animals}
          onClose={() => setSelectedEnclosureForQr(null)}
          onInspectEnclosure={(enc) => {
            setSelectedEnclosureForQr(null);
            setInspectedEnclosure(enc);
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {/* KEEPER ANIMAL DETAIL MODAL (Matching Admin layout, keeper-focused info) */}
      {selectedAnimalForKeeperModal && (
        <KeeperAnimalDetailModal
          animal={selectedAnimalForKeeperModal}
          animals={animals}
          breedingRecords={breedingRecords}
          onUpdateBreedingRecord={onUpdateBreedingRecord}
          onAddBreedingRecord={onAddBreedingRecord}
          onClose={() => setSelectedAnimalForKeeperModal(null)}
          enclosure={enclosures.find(e => e.id === selectedAnimalForKeeperModal.enclosureId)}
          tasks={tasks}
          appointments={appointments}
          staffMembers={(() => {
            try {
              const raw = localStorage.getItem('feronia_staff_members');
              return raw ? JSON.parse(raw) : [];
            } catch {
              return [];
            }
          })()}
          inventory={inventory}
          profileName={profileName || 'Animal Keeper'}
          isDarkMode={isDarkMode}
          initialTab={selectedAnimalInitialTab}
          onUpdateAnimal={(updated) => {
            onUpdateAnimal(updated);
            setSelectedAnimalForKeeperModal(updated);
          }}
          onOpenMedAdminModal={(animalId) => {
            setSelectedAnimalForKeeperModal(null);
            handleOpenMedAdminModal(animalId);
          }}
          onOpenHealthVetModal={(animalId) => {
            setSelectedAnimalForKeeperModal(null);
            handleOpenHealthVetModal(animalId);
          }}
          onAddAppointment={onAddAppointment}
        />
      )}

      {/* ENCLOSURE DETAIL MODAL */}
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
          onOpenQrPass={(enc) => setSelectedEnclosureForQr(enc)}
          onOpenClimateModal={(enc) => setSelectedEnclosureForClimate(enc)}
          onSelectAnimal={(animal) => {
            setSelectedAnimalInitialTab('overview');
            setSelectedAnimalForKeeperModal(animal);
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {/* KEEPER OFF-SEASON CLIMATE CONTROL MODAL */}
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
          keeperName={profileName || 'Animal Keeper'}
          isDarkMode={isDarkMode}
        />
      )}

      {/* ADD ENCLOSURE MODAL REMOVED - KEEPER CANNOT ADD ENCLOSURES */}
      {false && isAddEnclosureModalOpen && (
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

      {/* FULL TASK NOTE & PROTOCOL DETAILS MODAL */}
      {viewingTaskNote && (() => {
        const task = viewingTaskNote;
        const targetAnimal = animals.find(a => a.id === task.animalId);
        const enclosure = enclosures.find(e => e.id === task.enclosureId || e.id === targetAnimal?.enclosureId);
        const assignedBy = getTaskAssignedBy(task);
        const computedStatus = getTaskComputedStatus(task, systemDate);
        const fullDetails = task.details || 'Routine husbandry and care protocol.';
        const targetDisplay = targetAnimal
          ? `${targetAnimal.name || targetAnimal.id} (${targetAnimal.species})`
          : (task.animalId || 'Facility General');
        const imageUrl = targetAnimal?.image || targetAnimal?.imageUrl || getTaskImage(task.type);

        return (
          <div 
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
            onClick={() => setViewingTaskNote(null)}
          >
            <div 
              className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] ${
                isDarkMode ? 'bg-[#061A10] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={`p-5 border-b flex items-start justify-between ${
                isDarkMode ? 'border-emerald-950/80 bg-[#04140D]' : 'border-slate-100 bg-emerald-50/60'
              }`}>
                <div className="flex items-start space-x-3 min-w-0">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                    task.type === 'Health Check' || assignedBy === 'Veterinarian'
                      ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                      : task.type === 'Feeding'
                      ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                      : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                  }`}>
                    {task.type === 'Health Check' || assignedBy === 'Veterinarian' ? (
                      <Stethoscope className="w-5 h-5" />
                    ) : task.type === 'Feeding' ? (
                      <Utensils className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        task.type === 'Feeding' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        task.type === 'Cleaning' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        task.type === 'Health Check' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {task.type}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        computedStatus === 'Completed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : computedStatus === 'Overdue'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {computedStatus}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        #{task.id}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-base sm:text-lg mt-1 text-slate-900 dark:text-white leading-snug break-words">
                      {task.title}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingTaskNote(null)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ml-2 ${
                    isDarkMode ? 'border-emerald-900/60 bg-[#04140D] hover:bg-emerald-950/60 text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-500'
                  }`}
                  title="Close note popup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 overflow-y-auto no-scrollbar flex-1 text-xs">
                {/* Animal & Enclosure Card */}
                <div className={`p-3.5 rounded-2xl border flex items-center space-x-3 ${
                  isDarkMode ? 'bg-[#041209] border-emerald-950/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-emerald-500/20 bg-emerald-950/40">
                    {imageUrl ? (
                      <img src={imageUrl} alt={targetDisplay} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-emerald-400">
                        <PawPrint className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {targetDisplay}
                      </h4>
                      {targetAnimal?.healthStatus && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          targetAnimal.healthStatus === 'Healthy'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}>
                          {targetAnimal.healthStatus}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Enclosure: <strong className="text-slate-700 dark:text-slate-300">{enclosure ? `${enclosure.facility} • ${enclosure.name}` : (task.enclosureId || targetAnimal?.enclosureId || 'General Facility')}</strong>
                    </p>
                  </div>
                </div>

                {/* Assignment & Timing Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className={`p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-[#041209] border-emerald-950/60' : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Assigned By</span>
                    <div className="flex items-center space-x-1.5 mt-1">
                      {assignedBy === 'Veterinarian' ? (
                        <span className="font-extrabold text-xs text-purple-600 dark:text-purple-400 flex items-center space-x-1">
                          <Stethoscope className="w-3.5 h-3.5" />
                          <span>{task.assignedByName || `${resolveVeterinarianName(undefined, staffMembers)} (Vet)`}</span>
                        </span>
                      ) : (
                        <span className="font-extrabold text-xs text-blue-600 dark:text-blue-400 flex items-center space-x-1">
                          <Shield className="w-3.5 h-3.5" />
                          <span>{task.assignedByName || `${resolveAdminName(undefined, staffMembers)}`}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-[#041209] border-emerald-950/60' : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Scheduled Time</span>
                    <div className="flex items-center space-x-1.5 mt-1 font-extrabold text-xs text-slate-800 dark:text-slate-200">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{task.time || 'All Day'}</span>
                    </div>
                  </div>

                  <div className={`p-2.5 rounded-xl border col-span-2 sm:col-span-1 ${
                    isDarkMode ? 'bg-[#041209] border-emerald-950/60' : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Frequency</span>
                    <div className="flex items-center space-x-1.5 mt-1 font-extrabold text-xs text-slate-800 dark:text-slate-200">
                      <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{task.frequency || 'Daily'}</span>
                    </div>
                  </div>
                </div>

                {/* Primary Care Protocol & Full Instructions */}
                <div className={`p-4 rounded-2xl border space-y-2 ${
                  isDarkMode ? 'bg-[#04140D] border-emerald-950' : 'bg-white border-slate-200 shadow-2xs'
                }`}>
                  <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Care Protocol & Full Instructions</span>
                  </div>
                  <p className="text-xs sm:text-[13px] leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-line font-medium">
                    {fullDetails}
                  </p>
                </div>

                {/* Special Clinical / Precautionary Notes */}
                {task.notes && task.notes !== task.details && (
                  <div className={`p-3.5 rounded-xl border flex items-start space-x-2.5 ${
                    isDarkMode ? 'bg-amber-950/20 border-amber-900/40 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-xs block text-amber-600 dark:text-amber-400">
                        Special Assigner Note & Precaution:
                      </span>
                      <p className="text-xs leading-relaxed mt-0.5 whitespace-pre-line">
                        {task.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Standard Safety & Sanitation Guidance */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center space-x-2 text-[11px] text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    Feronia wildlife protocol: Always observe animal response, verify hygiene protocols, and log supply usage upon completion.
                  </span>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className={`p-4 border-t flex items-center justify-between gap-3 ${
                isDarkMode ? 'border-emerald-950/80 bg-[#04140D]' : 'border-slate-100 bg-slate-50'
              }`}>
                <button
                  type="button"
                  onClick={() => setViewingTaskNote(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    isDarkMode ? 'border-emerald-900/60 hover:bg-emerald-950/60 text-slate-300' : 'border-slate-200 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Close
                </button>

                <div className="flex items-center space-x-2">
                  {computedStatus === 'Completed' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateTaskStatus(task.id, 'Pending');
                        setViewingTaskNote(null);
                        setActionToast(`Task #${task.id} reopened.`);
                        setTimeout(() => setActionToast(null), 4000);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-emerald-900/60 hover:bg-slate-100 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
                    >
                      Reopen Task
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const check = checkClimateTaskCanBeCompleted(task);
                          if (!check.allowed) {
                            setActionToast(check.reason || '⚠️ Climate setup required.');
                            setTimeout(() => setActionToast(null), 5000);
                            return;
                          }
                          onUpdateTaskStatus(task.id, 'Completed');
                          setViewingTaskNote(null);
                          setActionToast(`✓ Marked task #${task.id} as Completed!`);
                          setTimeout(() => setActionToast(null), 4000);
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-bold border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                      >
                        Quick Complete
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const check = checkClimateTaskCanBeCompleted(task);
                          if (!check.allowed) {
                            setActionToast(check.reason || '⚠️ Climate setup required.');
                            setTimeout(() => setActionToast(null), 5000);
                            return;
                          }
                          setViewingTaskNote(null);
                          handleOpenTaskModal(task);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 transition-all cursor-pointer flex items-center space-x-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Complete & Log Record</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL: KEEPER ACTIVITY / LOG DETAIL POPUP IN FRONT */}
      {/* ========================================================================= */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className={`rounded-3xl max-w-lg w-full border shadow-2xl overflow-hidden flex flex-col my-8 ${
            isDarkMode ? 'bg-[#061A10] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-emerald-950 flex items-center justify-between bg-slate-50 dark:bg-[#04140D]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">{selectedLogDetail.title}</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedLogDetail.animalName} • {selectedLogDetail.type} • {selectedLogDetail.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-emerald-950 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#041209] border-emerald-950/80' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Timestamp</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block font-mono">
                    {selectedLogDetail.time} {selectedLogDetail.date ? `(${selectedLogDetail.date})` : ''}
                  </span>
                </div>
                <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#041209] border-emerald-950/80' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Logged By</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                    {selectedLogDetail.keeperName || 'Animal Keeper'}
                  </span>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 ${isDarkMode ? 'bg-[#04140D] border-emerald-950' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                  Log Details & Notes
                </span>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-line">
                  {selectedLogDetail.notes || selectedLogDetail.details || selectedLogDetail.subtext || 'No additional notes recorded for this activity.'}
                </p>
              </div>

              {selectedLogDetail.metrics && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
                  <strong className="block font-bold mb-1">Activity Metrics:</strong>
                  <span>{JSON.stringify(selectedLogDetail.metrics)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex items-center justify-end ${isDarkMode ? 'border-emerald-950 bg-[#04140D]' : 'border-slate-100 bg-slate-50'}`}>
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer"
              >
                Close Popup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
