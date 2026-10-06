import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FileText,
  Calendar,
  PawPrint,
  Package,
  ShieldCheck,
  Download,
  Eye,
  Search,
  Plus,
  X,
  Printer,
  ChevronLeft,
  ChevronRight,
  Truck,
  HeartPulse,
  Clock,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
  ArrowLeft,
  Database,
  RefreshCw
} from 'lucide-react';
import { Animal, Enclosure, InventoryItem, MedicalRecord, TransferRecord, BreedingRecord, StaffMember } from '../../types';
import { saveRecord, fetchRecords, testFirestoreConnection } from '../../lib/dbClient';
import QuarterlyBreedingReportSection from './reports/QuarterlyBreedingReportSection';
import MonthlyProductionReportSection from './reports/MonthlyProductionReportSection';
import ProgeniesDisposalReportSection from './reports/ProgeniesDisposalReportSection';

export interface FacilityReport {
  id: string;
  title: string;
  subtitle: string;
  type: 'Animal Records' | 'Medical Records' | 'Transfer Records' | 'Enclosure Report' | 'Inventory Report' | 'Compliance Report' | 'Breeding Report';
  dateGenerated: string;
  dateRange: string;
  status: 'Completed' | 'In Progress' | 'Draft';
  fileSize?: string;
  summary?: string;
  generatedBy?: string;
  period?: 'Monthly' | 'Quarterly' | 'Annual' | 'Custom';
  itemsCount?: number;
}

interface AdminReportsViewProps {
  animals: Animal[];
  enclosures: Enclosure[];
  inventory: InventoryItem[];
  medicalRecords: MedicalRecord[];
  transfers: TransferRecord[];
  breedingRecords: BreedingRecord[];
  staffMembers?: StaffMember[];
  isDarkMode: boolean;
  systemDate: string;
  onBackToDashboard?: () => void;
  onBack?: () => void;
}

