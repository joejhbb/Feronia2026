import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Activity,
  FileText,
  Download,
  Search,
  X,
  ArrowLeft,
  Pill,
  Stethoscope,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Skull
} from 'lucide-react';
import { Animal, MedicalRecord, InventoryItem, StaffMember, resolveVeterinarianName } from '../../types';

interface VetReportsViewProps {
  animals: Animal[];
  medicalRecords: MedicalRecord[];
  inventory?: InventoryItem[];
  staffMembers?: StaffMember[];
  isDarkMode?: boolean;
  systemDate?: string;
  onNavigate?: (tab: 'dashboard' | 'animals' | 'medical-records' | 'appointments' | 'reports' | 'settings', filter?: string) => void;
  handleBack?: () => void;
  onBack?: () => void;
  onBackToDashboard?: () => void;
}

interface NecropsyRecord {
  id: string;
  animalId: string;
  animalName: string;
  species: string;
  date: string;
  etiology: string;
  status: 'Completed' | 'Pending Path' | 'Archived';
  grossFindings?: string;
  histopathology?: string;
  pathologist?: string;
  tissueSamples?: string[];
  disposalMethod?: string;
}

const INITIAL_NECROPSY_RECORDS: NecropsyRecord[] = [
  {
    id: 'MOR-004',
    animalId: 'BDR-001',
    animalName: 'Alduin',
    species: 'Central Bearded Dragon (Pogona vitticeps)',
    date: '2026-09-28',
    etiology: 'Advanced Renal Gout & Visceral Uricosis',
    status: 'Completed',
    grossFindings: 'Severe chalky uric acid precipitation on visceral pericardium and renal parenchyma. Advanced nephromegaly with bilateral pale cortical swelling.',
    histopathology: 'Multifocal to coalescing chronic interstitial nephritis with radiating tophaceous uric acid crystal rosettes. Secondary tubular necrosis.',
    pathologist: 'Dr. Vicente, DVM (Lead Pathologist)',
    tissueSamples: ['Kidney (Bilateral)', 'Myocardium', 'Liver Lobe'],
    disposalMethod: 'Sanitary Biological Incineration (Biohazard Protocol L3)'
  },
  {
    id: 'MOR-003',
    animalId: 'PYT-004',
    animalName: 'Jormungandr',
    species: 'Ball Python (Python regius)',
    date: '2026-09-14',
    etiology: 'Inclusion Body Disease (IBD) Neuropathy',
    status: 'Completed',
    grossFindings: 'Marked flaccidity, severe star-gazing reflex loss. Moderate stomatitis and splenomegaly. Brain edema present.',
    histopathology: 'Eosinophilic intracytoplasmic inclusion bodies confirmed within visceral and central nervous system neurons.',
    pathologist: 'Dr. Vicente, DVM',
    tissueSamples: ['Brain Cerebellum', 'Spinal Cord', 'Spleen'],
    disposalMethod: 'Deep Freeze Specimen Archive / Bio-Incineration'
  },
  {
    id: 'MOR-002',
    animalId: 'GEC-007',
    animalName: 'Eclipse',
    species: 'Leopard Gecko (Eublepharis macularius)',
    date: '2026-08-30',
    etiology: 'Severe Egg Binding (Dystocia) & Coelomitis',
    status: 'Completed',
    grossFindings: 'Two retained calcified oviductal eggs with coelomic rupture and fibrinous yolk coelomitis.',
    histopathology: 'Severe acute histiocytic yolk peritonitis with secondary vascular thrombosis.',
    pathologist: 'Dr. Vicente, DVM',
    tissueSamples: ['Oviduct', 'Coelomic Fluid Smear'],
    disposalMethod: 'Sanitary Bio-Incineration'
  },
  {
    id: 'MOR-001',
    animalId: 'TGT-002',
    animalName: 'Shelly',
    species: 'Greek Tortoise (Testudo graeca)',
    date: '2026-07-19',
    etiology: 'Upper Respiratory Tract Mycoplasmosis',
    status: 'Completed',
    grossFindings: 'Bilateral mucopurulent rhinitis, fibrinous tracheal casts, and consolidated lung fields.',
    histopathology: 'Severe proliferative rhinitis and interstitial pneumonia consistent with Mycoplasma agassizii.',
    pathologist: 'Dr. Vicente, DVM',
    tissueSamples: ['Nasal Turbinates', 'Lung Tissue'],
    disposalMethod: 'Sanitary Biological Incineration'
  }
];

