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
  Edit3,
  CheckCircle2,
  Info,
  Building,
  UserCheck,
  Sparkles,
  FileCheck2,
  HelpCircle,
  Eye,
  Sliders
} from 'lucide-react';
import { Animal, BreedingRecord, TransferRecord } from '../../../types';
import { saveRecord, firestoreGet } from '../../../lib/dbClient';

export interface QuarterlyBreedingRow {
  id: string;
  commonName: string;
  scientificName: string;
  // Parental / Breeder Stock
  origRegisteredBreeders: number;
  balanceBreederLastQuarter: number;
  additionalBreederStock: number;
  breederMortality: number;
  // Progeny
  registeredProgeniesWFP: number;
  balanceProgeniesLastPeriod: number;
  births: number;
  progenyMortality: number;
  disposal: number;
  disposalCode?: string; // D, E, P, S
  remarks?: string;
}

export interface QuarterlyReportMetadata {
  facilityName: string;
  permitteeName: string;
  address: string;
  contactNo: string;
  cwrWfpNo: string;
  wfpRegRef: string;
  periodCovered: string;
  quarter: '1st Quarter' | '2nd Quarter' | '3rd Quarter' | '4th Quarter';
  year: number;
  submittedBy: string;
  validatedBy: string;
  dateValidated: string;
}

const DEFAULT_METADATA: QuarterlyReportMetadata = {
  facilityName: 'Flightless Dragons / Judaea Tobiah Vapor',
  permitteeName: 'Judaea Tobiah L. Vapor',
  address: 'Block 9 Lot 5, Holly Street, Madera Grove Estates, Dakila, Malolos City, Bulacan',
  contactNo: '9270347985',
  cwrWfpNo: 'III-2023-076',
  wfpRegRef: 'III-2023-06',
  periodCovered: '4th Quarter 2025 (Oct-Dec)',
  quarter: '4th Quarter',
  year: 2025,
  submittedBy: 'Judaea Tobiah L. Vapor',
  validatedBy: '',
  dateValidated: ''
};

// System-driven row generator for species registered in the facility
export const createSystemSpeciesRow = (
  spec: { common: string; scientific: string; count: number },
  breedingRecords: BreedingRecord[] = [],
  transfers: TransferRecord[] = [],
  animals: Animal[] = []
): QuarterlyBreedingRow => {
  const lower = spec.common.toLowerCase();
  const birthsCount = breedingRecords
    .filter(b => b.species?.trim().toLowerCase() === lower && b.status === 'SUCCESSFUL')
    .reduce((sum, b) => sum + (b.hatchlings || 0), 0);

  const disposalCount = transfers.filter(t => {
    const tAnimal = animals.find(a => a.id === t.animalId);
    return tAnimal?.species?.trim().toLowerCase() === lower;
  }).length;

  return {
    id: `row-${spec.common.replace(/\s+/g, '-').toLowerCase()}`,
    commonName: spec.common,
    scientificName: spec.scientific,
    origRegisteredBreeders: 0,
    balanceBreederLastQuarter: spec.count,
    additionalBreederStock: 0,
    breederMortality: 0,
    registeredProgeniesWFP: 0,
    balanceProgeniesLastPeriod: 0,
    births: birthsCount,
    progenyMortality: 0,
    disposal: disposalCount,
    remarks: 'Active Sanctuary Lineage'
  };
};

interface QuarterlyBreedingReportSectionProps {
  animals: Animal[];
  breedingRecords: BreedingRecord[];
  transfers: TransferRecord[];
  isDarkMode: boolean;
}

