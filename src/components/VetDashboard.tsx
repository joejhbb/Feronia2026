import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Bell, Stethoscope, PawPrint, FileText, Calendar, PieChart,
  Settings, User, LogOut, Sun, Moon, Menu, X, Check, CheckCircle2,
  LayoutGrid, AlertCircle, Info, Sparkles, ShieldCheck, QrCode, Database
} from 'lucide-react';
import { Animal, Enclosure, Task, MedicalRecord, Appointment, InventoryItem, StaffMember } from '../types';
import VetDashboardView from './vet/VetDashboardView';
import VetAnimalsView from './vet/VetAnimalsView';
import VetMedicalRecordsView from './vet/VetMedicalRecordsView';
import VetAppointmentsView from './vet/VetAppointmentsView';
import VetReportsView from './vet/VetReportsView';
import VetNotificationDropdown from './vet/VetNotificationDropdown';
import QrScannerModal from './common/QrScannerModal';
import EnclosureInspectionModal from './common/EnclosureInspectionModal';
import SystemDateBadge from './common/SystemDateBadge';
import UserAvatar from './common/UserAvatar';
import ProfileSettingsModal from './common/ProfileSettingsModal';

export interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
}

interface VetDashboardProps {
  onLogout: () => void;
  animals: Animal[];
  onUpdateAnimal: (updated: Animal) => void;
  enclosures: Enclosure[];
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTaskStatus?: (id: string, status: Task['status']) => void;
  medicalRecords: MedicalRecord[];
  onAddMedicalRecord: (record: MedicalRecord) => void;
  appointments?: Appointment[];
  staffMembers?: StaffMember[];
  onAddAppointment?: (appointment: Appointment) => void;
  onUpdateAppointment?: (appointment: Appointment) => void;
  onUpdateAppointmentStatus?: (id: string, status: Appointment['status']) => void;
  onDeleteAppointment?: (id: string) => void;
  inventory?: InventoryItem[];
  onUpdateInventory?: (items: InventoryItem[]) => void;
  onUpdateEnclosure?: (enclosure: Enclosure) => void;
  onOpenSupabaseConfig?: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

const formatSystemDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const dateObj = new Date(year, month - 1, day);
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export default function VetDashboard({
  onLogout,
  animals,
  onUpdateAnimal,
  enclosures,
  tasks,
  onAddTask,
  onDeleteTask,
  onUpdateTaskStatus = () => {},
  medicalRecords,
  onAddMedicalRecord,
  appointments = [],
  staffMembers = [],
  onAddAppointment = () => {},
  onUpdateAppointment,
  onUpdateAppointmentStatus = () => {},
  onDeleteAppointment = () => {},
  inventory = [],
  onUpdateInventory = () => {},
  onUpdateEnclosure = () => {},
  onOpenSupabaseConfig,
  isDarkMode,
  setIsDarkMode
}: VetDashboardProps) {
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

  // System date editable
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

  // Navigation Menu state with 5 user requested items
  type VetMenu = 'dashboard' | 'animals' | 'medical-records' | 'appointments' | 'reports';
  const [activeMenu, setActiveMenu] = useState<VetMenu>('dashboard');
  const [navigationHistory, setNavigationHistory] = useState<VetMenu[]>([]);

  const navigateToMenu = (targetMenu: VetMenu) => {
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

  // Selected patient for immediate consultation station routing
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  // Selected animal filter status when navigating from dashboard
  const [animalFilterStatus, setAnimalFilterStatus] = useState<string>('All');
  // Selected animal to open directly in the Animals section
  const [selectedAnimalIdForAnimalsView, setSelectedAnimalIdForAnimalsView] = useState<string | null>(null);

  const handleNavigateFromDashboard = (tab: VetMenu, filter?: string) => {
    if (tab === 'animals') {
      setAnimalFilterStatus(filter || 'All');
    }
    navigateToMenu(tab);
  };

  // Profile & Settings states
  const [profileName, setProfileName] = useState(() => {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('feronia_vet_name') || localStorage.getItem('feronia_current_user_name')) : null;
    return saved || 'Veterinarian';
  });
  const [profileEmail, setProfileEmail] = useState(() => {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('feronia_vet_email') || localStorage.getItem('feronia_current_user_email')) : null;
    return saved || 'vet@feroniasanctuary.org';
  });
  const [profilePhone, setProfilePhone] = useState(() => {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('feronia_vet_phone') || localStorage.getItem('feronia_current_user_phone')) : null;
    return saved || '';
  });
  const [profileAvatar, setProfileAvatar] = useState(() => localStorage.getItem('feronia_vet_avatar') || '👨‍⚕️');
  const [profileBio, setProfileBio] = useState(() => localStorage.getItem('feronia_vet_bio') || 'Chief veterinary medical director supervising exotic animal rehabilitation.');

  useEffect(() => {
    const handleStaffUpdated = (e: any) => {
      const updated = e.detail;
      if (updated && updated.role === 'vet') {
        if (updated.name) setProfileName(updated.name);
        if (updated.email) setProfileEmail(updated.email);
        setProfilePhone(updated.phone || '');
        if (updated.dutyLoad) setProfileBio(updated.dutyLoad);
      }
    };
    window.addEventListener('feronia_staff_updated', handleStaffUpdated as EventListener);
    return () => {
      window.removeEventListener('feronia_staff_updated', handleStaffUpdated as EventListener);
    };
  }, []);
  
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // QR Enclosure Field Scanner States
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [inspectedEnclosure, setInspectedEnclosure] = useState<Enclosure | null>(null);

  // Vet Clinical Notifications State & Unread Counter
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [appointmentTargetDate, setAppointmentTargetDate] = useState<string | null>(null);
  const [vetReadNotifIds, setVetReadNotifIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('feronia_vet_read_notifs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleMarkVetNotifRead = (id: string) => {
    setVetReadNotifIds(prev => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      try {
        localStorage.setItem('feronia_vet_read_notifs', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Calculate active / scheduled appointments for the notification badge on the Appointment/Schedule tab
  const vetAppointmentBadgeCount = useMemo(() => {
    return appointments.filter(a => 
      a.status === 'Pending Approval' || 
      a.status === 'Pending' || 
      a.status === 'Approved' || 
      a.status === 'Ongoing'
    ).length;
  }, [appointments]);

  // Calculate unread count across latest appointments, recent animals, and nearing appointment dates
  const { unreadNotifCount, hasUrgentNearing, vetNotifList } = useMemo(() => {
    const today = systemDate || new Date().toISOString().split('T')[0];
    let count = 0;
    let urgent = false;
    const list: { id: string }[] = [];

    const getDaysDiff = (targetDateStr: string) => {
      try {
        const [y1, m1, d1] = today.split('-').map(Number);
        const [y2, m2, d2] = targetDateStr.split('-').map(Number);
        if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 999;
        const dToday = new Date(y1, m1 - 1, d1);
        const dTarget = new Date(y2, m2 - 1, d2);
        const diffMs = dTarget.getTime() - dToday.getTime();
        return Math.round(diffMs / (1000 * 60 * 60 * 24));
      } catch {
        return 999;
      }
    };

    // 1. Nearing Appointments (active appointments within 7 days or overdue)
    appointments.forEach(apt => {
      if (apt.status === 'Completed' || apt.status === 'Cancelled' || apt.status === 'Declined') return;
      if (!apt.date) return;
      const diffDays = getDaysDiff(apt.date);
      if (diffDays <= 7) {
        const notifId = `nearing-${apt.id}`;
        list.push({ id: notifId });
        if (!vetReadNotifIds.includes(notifId)) count++;
        if (diffDays <= 0 || apt.priority === 'Emergency') urgent = true;
      }
    });

    // 2. Latest Appointments (last 10 sorted by date)
    const sortedApts = [...appointments].sort((a, b) => {
      const dateA = a.createdOn || a.date || '';
      const dateB = b.createdOn || b.date || '';
      return dateB.localeCompare(dateA);
    });

    sortedApts.slice(0, 10).forEach(apt => {
      const notifId = `latest-${apt.id}`;
      list.push({ id: notifId });
      if (!vetReadNotifIds.includes(notifId)) count++;
    });

    // 3. Recent Animals Added (last 8 active animals sorted by dateAcquired)
    const activeAnimals = animals.filter(a => !a.isArchived);
    const sortedAnimals = [...activeAnimals].sort((a, b) => {
      const dateA = a.dateAcquired || '';
      const dateB = b.dateAcquired || '';
      if (dateA && dateB) return dateB.localeCompare(dateA);
      return b.id.localeCompare(a.id);
    });

    sortedAnimals.slice(0, 8).forEach(a => {
      const notifId = `animal-${a.id}`;
      list.push({ id: notifId });
      if (!vetReadNotifIds.includes(notifId)) count++;
    });

    return { unreadNotifCount: count, hasUrgentNearing: urgent, vetNotifList: list };
  }, [appointments, animals, systemDate, vetReadNotifIds]);

  const handleMarkAllVetNotifsRead = () => {
    const allIds = vetNotifList.map(n => n.id);
    setVetReadNotifIds(allIds);
    try {
      localStorage.setItem('feronia_vet_read_notifs', JSON.stringify(allIds));
    } catch {}
  };

  const handleNavigateToAppointment = (targetDate?: string, appointmentId?: string) => {
    setAppointmentTargetDate(targetDate || null);
    navigateToMenu('appointments');
    setIsNotificationOpen(false);
  };

  const handleNavigateToAnimalConsult = (animalId: string) => {
    setSelectedPatientId(animalId);
    navigateToMenu('medical-records');
    setIsNotificationOpen(false);
  };

  const handleNavigateToAnimalsList = (animalId?: string) => {
    if (animalId) {
      setSelectedAnimalIdForAnimalsView(animalId);
    }
    navigateToMenu('animals');
    setIsNotificationOpen(false);
  };

  const handleNavigateToAnimalDetail = (animalId: string) => {
    setSelectedAnimalIdForAnimalsView(animalId);
    navigateToMenu('animals');
    setIsNotificationOpen(false);
  };

  // Toast notifications state for record saves
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const showToast = (
    title: string,
    message: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'success'
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastNotification = {
      id,
      type,
      title,
      message,
      timestamp: 'Just now'
    };
    setToasts(prev => [newToast, ...prev].slice(0, 4));

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Wrapped record save handlers to trigger notifications
  const handleAddMedicalRecordWithToast = (record: MedicalRecord) => {
    onAddMedicalRecord(record);
    const patient = animals.find(a => a.id === record.animalId);
    const patientName = patient?.name || record.animalId;
    showToast(
      'Medical Record Saved',
      `Clinical consultation & treatment for ${patientName} (${record.recordType || 'Consultation'}) has been recorded.`,
      'success'
    );
  };

  const handleAddAppointmentWithToast = (appointment: Appointment) => {
    if (onAddAppointment) {
      onAddAppointment(appointment);
    }
    const patient = animals.find(a => a.id === appointment.animalId);
    const patientName = patient?.name || appointment.animalId;
    showToast(
      'Appointment Saved',
      `Examination appointment for ${patientName} scheduled on ${appointment.date} (${appointment.time}) has been saved.`,
      'success'
    );
  };

  const handleUpdateAppointmentStatusWithToast = (id: string, status: Appointment['status']) => {
    if (onUpdateAppointmentStatus) {
      onUpdateAppointmentStatus(id, status);
    }
    showToast(
      'Appointment Updated',
      `Appointment record #${id.slice(-6)} updated to "${status}".`,
      'info'
    );
  };

  const handleUpdateAppointmentWithToast = (updated: Appointment) => {
    if (onUpdateAppointment) {
      onUpdateAppointment(updated);
    } else if (onUpdateAppointmentStatus) {
      onUpdateAppointmentStatus(updated.id, updated.status);
    }
    showToast(
      'Appointment Updated',
      `Appointment record #${updated.id.slice(-6)} updated to "${updated.status}".`,
      'info'
    );
  };

  const handleUpdateAnimalWithToast = (updated: Animal) => {
    onUpdateAnimal(updated);
    showToast(
      'Animal Record Saved',
      `Health status and profile for "${updated.name || updated.id}" have been updated (${updated.healthStatus || 'Healthy'}).`,
      'success'
    );
  };

  // Form states for profile modal editing
  const [tempName, setTempName] = useState(profileName);
  const [tempEmail, setTempEmail] = useState(profileEmail);
  const [tempPhone, setTempPhone] = useState(profilePhone);
  const [tempAvatar, setTempAvatar] = useState(profileAvatar);
  const [tempBio, setTempBio] = useState(profileBio);

  const openProfileModal = () => {
    setTempName(profileName);
    setTempEmail(profileEmail);
    setTempPhone(profilePhone);
    setTempAvatar(profileAvatar);
    setTempBio(profileBio);
    setIsProfileModalOpen(true);
  };

  // Navigation Items array for Vet Portal:
  // Dashboard, Animals, Medical Records, Appointment/Schedule, and Reports
  const navMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'animals', label: 'Animals', icon: PawPrint },
    { id: 'medical-records', label: 'Medical Records', icon: FileText },
    { id: 'appointments', label: 'Appointment/Schedule', icon: Calendar },
    { id: 'reports', label: 'Reports', icon: PieChart },
  ] as const;

  const handleSelectAnimalForConsult = (animalId: string, appointmentId?: string) => {
    setSelectedPatientId(animalId);
    setActiveAppointmentId(appointmentId || null);
    navigateToMenu('medical-records');
  };

  const handleScheduleForAnimal = (animalId: string) => {
    setSelectedPatientId(animalId);
    navigateToMenu('appointments');
  };

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
                <Stethoscope className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`} />
              </div>
              <div>
                <span className={`font-black text-base tracking-wider block leading-none ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>FERONIA</span>
                <span className={`text-[10px] font-extrabold tracking-wider block mt-1.5 leading-none ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>VET PORTAL</span>
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
                  <UserAvatar
                    avatar={profileAvatar}
                    name={profileName}
                    size="md"
                    isDarkMode={isDarkMode}
                  />
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 rounded-full animate-pulse ${
                    isDarkMode ? 'border-[#06180F]' : 'border-white'
                  }`}></span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-black leading-tight truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{profileName}</p>
                  <p className={`text-[10px] font-bold leading-tight mt-0.5 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Veterinarian</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <span className={`text-[9px] font-extrabold uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>● CLINICAL ACTIVE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Items (Copied style from Admin Portal) */}
            <nav className="p-3 space-y-1">
              {navMenuItems.map(item => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;
                const badgeCount = item.id === 'appointments' ? vetAppointmentBadgeCount : 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateToMenu(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive 
                        ? (isDarkMode ? 'bg-[#113C24] text-white shadow-md border-l-4 border-emerald-400' : 'bg-emerald-800 text-white shadow-md border-l-4 border-emerald-500')
                        : (isDarkMode ? 'text-emerald-100/60 hover:bg-emerald-900/20 hover:text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900')
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : (isDarkMode ? 'text-emerald-300/60' : 'text-slate-400')}`} />
                      <span>{item.label}</span>
                    </div>
                    {badgeCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-xs animate-pulse">
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Clean footer */}
          <div className={`p-4 text-center border-t ${
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
                    <Stethoscope className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`} />
                  </div>
                  <div>
                    <span className={`font-black text-base tracking-wider block leading-none ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>FERONIA</span>
                    <span className={`text-[10px] font-extrabold tracking-wider block mt-1.5 leading-none ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>VET PORTAL</span>
                  </div>
                </div>

                {/* Profile Card */}
                <div className={`p-4 border-b ${
                  isDarkMode ? 'border-emerald-950/40 bg-[#05160E]/50' : 'border-slate-200 bg-slate-50/60'
                }`}>
                  <div className={`p-3 rounded-2xl border flex items-center space-x-3 ${
                    isDarkMode ? 'bg-emerald-950/40 border-emerald-900/30' : 'bg-white border-slate-200 shadow-2xs'
                  }`}>
                    <div className="relative">
                      <UserAvatar
                        avatar={profileAvatar}
                        name={profileName}
                        size="md"
                        isDarkMode={isDarkMode}
                      />
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 rounded-full ${
                        isDarkMode ? 'border-[#06180F]' : 'border-white'
                      }`}></span>
                    </div>
                    <div>
                      <p className={`text-xs font-black leading-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{profileName}</p>
                      <p className={`text-[10px] font-bold leading-tight mt-0.5 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Veterinarian</p>
                      <div className="flex items-center space-x-1 mt-1">
                        <span className={`text-[9px] font-extrabold uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>● CLINICAL ACTIVE</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation Items */}
                <nav className="p-4 space-y-1.5">
                  {navMenuItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeMenu === item.id;
                    const badgeCount = item.id === 'appointments' ? vetAppointmentBadgeCount : 0;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          navigateToMenu(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive 
                            ? (isDarkMode ? 'bg-[#113C24] text-white shadow-md border-l-4 border-emerald-400' : 'bg-emerald-800 text-white shadow-md border-l-4 border-emerald-500')
                            : (isDarkMode ? 'text-emerald-100/60 hover:bg-emerald-900/20 hover:text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900')
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : (isDarkMode ? 'text-emerald-300/60' : 'text-slate-400')}`} />
                          <span>{item.label}</span>
                        </div>
                        {badgeCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-xs animate-pulse">
                            {badgeCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Footer */}
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
        
        {/* Topbar Navigation Bar (Matching Admin Portal) */}
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

            {/* Quick Context Tab Title */}
            <div className="hidden sm:flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                {navMenuItems.find(i => i.id === activeMenu)?.label || 'Clinical Portal'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* System Date Indicator Badge */}
            <SystemDateBadge
              systemDate={systemDate}
              onUpdateSystemDate={handleUpdateSystemDate}
              isDarkMode={isDarkMode}
            />

            {/* QR Enclosure Field Scan Button */}
            <button
              onClick={() => setIsQrScannerOpen(true)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 border text-xs font-bold rounded-xl cursor-pointer transition-all ${
                isDarkMode 
                  ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300 hover:bg-emerald-900/40' 
                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-[#113C24]'
              }`}
              title="Scan Enclosure QR Code with Camera or Upload"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
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
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-emerald-700" />}
            </button>

            {/* Notification Bell with Clinical Alerts Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={`relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                  isNotificationOpen
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/40'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
                title="Clinical Alerts, Latest Appointments & Recent Animal Intake"
              >
                {unreadNotifCount > 0 && (
                  <>
                    <span className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full animate-ping ${
                      hasUrgentNearing ? 'bg-rose-500' : 'bg-emerald-500'
                    }`} />
                    <span className={`absolute -top-0.5 -right-0.5 min-w-[17px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-xs ${
                      hasUrgentNearing ? 'bg-rose-600' : 'bg-emerald-600'
                    }`}>
                      {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                    </span>
                  </>
                )}
                <Bell className="w-4 h-4" />
              </button>

              <VetNotificationDropdown
                isOpen={isNotificationOpen}
                onClose={() => {
                  setIsNotificationOpen(false);
                }}
                appointments={appointments}
                animals={animals}
                systemDate={systemDate}
                isDarkMode={isDarkMode}
                readIds={vetReadNotifIds}
                onMarkAsRead={handleMarkVetNotifRead}
                onMarkAllAsRead={handleMarkAllVetNotifsRead}
                onNavigateToAppointment={handleNavigateToAppointment}
                onNavigateToAnimalConsult={handleNavigateToAnimalConsult}
                onNavigateToAnimalsList={handleNavigateToAnimalsList}
              />
            </div>

            {/* Profile Avatar with Dropdown */}
            <div className={`relative flex items-center sm:pl-3 sm:border-l ${isDarkMode ? 'border-emerald-950' : 'border-slate-200'}`}>
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
                        <h4 className="text-xs font-black truncate">{profileName}</h4>
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
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 transition-colors duration-300 ${
          isDarkMode ? 'bg-[#05160E]' : 'bg-[#F4F7F5]'
        }`}>
          
          {/* 1. DASHBOARD */}
          {activeMenu === 'dashboard' && (
            <VetDashboardView
              animals={animals}
              medicalRecords={medicalRecords}
              tasks={tasks}
              appointments={appointments}
              staffMembers={staffMembers}
              systemDate={systemDate}
              onUpdateSystemDate={handleUpdateSystemDate}
              isDarkMode={isDarkMode}
              onNavigate={handleNavigateFromDashboard}
              onSelectAnimalForConsult={handleSelectAnimalForConsult}
              onScheduleForAnimal={handleScheduleForAnimal}
              onCompleteAppointment={(id) => handleUpdateAppointmentStatusWithToast(id, 'Completed')}
            />
          )}

          {/* 2. ANIMALS */}
          {activeMenu === 'animals' && (
            <VetAnimalsView
              animals={animals}
              enclosures={enclosures}
              tasks={tasks}
              medicalRecords={medicalRecords}
              appointments={appointments}
              staffMembers={staffMembers}
              isDarkMode={isDarkMode}
              systemDate={systemDate}
              onUpdateAnimal={handleUpdateAnimalWithToast}
              onSelectAnimalForConsult={handleSelectAnimalForConsult}
              onScheduleForAnimal={handleScheduleForAnimal}
              onAddAppointment={handleAddAppointmentWithToast}
              onUpdateAppointment={handleUpdateAppointmentWithToast}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatusWithToast}
              onAddMedicalRecord={handleAddMedicalRecordWithToast}
              initialStatusFilter={animalFilterStatus}
              initialSelectedAnimalId={selectedAnimalIdForAnimalsView}
              userAccount={{
                name: profileName,
                email: profileEmail
              }}
              onBackToDashboard={handleGoBack}
              onBack={handleGoBack}
            />
          )}

          {/* 3. MEDICAL RECORDS */}
          {activeMenu === 'medical-records' && (
            <VetMedicalRecordsView
              animals={animals}
              medicalRecords={medicalRecords}
              inventory={inventory}
              isDarkMode={isDarkMode}
              selectedPatientId={selectedPatientId}
              setSelectedPatientId={setSelectedPatientId}
              activeAppointmentId={activeAppointmentId}
              setActiveAppointmentId={setActiveAppointmentId}
              onAddMedicalRecord={handleAddMedicalRecordWithToast}
              onUpdateAnimal={handleUpdateAnimalWithToast}
              onUpdateInventory={onUpdateInventory}
              onAddTask={onAddTask}
              appointments={appointments}
              staffMembers={staffMembers}
              onAddAppointment={handleAddAppointmentWithToast}
              onUpdateAppointment={handleUpdateAppointmentWithToast}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatusWithToast}
              systemDate={systemDate}
              onNotify={showToast}
              onBackToDashboard={handleGoBack}
              onBack={handleGoBack}
              tasks={tasks}
              onUpdateTaskStatus={onUpdateTaskStatus}
              enclosures={enclosures}
              onUpdateEnclosure={onUpdateEnclosure}
            />
          )}

          {/* 4. APPOINTMENT/SCHEDULE */}
          {activeMenu === 'appointments' && (
            <VetAppointmentsView
              animals={animals}
              enclosures={enclosures}
              tasks={tasks}
              medicalRecords={medicalRecords}
              appointments={appointments}
              staffMembers={staffMembers}
              isDarkMode={isDarkMode}
              systemDate={systemDate}
              onAddAppointment={handleAddAppointmentWithToast}
              onUpdateAppointment={handleUpdateAppointmentWithToast}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatusWithToast}
              onSelectAnimalForConsult={handleSelectAnimalForConsult}
              onUpdateAnimal={handleUpdateAnimalWithToast}
              onAddMedicalRecord={handleAddMedicalRecordWithToast}
              initialSelectedDate={appointmentTargetDate}
              onNavigateToAnimals={() => navigateToMenu('animals')}
              onSelectAnimalForFollowup={handleNavigateToAnimalDetail}
              userAccount={{
                name: profileName,
                email: profileEmail
              }}
              onBackToDashboard={handleGoBack}
              onBack={handleGoBack}
            />
          )}

          {/* 5. REPORTS */}
          {activeMenu === 'reports' && (
            <VetReportsView
              animals={animals}
              medicalRecords={medicalRecords}
              inventory={inventory}
              staffMembers={staffMembers}
              isDarkMode={isDarkMode}
              systemDate={systemDate}
              onBackToDashboard={handleGoBack}
              onBack={handleGoBack}
            />
          )}

        </main>
      </div>

      {/* Profile & Settings Edit Modal */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Veterinarian Profile & Settings"
        subtitle="Manage clinical credentials, profile photo, and veterinarian bio"
        roleLabel="Veterinarian"
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

          localStorage.setItem('feronia_vet_name', data.name);
          localStorage.setItem('feronia_vet_email', data.email);
          localStorage.setItem('feronia_vet_phone', data.phone);
          localStorage.setItem('feronia_vet_avatar', data.avatar);
          localStorage.setItem('feronia_vet_bio', data.bio);
          localStorage.setItem('feronia_current_user_name', data.name);
          localStorage.setItem('feronia_current_user_email', data.email);
          localStorage.setItem('feronia_current_user_phone', data.phone);

          showToast('Profile Saved', 'Your veterinarian credentials, photo, and bio have been updated.', 'success');
        }}
      />

      {/* Floating System Toast Notifications */}
      <div 
        id="vet-toast-container"
        className="fixed top-5 right-5 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start space-x-3.5 transition-all ${
                toast.type === 'success'
                  ? isDarkMode
                    ? 'bg-[#051C11]/95 border-emerald-500/50 text-white shadow-emerald-950/50'
                    : 'bg-emerald-50/95 border-emerald-300 text-slate-800 shadow-emerald-900/10'
                  : toast.type === 'warning'
                  ? isDarkMode
                    ? 'bg-[#221606]/95 border-amber-500/50 text-white shadow-amber-950/50'
                    : 'bg-amber-50/95 border-amber-300 text-slate-800 shadow-amber-900/10'
                  : toast.type === 'error'
                  ? isDarkMode
                    ? 'bg-[#220606]/95 border-rose-500/50 text-white shadow-rose-950/50'
                    : 'bg-rose-50/95 border-rose-300 text-slate-800 shadow-rose-900/10'
                  : isDarkMode
                  ? 'bg-[#081726]/95 border-blue-500/50 text-white shadow-blue-950/50'
                  : 'bg-blue-50/95 border-blue-300 text-slate-800 shadow-blue-900/10'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${
                toast.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : toast.type === 'warning'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : toast.type === 'error'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {toast.type === 'warning' && <AlertCircle className="w-5 h-5" />}
                {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                {toast.type === 'info' && <Info className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black tracking-tight">{toast.title}</h4>
                  <span className="text-[10px] opacity-60 font-mono shrink-0">{toast.timestamp}</span>
                </div>
                <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed font-medium">
                  {toast.message}
                </p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className={`p-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                }`}
                title="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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
          currentView="vet"
          onClose={() => setInspectedEnclosure(null)}
          onScanAnother={() => {
            setInspectedEnclosure(null);
            setIsQrScannerOpen(true);
          }}
          onQuickLogAction={(type, enc) => {
            showToast(
              'Enclosure Check Logged',
              `${type === 'feed' ? 'Feeding' : type === 'clean' ? 'Sanitization' : 'Veterinary check'} recorded for ${enc.name} (${enc.id})`,
              'success'
            );
          }}
          isDarkMode={isDarkMode}
        />
      )}

    </div>
  );
}