export default function VetReportsView({
  animals = [],
  medicalRecords = [],
  inventory = [],
  isDarkMode = true,
  handleBack,
  onBack,
  onBackToDashboard
}: VetReportsViewProps) {
  const actualBack = handleBack || onBack || onBackToDashboard;
  // Global & filter states
  const [selectedDateFilter, setSelectedDateFilter] = useState('October 2026');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Table 1: Necropsy & Mortality State
  const [necropsyRecords] = useState<NecropsyRecord[]>(INITIAL_NECROPSY_RECORDS);
  const [necropsySearchQuery, setNecropsySearchQuery] = useState('');
  const [selectedNecropsyForView, setSelectedNecropsyForView] = useState<NecropsyRecord | null>(null);

  // Column 1: Consultation Log Search State
  const [consultSearchQuery, setConsultSearchQuery] = useState('');
  const [selectedConsultForView, setSelectedConsultForView] = useState<MedicalRecord | null>(null);



  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // -------------------------------------------------------------
  // Population Health Index KPI Calculations
  // -------------------------------------------------------------
  const activeAnimals = useMemo(() => animals.filter(a => !a.isArchived), [animals]);
  const totalMonitored = activeAnimals.length;

  const healthyCount = useMemo(() => {
    return activeAnimals.filter(a => (a.healthStatus || 'Healthy') === 'Healthy').length;
  }, [activeAnimals]);

  const observationCount = useMemo(() => {
    return activeAnimals.filter(a => a.healthStatus === 'Under Observation' || a.healthStatus === 'Quarantine' || a.healthStatus === 'Pending Checkup').length;
  }, [activeAnimals]);

  const sickCount = useMemo(() => {
    return activeAnimals.filter(a => a.healthStatus === 'Sick' || a.healthStatus === 'Injured' || a.healthStatus === 'Require Vet').length;
  }, [activeAnimals]);

  const criticalCount = useMemo(() => {
    return activeAnimals.filter(a => 
      a.healthStatus === 'Under Treatment' || 
      a.healthStatus === 'Critical'
    ).length;
  }, [activeAnimals]);

  const mortalityCount = necropsyRecords.length;

  const healthyPct = totalMonitored > 0 ? ((healthyCount / totalMonitored) * 100).toFixed(1) : '0.0';
  const obsPct = totalMonitored > 0 ? ((observationCount / totalMonitored) * 100).toFixed(1) : '0.0';
  const sickPct = totalMonitored > 0 ? ((sickCount / totalMonitored) * 100).toFixed(1) : '0.0';
  const critPct = totalMonitored > 0 ? ((criticalCount / totalMonitored) * 100).toFixed(1) : '0.0';
  const mortPct = totalMonitored > 0 ? ((mortalityCount / (totalMonitored + mortalityCount)) * 100).toFixed(1) : '0.0';

  // -------------------------------------------------------------
  // Filtered Necropsy Records
  // -------------------------------------------------------------
  const filteredNecropsy = useMemo(() => {
    const q = necropsySearchQuery.trim().toLowerCase();
    if (!q) return necropsyRecords;
    return necropsyRecords.filter(r =>
      r.id.toLowerCase().includes(q) ||
      r.animalId.toLowerCase().includes(q) ||
      r.animalName.toLowerCase().includes(q) ||
      r.species.toLowerCase().includes(q) ||
      r.etiology.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      (r.pathologist && r.pathologist.toLowerCase().includes(q))
    );
  }, [necropsyRecords, necropsySearchQuery]);

  // -------------------------------------------------------------
  // Filtered Consultations Log
  // -------------------------------------------------------------
  const filteredConsultations = useMemo(() => {
    const sorted = [...medicalRecords].sort((a, b) => {
      const dateA = a.recordDate || (a as any).createdOn || (a as any).createdAt || '';
      const dateB = b.recordDate || (b as any).createdOn || (b as any).createdAt || '';
      return dateB.localeCompare(dateA);
    });

    const q = consultSearchQuery.trim().toLowerCase();
    if (!q) return sorted.slice(0, 8);

    return sorted.filter(rec => {
      const animal = animals.find(a => a.id === rec.animalId);
      return (
        rec.id.toLowerCase().includes(q) ||
        rec.animalId.toLowerCase().includes(q) ||
        (animal?.name && animal.name.toLowerCase().includes(q)) ||
        (rec.clinicalObservation && rec.clinicalObservation.toLowerCase().includes(q)) ||
        (rec.treatment && rec.treatment.toLowerCase().includes(q)) ||
        (rec.recordType && rec.recordType.toLowerCase().includes(q))
      );
    }).slice(0, 12);
  }, [medicalRecords, animals, consultSearchQuery]);



  // -------------------------------------------------------------
  // Actions: PDF Export
  // -------------------------------------------------------------

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const vetName = localStorage.getItem('feronia_vet_name') || 'Dr. Vicente, DVM';
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Official Forest Green Banner
      doc.setFillColor(6, 26, 16); // #061A10 dark forest
      doc.rect(0, 0, pageWidth, 28, 'F');

      // Header Brand
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('FERONIA WILDLIFE SANCTUARY', 14, 13);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(52, 211, 153);
      doc.text('CLINICAL & MORTALITY AUDIT REPORT • VETERINARY HEALTH ARCHIVE', 14, 19);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`AUDIT PERIOD: ${selectedDateFilter.toUpperCase()}`, pageWidth - 14, 13, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(`Generated: ${new Date().toISOString().split('T')[0]} | Attending: ${vetName}`, pageWidth - 14, 19, { align: 'right' });

      // KPI Metric Row Summary
      doc.setFillColor(244, 247, 245);
      doc.rect(14, 34, pageWidth - 28, 20, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(14, 34, pageWidth - 28, 20, 'S');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('FACILITY POPULATION HEALTH INDEX SUMMARY', 18, 40);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`• Total Monitored: ${totalMonitored} animals`, 18, 48);
      doc.text(`• Healthy: ${healthyCount} (${healthyPct}%)`, 58, 48);
      doc.text(`• Observation: ${observationCount} (${obsPct}%)`, 95, 48);
      doc.text(`• Sick: ${sickCount} (${sickPct}%)`, 135, 48);
      doc.text(`• Critical: ${criticalCount} (${critPct}%)`, 168, 48);
      doc.text(`• Mortality Log: ${mortalityCount} cases`, 18, 52);

      // 1. Necropsy Records Table
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 60, 36);
      doc.text('1. POST-MORTEM & NECROPSY CLINICAL RECORDS', 14, 62);

      const necropsyRows = necropsyRecords.map(r => [
        r.id,
        r.animalName,
        r.species,
        r.date,
        r.etiology,
        r.status
      ]);

      autoTable(doc, {
        startY: 65,
        head: [['Case ID', 'Animal Specimen', 'Species', 'Date', 'Primary Cause', 'Status']],
        body: necropsyRows,
        theme: 'grid',
        headStyles: {
          fillColor: [6, 26, 16],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [30, 41, 59]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { left: 14, right: 14 }
      });



      // Signature Seal
      const finalY = ((doc as any).lastAutoTable?.finalY || 220) + 10;
      const signatureY = Math.min(finalY, pageHeight - 30);

      doc.setDrawColor(203, 213, 225);
      doc.line(14, signatureY, pageWidth - 14, signatureY);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('CERTIFIED CLINICAL & PATHOLOGY REPORT • FERONIA WILDLIFE SANCTUARY', 14, signatureY + 5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(vetName, pageWidth - 14, signatureY + 5, { align: 'right' });

      doc.save(`clinical_mortality_report_${selectedDateFilter.replace(/\s+/g, '_')}.pdf`);
      showToast('✓ PDF Report exported successfully');
    } catch (err) {
      console.error('PDF error:', err);
      showToast('Failed to export PDF.');
    }
  };

  return (
    <div className={`space-y-6 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center space-x-2 border border-emerald-400 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. HEADER & NAVIGATION REFINEMENT */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Back button, Breadcrumb & Title */}
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            {actualBack && (
              <button
                type="button"
                onClick={actualBack}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                  isDarkMode
                    ? 'border-emerald-950/70 bg-[#06180F] hover:bg-[#092816] text-emerald-300 hover:text-white'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-2xs'
                }`}
                title="Go Back"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
            <span className="text-xs font-mono text-emerald-500/80 dark:text-emerald-400/90 tracking-wider uppercase font-semibold">
              REPORTS / CLINICAL & MORTALITY AUDITS
            </span>
          </div>

          <div className="flex items-center space-x-3 pt-1">
            <div className={`w-10 h-10 rounded-xl p-2 flex items-center justify-center shrink-0 border ${
              isDarkMode
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Clinical & Mortality Reports
              </h1>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Facility population health index and certified necropsy findings.
              </p>
            </div>
          </div>
        </div>

        {/* Top-Right Controls */}
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          {/* Date Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedDateFilter}
              onChange={e => setSelectedDateFilter(e.target.value)}
              className={`pl-3 pr-8 py-2 rounded-xl border text-xs font-semibold outline-none transition-colors cursor-pointer appearance-none ${
                isDarkMode
                  ? 'bg-[#06180F] border-emerald-950/80 text-emerald-200 hover:border-emerald-700/60'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <option value="October 2026">October 2026</option>
              <option value="September 2026">September 2026</option>
              <option value="Q3 2026 (Jul-Sep)">Q3 2026 (Jul-Sep)</option>
              <option value="Q2 2026 (Apr-Jun)">Q2 2026 (Apr-Jun)</option>
              <option value="All Time YTD">All Time YTD</option>
            </select>
            <Calendar className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
              isDarkMode ? 'text-emerald-400/70' : 'text-slate-500'
            }`} />
          </div>

          {/* Compact PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95 ${
              isDarkMode
                ? 'bg-[#06180F] hover:bg-[#092816] text-emerald-300 hover:text-white border-emerald-950/80 hover:border-emerald-700/60'
                : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 shadow-2xs'
            }`}
            title="Download PDF audit report"
          >
            <Download className={`w-3.5 h-3.5 ${isDarkMode ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span>PDF</span>
          </button>


        </div>
      </div>

      {/* 2. POPULATION HEALTH INDEX (HERO KPI CARD) */}
      <div className={`p-5 sm:p-6 rounded-2xl border shadow-sm space-y-4 ${
        isDarkMode ? 'bg-[#06180F] border-emerald-950/70' : 'bg-white border-slate-200'
      }`}>
        {/* Card Header with Pill Metadata & Aggregate Status */}
        <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-3.5 ${
          isDarkMode ? 'border-emerald-950/60' : 'border-slate-100'
        }`}>
          <div className="flex items-center space-x-2.5">
            <h2 className={`text-sm font-bold uppercase tracking-wider ${
              isDarkMode ? 'text-emerald-100' : 'text-slate-800'
            }`}>
              Population Health Index
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
              isDarkMode
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              {totalMonitored} Monitored
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
              isDarkMode
                ? 'text-emerald-300 bg-emerald-950/80 border-emerald-800/50'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            }`}>
              {healthyPct}% Healthy
            </span>
          </div>
        </div>

        {/* Slim Multi-Segmented Progress Bar */}
        <div className="space-y-1.5">
          <div className={`h-2.5 w-full rounded-full overflow-hidden flex border ${
            isDarkMode ? 'bg-[#04110A] border-emerald-950' : 'bg-slate-100 border-slate-200'
          }`}>
            <div
              style={{ width: `${healthyPct}%` }}
              className="bg-emerald-500 h-full transition-all"
              title={`Healthy: ${healthyCount} (${healthyPct}%)`}
            />
            <div
              style={{ width: `${obsPct}%` }}
              className="bg-amber-500 h-full transition-all"
              title={`Observation: ${observationCount} (${obsPct}%)`}
            />
            <div
              style={{ width: `${sickPct}%` }}
              className="bg-orange-500 h-full transition-all"
              title={`Sick: ${sickCount} (${sickPct}%)`}
            />
            <div
              style={{ width: `${critPct}%` }}
              className="bg-rose-500 h-full transition-all"
              title={`Critical: ${criticalCount} (${critPct}%)`}
            />
            <div
              style={{ width: `${mortPct}%` }}
              className="bg-purple-500 h-full transition-all"
              title={`Mortality Log: ${mortalityCount} cases`}
            />
          </div>
          <div className={`flex items-center justify-between text-[10px] font-mono ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            <span>0%</span>
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center space-x-1 text-emerald-500 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Healthy</span>
              </span>
              <span className="inline-flex items-center space-x-1 text-amber-500 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Observation</span>
              </span>
              <span className="inline-flex items-center space-x-1 text-orange-500 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                <span>Sick</span>
              </span>
              <span className="inline-flex items-center space-x-1 text-rose-500 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>Critical</span>
              </span>
              <span className="inline-flex items-center space-x-1 text-purple-500 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                <span>Mortality</span>
              </span>
            </div>
            <span>100%</span>
          </div>
        </div>

        {/* Stat Cards Grid: 5 Equal-Width Columns with Accent Borders */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 pt-1">
          {/* Card 1: Healthy */}
          <div className={`p-4 rounded-xl border border-l-4 border-l-emerald-500 space-y-1 ${
            isDarkMode ? 'bg-[#071F11] border-emerald-950/80 hover:border-emerald-700/60' : 'bg-slate-50/80 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Healthy
              </span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                isDarkMode
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/40'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}>
                {healthyPct}%
              </span>
            </div>
            <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {healthyCount}
            </div>
            <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Active breeding & exhibits</p>
          </div>

          {/* Card 2: Observation */}
          <div className={`p-4 rounded-xl border border-l-4 border-l-amber-500 space-y-1 ${
            isDarkMode ? 'bg-[#071F11] border-amber-950/70 hover:border-amber-700/60' : 'bg-slate-50/80 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Observation
              </span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                isDarkMode
                  ? 'bg-amber-950/70 text-amber-300 border-amber-800/40'
                  : 'bg-amber-100 text-amber-800 border-amber-200'
              }`}>
                {obsPct}%
              </span>
            </div>
            <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {observationCount}
            </div>
            <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Post-shed & appetite watch</p>
          </div>

          {/* Card 3: Sick */}
          <div className={`p-4 rounded-xl border border-l-4 border-l-orange-500 space-y-1 ${
            isDarkMode ? 'bg-[#071F11] border-orange-950/70 hover:border-orange-700/60' : 'bg-slate-50/80 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                Sick
              </span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                isDarkMode
                  ? 'bg-orange-950/70 text-orange-300 border-orange-800/40'
                  : 'bg-orange-100 text-orange-800 border-orange-200'
              }`}>
                {sickPct}%
              </span>
            </div>
            <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {sickCount}
            </div>
            <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Diagnosed illness & therapy</p>
          </div>

          {/* Card 4: Critical */}
          <div className={`p-4 rounded-xl border border-l-4 border-l-rose-500 space-y-1 ${
            isDarkMode ? 'bg-[#071F11] border-rose-950/70 hover:border-rose-700/60' : 'bg-slate-50/80 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Critical
              </span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                isDarkMode
                  ? 'bg-rose-950/70 text-rose-300 border-rose-800/40'
                  : 'bg-rose-100 text-rose-800 border-rose-200'
              }`}>
                {critPct}%
              </span>
            </div>
            <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {criticalCount}
            </div>
            <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Intensive care & treatment</p>
          </div>

          {/* Card 5: Mortality */}
          <div className={`p-4 rounded-xl border border-l-4 border-l-purple-500 space-y-1 ${
            isDarkMode ? 'bg-[#071F11] border-purple-950/70 hover:border-purple-700/60' : 'bg-slate-50/80 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Mortality
              </span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                isDarkMode
                  ? 'bg-purple-950/70 text-purple-300 border-purple-800/40'
                  : 'bg-purple-100 text-purple-800 border-purple-200'
              }`}>
                YTD
              </span>
            </div>
            <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {mortalityCount}
            </div>
            <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Necropsy records audited</p>
          </div>
        </div>
      </div>

      {/* 3. TABLE COMPONENT: NECROPSY & MORTALITY RECORDS (Strictly View-Only for Veterinarian) */}
      <div className={`p-5 sm:p-6 rounded-2xl border shadow-sm space-y-4 ${
        isDarkMode ? 'bg-[#06180F] border-emerald-950/70' : 'bg-white border-slate-200'
      }`}>
        {/* Table Header & Controls (View-Only Records for Veterinarian) */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5 ${
          isDarkMode ? 'border-emerald-950/60' : 'border-slate-100'
        }`}>
          <div>
            <div className="flex items-center space-x-2">
              <Skull className="w-4 h-4 text-purple-400" />
              <h2 className={`text-xs font-bold uppercase tracking-wider ${
                isDarkMode ? 'text-emerald-100' : 'text-slate-800'
              }`}>
                Necropsy & Mortality Records
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                isDarkMode
                  ? 'bg-purple-950/80 text-purple-300 border-purple-800/50'
                  : 'bg-purple-100 text-purple-800 border-purple-200'
              }`}>
                {filteredNecropsy.length}
              </span>
            </div>
            <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Post-mortem pathology examinations, anatomical cause of death, and biological disposal logs.
            </p>
          </div>

          {/* Search Filter Controls */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                isDarkMode ? 'text-emerald-500/70' : 'text-slate-400'
              }`} />
              <input
                type="text"
                placeholder="Filter records..."
                value={necropsySearchQuery}
                onChange={e => setNecropsySearchQuery(e.target.value)}
                className={`w-full pl-8 pr-7 py-1.5 rounded-xl border text-xs outline-none transition-all ${
                  isDarkMode
                    ? 'bg-[#04110A] border-emerald-950/80 text-emerald-100 placeholder:text-emerald-900 focus:border-purple-500/60'
                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-purple-500'
                }`}
              />
              {necropsySearchQuery && (
                <button
                  type="button"
                  onClick={() => setNecropsySearchQuery('')}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs cursor-pointer ${
                    isDarkMode ? 'text-emerald-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className={`overflow-x-auto rounded-xl border ${
          isDarkMode ? 'border-emerald-950/80 bg-[#04110A]/50' : 'border-slate-200 bg-white shadow-2xs'
        }`}>
          <table className="w-full text-left text-xs">
            <thead className={`font-semibold border-b uppercase tracking-wider text-[10px] ${
              isDarkMode
                ? 'bg-[#05160E] text-emerald-400 border-emerald-950/80'
                : 'bg-[#F2ECE1] text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="px-4 py-3">ID / Animal</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Cause of Death</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${
              isDarkMode ? 'divide-emerald-950/40 text-slate-300' : 'divide-slate-200/80 text-slate-800 bg-white'
            }`}>
              {filteredNecropsy.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`px-4 py-8 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    <Skull className="w-6 h-6 mx-auto mb-2 opacity-30 text-purple-400" />
                    <span>No necropsy records found matching criteria.</span>
                  </td>
                </tr>
              ) : (
                filteredNecropsy.map(record => (
                  <tr
                    key={record.id}
                    className={`transition-colors ${
                      isDarkMode ? 'hover:bg-emerald-950/30' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* ID / Animal */}
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-xs">
                          {record.id}
                        </span>
                        <span className={isDarkMode ? 'text-emerald-700' : 'text-slate-400'}>•</span>
                        <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {record.animalName || record.animalId}
                        </span>
                        <span className={`text-[10px] truncate max-w-[140px] ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          ({record.species})
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className={`px-4 py-3 font-mono text-[11px] ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                      {record.date}
                    </td>

                    {/* Etiology Badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        isDarkMode
                          ? 'bg-[#06180F] text-slate-200 border-emerald-950/70'
                          : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}>
                        {record.etiology}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center space-x-1.5 text-xs font-semibold ${
                        record.status === 'Completed'
                          ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-700')
                          : (isDarkMode ? 'text-amber-400' : 'text-amber-700')
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          record.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                        }`} />
                        <span>{record.status}</span>
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedNecropsyForView(record)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center space-x-1 cursor-pointer border ${
                          isDarkMode
                            ? 'text-emerald-300 hover:text-white bg-[#06180F] hover:bg-emerald-900/40 border-emerald-900/50'
                            : 'text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border-slate-200 shadow-2xs'
                        }`}
                      >
                        <span>View Report</span>
                        <ChevronRight className="w-3 h-3 opacity-60" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. BOTTOM GRID LAYOUT (SINGLE-COLUMN FULL-WIDTH) */}
      <div className="grid grid-cols-1 gap-6">

        {/* Veterinary Consultation Log (Historical & Active Records) */}
        <div className={`p-5 sm:p-6 rounded-2xl border shadow-sm flex flex-col justify-between space-y-4 ${
          isDarkMode ? 'bg-[#06180F] border-emerald-950/70' : 'bg-white border-slate-200'
        }`}>
          <div className="space-y-3">
            {/* Header & Integrated Search */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b pb-3 ${
              isDarkMode ? 'border-emerald-950/60' : 'border-slate-100'
            }`}>
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h2 className={`text-xs font-bold uppercase tracking-wider ${
                  isDarkMode ? 'text-emerald-100' : 'text-slate-800'
                }`}>
                  Veterinary Consultation Log
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  isDarkMode
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {filteredConsultations.length}
                </span>
              </div>

              {/* Integrated Search Input */}
              <div className="relative w-full sm:w-48">
                <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                  isDarkMode ? 'text-emerald-500/70' : 'text-slate-400'
                }`} />
                <input
                  type="text"
                  placeholder="Search consultations..."
                  value={consultSearchQuery}
                  onChange={e => setConsultSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-7 py-1 rounded-xl border text-xs outline-none transition-all ${
                    isDarkMode
                      ? 'bg-[#04110A] border-emerald-950/80 text-emerald-100 placeholder:text-emerald-900 focus:border-emerald-500/60'
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                  }`}
                />
                {consultSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setConsultSearchQuery('')}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs cursor-pointer ${
                      isDarkMode ? 'text-emerald-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Feed-Style Cards List */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredConsultations.length === 0 ? (
                <div className={`py-12 text-center text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <FileText className="w-6 h-6 mx-auto mb-2 opacity-30 text-emerald-400" />
                  <span>No consultations match your search.</span>
                </div>
              ) : (
                filteredConsultations.map(rec => {
                  const patient = animals.find(a => a.id === rec.animalId);
                  const isHealthy = (patient?.healthStatus || 'Healthy') === 'Healthy';
                  const isArchived = patient?.isArchived;

                  return (
                    <div
                      key={rec.id}
                      onClick={() => setSelectedConsultForView(rec)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 group ${
                        isDarkMode
                          ? 'bg-[#04110A] border-emerald-950/80 hover:border-emerald-700/60 hover:bg-[#071F11]'
                          : 'bg-slate-50/70 border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`font-bold text-xs group-hover:text-emerald-400 transition-colors ${
                            isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            {patient ? `${patient.id} "${patient.name || 'Specimen'}"` : rec.animalId}
                          </span>
                          <span className={`text-[10px] font-mono ${
                            isDarkMode ? 'text-emerald-400/60' : 'text-slate-400'
                          }`}>
                            ({patient?.species?.split(' ')[0] || 'Reptile'})
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                            isArchived
                              ? isDarkMode
                                ? 'bg-purple-950/70 text-purple-300 border-purple-800/40'
                                : 'bg-purple-100 text-purple-800 border-purple-200'
                              : (patient?.healthStatus === 'Under Observation' || patient?.healthStatus === 'Quarantine')
                              ? isDarkMode
                                ? 'bg-blue-950/70 text-blue-300 border-blue-800/40'
                                : 'bg-blue-100 text-blue-800 border-blue-200'
                              : patient?.healthStatus === 'Under Treatment'
                              ? isDarkMode
                                ? 'bg-amber-950/70 text-amber-300 border-amber-800/40'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                              : patient?.healthStatus === 'Injured'
                              ? isDarkMode
                                ? 'bg-orange-950/70 text-orange-300 border-orange-800/40'
                                : 'bg-orange-100 text-orange-800 border-orange-200'
                              : (patient?.healthStatus === 'Sick' || patient?.healthStatus === 'Critical')
                              ? isDarkMode
                                ? 'bg-rose-950/70 text-rose-300 border-rose-800/40'
                                : 'bg-rose-100 text-rose-800 border-rose-200'
                              : isDarkMode
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/40'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}>
                            {isArchived ? 'Archived' : (patient?.healthStatus === 'Healthy' ? 'Healthy (Cleared)' : patient?.healthStatus || 'Healthy')}
                          </span>
                        </div>

                        <span className={`font-mono text-[11px] ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {rec.recordDate}
                        </span>
                      </div>

                      {/* Concise single-line medical observation & treatment */}
                      <p className={`text-[11px] truncate ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-600'
                      }`}>
                        <span className={`font-semibold ${isDarkMode ? 'text-emerald-500' : 'text-slate-400'}`}>Obs:</span> {rec.clinicalObservation || rec.purpose || 'Routine health examination verified.'}
                        {rec.treatment ? <span className="text-emerald-400 ml-1.5">• <strong className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Rx:</strong> {rec.treatment}</span> : null}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================================
          MODALS SECTION
          ========================================================== */}

      {/* 1. View Necropsy Detail Modal */}
      {selectedNecropsyForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className={`border rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-start justify-between border-b pb-3 ${
              isDarkMode ? 'border-emerald-950/60 bg-[#04110A] -mx-6 -mt-6 p-6 rounded-t-2xl' : 'border-slate-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                  isDarkMode
                    ? 'bg-purple-950/60 border-purple-800/60 text-purple-400'
                    : 'bg-purple-100 border-purple-200 text-purple-700'
                }`}>
                  <Skull className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Necropsy Case #{selectedNecropsyForView.id}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      isDarkMode
                        ? 'bg-purple-950 text-purple-300 border-purple-800'
                        : 'bg-purple-100 text-purple-800 border-purple-200'
                    }`}>
                      {selectedNecropsyForView.status}
                    </span>
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Specimen: {selectedNecropsyForView.animalName} ({selectedNecropsyForView.species})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNecropsyForView(null)}
                className={`p-1 rounded-lg cursor-pointer ${
                  isDarkMode ? 'text-slate-400 hover:text-white hover:bg-emerald-950/60' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className={`grid grid-cols-2 gap-3 p-3 rounded-xl border ${
                isDarkMode ? 'bg-[#04110A] border-emerald-950/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-emerald-500/70' : 'text-slate-400'}`}>Date of Exam</span>
                  <span className={`font-mono font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedNecropsyForView.date}</span>
                </div>
                <div>
                  <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-emerald-500/70' : 'text-slate-400'}`}>Pathologist / Vet</span>
                  <span className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedNecropsyForView.pathologist || 'Dr. Vicente, DVM'}</span>
                </div>
              </div>

              <div>
                <span className={`text-[10px] uppercase font-bold block mb-1 ${isDarkMode ? 'text-emerald-500/70' : 'text-slate-400'}`}>Primary Cause of Death</span>
                <div className={`p-3 rounded-xl border font-semibold ${
                  isDarkMode
                    ? 'bg-purple-950/30 border-purple-800/40 text-purple-200'
                    : 'bg-purple-50 border-purple-200 text-purple-800'
                }`}>
                  {selectedNecropsyForView.etiology}
                </div>
              </div>

              {selectedNecropsyForView.grossFindings && (
                <div>
                  <span className={`text-[10px] uppercase font-bold block mb-1 ${isDarkMode ? 'text-emerald-500/70' : 'text-slate-400'}`}>Gross Pathology Findings</span>
                  <p className={`p-3 rounded-xl border leading-relaxed ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    {selectedNecropsyForView.grossFindings}
                  </p>
                </div>
              )}

              {selectedNecropsyForView.histopathology && (
                <div>
                  <span className={`text-[10px] uppercase font-bold block mb-1 ${isDarkMode ? 'text-emerald-500/70' : 'text-slate-400'}`}>Histopathology & Tissue Analysis</span>
                  <p className={`p-3 rounded-xl border leading-relaxed ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    {selectedNecropsyForView.histopathology}
                  </p>
                </div>
              )}

              {selectedNecropsyForView.tissueSamples && selectedNecropsyForView.tissueSamples.length > 0 && (
                <div>
                  <span className={`text-[10px] uppercase font-bold block mb-1 ${isDarkMode ? 'text-emerald-500/70' : 'text-slate-400'}`}>Tissue Samples Submitted</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {selectedNecropsyForView.tissueSamples.map(t => (
                      <span key={t} className={`px-2.5 py-0.5 rounded-md border text-[10px] font-mono ${
                        isDarkMode
                          ? 'bg-[#04110A] text-emerald-300 border-emerald-900/60'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={`flex justify-end space-x-2 pt-3 border-t ${
              isDarkMode ? 'border-emerald-950/60' : 'border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setSelectedNecropsyForView(null)}
                className={`px-4 py-2 rounded-xl font-semibold text-xs cursor-pointer border ${
                  isDarkMode ? 'bg-[#04110A] hover:bg-emerald-950 text-slate-300 border-emerald-950' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Close
              </button>

            </div>
          </div>
        </div>
      )}

      {/* 2. View Consultation Details Modal */}
      {selectedConsultForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className={`border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-start justify-between border-b pb-3 ${
              isDarkMode ? 'border-emerald-950/60 bg-[#04110A] -mx-6 -mt-6 p-6 rounded-t-2xl' : 'border-slate-200'
            }`}>
              <div className="flex items-center space-x-2.5">
                <Stethoscope className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Consultation #{selectedConsultForView.id}
                  </h3>
                  <span className={`text-xs font-mono ${isDarkMode ? 'text-emerald-400/80' : 'text-slate-500'}`}>
                    Date: {selectedConsultForView.recordDate}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConsultForView(null)}
                className={`p-1 rounded-lg cursor-pointer ${
                  isDarkMode ? 'text-slate-400 hover:text-white hover:bg-emerald-950/60' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className={`p-3 rounded-xl border ${
                isDarkMode ? 'bg-[#04110A] border-emerald-950/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-emerald-500/70' : 'text-slate-400'}`}>Patient</span>
                <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {animals.find(a => a.id === selectedConsultForView.animalId)?.name || selectedConsultForView.animalId} ({selectedConsultForView.animalId})
                </span>
              </div>

              <div>
                <span className={`text-[10px] uppercase font-bold block mb-1 ${isDarkMode ? 'text-emerald-500/70' : 'text-slate-400'}`}>Record Type</span>
                <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                  isDarkMode ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}>
                  {selectedConsultForView.recordType || 'Routine Consultation'}
                </span>
              </div>

              <div>
                <span className={`text-[10px] uppercase font-bold block mb-1 ${isDarkMode ? 'text-emerald-500/70' : 'text-slate-400'}`}>Clinical Observations</span>
                <p className={`p-3 rounded-xl border leading-relaxed ${
                  isDarkMode ? 'bg-[#04110A] border-emerald-950/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  {selectedConsultForView.clinicalObservation || selectedConsultForView.purpose || 'No extensive notes recorded.'}
                </p>
              </div>

              {selectedConsultForView.treatment && (
                <div>
                  <span className={`text-[10px] uppercase font-bold block mb-1 ${isDarkMode ? 'text-emerald-500/70' : 'text-slate-400'}`}>Prescribed Treatment / Therapy</span>
                  <p className={`p-3 rounded-xl border leading-relaxed font-mono ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950/80 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}>
                    {selectedConsultForView.treatment}
                  </p>
                </div>
              )}
            </div>

            <div className={`flex justify-end pt-3 border-t ${
              isDarkMode ? 'border-emerald-950/60' : 'border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setSelectedConsultForView(null)}
                className={`px-4 py-2 rounded-xl font-semibold text-xs cursor-pointer border ${
                  isDarkMode ? 'bg-[#04110A] hover:bg-emerald-950 text-slate-300 border-emerald-950' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