export default function QuarterlyBreedingReportSection({
  animals,
  breedingRecords,
  transfers,
  isDarkMode
}: QuarterlyBreedingReportSectionProps) {
  const [metadata, setMetadata] = useState<QuarterlyReportMetadata>(() => {
    const saved = localStorage.getItem('feronia_quarterly_report_meta_v1');
    if (saved) {
      try {
        return { ...DEFAULT_METADATA, ...JSON.parse(saved) };
      } catch {}
    }
    return DEFAULT_METADATA;
  });

  // Extract all active unique species currently registered in the facility
  const systemSpecies = useMemo(() => {
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

  const [rows, setRows] = useState<QuarterlyBreedingRow[]>(() => {
    // Attempt to load saved overrides for system species
    const saved = localStorage.getItem('feronia_quarterly_report_rows_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {}
    }
    return [];
  });

  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Database Synchronization: Load saved report from Firestore/Supabase on mount
  useEffect(() => {
    let isMounted = true;
    firestoreGet<any>('statutory_reports', 'qbr_report').then(dbReport => {
      if (!isMounted || !dbReport) return;
      try {
        if (dbReport.metadata) {
          const parsedMeta = typeof dbReport.metadata === 'string' ? JSON.parse(dbReport.metadata) : dbReport.metadata;
          setMetadata(prev => ({ ...prev, ...parsedMeta }));
        }
        if (dbReport.rows) {
          const parsedRows = typeof dbReport.rows === 'string' ? JSON.parse(dbReport.rows) : dbReport.rows;
          if (Array.isArray(parsedRows) && parsedRows.length > 0) {
            setRows(parsedRows);
          }
        }
      } catch (err) {
        console.warn('Error reading QBR from database:', err);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Strict System Connection: Keep report rows strictly in sync with the facility's registered species
  useEffect(() => {
    // If no animals registered in system, report table is empty
    if (systemSpecies.length === 0) {
      setRows([]);
      return;
    }

    setRows(prevRows => {
      // Map existing custom user edits per species common name
      const prevMap = new Map<string, QuarterlyBreedingRow>();
      prevRows.forEach(r => {
        if (r.commonName) {
          prevMap.set(r.commonName.trim().toLowerCase(), r);
        }
      });

      // Construct rows exclusively for the active species in the system
      return systemSpecies.map(spec => {
        const lower = spec.common.toLowerCase();
        const existing = prevMap.get(lower);

        const birthsCount = breedingRecords
          .filter(b => b.species?.trim().toLowerCase() === lower && b.status === 'SUCCESSFUL')
          .reduce((sum, b) => sum + (b.hatchlings || 0), 0);

        const disposalCount = transfers
          .filter(t => {
            const tAnimal = animals.find(a => a.id === t.animalId);
            return tAnimal?.species?.trim().toLowerCase() === lower;
          }).length;

        if (existing) {
          return {
            ...existing,
            commonName: spec.common,
            scientificName: spec.scientific || existing.scientificName || spec.common,
            balanceBreederLastQuarter: existing.balanceBreederLastQuarter !== undefined ? existing.balanceBreederLastQuarter : spec.count,
            births: existing.births !== undefined ? existing.births : birthsCount,
            disposal: existing.disposal !== undefined ? existing.disposal : disposalCount
          };
        }

        return createSystemSpeciesRow(spec, breedingRecords, transfers, animals);
      });
    });
  }, [systemSpecies, breedingRecords, transfers, animals]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveData = () => {
    localStorage.setItem('feronia_quarterly_report_meta_v1', JSON.stringify(metadata));
    localStorage.setItem('feronia_quarterly_report_rows_v3', JSON.stringify(rows));
    saveRecord('statutory_reports', {
      id: 'qbr_report',
      reportType: 'QBR',
      speciesCount: rows.length,
      metadata: JSON.stringify(metadata),
      rows: JSON.stringify(rows),
      updatedAt: new Date().toISOString(),
      updatedBy: metadata.submittedBy || 'Administrator'
    });
    showToast('✓ Quarterly Breeding Report saved to database successfully!');
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset report rows to match current live animal inventory?')) {
      const resetRows = systemSpecies.map(spec => createSystemSpeciesRow(spec, breedingRecords, transfers, animals));
      setRows(resetRows);
      localStorage.setItem('feronia_quarterly_report_rows_v3', JSON.stringify(resetRows));
      showToast('✓ Synced with current live inventory.');
    }
  };

  const handleQuarterChange = (q: QuarterlyReportMetadata['quarter']) => {
    let periodText = '';
    const yr = metadata.year;
    if (q === '1st Quarter') periodText = `1st Quarter ${yr} (Jan-Mar)`;
    else if (q === '2nd Quarter') periodText = `2nd Quarter ${yr} (Apr-Jun)`;
    else if (q === '3rd Quarter') periodText = `3rd Quarter ${yr} (Jul-Sep)`;
    else if (q === '4th Quarter') periodText = `4th Quarter ${yr} (Oct-Dec)`;

    setMetadata(prev => ({
      ...prev,
      quarter: q,
      periodCovered: periodText
    }));
  };

  const handleYearChange = (yr: number) => {
    let periodText = '';
    const q = metadata.quarter;
    if (q === '1st Quarter') periodText = `1st Quarter ${yr} (Jan-Mar)`;
    else if (q === '2nd Quarter') periodText = `2nd Quarter ${yr} (Apr-Jun)`;
    else if (q === '3rd Quarter') periodText = `3rd Quarter ${yr} (Jul-Sep)`;
    else if (q === '4th Quarter') periodText = `4th Quarter ${yr} (Oct-Dec)`;

    setMetadata(prev => ({
      ...prev,
      year: yr,
      periodCovered: periodText
    }));
  };

  // Cell Update handler
  const handleCellChange = (
    rowId: string,
    field: keyof QuarterlyBreedingRow,
    value: any
  ) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id === rowId) {
          const numFields = [
            'origRegisteredBreeders',
            'balanceBreederLastQuarter',
            'additionalBreederStock',
            'breederMortality',
            'registeredProgeniesWFP',
            'balanceProgeniesLastPeriod',
            'births',
            'progenyMortality',
            'disposal'
          ];
          if (numFields.includes(field as string)) {
            const parsed = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
            return { ...r, [field]: parsed };
          }
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  const handleAddRow = () => {
    const newRow: QuarterlyBreedingRow = {
      id: `row-${Date.now()}`,
      commonName: 'New Specimen Species',
      scientificName: 'Species scientific name',
      origRegisteredBreeders: 0,
      balanceBreederLastQuarter: 0,
      additionalBreederStock: 0,
      breederMortality: 0,
      registeredProgeniesWFP: 0,
      balanceProgeniesLastPeriod: 0,
      births: 0,
      progenyMortality: 0,
      disposal: 0,
      remarks: ''
    };
    setRows(prev => [...prev, newRow]);
  };

  const handleDeleteRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  // Calculations per row
  const computedRows = useMemo(() => {
    return rows.map(r => {
      // Total Current Breeders = Balance + Additional - Mortality
      const totalCurrentBreeders = Math.max(
        0,
        r.balanceBreederLastQuarter + r.additionalBreederStock - r.breederMortality
      );
      // Available progenies for disposal = Balance + Births - Mortality - Disposal
      const availableProgeniesForDisposal = Math.max(
        0,
        r.balanceProgeniesLastPeriod + r.births - r.progenyMortality - r.disposal
      );
      // Total current stock (Parental plus Progenies) = Total Current Breeders + Available progenies for disposal
      const totalCurrentStock = totalCurrentBreeders + availableProgeniesForDisposal;

      return {
        ...r,
        totalCurrentBreeders,
        availableProgeniesForDisposal,
        totalCurrentStock
      };
    });
  }, [rows]);

  // Overall Column Totals
  const totals = useMemo(() => {
    return computedRows.reduce(
      (acc, r) => {
        acc.origRegisteredBreeders += r.origRegisteredBreeders;
        acc.balanceBreederLastQuarter += r.balanceBreederLastQuarter;
        acc.additionalBreederStock += r.additionalBreederStock;
        acc.breederMortality += r.breederMortality;
        acc.totalCurrentBreeders += r.totalCurrentBreeders;

        acc.registeredProgeniesWFP += r.registeredProgeniesWFP;
        acc.balanceProgeniesLastPeriod += r.balanceProgeniesLastPeriod;
        acc.births += r.births;
        acc.progenyMortality += r.progenyMortality;
        acc.disposal += r.disposal;
        acc.availableProgeniesForDisposal += r.availableProgeniesForDisposal;

        acc.totalCurrentStock += r.totalCurrentStock;
        return acc;
      },
      {
        origRegisteredBreeders: 0,
        balanceBreederLastQuarter: 0,
        additionalBreederStock: 0,
        breederMortality: 0,
        totalCurrentBreeders: 0,
        registeredProgeniesWFP: 0,
        balanceProgeniesLastPeriod: 0,
        births: 0,
        progenyMortality: 0,
        disposal: 0,
        availableProgeniesForDisposal: 0,
        totalCurrentStock: 0
      }
    );
  }, [computedRows]);

  // Auto-sync with Live Facility Animals if requested
  const handleAutoPopulateFromLiveDatabase = () => {
    // Map distinct species in facility registry
    const speciesMap = new Map<string, { common: string; scientific: string; count: number }>();
    animals.forEach(a => {
      if (!a.isArchived) {
        const specKey = a.species || 'Unknown Species';
        if (!speciesMap.has(specKey)) {
          speciesMap.set(specKey, {
            common: a.species,
            scientific: a.scientificName || a.species,
            count: 1
          });
        } else {
          speciesMap.get(specKey)!.count++;
        }
      }
    });

    if (speciesMap.size === 0) {
      showToast('No active animals in database to sync from.');
      return;
    }

    const updatedRows: QuarterlyBreedingRow[] = Array.from(speciesMap.entries()).map(
      ([key, val], idx) => {
        const existing = rows.find(
          r => r.commonName.toLowerCase() === val.common.toLowerCase()
        );
        const birthsCount = breedingRecords
          .filter(b => b.species?.toLowerCase() === val.common.toLowerCase() && b.status === 'SUCCESSFUL')
          .reduce((sum, b) => sum + (b.hatchlings || 0), 0);

        return {
          id: existing?.id || `live-row-${idx + 1}`,
          commonName: val.common,
          scientificName: val.scientific,
          origRegisteredBreeders: existing?.origRegisteredBreeders ?? 0,
          balanceBreederLastQuarter: existing?.balanceBreederLastQuarter ?? val.count,
          additionalBreederStock: existing?.additionalBreederStock ?? 0,
          breederMortality: existing?.breederMortality ?? 0,
          registeredProgeniesWFP: existing?.registeredProgeniesWFP ?? 0,
          balanceProgeniesLastPeriod: existing?.balanceProgeniesLastPeriod ?? 0,
          births: birthsCount > 0 ? birthsCount : (existing?.births ?? 0),
          progenyMortality: existing?.progenyMortality ?? 0,
          disposal: existing?.disposal ?? 0,
          remarks: existing?.remarks ?? ''
        };
      }
    );

    setRows(updatedRows);
    showToast(`✓ Synced ${updatedRows.length} active species from facility inventory!`);
  };

  // Export to Official PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();

      // Header Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('QUARTERLY BREEDING REPORT', pageWidth / 2, 14, { align: 'center' });

      // Facility Metadata Block
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

      // Table Headers
      const head = [
        [
          { content: 'Species\n(Common & Scientific Name)', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } },
          { content: 'Parental/Breeder Stock', colSpan: 5, styles: { halign: 'center', fontStyle: 'bold' } },
          { content: 'Progeny', colSpan: 6, styles: { halign: 'center', fontStyle: 'bold' } },
          { content: 'Total current\nstock (Parental\nplus Progenies)', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Remarks', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
        ],
        [
          { content: 'Original/\nRegistered\nBreeders per\nWFP/CWR', styles: { halign: 'center' } },
          { content: 'Balance of\nbreeder/parental\nstock from last\nquarter', styles: { halign: 'center' } },
          { content: '*Additional\nBreeder/\nParental Stock', styles: { halign: 'center' } },
          { content: 'Mortality (Indicate\nMarkings)', styles: { halign: 'center' } },
          { content: 'Total Current\nBreeders', styles: { halign: 'center', fontStyle: 'bold' } },
          { content: `Registered\nProgenies as\nper WFP ${metadata.wfpRegRef || ''}`, styles: { halign: 'center' } },
          { content: '**Balance of\nProgenies for\nDisposal (from\nthe last period)', styles: { halign: 'center' } },
          { content: 'Births', styles: { halign: 'center' } },
          { content: 'Mortality\n(Indicate\nMarkings)', styles: { halign: 'center' } },
          { content: 'Disposal', styles: { halign: 'center' } },
          { content: 'Available\nprogenies for\ndisposal', styles: { halign: 'center', fontStyle: 'bold' } }
        ]
      ];

      // Table Body
      const body = computedRows.map(r => [
        `${r.commonName} (${r.scientificName})`,
        r.origRegisteredBreeders || 0,
        r.balanceBreederLastQuarter || 0,
        r.additionalBreederStock || 0,
        r.breederMortality || 0,
        r.totalCurrentBreeders || 0,
        r.registeredProgeniesWFP || 0,
        r.balanceProgeniesLastPeriod || 0,
        r.births || 0,
        r.progenyMortality || 0,
        r.disposal || 0,
        r.availableProgeniesForDisposal || 0,
        r.totalCurrentStock || 0,
        r.remarks || ''
      ]);

      // Total Row
      const foot = [
        [
          'TOTAL',
          totals.origRegisteredBreeders,
          totals.balanceBreederLastQuarter,
          totals.additionalBreederStock,
          totals.breederMortality,
          totals.totalCurrentBreeders,
          totals.registeredProgeniesWFP,
          totals.balanceProgeniesLastPeriod,
          totals.births,
          totals.progenyMortality,
          totals.disposal,
          totals.availableProgeniesForDisposal,
          totals.totalCurrentStock,
          ''
        ]
      ];

      autoTable(doc, {
        head: head as any,
        body: body as any,
        foot: foot as any,
        startY: 46,
        theme: 'grid',
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          lineColor: [0, 0, 0],
          lineWidth: 0.15,
          textColor: [0, 0, 0],
          valign: 'middle'
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 6.5,
          halign: 'center'
        },
        footStyles: {
          fillColor: [230, 230, 230],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 50, halign: 'left' },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 16, halign: 'center' },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 15, halign: 'center' },
          5: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
          6: { cellWidth: 16, halign: 'center' },
          7: { cellWidth: 16, halign: 'center' },
          8: { cellWidth: 12, halign: 'center' },
          9: { cellWidth: 14, halign: 'center' },
          10: { cellWidth: 13, halign: 'center' },
          11: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
          12: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          13: { cellWidth: 20, halign: 'left' }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 160;

      // Footnotes
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'italic');
      doc.text(
        '* no. of heads to be added as parental stocks that came from progenies from local legal source/s, or through importation',
        14,
        finalY + 4
      );
      doc.text(
        '** no. of available progenies from the last period for disposal (local sale or export) for trade/commercial purpose)',
        14,
        finalY + 7.5
      );
      doc.text(
        'Note: In case of donation/purchase, attach supporting documents and for mortalities, necropsy reports',
        14,
        finalY + 11
      );
      doc.text(
        'Use the following codes as entries in the appropriate columns: D- Donation   E- Exchange   P- Purchase   S- Sale',
        14,
        finalY + 14.5
      );

      // Signatures
      const sigY = finalY + 22;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Submitted by:', 14, sigY);
      doc.text('Validated by:', 140, sigY);
      doc.text(`DATE VALIDATED: ${metadata.dateValidated || '___________________'}`, 210, sigY - 8);

      doc.setFont('helvetica', 'bold');
      doc.text(metadata.submittedBy || metadata.permitteeName || 'Judaea Tobiah L. Vapor', 14, sigY + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('Name of the Permittee', 14, sigY + 14);

      if (metadata.validatedBy) {
        doc.setFont('helvetica', 'bold');
        doc.text(metadata.validatedBy, 140, sigY + 10);
      } else {
        doc.text('____________________________________', 140, sigY + 10);
      }
      doc.setFont('helvetica', 'normal');
      doc.text('Wildlife Enforcement Officer / Inspector', 140, sigY + 14);

      const fileName = `Quarterly_Breeding_Report_${metadata.quarter.replace(/\s+/g, '_')}_${metadata.year}.pdf`;
      doc.save(fileName);
      showToast(`✓ Downloaded ${fileName}!`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      showToast('Error generating PDF.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Species',
      'Scientific Name',
      'Original Registered Breeders',
      'Balance Breeder Last Quarter',
      'Additional Breeder Stock',
      'Breeder Mortality',
      'Total Current Breeders',
      'Registered Progenies WFP',
      'Balance Progenies Last Period',
      'Births',
      'Progeny Mortality',
      'Disposal',
      'Available Progenies for Disposal',
      'Total Current Stock',
      'Remarks'
    ];

    const csvRows = computedRows.map(r => [
      `"${r.commonName}"`,
      `"${r.scientificName}"`,
      r.origRegisteredBreeders,
      r.balanceBreederLastQuarter,
      r.additionalBreederStock,
      r.breederMortality,
      r.totalCurrentBreeders,
      r.registeredProgeniesWFP,
      r.balanceProgeniesLastPeriod,
      r.births,
      r.progenyMortality,
      r.disposal,
      r.availableProgeniesForDisposal,
      r.totalCurrentStock,
      `"${r.remarks || ''}"`
    ]);

    const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Quarterly_Breeding_Report_${metadata.quarter.replace(/\s+/g, '_')}_${metadata.year}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ CSV exported successfully!');
  };

  const handlePrint = () => {
    handleExportPDF();
    showToast('✓ Report compiled and downloaded as PDF for printing!');
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
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-xs">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black tracking-tight">Quarterly Breeding Report</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                DENR / CWR Format
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Database Synced</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Official regulatory compliance dossier for captive breeding, progeny reproduction, disposal, and live stock tracking.
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
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
            onClick={handleSaveData}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Report</span>
          </button>


        </div>
      </div>

      {/* Editable Facility Metadata Settings Drawer */}
      {isEditingMetadata && (
        <div
          className={`p-5 rounded-3xl border shadow-lg space-y-4 animate-in fade-in ${
            isDarkMode ? 'bg-[#030f08] border-emerald-900/80 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between border-b border-emerald-950/60 pb-3">
            <h3 className="text-sm font-black text-emerald-400 flex items-center space-x-2">
              <Building className="w-4 h-4" />
              <span>Facility Header & Permittee Parameters</span>
            </h3>
            <span className="text-xs text-slate-400">Values appear on official PDF and printed document</span>
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
              <label className="block font-bold text-slate-400 mb-1">Period Covered (Quarter & Year)</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={metadata.quarter}
                  onChange={e => handleQuarterChange(e.target.value as any)}
                  className={`p-2.5 rounded-xl border outline-none font-bold ${
                    isDarkMode ? 'bg-[#04160d] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="1st Quarter">1st Quarter (Jan-Mar)</option>
                  <option value="2nd Quarter">2nd Quarter (Apr-Jun)</option>
                  <option value="3rd Quarter">3rd Quarter (Jul-Sep)</option>
                  <option value="4th Quarter">4th Quarter (Oct-Dec)</option>
                </select>
                <input
                  type="number"
                  value={metadata.year}
                  onChange={e => handleYearChange(parseInt(e.target.value, 10) || 2026)}
                  className={`p-2.5 rounded-xl border outline-none font-bold text-center ${
                    isDarkMode ? 'bg-[#04160d] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Submitted By (Name of Permittee)</label>
              <input
                type="text"
                value={metadata.submittedBy}
                onChange={e => setMetadata(prev => ({ ...prev, submittedBy: e.target.value }))}
                className={`w-full p-2.5 rounded-xl border outline-none font-bold ${
                  isDarkMode ? 'bg-[#04160d] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Validated By (WEO / DENR Inspector)</label>
              <input
                type="text"
                placeholder="Optional inspector name"
                value={metadata.validatedBy}
                onChange={e => setMetadata(prev => ({ ...prev, validatedBy: e.target.value }))}
                className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                  isDarkMode ? 'bg-[#04160d] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Date Validated</label>
              <input
                type="date"
                value={metadata.dateValidated}
                onChange={e => setMetadata(prev => ({ ...prev, dateValidated: e.target.value }))}
                className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                  isDarkMode ? 'bg-[#04160d] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Document Layout (Styled to match the official government form) */}
      <div
        ref={printRef}
        className="official-report-paper bg-white text-slate-900 p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-300 shadow-2xl space-y-6 overflow-x-auto print:p-0 print:border-none print:shadow-none"
      >
        {/* Document Header */}
        <div className="text-center space-y-1 border-b-2 border-slate-900 pb-4">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
            QUARTERLY BREEDING REPORT
          </h1>
        </div>

        {/* Permittee & Facility Parameters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-xs font-semibold text-slate-800">
          <div className="flex items-baseline space-x-2">
            <span className="font-black text-slate-900 w-44 shrink-0">Name of Facility/Permittee:</span>
            <span className="font-bold border-b border-dotted border-slate-400 pb-0.5 flex-1 truncate">
              {metadata.facilityName || 'Flightless Dragons/ Judaea Tobiah Vapor'}
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="font-black text-slate-900 w-32 shrink-0">Contact No.:</span>
            <span className="font-bold border-b border-dotted border-slate-400 pb-0.5 flex-1">
              {metadata.contactNo || '9270347985'}
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="font-black text-slate-900 w-44 shrink-0">Address:</span>
            <span className="border-b border-dotted border-slate-400 pb-0.5 flex-1 truncate">
              {metadata.address || 'Block 9 Lot 5, Holly Street, Madera Grove Estates, Dakila, Malolos City, Bulacan'}
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="font-black text-slate-900 w-32 shrink-0">CWR/WFP No.:</span>
            <span className="font-mono font-bold border-b border-dotted border-slate-400 pb-0.5 flex-1">
              {metadata.cwrWfpNo || 'III-2023-076'}
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="font-black text-slate-900 w-44 shrink-0">Period Covered:</span>
            <span className="font-bold border-b border-dotted border-slate-400 pb-0.5 flex-1">
              {metadata.periodCovered || '4th Quarter 2025 (Oct-Dec)'}
            </span>
          </div>
        </div>

        {/* The 13-Column Master Grid Table */}
        <div className="overflow-x-auto border-2 border-slate-900">
          <table className="w-full text-center text-[10px] sm:text-[11px] border-collapse min-w-[1050px]">
            <thead>
              {/* Row 1: Group Headers */}
              <tr className="bg-slate-200 border-b border-slate-900 font-black text-slate-900">
                <th rowSpan={2} className="border-r border-slate-900 p-2 text-left w-52 bg-slate-300 text-slate-900">
                  Species<br />
                  <span className="font-normal text-[10px] text-slate-600">(Common & Scientific Name)</span>
                </th>
                <th colSpan={5} className="border-r border-slate-900 p-1.5 uppercase bg-slate-300 text-slate-900">
                  Parental / Breeder Stock
                </th>
                <th colSpan={6} className="border-r border-slate-900 p-1.5 uppercase bg-amber-100 text-slate-900">
                  Progeny
                </th>
                <th rowSpan={2} className="border-r border-slate-900 p-1.5 w-24 bg-slate-300 font-black text-slate-900">
                  Total current stock<br />
                  <span className="font-normal text-[9px] text-slate-600">(Parental plus Progenies)</span>
                </th>
                <th rowSpan={2} className="p-1.5 w-24 bg-slate-300 font-bold text-slate-900">
                  Remarks
                </th>
              </tr>

              {/* Row 2: Sub-columns */}
              <tr className="bg-slate-100 border-b-2 border-slate-900 font-bold text-slate-800 text-[9px] leading-tight">
                {/* Parental sub-cols */}
                <th className="border-r border-slate-900 p-1 w-14 bg-slate-100 text-slate-800">
                  Original/<br />Registered<br />Breeders per<br />WFP/CWR
                </th>
                <th className="border-r border-slate-900 p-1 w-16 bg-slate-100 text-slate-800">
                  Balance of<br />breeder/parental<br />stock from last<br />quarter
                </th>
                <th className="border-r border-slate-900 p-1 w-16 bg-slate-100 text-slate-800">
                  *Additional<br />Breeder/<br />Parental Stock
                </th>
                <th className="border-r border-slate-900 p-1 w-16 bg-slate-100 text-slate-800">
                  Mortality<br />(Indicate<br />Markings)
                </th>
                <th className="border-r border-slate-900 p-1 w-14 bg-slate-200 font-black text-slate-900">
                  Total Current<br />Breeders
                </th>

                {/* Progeny sub-cols */}
                <th className="border-r border-slate-900 p-1 w-16 bg-slate-100 text-slate-800">
                  Registered<br />Progenies as<br />per WFP {metadata.wfpRegRef}
                </th>
                <th className="border-r border-slate-900 p-1 w-16 bg-slate-100 text-slate-800">
                  **Balance of<br />Progenies for<br />Disposal (from<br />the last period)
                </th>
                <th className="border-r border-slate-900 p-1 w-12 bg-amber-50 text-slate-800">
                  Births
                </th>
                <th className="border-r border-slate-900 p-1 w-14 bg-slate-100 text-slate-800">
                  Mortality<br />(Indicate<br />Markings)
                </th>
                <th className="border-r border-slate-900 p-1 w-14 bg-slate-100 text-slate-800">
                  Disposal
                </th>
                <th className="border-r border-slate-900 p-1 w-16 bg-amber-100 font-black text-slate-900">
                  Available<br />progenies for<br />disposal
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-400 text-slate-900 font-medium">
              {computedRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-500 font-medium">
                    No species currently registered in the system. Add animals in Animal Management to generate this report.
                  </td>
                </tr>
              ) : (
                computedRows.map((r, idx) => (
                <tr key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  {/* Species Name Column */}
                  <td className="border-r border-slate-900 p-1.5 text-left font-bold">
                    <div className="flex items-center justify-between group">
                      <div>
                        <div className="text-slate-900 font-black text-[11px]">{r.commonName}</div>
                        <div className="text-slate-500 italic text-[10px]">({r.scientificName})</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(r.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity print:hidden"
                        title="Delete species row"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  {/* Parental Stock Columns */}
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="number"
                      min="0"
                      value={r.origRegisteredBreeders}
                      onChange={e => handleCellChange(r.id, 'origRegisteredBreeders', e.target.value)}
                      className="w-full text-center bg-transparent outline-none font-semibold hover:bg-emerald-50 focus:bg-emerald-100 rounded"
                    />
                  </td>
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="number"
                      min="0"
                      value={r.balanceBreederLastQuarter}
                      onChange={e => handleCellChange(r.id, 'balanceBreederLastQuarter', e.target.value)}
                      className="w-full text-center bg-transparent outline-none font-semibold hover:bg-emerald-50 focus:bg-emerald-100 rounded"
                    />
                  </td>
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="number"
                      min="0"
                      value={r.additionalBreederStock}
                      onChange={e => handleCellChange(r.id, 'additionalBreederStock', e.target.value)}
                      className="w-full text-center bg-transparent outline-none font-semibold hover:bg-emerald-50 focus:bg-emerald-100 rounded"
                    />
                  </td>
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="number"
                      min="0"
                      value={r.breederMortality}
                      onChange={e => handleCellChange(r.id, 'breederMortality', e.target.value)}
                      className="w-full text-center bg-transparent outline-none font-semibold text-rose-700 hover:bg-rose-50 focus:bg-rose-100 rounded"
                    />
                  </td>
                  {/* Total Current Breeders (Calculated) */}
                  <td className="border-r border-slate-900 p-1 font-black bg-slate-100 text-slate-900">
                    {r.totalCurrentBreeders}
                  </td>

                  {/* Progeny Columns */}
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="number"
                      min="0"
                      value={r.registeredProgeniesWFP}
                      onChange={e => handleCellChange(r.id, 'registeredProgeniesWFP', e.target.value)}
                      className="w-full text-center bg-transparent outline-none font-semibold hover:bg-emerald-50 focus:bg-emerald-100 rounded"
                    />
                  </td>
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="number"
                      min="0"
                      value={r.balanceProgeniesLastPeriod}
                      onChange={e => handleCellChange(r.id, 'balanceProgeniesLastPeriod', e.target.value)}
                      className="w-full text-center bg-transparent outline-none font-semibold hover:bg-emerald-50 focus:bg-emerald-100 rounded"
                    />
                  </td>
                  <td className="border-r border-slate-900 p-1 bg-amber-50/50">
                    <input
                      type="number"
                      min="0"
                      value={r.births}
                      onChange={e => handleCellChange(r.id, 'births', e.target.value)}
                      className="w-full text-center bg-transparent outline-none font-bold text-emerald-800 hover:bg-emerald-50 focus:bg-emerald-100 rounded"
                    />
                  </td>
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="number"
                      min="0"
                      value={r.progenyMortality}
                      onChange={e => handleCellChange(r.id, 'progenyMortality', e.target.value)}
                      className="w-full text-center bg-transparent outline-none font-semibold text-rose-700 hover:bg-rose-50 focus:bg-rose-100 rounded"
                    />
                  </td>
                  <td className="border-r border-slate-900 p-1">
                    <input
                      type="number"
                      min="0"
                      value={r.disposal}
                      onChange={e => handleCellChange(r.id, 'disposal', e.target.value)}
                      className="w-full text-center bg-transparent outline-none font-semibold hover:bg-emerald-50 focus:bg-emerald-100 rounded"
                    />
                  </td>
                  {/* Available progenies for disposal (Calculated) */}
                  <td className="border-r border-slate-900 p-1 font-black bg-amber-100/70 text-slate-900">
                    {r.availableProgeniesForDisposal}
                  </td>

                  {/* Total current stock (Calculated) */}
                  <td className="border-r border-slate-900 p-1 font-black bg-slate-200 text-slate-950 text-[12px]">
                    {r.totalCurrentStock}
                  </td>

                  {/* Remarks */}
                  <td className="p-1 text-left">
                    <input
                      type="text"
                      placeholder="e.g. S-Sale, D"
                      value={r.remarks || ''}
                      onChange={e => handleCellChange(r.id, 'remarks', e.target.value)}
                      className="w-full text-left bg-transparent outline-none text-[10px] hover:bg-slate-100 focus:bg-slate-100 rounded px-1"
                    />
                  </td>
                </tr>
              )))}

              {/* Total Row */}
              <tr className="bg-slate-300 font-black text-slate-950 border-t-2 border-slate-900 text-[11px]">
                <td className="border-r border-slate-900 p-2 text-left uppercase tracking-wider font-black">
                  TOTAL
                </td>
                <td className="border-r border-slate-900 p-1.5">{totals.origRegisteredBreeders}</td>
                <td className="border-r border-slate-900 p-1.5">{totals.balanceBreederLastQuarter}</td>
                <td className="border-r border-slate-900 p-1.5">{totals.additionalBreederStock}</td>
                <td className="border-r border-slate-900 p-1.5 text-rose-800">{totals.breederMortality}</td>
                <td className="border-r border-slate-900 p-1.5 bg-slate-400 text-black">{totals.totalCurrentBreeders}</td>

                <td className="border-r border-slate-900 p-1.5">{totals.registeredProgeniesWFP}</td>
                <td className="border-r border-slate-900 p-1.5">{totals.balanceProgeniesLastPeriod}</td>
                <td className="border-r border-slate-900 p-1.5 text-emerald-900">{totals.births}</td>
                <td className="border-r border-slate-900 p-1.5 text-rose-800">{totals.progenyMortality}</td>
                <td className="border-r border-slate-900 p-1.5">{totals.disposal}</td>
                <td className="border-r border-slate-900 p-1.5 bg-amber-200 text-black">{totals.availableProgeniesForDisposal}</td>

                <td className="border-r border-slate-900 p-1.5 bg-slate-400 text-black text-xs">
                  {totals.totalCurrentStock}
                </td>
                <td className="p-1.5"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Add Row Action Button */}
        <div className="flex justify-between items-center pt-2 print:hidden">
          <button
            type="button"
            onClick={handleAddRow}
            className="px-3.5 py-1.5 rounded-xl border border-dashed border-slate-400 hover:border-emerald-600 text-slate-700 hover:text-emerald-700 font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Species Row</span>
          </button>
          <span className="text-[11px] text-slate-500 italic">
            Click any cell to edit numbers directly. Calculations update in real-time.
          </span>
        </div>

        {/* Footnotes & Legal Reference Code */}
        <div className="space-y-1 text-[9.5px] sm:text-[10px] text-slate-700 border-t border-slate-300 pt-3 leading-relaxed">
          <p className="italic">
            * no. of heads to be added as parental stocks that came from progenies from local legal source/s, or through importation
          </p>
          <p className="italic">
            ** no. of available progenies from the last period for disposal (local sale or export) for trade/commercial purpose)
          </p>
          <p className="font-semibold">
            <span className="font-black text-slate-900">Note:</span> In case of donation/purchase, attach supporting documents and for mortalities, necropsy reports
          </p>
          <p className="font-semibold">
            <span className="font-black text-slate-900">Use the following codes as entries in the appropriate columns:</span>{' '}
            <span className="font-bold text-slate-900">D-</span> Donation &nbsp;&nbsp;{' '}
            <span className="font-bold text-slate-900">E-</span> Exchange &nbsp;&nbsp;{' '}
            <span className="font-bold text-slate-900">P-</span> Purchase &nbsp;&nbsp;{' '}
            <span className="font-bold text-slate-900">S-</span> Sale
          </p>
        </div>

        {/* Signatures & Validation Block */}
        <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-bold text-slate-900">
          <div className="space-y-6">
            <span className="block font-black">Submitted by:</span>
            <div className="border-b border-slate-900 pb-1 w-64">
              <span className="font-black text-sm uppercase">{metadata.submittedBy || 'Judaea Tobiah L. Vapor'}</span>
            </div>
            <span className="text-[11px] text-slate-600 font-normal block -mt-4">Name of the Permittee</span>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="font-black">Validated by:</span>
              <span className="text-[11px]">
                <strong className="text-slate-900">DATE VALIDATED:</strong>{' '}
                {metadata.dateValidated ? (
                  <span className="font-mono underline">{metadata.dateValidated}</span>
                ) : (
                  '___________________'
                )}
              </span>
            </div>
            <div className="border-b border-slate-900 pb-1 w-64">
              <span className="font-black text-sm uppercase">{metadata.validatedBy || '_________________________________'}</span>
            </div>
            <span className="text-[11px] text-slate-600 font-normal block -mt-4">
              Wildlife Enforcement Officer / DENR Inspector
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
