import React, { useState, useMemo, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FileText,
  Calendar,
  Printer,
  Download,
  FileSpreadsheet,
  RotateCcw,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Building,
  Sparkles,
  Sliders
} from 'lucide-react';
import { Animal, BreedingRecord } from '../../../types';
import { saveRecord, firestoreGet } from '../../../lib/dbClient';

export interface ProductionLogItem {
  id: string;
  number: number;
  dateLaid: string;
  dateHatched: string;
  markings: string; // Legband, Microchip, etc.
  sex: string; // M, F, N/A, Temp-Dependent
  locationCageNo: string;
  parentMaleMarking: string;
  parentFemaleMarking: string;
  parentCageNumber: string;
  remarks: string;
}

export interface MonthlyProductionMetadata {
  facilityName: string;
  permitteeName: string;
  address: string;
  contactNo: string;
  cwrWfpNo: string;
  periodCovered: string;
  speciesName: string;
  scientificName: string;
  submittedBy: string;
  validatedBy: string;
}

// Generate production items directly from facility data for a given species
export const generateSystemProductionItems = (
  speciesName: string,
  breedingRecords: BreedingRecord[] = [],
  animals: Animal[] = []
): ProductionLogItem[] => {
  const lower = (speciesName || '').trim().toLowerCase();
  if (!lower) return [];

  // 1. Check live breeding records for this species with hatchlings
  const speciesBreeding = breedingRecords.filter(
    b => (b.species || '').trim().toLowerCase() === lower && (b.hatchlings || 0) > 0
  );

  const items: ProductionLogItem[] = [];
  let counter = 1;

  if (speciesBreeding.length > 0) {
    speciesBreeding.forEach(rec => {
      const count = rec.hatchlings || 1;
      for (let i = 0; i < count; i++) {
        items.push({
          id: `sys-hatch-${rec.id}-${i + 1}`,
          number: counter++,
          dateLaid: rec.clutchDate || rec.breedingDate || '2026-06-15',
          dateHatched: rec.hatchDate || new Date().toISOString().split('T')[0],
          markings: `PROG-${rec.femaleId?.substring(0, 3) || 'SAN'}-${counter}`,
          sex: 'N/A',
          locationCageNo: 'INC-A1',
          parentMaleMarking: rec.maleId || 'Male Sire',
          parentFemaleMarking: rec.femaleId || 'Female Dam',
          parentCageNumber: 'MF-ENCL-01',
          remarks: rec.notes || 'Captive-Bred Offspring'
        });
      }
    });
    return items;
  }

  // 2. Check animals of this species that are registered
  const speciesAnimals = animals.filter(
    a => !a.isArchived && (a.species || '').trim().toLowerCase() === lower
  );

  if (speciesAnimals.length > 0) {
    speciesAnimals.forEach(a => {
      items.push({
        id: `sys-anim-${a.id}`,
        number: counter++,
        dateLaid: a.dob || '2025-10-10',
        dateHatched: a.dob || '2025-12-15',
        markings: a.id,
        sex: a.sex === 'Male' ? 'M' : a.sex === 'Female' ? 'F' : 'N/A',
        locationCageNo: a.enclosureId || 'ENCL-01',
        parentMaleMarking: 'Verified Sire',
        parentFemaleMarking: 'Verified Dam',
        parentCageNumber: a.enclosureId || 'BREED-01',
        remarks: `${a.morph || 'Normal'} (${a.breedingStatus || 'Active'})`
      });
    });
    return items;
  }

  // 3. Fallback: 1 clean initial entry
  return [
    {
      id: `prod-item-1`,
      number: 1,
      dateLaid: new Date().toISOString().split('T')[0],
      dateHatched: new Date().toISOString().split('T')[0],
      markings: 'TAG-01',
      sex: 'N/A',
      locationCageNo: 'INC-01',
      parentMaleMarking: 'Sire',
      parentFemaleMarking: 'Dam',
      parentCageNumber: 'ENCL-01',
      remarks: 'Captive Bred'
    }
  ];
};

interface MonthlyProductionReportSectionProps {
  animals: Animal[];
  breedingRecords: BreedingRecord[];
  isDarkMode: boolean;
}

