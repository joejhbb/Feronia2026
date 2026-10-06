import React, { useState, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  CheckSquare,
  Package,
  AlertTriangle,
  PawPrint,
  Clock,
  ChevronRight,
  Eye,
  Stethoscope
} from 'lucide-react';
import { Animal, Task, InventoryNotification, Appointment, getTaskComputedStatus } from '../../types';

export interface KeeperNotificationItem {
  id: string;
  category: 'tasks' | 'supplies' | 'animals' | 'appointments';
  title: string;
  subtitle: string;
  detail: string;
  dateStr: string;
  timeStr?: string;
  urgency: 'critical' | 'warning' | 'info';
  metadata: {
    taskId?: string;
    inventoryId?: string;
    animalId?: string;
    appointmentId?: string;
    targetMenu?: string;
  };
}

interface KeeperNotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  inventoryNotifications: InventoryNotification[];
  assignedAnimals: Animal[];
  appointments: Appointment[];
  systemDate: string;
  isDarkMode: boolean;
  onNavigateToTasks: () => void;
  onNavigateToInventory: (searchItem?: string) => void;
  onNavigateToAnimal: (animal: Animal) => void;
  onNavigateToAppointments?: () => void;
  onMarkAllNotificationsAsRead?: () => void;
  onMarkNotificationAsRead?: (id: string) => void;
  readIds?: string[];
}