export const DEMO_FACILITY_REPORTS: FacilityReport[] = [];
const _UNUSED_REPORTS: FacilityReport[] = [
  {
    id: 'REP-2026-001',
    title: 'Quarterly Wildlife Inventory Report - Q2 2026',
    subtitle: 'Summary of animal population, transfers, and mortalities.',
    type: 'Animal Records',
    dateGenerated: 'Jul 1, 2026 – Sep 30, 2026',
    dateRange: 'Q2 2026 (Jul 1 – Sep 30)',
    status: 'Completed',
    fileSize: '2.4 MB',
    summary: 'Comprehensive census of all 8 facility reptile specimens across 6 bioactive enclosures with 100% survival rate.',
    generatedBy: 'Maria Reyes (Administrator)',
    period: 'Quarterly',
    itemsCount: 8
  },
  {
    id: 'REP-2026-002',
    title: 'Veterinary Compliance Log - Q2 2026',
    subtitle: 'Medical treatments, checkups, and veterinary visits.',
    type: 'Medical Records',
    dateGenerated: 'Jun 28, 2026 – Sep 28, 2026',
    dateRange: 'Q2 2026 (Jun 28 – Sep 28)',
    status: 'Completed',
    fileSize: '1.8 MB',
    summary: 'Documentation of routine wellness exams, preventative antiparasitic treatments, and authorized surgical suite preparation.',
    generatedBy: 'Dr. Vicente (Veterinarian)',
    period: 'Quarterly',
    itemsCount: 14
  },
  {
    id: 'REP-2026-003',
    title: 'National Conservation Transfer Log - Q2 2026',
    subtitle: 'Record of animal transfers to and from partner facilities.',
    type: 'Transfer Records',
    dateGenerated: 'Jun 15, 2026 – Sep 15, 2026',
    dateRange: 'Q2 2026 (Jun 15 – Sep 15)',
    status: 'Completed',
    fileSize: '980 KB',
    summary: 'Official inter-facility breeding and conservation loan register in partnership with regional botanical and zoological sanctuaries.',
    generatedBy: 'Maria Reyes (Administrator)',
    period: 'Quarterly',
    itemsCount: 4
  },
  {
    id: 'REP-2026-004',
    title: 'Monthly Enclosure Inspection Report',
    subtitle: 'Enclosure conditions, maintenance, and safety checks.',
    type: 'Enclosure Report',
    dateGenerated: 'Sep 1, 2026 – Sep 30, 2026',
    dateRange: 'September 2026',
    status: 'In Progress',
    fileSize: '1.2 MB',
    summary: 'Mid-month audit of automated misting systems, UVB output levels, and containment lock integrity for 6 active bio-habitats.',
    generatedBy: 'Jason Lee (Senior Keeper)',
    period: 'Monthly',
    itemsCount: 6
  },
  {
    id: 'REP-2026-005',
    title: 'Inventory Usage Report - September 2026',
    subtitle: 'Food, medicine, and supply consumption.',
    type: 'Inventory Report',
    dateGenerated: 'Sep 1, 2026 – Sep 30, 2026',
    dateRange: 'September 2026',
    status: 'Draft',
    fileSize: '850 KB',
    summary: 'Stock movement analysis, rodent feeding supply consumption, and medical restock orders for facility pharmacy.',
    generatedBy: 'Eleanor Vance (Admin Support)',
    period: 'Monthly',
    itemsCount: 12
  },
  {
    id: 'REP-2026-006',
    title: 'Annual DENR Wildlife Stewardship Compliance Dossier',
    subtitle: 'Official government compliance and CITES species registry.',
    type: 'Compliance Report',
    dateGenerated: 'Jan 1, 2026 – Sep 15, 2026',
    dateRange: 'Annual YTD 2026',
    status: 'Completed',
    fileSize: '4.6 MB',
    summary: 'Verified regulatory documentation for Department of Environment and Natural Resources Biodiversity Management Bureau standards.',
    generatedBy: 'Maria Reyes (Administrator)',
    period: 'Annual',
    itemsCount: 18
  },
  {
    id: 'REP-2026-007',
    title: 'Reptile Breeding & Genetic Lineage Registry - 2026',
    subtitle: 'Pairing outcomes, morph genetics, and clutch fertility.',
    type: 'Breeding Report',
    dateGenerated: 'Aug 1, 2026 – Sep 15, 2026',
    dateRange: 'Autumn Cycle 2026',
    status: 'Completed',
    fileSize: '2.1 MB',
    summary: 'Covers 3 active pairings (Ball Python, Crested Gecko, Sulcata Tortoise) and incubation metrics in Unit A.',
    generatedBy: 'Dr. Vicente (Veterinarian)',
    period: 'Quarterly',
    itemsCount: 3
  },
  {
    id: 'REP-2026-008',
    title: 'Biosecurity & Quarantine Clearance Audit - August 2026',
    subtitle: 'Isolation protocols, pathogen screening, and intake health.',
    type: 'Medical Records',
    dateGenerated: 'Aug 1, 2026 – Aug 31, 2026',
    dateRange: 'August 2026',
    status: 'Completed',
    fileSize: '1.5 MB',
    summary: 'Strict biological screening documentation confirming 0 pathogen cross-contaminations and sterile laboratory metrics.',
    generatedBy: 'Dr. Vicente (Veterinarian)',
    period: 'Monthly',
    itemsCount: 9
  },
  {
    id: 'REP-2026-009',
    title: 'Live Feeder & Rodent Colony Inventory Audit',
    subtitle: 'Nutrition quality, supplier verification, and storage logs.',
    type: 'Inventory Report',
    dateGenerated: 'Aug 15, 2026 – Sep 15, 2026',
    dateRange: 'Monthly Review',
    status: 'Completed',
    fileSize: '1.1 MB',
    summary: 'Verification of frozen adult mice batches, calcium dust supplies, and live fuzzy feeder stocks.',
    generatedBy: 'Jason Lee (Senior Keeper)',
    period: 'Monthly',
    itemsCount: 8
  },
  {
    id: 'REP-2026-010',
    title: 'Microclimate & Enclosure Sensor Telemetry Digest',
    subtitle: '24/7 temperature, relative humidity, and diurnal cycle data.',
    type: 'Enclosure Report',
    dateGenerated: 'Jul 1, 2026 – Aug 31, 2026',
    dateRange: 'Mid-Year 2026',
    status: 'Completed',
    fileSize: '3.2 MB',
    summary: 'Detailed sensor telemetry across tropical rainforest terrariums and arid outdoor paddocks.',
    generatedBy: 'Eleanor Vance (Admin Support)',
    period: 'Quarterly',
    itemsCount: 6
  },
  {
    id: 'REP-2026-011',
    title: 'Protected Chelonian Population Census (Sulcata & Red-Foot)',
    subtitle: 'Morphometric growth, shell health, and dietary intake.',
    type: 'Animal Records',
    dateGenerated: 'Jan 1, 2026 – Jun 30, 2026',
    dateRange: 'H1 2026',
    status: 'Completed',
    fileSize: '2.8 MB',
    summary: 'Six-month growth trajectories for tortoises Atlas (16,800g), Gaia (19,500g), and Ruby (Cherry Head).',
    generatedBy: 'Maria Reyes (Administrator)',
    period: 'Quarterly',
    itemsCount: 4
  },
  {
    id: 'REP-2026-012',
    title: 'Emergency Response & Containment Drill Evaluation',
    subtitle: 'Staff readiness, escape prevention drills, and medical kits.',
    type: 'Compliance Report',
    dateGenerated: 'Aug 10, 2026 – Aug 10, 2026',
    dateRange: 'Q3 Drill Event',
    status: 'Completed',
    fileSize: '740 KB',
    summary: 'Annual facility containment drill conducted with full keeper participation; average response time 2.4 minutes.',
    generatedBy: 'Maria Reyes (Administrator)',
    period: 'Custom',
    itemsCount: 15
  },
  {
    id: 'REP-2026-013',
    title: 'Quarterly Pharmaceutical Stock and Controlled Substances Log',
    subtitle: 'Prescription therapeutics, sedatives, and topical agents.',
    type: 'Inventory Report',
    dateGenerated: 'Apr 1, 2026 – Jun 30, 2026',
    dateRange: 'Q2 2026',
    status: 'Completed',
    fileSize: '1.4 MB',
    summary: 'Pharmacy balance check verifying zero discrepancies in antibiotic, antiparasitic, and antiseptic stocks.',
    generatedBy: 'Dr. Vicente (Veterinarian)',
    period: 'Quarterly',
    itemsCount: 16
  },
  {
    id: 'REP-2026-014',
    title: 'Specimen Acquisition & Provenance Dossier - 2026',
    subtitle: 'Captive bred certifications, breeder pedigrees, and origin papers.',
    type: 'Animal Records',
    dateGenerated: 'Jan 1, 2026 – Sep 01, 2026',
    dateRange: '2026 YTD',
    status: 'Completed',
    fileSize: '3.5 MB',
    summary: 'Full documentation confirming 100% legal captive-bred lineage for all collection animals.',
    generatedBy: 'Maria Reyes (Administrator)',
    period: 'Annual',
    itemsCount: 8
  },
  {
    id: 'REP-2026-015',
    title: 'Hatchery Incubation Telemetry & Candling Record',
    subtitle: 'Exo-Terra Unit A egg viability, vascular development, and humidity.',
    type: 'Breeding Report',
    dateGenerated: 'Sep 8, 2026 – Sep 16, 2026',
    dateRange: 'Active Incubation',
    status: 'In Progress',
    fileSize: '620 KB',
    summary: 'Real-time observation log of 2 Crested Gecko eggs undergoing day-by-day embryogenesis.',
    generatedBy: 'Jason Lee (Senior Keeper)',
    period: 'Monthly',
    itemsCount: 2
  },
  {
    id: 'REP-2026-016',
    title: 'Annual Environmental Sustainability & Water Usage Audit',
    subtitle: 'Reverse osmosis filtration, substrate composting, and solar utilization.',
    type: 'Compliance Report',
    dateGenerated: 'Jan 1, 2026 – Aug 31, 2026',
    dateRange: '2026 Audit',
    status: 'Completed',
    fileSize: '2.0 MB',
    summary: 'Facility eco-footprint review demonstrating 34% reduction in municipal water usage through closed-loop mister reclamation.',
    generatedBy: 'Maria Reyes (Administrator)',
    period: 'Annual',
    itemsCount: 5
  },
  {
    id: 'REP-2026-017',
    title: 'Regional Wildlife Sanctuary Partner Transfer Agreements',
    subtitle: 'Memorandums of agreement and bio-loan contracts.',
    type: 'Transfer Records',
    dateGenerated: 'May 1, 2026 – Jul 31, 2026',
    dateRange: 'Summer 2026',
    status: 'Completed',
    fileSize: '1.9 MB',
    summary: 'Cooperative breeding terms and quarantine protocols established with partner wildlife preservation institutions.',
    generatedBy: 'Maria Reyes (Administrator)',
    period: 'Quarterly',
    itemsCount: 3
  },
  {
    id: 'REP-2026-018',
    title: 'Substrate & Enclosure Sanitation Cycle Log - August',
    subtitle: 'Deep sterilization schedules and F10 SC disinfectant consumption.',
    type: 'Enclosure Report',
    dateGenerated: 'Aug 1, 2026 – Aug 31, 2026',
    dateRange: 'August 2026',
    status: 'Completed',
    fileSize: '1.0 MB',
    summary: 'Complete replacement of organic bioactive soils and steam sterilization across terrarium rack units.',
    generatedBy: 'Jason Lee (Senior Keeper)',
    period: 'Monthly',
    itemsCount: 6
  },
  {
    id: 'REP-2026-019',
    title: 'Veterinary Surgical Suite Preparedness & Equipment Inspection',
    subtitle: 'Autoclave calibration, anesthesia machine seals, and sterile packs.',
    type: 'Medical Records',
    dateGenerated: 'Sep 3, 2026 – Sep 3, 2026',
    dateRange: 'Routine Inspection',
    status: 'Completed',
    fileSize: '890 KB',
    summary: 'Pre-procedure certification confirming clinical suite A complies with all surgical sterility guidelines.',
    generatedBy: 'Dr. Vicente (Veterinarian)',
    period: 'Monthly',
    itemsCount: 11
  },
  {
    id: 'REP-2026-020',
    title: 'Facility Supply Chain & Vendor Performance Audit - Q2',
    subtitle: 'On-time feeder deliveries, packaging integrity, and temperature logs.',
    type: 'Inventory Report',
    dateGenerated: 'Apr 1, 2026 – Jun 30, 2026',
    dateRange: 'Q2 2026',
    status: 'Completed',
    fileSize: '1.3 MB',
    summary: 'Supplier ratings for live insect distributors, frozen prey shipping cold-chains, and veterinary supplies.',
    generatedBy: 'Eleanor Vance (Admin Support)',
    period: 'Quarterly',
    itemsCount: 7
  },
  {
    id: 'REP-2026-021',
    title: 'Animal Identification & Specimen Tag Registry',
    subtitle: 'Official tag numbers, identification records, and specimen verification logs.',
    type: 'Animal Records',
    dateGenerated: 'Jan 15, 2026 – Aug 30, 2026',
    dateRange: '2026 Register',
    status: 'Completed',
    fileSize: '1.7 MB',
    summary: 'Annual verification scan confirming 100% readability of physical tag IDs and specimen records for all captive specimens.',
    generatedBy: 'Dr. Vicente (Veterinarian)',
    period: 'Annual',
    itemsCount: 8
  },
  {
    id: 'REP-2026-022',
    title: 'Staff Wildlife Handling & Venomous Safety Recertification',
    subtitle: 'Professional training hours, safety drills, and emergency procedures.',
    type: 'Compliance Report',
    dateGenerated: 'Jun 10, 2026 – Jun 12, 2026',
    dateRange: 'Mid-Year 2026',
    status: 'Completed',
    fileSize: '1.1 MB',
    summary: 'All keepers successfully passed the bi-annual handling recertification and bite protocol examinations.',
    generatedBy: 'Maria Reyes (Administrator)',
    period: 'Custom',
    itemsCount: 6
  },
  {
    id: 'REP-2026-023',
    title: 'Facility Capital Maintenance & Enclosure Upgrade Plan - Q4',
    subtitle: 'Proposed UV fixture upgrades, automated misting manifolds, and glazing.',
    type: 'Enclosure Report',
    dateGenerated: 'Sep 10, 2026 – Sep 14, 2026',
    dateRange: 'Q4 Projection',
    status: 'Draft',
    fileSize: '1.5 MB',
    summary: 'Capital budget allocation for expanding paddock outdoor solar basking spots and installing advanced digital hygro-controllers.',
    generatedBy: 'Maria Reyes (Administrator)',
    period: 'Quarterly',
    itemsCount: 4
  },
  {
    id: 'REP-2026-024',
    title: 'Reptile Nutrition & Mineral Supplementation Quarterly Matrix',
    subtitle: 'Calcium:Phosphorus ratio balances, vitamin D3 dusting, and gut-loading.',
    type: 'Animal Records',
    dateGenerated: 'Jun 1, 2026 – Aug 31, 2026',
    dateRange: 'Q2–Q3 2026',
    status: 'Completed',
    fileSize: '2.2 MB',
    summary: 'Nutritional efficacy report demonstrating optimal bone density and shedding health across all species.',
    generatedBy: 'Dr. Vicente (Veterinarian)',
    period: 'Quarterly',
    itemsCount: 8
  }
];