export default function MonthlyProductionReportSection({
  animals,
  breedingRecords,
  isDarkMode
}: MonthlyProductionReportSectionProps) {
  // Extract all unique species registered in facility
  const uniqueFacilitySpecies = useMemo(() => {
    const map = new Map<string, { common: string; scientific: string }>();
    animals.forEach(a => {
      if (a.species && !a.isArchived) {
        const key = a.species.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            common: a.species.trim(),
            scientific: a.scientificName?.trim() || a.species.trim()
          });
        }
      }
    });
    return Array.from(map.values());
  }, [animals]);

  const [metadata, setMetadata] = useState<MonthlyProductionMetadata>(() => {
    const firstSpecies = uniqueFacilitySpecies[0];
    const initialMeta: MonthlyProductionMetadata = {
      facilityName: 'Flightless Dragons / Judaea Tobiah Vapor',
      permitteeName: 'Judaea Tobiah L. Vapor',
      address: 'Block 9 Lot 5, Holly Street, Madera Grove Estates, Dakila, Malolos City, Bulacan',
      contactNo: '9270347985',
      cwrWfpNo: 'III-2023-076',
      periodCovered: '4th Quarter 2025 (Oct-Dec)',
      speciesName: firstSpecies?.common || 'No Registered Species',
      scientificName: firstSpecies?.scientific || 'N/A',
      submittedBy: 'Judaea Tobiah L. Vapor',
      validatedBy: ''
    };

    const saved = localStorage.getItem('feronia_monthly_production_meta_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...initialMeta, ...parsed };
      } catch {}
    }
    return initialMeta;
  });

  // Strict synchronization: If the selected species in metadata is not in uniqueFacilitySpecies, update to the active facility species
  useEffect(() => {
    if (uniqueFacilitySpecies.length === 0) return;
    const exists = uniqueFacilitySpecies.some(
      s => s.common.toLowerCase() === (metadata.speciesName || '').toLowerCase()
    );
    if (!exists) {
      const active = uniqueFacilitySpecies[0];
      setMetadata(prev => ({
        ...prev,
        speciesName: active.common,
        scientificName: active.scientific
      }));
    }
  }, [uniqueFacilitySpecies, metadata.speciesName]);

  const [items, setItems] = useState<ProductionLogItem[]>(() => {
    const sp = uniqueFacilitySpecies[0]?.common || 'Bearded Dragon';
    const saved = localStorage.getItem(`feronia_monthly_prod_items_${sp.toLowerCase()}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return generateSystemProductionItems(sp, breedingRecords, animals);
  });

  // Database Synchronization: Load saved monthly production report from Firestore/Supabase
  useEffect(() => {
    let isMounted = true;
    const reportDocId = `monthly_prod_${(metadata.speciesName || 'spec').toLowerCase().replace(/\s+/g, '_')}`;
    firestoreGet<any>('statutory_reports', reportDocId).then(dbReport => {
      if (!isMounted) return;
      if (!dbReport) {
        // Fallback check generic monthly_prod_report
        firestoreGet<any>('statutory_reports', 'monthly_prod_report').then(genReport => {
          if (!isMounted || !genReport) return;
          try {
            if (genReport.metadata) {
              const parsedMeta = typeof genReport.metadata === 'string' ? JSON.parse(genReport.metadata) : genReport.metadata;
              setMetadata(prev => ({ ...prev, ...parsedMeta }));
            }
            if (genReport.rows) {
              const parsedRows = typeof genReport.rows === 'string' ? JSON.parse(genReport.rows) : genReport.rows;
              if (Array.isArray(parsedRows) && parsedRows.length > 0) setItems(parsedRows);
            }
          } catch {}
        });
        return;
      }
      try {
        if (dbReport.metadata) {
          const parsedMeta = typeof dbReport.metadata === 'string' ? JSON.parse(dbReport.metadata) : dbReport.metadata;
          setMetadata(prev => ({ ...prev, ...parsedMeta }));
        }
        if (dbReport.rows) {
          const parsedRows = typeof dbReport.rows === 'string' ? JSON.parse(dbReport.rows) : dbReport.rows;
          if (Array.isArray(parsedRows) && parsedRows.length > 0) setItems(parsedRows);
        }
      } catch (err) {
        console.warn('Error reading monthly prod report from database:', err);
      }
    });
    return () => { isMounted = false; };
  }, [metadata.speciesName]);

  // Update items when species selection changes or live records update
  useEffect(() => {
    if (!metadata.speciesName) return;
    const spKey = metadata.speciesName.toLowerCase();
    const saved = localStorage.getItem(`feronia_monthly_prod_items_${spKey}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          return;
        }
      } catch {}
    }
    setItems(generateSystemProductionItems(metadata.speciesName, breedingRecords, animals));
  }, [metadata.speciesName, breedingRecords, animals]);

  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSave = () => {
    localStorage.setItem('feronia_monthly_production_meta_v1', JSON.stringify(metadata));
    if (metadata.speciesName) {
      localStorage.setItem(`feronia_monthly_prod_items_${metadata.speciesName.toLowerCase()}`, JSON.stringify(items));
    }
    saveRecord('statutory_reports', {
      id: `monthly_prod_${(metadata.speciesName || 'spec').toLowerCase().replace(/\s+/g, '_')}`,
      reportType: 'Monthly Production',
      speciesName: metadata.speciesName,
      itemsCount: items.length,
      metadata: JSON.stringify(metadata),
      rows: JSON.stringify(items),
      updatedAt: new Date().toISOString(),
      updatedBy: metadata.submittedBy || 'Administrator'
    });
    showToast(`✓ Monthly Production Report for ${metadata.speciesName} saved to database successfully!`);
  };

  const handleReset = () => {
    if (window.confirm(`Reset production report entries for ${metadata.speciesName} to live system data?`)) {
      const liveItems = generateSystemProductionItems(metadata.speciesName, breedingRecords, animals);
      setItems(liveItems);
      if (metadata.speciesName) {
        localStorage.setItem(`feronia_monthly_prod_items_${metadata.speciesName.toLowerCase()}`, JSON.stringify(liveItems));
      }
      showToast(`✓ Reset entries for ${metadata.speciesName}.`);
    }
  };

  const handleCellChange = (id: string, field: keyof ProductionLogItem, value: any) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddItem = () => {
    const nextNum = items.length + 1;
    const newItem: ProductionLogItem = {
      id: `prod-item-${Date.now()}`,
      number: nextNum,
      dateLaid: new Date().toISOString().split('T')[0],
      dateHatched: new Date().toISOString().split('T')[0],
      markings: 'N/A',
      sex: 'N/A',
      locationCageNo: 'N/A',
      parentMaleMarking: 'N/A',
      parentFemaleMarking: 'N/A',
      parentCageNumber: 'N/A',
      remarks: 'N/A'
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => {
      const filtered = prev.filter(item => item.id !== id);
      return filtered.map((item, idx) => ({ ...item, number: idx + 1 }));
    });
  };

  // Sync with Live Breeding Records
  const handleSyncFromBreedingRecords = () => {
    const hatchedRecords = breedingRecords.filter(b => (b.hatchlings || 0) > 0);
    if (hatchedRecords.length === 0) {
      showToast('No hatched clutches in live records to populate from.');
      return;
    }

    const newItems: ProductionLogItem[] = [];
    let counter = 1;

    hatchedRecords.forEach(rec => {
      const count = rec.hatchlings || 1;
      for (let i = 0; i < count; i++) {
        newItems.push({
          id: `live-hatch-${rec.id}-${i + 1}`,
          number: counter++,
          dateLaid: rec.clutchDate || rec.breedingDate || '2026-09-25',
          dateHatched: rec.hatchDate || new Date().toISOString().split('T')[0],
          markings: `TAG-${rec.femaleId?.substring(0, 3) || 'SPEC'}-${counter}`,
          sex: 'N/A',
          locationCageNo: 'INC-A1',
          parentMaleMarking: rec.maleId || 'Male Sire',
          parentFemaleMarking: rec.femaleId || 'Female Dam',
          parentCageNumber: 'MF-ENCL-01',
          remarks: rec.notes || 'Captive Bred Progeny'
        });
      }
    });

    setItems(newItems);
    const firstFemale = animals.find(a => a.id === hatchedRecords[0]?.femaleId);
    if (hatchedRecords[0]?.species || firstFemale) {
      setMetadata(prev => ({
        ...prev,
        speciesName: hatchedRecords[0]?.species || firstFemale?.species || prev.speciesName,
        scientificName: firstFemale?.scientificName || prev.scientificName
      }));
    }
    showToast(`✓ Synced ${newItems.length} hatchlings from breeding database!`);
  };

  // Export PDF (Matches DENR Monthly Production Report layout)
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MONTHLY PRODUCTION REPORT', pageWidth / 2, 14, { align: 'center' });

      // Header Info
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Name of Facility/Permittee:', 14, 22);
      doc.setFont('helvetica', 'normal');
      doc.text(metadata.facilityName || 'N/A', 60, 22);

      doc.setFont('helvetica', 'bold');
      doc.text('Address:', 14, 27);
      doc.setFont('helvetica', 'normal');
      doc.text(metadata.address || 'N/A', 60, 27);

      doc.setFont('helvetica', 'bold');
      doc.text('Contact No.:', 14, 32);
      doc.setFont('helvetica', 'normal');
      doc.text(metadata.contactNo || 'N/A', 60, 32);

      doc.setFont('helvetica', 'bold');
      doc.text('CWR/WFP No.:', 14, 37);
      doc.setFont('helvetica', 'normal');
      doc.text(metadata.cwrWfpNo || 'N/A', 60, 37);

      doc.setFont('helvetica', 'bold');
      doc.text('Period Covered:', 14, 42);
      doc.setFont('helvetica', 'normal');
      doc.text(metadata.periodCovered || 'N/A', 60, 42);

      doc.setFont('helvetica', 'bold');
      doc.text('Species:', 14, 47);
      doc.setFont('helvetica', 'normal');
      doc.text(`${metadata.speciesName} (${metadata.scientificName})`, 60, 47);

      // Table
      const head = [
        [
          { content: 'Number', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Date Laid', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Date Hatched', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Markings\n(Legband, Microchip, etc)', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Sex', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Location/Cage No.', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: "Parents' Marking", colSpan: 2, styles: { halign: 'center' } },
          { content: "Parents' Location/\nCage Number", rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Remarks*', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
        ],
        [
          { content: 'Male', styles: { halign: 'center' } },
          { content: 'Female', styles: { halign: 'center' } }
        ]
      ];

      const body = items.map(item => [
        item.number,
        item.dateLaid,
        item.dateHatched,
        item.markings,
        item.sex,
        item.locationCageNo,
        item.parentMaleMarking,
        item.parentFemaleMarking,
        item.parentCageNumber,
        item.remarks
      ]);

      autoTable(doc, {
        head: head as any,
        body: body as any,
        startY: 50,
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 1.5,
          lineColor: [0, 0, 0],
          lineWidth: 0.15,
          textColor: [0, 0, 0],
          halign: 'center'
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 7
        },
        columnStyles: {
          0: { cellWidth: 16 },
          1: { cellWidth: 24 },
          2: { cellWidth: 24 },
          3: { cellWidth: 32 },
          4: { cellWidth: 16 },
          5: { cellWidth: 28 },
          6: { cellWidth: 24 },
          7: { cellWidth: 24 },
          8: { cellWidth: 35 },
          9: { cellWidth: 35 }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 160;

      // Signatures
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Submitted by:', 14, finalY + 16);
      doc.text('Validated by:', 160, finalY + 16);

      doc.text(metadata.submittedBy || 'Judaea Tobiah L. Vapor', 14, finalY + 28);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Name of the Permittee', 14, finalY + 32);

      doc.setFont('helvetica', 'normal');
      doc.text('Name of DENR employee', 160, finalY + 32);

      const fileName = `Monthly_Production_Report_${metadata.speciesName.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
      showToast(`✓ Downloaded ${fileName}!`);
    } catch (err) {
      console.error('Failed to export Monthly Production PDF:', err);
      showToast('Error exporting PDF.');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Number',
      'Date Laid',
      'Date Hatched',
      'Markings',
      'Sex',
      'Location / Cage No.',
      'Parent Male Marking',
      'Parent Female Marking',
      'Parent Cage Number',
      'Remarks'
    ];
    const csvRows = items.map(item => [
      item.number,
      `"${item.dateLaid}"`,
      `"${item.dateHatched}"`,
      `"${item.markings}"`,
      `"${item.sex}"`,
      `"${item.locationCageNo}"`,
      `"${item.parentMaleMarking}"`,
      `"${item.parentFemaleMarking}"`,
      `"${item.parentCageNumber}"`,
      `"${item.remarks}"`
    ]);

    const csvContent = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Monthly_Production_Report_${metadata.speciesName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ CSV exported successfully!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 font-bold text-xs border border-emerald-400/40 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Control Actions Header */}
      <div
        className={`p-5 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
          isDarkMode ? 'bg-[#04150C] border-emerald-950/80 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 shadow-xs">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black tracking-tight">Monthly Production Report</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30">
                DENR Official Hatch Form
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/25 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                <span>Database Synced</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Detailed per-egg/clutch incubation outcomes, microchip tags, parentage identifiers, and cage tracking.
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2.5 pt-2 md:pt-0">
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-sm transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Report</span>
          </button>


        </div>
      </div>

      {/* Editable Metadata Drawer */}
      {isEditingMetadata && (
        <div
          className={`p-5 rounded-3xl border shadow-lg space-y-4 animate-in fade-in ${
            isDarkMode ? 'bg-[#030f08] border-emerald-900/80 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between border-b border-emerald-950/60 pb-3">
            <h3 className="text-sm font-black text-sky-400 flex items-center space-x-2">
              <Building className="w-4 h-4" />
              <span>Production Report Header Parameters</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-400 mb-1">Name of Facility / Permittee</label>
              <input
                type="text"
                value={metadata.facilityName}
                onChange={e => setMetadata(prev => ({ ...prev, facilityName: e.target.value }))}
                className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                  isDarkMode ? 'bg-[#04160d] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">CWR / WFP No.</label>
              <input
                type="text"
                value={metadata.cwrWfpNo}
                onChange={e => setMetadata(prev => ({ ...prev, cwrWfpNo: e.target.value }))}
                className={`w-full p-2.5 rounded-xl border outline-none font-mono font-bold ${
                  isDarkMode ? 'bg-[#04160d] border-emerald-900 text-emerald-300' : 'bg-white border-slate-200 text-emerald-700'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Contact No.</label>
              <input
                type="text"
                value={metadata.contactNo}
                onChange={e => setMetadata(prev => ({ ...prev, contactNo: e.target.value }))}
                className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                  isDarkMode ? 'bg-[#04160d] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-400 mb-1">Address</label>
              <input
                type="text"
                value={metadata.address}
                onChange={e => setMetadata(prev => ({ ...prev, address: e.target.value }))}
                className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                  isDarkMode ? 'bg-[#04160d] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Period Covered</label>
              <input
                type="text"
                value={metadata.periodCovered}
                onChange={e => setMetadata(prev => ({ ...prev, periodCovered: e.target.value }))}
                className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                  isDarkMode ? 'bg-[#04160d] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Species Common Name</label>
              <input
                type="text"
                value={metadata.speciesName}
                onChange={e => setMetadata(prev => ({ ...prev, speciesName: e.target.value }))}
                className={`w-full p-2.5 rounded-xl border outline-none font-bold ${
                  isDarkMode ? 'bg-[#04160d] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Scientific Name</label>
              <input
                type="text"
                value={metadata.scientificName}
                onChange={e => setMetadata(prev => ({ ...prev, scientificName: e.target.value }))}
                className={`w-full p-2.5 rounded-xl border outline-none font-medium italic ${
                  isDarkMode ? 'bg-[#04160d] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Submitted By (Permittee)</label>
              <input
                type="text"
                value={metadata.submittedBy}
                onChange={e => setMetadata(prev => ({ ...prev, submittedBy: e.target.value }))}
                className={`w-full p-2.5 rounded-xl border outline-none font-bold ${
                  isDarkMode ? 'bg-[#04160d] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Species Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#04150C] border border-emerald-950 print:hidden text-white">
        {uniqueFacilitySpecies.length === 0 ? (
          <div className="text-xs text-amber-300 font-medium">
            No registered species in facility animals database.
          </div>
        ) : uniqueFacilitySpecies.length === 1 ? (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-400">Connected Facility Species:</span>
            <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-teal-600 text-white shadow-xs">
              {uniqueFacilitySpecies[0].common}
            </span>
            <span className="text-xs text-slate-400 italic">({uniqueFacilitySpecies[0].scientific})</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center space-x-1">
              <span>Facility Species ({uniqueFacilitySpecies.length}):</span>
            </span>
            {uniqueFacilitySpecies.map(sp => (
              <button
                key={sp.common}
                type="button"
                onClick={() => {
                  setMetadata(prev => ({
                    ...prev,
                    speciesName: sp.common,
                    scientificName: sp.scientific
                  }));
                  showToast(`✓ Switched report to ${sp.common}`);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  metadata.speciesName.toLowerCase() === sp.common.toLowerCase()
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-emerald-950/40 border border-emerald-900/60 text-slate-300 hover:bg-emerald-900/40'
                }`}
              >
                {sp.common}
              </button>
            ))}
          </div>
        )}

        <div className="text-xs text-slate-400 font-medium">
          Viewing: <span className="font-bold text-teal-400">{metadata.speciesName}</span> <span className="italic text-slate-500">({metadata.scientificName})</span>
        </div>
      </div>

      {/* Official Document View */}
      <div className="official-report-paper bg-white text-slate-900 p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-300 shadow-2xl space-y-6 overflow-x-auto print:p-0 print:border-none print:shadow-none">
        {/* Header */}
        <div className="text-center space-y-1 border-b-2 border-slate-900 pb-4">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
            MONTHLY PRODUCTION REPORT
          </h1>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-xs font-semibold text-slate-800">
          <div className="flex items-baseline space-x-2">
            <span className="font-black text-slate-900 w-44 shrink-0">Name of Facility/Permittee:</span>
            <span className="font-bold border-b border-dotted border-slate-400 pb-0.5 flex-1 truncate">
              {metadata.facilityName}
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="font-black text-slate-900 w-32 shrink-0">Contact No.:</span>
            <span className="font-bold border-b border-dotted border-slate-400 pb-0.5 flex-1">
              {metadata.contactNo}
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="font-black text-slate-900 w-44 shrink-0">Address:</span>
            <span className="border-b border-dotted border-slate-400 pb-0.5 flex-1 truncate">
              {metadata.address}
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="font-black text-slate-900 w-32 shrink-0">CWR/WFP No.:</span>
            <span className="font-mono font-bold border-b border-dotted border-slate-400 pb-0.5 flex-1">
              {metadata.cwrWfpNo}
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="font-black text-slate-900 w-44 shrink-0">Period Covered:</span>
            <span className="font-bold border-b border-dotted border-slate-400 pb-0.5 flex-1">
              {metadata.periodCovered}
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="font-black text-slate-900 w-32 shrink-0">Species:</span>
            <span className="font-bold border-b border-dotted border-slate-400 pb-0.5 flex-1 truncate">
              {metadata.speciesName} ({metadata.scientificName})
            </span>
          </div>
        </div>

        {/* Master Table */}
        <div className="overflow-x-auto border-2 border-slate-900">
          <table className="w-full text-center text-[10px] sm:text-[11px] border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-200 border-b border-slate-900 font-black text-slate-900">
                <th rowSpan={2} className="border-r border-slate-900 p-2 w-16">
                  Number
                </th>
                <th rowSpan={2} className="border-r border-slate-900 p-2 w-24">
                  Date Laid
                </th>
                <th rowSpan={2} className="border-r border-slate-900 p-2 w-24">
                  Date Hatched
                </th>
                <th rowSpan={2} className="border-r border-slate-900 p-2 w-32">
                  Markings<br />
                  <span className="font-normal text-[9px] text-slate-600">(Legband, Microchip, etc)</span>
                </th>
                <th rowSpan={2} className="border-r border-slate-900 p-2 w-16">
                  Sex
                </th>
                <th rowSpan={2} className="border-r border-slate-900 p-2 w-28">
                  Location/Cage No.
                </th>
                <th colSpan={2} className="border-r border-slate-900 p-1.5 uppercase bg-slate-300">
                  Parents' Marking
                </th>
                <th rowSpan={2} className="border-r border-slate-900 p-2 w-36">
                  Parents' Location/<br />Cage Number
                </th>
                <th rowSpan={2} className="p-2 w-36">
                  Remarks*
                </th>
              </tr>
              <tr className="bg-slate-100 border-b-2 border-slate-900 font-bold text-slate-800 text-[9px]">
                <th className="border-r border-slate-900 p-1 w-24">Male</th>
                <th className="border-r border-slate-900 p-1 w-24">Female</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-400 text-slate-900 font-medium">
              {items.map((item, idx) => (
                <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  {/* Number */}
                  <td className="border-r border-slate-900 p-1 font-bold">
                    <div className="flex items-center justify-center space-x-1 group">
                      <span>{item.number}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity print:hidden"
                        title="Delete row"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  {/* Date Laid */}
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="text"
                      value={item.dateLaid}
                      onChange={e => handleCellChange(item.id, 'dateLaid', e.target.value)}
                      className="w-full text-center bg-transparent outline-none hover:bg-emerald-50 focus:bg-emerald-100 rounded"
                    />
                  </td>

                  {/* Date Hatched */}
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="text"
                      value={item.dateHatched}
                      onChange={e => handleCellChange(item.id, 'dateHatched', e.target.value)}
                      className="w-full text-center bg-transparent outline-none font-bold text-emerald-800 hover:bg-emerald-50 focus:bg-emerald-100 rounded"
                    />
                  </td>

                  {/* Markings */}
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="text"
                      value={item.markings}
                      onChange={e => handleCellChange(item.id, 'markings', e.target.value)}
                      className="w-full text-center bg-transparent outline-none font-mono hover:bg-emerald-50 focus:bg-emerald-100 rounded"
                    />
                  </td>

                  {/* Sex */}
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="text"
                      value={item.sex}
                      onChange={e => handleCellChange(item.id, 'sex', e.target.value)}
                      className="w-full text-center bg-transparent outline-none hover:bg-emerald-50 focus:bg-emerald-100 rounded"
                    />
                  </td>

                  {/* Location/Cage No */}
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="text"
                      value={item.locationCageNo}
                      onChange={e => handleCellChange(item.id, 'locationCageNo', e.target.value)}
                      className="w-full text-center bg-transparent outline-none hover:bg-emerald-50 focus:bg-emerald-100 rounded"
                    />
                  </td>

                  {/* Male Parent Marking */}
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="text"
                      value={item.parentMaleMarking}
                      onChange={e => handleCellChange(item.id, 'parentMaleMarking', e.target.value)}
                      className="w-full text-center bg-transparent outline-none hover:bg-emerald-50 focus:bg-emerald-100 rounded"
                    />
                  </td>

                  {/* Female Parent Marking */}
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="text"
                      value={item.parentFemaleMarking}
                      onChange={e => handleCellChange(item.id, 'parentFemaleMarking', e.target.value)}
                      className="w-full text-center bg-transparent outline-none hover:bg-emerald-50 focus:bg-emerald-100 rounded"
                    />
                  </td>

                  {/* Parents' Location / Cage Number */}
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="text"
                      value={item.parentCageNumber}
                      onChange={e => handleCellChange(item.id, 'parentCageNumber', e.target.value)}
                      className="w-full text-center bg-transparent outline-none hover:bg-emerald-50 focus:bg-emerald-100 rounded"
                    />
                  </td>

                  {/* Remarks */}
                  <td className="p-1">
                    <input
                      type="text"
                      value={item.remarks}
                      onChange={e => handleCellChange(item.id, 'remarks', e.target.value)}
                      className="w-full text-center bg-transparent outline-none hover:bg-emerald-50 focus:bg-emerald-100 rounded"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Row Button */}
        <div className="flex justify-between items-center pt-2 print:hidden">
          <button
            type="button"
            onClick={handleAddItem}
            className="px-3.5 py-1.5 rounded-xl border border-dashed border-slate-400 hover:border-sky-600 text-slate-700 hover:text-sky-700 font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Hatchling Row</span>
          </button>
          <span className="text-[11px] text-slate-500 italic">
            Total {items.length} offspring entries recorded.
          </span>
        </div>

        {/* Signatures */}
        <div className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-bold text-slate-900">
          <div className="space-y-6">
            <span className="block font-black">Submitted by:</span>
            <div className="border-b border-slate-900 pb-1 w-64">
              <span className="font-black text-sm uppercase">{metadata.submittedBy || 'Judaea Tobiah L. Vapor'}</span>
            </div>
            <span className="text-[11px] text-slate-600 font-normal block -mt-4">Name of the Permittee</span>
          </div>

          <div className="space-y-6">
            <span className="block font-black">Validated by:</span>
            <div className="border-b border-slate-900 pb-1 w-64">
              <span className="font-black text-sm uppercase">{metadata.validatedBy || '_________________________________'}</span>
            </div>
            <span className="text-[11px] text-slate-600 font-normal block -mt-4">
              Name of DENR employee
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
