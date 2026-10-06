import React, { useState, useMemo } from 'react';
import {
  Bell, Calendar, Clock, PawPrint, AlertTriangle, Check, CheckCircle2,
  ChevronRight, X, Filter, Stethoscope, Sparkles, ExternalLink, CalendarDays
} from 'lucide-react';
import { Animal, Appointment } from '../../types';

export interface VetNotificationItem {
  id: string;
  category: 'nearing' | 'latest' | 'recent_animal';
  title: string;
  subtitle: string;
  detail: string;
  dateStr: string;
  timeStr?: string;
  priority?: 'Normal' | 'High' | 'Emergency';
  urgency: 'critical' | 'warning' | 'info';
  metadata: {
    appointmentId?: string;
    animalId?: string;
    targetDate?: string;
    species?: string;
    morph?: string;
    healthStatus?: string;
    status?: string;
    priority?: string;
    requestedBy?: string;
  };
}

interface VetNotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: Appointment[];
  animals: Animal[];
  systemDate: string;
  isDarkMode: boolean;
  onNavigateToAppointment: (targetDate?: string, appointmentId?: string) => void;
  onNavigateToAnimalConsult: (animalId: string) => void;
  onNavigateToAnimalsList: (animalId?: string) => void;
  readIds?: string[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
}

