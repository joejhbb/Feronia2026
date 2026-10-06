import React, { useState, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  Stethoscope,
  Eye,
  AlertTriangle,
  Package,
  FileText,
  HeartHandshake,
  ChevronRight,
  Clock,
  Check,
  Calendar
} from 'lucide-react';
import { Animal, Appointment, InventoryItem, KeeperReport, TransferRecord, StaffMember, getAppointmentRequesterInfo, Task } from '../../types';

export interface AdminNotificationItem {
  id: string;
  category: 'approvals' | 'inventory' | 'health' | 'reports';
  title: string;
  subtitle: string;
  detail: string;
  dateStr: string;
  timeStr?: string;
  urgency: 'critical' | 'warning' | 'info';
  metadata: {
    appointmentId?: string;
    animalId?: string;
    inventoryId?: string;
    reportId?: string;
    transferId?: string;
    targetTab?: string;
    action?: string;
  };
}

interface AdminNotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: Appointment[];
  animals: Animal[];
  inventory: InventoryItem[];
  keeperReports?: KeeperReport[];
  transfers?: TransferRecord[];
  staffMembers?: StaffMember[];
  systemDate: string;
  isDarkMode: boolean;
  onNavigateToAnimal: (animal: Animal, initialTab: 'overview' | 'medical') => void;
  onNavigateToInventory: (searchItem?: string) => void;
  onNavigateToReports: (reportId?: string) => void;
  onNavigateToApprovals: () => void;
  readIds?: string[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  tasks?: Task[];
}

