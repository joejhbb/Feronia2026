import React, { useState, useMemo, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Truck,
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
  Sliders,
  Send,
  Package
} from 'lucide-react';
import { Animal, TransferRecord } from '../../../types';
import { saveRecord, firestoreGet } from '../../../lib/dbClient';

export interface ProgenyDisposalItem {
  id: string;
  speciesCommon: string;
  speciesScientific: string;
  // Local Sale
  localSaleQty: string;
  localSaleDate: string;
  localSaleRecipient: string;
  // Export
  exportQty: string;
  exportDate: string;
  exportConsignee: string;
  // Donated To
  donatedQty: string;
  donatedDate: string;
  donatedRecipient: string;
  // Exchanged With
  exchangedQty: string;
  exchangedDate: string;
  exchangedRecipient: string;
  // Short Shipment
  shortShipmentQty: string;
  shortShipmentDate: string;
  citesPermitNo: string;
  remarks: string;
}

export interface ProgeniesDisposalMetadata {
  facilityName: string;
  permitteeName: string;
  address: string;
  contactNo: string;
  cwrWfpNo: string;
  periodCovered: string;
  submittedBy: string;
  validatedBy: string;
}

const DEFAULT_DISPOSAL_METADATA: ProgeniesDisposalMetadata = {
  facilityName: 'Flightless Dragons/ Judaea Tobiah Vapor',
  permitteeName: 'Judaea Tobiah L. Vapor',
  address: 'Lot 5, Holly Street, Madera Grove Estates, Dakila, Malolos City',
  contactNo: '9270347985',
  cwrWfpNo: 'III-2023-076',
  periodCovered: '1st Quarter 2025 (January-March)',
  submittedBy: 'Judaea Tobiah L. Vapor',
  validatedBy: ''
};

// System-driven disposal items generator
export const generateSystemDisposalItems = (
  uniqueSpecies: { common: string; scientific: string }[],
  transfers: TransferRecord[] = [],
  animals: Animal[] = []
): ProgenyDisposalItem[] => {
  const items: ProgenyDisposalItem[] = [];

  uniqueSpecies.forEach(spec => {
    const lower = spec.common.toLowerCase();
    const speciesTransfers = transfers.filter(t => {
      const transferAnimal = animals.find(a => a.id === t.animalId);
      return transferAnimal?.species?.trim().toLowerCase() === lower;
    });

    if (speciesTransfers.length > 0) {
      speciesTransfers.forEach((t, idx) => {
        const isDonation = (t.additionalNotes || '').toLowerCase().includes('donat') || t.transferType === 'To Another Facility';
        const isSale = (t.additionalNotes || '').toLowerCase().includes('sale') || t.transferType === 'To New Owner';
        const isExchange = (t.additionalNotes || '').toLowerCase().includes('exchange');

        items.push({
          id: `t-disp-${t.id}-${idx}`,
          speciesCommon: spec.common,
          speciesScientific: spec.scientific,
          localSaleQty: isSale ? '1' : 'N/A',
          localSaleDate: isSale ? (t.transferDate || 'N/A') : 'N/A',
          localSaleRecipient: isSale ? (t.newOwnerName || 'N/A') : 'N/A',
          exportQty: 'N/A',
          exportDate: 'N/A',
          exportConsignee: 'N/A',
          donatedQty: isDonation ? '1' : 'N/A',
          donatedDate: isDonation ? (t.transferDate || 'N/A') : 'N/A',
          donatedRecipient: isDonation ? (t.newOwnerName || 'N/A') : 'N/A',
          exchangedQty: isExchange ? '1' : 'N/A',
          exchangedDate: isExchange ? (t.transferDate || 'N/A') : 'N/A',
          exchangedRecipient: isExchange ? (t.newOwnerName || 'N/A') : 'N/A',
          shortShipmentQty: 'N/A',
          shortShipmentDate: 'N/A',
          citesPermitNo: t.referenceNo || 'N/A',
          remarks: t.status || 'Verified'
        });
      });
    } else {
      items.push({
        id: `spec-disp-${spec.common.replace(/\s+/g, '-').toLowerCase()}`,
        speciesCommon: spec.common,
        speciesScientific: spec.scientific,
        localSaleQty: '0',
        localSaleDate: 'N/A',
        localSaleRecipient: 'N/A',
        exportQty: '0',
        exportDate: 'N/A',
        exportConsignee: 'N/A',
        donatedQty: '0',
        donatedDate: 'N/A',
        donatedRecipient: 'N/A',
        exchangedQty: '0',
        exchangedDate: 'N/A',
        exchangedRecipient: 'N/A',
        shortShipmentQty: '0',
        shortShipmentDate: 'N/A',
        citesPermitNo: 'N/A',
        remarks: 'Registered Specimen Lineage'
      });
    }
  });

  return items;
};