export default function VetNotificationDropdown({
  isOpen,
  onClose,
  appointments,
  animals,
  systemDate,
  isDarkMode,
  onNavigateToAppointment,
  onNavigateToAnimalConsult,
  onNavigateToAnimalsList,
  readIds: externalReadIds,
  onMarkAsRead,
  onMarkAllAsRead
}: VetNotificationDropdownProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'nearing' | 'latest' | 'animals'>('all');
  const [localReadIds, setLocalReadIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('feronia_vet_read_notifs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const readIds = externalReadIds !== undefined ? externalReadIds : localReadIds;

  const effectiveToday = systemDate || new Date().toISOString().split('T')[0];

  // Compute the 3 categories of notifications
  const allNotifications = useMemo(() => {
    const list: VetNotificationItem[] = [];

    // Helper to calculate difference in days
    const getDaysDiff = (targetDateStr: string) => {
      try {
        const [y1, m1, d1] = effectiveToday.split('-').map(Number);
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

    // 1. NEARING APPOINTMENT DATES
    appointments.forEach(apt => {
      if (apt.status === 'Completed' || apt.status === 'Cancelled' || apt.status === 'Declined') {
        return;
      }
      if (!apt.date) return;

      const diffDays = getDaysDiff(apt.date);
      const patient = animals.find(a => a.id === apt.animalId);
      const patientName = patient ? `${patient.name || patient.id} (${patient.species})` : apt.animalId;

      // Nearing threshold: within 7 days, today, or overdue
      if (diffDays <= 7) {
        let title = '';
        let urgency: 'critical' | 'warning' | 'info' = 'info';

        if (diffDays === 0) {
          title = `🚨 Nearing Appointment: TODAY at ${apt.time || 'Scheduled Time'}`;
          urgency = apt.priority === 'Emergency' || apt.priority === 'High' ? 'critical' : 'warning';
        } else if (diffDays === 1) {
          title = `⏰ Nearing Appointment: TOMORROW at ${apt.time || 'Scheduled Time'}`;
          urgency = apt.priority === 'Emergency' ? 'critical' : 'warning';
        } else if (diffDays > 1 && diffDays <= 7) {
          title = `📅 Nearing Appointment: in ${diffDays} days (${apt.date})`;
          urgency = apt.priority === 'Emergency' ? 'critical' : 'info';
        } else if (diffDays < 0) {
          title = `⚠️ Overdue Appointment (${Math.abs(diffDays)}d overdue)`;
          urgency = 'critical';
        }

        list.push({
          id: `nearing-${apt.id}`,
          category: 'nearing',
          title,
          subtitle: `${patientName} • ${apt.type}`,
          detail: apt.purpose || 'Clinical checkup scheduled',
          dateStr: apt.date,
          timeStr: apt.time,
          priority: apt.priority,
          urgency,
          metadata: {
            appointmentId: apt.id,
            animalId: apt.animalId,
            targetDate: apt.date,
            species: patient?.species,
            priority: apt.priority,
            status: apt.status
          }
        });
      }
    });

    // 2. LATEST APPOINTMENTS (recently scheduled / requested / pending approval)
    // Sort appointments by createdOn or date
    const sortedApts = [...appointments].sort((a, b) => {
      const dateA = a.createdOn || a.date || '';
      const dateB = b.createdOn || b.date || '';
      return dateB.localeCompare(dateA);
    });

    sortedApts.slice(0, 10).forEach(apt => {
      const patient = animals.find(a => a.id === apt.animalId);
      const patientName = patient ? `${patient.name || patient.id}` : apt.animalId;
      const isPending = apt.status === 'Pending Approval';
      const isEmergency = apt.priority === 'Emergency';

      list.push({
        id: `latest-${apt.id}`,
        category: 'latest',
        title: isPending
          ? `⏳ New Appointment Request: Pending Admin Approval`
          : `📋 Latest Appointment: ${apt.type}`,
        subtitle: `${patientName} (${patient?.species || 'Animal'}) • ${apt.date} ${apt.time}`,
        detail: `${apt.purpose} — Requested by ${apt.requestedBy || 'Staff'}`,
        dateStr: apt.date,
        timeStr: apt.time,
        priority: apt.priority,
        urgency: isEmergency ? 'critical' : isPending ? 'warning' : 'info',
        metadata: {
          appointmentId: apt.id,
          animalId: apt.animalId,
          targetDate: apt.date,
          species: patient?.species,
          priority: apt.priority,
          status: apt.status,
          requestedBy: apt.requestedBy
        }
      });
    });

    // 3. RECENT ANIMALS ADDED
    const activeAnimals = animals.filter(a => !a.isArchived);
    // Sort by dateAcquired descending, or latest IDs
    const sortedAnimals = [...activeAnimals].sort((a, b) => {
      const dateA = a.dateAcquired || '';
      const dateB = b.dateAcquired || '';
      if (dateA && dateB) return dateB.localeCompare(dateA);
      return b.id.localeCompare(a.id);
    });

    sortedAnimals.slice(0, 8).forEach(animal => {
      const needsIntakeCheck = animal.healthStatus === 'Under Observation' ||
        animal.healthStatus === 'Sick' ||
        animal.healthStatus === 'Injured' ||
        (animal.healthStatus as string) === 'Unassessed';

      list.push({
        id: `animal-${animal.id}`,
        category: 'recent_animal',
        title: `🐾 New Animal Intake: ${animal.name ? `${animal.name} (${animal.id})` : animal.id}`,
        subtitle: `${animal.species} ${animal.morph ? `• ${animal.morph}` : ''}`,
        detail: `Acquired: ${animal.dateAcquired || 'Recently Admitted'} • Health Status: ${animal.healthStatus}`,
        dateStr: animal.dateAcquired || effectiveToday,
        urgency: needsIntakeCheck ? 'warning' : 'info',
        metadata: {
          animalId: animal.id,
          species: animal.species,
          morph: animal.morph,
          healthStatus: animal.healthStatus
        }
      });
    });

    return list;
  }, [appointments, animals, effectiveToday]);

  const markAsRead = (id: string) => {
    if (onMarkAsRead) {
      onMarkAsRead(id);
    } else {
      setLocalReadIds(prev => {
        if (prev.includes(id)) return prev;
        const updated = [...prev, id];
        try {
          localStorage.setItem('feronia_vet_read_notifs', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  };

  const markAllAsRead = () => {
    if (onMarkAllAsRead) {
      onMarkAllAsRead();
    } else {
      const allIds = allNotifications.map(n => n.id);
      setLocalReadIds(allIds);
      try {
        localStorage.setItem('feronia_vet_read_notifs', JSON.stringify(allIds));
      } catch {}
    }
  };

  const filteredNotifications = useMemo(() => {
    const unreadList = allNotifications.filter(n => !readIds.includes(n.id));
    if (activeTab === 'all') return unreadList;
    return unreadList.filter(n => n.category === activeTab);
  }, [allNotifications, readIds, activeTab]);

  const unreadCount = useMemo(() => {
    return allNotifications.filter(n => !readIds.includes(n.id)).length;
  }, [allNotifications, readIds]);

  const nearingCount = useMemo(() => {
    return allNotifications.filter(n => n.category === 'nearing').length;
  }, [allNotifications]);

  const latestCount = useMemo(() => {
    return allNotifications.filter(n => n.category === 'latest').length;
  }, [allNotifications]);

  const recentAnimalsCount = useMemo(() => {
    return allNotifications.filter(n => n.category === 'recent_animal').length;
  }, [allNotifications]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      <div className={`absolute right-0 top-12 w-80 sm:w-96 rounded-3xl border shadow-2xl z-50 overflow-hidden transition-all duration-200 animate-fade-in ${
        isDarkMode
          ? 'bg-[#06180F] border-emerald-950/80 text-white shadow-emerald-950/50'
          : 'bg-white border-slate-200 text-slate-800 shadow-2xl shadow-slate-200/60'
      }`}>
        {/* Dropdown Header */}
        <div className={`p-4 border-b ${
          isDarkMode ? 'bg-[#04120B] border-emerald-950' : 'bg-emerald-50/70 border-slate-100'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-black tracking-tight">Clinical Alerts & Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-xs">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">Upcoming appointments, latest bookings & new intake</p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-1 mt-3 p-1 rounded-xl bg-emerald-950/40 dark:bg-[#030e07] border border-emerald-900/30 text-[11px] font-bold overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({allNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('nearing')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
                activeTab === 'nearing'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>⏰ Nearing</span>
              <span className="text-[9px] opacity-80">({nearingCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('latest')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
                activeTab === 'latest'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📅 Latest</span>
              <span className="text-[9px] opacity-80">({latestCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('animals')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
                activeTab === 'animals'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🐾 Intake</span>
              <span className="text-[9px] opacity-80">({recentAnimalsCount})</span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-emerald-950/40">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-50" />
              <p className="font-bold text-slate-300">All caught up!</p>
              <p className="text-[11px] text-slate-500 mt-1">No pending notifications in this category.</p>
            </div>
          ) : (
            filteredNotifications.map(item => {
              const isUnread = !readIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    markAsRead(item.id);
                    if (item.category === 'nearing') {
                      onNavigateToAppointment(item.metadata.targetDate, item.metadata.appointmentId);
                    } else if (item.category === 'latest') {
                      onNavigateToAppointment(item.metadata.targetDate, item.metadata.appointmentId);
                    } else if (item.category === 'recent_animal' && item.metadata.animalId) {
                      onNavigateToAnimalConsult(item.metadata.animalId);
                    }
                    onClose();
                  }}
                  className={`p-3.5 transition-all cursor-pointer group flex items-start space-x-3 text-left ${
                    isUnread
                      ? (isDarkMode ? 'bg-emerald-950/30 hover:bg-emerald-900/40' : 'bg-emerald-50/50 hover:bg-emerald-50')
                      : (isDarkMode ? 'hover:bg-[#04120B]' : 'hover:bg-slate-50')
                  }`}
                >
                  {/* Category Icon */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    item.urgency === 'critical'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : item.urgency === 'warning'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {item.category === 'nearing' ? (
                      <Clock className="w-4 h-4" />
                    ) : item.category === 'latest' ? (
                      <Calendar className="w-4 h-4" />
                    ) : (
                      <PawPrint className="w-4 h-4" />
                    )}
                  </div>

                  {/* Notification Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h5 className={`text-xs font-black truncate group-hover:text-emerald-400 transition-colors ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {item.title}
                      </h5>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                      )}
                    </div>

                    <p className="text-[11px] font-semibold text-emerald-400/90 truncate mt-0.5">
                      {item.subtitle}
                    </p>

                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                      {item.detail}
                    </p>

                    <div className="flex items-center space-x-2 mt-2 text-[10px] text-slate-500 flex-wrap gap-y-1">
                      <span className="font-mono bg-emerald-950/60 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-900/50 font-bold">
                        📅 {item.dateStr} {item.timeStr || ''}
                      </span>
                      {item.priority && (
                        <span className={`px-1.5 py-0.2 rounded font-black uppercase tracking-wider ${
                          item.priority === 'Emergency'
                            ? 'bg-rose-950 text-rose-300 border border-rose-900'
                            : item.priority === 'High'
                              ? 'bg-amber-950 text-amber-300 border border-amber-900'
                              : 'bg-emerald-950 text-emerald-300'
                        }`}>
                          {item.priority}
                        </span>
                      )}
                      <span className="text-emerald-400 font-bold flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
                        <span>{item.category === 'recent_animal' ? 'Open Consult' : 'View Schedule'}</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Dropdown Footer */}
        <div className={`p-3 border-t flex items-center justify-between text-xs ${
          isDarkMode ? 'bg-[#04120B] border-emerald-950' : 'bg-slate-50 border-slate-100'
        }`}>
          <button
            type="button"
            onClick={() => {
              onNavigateToAppointment();
              onClose();
            }}
            className="font-bold text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Open Calendar Schedule</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-[11px] font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