export const KeeperNotificationDropdown: React.FC<KeeperNotificationDropdownProps> = ({
  isOpen,
  onClose,
  tasks,
  inventoryNotifications,
  assignedAnimals,
  appointments,
  systemDate,
  isDarkMode,
  onNavigateToTasks,
  onNavigateToInventory,
  onNavigateToAnimal,
  onNavigateToAppointments,
  onMarkAllNotificationsAsRead,
  onMarkNotificationAsRead,
  readIds: externalReadIds
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'tasks' | 'supplies' | 'animals' | 'appointments'>('all');
  const [localReadIds, setLocalReadIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('feronia_keeper_read_notifs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const readIds = externalReadIds !== undefined ? externalReadIds : localReadIds;

  const effectiveToday = systemDate || new Date().toISOString().split('T')[0];

  const allNotifications = useMemo(() => {
    const list: KeeperNotificationItem[] = [];

    // 1. Pending and Overdue Tasks (excluding pure vet checkups unless treatment instructions given)
    const activeTasks = tasks.filter(t => {
      if (t.status === 'Completed') return false;
      if (t.animalId && t.animalId !== 'GENERAL' && !assignedAnimals.some(a => a.id === t.animalId)) return false;
      const isVetCheckup = t.type === 'Health Check' || 
                           t.assignedBy === 'Veterinarian' || 
                           t.title?.toLowerCase().includes('checkup') || 
                           t.title?.toLowerCase().includes('consultation') ||
                           t.title?.toLowerCase().includes('veterinary');
      const hasTreatmentInstruction = t.title?.toLowerCase().includes('administer') || 
                                      t.title?.toLowerCase().includes('treatment') || 
                                      t.details?.toLowerCase().includes('prescription') || 
                                      t.details?.toLowerCase().includes('treatment') || 
                                      t.details?.toLowerCase().includes('medication');
      if (isVetCheckup && !hasTreatmentInstruction) return false;
      return true;
    });
    activeTasks.forEach(task => {
      const computedStatus = getTaskComputedStatus(task, effectiveToday);
      const isOverdue = computedStatus === 'Overdue' || task.status === 'Overdue';

      list.push({
        id: `task-${task.id}`,
        category: 'tasks',
        title: isOverdue ? `⚠️ Overdue Task: ${task.title}` : `📋 Scheduled Task: ${task.title}`,
        subtitle: `Type: ${task.type} • Scheduled for ${task.time || 'Routine'}`,
        detail: task.details || 'Assigned keeper duty routine',
        dateStr: task.date || effectiveToday,
        timeStr: task.time,
        urgency: isOverdue ? 'critical' : task.type === 'Health Check' ? 'warning' : 'info',
        metadata: {
          taskId: task.id,
          targetMenu: 'tasks'
        }
      });
    });

    // 2. Inventory / Supplies Notifications from Admin
    inventoryNotifications.forEach(notif => {
      list.push({
        id: `inv-notif-${notif.id}`,
        category: 'supplies',
        title: `📦 ${notif.title}`,
        subtitle: `Item: ${notif.itemName} • By ${notif.updatedBy || 'Admin'}`,
        detail: notif.message,
        dateStr: notif.timestamp ? notif.timestamp.split('T')[0] : effectiveToday,
        urgency: notif.action === 'deleted' ? 'warning' : notif.newStatus === 'Low Stock' ? 'warning' : 'info',
        metadata: {
          inventoryId: notif.itemId,
          targetMenu: 'inventory'
        }
      });
    });

    // 3. Assigned Animal Alerts (Observations / Under Treatment)
    assignedAnimals.forEach(animal => {
      if (animal.healthStatus === 'Under Treatment' || animal.healthStatus === 'Under Observation' || animal.healthStatus === 'Injured' || (animal.healthStatus as string) === 'Sick') {
        list.push({
          id: `animal-health-${animal.id}`,
          category: 'animals',
          title: `🐾 Health Alert: ${animal.name || animal.id} (${animal.species})`,
          subtitle: `Status: ${animal.healthStatus} • Enclosure: ${animal.enclosureId || 'None'}`,
          detail: `Direct care assigned reptile requires close monitoring during morning/afternoon routines.`,
          dateStr: effectiveToday,
          urgency: animal.healthStatus === 'Under Treatment' ? 'critical' : 'warning',
          metadata: {
            animalId: animal.id,
            targetMenu: 'animals'
          }
        });
      }
    });

    // 4. Appointments & Observation Requests
    const myAnimalIds = new Set(assignedAnimals.map(a => a.id));
    const relatedAppointments = appointments.filter(apt => myAnimalIds.has(apt.animalId) || apt.requestedBy?.toLowerCase().includes('keeper'));

    relatedAppointments.forEach(apt => {
      const patient = assignedAnimals.find(a => a.id === apt.animalId);
      list.push({
        id: `apt-${apt.id}`,
        category: 'appointments',
        title: apt.status === 'Ongoing' || apt.status === 'Pending'
          ? `🩺 Vet Checkup Scheduled: ${apt.type}`
          : apt.status === 'Pending Approval'
          ? `⏳ Observation Request Pending Approval`
          : `📋 Appointment: ${apt.type} (${apt.status})`,
        subtitle: `${patient?.name || apt.animalId} (${patient?.species || 'Reptile'}) • ${apt.date} ${apt.time || ''}`,
        detail: apt.purpose || 'Veterinary care protocol',
        dateStr: apt.date || effectiveToday,
        urgency: apt.priority === 'Emergency' ? 'critical' : apt.status === 'Pending Approval' ? 'warning' : 'info',
        metadata: {
          appointmentId: apt.id,
          animalId: apt.animalId,
          targetMenu: 'health'
        }
      });
    });

    return list;
  }, [tasks, inventoryNotifications, assignedAnimals, appointments, effectiveToday]);

  const markAsRead = (id: string) => {
    if (onMarkNotificationAsRead) {
      onMarkNotificationAsRead(id);
    } else {
      setLocalReadIds(prev => {
        if (prev.includes(id)) return prev;
        const updated = [...prev, id];
        try {
          localStorage.setItem('feronia_keeper_read_notifs', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
    if (id.startsWith('inv-notif-')) {
      const realId = id.replace('inv-notif-', '');
      onMarkNotificationAsRead?.(realId);
    }
  };

  const markAllAsRead = () => {
    if (onMarkAllNotificationsAsRead) {
      onMarkAllNotificationsAsRead();
    } else {
      const allIds = allNotifications.map(n => n.id);
      setLocalReadIds(allIds);
      try {
        localStorage.setItem('feronia_keeper_read_notifs', JSON.stringify(allIds));
      } catch {}
    }
    onMarkAllNotificationsAsRead?.();
  };

  const filteredNotifications = useMemo(() => {
    const unreadList = allNotifications.filter(n => !readIds.includes(n.id));
    if (activeTab === 'all') return unreadList;
    return unreadList.filter(n => n.category === activeTab);
  }, [allNotifications, readIds, activeTab]);

  const unreadCount = useMemo(() => {
    return allNotifications.filter(n => !readIds.includes(n.id)).length;
  }, [allNotifications, readIds]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Dropdown Container */}
      <div className={`absolute right-0 top-12 w-84 sm:w-96 rounded-3xl border shadow-2xl z-50 overflow-hidden transition-all duration-200 animate-fade-in ${
        isDarkMode
          ? 'bg-[#06180F] border-emerald-950/80 text-white shadow-emerald-950/50'
          : 'bg-white border-slate-200 text-slate-800 shadow-2xl shadow-slate-200/60'
      }`}>
        {/* Header */}
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
                  <h4 className="text-xs font-black tracking-tight">Keeper Care & Task Alerts</h4>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-xs">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">Daily tasks, supplies updates & animal health</p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-1 mt-3 p-1 rounded-xl bg-emerald-950/40 dark:bg-[#030e07] border border-emerald-900/30 text-[11px] font-bold overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#113C24] text-emerald-200 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({allNotifications.length})
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-[#113C24] text-emerald-200 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tasks ({tasks.filter(t => t.status !== 'Completed').length})
            </button>
            <button
              onClick={() => setActiveTab('supplies')}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'supplies'
                  ? 'bg-[#113C24] text-emerald-200 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Supplies ({inventoryNotifications.length})
            </button>
            <button
              onClick={() => setActiveTab('animals')}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'animals'
                  ? 'bg-[#113C24] text-emerald-200 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Animals ({assignedAnimals.filter(a => a.healthStatus !== 'Healthy').length})
            </button>
          </div>
        </div>

        {/* List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-emerald-950/40">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-50" />
              <p className="font-bold text-slate-300">All caught up!</p>
              <p className="text-[11px] text-slate-500 mt-1">No pending tasks or updates in this category.</p>
            </div>
          ) : (
            filteredNotifications.map(item => {
              const isUnread = !readIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    markAsRead(item.id);
                    onClose();
                    if (item.category === 'tasks') {
                      onNavigateToTasks();
                    } else if (item.category === 'supplies') {
                      onNavigateToInventory();
                    } else if (item.category === 'animals' && item.metadata.animalId) {
                      const anim = assignedAnimals.find(a => a.id === item.metadata.animalId);
                      if (anim) onNavigateToAnimal(anim);
                    } else if (item.category === 'appointments') {
                      if (onNavigateToAppointments) {
                        onNavigateToAppointments();
                      } else {
                        onNavigateToTasks();
                      }
                    }
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
                    {item.category === 'tasks' ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : item.category === 'supplies' ? (
                      <Package className="w-4 h-4" />
                    ) : item.category === 'animals' ? (
                      <PawPrint className="w-4 h-4" />
                    ) : (
                      <Stethoscope className="w-4 h-4" />
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
                        📅 {item.dateStr}
                      </span>
                      <span className="text-emerald-400 font-bold flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
                        <span>
                          {item.category === 'tasks' ? 'Open Task Roster' : item.category === 'supplies' ? 'Open Supplies' : item.category === 'animals' ? 'View Animal' : 'View Protocol'}
                        </span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className={`p-3 border-t flex items-center justify-between text-xs ${
          isDarkMode ? 'bg-[#04120B] border-emerald-950' : 'bg-slate-50 border-slate-100'
        }`}>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">FERONIA KEEPER NOTIFIER</span>
          <button
            onClick={() => {
              onClose();
              onNavigateToTasks();
            }}
            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center space-x-1"
          >
            <span>View All Daily Tasks</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
};

export default KeeperNotificationDropdown;
