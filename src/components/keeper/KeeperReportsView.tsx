import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText, CheckCircle2, Clock, Package, AlertTriangle, Printer,
  Download, Plus, Trash2, Calendar, Search, Eye, Sparkles, Send,
  Shield, User, RefreshCw, X, ChevronRight, Check, Info,
  Layers, ArrowUpRight, BarChart3, AlertCircle, BookmarkCheck, ArrowLeft
} from 'lucide-react';
import { Animal, Enclosure, Task, InventoryItem, KeeperReport, KeeperLogEntry } from '../../types';
import { jsPDF } from 'jspdf';

interface KeeperReportsViewProps {
  animals: Animal[];
  enclosures: Enclosure[];
  tasks: Task[];
  inventory: InventoryItem[];
  isDarkMode: boolean;
  keeperName: string;
  keeperEmail?: string;
  systemDate?: string;
  onBackToDashboard?: () => void;
  onBack?: () => void;
}

const DEMO_ARCHIVED_REPORTS: KeeperReport[] = [];
const INITIAL_ARCHIVED_REPORTS: KeeperReport[] = [];

export default function KeeperReportsView({
  animals,
  enclosures,
  tasks,
  inventory,
  isDarkMode,
  keeperName,
  keeperEmail,
  systemDate,
  onBackToDashboard,
  onBack
}: KeeperReportsViewProps) {
  const handleBack = onBack || onBackToDashboard;
  const currentDateStr = systemDate || new Date().toISOString().split('T')[0];

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'inventory-report' | 'history'>('inventory-report');

  // Reports state from localStorage
  const [reportsHistory, setReportsHistory] = useState<KeeperReport[]>(() => {
    const isCleared = localStorage.getItem('feronia_keeper_reports_cleared_v1');
    if (isCleared === 'true') {
      return [];
    }
    try {
      const stored = localStorage.getItem('feronia_keeper_reports');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading keeper reports from storage', e);
    }
    return [];
  });

  // Ensure keeper reports are fully wiped and remain wiped
  useEffect(() => {
    const isCleared = localStorage.getItem('feronia_keeper_reports_cleared_v1');
    if (!isCleared) {
      setReportsHistory([]);
      localStorage.setItem('feronia_keeper_reports', JSON.stringify([]));
      localStorage.setItem('feronia_keeper_reports_cleared_v1', 'true');
    }
  }, []);

  const saveReportsToStorage = (updated: KeeperReport[]) => {
    setReportsHistory(updated);
    try {
      localStorage.setItem('feronia_keeper_reports', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving keeper reports', e);
    }
  };

  const handleDeleteAllReports = () => {
    saveReportsToStorage([]);
    localStorage.setItem('feronia_keeper_reports_cleared_v1', 'true');
    if (viewingReport) {
      setViewingReport(null);
    }
  };

  // --------------------------------------------------------------------------
  // TAB: INVENTORY & SUPPLIES REPORT BUILDER STATE
  // --------------------------------------------------------------------------
  const [invReportDate, setInvReportDate] = useState<string>(currentDateStr);
  const [invReportFocus, setInvReportFocus] = useState<'Supplies Consumption' | 'Low Stock & Restock Alert' | 'Discrepancy / Damaged Stock' | 'Full Supply Audit'>('Supplies Consumption');
  const [invReportTitle, setInvReportTitle] = useState<string>(`Inventory & Supplies Report - ${invReportDate}`);
  const [loggedInvItems, setLoggedInvItems] = useState<Array<{
    itemId: string;
    name: string;
    category: string;
    quantityUsed: number;
    unit: string;
    currentStock: number;
    status: string;
    notes?: string;
  }>>([]);
  const [urgentRequests, setUrgentRequests] = useState<Array<{
    name: string;
    unit: string;
    quantityRequested: number;
    priority: 'Normal' | 'Urgent' | 'Critical';
    reason: string;
  }>>([]);
  const [discrepancyText, setDiscrepancyText] = useState<string>('');
  const [invGeneralNotes, setInvGeneralNotes] = useState<string>('');
  const [newItemSelectorId, setNewItemSelectorId] = useState<string>('');
  const [isInvSuccessModal, setIsInvSuccessModal] = useState(false);

  // Auto-populate inventory report from current inventory state & tasks
  const handleAutoPopulateInventoryReport = () => {
    // 1. Find items that have usedToday > 0, or are Low Stock
    const autoItems: typeof loggedInvItems = [];
    inventory.forEach(inv => {
      const qtyUsed = inv.usedToday > 0 ? inv.usedToday : (inv.status === 'Low Stock' || inv.status === 'Out of Stock' ? 1 : 0);
      if (qtyUsed > 0 || inv.status === 'Low Stock' || inv.status === 'Out of Stock') {
        autoItems.push({
          itemId: inv.id,
          name: inv.name,
          category: inv.category,
          quantityUsed: inv.usedToday || 1,
          unit: inv.unit,
          currentStock: inv.currentStock,
          status: inv.status,
          notes: inv.status === 'Low Stock' 
            ? 'Stock level running low; re-order suggested.' 
            : `Routine keeper consumption for scheduled tasks.`
        });
      }
    });

    // If none found with usedToday, pick first few inventory items as representative sample
    if (autoItems.length === 0 && inventory.length > 0) {
      inventory.slice(0, 3).forEach(inv => {
        autoItems.push({
          itemId: inv.id,
          name: inv.name,
          category: inv.category,
          quantityUsed: 1,
          unit: inv.unit,
          currentStock: inv.currentStock,
          status: inv.status,
          notes: `Routine keeper consumption for scheduled tasks.`
        });
      });
    }

    setLoggedInvItems(autoItems);

    // Auto-detect Low Stock or Out of Stock for restock suggestions
    const lowItems = inventory.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock' || i.currentStock <= 5);
    const requests: typeof urgentRequests = lowItems.map(item => ({
      name: item.name,
      unit: item.unit,
      quantityRequested: item.unit.toLowerCase().includes('pack') ? 10 : (item.unit.toLowerCase().includes('bottle') ? 5 : 20),
      priority: item.status === 'Out of Stock' ? 'Critical' : 'Urgent',
      reason: `Current stock is ${item.currentStock} ${item.unit}. Minimum operational threshold reached.`
    }));
    setUrgentRequests(requests);

    setDiscrepancyText('All storage lockers, feed refrigerators, and pharmaceutical cabinets inspected. Chemical bottles sealed and labeled.');
    setInvGeneralNotes(`Inventory audit completed for ${invReportDate}. ${autoItems.length} items logged for consumption; ${requests.length} replenishment requests queued for Sanctuary Admin.`);
    setInvReportTitle(`Inventory & Supplies Report - ${invReportDate}`);
  };

  // Add an item to logged inventory list
  const handleAddItemToInvReport = (itemId: string) => {
    if (!itemId) return;
    const found = inventory.find(i => i.id === itemId);
    if (!found) return;

    if (loggedInvItems.some(i => i.itemId === itemId)) {
      return; // Already in list
    }

    setLoggedInvItems(prev => [
      ...prev,
      {
        itemId: found.id,
        name: found.name,
        category: found.category,
        quantityUsed: 1,
        unit: found.unit,
        currentStock: found.currentStock,
        status: found.status,
        notes: 'Deducted for habitat care'
      }
    ]);
    setNewItemSelectorId('');
  };

  const handleRemoveItemFromInvReport = (itemId: string) => {
    setLoggedInvItems(prev => prev.filter(i => i.itemId !== itemId));
  };

  const handleUpdateItemQty = (itemId: string, qty: number) => {
    setLoggedInvItems(prev => prev.map(i => i.itemId === itemId ? { ...i, quantityUsed: Math.max(1, qty) } : i));
  };

  const handleAddRestockRequest = () => {
    setUrgentRequests(prev => [
      ...prev,
      {
        name: '',
        unit: 'units',
        quantityRequested: 10,
        priority: 'Urgent',
        reason: 'Restock requested by animal keeper'
      }
    ]);
  };

  const handleRemoveRestockRequest = (index: number) => {
    setUrgentRequests(prev => prev.filter((_, idx) => idx !== index));
  };

  // Submit Inventory Report
  const handleSubmitInventoryReport = () => {
    const newReport: KeeperReport = {
      id: `REP-INV-${invReportDate.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`,
      type: 'inventory_usage',
      title: invReportTitle.trim() || `Inventory & Supplies Report - ${invReportDate}`,
      reportDate: invReportDate,
      shift: 'Full Day',
      keeperName: keeperName || 'Animal Keeper',
      keeperEmail: keeperEmail || 'keeper@feroniasanctuary.org',
      createdAt: new Date().toISOString(),
      status: 'Submitted',
      inventoryFocus: invReportFocus,
      inventoryItemsLogged: loggedInvItems,
      urgentRestockNeeded: urgentRequests.filter(r => r.name.trim() !== ''),
      discrepancyNotes: discrepancyText.trim() || 'No discrepancies or packaging damages noted.',
      notes: invGeneralNotes.trim() || 'Supplies and consumables logged for sanctuary maintenance.'
    };

    saveReportsToStorage([newReport, ...reportsHistory]);
    setIsInvSuccessModal(true);
  };

  // --------------------------------------------------------------------------
  // TAB 3: REPORT ARCHIVE & PREVIEW MODAL STATE
  // --------------------------------------------------------------------------
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'daily_task_accomplishment' | 'inventory_usage'>('all');
  const [viewingReport, setViewingReport] = useState<KeeperReport | null>(null);

  const filteredHistory = useMemo(() => {
    return reportsHistory.filter(rep => {
      if (historyTypeFilter !== 'all' && rep.type !== historyTypeFilter) return false;
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchTitle = rep.title.toLowerCase().includes(q);
        const matchId = rep.id.toLowerCase().includes(q);
        const matchDate = rep.reportDate.includes(q);
        const matchKeeper = rep.keeperName.toLowerCase().includes(q);
        if (!matchTitle && !matchId && !matchDate && !matchKeeper) return false;
      }
      return true;
    });
  }, [reportsHistory, historyTypeFilter, historySearch]);

  const handleDeleteReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this archived report?')) {
      const updated = reportsHistory.filter(r => r.id !== id);
      saveReportsToStorage(updated);
      if (viewingReport?.id === id) {
        setViewingReport(null);
      }
    }
  };

  const handlePrintReport = (report: KeeperReport) => {
    const doc = new jsPDF();

    // Set professional dark green/slate themes for branding (Matching Feronia's visual guidelines)
    const primaryColor = [4, 17, 10]; // #04110A (Feronia dark green)
    const secondaryColor = [16, 185, 129]; // #10B981 (Emerald)
    const textColor = [51, 65, 85]; // Slate-700
    const lightBg = [248, 250, 252]; // Slate-50

    // Header Band
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 38, 'F');

    // Secondary Accent Line
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(0, 38, 210, 2, 'F');

    // Title & Logo Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('FERONIA WILDLIFE SANCTUARY', 14, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('ANIMAL KEEPER STATIONS • OFFICIAL REPORT ARCHIVE', 14, 22);
    doc.text(`Report ID: ${report.id.toUpperCase()}`, 14, 29);

    // Date Generated (Right aligned)
    doc.setFontSize(9);
    doc.text(`Report Date: ${report.reportDate}`, 196, 22, { align: 'right' });
    doc.text(`Generated: ${new Date().toISOString().split('T')[0]}`, 196, 29, { align: 'right' });

    // Section 1: Report Meta
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('I. DOCUMENT METADATA', 14, 52);

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 56, 182, 34, 3, 3, 'FD');

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Title:', 20, 64);
    doc.setFont('helvetica', 'normal');
    doc.text(`${report.title}`, 55, 64);

    doc.setFont('helvetica', 'bold');
    doc.text('Report Type:', 20, 71);
    doc.setFont('helvetica', 'normal');
    doc.text(`${report.type === 'daily_task_accomplishment' ? 'Daily Task & Accomplishment Report' : 'Inventory & Supplies Consumption Report'}`, 55, 71);

    doc.setFont('helvetica', 'bold');
    doc.text('Compiled By:', 20, 78);
    doc.setFont('helvetica', 'normal');
    doc.text(`${report.keeperName} (${report.keeperEmail || 'Steward Staff'})`, 55, 78);

    doc.setFont('helvetica', 'bold');
    doc.text('Status:', 20, 85);
    doc.setFont('helvetica', 'normal');
    doc.text(`${report.status}`, 55, 85);

    let currentY = 104;

    if (report.type === 'daily_task_accomplishment') {
      // Daily Task Accomplishment details
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('II. OPERATIONAL TASK METRICS', 14, currentY);
      currentY += 5;

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(14, currentY, 182, 20, 3, 3, 'FD');

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Total Tasks:', 20, currentY + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(`${report.taskMetrics?.total || 0}`, 50, currentY + 8);

      doc.setFont('helvetica', 'bold');
      doc.text('Completed:', 75, currentY + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(`${report.taskMetrics?.completed || 0}`, 105, currentY + 8);

      doc.setFont('helvetica', 'bold');
      doc.text('Pending / Overdue:', 130, currentY + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(`${(report.taskMetrics?.pending || 0) + (report.taskMetrics?.overdue || 0)}`, 170, currentY + 8);

      doc.setFont('helvetica', 'bold');
      doc.text('Completion Rate:', 20, currentY + 15);
      doc.setFont('helvetica', 'normal');
      doc.text(`${report.taskMetrics?.completionRate || 0}%`, 50, currentY + 15);

      currentY += 28;

      if (report.tasksIncluded && report.tasksIncluded.length > 0) {
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('III. INDIVIDUAL TASK ENTRIES', 14, currentY);
        currentY += 5;

        report.tasksIncluded.slice(0, 10).forEach((t, i) => {
          if (currentY > 265) {
            doc.addPage();
            currentY = 20;
          }
          doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
          doc.roundedRect(14, currentY, 182, 14, 2, 2, 'FD');
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.text(`${i + 1}. ${t.title}`, 18, currentY + 6);
          doc.setFont('helvetica', 'normal');
          doc.text(`Status: ${t.status}  |  Type: ${t.type} ${t.animalName ? ` |  Animal: ${t.animalName}` : ''}`, 18, currentY + 11);
          currentY += 17;
        });
      }

      // Add observations/alerts
      if (report.generalObservations || report.veterinaryAlerts || report.handoverNotes) {
        if (currentY > 220) {
          doc.addPage();
          currentY = 20;
        }

        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('IV. OBSERVATIONS & CLINICAL NOTES', 14, currentY);
        currentY += 5;

        if (report.generalObservations) {
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.text('General Observations:', 14, currentY + 5);
          doc.setFont('helvetica', 'normal');
          doc.text(doc.splitTextToSize(report.generalObservations, 180), 14, currentY + 10);
          currentY += 22;
        }

        if (report.veterinaryAlerts) {
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(185, 28, 28); // Dark Red
          doc.text('ALERT: Veterinary Clinical Alerts / Medical Flags:', 14, currentY + 5);
          doc.setFont('helvetica', 'normal');
          doc.text(doc.splitTextToSize(report.veterinaryAlerts, 180), 14, currentY + 10);
          currentY += 22;
        }

        if (report.handoverNotes) {
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.text('Shift Handover & Operations Notes:', 14, currentY + 5);
          doc.setFont('helvetica', 'normal');
          doc.text(doc.splitTextToSize(report.handoverNotes, 180), 14, currentY + 10);
          currentY += 22;
        }
      }
    } else {
      // Inventory Report Details
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('II. SUPPLY AUDIT FOCUS', 14, currentY);
      currentY += 5;

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.roundedRect(14, currentY, 182, 14, 3, 3, 'FD');

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Audit Category:', 20, currentY + 9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${report.inventoryFocus || 'Full Supply Audit'}`, 55, currentY + 9);

      currentY += 22;

      if (report.inventoryItemsLogged && report.inventoryItemsLogged.length > 0) {
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('III. SUPPLIES LOGGED & CONSUMPTION', 14, currentY);
        currentY += 5;

        report.inventoryItemsLogged.slice(0, 10).forEach((item, i) => {
          if (currentY > 265) {
            doc.addPage();
            currentY = 20;
          }
          doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
          doc.roundedRect(14, currentY, 182, 14, 2, 2, 'FD');
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.text(`${i + 1}. Item: ${item.name} (${item.category})`, 18, currentY + 6);
          doc.setFont('helvetica', 'normal');
          doc.text(`Quantity Consumed: ${item.quantityUsed} ${item.unit}  |  Current Available Stock: ${item.currentStock} ${item.unit} (${item.status})`, 18, currentY + 11);
          currentY += 17;
        });
      }

      if (report.urgentRestockNeeded && report.urgentRestockNeeded.length > 0) {
        if (currentY > 230) {
          doc.addPage();
          currentY = 20;
        }
        doc.setTextColor(185, 28, 28); // Dark Red
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('IV. URGENT RESTOCK & REQUISITION REQUESTS', 14, currentY);
        currentY += 5;

        report.urgentRestockNeeded.forEach((req, i) => {
          if (currentY > 265) {
            doc.addPage();
            currentY = 20;
          }
          doc.setFillColor(254, 242, 242); // Very light red
          doc.roundedRect(14, currentY, 182, 14, 2, 2, 'FD');
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.text(`RESTOCK: ${req.name} (Priority: ${req.priority})`, 18, currentY + 6);
          doc.setFont('helvetica', 'normal');
          doc.text(`Requested Qty: ${req.quantityRequested} ${req.unit}  |  Justification: ${req.reason}`, 18, currentY + 11);
          currentY += 17;
        });
      }
    }

    // Standard Document Footer
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 262, 196, 262);
    doc.setTextColor(115, 115, 115);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('CONFIDENTIALITY NOTICE: This record contains official operations metrics from Feronia Wildlife Sanctuary and is intended solely for administrative oversight.', 14, 270);
    doc.text('Feronia Sanctuary Stewardship Department • End of Official Document', 105, 276, { align: 'center' });

    doc.save(`Keeper-Report-${report.id}.pdf`);
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(prev => (prev === msg ? null : prev)), 4000);
  };

  const handlePrint = (report?: KeeperReport | unknown) => {
    // Check if the argument is a genuine report object rather than a React Event
    const isReportObj = report && typeof report === 'object' && 'id' in report && !('nativeEvent' in report);
    
    let target: KeeperReport | null = null;
    
    if (isReportObj) {
      target = report as KeeperReport;
    } else if (viewingReport) {
      target = viewingReport;
    } else if (activeTab === 'inventory-report') {
      // Compile a comprehensive draft report from current form states
      target = {
        id: `DRAFT-INV-${Date.now().toString().slice(-6)}`,
        type: 'inventory_usage',
        title: invReportTitle || `Draft Inventory & Supplies Report - ${invReportDate}`,
        reportDate: invReportDate,
        keeperName: keeperName || 'Keeper Staff',
        keeperEmail: keeperEmail || 'keeper@feroniasanctuary.org',
        createdAt: new Date().toISOString(),
        status: 'Draft',
        inventoryFocus: invReportFocus,
        inventoryItemsLogged: loggedInvItems.length > 0 ? loggedInvItems : [
          {
            itemId: 'dummy',
            name: 'No items logged yet',
            category: 'N/A',
            quantityUsed: 0,
            unit: 'units',
            currentStock: 0,
            status: 'N/A',
            notes: 'Add items in the report builder below to log routine supply consumption.'
          }
        ],
        urgentRestockNeeded: urgentRequests,
        discrepancyNotes: discrepancyText || 'No stock discrepancies observed during regular round inspections.',
        notes: invGeneralNotes || 'Routine inventory log compiled by active shift keeper.'
      };
    } else if (reportsHistory && reportsHistory.length > 0) {
      target = reportsHistory[0];
    }

    if (target) {
      handlePrintReport(target);
      showToast(`✓ Official PDF Report (${target.id}) generated and saved successfully!`);
    } else {
      showToast('⚠️ No reports available to export. Please select a report or add logged items first.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Sanctuary Documentation & Records
              </span>
              <span className="text-xs text-slate-400">• Keeper Station</span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-black mt-1 flex items-center space-x-2.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                <FileText className="w-4 h-4" />
              </div>
              <span>Reports</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Compile, document, and submit official Inventory and Supply reports to Sanctuary Administration.
            </p>
          </div>
        </div>

        {/* Quick Action Button Bar */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#072414] hover:bg-slate-200 dark:hover:bg-emerald-900/50 text-slate-700 dark:text-emerald-300 font-bold text-xs flex items-center space-x-1.5 border border-slate-200 dark:border-emerald-900/60 transition-all cursor-pointer"
            title="Export Current Report View"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* TOP REPORT CARDS (2 Cards: Inventory & Supplies Builder, Reports Archive) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Card 1: Inventory & Supplies Report Builder */}
        <button
          type="button"
          onClick={() => setActiveTab('inventory-report')}
          className={`p-4 rounded-2xl border transition-all text-left group cursor-pointer ${
            activeTab === 'inventory-report'
              ? isDarkMode
                ? 'bg-[#062417] border-emerald-500 shadow-lg ring-1 ring-emerald-500/40 text-white'
                : 'bg-emerald-50/90 border-emerald-500 shadow-md ring-2 ring-emerald-500/30 text-emerald-950'
              : isDarkMode 
              ? 'bg-[#04150C] border-emerald-950/80 hover:border-emerald-500/50 shadow-sm hover:bg-emerald-950/20' 
              : 'bg-white border-slate-200 hover:border-emerald-500 shadow-2xs hover:shadow-md'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                activeTab === 'inventory-report'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                  : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              }`}>
                <Package className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider block truncate ${
                  activeTab === 'inventory-report' 
                    ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-800') 
                    : (isDarkMode ? 'text-slate-400' : 'text-slate-600')
                }`}>
                  Keeper Report Builder
                </span>
                <div className={`text-xl font-black mt-0.5 ${
                  activeTab === 'inventory-report'
                    ? (isDarkMode ? 'text-white' : 'text-emerald-950')
                    : (isDarkMode ? 'text-white' : 'text-slate-900')
                }`}>
                  Supplies & Stocks
                </div>
              </div>
            </div>
            {inventory.some(i => i.status === 'Low Stock' || i.status === 'Out of Stock') && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 flex items-center space-x-1 shrink-0">
                <AlertTriangle className="w-3 h-3 text-amber-500 dark:text-amber-400 animate-pulse" />
                <span>Low Stock</span>
              </span>
            )}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-emerald-950/80 flex items-center justify-between text-xs font-semibold">
            <span className={
              activeTab === 'inventory-report'
                ? (isDarkMode ? 'text-emerald-200/90' : 'text-emerald-800')
                : (isDarkMode ? 'text-slate-400' : 'text-slate-600')
            }>
              Deductions, Feedings & Restocks
            </span>
            <span className={`font-black group-hover:translate-x-0.5 transition-transform ${
              activeTab === 'inventory-report'
                ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-700')
                : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {activeTab === 'inventory-report' ? 'Active Builder ●' : 'Open Builder →'}
            </span>
          </div>
        </button>

        {/* Card 2: Reports Archive */}
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`p-4 rounded-2xl border transition-all text-left group cursor-pointer ${
            activeTab === 'history'
              ? isDarkMode
                ? 'bg-[#05231c] border-teal-500 shadow-lg ring-1 ring-teal-500/40 text-white'
                : 'bg-teal-50/90 border-teal-500 shadow-md ring-2 ring-teal-500/30 text-teal-950'
              : isDarkMode 
              ? 'bg-[#04150C] border-emerald-950/80 hover:border-teal-500/50 shadow-sm hover:bg-emerald-950/20' 
              : 'bg-white border-slate-200 hover:border-teal-500 shadow-2xs hover:shadow-md'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                activeTab === 'history'
                  ? 'bg-teal-600 text-white border-teal-400 shadow-sm'
                  : 'bg-teal-500/20 border-teal-500/30 text-teal-600 dark:text-teal-400'
              }`}>
                <BookmarkCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider block truncate ${
                  activeTab === 'history' 
                    ? (isDarkMode ? 'text-teal-300' : 'text-teal-800') 
                    : (isDarkMode ? 'text-slate-400' : 'text-slate-600')
                }`}>
                  Reports Archive
                </span>
                <div className={`text-2xl font-black mt-0.5 ${
                  activeTab === 'history'
                    ? (isDarkMode ? 'text-white' : 'text-teal-950')
                    : (isDarkMode ? 'text-white' : 'text-slate-900')
                }`}>
                  {reportsHistory.length}
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-500/40 shrink-0">
              Saved Logs
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-emerald-950/80 flex items-center justify-between text-xs font-semibold">
            <span className={
              activeTab === 'history'
                ? (isDarkMode ? 'text-teal-200/90' : 'text-teal-800')
                : (isDarkMode ? 'text-slate-400' : 'text-slate-600')
            }>
              Historical Care & Operational Audits
            </span>
            <span className={`font-black group-hover:translate-x-0.5 transition-transform ${
              activeTab === 'history'
                ? (isDarkMode ? 'text-teal-300' : 'text-teal-700')
                : 'text-teal-600 dark:text-teal-400'
            }`}>
              {activeTab === 'history' ? 'Active Archive ●' : 'Open Archive →'}
            </span>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB: INVENTORY & SUPPLIES REPORT BUILDER */}
      {/* ========================================================================= */}
      {activeTab === 'inventory-report' && (
        <div className="space-y-6">
          {/* Card: Configuration & Auto-Compile */}
          <div className={`p-5 rounded-3xl border ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950/70' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-emerald-950/40 pb-4 mb-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Inventory & Supplies Report</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Report supplies used during feeding and cleaning rounds, flag low stock items, and submit restock requests to Admin.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAutoPopulateInventoryReport}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Compile Stock Deductions</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Report Date
                </label>
                <input
                  type="date"
                  value={invReportDate}
                  onChange={(e) => setInvReportDate(e.target.value)}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-medium ${
                    isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Report Focus
                </label>
                <select
                  value={invReportFocus}
                  onChange={(e) => setInvReportFocus(e.target.value as any)}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-medium ${
                    isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="Supplies Consumption">Supplies Consumption & Feeding Log</option>
                  <option value="Low Stock & Restock Alert">Low Stock & Restock Alert to Admin</option>
                  <option value="Discrepancy / Damaged Stock">Discrepancy / Damaged Stock Notice</option>
                  <option value="Full Supply Audit">Full Supply Audit Check</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Reporting Keeper
                </label>
                <div className="flex items-center space-x-2 px-3 py-2 rounded-xl border bg-slate-50 dark:bg-[#04140D] border-slate-200 dark:border-emerald-950">
                  <User className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                    {keeperName || 'Marko (Keeper)'}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Report Title
                </label>
                <input
                  type="text"
                  value={invReportTitle}
                  onChange={(e) => setInvReportTitle(e.target.value)}
                  placeholder="Report Title..."
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-medium ${
                    isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Card: Supplies Consumed Table */}
          <div className={`p-5 rounded-3xl border ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950/70' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Supplies & Feed Consumed</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    {loggedInvItems.length} Items Logged
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Record exact quantities of rodents, supplements, disinfection solutions, or bedding used today.
                </p>
              </div>

              {/* Add item dropdown */}
              <div className="flex items-center space-x-2">
                <select
                  value={newItemSelectorId}
                  onChange={(e) => setNewItemSelectorId(e.target.value)}
                  className={`py-1.5 px-2.5 rounded-xl border text-xs ${
                    isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <option value="">-- Add an inventory item --</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.category} • {item.currentStock} {item.unit} left)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleAddItemToInvReport(newItemSelectorId)}
                  disabled={!newItemSelectorId}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {loggedInvItems.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-2xl border-slate-200 dark:border-emerald-950">
                <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No inventory usage logged yet</p>
                <p className="text-xs text-slate-400 mt-1">Select an item from the dropdown or click "Auto-Compile Stock Deductions" above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-emerald-950 text-slate-400 uppercase tracking-wider text-xs">
                    <tr>
                      <th className="py-2.5 px-3">Item Name & Category</th>
                      <th className="py-2.5 px-3">Qty Used Today</th>
                      <th className="py-2.5 px-3">Current Remaining</th>
                      <th className="py-2.5 px-3">Stock Status</th>
                      <th className="py-2.5 px-3">Usage Purpose / Notes</th>
                      <th className="py-2.5 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-emerald-950/60">
                    {loggedInvItems.map((item) => (
                      <tr key={item.itemId} className="hover:bg-slate-50/50 dark:hover:bg-emerald-950/20">
                        <td className="py-3 px-3">
                          <strong className="text-slate-900 dark:text-white block">{item.name}</strong>
                          <span className="text-slate-400 font-mono text-xs">{item.category} • ID: {item.itemId}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="number"
                              min={1}
                              value={item.quantityUsed}
                              onChange={(e) => handleUpdateItemQty(item.itemId, parseInt(e.target.value) || 1)}
                              className={`w-16 py-1 px-2 rounded-lg border text-xs font-bold text-center ${
                                isDarkMode ? 'bg-[#04140D] border-emerald-900 text-white' : 'bg-white border-slate-200'
                              }`}
                            />
                            <span className="text-slate-500 font-medium">{item.unit}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {item.currentStock} {item.unit}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            item.status === 'Good'
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : item.status === 'Low Stock'
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                              : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={item.notes || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLoggedInvItems(prev => prev.map(i => i.itemId === item.itemId ? { ...i, notes: val } : i));
                            }}
                            placeholder="Reason for usage..."
                            className={`w-full py-1 px-2 rounded-lg border text-xs ${
                              isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white' : 'bg-white border-slate-200'
                            }`}
                          />
                        </td>
                        <td className="py-3 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromInvReport(item.itemId)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card: Urgent Restock Needed to Admin */}
          <div className={`p-5 rounded-3xl border ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950/70' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-extrabold text-sm text-amber-500 dark:text-amber-400 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Priority Restock Requests for Admin</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Items running critically low that need procurement from suppliers before the next scheduled feed.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddRestockRequest}
                className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Request</span>
              </button>
            </div>

            {urgentRequests.length === 0 ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>No urgent restock requests flagged at this time. All consumable supplies are within safe thresholds.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {urgentRequests.map((req, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isDarkMode ? 'bg-[#04140D] border-amber-900/40' : 'bg-amber-50/40 border-amber-200'
                    }`}
                  >
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2.5 w-full">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold uppercase text-slate-400 block mb-0.5">Item Name</label>
                        <input
                          type="text"
                          value={req.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setUrgentRequests(prev => prev.map((r, i) => i === idx ? { ...r, name: val } : r));
                          }}
                          placeholder="e.g. Frozen Adult Mice (Pack of 10)"
                          className={`w-full py-1.5 px-2 rounded-lg border text-xs font-bold ${
                            isDarkMode ? 'bg-[#071F11] border-emerald-950 text-white' : 'bg-white border-slate-200'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase text-slate-400 block mb-0.5">Qty Requested</label>
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min={1}
                            value={req.quantityRequested}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setUrgentRequests(prev => prev.map((r, i) => i === idx ? { ...r, quantityRequested: val } : r));
                            }}
                            className={`w-16 py-1.5 px-2 rounded-lg border text-xs font-bold text-center ${
                              isDarkMode ? 'bg-[#071F11] border-emerald-950 text-white' : 'bg-white border-slate-200'
                            }`}
                          />
                          <input
                            type="text"
                            value={req.unit}
                            onChange={(e) => {
                              const val = e.target.value;
                              setUrgentRequests(prev => prev.map((r, i) => i === idx ? { ...r, unit: val } : r));
                            }}
                            placeholder="packs/bottles"
                            className={`flex-1 py-1.5 px-2 rounded-lg border text-xs ${
                              isDarkMode ? 'bg-[#071F11] border-emerald-950 text-white' : 'bg-white border-slate-200'
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase text-slate-400 block mb-0.5">Urgency</label>
                        <select
                          value={req.priority}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setUrgentRequests(prev => prev.map((r, i) => i === idx ? { ...r, priority: val } : r));
                          }}
                          className={`w-full py-1.5 px-2 rounded-lg border text-xs font-bold ${
                            req.priority === 'Critical'
                              ? 'text-rose-500 bg-rose-500/10 border-rose-500/30'
                              : 'text-amber-500 bg-amber-500/10 border-amber-500/30'
                          }`}
                        >
                          <option value="Normal">Normal Priority</option>
                          <option value="Urgent">Urgent (Within 48h)</option>
                          <option value="Critical">Critical (Immediate Need)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRestockRequest(idx)}
                      className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer self-end sm:self-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Action Bar */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-emerald-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>Transmitted directly to Sanctuary Admin procurement dashboard</span>
              </div>

              <button
                type="button"
                onClick={handleSubmitInventoryReport}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit Inventory Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REPORTS HISTORY & ARCHIVE */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950/70' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center space-x-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search report title, ID, date, or keeper..."
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs ${
                    isDarkMode ? 'bg-[#04140D] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center space-x-1.5 self-start sm:self-auto">
              <button
                onClick={() => setHistoryTypeFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyTypeFilter === 'all'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-emerald-950 text-slate-600 dark:text-emerald-400'
                }`}
              >
                All Reports ({reportsHistory.length})
              </button>
              <button
                onClick={() => setHistoryTypeFilter('inventory_usage')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyTypeFilter === 'inventory_usage'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-emerald-950 text-slate-600 dark:text-emerald-400'
                }`}
              >
                Inventory Reports
              </button>
            </div>
          </div>

          {/* List of Archived Reports */}
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-3xl border-slate-200 dark:border-emerald-950">
              <BookmarkCheck className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">No archived reports found</h3>
              <p className="text-xs text-slate-400 mt-1">Generate and submit your first report using the builders above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHistory.map((report) => {
                const isTask = report.type === 'daily_task_accomplishment';

                return (
                  <div
                    key={report.id}
                    onClick={() => setViewingReport(report)}
                    className={`p-5 rounded-3xl border transition-all hover:scale-[1.01] cursor-pointer flex flex-col justify-between ${
                      isDarkMode 
                        ? 'bg-[#06180F] hover:bg-[#082014] border-emerald-950/70 hover:border-emerald-800' 
                        : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-emerald-300 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center space-x-1 ${
                            isTask
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                          }`}>
                            {isTask ? <CheckCircle2 className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                            <span>{isTask ? 'Task Accomplishment' : 'Inventory Report'}</span>
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {report.id}
                          </span>
                        </div>

                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          {report.status}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-2.5 line-clamp-1">
                        {report.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-emerald-500" />
                          <span>Date: <strong className="text-slate-700 dark:text-slate-300">{report.reportDate}</strong></span>
                        </span>
                        {report.shift && (
                          <span>• Shift: <strong className="text-slate-700 dark:text-slate-300">{report.shift}</strong></span>
                        )}
                        <span>• By: <strong className="text-slate-700 dark:text-slate-300">{report.keeperName}</strong></span>
                      </div>

                      {/* Brief details */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                        {isTask 
                          ? (report.generalObservations || 'Task accomplishment records.') 
                          : (report.notes || report.discrepancyNotes || 'Consumables and supply deductions logged.')}
                      </p>

                      {/* Quick Badges */}
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-emerald-950/40 flex flex-wrap items-center gap-2">
                        {isTask && report.taskMetrics && (
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                            ✓ {report.taskMetrics.completed} / {report.taskMetrics.total} Tasks Accomplished ({report.taskMetrics.completionRate}%)
                          </span>
                        )}
                        {!isTask && report.inventoryItemsLogged && (
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                            📦 {report.inventoryItemsLogged.length} Consumables Logged
                          </span>
                        )}
                        {!isTask && report.urgentRestockNeeded && report.urgentRestockNeeded.length > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/20 text-amber-500 dark:text-amber-300 border border-amber-500/40">
                            ⚠️ {report.urgentRestockNeeded.length} Restock Requests
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom row actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-emerald-950/40 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteReport(report.id, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                          title="Delete from archive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewingReport(report)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all shadow-xs"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Full</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FULL REPORT VIEW / PRINT MODAL */}
      {/* ========================================================================= */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className={`rounded-3xl max-w-2xl w-full border shadow-2xl overflow-hidden flex flex-col my-8 ${
            isDarkMode ? 'bg-[#061A10] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-emerald-950 flex items-center justify-between bg-slate-50 dark:bg-[#04140D]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">{viewingReport.title}</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Official Sanctuary Record • {viewingReport.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Export Report</span>
                </button>
                <button
                  onClick={() => setViewingReport(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-emerald-950 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* Document Letterhead */}
              <div className="border-b border-slate-200 dark:border-emerald-950 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    FERONIA WILDLIFE SANCTUARY
                  </h2>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">
                    Animal Keeper Operations & Stewardship Department
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 uppercase block">Report Date</span>
                  <strong className="text-xs font-mono">{viewingReport.reportDate}</strong>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs p-3 rounded-2xl bg-slate-50 dark:bg-[#04140D] border border-slate-200 dark:border-emerald-950">
                <div>
                  <span className="text-slate-400 uppercase block">Prepared By</span>
                  <strong className="text-xs">{viewingReport.keeperName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 uppercase block">Shift</span>
                  <strong className="text-xs">{viewingReport.shift || 'Full Day'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 uppercase block">Report Type</span>
                  <strong className="text-xs capitalize">{viewingReport.type.replace(/_/g, ' ')}</strong>
                </div>
                <div>
                  <span className="text-slate-400 uppercase block">Status</span>
                  <strong className="text-emerald-500 font-bold">{viewingReport.status}</strong>
                </div>
              </div>

              {/* If Task Accomplishment Report */}
              {viewingReport.type === 'daily_task_accomplishment' && (
                <>
                  {viewingReport.taskMetrics && (
                    <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-2">
                        Accomplishment Metrics
                      </span>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <span className="text-xs text-slate-400 block">Total</span>
                          <strong className="text-sm font-black">{viewingReport.taskMetrics.total}</strong>
                        </div>
                        <div>
                          <span className="text-xs text-emerald-400 block">Completed</span>
                          <strong className="text-sm font-black text-emerald-400">{viewingReport.taskMetrics.completed}</strong>
                        </div>
                        <div>
                          <span className="text-xs text-amber-400 block">Pending</span>
                          <strong className="text-sm font-black text-amber-400">{viewingReport.taskMetrics.pending}</strong>
                        </div>
                        <div>
                          <span className="text-xs text-emerald-300 block">Rate</span>
                          <strong className="text-sm font-black text-emerald-300">{viewingReport.taskMetrics.completionRate}%</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {viewingReport.tasksIncluded && viewingReport.tasksIncluded.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Certified Accomplished Tasks ({viewingReport.tasksIncluded.length})
                      </h4>
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {viewingReport.tasksIncluded.map((t, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl border border-slate-200 dark:border-emerald-950 bg-slate-50/50 dark:bg-[#04140D] flex items-start justify-between gap-2 text-xs">
                            <div>
                              <strong className="text-xs text-slate-900 dark:text-white block">{t.title}</strong>
                              <span className="text-slate-400 text-xs">
                                {t.type} {t.animalName ? `• ${t.animalName}` : ''} {t.enclosureId ? `• Enclosure ${t.enclosureId}` : ''}
                              </span>
                              {t.notes && <p className="text-xs text-slate-500 italic mt-0.5">"{t.notes}"</p>}
                            </div>
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 shrink-0">
                              {t.completedAt || 'Done'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewingReport.generalObservations && (
                    <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-emerald-950 bg-slate-50/50 dark:bg-[#04140D]">
                      <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">General Habitat & Animal Observations</h4>
                      <p className="text-xs leading-relaxed">{viewingReport.generalObservations}</p>
                    </div>
                  )}

                  {viewingReport.handoverNotes && (
                    <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-emerald-950 bg-slate-50/50 dark:bg-[#04140D]">
                      <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Shift Handover Instructions</h4>
                      <p className="text-xs leading-relaxed">{viewingReport.handoverNotes}</p>
                    </div>
                  )}

                  {viewingReport.veterinaryAlerts && (
                    <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
                      <h4 className="text-xs font-bold uppercase mb-1">Veterinary Attention Alert</h4>
                      <p className="text-xs leading-relaxed">{viewingReport.veterinaryAlerts}</p>
                    </div>
                  )}
                </>
              )}

              {/* If Inventory Report */}
              {viewingReport.type === 'inventory_usage' && (
                <>
                  {viewingReport.inventoryItemsLogged && viewingReport.inventoryItemsLogged.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Supplies & Feeds Logged ({viewingReport.inventoryItemsLogged.length})
                      </h4>
                      <div className="space-y-1.5">
                        {viewingReport.inventoryItemsLogged.map((i, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl border border-slate-200 dark:border-emerald-950 bg-slate-50/50 dark:bg-[#04140D] flex items-center justify-between text-xs">
                            <div>
                              <strong className="text-xs text-slate-900 dark:text-white block">{i.name}</strong>
                              <span className="text-slate-400 text-xs">{i.category} {i.notes ? `• ${i.notes}` : ''}</span>
                            </div>
                            <div className="text-right font-mono">
                              <span className="text-emerald-500 font-bold block">-{i.quantityUsed} {i.unit}</span>
                              <span className="text-slate-400 text-xs">Left: {i.currentStock}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewingReport.urgentRestockNeeded && viewingReport.urgentRestockNeeded.length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                      <h4 className="text-xs font-bold uppercase text-amber-400">Priority Restock Requests</h4>
                      {viewingReport.urgentRestockNeeded.map((r, idx) => (
                        <div key={idx} className="text-xs flex items-center justify-between border-b border-amber-500/20 pb-1.5 last:border-b-0">
                          <div>
                            <strong className="text-amber-200 block">{r.name}</strong>
                            <span className="text-amber-300/80 text-xs">{r.reason}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300">
                            {r.quantityRequested} {r.unit} • {r.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {viewingReport.discrepancyNotes && (
                    <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-emerald-950 bg-slate-50/50 dark:bg-[#04140D]">
                      <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Cold Storage & Discrepancy Checks</h4>
                      <p className="text-xs leading-relaxed">{viewingReport.discrepancyNotes}</p>
                    </div>
                  )}

                  {viewingReport.notes && (
                    <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-emerald-950 bg-slate-50/50 dark:bg-[#04140D]">
                      <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">General Remarks</h4>
                      <p className="text-xs leading-relaxed">{viewingReport.notes}</p>
                    </div>
                  )}
                </>
              )}

              {/* Signoff stamp */}
              <div className="pt-4 border-t border-slate-200 dark:border-emerald-950 flex items-center justify-between text-xs text-slate-400">
                <div>
                  <span>Certified Digital Signature: </span>
                  <strong className="text-emerald-500 font-mono">{viewingReport.keeperName}</strong>
                </div>
                <span>Submission Time: {new Date(viewingReport.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL: INVENTORY REPORT */}
      {isInvSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`p-6 rounded-3xl max-w-sm w-full border text-center shadow-2xl ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base">Inventory Report Submitted!</h3>
            <p className="text-xs text-slate-400 mt-1">
              Your inventory consumption and restock requests have been submitted to the Sanctuary Admin records.
            </p>
            <div className="mt-5 flex items-center space-x-2">
              <button
                onClick={() => {
                  setIsInvSuccessModal(false);
                  setActiveTab('history');
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                View in Reports Archive
              </button>
            </div>
          </div>
        </div>
      )}
      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-emerald-950 border border-emerald-500/80 text-emerald-200 text-xs font-bold shadow-2xl flex items-center space-x-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-white p-0.5 rounded-lg transition-colors cursor-pointer ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