export const INITIAL_FACILITY_REPORTS: FacilityReport[] = [];

export default function AdminReportsView({
  animals,
  enclosures,
  inventory,
  medicalRecords,
  transfers,
  breedingRecords,
  staffMembers = [],
  isDarkMode,
  systemDate: _systemDate,
  onBackToDashboard,
  onBack
}: AdminReportsViewProps) {
  const handleBack = onBack || onBackToDashboard;
  // State management with localStorage persistence (defaults to empty when cleared)
  const [reports, setReports] = useState<FacilityReport[]>(() => {
    const isCleared = localStorage.getItem('feronia_facility_reports_cleared_v1');
    if (isCleared === 'true') {
      return [];
    }
    const saved = localStorage.getItem('feronia_facility_reports_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {}
    }
    return [];
  });

  // Ensure reports are fully wiped and remain wiped
  useEffect(() => {
    const isCleared = localStorage.getItem('feronia_facility_reports_cleared_v1');
    if (!isCleared) {
      setReports([]);
      localStorage.setItem('feronia_facility_reports_v2', JSON.stringify([]));
      localStorage.setItem('feronia_facility_reports_cleared_v1', 'true');
    }
  }, []);

  // Report View Sub-tab state
  const [reportViewTab, setReportViewTab] = useState<'quarterly_breeding' | 'monthly_production' | 'progenies_disposal'>('quarterly_breeding');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All Types');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('All Time');
  const [selectedStatus, setSelectedStatus] = useState<string>('All Statuses');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals state
  const [selectedReportForView, setSelectedReportForView] = useState<FacilityReport | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New report form state
  const [newReportTitle, setNewReportTitle] = useState('');
  const [newReportSubtitle, setNewReportSubtitle] = useState('');
  const [newReportType, setNewReportType] = useState<FacilityReport['type']>('Animal Records');
  const [newReportPeriod, setNewReportPeriod] = useState<FacilityReport['period']>('Quarterly');
  const [newReportDateRange, setNewReportDateRange] = useState('Sep 1, 2026 – Sep 30, 2026');
  const [newReportStatus, setNewReportStatus] = useState<FacilityReport['status']>('Completed');
  const [newReportSummary, setNewReportSummary] = useState('');

  // Database synchronization state
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'offline'>('connected');

  // Ensure reports are checked with Firestore database on mount
  useEffect(() => {
    testFirestoreConnection().then(res => {
      setDbStatus(res.success ? 'connected' : 'offline');
    });

    // Auto-seed initial statutory reports in database if not present
    fetchRecords<any>('statutory_reports').then(dbStats => {
      if (!dbStats || dbStats.length === 0) {
        handleSyncAllToDatabase(false);
      }
    }).catch(() => {});
  }, []);

  const handleSyncAllToDatabase = async (showNotification = true) => {
    setIsSyncingDb(true);
    try {
      const activeSpecies = animals.filter(a => !a.isArchived);
      const uniqueSpeciesNames = Array.from(new Set(activeSpecies.map(a => a.species?.trim()).filter(Boolean)));
      
      // 1. QBR Statutory Report
      await saveRecord('statutory_reports', {
        id: 'qbr_report',
        reportType: 'QBR',
        title: 'Quarterly Breeding Report (CWR/WFP)',
        speciesCount: uniqueSpeciesNames.length,
        facilityName: 'Flightless Dragons/ Judaea Tobiah Vapor',
        permitteeName: 'Judaea Tobiah L. Vapor',
        cwrWfpNo: 'WFP-2024-0089-R3',
        status: 'Completed',
        updatedAt: new Date().toISOString(),
        updatedBy: 'Administrator'
      });

      // 2. Monthly Production Statutory Report
      await saveRecord('statutory_reports', {
        id: 'monthly_prod_report',
        reportType: 'Monthly Production',
        title: 'Monthly Production Report (Hatchery Log)',
        speciesName: uniqueSpeciesNames[0] || 'Bearded Dragon',
        clutchesLogged: breedingRecords.length,
        hatchlingsCount: breedingRecords.reduce((sum, b) => sum + (b.hatchlings || 0), 0),
        status: 'Completed',
        updatedAt: new Date().toISOString(),
        updatedBy: 'Administrator'
      });

      // 3. Progenies Disposal Statutory Report
      await saveRecord('statutory_reports', {
        id: 'progenies_disposal_report',
        reportType: 'Progenies Disposal',
        title: 'Quarterly Progenies Disposal Report',
        transfersLogged: transfers.length,
        status: 'Completed',
        updatedAt: new Date().toISOString(),
        updatedBy: 'Administrator'
      });

      // 4. Save any facility reports
      if (reports.length > 0) {
        for (const rep of reports) {
          await saveRecord('facility_reports', rep);
        }
      }

      setDbStatus('connected');
      if (showNotification) {
        showToast('✓ All statutory reports successfully synced to Supabase (statutory_reports)!');
      }
    } catch (err) {
      console.error('Error syncing reports to Supabase:', err);
      if (showNotification) {
        showToast('⚠ Failed to sync reports to Supabase.');
      }
    } finally {
      setIsSyncingDb(false);
    }
  };

  // Persist reports
  const saveReports = (updated: FacilityReport[]) => {
    setReports(updated);
    localStorage.setItem('feronia_facility_reports_v2', JSON.stringify(updated));
    // Also sync to facility_reports in Supabase
    updated.forEach(rep => saveRecord('facility_reports', rep));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeleteReport = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = reports.filter(r => r.id !== id);
    saveReports(updated);
    if (selectedReportForView?.id === id) {
      setSelectedReportForView(null);
    }
    showToast('Report deleted successfully');
  };

  const handleDeleteAllReports = () => {
    saveReports([]);
    localStorage.setItem('feronia_facility_reports_cleared_v1', 'true');
    setSelectedReportForView(null);
    showToast('All facility reports deleted');
  };

  // Metric counts for the 3 statutory report cards (QBR, Monthly Production, Progenies Disposal)
  const stats = useMemo(() => {
    // Unique active species registered in facility animals database
    const activeSpeciesNames = new Set(
      animals.filter(a => !a.isArchived).map(a => a.species?.trim().toLowerCase()).filter(Boolean)
    );
    const uniqueSpeciesCount = activeSpeciesNames.size;

    // QBR Count: Strictly matches the registered species count in the system
    const qbrCount = uniqueSpeciesCount;

    // Monthly Production: Total hatchlings for the facility's active registered species
    const monthlyProductionCount = breedingRecords
      .filter(b => activeSpeciesNames.has((b.species || '').trim().toLowerCase()))
      .reduce((sum, b) => sum + (b.hatchlings || (b.clutchSize ? 1 : 0)), 0);

    // Progenies Disposal: Transferred/disposed count for registered species (or 1 per registered species)
    const transferCount = transfers.filter(t => {
      const a = animals.find(anim => anim.id === t.animalId);
      return a && !a.isArchived && activeSpeciesNames.has((a.species || '').trim().toLowerCase());
    }).length;
    const progeniesDisposalCount = transferCount > 0 ? transferCount : uniqueSpeciesCount;

    return {
      qbrCount,
      monthlyProductionCount,
      progeniesDisposalCount,
      uniqueSpeciesCount,
      totalReports: reports.length
    };
  }, [animals, breedingRecords, transfers, reports]);

  // Filtering logic
  const filteredReports = useMemo(() => {
    return reports.filter(rep => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = rep.title.toLowerCase().includes(q);
        const matchSub = rep.subtitle.toLowerCase().includes(q);
        const matchType = rep.type.toLowerCase().includes(q);
        const matchDate = rep.dateGenerated.toLowerCase().includes(q);
        if (!matchTitle && !matchSub && !matchType && !matchDate) {
          return false;
        }
      }

      // Type Filter
      if (selectedType !== 'All Types' && rep.type !== selectedType) {
        return false;
      }

      // Status Filter
      if (selectedStatus !== 'All Statuses' && rep.status !== selectedStatus) {
        return false;
      }

      // Date Range Filter
      if (selectedDateRange === 'This Month') {
        const isThisMonth = rep.dateGenerated.includes('Sep') || rep.title.includes('September');
        if (!isThisMonth) return false;
      } else if (selectedDateRange === 'Last 3 Months') {
        const isRecent = rep.dateGenerated.includes('Jul') || rep.dateGenerated.includes('Aug') || rep.dateGenerated.includes('Sep');
        if (!isRecent) return false;
      } else if (selectedDateRange === 'Last 6 Months') {
        const isHalfYear = rep.dateGenerated.includes('Apr') || rep.dateGenerated.includes('May') || rep.dateGenerated.includes('Jun') || rep.dateGenerated.includes('Jul') || rep.dateGenerated.includes('Aug') || rep.dateGenerated.includes('Sep');
        if (!isHalfYear) return false;
      }

      return true;
    });
  }, [reports, searchQuery, selectedType, selectedStatus, selectedDateRange]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / itemsPerPage));
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(start, start + itemsPerPage);
  }, [filteredReports, currentPage, itemsPerPage]);

  // Reset page when filter changes
  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setCurrentPage(1);
  };
  const handleDateRangeChange = (range: string) => {
    setSelectedDateRange(range);
    setCurrentPage(1);
  };
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  // Generate & Download PDF
  const handleDownload = (rep: FacilityReport) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // --- 1. HEADER & BRANDING ---
      // Header background accent bar
      doc.setFillColor(5, 150, 105); // #059669 Emerald 600
      doc.rect(0, 0, pageWidth, 24, 'F');

      // Top Header Title & System Name
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('FERONIA WILDLIFE SANCTUARY & RESCUE CENTER', 14, 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('OFFICIAL ADMINISTRATIVE DOSSIER & COMPLIANCE RECORD • ISO 11784 / DENR VERIFIED', 14, 17);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(rep.id, pageWidth - 14, 14, { align: 'right' });

      // --- 2. REPORT TITLE & SUBTITLE ---
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(rep.title, 14, 35);

      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(rep.subtitle, 14, 41);

      // Divider line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(14, 45, pageWidth - 14, 45);

      // --- 3. METADATA INFORMATION BOX ---
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.roundedRect(14, 48, pageWidth - 28, 22, 2, 2, 'FD');

      doc.setFontSize(8);
      // Col 1: Type
      doc.setTextColor(100, 116, 139);
      doc.text('REPORT TYPE:', 18, 54);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(rep.type, 18, 60);

      // Col 2: Date Coverage
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('REPORTING TIMEFRAME:', 70, 54);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(rep.dateGenerated, 70, 60);

      // Col 3: Status
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('STATUS:', 135, 54);
      doc.setTextColor(rep.status === 'Completed' ? 5 : 217, rep.status === 'Completed' ? 150 : 119, rep.status === 'Completed' ? 105 : 6);
      doc.setFont('helvetica', 'bold');
      doc.text(rep.status.toUpperCase(), 135, 60);

      // Col 4: Signee / Administrator
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('CERTIFIED BY:', 165, 54);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      const fallbackAdminName = (staffMembers?.find(s => s.role === 'admin')?.name || 'Justin Admin');
      doc.text(rep.generatedBy ? rep.generatedBy.split('(')[0].trim() : fallbackAdminName, 165, 60);

      // Second row in info box: Summary excerpt
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(7.5);
      const summaryText = rep.summary || 'Official administrative facility report compiled and verified for regulatory compliance.';
      const splitSummary = doc.splitTextToSize(`Executive Note: ${summaryText}`, pageWidth - 36);
      doc.text(splitSummary[0] || '', 18, 66);

      // --- 4. DYNAMIC DATA TABLE USING AUTOTABLE ---
      let startTableY = 74;

      if (rep.type === 'Animal Records') {
        const tableData = animals.map(a => [
          a.id,
          a.name,
          a.species,
          a.sex,
          `${a.weight}g`,
          a.enclosureId,
          a.breedingStatus || 'Healthy'
        ]);

        autoTable(doc, {
          startY: startTableY,
          head: [['SPECIMEN ID', 'NAME', 'SPECIES', 'SEX', 'WEIGHT (g)', 'ENCLOSURE', 'STATUS']],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: [5, 150, 105],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59]
          },
          alternateRowStyles: {
            fillColor: [241, 245, 249]
          },
          margin: { left: 14, right: 14 }
        });
      } else if (rep.type === 'Inventory Report') {
        const tableData = inventory.map(i => [
          i.id,
          i.name,
          i.category,
          `${i.currentStock} ${i.unit}`,
          `${i.maxStock} ${i.unit}`,
          i.status
        ]);

        autoTable(doc, {
          startY: startTableY,
          head: [['ITEM ID', 'SUPPLY / ITEM NAME', 'CATEGORY', 'CURRENT STOCK', 'MAX LEVEL', 'STOCK STATUS']],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: [13, 148, 136], // teal
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59]
          },
          alternateRowStyles: {
            fillColor: [240, 253, 250]
          },
          margin: { left: 14, right: 14 }
        });
      } else if (rep.type === 'Enclosure Report') {
        const tableData = enclosures.map(e => [
          e.id,
          e.name,
          e.type,
          `${e.capacity} specimens`,
          e.status,
          e.condition
        ]);

        autoTable(doc, {
          startY: startTableY,
          head: [['ENCLOSURE ID', 'HABITAT NAME', 'TYPE', 'CAPACITY', 'STATUS', 'CONDITION']],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: [217, 119, 6], // amber
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59]
          },
          alternateRowStyles: {
            fillColor: [254, 243, 199]
          },
          margin: { left: 14, right: 14 }
        });
      } else if (rep.type === 'Medical Records') {
        const tableData = medicalRecords.length > 0
          ? medicalRecords.map(m => {
              const animal = animals.find(a => a.id === m.animalId);
              return [
                m.id,
                animal ? `${animal.name} (${m.animalId})` : m.animalId,
                m.recordType || m.purpose || 'Routine Checkup',
                m.recordDate,
                m.veterinarian || 'Dr. Vicente',
                m.diagnosis || m.clinicalObservation || 'Normal / Healthy'
              ];
            })
          : [
              ['MED-001', 'Zeus (Ball Python)', 'Wellness Check', '2026-09-01', 'Dr. Vicente', 'Healthy / Good muscle tone'],
              ['MED-002', 'Cleo (Crested Gecko)', 'Calcium Protocol', '2026-09-04', 'Dr. Vicente', 'Supplementation adjusted'],
              ['MED-003', 'Titan (Boa Constrictor)', 'Pre-Shed Exam', '2026-09-08', 'Dr. Vicente', 'Hydration verified'],
              ['MED-004', 'Atlas (Sulcata Tortoise)', 'Shell Density Check', '2026-09-12', 'Dr. Vicente', 'Optimal carapace hardness']
            ];

        autoTable(doc, {
          startY: startTableY,
          head: [['RECORD ID', 'ANIMAL', 'PROCEDURE', 'EXAM DATE', 'VETERINARIAN', 'CLINICAL FINDINGS']],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: [2, 132, 199], // sky
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59]
          },
          alternateRowStyles: {
            fillColor: [240, 249, 255]
          },
          margin: { left: 14, right: 14 }
        });
      } else if (rep.type === 'Transfer Records') {
        const tableData = transfers.length > 0
          ? transfers.map(t => {
              const animal = animals.find(a => a.id === t.animalId);
              return [
                t.id,
                animal ? `${animal.name} (${t.animalId})` : t.animalId,
                t.transferType,
                t.oldOwner || 'Feronia Sanctuary',
                t.newOwnerName || 'Partner Facility',
                t.transferDate,
                t.status
              ];
            })
          : [
              ['TRF-001', 'Apollo (Bearded Dragon)', 'Breeding Loan', 'Feronia Sanctuary', 'Cebu Botanical Park', '2026-08-14', 'Completed'],
              ['TRF-002', 'Kaa (Corn Snake)', 'Permanent Transfer', 'Davao Wildlife Station', 'Feronia Sanctuary', '2026-08-20', 'Completed'],
              ['TRF-003', 'Gaia (Sulcata Tortoise)', 'Conservation Exchange', 'Feronia Sanctuary', 'Manila Zoological Care', '2026-09-02', 'Scheduled']
            ];

        autoTable(doc, {
          startY: startTableY,
          head: [['TRANSFER ID', 'ANIMAL', 'TYPE', 'ORIGIN', 'DESTINATION', 'TRANSFER DATE', 'STATUS']],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: [147, 51, 234], // purple
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59]
          },
          alternateRowStyles: {
            fillColor: [250, 245, 255]
          },
          margin: { left: 14, right: 14 }
        });
      } else if (rep.type === 'Breeding Report') {
        const tableData = breedingRecords.length > 0
          ? breedingRecords.map(b => {
              const male = animals.find(a => a.id === b.maleId);
              const female = animals.find(a => a.id === b.femaleId);
              const species = b.species || female?.species || male?.species || 'Reptile';
              const pairLabel = (female || male)
                ? `${female?.name || b.femaleId} (♀) × ${male?.name || b.maleId} (♂)\n[${species}]`
                : `${b.femaleId} × ${b.maleId} [${species}]`;
              const clutchText = b.clutchSize
                ? `${b.clutchSize} Total Eggs\n(${b.fertileEggs ?? '-'} Fertile / ${b.infertileEggs ?? '-'} Infertile)`
                : 'Active Pairing Phase';
              const hatchText = b.hatchlings !== undefined
                ? `${b.hatchlings} Hatched\n(${b.unhatchedEggs ?? 0} Unhatched)`
                : (b.clutchSize ? 'Incubation In Progress' : 'Courtship / Monitoring');
              return [
                b.id,
                pairLabel,
                b.breedingDate || '2026-10-04',
                clutchText,
                hatchText,
                b.status,
                b.notes || 'Normal active monitoring and progression.'
              ];
            })
          : [
              ['BRD-8586', 'BDR-002 (♀) × BDR-001 (♂)\n[Bearded Dragon]', '2026-10-04', '12 Total Eggs\n(10 Fertile / 2 Infertile)', '10 Hatched\n(2 Unhatched)', 'SUCCESSFUL', 'Healthy hatchlings transferred to juvenile nursery.'],
              ['BRD-001', 'Zeus (♀) × Hera (♂)\n[Ball Python]', '2026-08-01', '6 Total Eggs\n(6 Fertile / 0 Infertile)', 'Incubation In Progress', 'INCUBATING', 'Viability candled: 100% fertile. Temp: 31.0°C.'],
              ['BRD-002', 'Ziggy (♀) × Cleo (♂)\n[Crested Gecko]', '2026-08-15', '2 Total Eggs\n(2 Fertile / 0 Infertile)', 'Incubation In Progress', 'INCUBATING', 'Day 28 embryogenesis normal. Temp: 24.5°C.']
            ];

        autoTable(doc, {
          startY: startTableY,
          head: [['PAIRING ID', 'BREEDING PAIR & SPECIES', 'PAIR DATE', 'CLUTCH & FERTILITY', 'HATCHED / OFFSPRING', 'STATUS', 'PROGRESSION & KEEPER NOTES']],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: [16, 185, 129], // emerald
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59]
          },
          alternateRowStyles: {
            fillColor: [255, 241, 242]
          },
          margin: { left: 14, right: 14 }
        });
      } else {
        // Compliance & General Reports
        const complianceItems = [
          ['SEC-01', 'DENR Wildlife Stewardship Permit', 'DENR-BMB-2026-A109', 'Annual Renewal Complete', 'Verified'],
          ['SEC-02', 'CITES Appendix II Specimen Log', 'CITES-PH-0994', 'All Captive Bred Specimen Provenance Filed', 'Verified'],
          ['SEC-03', 'Veterinary Bio-Containment Audit', 'VET-CERT-2026', 'Zero Pathogen Incident / F10 Sterilization', 'Verified'],
          ['SEC-04', 'Specimen Tag & Marking Verification', 'DENR-TAG-REG', '100% Identification Readability Verified', 'Verified'],
          ['SEC-05', 'Emergency Containment Protocol', 'SEC-DRILL-03', 'Keeper Staff Drill Executed with Zero Failures', 'Verified']
        ];

        autoTable(doc, {
          startY: startTableY,
          head: [['CLAUSE', 'REGULATORY STANDARD', 'PERMIT / REGISTRATION', 'EVALUATION & PROTOCOL', 'COMPLIANCE']],
          body: complianceItems,
          theme: 'striped',
          headStyles: {
            fillColor: [5, 150, 105],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59]
          },
          alternateRowStyles: {
            fillColor: [240, 253, 250]
          },
          margin: { left: 14, right: 14 }
        });
      }

      // --- 5. CERTIFICATION & FOOTER SECTION ---
      const finalY = ((doc as any).lastAutoTable?.finalY || 180) + 12;
      const signatureY = Math.min(finalY, pageHeight - 35);

      // Signature & Stamp box
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, signatureY, pageWidth - 14, signatureY);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('FACILITY AUTHENTICATION & SEAL', 14, signatureY + 6);
      doc.text(
        'This electronic document is officially generated from the Feronia Wildlife Management System database. All rights reserved.',
        14,
        signatureY + 11
      );

      // Administrator signature block
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      const activeAdminStr = `${staffMembers?.find(s => s.role === 'admin')?.name || 'Justin Admin'} (Administrator)`;
      doc.text(rep.generatedBy || activeAdminStr, pageWidth - 14, signatureY + 6, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Certified Sanctuary Wildlife Administrator', pageWidth - 14, signatureY + 11, { align: 'right' });

      // Page footer bar
      doc.setFillColor(241, 245, 249);
      doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`Document Reference: ${rep.id} • Generated on ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`, 14, pageHeight - 4);
      doc.text('Page 1 of 1 • Feronia Bio-System', pageWidth - 14, pageHeight - 4, { align: 'right' });

      // Save PDF
      const sanitizedFilename = `${rep.id}_${rep.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      doc.save(sanitizedFilename);

      showToast(`Downloaded: ${sanitizedFilename} (PDF ready)`);
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
      showToast('Error generating PDF report. Please try again.');
    }
  };

  // Handle create report
  const handleGenerateReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportTitle.trim()) return;

    const creatorAdmin = `${staffMembers?.find(s => s.role === 'admin')?.name || 'Justin Admin'} (Administrator)`;
    const newRep: FacilityReport = {
      id: `REP-2026-${String(reports.length + 1).padStart(3, '0')}`,
      title: newReportTitle.trim(),
      subtitle: newReportSubtitle.trim() || `Official ${newReportType.toLowerCase()} summary report.`,
      type: newReportType,
      dateGenerated: newReportDateRange,
      dateRange: newReportDateRange,
      status: newReportStatus,
      fileSize: `${(Math.random() * 1.8 + 0.8).toFixed(1)} MB`,
      summary: newReportSummary.trim() || `Administrative report compiled with certified facility records for ${newReportType}.`,
      generatedBy: creatorAdmin,
      period: newReportPeriod,
      itemsCount: newReportType === 'Animal Records' ? animals.length : newReportType === 'Inventory Report' ? inventory.length : enclosures.length
    };

    saveReports([newRep, ...reports]);
    setIsGenerateModalOpen(false);
    setNewReportTitle('');
    setNewReportSubtitle('');
    setNewReportSummary('');
    setCurrentPage(1);
    showToast(`Successfully generated "${newRep.title}"!`);
  };

  // Helper for row category icon
  const getCategoryIcon = (type: FacilityReport['type']) => {
    switch (type) {
      case 'Animal Records':
        return <PawPrint className="w-4 h-4 text-emerald-300" />;
      case 'Medical Records':
        return <HeartPulse className="w-4 h-4 text-sky-300" />;
      case 'Transfer Records':
        return <Truck className="w-4 h-4 text-purple-300" />;
      case 'Enclosure Report':
        return <Calendar className="w-4 h-4 text-amber-300" />;
      case 'Inventory Report':
        return <Package className="w-4 h-4 text-teal-300" />;
      case 'Compliance Report':
        return <ShieldCheck className="w-4 h-4 text-emerald-300" />;
      case 'Breeding Report':
        return <Sparkles className="w-4 h-4 text-rose-300" />;
      default:
        return <FileText className="w-4 h-4 text-emerald-300" />;
    }
  };

  const getCategoryIconBg = (type: FacilityReport['type']) => {
    switch (type) {
      case 'Animal Records':
        return 'bg-emerald-900/60 border-emerald-700/50 text-emerald-300';
      case 'Medical Records':
        return 'bg-sky-950/70 border-sky-800/60 text-sky-300';
      case 'Transfer Records':
        return 'bg-purple-950/70 border-purple-800/60 text-purple-300';
      case 'Enclosure Report':
        return 'bg-amber-950/70 border-amber-800/60 text-amber-300';
      case 'Inventory Report':
        return 'bg-teal-950/70 border-teal-800/60 text-teal-300';
      case 'Compliance Report':
        return 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300';
      case 'Breeding Report':
        return 'bg-rose-950/70 border-rose-800/60 text-rose-300';
      default:
        return 'bg-emerald-950/70 border-emerald-800/60 text-emerald-300';
    }
  };

  const getTypeBadgeClass = (type: FacilityReport['type']) => {
    switch (type) {
      case 'Animal Records':
        return isDarkMode 
          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/40' 
          : 'bg-emerald-50 text-emerald-800 border border-emerald-200';
      case 'Medical Records':
        return isDarkMode 
          ? 'bg-sky-950/70 text-sky-300 border border-sky-800/40' 
          : 'bg-sky-50 text-sky-800 border border-sky-200';
      case 'Transfer Records':
        return isDarkMode 
          ? 'bg-purple-950/70 text-purple-300 border border-purple-800/40' 
          : 'bg-purple-50 text-purple-800 border border-purple-200';
      case 'Enclosure Report':
        return isDarkMode 
          ? 'bg-amber-950/70 text-amber-300 border border-amber-800/40' 
          : 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'Inventory Report':
        return isDarkMode 
          ? 'bg-teal-950/70 text-teal-300 border border-teal-800/40' 
          : 'bg-teal-50 text-teal-800 border border-teal-200';
      case 'Compliance Report':
        return isDarkMode 
          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50' 
          : 'bg-emerald-100/70 text-emerald-900 border border-emerald-300';
      case 'Breeding Report':
        return isDarkMode 
          ? 'bg-rose-950/70 text-rose-300 border border-rose-800/40' 
          : 'bg-rose-50 text-rose-800 border border-rose-200';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  const getStatusBadge = (status: FacilityReport['status']) => {
    switch (status) {
      case 'Completed':
        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${
            isDarkMode 
              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' 
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            Completed
          </span>
        );
      case 'In Progress':
        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${
            isDarkMode 
              ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60' 
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            In Progress
          </span>
        );
      case 'Draft':
        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold space-x-1 ${
            isDarkMode 
              ? 'bg-slate-900/80 text-slate-400 border border-slate-700/60' 
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            <FileText className="w-3 h-3 mr-1" />
            <span>Draft</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center space-x-2 border border-emerald-400 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          {handleBack && (
            <button
              type="button"
              onClick={handleBack}
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
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm">
            <FileText className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Reports
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Official DENR Wildlife Breeding, Production, and Progenies Disposal Reports
            </p>
          </div>
        </div>
      </div>

      {/* 2. TOP STATUTORY REPORT CARDS (3 Cards: QBR Report, Monthly Production Report, Quarterly Progenies Disposal Report) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: QBR Report */}
        <button
          type="button"
          onClick={() => setReportViewTab('quarterly_breeding')}
          className={`p-4 rounded-2xl border transition-all text-left group cursor-pointer ${
            reportViewTab === 'quarterly_breeding'
              ? 'bg-emerald-950/40 border-emerald-500 shadow-lg ring-1 ring-emerald-500/40'
              : isDarkMode 
              ? 'bg-[#04150C] border-emerald-950/80 hover:border-emerald-500/50 shadow-sm hover:bg-emerald-950/20' 
              : 'bg-white border-slate-200 hover:border-emerald-500 shadow-2xs hover:shadow-md'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                reportViewTab === 'quarterly_breeding'
                  ? 'bg-emerald-500 text-white border-emerald-400'
                  : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
              }`}>
                <PawPrint className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-slate-400 block truncate">
                  QBR Report
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {stats.qbrCount}
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              CWR / WFP
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-emerald-950/60 flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>Quarterly Breeding & Parent Stock</span>
            <span className="text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform">
              {reportViewTab === 'quarterly_breeding' ? 'Active Tab ●' : 'Open Report →'}
            </span>
          </div>
        </button>

        {/* Card 2: Monthly Production Report */}
        <button
          type="button"
          onClick={() => setReportViewTab('monthly_production')}
          className={`p-4 rounded-2xl border transition-all text-left group cursor-pointer ${
            reportViewTab === 'monthly_production'
              ? 'bg-teal-950/40 border-teal-500 shadow-lg ring-1 ring-teal-500/40'
              : isDarkMode 
              ? 'bg-[#04150C] border-emerald-950/80 hover:border-teal-500/50 shadow-sm hover:bg-emerald-950/20' 
              : 'bg-white border-slate-200 hover:border-teal-500 shadow-2xs hover:shadow-md'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                reportViewTab === 'monthly_production'
                  ? 'bg-teal-500 text-white border-teal-400'
                  : 'bg-teal-500/20 border-teal-500/30 text-teal-400'
              }`}>
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-slate-400 block truncate">
                  Monthly Production Report
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {stats.monthlyProductionCount}
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Hatch Log
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-emerald-950/60 flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>Hatchery & Incubation Records</span>
            <span className="text-teal-400 font-bold group-hover:translate-x-0.5 transition-transform">
              {reportViewTab === 'monthly_production' ? 'Active Tab ●' : 'Open Report →'}
            </span>
          </div>
        </button>

        {/* Card 3: Quarterly Progenies Disposal Report */}
        <button
          type="button"
          onClick={() => setReportViewTab('progenies_disposal')}
          className={`p-4 rounded-2xl border transition-all text-left group cursor-pointer ${
            reportViewTab === 'progenies_disposal'
              ? 'bg-sky-950/40 border-sky-500 shadow-lg ring-1 ring-sky-500/40'
              : isDarkMode 
              ? 'bg-[#04150C] border-emerald-950/80 hover:border-sky-500/50 shadow-sm hover:bg-emerald-950/20' 
              : 'bg-white border-slate-200 hover:border-sky-500 shadow-2xs hover:shadow-md'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                reportViewTab === 'progenies_disposal'
                  ? 'bg-sky-500 text-white border-sky-400'
                  : 'bg-sky-500/20 border-sky-500/30 text-sky-400'
              }`}>
                <Truck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-slate-400 block truncate">
                  Quarterly Progenies Disposal Report
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {stats.progeniesDisposalCount}
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Disposition
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-emerald-950/60 flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>Sales, Transfers, Loans & CITES</span>
            <span className="text-sky-400 font-bold group-hover:translate-x-0.5 transition-transform">
              {reportViewTab === 'progenies_disposal' ? 'Active Tab ●' : 'Open Report →'}
            </span>
          </div>
        </button>
      </div>

      {/* VIEW: OFFICIAL DENR STATUTORY REPORTS */}
      {reportViewTab === 'quarterly_breeding' ? (
        <QuarterlyBreedingReportSection
          animals={animals}
          breedingRecords={breedingRecords}
          transfers={transfers}
          isDarkMode={isDarkMode}
        />
      ) : reportViewTab === 'monthly_production' ? (
        <MonthlyProductionReportSection
          animals={animals}
          breedingRecords={breedingRecords}
          isDarkMode={isDarkMode}
        />
      ) : (
        <ProgeniesDisposalReportSection
          animals={animals}
          transfers={transfers}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}