export const AdminNotificationDropdown: React.FC<AdminNotificationDropdownProps> = ({
  isOpen,
  onClose,
  appointments,
  animals,
  inventory,
  keeperReports = [],
  transfers = [],
  staffMembers = [],
  systemDate,
  isDarkMode,
  onNavigateToAnimal,
  onNavigateToInventory,
  onNavigateToReports,
  onNavigateToApprovals,
  readIds: externalReadIds,
  onMarkAsRead,
  onMarkAllAsRead,
  tasks = []
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'approvals' | 'inventory' | 'health' | 'reports'>('all');
  const [localReadIds, setLocalReadIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('feronia_admin_read_notifs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const readIds = externalReadIds !== undefined ? externalReadIds : localReadIds;

  const effectiveToday = systemDate || new Date().toISOString().split('T')[0];

  // Aggregate all admin notifications
  const allNotifications = useMemo(() => {
    const list: AdminNotificationItem[] = [];

    // 1. Pending Approvals & Requests (Vet & Keeper Requests)
    const pendingAppointments = appointments.filter(
      a => a.status === 'Pending Approval' || a.status === 'Pending'
    );

    pendingAppointments.forEach(apt => {
      const patient = animals.find(a => a.id === apt.animalId);
      const requester = getAppointmentRequesterInfo(apt, staffMembers);
      const isVet = requester.role === 'vet';
      const isEmergency = apt.priority === 'Emergency';

      list.push({
        id: `approval-apt-${apt.id}`,
        category: 'approvals',
        title: isVet ? `🩺 Vet Consult Request from ${requester.name}` : `👁️ Keeper Observation Request from ${requester.name}`,
        subtitle: `${patient?.name || apt.animalId} (${patient?.species || 'Reptile'}) • ${apt.type}`,
        detail: apt.purpose || (isVet ? 'Clinical examination requested' : 'Behavioral observation logged'),
        dateStr: apt.date || effectiveToday,
        timeStr: apt.time,
        urgency: isEmergency ? 'critical' : isVet ? 'warning' : 'info',
        metadata: {
          appointmentId: apt.id,
          animalId: patient?.id || apt.animalId,
          targetTab: 'medical',
          action: 'review_approval'
        }
      });
    });

    // 2. Pending Transfers
    const pendingTransfers = transfers.filter(t => t.status === 'Pending' || t.status === 'Ready for Approval');
    pendingTransfers.forEach(tr => {
      const targetAnimal = animals.find(a => a.id === tr.animalId);
      list.push({
        id: `approval-tr-${tr.id}`,
        category: 'approvals',
        title: `📄 Ownership Transfer Awaiting Approval`,
        subtitle: `${targetAnimal?.name || tr.animalId} → ${tr.newOwnerName}`,
        detail: `Ref: ${tr.referenceNo || tr.id} • Destination: ${tr.newOwnerAddress || tr.transferType}`,
        dateStr: tr.transferDate || effectiveToday,
        urgency: 'warning',
        metadata: {
          transferId: tr.id,
          animalId: tr.animalId,
          targetTab: 'overview',
          action: 'review_transfer'
        }
      });
    });

    // 3. Low Stock & Out of Stock Inventory Alerts
    const criticalInventory = inventory.filter(i => i.status === 'Out of Stock' || i.status === 'Low Stock' || i.currentStock <= 5);
    criticalInventory.forEach(item => {
      const isOut = item.status === 'Out of Stock' || item.currentStock === 0;
      list.push({
        id: `inventory-${item.id}`,
        category: 'inventory',
        title: isOut ? `🚨 Out of Stock: ${item.name}` : `⚠️ Low Stock Alert: ${item.name}`,
        subtitle: `Category: ${item.category} • Current Stock: ${item.currentStock} ${item.unit}`,
        detail: isOut
          ? `Stock depleted. Urgent replenishment required for daily operations.`
          : `Only ${item.currentStock} ${item.unit} remaining (Max: ${item.maxStock} ${item.unit}).`,
        dateStr: effectiveToday,
        urgency: isOut ? 'critical' : 'warning',
        metadata: {
          inventoryId: item.id,
          targetTab: 'inventory',
          action: 'restock'
        }
      });
    });

    // 4. Animal Health & Clinical Attention Alerts
    const attentionAnimals = animals.filter(
      a => !a.isArchived && (a.healthStatus === 'Under Treatment' || a.healthStatus === 'Under Observation' || a.healthStatus === 'Injured' || (a.healthStatus as string) === 'Sick')
    );
    attentionAnimals.forEach(animal => {
      const isTreatment = animal.healthStatus === 'Under Treatment';
      list.push({
        id: `health-${animal.id}`,
        category: 'health',
        title: `⚠️ Health Attention: ${animal.name || animal.id} (${animal.species})`,
        subtitle: `Status: ${animal.healthStatus} • Enclosure: ${animal.enclosureId || 'Unassigned'}`,
        detail: `Animal requires ongoing monitoring and administrative health log tracking.`,
        dateStr: effectiveToday,
        urgency: isTreatment ? 'critical' : 'warning',
        metadata: {
          animalId: animal.id,
          targetTab: 'medical',
          action: 'open_animal'
        }
      });
    });

    // 5. Recent Keeper Reports Submitted
    const sortedReports = [...keeperReports].sort((a, b) => (b.createdAt || b.reportDate || '').localeCompare(a.createdAt || a.reportDate || ''));
    sortedReports.slice(0, 5).forEach(rep => {
      list.push({
        id: `report-${rep.id}`,
        category: 'reports',
        title: `📝 New Keeper Report Submitted`,
        subtitle: `${rep.title} • By ${rep.keeperName}`,
        detail: rep.generalObservations || rep.veterinaryAlerts || `Submitted on ${rep.reportDate || effectiveToday}`,
        dateStr: rep.reportDate || effectiveToday,
        urgency: rep.veterinaryAlerts ? 'warning' : 'info',
        metadata: {
          reportId: rep.id,
          targetTab: 'reports',
          action: 'view_report'
        }
      });
    });

    // 6. Keeper-specific Daily Task Accomplished and Unaccomplished Alerts
    const activeKeeperTasks = tasks.filter(t => {
      if (t.title?.toLowerCase().includes('tiger') || t.details?.toLowerCase().includes('tiger')) return false;
      if (t.animalId && !animals.some(a => a.id === t.animalId)) return false;
      // Filter only tasks for the effective day (today)
      if (t.date && t.date !== effectiveToday) return false;
      return true;
    });

    // Extract all unique keepers from staff list and active tasks
    const keepersMap = new Map<string, string>();
    staffMembers.forEach(s => {
      if (s.role === 'keeper') {
        keepersMap.set(s.id, s.name);
      }
    });
    activeKeeperTasks.forEach(t => {
      if (t.assignedKeeperId && t.assignedKeeperName) {
        keepersMap.set(t.assignedKeeperId, t.assignedKeeperName);
      }
    });

    // Check tasks for each keeper
    keepersMap.forEach((keeperName, keeperId) => {
      const keeperTasks = activeKeeperTasks.filter(t => t.assignedKeeperId === keeperId);
      if (keeperTasks.length > 0) {
        const completedCount = keeperTasks.filter(t => t.status === 'Completed').length;
        const totalCount = keeperTasks.length;
        const allDone = completedCount === totalCount;

        if (allDone) {
          list.push({
            id: `keeper-all-completed-${keeperId}-${effectiveToday}`,
            category: 'reports',
            title: `✅ Keeper ${keeperName} Accomplished All Tasks Today!`,
            subtitle: `All ${totalCount} assigned tasks completed`,
            detail: `Keeper ${keeperName} has successfully completed all of today's assigned reptile care and feeding checklists.`,
            dateStr: effectiveToday,
            urgency: 'info',
            metadata: {
              targetTab: 'reports',
              action: 'view_keeper_tasks'
            }
          });
        } else {
          list.push({
            id: `keeper-unaccomplished-${keeperId}-${effectiveToday}`,
            category: 'reports',
            title: `⚠️ Keeper ${keeperName} Has Unaccomplished Tasks Today`,
            subtitle: `${completedCount} of ${totalCount} tasks completed`,
            detail: `Keeper ${keeperName} has ${totalCount - completedCount} remaining task(s) for today that are still pending or unaccomplished.`,
            dateStr: effectiveToday,
            urgency: 'warning',
            metadata: {
              targetTab: 'reports',
              action: 'view_keeper_tasks'
            }
          });
        }
      }
    });

    // Also handle unassigned daily pool tasks
    const unassignedTasks = activeKeeperTasks.filter(t => !t.assignedKeeperId);
    if (unassignedTasks.length > 0) {
      const completedCount = unassignedTasks.filter(t => t.status === 'Completed').length;
      const totalCount = unassignedTasks.length;
      const allDone = completedCount === totalCount;

      if (allDone) {
        list.push({
          id: `unassigned-completed-${effectiveToday}`,
          category: 'reports',
          title: `✅ All Unassigned Sanctuary Pool Tasks Accomplished!`,
          subtitle: `All ${totalCount} unassigned tasks completed`,
          detail: `All unassigned general facility tasks for today have been successfully accomplished.`,
          dateStr: effectiveToday,
          urgency: 'info',
          metadata: {
            targetTab: 'reports',
            action: 'view_keeper_tasks'
          }
        });
      } else {
        list.push({
          id: `unassigned-unaccomplished-${effectiveToday}`,
          category: 'reports',
          title: `⚠️ Unassigned Pool Tasks Remain Unaccomplished`,
          subtitle: `${completedCount} of ${totalCount} pool tasks completed`,
          detail: `There are ${totalCount - completedCount} unassigned general pool tasks for today that remain unaccomplished.`,
          dateStr: effectiveToday,
          urgency: 'warning',
          metadata: {
            targetTab: 'reports',
            action: 'view_keeper_tasks'
          }
        });
      }
    }

    return list;
  }, [appointments, animals, inventory, keeperReports, transfers, staffMembers, tasks, effectiveToday]);

  const markAsRead = (id: string) => {
    if (onMarkAsRead) {
      onMarkAsRead(id);
    } else {
      setLocalReadIds(prev => {
        if (prev.includes(id)) return prev;
        const updated = [...prev, id];
        try {
          localStorage.setItem('feronia_admin_read_notifs', JSON.stringify(updated));
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
        localStorage.setItem('feronia_admin_read_notifs', JSON.stringify(allIds));
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

  const approvalsCount = useMemo(() => {
    return allNotifications.filter(n => n.category === 'approvals').length;
  }, [allNotifications]);

  const inventoryCount = useMemo(() => {
    return allNotifications.filter(n => n.category === 'inventory').length;
  }, [allNotifications]);

  const healthCount = useMemo(() => {
    return allNotifications.filter(n => n.category === 'health').length;
  }, [allNotifications]);

  const reportsCount = useMemo(() => {
    return allNotifications.filter(n => n.category === 'reports').length;
  }, [allNotifications]);

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
                  <h4 className="text-xs font-black tracking-tight">System Alerts & Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-xs">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">Pending requests, inventory warnings & health alerts</p>
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
              onClick={() => setActiveTab('approvals')}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'approvals'
                  ? 'bg-[#113C24] text-emerald-200 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Requests ({approvalsCount})
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-[#113C24] text-emerald-200 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Supplies ({inventoryCount})
            </button>
            <button
              onClick={() => setActiveTab('health')}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'health'
                  ? 'bg-[#113C24] text-emerald-200 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Health ({healthCount})
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-[#113C24] text-emerald-200 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Reports ({reportsCount})
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-emerald-950/40">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-50" />
              <p className="font-bold text-slate-300">All caught up!</p>
              <p className="text-[11px] text-slate-500 mt-1">No alerts or pending items in this category.</p>
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
                    if (item.category === 'approvals') {
                      if (item.metadata.animalId) {
                        const targetAnim = animals.find(a => a.id === item.metadata.animalId);
                        if (targetAnim) {
                          onNavigateToAnimal(targetAnim, 'medical');
                          return;
                        }
                      }
                      onNavigateToApprovals();
                    } else if (item.category === 'inventory') {
                      onNavigateToInventory(item.metadata.inventoryId ? inventory.find(i => i.id === item.metadata.inventoryId)?.name : undefined);
                    } else if (item.category === 'health' && item.metadata.animalId) {
                      const targetAnim = animals.find(a => a.id === item.metadata.animalId);
                      if (targetAnim) {
                        onNavigateToAnimal(targetAnim, 'medical');
                      }
                    } else if (item.category === 'reports') {
                      onNavigateToReports(item.metadata.reportId);
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
                    {item.category === 'approvals' ? (
                      <Stethoscope className="w-4 h-4" />
                    ) : item.category === 'inventory' ? (
                      <Package className="w-4 h-4" />
                    ) : item.category === 'health' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
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
                          {item.category === 'approvals' ? 'Review & Authorize' : item.category === 'inventory' ? 'View Inventory' : item.category === 'health' ? 'View Animal' : 'Open Report'}
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

        {/* Dropdown Footer */}
        <div className={`p-3 border-t flex items-center justify-between text-xs ${
          isDarkMode ? 'bg-[#04120B] border-emerald-950' : 'bg-slate-50 border-slate-100'
        }`}>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">FERONIA ADMIN NOTIFIER</span>
          <button
            onClick={() => {
              onClose();
              onNavigateToApprovals();
            }}
            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center space-x-1"
          >
            <span>View All Authorizations</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
};

export default AdminNotificationDropdown;