interface ProgeniesDisposalReportSectionProps {
  animals: Animal[];
  transfers: TransferRecord[];
  isDarkMode: boolean;
}

export default function ProgeniesDisposalReportSection({
  animals,
  transfers,
  isDarkMode
}: ProgeniesDisposalReportSectionProps) {
  const [metadata, setMetadata] = useState<ProgeniesDisposalMetadata>(() => {
    const saved = localStorage.getItem('feronia_progenies_disposal_meta_v1');
    if (saved) {
      try {
        return { ...DEFAULT_DISPOSAL_METADATA, ...JSON.parse(saved) };
      } catch {}
    }
    return DEFAULT_DISPOSAL_METADATA;
  });

  // Extract all unique species registered in facility
  const uniqueFacilitySpecies = useMemo(() => {
    const map = new Map<string, { common: string; scientific: string; count: number }>();
    animals.forEach(a => {
      if (a.species && !a.isArchived) {
        const key = a.species.trim().toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(key, {
            common: a.species.trim(),
            scientific: a.scientificName?.trim() || a.species.trim(),
            count: 1
          });
        }
      }
    });
    return Array.from(map.values());
  }, [animals]);

  // Active registered species lowercase names
  const activeSpeciesNames = useMemo(
    () => new Set(uniqueFacilitySpecies.map(s => s.common.trim().toLowerCase())),
    [uniqueFacilitySpecies]
  );

  const [items, setItems] = useState<ProgenyDisposalItem[]>(() => {
    const saved = localStorage.getItem('feronia_progenies_disposal_items_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((item: ProgenyDisposalItem) =>
            activeSpeciesNames.has((item.speciesCommon || '').trim().toLowerCase())
          );
        }
      } catch {}
    }
    return generateSystemDisposalItems(uniqueFacilitySpecies, transfers, animals);
  });

  const [selectedSpeciesFilter, setSelectedSpeciesFilter] = useState<string>('ALL');
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-sync: Ensure every single registered species has a disposition row and remove any non-registered species
  useEffect(() => {
    if (uniqueFacilitySpecies.length === 0) {
      setItems([]);
      return;
    }

    setItems(prevItems => {
      // 1. Keep ONLY items that belong to active system species
      const validPrev = prevItems.filter(item =>
        activeSpeciesNames.has((item.speciesCommon || '').trim().toLowerCase())
      );

      // Check which active species are missing
      const presentSpecies = new Set(
        validPrev.map(item => item.speciesCommon.trim().toLowerCase())
      );

      const missingSpecies = uniqueFacilitySpecies.filter(
        spec => !presentSpecies.has(spec.common.trim().toLowerCase())
      );

      if (missingSpecies.length > 0) {
        const added = generateSystemDisposalItems(missingSpecies, transfers, animals);
        return [...validPrev, ...added];
      }

      if (validPrev.length !== prevItems.length) {
        return validPrev;
      }

      return prevItems;
    });
  }, [uniqueFacilitySpecies, activeSpeciesNames, transfers, animals]);

  // Database Synchronization: Load saved progenies disposal report from Firestore/Supabase
  useEffect(() => {
    let isMounted = true;
    firestoreGet<any>('statutory_reports', 'progenies_disposal_report').then(dbReport => {
      if (!isMounted || !dbReport) return;
      try {
        if (dbReport.metadata) {
          const parsedMeta = typeof dbReport.metadata === 'string' ? JSON.parse(dbReport.metadata) : dbReport.metadata;
          setMetadata(prev => ({ ...prev, ...parsedMeta }));
        }
        if (dbReport.rows) {
          const parsedRows = typeof dbReport.rows === 'string' ? JSON.parse(dbReport.rows) : dbReport.rows;
          if (Array.isArray(parsedRows) && parsedRows.length > 0) {
            setItems(parsedRows);
          }
        }
      } catch (err) {
        console.warn('Error reading progenies disposal report from database:', err);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSave = () => {
    localStorage.setItem('feronia_progenies_disposal_meta_v1', JSON.stringify(metadata));
    localStorage.setItem('feronia_progenies_disposal_items_v2', JSON.stringify(items));
    saveRecord('statutory_reports', {
      id: 'progenies_disposal_report',
      reportType: 'Progenies Disposal',
      entriesCount: items.length,
      metadata: JSON.stringify(metadata),
      rows: JSON.stringify(items),
      updatedAt: new Date().toISOString(),
      updatedBy: metadata.submittedBy || 'Administrator'
    });
    showToast('✓ Progenies Disposal Report saved to database successfully!');
  };

  const handleReset = () => {
    if (window.confirm('Reset disposal report to live system registered species and transfers?')) {
      const resetItems = generateSystemDisposalItems(uniqueFacilitySpecies, transfers, animals);
      setMetadata(DEFAULT_DISPOSAL_METADATA);
      setItems(resetItems);
      localStorage.setItem('feronia_progenies_disposal_meta_v1', JSON.stringify(DEFAULT_DISPOSAL_METADATA));
      localStorage.setItem('feronia_progenies_disposal_items_v2', JSON.stringify(resetItems));
      showToast('✓ Reset to live system inventory.');
    }
  };

  const handleCellChange = (id: string, field: keyof ProgenyDisposalItem, value: any) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddItem = (speciesChoice?: { common: string; scientific: string }) => {
    const chosenCommon = speciesChoice?.common || (uniqueFacilitySpecies[0]?.common || 'Species Common Name');
    const chosenSci = speciesChoice?.scientific || (uniqueFacilitySpecies[0]?.scientific || 'Species Scientific Name');

    const newItem: ProgenyDisposalItem = {
      id: `disp-${Date.now()}`,
      speciesCommon: chosenCommon,
      speciesScientific: chosenSci,
      localSaleQty: 'N/A',
      localSaleDate: 'N/A',
      localSaleRecipient: 'N/A',
      exportQty: 'N/A',
      exportDate: 'N/A',
      exportConsignee: 'N/A',
      donatedQty: 'N/A',
      donatedDate: 'N/A',
      donatedRecipient: 'N/A',
      exchangedQty: 'N/A',
      exchangedDate: 'N/A',
      exchangedRecipient: 'N/A',
      shortShipmentQty: 'N/A',
      shortShipmentDate: 'N/A',
      citesPermitNo: 'N/A',
      remarks: 'N/A'
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Sync all registered facility species & transfers into disposal report
  const handleSyncFromTransfers = () => {
    const newItems: ProgenyDisposalItem[] = [];

    // Map every unique species in facility
    uniqueFacilitySpecies.forEach(spec => {
      const lower = spec.common.toLowerCase();
      const speciesTransfers = transfers.filter(t => {
        const transferAnimal = animals.find(a => a.id === t.animalId);
        return transferAnimal?.species?.trim().toLowerCase() === lower;
      });

      if (speciesTransfers.length > 0) {
        speciesTransfers.forEach((t, idx) => {
          const isDonation = (t.additionalNotes || '').toLowerCase().includes('donat') || t.transferType === 'To Another Facility';
          const isSale = (t.additionalNotes || '').toLowerCase().includes('sale') || t.transferType === 'To New Owner';
          const isExchange = (t.additionalNotes || '').toLowerCase().includes('exchange');

          newItems.push({
            id: `transfer-disp-${t.id}-${idx}`,
            speciesCommon: spec.common,
            speciesScientific: spec.scientific,
            localSaleQty: isSale ? '1' : 'N/A',
            localSaleDate: isSale ? (t.transferDate || 'N/A') : 'N/A',
            localSaleRecipient: isSale ? (t.newOwnerName || 'N/A') : 'N/A',
            exportQty: 'N/A',
            exportDate: 'N/A',
            exportConsignee: 'N/A',
            donatedQty: isDonation ? '1' : 'N/A',
            donatedDate: isDonation ? (t.transferDate || 'N/A') : 'N/A',
            donatedRecipient: isDonation ? (t.newOwnerName || 'N/A') : 'N/A',
            exchangedQty: isExchange ? '1' : 'N/A',
            exchangedDate: isExchange ? (t.transferDate || 'N/A') : 'N/A',
            exchangedRecipient: isExchange ? (t.newOwnerName || 'N/A') : 'N/A',
            shortShipmentQty: 'N/A',
            shortShipmentDate: 'N/A',
            citesPermitNo: t.referenceNo || 'N/A',
            remarks: t.status || 'Verified'
          });
        });
      } else {
        newItems.push({
          id: `spec-disp-${spec.common.replace(/\s+/g, '-').toLowerCase()}`,
          speciesCommon: spec.common,
          speciesScientific: spec.scientific,
          localSaleQty: 'N/A',
          localSaleDate: 'N/A',
          localSaleRecipient: 'N/A',
          exportQty: 'N/A',
          exportDate: 'N/A',
          exportConsignee: 'N/A',
          donatedQty: 'N/A',
          donatedDate: 'N/A',
          donatedRecipient: 'N/A',
          exchangedQty: 'N/A',
          exchangedDate: 'N/A',
          exchangedRecipient: 'N/A',
          shortShipmentQty: 'N/A',
          shortShipmentDate: 'N/A',
          citesPermitNo: 'N/A',
          remarks: 'Registered Specimen Lineage'
        });
      }
    });

    if (newItems.length > 0) {
      setItems(newItems);
      showToast(`✓ Synced all ${uniqueFacilitySpecies.length} species & ${transfers.length} transfers into Progenies Disposal Report!`);
    } else {
      showToast('No registered species found to sync.');
    }
  };

  // Filtered items by selected species
  const filteredItems = useMemo(() => {
    if (selectedSpeciesFilter === 'ALL') return items;
    return items.filter(
      item => item.speciesCommon.toLowerCase() === selectedSpeciesFilter.toLowerCase()
    );
  }, [items, selectedSpeciesFilter]);

  // Export PDF (Matches DENR Quarterly Progenies Disposal Report layout)
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
      doc.text('QUARTERLY REPORT ON PROGENIES DISPOSAL', pageWidth / 2, 14, { align: 'center' });

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

      // Table Header Multi-tier
      const head = [
        [
          { content: 'Species\n[Common & Scientific Name]', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } },
          { content: 'DISPOSALS', colSpan: 12, styles: { halign: 'center', fontStyle: 'bold' } },
          { content: 'Short Shipment', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } },
          { content: 'Remarks', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
        ],
        [
          // Local Sale
          { content: 'Local Sale\nQty', styles: { halign: 'center' } },
          { content: 'Date', styles: { halign: 'center' } },
          { content: 'Recipient', styles: { halign: 'center' } },
          // Export
          { content: 'Export\nQty', styles: { halign: 'center' } },
          { content: 'Date', styles: { halign: 'center' } },
          { content: 'Consignee', styles: { halign: 'center' } },
          // Donated
          { content: 'Donated\nQty', styles: { halign: 'center' } },
          { content: 'Date', styles: { halign: 'center' } },
          { content: 'Recipient', styles: { halign: 'center' } },
          // Exchanged
          { content: 'Exchanged\nQty', styles: { halign: 'center' } },
          { content: 'Date', styles: { halign: 'center' } },
          { content: 'Recipient', styles: { halign: 'center' } },
          // Short Shipment
          { content: 'Qty\n(w/ markings)', styles: { halign: 'center' } },
          { content: 'Date', styles: { halign: 'center' } },
          { content: 'CITES\nPermit No.', styles: { halign: 'center' } }
        ]
      ];

      const body = items.map(item => [
        `${item.speciesCommon} (${item.speciesScientific})`,
        item.localSaleQty,
        item.localSaleDate,
        item.localSaleRecipient,
        item.exportQty,
        item.exportDate,
        item.exportConsignee,
        item.donatedQty,
        item.donatedDate,
        item.donatedRecipient,
        item.exchangedQty,
        item.exchangedDate,
        item.exchangedRecipient,
        item.shortShipmentQty,
        item.shortShipmentDate,
        item.citesPermitNo,
        item.remarks
      ]);

      autoTable(doc, {
        head: head as any,
        body: body as any,
        startY: 46,
        theme: 'grid',
        styles: {
          fontSize: 6,
          cellPadding: 1.2,
          lineColor: [0, 0, 0],
          lineWidth: 0.15,
          textColor: [0, 0, 0],
          halign: 'center',
          valign: 'middle',
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 6
        },
        columnStyles: {
          0: { cellWidth: 36, halign: 'left' },
          1: { cellWidth: 11 },
          2: { cellWidth: 14 },
          3: { cellWidth: 24, overflow: 'linebreak' }, // Local Sale Recipient (full wrapped name)
          4: { cellWidth: 11 },
          5: { cellWidth: 14 },
          6: { cellWidth: 24, overflow: 'linebreak' }, // Export Consignee (full wrapped name)
          7: { cellWidth: 11 },
          8: { cellWidth: 14 },
          9: { cellWidth: 24, overflow: 'linebreak' }, // Donated Recipient (full wrapped name)
          10: { cellWidth: 11 },
          11: { cellWidth: 14 },
          12: { cellWidth: 24, overflow: 'linebreak' }, // Exchanged Recipient (full wrapped name)
          13: { cellWidth: 11 },
          14: { cellWidth: 14 },
          15: { cellWidth: 16 },
          16: { cellWidth: 18, overflow: 'linebreak' }
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

      const fileName = `Quarterly_Report_On_Progenies_Disposal.pdf`;
      doc.save(fileName);
      showToast(`✓ Downloaded ${fileName}!`);
    } catch (err) {
      console.error('Failed to export Progenies Disposal PDF:', err);
      showToast('Error exporting PDF.');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Species',
      'Scientific Name',
      'Local Sale Qty',
      'Local Sale Date',
      'Local Sale Recipient',
      'Export Qty',
      'Export Date',
      'Export Consignee',
      'Donated Qty',
      'Donated Date',
      'Donated Recipient',
      'Exchanged Qty',
      'Exchanged Date',
      'Exchanged Recipient',
      'Short Shipment Qty',
      'Short Shipment Date',
      'CITES Permit No.',
      'Remarks'
    ];
    const csvRows = items.map(item => [
      `"${item.speciesCommon}"`,
      `"${item.speciesScientific}"`,
      `"${item.localSaleQty}"`,
      `"${item.localSaleDate}"`,
      `"${item.localSaleRecipient}"`,
      `"${item.exportQty}"`,
      `"${item.exportDate}"`,
      `"${item.exportConsignee}"`,
      `"${item.donatedQty}"`,
      `"${item.donatedDate}"`,
      `"${item.donatedRecipient}"`,
      `"${item.exchangedQty}"`,
      `"${item.exchangedDate}"`,
      `"${item.exchangedRecipient}"`,
      `"${item.shortShipmentQty}"`,
      `"${item.shortShipmentDate}"`,
      `"${item.citesPermitNo}"`,
      `"${item.remarks}"`
    ]);

    const csvContent = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Progenies_Disposal_Report.csv`);
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
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black tracking-tight">Quarterly Report on Progenies Disposal</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Official Disposal Log
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span>Database Synced</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Legal audit of offspring transfers, local sales, scientific donations, exchanges, export consignees, and CITES permits.
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
            <h3 className="text-sm font-black text-amber-400 flex items-center space-x-2">
              <Building className="w-4 h-4" />
              <span>Progenies Disposal Header Parameters</span>
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

      {/* Official Document View */}
      <div className="official-report-paper bg-white text-slate-900 p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-300 shadow-2xl space-y-6 overflow-x-auto print:p-0 print:border-none print:shadow-none">
        {/* Header */}
        <div className="text-center space-y-1 border-b-2 border-slate-900 pb-4">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
            QUARTERLY REPORT ON PROGENIES DISPOSAL
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
        </div>

        {/* Species Navigation and Quick Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 print:hidden">
          {uniqueFacilitySpecies.length === 0 ? (
            <div className="text-xs text-amber-700 font-medium">
              No registered species in facility animals database.
            </div>
          ) : uniqueFacilitySpecies.length === 1 ? (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-700">Connected Facility Species:</span>
              <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 text-white shadow-xs">
                {uniqueFacilitySpecies[0].common}
              </span>
              <span className="text-xs text-slate-500 italic">({uniqueFacilitySpecies[0].scientific})</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700 mr-1 flex items-center space-x-1">
                <span>Filter Facility Species ({uniqueFacilitySpecies.length}):</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedSpeciesFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedSpeciesFilter === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                All Species ({uniqueFacilitySpecies.length})
              </button>
              {uniqueFacilitySpecies.map(sp => (
                <button
                  key={sp.common}
                  type="button"
                  onClick={() => setSelectedSpeciesFilter(sp.common)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSpeciesFilter.toLowerCase() === sp.common.toLowerCase()
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {sp.common}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handleAddItem(uniqueFacilitySpecies.find(s => s.common.toLowerCase() === selectedSpeciesFilter.toLowerCase()))}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                Add Entry {uniqueFacilitySpecies.length === 1 ? `for ${uniqueFacilitySpecies[0].common}` : selectedSpeciesFilter === 'ALL' ? 'for Species' : `for ${selectedSpeciesFilter}`}
              </span>
            </button>
          </div>
        </div>

        {/* Master Table */}
        <div className="overflow-x-auto border-2 border-slate-900">
          <table className="w-full text-center text-[10px] sm:text-[11px] border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-200 border-b border-slate-900 font-black text-slate-900">
                <th rowSpan={2} className="border-r border-slate-900 p-2 text-left w-48">
                  Species<br />
                  <span className="font-normal text-[9px] text-slate-600">[Common & Scientific Name]</span>
                </th>
                <th colSpan={12} className="border-r border-slate-900 p-1.5 uppercase bg-slate-300">
                  DISPOSALS
                </th>
                <th colSpan={3} className="border-r border-slate-900 p-1.5 uppercase bg-amber-100">
                  Short Shipment
                </th>
                <th rowSpan={2} className="p-2 w-28">
                  Remarks
                </th>
              </tr>
              <tr className="bg-slate-100 border-b-2 border-slate-900 font-bold text-slate-800 text-[9px]">
                {/* Local Sale */}
                <th className="border-r border-slate-900 p-1 w-12">Quantity<br />(w/markings)</th>
                <th className="border-r border-slate-900 p-1 w-16">Date</th>
                <th className="border-r border-slate-900 p-1 min-w-[130px] max-w-[200px]">Recipient</th>

                {/* Export */}
                <th className="border-r border-slate-900 p-1 w-12">Quantity<br />(w/markings)</th>
                <th className="border-r border-slate-900 p-1 w-16">Date</th>
                <th className="border-r border-slate-900 p-1 min-w-[130px] max-w-[200px]">Consignee</th>

                {/* Donated To */}
                <th className="border-r border-slate-900 p-1 w-12 bg-emerald-50">Quantity<br />(w/markings)</th>
                <th className="border-r border-slate-900 p-1 w-16 bg-emerald-50">Date</th>
                <th className="border-r border-slate-900 p-1 min-w-[130px] max-w-[200px] bg-emerald-50">Recipient</th>

                {/* Exchanged With */}
                <th className="border-r border-slate-900 p-1 w-12">Quantity<br />(w/markings)</th>
                <th className="border-r border-slate-900 p-1 w-16">Date</th>
                <th className="border-r border-slate-900 p-1 min-w-[130px] max-w-[200px]">Recipient</th>

                {/* Short Shipment */}
                <th className="border-r border-slate-900 p-1 w-12 bg-amber-50">Quantity<br />(with mark)</th>
                <th className="border-r border-slate-900 p-1 w-16 bg-amber-50">Date</th>
                <th className="border-r border-slate-900 p-1 w-20 bg-amber-50">CITES Permit No.</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-400 text-slate-900 font-medium text-[10px]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={17} className="p-8 text-center text-slate-500 font-medium">
                    No disposal entries recorded for registered facility species.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  {/* Species Name */}
                  <td className="border-r border-slate-900 p-1.5 text-left font-bold min-w-[160px]">
                    <div className="flex items-center justify-between group">
                      <div>
                        <div className="text-slate-900 font-black leading-tight">{item.speciesCommon}</div>
                        <div className="text-slate-500 italic text-[9px] leading-tight">({item.speciesScientific})</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity print:hidden p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  {/* Local Sale */}
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="text"
                      value={item.localSaleQty}
                      onChange={e => handleCellChange(item.id, 'localSaleQty', e.target.value)}
                      className="w-full text-center bg-transparent outline-none hover:bg-emerald-50 rounded text-[10px]"
                    />
                  </td>
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="text"
                      value={item.localSaleDate}
                      onChange={e => handleCellChange(item.id, 'localSaleDate', e.target.value)}
                      className="w-full text-center bg-transparent outline-none hover:bg-emerald-50 rounded text-[10px]"
                    />
                  </td>
                  <td className="border-r border-slate-900 p-1 min-w-[130px] max-w-[200px]">
                    <textarea
                      rows={1}
                      value={item.localSaleRecipient}
                      onChange={e => handleCellChange(item.id, 'localSaleRecipient', e.target.value)}
                      onInput={e => {
                        const el = e.currentTarget;
                        el.style.height = 'auto';
                        el.style.height = `${Math.max(el.scrollHeight, 24)}px`;
                      }}
                      className="w-full text-center bg-transparent outline-none hover:bg-emerald-50 rounded resize-none overflow-hidden text-[10px] leading-tight break-words whitespace-normal font-medium block"
                      title={item.localSaleRecipient}
                    />
                  </td>

                  {/* Export */}
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="text"
                      value={item.exportQty}
                      onChange={e => handleCellChange(item.id, 'exportQty', e.target.value)}
                      className="w-full text-center bg-transparent outline-none hover:bg-emerald-50 rounded text-[10px]"
                    />
                  </td>
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="text"
                      value={item.exportDate}
                      onChange={e => handleCellChange(item.id, 'exportDate', e.target.value)}
                      className="w-full text-center bg-transparent outline-none hover:bg-emerald-50 rounded text-[10px]"
                    />
                  </td>
                  <td className="border-r border-slate-900 p-1 min-w-[130px] max-w-[200px]">
                    <textarea
                      rows={1}
                      value={item.exportConsignee}
                      onChange={e => handleCellChange(item.id, 'exportConsignee', e.target.value)}
                      onInput={e => {
                        const el = e.currentTarget;
                        el.style.height = 'auto';
                        el.style.height = `${Math.max(el.scrollHeight, 24)}px`;
                      }}
                      className="w-full text-center bg-transparent outline-none hover:bg-emerald-50 rounded resize-none overflow-hidden text-[10px] leading-tight break-words whitespace-normal font-medium block"
                      title={item.exportConsignee}
                    />
                  </td>

                  {/* Donated To */}
                  <td className="border-r border-slate-900 p-1 bg-emerald-50/40 font-bold">
                    <input
                      type="text"
                      value={item.donatedQty}
                      onChange={e => handleCellChange(item.id, 'donatedQty', e.target.value)}
                      className="w-full text-center bg-transparent outline-none font-bold text-emerald-800 hover:bg-emerald-100 rounded text-[10px]"
                    />
                  </td>
                  <td className="border-r border-slate-900 p-1 bg-emerald-50/40">
                    <input
                      type="text"
                      value={item.donatedDate}
                      onChange={e => handleCellChange(item.id, 'donatedDate', e.target.value)}
                      className="w-full text-center bg-transparent outline-none hover:bg-emerald-100 rounded text-[10px]"
                    />
                  </td>
                  <td className="border-r border-slate-900 p-1 bg-emerald-50/40 font-bold min-w-[130px] max-w-[200px]">
                    <textarea
                      rows={1}
                      value={item.donatedRecipient}
                      onChange={e => handleCellChange(item.id, 'donatedRecipient', e.target.value)}
                      onInput={e => {
                        const el = e.currentTarget;
                        el.style.height = 'auto';
                        el.style.height = `${Math.max(el.scrollHeight, 24)}px`;
                      }}
                      className="w-full text-center bg-transparent outline-none font-bold text-slate-900 hover:bg-emerald-100 rounded resize-none overflow-hidden text-[10px] leading-tight break-words whitespace-normal block"
                      title={item.donatedRecipient}
                    />
                  </td>

                  {/* Exchanged With */}
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="text"
                      value={item.exchangedQty}
                      onChange={e => handleCellChange(item.id, 'exchangedQty', e.target.value)}
                      className="w-full text-center bg-transparent outline-none hover:bg-emerald-50 rounded text-[10px]"
                    />
                  </td>
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="text"
                      value={item.exchangedDate}
                      onChange={e => handleCellChange(item.id, 'exchangedDate', e.target.value)}
                      className="w-full text-center bg-transparent outline-none hover:bg-emerald-50 rounded text-[10px]"
                    />
                  </td>
                  <td className="border-r border-slate-900 p-1 min-w-[130px] max-w-[200px]">
                    <textarea
                      rows={1}
                      value={item.exchangedRecipient}
                      onChange={e => handleCellChange(item.id, 'exchangedRecipient', e.target.value)}
                      onInput={e => {
                        const el = e.currentTarget;
                        el.style.height = 'auto';
                        el.style.height = `${Math.max(el.scrollHeight, 24)}px`;
                      }}
                      className="w-full text-center bg-transparent outline-none hover:bg-emerald-50 rounded resize-none overflow-hidden text-[10px] leading-tight break-words whitespace-normal font-medium block"
                      title={item.exchangedRecipient}
                    />
                  </td>

                  {/* Short Shipment */}
                  <td className="border-r border-slate-900 p-1 bg-amber-50/40">
                    <input
                      type="text"
                      value={item.shortShipmentQty}
                      onChange={e => handleCellChange(item.id, 'shortShipmentQty', e.target.value)}
                      className="w-full text-center bg-transparent outline-none hover:bg-amber-100 rounded text-[10px]"
                    />
                  </td>
                  <td className="border-r border-slate-900 p-1 bg-amber-50/40">
                    <input
                      type="text"
                      value={item.shortShipmentDate}
                      onChange={e => handleCellChange(item.id, 'shortShipmentDate', e.target.value)}
                      className="w-full text-center bg-transparent outline-none hover:bg-amber-100 rounded text-[10px]"
                    />
                  </td>
                  <td className="border-r border-slate-900 p-1 bg-amber-50/40 font-mono">
                    <input
                      type="text"
                      value={item.citesPermitNo}
                      onChange={e => handleCellChange(item.id, 'citesPermitNo', e.target.value)}
                      className="w-full text-center bg-transparent outline-none font-mono hover:bg-amber-100 rounded text-[10px]"
                    />
                  </td>

                  {/* Remarks */}
                  <td className="p-1 min-w-[110px]">
                    <textarea
                      rows={1}
                      value={item.remarks}
                      onChange={e => handleCellChange(item.id, 'remarks', e.target.value)}
                      onInput={e => {
                        const el = e.currentTarget;
                        el.style.height = 'auto';
                        el.style.height = `${Math.max(el.scrollHeight, 24)}px`;
                      }}
                      className="w-full text-center bg-transparent outline-none hover:bg-slate-100 rounded resize-none overflow-hidden text-[10px] leading-tight break-words whitespace-normal block"
                      title={item.remarks}
                    />
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

        {/* Add Row Button */}
        <div className="flex justify-between items-center pt-2 print:hidden">
          <button
            type="button"
            onClick={() => handleAddItem()}
            className="px-3.5 py-1.5 rounded-xl border border-dashed border-slate-400 hover:border-amber-600 text-slate-700 hover:text-amber-700 font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Progeny Disposal Entry</span>
          </button>
          <span className="text-[11px] text-slate-500 italic">
            Total {items.length} disposal entries recorded.
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
