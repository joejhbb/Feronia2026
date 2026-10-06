import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon, Calendar, Plus, Clock, Stethoscope, AlertTriangle, CheckCircle2,
  X, Filter, Search, ChevronLeft, ChevronRight, CalendarDays, Check,
  PawPrint, Syringe, FileText, Info, User, Tag, ShieldCheck, Shield, Eye, ClipboardList, Download,
  ArrowRight, ArrowLeft, HeartPulse, CheckSquare, Box, RotateCcw, CalendarPlus, XCircle, Send, Camera
} from 'lucide-react';
import { Animal, Appointment, MedicalRecord, Enclosure, Task, StaffMember, getAppointmentRequesterInfo, resolveVeterinarianName, resolveAdminName, resolveKeeperName } from '../../types';
import { sortAppointmentsByTime } from '../../utils/timeUtils';
import VetDateYearPickerModal from './VetDateYearPickerModal';
import VetAnimalDetailView from './VetAnimalDetailView';
import { jsPDF } from 'jspdf';

interface ScheduleBreakdown {
  monthShort: string;
  dayNum: string;
  year: string;
  weekday: string;
  fullDateFormatted: string;
  relativeTag?: string;
  timeFormatted: string;
}

function parseScheduleDetails(dateStr?: string, timeStr?: string): ScheduleBreakdown {
  const defaultRes: ScheduleBreakdown = {
    monthShort: 'CAL',
    dayNum: '--',
    year: '',
    weekday: 'Scheduled',
    fullDateFormatted: dateStr || 'Date Pending',
    timeFormatted: timeStr || 'Time TBD'
  };
  if (!dateStr) return defaultRes;

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = Number(parts[0]);
    const m = Number(parts[1]) - 1;
    const d = Number(parts[2]);
    const dateObj = new Date(y, m, d);
    if (!isNaN(dateObj.getTime())) {
      const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const dayNum = String(dateObj.getDate()).padStart(2, '0');
      const year = String(dateObj.getFullYear());
      const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const fullDateFormatted = dateObj.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      let relativeTag: string | undefined;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(y, m, d);
      target.setHours(0, 0, 0, 0);
      const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) relativeTag = 'Today';
      else if (diffDays === 1) relativeTag = 'Tomorrow';
      else if (diffDays > 1 && diffDays <= 7) relativeTag = `In ${diffDays} days`;

      return {
        monthShort,
        dayNum,
        year,
        weekday,
        fullDateFormatted,
        relativeTag,
        timeFormatted: timeStr || 'Time TBD'
      };
    }
  }
  return defaultRes;
}

interface VetAppointmentsViewProps {
  animals: Animal[];
  enclosures?: Enclosure[];
  tasks?: Task[];
  appointments: Appointment[];
  staffMembers?: StaffMember[];
  medicalRecords?: MedicalRecord[];
  isDarkMode: boolean;
  systemDate: string;
  onAddAppointment?: (appointment: Appointment) => void;
  onUpdateAppointment?: (appointment: Appointment) => void;
  onUpdateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  onSelectAnimalForConsult: (animalId: string, appointmentId?: string) => void;
  onUpdateAnimal?: (updated: Animal) => void;
  onAddMedicalRecord?: (record: MedicalRecord) => void;
  initialSelectedDate?: string | null;
  onNavigateToAnimals?: () => void;
  onSelectAnimalForFollowup?: (animalId: string) => void;
  userAccount?: {
    name: string;
    email?: string;
  };
  onBackToDashboard?: () => void;
  onBack?: () => void;
}

export default function VetAppointmentsView({
  animals,
  enclosures = [],
  tasks = [],
  appointments,
  staffMembers = [],
  medicalRecords = [],
  isDarkMode,
  systemDate,
  onAddAppointment,
  onUpdateAppointment,
  onUpdateAppointmentStatus,
  onSelectAnimalForConsult,
  onUpdateAnimal,
  onAddMedicalRecord,
  initialSelectedDate = null,
  onNavigateToAnimals,
  onSelectAnimalForFollowup,
  userAccount,
  onBackToDashboard,
  onBack
}: VetAppointmentsViewProps) {
  const handleBack = onBack || onBackToDashboard;
  const [isDateYearPickerOpen, setIsDateYearPickerOpen] = useState(false);
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] = useState<Appointment | null>(null);
  const [selectedAnimalForModal, setSelectedAnimalForModal] = useState<Animal | null>(null);
  const [selectedForDecline, setSelectedForDecline] = useState<Appointment | null>(null);
  const [declineReason, setDeclineReason] = useState('Not available on this day');
  const [declineNotes, setDeclineNotes] = useState('');
  const [selectedForReschedule, setSelectedForReschedule] = useState<Appointment | null>(null);
  const [proposedRescheduleDate, setProposedRescheduleDate] = useState('');
  const [proposedRescheduleTime, setProposedRescheduleTime] = useState('10:00 AM');
  const [rescheduleReason, setRescheduleReason] = useState('Not available on original date / schedule adjustment');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [selectedForComplete, setSelectedForComplete] = useState<Appointment | null>(null);
  const [appointmentActionFeedback, setAppointmentActionFeedback] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'All' | 'From Admin' | 'My Requests' | 'Pending Approval' | 'Approved' | 'Ongoing' | 'Completed' | 'Emergency'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const handleDownloadPDF = (apt: Appointment) => {
    const patient = animals.find(a => a.id === apt.animalId);
    const record = medicalRecords.find(r => r.appointmentId === apt.id || (r.animalId === apt.animalId && r.recordDate === apt.date));

    const doc = new jsPDF();

    // Set professional dark green/slate themes for branding
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
    doc.setFontSize(18);
    doc.text('FERONIA WILDLIFE REPTILE SYSTEM', 14, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('OFFICIAL CLINICAL CONSULTATION REPORT & CLEARANCE', 14, 23);
    doc.text(`Report ID: DOC-MED-${apt.id.slice(-6).toUpperCase()}`, 14, 30);

    // Date Generated (Right aligned)
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toISOString().split('T')[0]}`, 196, 30, { align: 'right' });

    // Section 1: Patient Information
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('I. PATIENT PROFILE', 14, 52);

    // Box background for profile
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 56, 182, 38, 3, 3, 'FD');

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Name:', 20, 64);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patient?.name || 'Leo'}`, 55, 64);

    doc.setFont('helvetica', 'bold');
    doc.text('Species:', 20, 71);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patient?.species || 'Bearded Dragon'}`, 55, 71);

    doc.setFont('helvetica', 'bold');
    doc.text('Animal ID:', 20, 78);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patient?.id || apt.animalId}`, 55, 78);

    doc.setFont('helvetica', 'bold');
    doc.text('Enclosure ID:', 20, 85);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patient?.enclosureId || 'General'}`, 55, 85);

    // Right column of patient profile
    doc.setFont('helvetica', 'bold');
    doc.text('Sex / Gender:', 110, 64);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patient?.sex || 'Female'}`, 145, 64);

    doc.setFont('helvetica', 'bold');
    doc.text('Age Group:', 110, 71);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patient?.dob ? `${new Date().getFullYear() - new Date(patient.dob).getFullYear()} Year(s)` : '1 Year'}`, 145, 71);

    doc.setFont('helvetica', 'bold');
    doc.text('Current Status:', 110, 78);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patient?.healthStatus || 'Healthy'}`, 145, 78);

    doc.setFont('helvetica', 'bold');
    doc.text('Enclosure Temp/Hum:', 110, 85);
    doc.setFont('helvetica', 'normal');
    doc.text('Basking: 38C | Hum: 40%', 152, 85);

    // Section 2: Consultation & Session Parameters
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('II. APPOINTMENT & SESSION METRICS', 14, 106);

    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 110, 182, 30, 3, 3, 'D');

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Scheduled Date:', 20, 118);
    doc.setFont('helvetica', 'normal');
    doc.text(`${apt.date} (${apt.time})`, 55, 118);

    doc.setFont('helvetica', 'bold');
    doc.text('Requested By:', 20, 125);
    doc.setFont('helvetica', 'normal');
    doc.text(`${apt.requestedBy || 'Staff'}`, 55, 125);

    doc.setFont('helvetica', 'bold');
    doc.text('Priority Level:', 20, 132);
    doc.setFont('helvetica', 'normal');
    doc.text(`${apt.priority || 'Normal'}`, 55, 132);

    doc.setFont('helvetica', 'bold');
    doc.text('Attending Vet:', 110, 118);
    doc.setFont('helvetica', 'normal');
    doc.text(`${record?.veterinarian || apt.veterinarian || 'Dr. Vicente'}`, 145, 118);

    doc.setFont('helvetica', 'bold');
    doc.text('Consultation Type:', 110, 125);
    doc.setFont('helvetica', 'normal');
    doc.text(`${record?.recordType || 'Medical Examination'}`, 145, 125);

    // Section 3: Clinical Observations & Findings
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('III. VETERINARY CLINICAL FINDINGS', 14, 152);

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 156, 182, 90, 3, 3, 'FD');

    // Diagnosis
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Clinical Diagnosis & Conclusion:', 20, 166);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`${record?.diagnosis || 'Routine clinical monitoring'}`, 20, 172);

    // Clinical Observations
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Detailed Clinical Observations:', 20, 182);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Split clinical observations into wrapped lines
    const obsLines = doc.splitTextToSize(record?.clinicalObservation || 'Routine physical wellness checkup completed. Normal muscle tone, responsive reflexes, clear respiration, and healthy scale condition.', 170);
    doc.text(obsLines, 20, 188);

    // Prescription & Care Regimen
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Prescribed Medical Treatment & Keeper Instructions:', 20, 218);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const treatmentLines = doc.splitTextToSize(record?.treatment || 'None prescribed. Maintain standard thermal gradient and routine husbandry checks.', 170);
    doc.text(treatmentLines, 20, 224);

    // Section 4: Signatures & Certification
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(14, 256, 182, 0.5, 'F'); // Divider line

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('CERTIFYING AUTHORITY SIGN-OFF', 14, 264);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text('This document certifies that the reptile named above has undergone official clinical examination', 14, 269);
    doc.text('and the results are logged in the Feronia Facility Management System database.', 14, 273);

    // Signature placement
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('Dr. Vicente', 150, 280);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Chief Wildlife Veterinarian, Feronia', 150, 284);
    doc.text('Digital Signature Approved', 150, 288);

    // Save PDF file
    const fileName = `Feronia_VetReport_${patient?.name || apt.animalId}_${apt.date}.pdf`;
    doc.save(fileName);
  };
  const [selectedDate, setSelectedDate] = useState<string | null>(initialSelectedDate);

  // Request Checkup Modal state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [reqAnimalId, setReqAnimalId] = useState('');
  const [reqType, setReqType] = useState('Routine Check-up');
  const [reqCustomType, setReqCustomType] = useState('');
  const [reqPriority, setReqPriority] = useState<'Normal' | 'High' | 'Emergency'>('Normal');
  const [reqDate, setReqDate] = useState(systemDate || new Date().toISOString().split('T')[0]);
  const [reqTime, setReqTime] = useState('10:00 AM');
  const [reqNotes, setReqNotes] = useState('');

  // Sync initialSelectedDate if passed from notification click
  useEffect(() => {
    if (initialSelectedDate) {
      setSelectedDate(initialSelectedDate);
      const parts = initialSelectedDate.split('-');
      if (parts.length === 3) {
        const yr = parseInt(parts[0], 10);
        const mo = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (!isNaN(yr) && !isNaN(mo)) {
          setCalendarViewDate(new Date(yr, mo, isNaN(day) ? 1 : day));
        }
      }
    }
  }, [initialSelectedDate]);

  // Calendar Month Navigation
  const initialDate = systemDate ? new Date(systemDate) : new Date();
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(
    isNaN(initialDate.getTime()) ? new Date() : initialDate
  );

  // User account resolution for display & decline/reschedule
  const currentUserName = userAccount?.name
    || (typeof window !== 'undefined' ? (localStorage.getItem('feronia_vet_name') || localStorage.getItem('feronia_current_user_name')) : null)
    || (staffMembers?.find(s => s.role === 'vet' && s.status !== 'Inactive')?.name)
    || 'Attending Veterinarian';

  const activeAnimals = animals.filter(a => !a.isArchived);

  // Helper date formatter: "July 1, 2026 (Wednesday)"
  const formatDateWithWeekday = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} (${days[d.getDay()]})`;
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' });
      }
    } catch {
      // ignore
    }
    return dateStr;
  };

  // Helper date formatter: "June 28, 2026 10:15 AM"
  const formatDateTimeDisplay = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return 'June 28, 2026 10:15 AM';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const formattedDate = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
        return timeStr ? `${formattedDate} ${timeStr}` : `${formattedDate} 10:15 AM`;
      }
    } catch {
      // ignore
    }
    return `${dateStr} ${timeStr || '10:15 AM'}`;
  };

  // Age calculation helper
  const calculateAnimalAge = (dob?: string) => {
    if (!dob) return '6 Years';
    try {
      const birthDate = new Date(dob);
      if (isNaN(birthDate.getTime())) return 'Adult (6 Years)';
      const now = new Date();
      let years = now.getFullYear() - birthDate.getFullYear();
      let months = now.getMonth() - birthDate.getMonth();
      if (months < 0) {
        years--;
        months += 12;
      }
      if (years > 0) {
        return `${years} Year${years > 1 ? 's' : ''}`;
      }
      if (months > 0) {
        return `${months} Month${months > 1 ? 's' : ''}`;
      }
      return 'Under 1 Month';
    } catch {
      return '6 Years';
    }
  };

  const showFeedback = (msg: string) => {
    setAppointmentActionFeedback(msg);
    setTimeout(() => setAppointmentActionFeedback(null), 4500);
  };

  const handleAcceptAppointment = (apt: Appointment) => {
    const patient = animals.find(a => a.id === apt.animalId);
    const patientName = patient?.name || apt.animalId;
    const updated: Appointment = {
      ...apt,
      status: 'Approved',
      approvedBy: userAccount?.name || 'Dr. Vicente (Veterinarian)',
      approvedAt: systemDate || new Date().toISOString()
    };
    if (onUpdateAppointment) {
      onUpdateAppointment(updated);
    } else {
      onUpdateAppointmentStatus(apt.id, 'Approved');
    }
    if (selectedAppointmentForDetails?.id === apt.id) {
      setSelectedAppointmentForDetails(updated);
    }
    showFeedback(`✓ Confirmed appointment for ${patientName} on ${apt.date} at ${apt.time}.`);
  };

  const handleAcceptAdminReschedule = (apt: Appointment) => {
    const patient = animals.find(a => a.id === apt.animalId);
    const patientName = patient?.name || apt.animalId;
    const newDate = apt.proposedDate || apt.date;
    const newTime = apt.proposedTime || apt.time;
    const updated: Appointment = {
      ...apt,
      date: newDate,
      time: newTime,
      status: 'Approved',
      approvedBy: userAccount?.name || 'Dr. Vicente (Veterinarian)',
      approvedAt: systemDate || new Date().toISOString(),
      adminNotes: apt.rescheduleNotes ? `Reschedule accepted by Dr. Vicente. Note: ${apt.rescheduleNotes}` : apt.adminNotes
    };
    if (onUpdateAppointment) {
      onUpdateAppointment(updated);
    } else {
      onUpdateAppointmentStatus(apt.id, 'Approved');
    }
    if (selectedAppointmentForDetails?.id === apt.id) {
      setSelectedAppointmentForDetails(updated);
    }
    showFeedback(`✓ Accepted Admin's proposed reschedule for ${patientName} on ${newDate} at ${newTime}.`);
  };

  const handleConfirmDecline = () => {
    if (!selectedForDecline) return;
    const patient = animals.find(a => a.id === selectedForDecline.animalId);
    const patientName = patient?.name || selectedForDecline.animalId;
    const updated: Appointment = {
      ...selectedForDecline,
      status: 'Declined',
      declineReason: declineReason || 'Not available on this day',
      declineNotes: declineNotes.trim() || undefined,
      declinedBy: userAccount?.name || 'Dr. Vicente (Veterinarian)',
      declinedAt: systemDate || new Date().toISOString(),
      adminNotes: declineNotes.trim() ? `Declined by Vet: ${declineReason} - "${declineNotes.trim()}"` : `Declined by Vet: ${declineReason}`
    };
    if (onUpdateAppointment) {
      onUpdateAppointment(updated);
    } else {
      onUpdateAppointmentStatus(selectedForDecline.id, 'Declined');
    }
    if (selectedAppointmentForDetails?.id === selectedForDecline.id) {
      setSelectedAppointmentForDetails(updated);
    }
    showFeedback(`✕ Marked appointment for ${patientName} as Declined (${declineReason}).`);
    setSelectedForDecline(null);
    setDeclineNotes('');
  };

  const openRescheduleModal = (apt: Appointment) => {
    setSelectedForReschedule(apt);
    setProposedRescheduleDate(apt.proposedDate || apt.date || systemDate || new Date().toISOString().split('T')[0]);
    setProposedRescheduleTime(apt.proposedTime || apt.time || '10:00 AM');
    setRescheduleReason(apt.rescheduleReason || 'Schedule conflict / clinical duty adjustment');
    setRescheduleNotes(apt.rescheduleNotes || '');
  };

  const handleConfirmReschedule = () => {
    if (!selectedForReschedule) return;
    const patient = animals.find(a => a.id === selectedForReschedule.animalId);
    const patientName = patient?.name || selectedForReschedule.animalId;
    const updated: Appointment = {
      ...selectedForReschedule,
      status: 'Reschedule Requested',
      proposedDate: proposedRescheduleDate || selectedForReschedule.date,
      proposedTime: proposedRescheduleTime || selectedForReschedule.time,
      rescheduleReason: rescheduleReason || 'Not available on original date / schedule adjustment',
      rescheduleNotes: rescheduleNotes.trim() || undefined,
      rescheduledBy: 'vet',
      rescheduledByName: userAccount?.name || 'Dr. Vicente (Veterinarian)',
      rescheduledAt: systemDate || new Date().toISOString()
    };
    if (onUpdateAppointment) {
      onUpdateAppointment(updated);
    } else {
      onUpdateAppointmentStatus(selectedForReschedule.id, 'Reschedule Requested');
    }
    if (selectedAppointmentForDetails?.id === selectedForReschedule.id) {
      setSelectedAppointmentForDetails(updated);
    }
    showFeedback(`✓ Reschedule proposal sent to Facility Administrator for ${patientName} (${updated.proposedDate} at ${updated.proposedTime}). Awaiting admin sign-off.`);
    setSelectedForReschedule(null);
    setRescheduleNotes('');
  };

  const handleVetCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqAnimalId) return;
    const finalType = reqType === 'Other' ? (reqCustomType.trim() || 'Other Health Checkup') : reqType;
    const patient = animals.find(a => a.id === reqAnimalId);
    const vetName = currentUserName || 'Dr. Vicente';
    const vetEmail = userAccount?.email || 'vicente.vet@feroniasanctuary.org';

    const newApt: Appointment = {
      id: `APP-2026-${Date.now().toString().slice(-5)}`,
      animalId: reqAnimalId,
      type: finalType,
      veterinarian: vetName,
      requestedBy: `${vetName} (Veterinarian Follow-up Request)`,
      requestedByRole: 'vet',
      requestedById: 'STF-VET-001',
      requestedByEmail: vetEmail,
      date: reqDate || systemDate || new Date().toISOString().split('T')[0],
      time: reqTime || '10:00 AM',
      priority: reqPriority,
      status: 'Pending Approval',
      purpose: reqNotes.trim() || `Veterinary Follow-up Checkup for ${patient?.name || reqAnimalId} (${patient?.species || 'Reptile'})`,
      createdOn: systemDate || new Date().toISOString().split('T')[0]
    };

    if (onAddAppointment) {
      onAddAppointment(newApt);
    }
    showFeedback(`✓ Follow-up request submitted for ${patient?.name || reqAnimalId} (${reqDate || 'selected date'} at ${reqTime || '10:00 AM'}). Awaiting Sanctuary Admin authorization.`);
    setIsRequestModalOpen(false);
    setReqNotes('');
    setReqCustomType('');
  };

  // Calendar Calculations
  const currentYear = calendarViewDate.getFullYear();
  const currentMonth = calendarViewDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const prevMonth = () => {
    setCalendarViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCalendarViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    const today = systemDate ? new Date(systemDate) : new Date();
    setCalendarViewDate(today);
    const dateStr = systemDate || new Date().toISOString().split('T')[0];
    setSelectedDate(dateStr);
  };

  const handleSelectDateFromAppointment = (dateStr: string) => {
    setSelectedDate(dateStr);
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(yr) && !isNaN(mo)) {
        setCalendarViewDate(new Date(yr, mo, isNaN(day) ? 1 : day));
      }
    }
  };

  // Helper to determine if an appointment is part of the veterinarian's schedule
  // (Either a follow-up requested by the vet to track admin approval, or a schedule directly assigned by the admin)
  const getVetScheduleInfo = (apt: Appointment) => {
    const requester = getAppointmentRequesterInfo(apt);
    const reqStr = `${apt.requestedBy || ''} ${apt.requestedByRole || ''} ${requester.name} ${requester.roleLabel}`.toLowerCase();
    
    // Check if requested by Vet / Current User
    const isVetRequest = apt.requestedByRole === 'vet' || requester.role === 'vet' || (apt.id && (apt.id.startsWith('APT-VET') || apt.id.startsWith('APP-'))) || reqStr.includes('vet') || reqStr.includes('dr. vicente') || reqStr.includes('veterinarian');
    
    // Check if requested / assigned by Admin
    const isAdminSchedule = apt.requestedByRole === 'admin' || (requester.role === 'admin' && !isVetRequest) || (apt.id && (apt.id.startsWith('APT-ADM') || apt.id.startsWith('APT-SCHED'))) || reqStr.includes('admin') || reqStr.includes('eleanor');

    // If an appointment is approved by Admin, it is officially confirmed in the clinical schedule
    const isApprovedSchedule = apt.status === 'Approved' || apt.status === 'Ongoing' || apt.status === 'Completed';

    // Vet follow-up request awaiting admin approval
    const isPendingAdminAuth = isVetRequest && (apt.status === 'Pending Approval' || apt.status === 'Pending');

    // The vet schedule view shows:
    // 1. Follow-up requests submitted by the vet (to track whether approved by administrator)
    // 2. Schedules originating from admin (whether the patient has an assigned schedule from admin)
    // 3. Approved clinical appointments
    const isVisibleInVetSchedule = isVetRequest || isAdminSchedule || isApprovedSchedule;

    return {
      isVisibleInVetSchedule,
      isVetRequest,
      isAdminSchedule,
      isPendingAdminAuth,
      originLabel: isAdminSchedule ? 'Schedule from Admin' : isVetRequest ? 'My Follow-up Request' : 'Approved Consultation',
      originBadgeColor: isAdminSchedule ? 'admin' : isVetRequest ? 'vet' : 'general'
    };
  };

  // Only appointments that belong to the vet's schedule:
  // - Vet's own follow-up requests (to see if approved or pending)
  // - Admin assigned schedules
  // - Approved schedules
  const vetAppointments = useMemo(() => {
    return appointments.filter(apt => getVetScheduleInfo(apt).isVisibleInVetSchedule);
  }, [appointments]);

  const adminSchedulesCount = useMemo(() => {
    return vetAppointments.filter(apt => apt.status !== 'Completed' && apt.status !== 'Cancelled' && apt.status !== 'Declined' && getVetScheduleInfo(apt).isAdminSchedule).length;
  }, [vetAppointments]);

  const vetRequestsCount = useMemo(() => {
    return vetAppointments.filter(apt => apt.status !== 'Completed' && apt.status !== 'Cancelled' && apt.status !== 'Declined' && getVetScheduleInfo(apt).isVetRequest).length;
  }, [vetAppointments]);

  // Group vet appointments by date for the calendar
  const appointmentsByDate = useMemo(() => {
    return vetAppointments.reduce((acc, apt) => {
      if (!acc[apt.date]) {
        acc[apt.date] = [];
      }
      acc[apt.date].push(apt);
      return acc;
    }, {} as Record<string, Appointment[]>);
  }, [vetAppointments]);

  // Filtered Appointments sorted chronologically (earliest first)
  const filteredAppointments = sortAppointmentsByTime(
    vetAppointments.filter(apt => {
      const patient = activeAnimals.find(a => a.id === apt.animalId);
      const matchesSearch = (patient?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            apt.animalId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            apt.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            apt.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (apt.requestedBy || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // Date Filter from Calendar
      if (selectedDate && apt.date !== selectedDate) {
        return false;
      }

      // Hide completed/cancelled/declined from non-completed tabs
      if (filterTab !== 'Completed') {
        if (apt.status === 'Completed' || apt.status === 'Cancelled' || apt.status === 'Declined') {
          return false;
        }
      }

      const info = getVetScheduleInfo(apt);

      if (filterTab === 'From Admin') return info.isAdminSchedule;
      if (filterTab === 'My Requests') return info.isVetRequest;
      if (filterTab === 'Pending Approval') return apt.status === 'Pending Approval';
      if (filterTab === 'Approved') return apt.status === 'Approved' || apt.status === 'Pending';
      if (filterTab === 'Ongoing') return apt.status === 'Ongoing';
      if (filterTab === 'Completed') return apt.status === 'Completed';
      if (filterTab === 'Emergency') return apt.priority === 'Emergency' || apt.priority === 'High';
      return true;
    })
  );

  // Calendar Day Cells
  const calendarCells = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevDateMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevDateYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const dateStr = `${prevDateYear}-${String(prevDateMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({
      day: dayNum,
      dateStr,
      isCurrentMonth: false
    });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      day: d,
      dateStr,
      isCurrentMonth: true
    });
  }

  // Next month leading days (fill up 35 or 42 grid slots)
  const remainingCells = (calendarCells.length % 7 === 0) ? 0 : 7 - (calendarCells.length % 7);
  for (let d = 1; d <= remainingCells; d++) {
    const nextDateMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextDateYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const dateStr = `${nextDateYear}-${String(nextDateMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      day: d,
      dateStr,
      isCurrentMonth: false
    });
  }

  const todayStr = systemDate || new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
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
          <div>
            <h1 className={`text-xl sm:text-2xl font-black flex items-center space-x-2.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <span>Clinical Appointments & Schedule</span>
            </h1>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Track schedules assigned by Admin and review approval status of your clinical follow-up requests.
            </p>
          </div>
        </div>

        {onAddAppointment && (
          <button
            type="button"
            onClick={() => {
              if (activeAnimals.length > 0 && !reqAnimalId) {
                setReqAnimalId(activeAnimals[0].id);
              }
              setIsRequestModalOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all flex items-center space-x-2 cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <CalendarPlus className="w-4 h-4 stroke-[2.5]" />
            <span>Request Checkup</span>
          </button>
        )}
      </div>

      {/* Vet Schedule Overview Callout Banner */}
      <div className={`p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
        isDarkMode ? 'bg-[#061c12] border-emerald-900/60 text-emerald-100' : 'bg-emerald-50/90 border-emerald-200 text-emerald-950 shadow-2xs'
      }`}>
        <div className="flex items-center space-x-2.5">
          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
            isDarkMode ? 'bg-emerald-900/60 border-emerald-700/60 text-emerald-300' : 'bg-emerald-100 border-emerald-300 text-emerald-800'
          }`}>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold">
              Veterinary Schedule & Follow-up Tracker
            </p>
            <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-emerald-300/80' : 'text-emerald-800/90'}`}>
              Displaying schedules assigned by Admin and follow-ups submitted by the vet for Admin approval.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px] font-mono shrink-0">
          <button
            onClick={() => {
              setFilterTab('From Admin');
              setSelectedDate(null);
            }}
            className={`px-2.5 py-1 rounded-lg border font-bold flex items-center space-x-1 cursor-pointer transition-all ${
              filterTab === 'From Admin'
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                : isDarkMode ? 'bg-blue-950/60 border-blue-800/60 text-blue-300 hover:bg-blue-900/50' : 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100'
            }`}
          >
            <span>🛡️ From Admin: {adminSchedulesCount}</span>
          </button>
          <button
            onClick={() => {
              setFilterTab('My Requests');
              setSelectedDate(null);
            }}
            className={`px-2.5 py-1 rounded-lg border font-bold flex items-center space-x-1 cursor-pointer transition-all ${
              filterTab === 'My Requests'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                : isDarkMode ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/50' : 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
            }`}
          >
            <span>🌿 My Requests: {vetRequestsCount}</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout: Left Calendar & Right Schedule List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Interactive Calendar & Quick Summary */}
        <div className="lg:col-span-4 space-y-4">
          {/* Calendar Widget Card */}
          <div className={`p-4 sm:p-5 rounded-3xl border transition-colors ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950/80 shadow-lg' : 'bg-white border-slate-100 shadow-sm'
          }`}>
            {/* Calendar Header / Month Selector */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-950/30">
              <div>
                <button
                  type="button"
                  onClick={() => setIsDateYearPickerOpen(true)}
                  className={`group flex items-center space-x-2 text-left rounded-xl p-1 -ml-1 transition-all cursor-pointer ${
                    isDarkMode ? 'hover:bg-emerald-950/70 text-white' : 'hover:bg-emerald-50 text-slate-900'
                  }`}
                  title="Click date or year to open calendar and change view dates"
                >
                  <h3 className="font-black text-base flex items-center space-x-1.5">
                    <span className="underline decoration-dotted decoration-emerald-500/50 group-hover:decoration-emerald-400 underline-offset-4">
                      {monthNames[currentMonth]}
                    </span>
                    <span className="text-emerald-400 underline decoration-dotted decoration-emerald-500/70 group-hover:text-emerald-300 underline-offset-4">
                      {currentYear}
                    </span>
                  </h3>
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold group-hover:bg-emerald-500/30 transition-colors flex items-center space-x-0.5">
                    <CalendarDays className="w-3 h-3" />
                  </span>
                </button>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {selectedDate ? (
                    <button
                      type="button"
                      onClick={() => setIsDateYearPickerOpen(true)}
                      className={`text-left cursor-pointer hover:underline flex items-center space-x-1 ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}
                      title="Click to change date"
                    >
                      <span>Filtered by:</span>
                      <strong className="text-emerald-400 underline">{selectedDate}</strong>
                    </button>
                  ) : (
                    <span>Showing all dates • <button type="button" onClick={() => setIsDateYearPickerOpen(true)} className="text-emerald-400 hover:underline font-bold cursor-pointer">Pick Date</button></span>
                  )}
                </p>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={prevMonth}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isDarkMode ? 'border-emerald-950/60 text-slate-300 hover:bg-[#04110A] hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToToday}
                  className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
                    isDarkMode ? 'border-emerald-950/60 text-emerald-400 hover:bg-[#04110A]' : 'border-slate-200 text-emerald-700 hover:bg-slate-100'
                  }`}
                  title="Jump to Today"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isDarkMode ? 'border-emerald-950/60 text-slate-300 hover:bg-[#04110A] hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {daysOfWeek.map((day, idx) => (
                <div
                  key={day}
                  className={`text-[10px] font-black uppercase tracking-wider py-1 ${
                    idx === 0 || idx === 6 ? 'text-emerald-500/70' : 'text-slate-400'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((cell, idx) => {
                const dayApts = appointmentsByDate[cell.dateStr] || [];
                const hasApts = dayApts.length > 0;
                const isSelected = selectedDate === cell.dateStr;
                const isToday = todayStr === cell.dateStr;

                return (
                  <button
                    key={`${cell.dateStr}-${idx}`}
                    onClick={() => {
                      if (selectedDate === cell.dateStr) {
                        setSelectedDate(null); // toggle off to show all
                      } else {
                        setSelectedDate(cell.dateStr);
                      }
                    }}
                    title={
                      hasApts
                        ? `${cell.dateStr}: ${dayApts.length} appointment(s)\n` +
                          dayApts.map(a => `• [${a.priority}] ${a.time} - ${a.animalId} (${a.type})`).join('\n')
                        : cell.dateStr
                    }
                    className={`relative min-h-[46px] p-1 rounded-xl flex flex-col items-center justify-between transition-all cursor-pointer text-xs font-semibold ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-extrabold shadow-md ring-2 ring-emerald-400 scale-[1.03] z-10'
                        : isToday
                          ? (isDarkMode ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/60' : 'bg-emerald-100 text-emerald-900 border border-emerald-400')
                          : cell.isCurrentMonth
                            ? (isDarkMode ? 'bg-[#04110A]/80 text-slate-200 hover:bg-emerald-950/40 hover:text-white border border-emerald-950/50' : 'bg-slate-50/80 text-slate-700 hover:bg-emerald-50 border border-slate-100')
                            : (isDarkMode ? 'text-slate-600 hover:bg-[#04110A]/50 border border-transparent' : 'text-slate-300 hover:bg-slate-50 border border-transparent')
                    }`}
                  >
                    <span className="text-[11px] leading-tight font-bold">{cell.day}</span>

                    {/* Colored Dots for Every Appointment based on Priority */}
                    {hasApts ? (
                      <div className="flex items-center justify-center flex-wrap gap-1 w-full px-0.5 mt-0.5">
                        {dayApts.slice(0, 4).map((apt) => {
                          const isEmergency = apt.priority === 'Emergency';
                          const isHigh = apt.priority === 'High';
                          // Emergency = Rose, High = Amber, Normal = Emerald
                          let dotClass = isEmergency
                            ? 'bg-rose-500 ring-1 ring-rose-300'
                            : isHigh
                              ? 'bg-amber-400 ring-1 ring-amber-200'
                              : 'bg-emerald-400 ring-1 ring-emerald-200';

                          if (isSelected) {
                            dotClass = isEmergency
                              ? 'bg-rose-200 ring-1 ring-white'
                              : isHigh
                                ? 'bg-amber-200 ring-1 ring-white'
                                : 'bg-white ring-1 ring-emerald-200';
                          }

                          return (
                            <span
                              key={apt.id}
                              title={`${apt.time} - ${apt.animalId} (${apt.priority})`}
                              className={`w-2 h-2 rounded-full shrink-0 ${dotClass} ${isEmergency ? 'animate-pulse' : ''}`}
                            />
                          );
                        })}
                        {dayApts.length > 4 && (
                          <span className={`text-[8px] font-black leading-none ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                            +{dayApts.length - 4}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="h-2" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Calendar Priority Legend */}
            <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[10px] ${
              isDarkMode ? 'border-emerald-950/40 text-slate-400' : 'border-slate-100 text-slate-500'
            }`}>
              <span className="font-bold text-slate-400">Priority:</span>
              <div className="flex items-center space-x-2.5">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 ring-1 ring-rose-300 animate-pulse" />
                  <span className={isDarkMode ? 'text-rose-300 font-semibold' : 'text-rose-700 font-semibold'}>Emergency</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 ring-1 ring-amber-200" />
                  <span className={isDarkMode ? 'text-amber-300 font-semibold' : 'text-amber-700 font-semibold'}>High</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-emerald-200" />
                  <span className={isDarkMode ? 'text-emerald-300 font-semibold' : 'text-emerald-700 font-semibold'}>Normal</span>
                </span>
              </div>
            </div>

            {/* Calendar Quick Action Bar */}
            <div className="mt-4 pt-3 border-t border-emerald-950/30 flex items-center justify-between text-xs">
              <button
                onClick={() => setSelectedDate(null)}
                className={`text-[11px] font-bold transition-colors cursor-pointer flex items-center space-x-1 ${
                  selectedDate === null
                    ? 'text-emerald-400'
                    : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>View All Appointments</span>
              </button>

              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900 transition-colors cursor-pointer"
                >
                  Clear Date Filter
                </button>
              )}
            </div>
          </div>

          {/* Schedule Statistics & Priority Digest */}
          <div className={`p-4 sm:p-5 rounded-3xl border transition-colors ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950/80' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <h4 className={`font-extrabold text-xs uppercase tracking-wider mb-3 flex items-center space-x-2 ${
              isDarkMode ? 'text-white' : 'text-slate-800'
            }`}>
              <CalendarDays className="w-3.5 h-3.5 text-emerald-500" />
              <span>Schedule Breakdown</span>
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`p-2.5 rounded-xl border ${
                isDarkMode ? 'bg-[#04110A] border-emerald-950/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Total in Schedule</p>
                <p className={`text-base font-black mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vetAppointments.length}</p>
              </div>

              <div className={`p-2.5 rounded-xl border ${
                isDarkMode ? 'bg-[#04110A] border-emerald-950/60' : 'bg-blue-50/70 border-blue-200'
              }`}>
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">From Admin</p>
                <p className="text-base font-black text-blue-600 dark:text-blue-300 mt-0.5">
                  {adminSchedulesCount}
                </p>
              </div>

              <div className={`p-2.5 rounded-xl border ${
                isDarkMode ? 'bg-[#04110A] border-emerald-950/60' : 'bg-emerald-50/70 border-emerald-200'
              }`}>
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Approved by Admin</p>
                <p className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {vetAppointments.filter(a => a.status === 'Approved' || a.status === 'Pending').length}
                </p>
              </div>

              <div className={`p-2.5 rounded-xl border ${
                isDarkMode ? 'bg-[#04110A] border-emerald-950/60' : 'bg-amber-50/70 border-amber-200'
              }`}>
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Pending Approval</p>
                <p className="text-base font-black text-amber-600 dark:text-amber-300 mt-0.5">
                  {vetAppointments.filter(a => a.status === 'Pending Approval').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Filters, Date Banner, and Appointments Timeline List */}
        <div className="lg:col-span-8 space-y-4">
          {/* Active Date Filter Banner */}
          {selectedDate && (
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs animate-fade-in shadow-md ${
              isDarkMode ? 'bg-emerald-950/60 border-emerald-700/60 text-white' : 'bg-emerald-50 border-emerald-300 text-emerald-950'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center border ${
                  isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-200 text-emerald-800 border-emerald-300'
                }`}>
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Showing appointments for </span>
                  <button
                    type="button"
                    onClick={() => setIsDateYearPickerOpen(true)}
                    className={`font-black underline decoration-dotted hover:underline cursor-pointer inline-flex items-center space-x-1 ${
                      isDarkMode ? 'text-emerald-300 decoration-emerald-400' : 'text-emerald-700 decoration-emerald-600'
                    }`}
                    title="Click date to open calendar and change view"
                  >
                    <span>{selectedDate}</span>
                    <CalendarDays className="w-3.5 h-3.5 ml-1" />
                  </button>
                  <span className={`font-mono text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}> ({filteredAppointments.length} found)</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsDateYearPickerOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Change Date / Year
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-[11px] font-bold text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Show All
                </button>
              </div>
            </div>
          )}

          {/* Filter Tabs & Search & Interactive Date Picker Trigger */}
          <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 transition-colors ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950/60' : 'bg-white border-slate-100 shadow-2xs'
          }`}>
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              {(['All', 'From Admin', 'My Requests', 'Approved', 'Pending Approval', 'Ongoing', 'Completed', 'Emergency'] as const).map(tab => {
                const count = tab === 'All'
                  ? vetAppointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'Declined').length
                  : tab === 'From Admin'
                    ? vetAppointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'Declined' && getVetScheduleInfo(a).isAdminSchedule).length
                    : tab === 'My Requests'
                      ? vetAppointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'Declined' && getVetScheduleInfo(a).isVetRequest).length
                      : tab === 'Approved'
                        ? vetAppointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'Declined' && (a.status === 'Approved' || a.status === 'Pending')).length
                        : tab === 'Pending Approval'
                          ? vetAppointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'Declined' && a.status === 'Pending Approval').length
                          : tab === 'Ongoing'
                            ? vetAppointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'Declined' && a.status === 'Ongoing').length
                            : tab === 'Completed'
                              ? vetAppointments.filter(a => a.status === 'Completed').length
                              : vetAppointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'Declined' && (a.priority === 'Emergency' || a.priority === 'High')).length;

                return (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      filterTab === tab
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isDarkMode
                          ? 'text-slate-400 hover:text-slate-200 hover:bg-[#04110A]'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span>
                      {tab === 'Emergency' ? 'Priority' : tab}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                      filterTab === tab
                        ? 'bg-white/20 text-white'
                        : isDarkMode ? 'bg-emerald-950/80 text-emerald-300' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto">
              {/* Interactive Calendar Date/Year Trigger Button */}
              <button
                type="button"
                onClick={() => setIsDateYearPickerOpen(true)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shrink-0 ${
                  selectedDate
                    ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 shadow-xs'
                    : isDarkMode
                      ? 'bg-[#04110A] border-emerald-950 text-slate-300 hover:text-emerald-300 hover:border-emerald-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title="Click to open calendar and select date or year"
              >
                <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">
                  {selectedDate ? selectedDate : `${monthNames[currentMonth]} ${currentYear}`}
                </span>
              </button>

              <div className="relative w-full md:w-48">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search appointments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Appointments List */}
          <div className="space-y-3">
            {filteredAppointments.length === 0 ? (
              <div className={`py-12 text-center text-xs rounded-2xl border transition-colors ${
                isDarkMode ? 'bg-[#06180F] border-emerald-950/40 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-2xs'
              }`}>
                <CalendarIcon className={`w-6 h-6 mx-auto mb-2 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                <p className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>No clinical appointments matching this criteria.</p>
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="mt-2 text-emerald-500 hover:underline font-bold text-xs cursor-pointer"
                  >
                    View all appointments across all dates
                  </button>
                )}
              </div>
            ) : (
              filteredAppointments.map(apt => {
                const patient = activeAnimals.find(a => a.id === apt.animalId);
                const isEmergency = apt.priority === 'Emergency';
                const isHigh = apt.priority === 'High';
                const scheduleInfo = getVetScheduleInfo(apt);

                return (
                  <div
                    key={apt.id}
                    className={`p-4 rounded-2xl border transition-all grid grid-cols-1 lg:grid-cols-12 gap-4 items-center ${
                      isEmergency
                        ? (isDarkMode ? 'bg-rose-950/20 border-rose-900/50' : 'bg-rose-50 border-rose-200')
                        : (isDarkMode ? 'bg-[#06180F] border-emerald-950/60 hover:border-emerald-800/60' : 'bg-white border-slate-200/80 shadow-2xs')
                    }`}
                  >
                    <div className="lg:col-span-8 flex items-start space-x-3.5 min-w-0 w-full">
                      {/* Animal Photo Thumbnail */}
                      <div
                        onClick={() => apt.status === 'Completed' ? handleDownloadPDF(apt) : setSelectedAppointmentForDetails(apt)}
                        className={`relative w-14 h-14 rounded-2xl overflow-hidden border shrink-0 shadow-xs cursor-pointer hover:opacity-90 transition-opacity ${
                          isDarkMode ? 'bg-slate-900 border-emerald-950/60' : 'bg-slate-100 border-slate-200'
                        }`}
                      >
                        {patient?.image ? (
                          <img
                            src={patient.image}
                            alt={patient.name || apt.animalId}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-0.5">
                            <Camera className="w-4 h-4 text-emerald-500/80" />
                            <span className="text-[6px] font-bold uppercase tracking-wider text-slate-400">No Photo</span>
                          </div>
                        )}
                        {/* Status Icon Badge on Photo */}
                        <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-tl-lg flex items-center justify-center text-[10px] ${
                          isEmergency
                            ? 'bg-rose-600 text-white'
                            : isHigh
                              ? 'bg-amber-600 text-white'
                              : 'bg-emerald-700 text-white'
                        }`}>
                          {isEmergency ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 cursor-pointer space-y-1.5" onClick={() => apt.status === 'Completed' ? handleDownloadPDF(apt) : setSelectedAppointmentForDetails(apt)}>
                        <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                          <span className={`font-black text-sm transition-colors ${
                            isDarkMode ? 'text-white hover:text-emerald-300' : 'text-slate-900 hover:text-emerald-700'
                          }`}>
                            {patient ? `${patient.name || patient.id}` : apt.animalId}
                          </span>
                          {patient && (
                            <span className={`text-xs font-semibold ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              • {patient.species} {patient.morph ? `(${patient.morph})` : ''}
                            </span>
                          )}
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                            isDarkMode ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40' : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}>
                            {apt.type}
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isEmergency 
                              ? (isDarkMode ? 'bg-rose-950 text-rose-300 border border-rose-800/50' : 'bg-rose-100 text-rose-800 border border-rose-300')
                              : isHigh 
                                ? (isDarkMode ? 'bg-amber-950 text-amber-300 border border-amber-800/50' : 'bg-amber-100 text-amber-800 border border-amber-300')
                                : (isDarkMode ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50' : 'bg-emerald-100 text-emerald-800 border border-emerald-300')
                          }`}>
                            {apt.priority} Priority
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            apt.status === 'Approved'
                              ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-900 border-emerald-300')
                              : apt.status === 'Pending Approval'
                                ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-900 border border-amber-300')
                                : (isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700')
                          }`}>
                            {apt.status === 'Approved' ? '✓ Approved' : apt.status}
                          </span>
                        </div>

                        <p className={`text-xs font-medium leading-relaxed ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}>{apt.purpose}</p>

                        {/* Clean Meta Info Bar */}
                        <div className="flex items-center space-x-2.5 text-[11px] text-slate-400 flex-wrap gap-y-1 pt-1 border-t border-slate-200/50 dark:border-emerald-950/60">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectDateFromAppointment(apt.date);
                            }}
                            className="text-emerald-400 font-bold hover:underline cursor-pointer flex items-center space-x-1"
                            title={`Filter schedule to ${apt.date}`}
                          >
                            <CalendarIcon className="w-3.5 h-3.5" />
                            <span>{formatDateWithWeekday(apt.date)} at {apt.time}</span>
                          </button>

                          {patient?.enclosureId && (
                            <>
                              <span>•</span>
                              <span>Enc: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{patient.enclosureId}</strong></span>
                            </>
                          )}

                          <span>•</span>
                          <span>Req: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{getAppointmentRequesterInfo(apt, staffMembers).name}</strong></span>

                          <span>•</span>
                          <span>Vet: <strong className="text-emerald-300">{resolveVeterinarianName(apt.veterinarian, staffMembers)}</strong></span>
                        </div>

                        {/* Clinical Consultation Summary if Completed, else Admin Note if present */}
                        {apt.status === 'Completed' ? (
                          (() => {
                            const record = medicalRecords.find(r => r.appointmentId === apt.id || (r.animalId === apt.animalId && r.recordDate === apt.date));
                            return (
                              <div className={`mt-2 p-3 rounded-2xl border text-[11px] space-y-1.5 ${
                                isDarkMode ? 'bg-[#04140C] border-emerald-950/60 text-slate-300' : 'bg-emerald-50/50 border-emerald-100 text-slate-700'
                              }`}>
                                <div className="flex items-center space-x-1.5 font-extrabold text-[10px] text-emerald-400 uppercase tracking-wider">
                                  <span>👨‍⚕️ Clinical Consultation Summary</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                                  <div>
                                    <span className="font-bold text-slate-400 block text-[10px]">Diagnosis:</span>
                                    <span>{record?.diagnosis || 'Routine clinical monitoring'}</span>
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-400 block text-[10px]">Prescribed Treatment / Instructions:</span>
                                    <span>{record?.treatment || 'None prescribed.'}</span>
                                  </div>
                                </div>
                                {record?.clinicalObservation && (
                                  <div className="pt-1.5 border-t border-emerald-950/20">
                                    <span className="font-bold text-slate-400 block text-[10px]">Clinical Observations:</span>
                                    <p className="leading-relaxed whitespace-pre-wrap mt-0.5">{record.clinicalObservation}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          apt.adminNotes && (
                            <div className={`mt-1.5 p-2 rounded-xl text-[11px] border ${
                              isDarkMode ? 'bg-emerald-950/40 border-emerald-900/40 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            }`}>
                              💬 <strong>Admin Note:</strong> {apt.adminNotes}
                            </div>
                          )
                        )}

                        {/* Proposed Reschedule Callout if present */}
                        {apt.proposedDate && (
                          <div className={`mt-1.5 p-2.5 rounded-xl text-xs border ${
                            apt.status === 'Reschedule Requested'
                              ? (isDarkMode ? 'bg-purple-950/40 border-purple-800/60 text-purple-200' : 'bg-purple-50 border-purple-300 text-purple-900')
                              : (isDarkMode ? 'bg-purple-950/30 border-purple-900/40 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900')
                          }`}>
                            <div className="flex items-center space-x-1.5 font-extrabold text-purple-300">
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>
                                {apt.rescheduledBy === 'vet' ? 'Reschedule Proposed by Vet (Awaiting Admin Approval)' : 'Reschedule Proposed by Admin'}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center space-x-2 text-[11px]">
                              <span className="line-through text-slate-400 font-mono">Original: {apt.date} @ {apt.time}</span>
                              <span className="font-bold font-mono text-emerald-400">➔ Proposed: {apt.proposedDate} @ {apt.proposedTime || '10:00 AM'}</span>
                            </div>
                            {apt.rescheduleReason && (
                              <p className="text-[11px] mt-0.5 opacity-90">
                                <strong>Reason:</strong> {apt.rescheduleReason}
                              </p>
                            )}
                            {apt.rescheduleNotes && (
                              <p className="text-[11px] mt-0.5 opacity-80">
                                <strong>Notes:</strong> {apt.rescheduleNotes}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-4 flex items-center gap-2 w-full justify-start lg:justify-end shrink-0 flex-wrap pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/40 dark:border-emerald-950/40">
                      {/* Reschedule Requested State */}
                      {apt.status === 'Reschedule Requested' ? (
                        <>
                          <div 
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 ${
                              isDarkMode 
                                ? 'border-amber-500/40 bg-amber-950/40 text-amber-300' 
                                : 'border-amber-300 bg-amber-50 text-amber-900'
                            }`}
                            title="Reschedule requested and sent to Facility Administrator Eleanor Vance for authorization."
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Awaiting Admin Authorization</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => openRescheduleModal(apt)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95 ${
                              isDarkMode
                                ? 'border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-900/50'
                                : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                            }`}
                            title="Adjust or change the proposed reschedule date/time"
                          >
                            <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
                            <span>Modify Request</span>
                          </button>
                        </>
                      ) : scheduleInfo.isPendingAdminAuth ? (
                        /* Vet-requested follow-up awaiting admin authorization badge */
                        <div 
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 ${
                            isDarkMode 
                              ? 'border-amber-500/40 bg-amber-950/40 text-amber-300' 
                              : 'border-amber-300 bg-amber-50 text-amber-900'
                          }`}
                          title={`Follow-up requested by ${resolveVeterinarianName(apt.veterinarian, staffMembers)}. Administrator ${resolveAdminName(undefined, staffMembers)} must authorize before this schedule is active.`}
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Awaiting Admin Authorization</span>
                        </div>
                      ) : (
                        /* Accept / Approve Schedule Button (Only for schedules assigned to the Vet by Admin or Keeper) */
                        !scheduleInfo.isVetRequest && (apt.status === 'Pending' || apt.status === 'Pending Approval' || (apt.status === 'Approved' && !apt.approvedBy)) && (
                          <button
                            type="button"
                            onClick={() => handleAcceptAppointment(apt)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
                            title="Accept and confirm this appointment schedule"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Accept Schedule</span>
                          </button>
                        )
                      )}

                      {/* Request Different Date Button (Propose Reschedule for appointments that need date adjustments) */}
                      {apt.status !== 'Reschedule Requested' && !scheduleInfo.isPendingAdminAuth && apt.status !== 'Completed' && apt.status !== 'Cancelled' && apt.status !== 'Declined' && (
                        <button
                          type="button"
                          onClick={() => openRescheduleModal(apt)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95 ${
                            isDarkMode
                              ? 'border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-950 hover:border-amber-400'
                              : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                          }`}
                          title="Propose or request a different date/time to Admin for approval"
                        >
                          <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
                          <span>Request Different Date</span>
                        </button>
                      )}

                      {apt.status === 'Completed' ? (
                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(apt)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95 ${
                            isDarkMode
                              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950 hover:border-emerald-400'
                              : 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                          }`}
                          title="Download Official Clinical Consultation Report PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Download PDF</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedAppointmentForDetails(apt)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                            isDarkMode
                              ? 'border-emerald-900/60 bg-[#04110A] text-emerald-300 hover:bg-emerald-950 hover:text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                          title="View Full Appointment Details"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Details</span>
                        </button>
                      )}

                      {/* Launch Consult button: ONLY shown after the schedule is accepted/approved by the vet */}
                      {apt.status !== 'Completed' && apt.status !== 'Cancelled' && apt.status !== 'Declined' && apt.status !== 'Reschedule Requested' && !scheduleInfo.isPendingAdminAuth && (
                        scheduleInfo.isVetRequest ? (
                          (apt.status === 'Approved' || apt.status === 'Ongoing') && (
                            <button
                              type="button"
                              onClick={() => onSelectAnimalForConsult(apt.animalId, apt.id)}
                              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer transition-colors shadow-2xs"
                            >
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>Launch Consult</span>
                            </button>
                          )
                        ) : (
                          // For Admin/Keeper assigned appointments: only show AFTER clicking Accept Schedule (Approved with approvedBy, or Ongoing)
                          (apt.status === 'Ongoing' || (apt.status === 'Approved' && Boolean(apt.approvedBy))) && (
                            <button
                              type="button"
                              onClick={() => onSelectAnimalForConsult(apt.animalId, apt.id)}
                              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer transition-colors shadow-2xs"
                            >
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>Launch Consult</span>
                            </button>
                          )
                        )
                      )}

                      {apt.status !== 'Cancelled' && (
                        <button
                          type="button"
                          onClick={() => onUpdateAppointmentStatus(apt.id, 'Cancelled')}
                          className={`p-1.5 rounded-xl border text-slate-500 hover:text-rose-400 transition-colors cursor-pointer ${
                            isDarkMode ? 'border-emerald-950 bg-[#04110A]' : 'border-slate-200 bg-white'
                          }`}
                          title="Cancel Appointment"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 🌟 Appointment Details Modal (Matching Mockup Exactly) */}
      {selectedAppointmentForDetails && (() => {
        const apt = selectedAppointmentForDetails;
        const patient = animals.find(a => a.id === apt.animalId);
        const animalRecords = medicalRecords.filter(m => m.animalId === apt.animalId);
        const latestRecord = animalRecords.length > 0 ? animalRecords[0] : null;
        const isEmergency = apt.priority === 'Emergency';
        const isHigh = apt.priority === 'High';
        const info = getVetScheduleInfo(apt);

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
            <div className={`w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden my-auto animate-fade-in ${
              isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-100 text-slate-800'
            }`}>
              {/* Modal Header */}
              <div className={`px-6 py-4 border-b flex items-center justify-between ${
                isDarkMode ? 'border-emerald-950/60 bg-[#04110A]' : 'border-slate-100 bg-white'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isDarkMode ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`font-black text-base md:text-lg leading-tight ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                      Appointment Details
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      View and manage appointment information.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAppointmentForDetails(null)}
                  className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                    isDarkMode ? 'border-emerald-950 text-slate-400 hover:text-white hover:bg-emerald-950/40' : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto">
                {/* Top Summary 4-Column Bar */}
                <div className={`p-4 rounded-2xl border grid grid-cols-2 md:grid-cols-4 gap-4 text-center md:text-left ${
                  isDarkMode ? 'bg-[#04110A] border-emerald-950/80' : 'bg-slate-50/70 border-slate-200/80'
                }`}>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Appointment ID</p>
                    <p className="text-xs sm:text-sm font-black text-emerald-500 font-mono mt-1">{apt.id}</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-extrabold ${
                        apt.status === 'Completed'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : apt.status === 'Ongoing'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Priority</p>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-extrabold ${
                        isEmergency
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          : isHigh
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}>
                        {apt.priority}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Created On</p>
                    <p className={`text-xs font-bold mt-1 flex items-center justify-center md:justify-start space-x-1.5 ${
                      isDarkMode ? 'text-slate-200' : 'text-slate-700'
                    }`}>
                      <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{formatDateTimeDisplay(apt.createdOn || apt.date)}</span>
                    </p>
                  </div>
                </div>

                {/* Main 2-Column Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* LEFT COLUMN */}
                  <div className="space-y-4">
                    {/* 1. Animal Information Card */}
                    <div className={`p-4 rounded-2xl border ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950/70' : 'bg-white border-slate-200/80 shadow-2xs'
                    }`}>
                      <div className="flex items-center space-x-2 mb-3.5">
                        <PawPrint className="w-4 h-4 text-emerald-500" />
                        <h4 className={`font-extrabold text-xs uppercase tracking-wider ${
                          isDarkMode ? 'text-white' : 'text-slate-800'
                        }`}>
                          Animal Information
                        </h4>
                      </div>

                      <div className="flex items-center sm:items-start gap-3.5">
                        {/* Animal Photo */}
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-emerald-950 shrink-0 shadow-sm">
                          {patient?.image ? (
                            <img
                              src={patient.image}
                              alt={patient.name || patient.id}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-2 text-center">
                              <Camera className="w-6 h-6 mb-1 text-emerald-500/80" />
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">No Photo</span>
                            </div>
                          )}
                        </div>

                        {/* Animal Key Details */}
                        <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium flex items-center space-x-1.5">
                              <PawPrint className="w-3 h-3 text-emerald-400" />
                              <span>Name</span>
                            </span>
                            <span className={`font-extrabold truncate max-w-[120px] ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                              {patient?.name || 'Leo'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium flex items-center space-x-1.5">
                              <HeartPulse className="w-3 h-3 text-emerald-400" />
                              <span>Species</span>
                            </span>
                            <span className={`font-extrabold text-right truncate max-w-[130px] ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                              {patient ? `${patient.species} ${patient.scientificName ? `(${patient.scientificName})` : ''}` : 'Bearded Dragon (Pogona vitticeps)'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium flex items-center space-x-1.5">
                              <Tag className="w-3 h-3 text-emerald-400" />
                              <span>Animal ID</span>
                            </span>
                            <span className="font-mono font-bold text-emerald-400">
                              {patient?.id || apt.animalId}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium flex items-center space-x-1.5">
                              <Box className="w-3 h-3 text-emerald-400" />
                              <span>Enclosure</span>
                            </span>
                            <span className={`font-bold truncate max-w-[120px] ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                              {patient?.enclosureId ? (patient.enclosureId.startsWith('ENC') ? `Habitat ${patient.enclosureId}` : patient.enclosureId) : 'Big Cat Habitat'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium flex items-center space-x-1.5">
                              <Clock className="w-3 h-3 text-emerald-400" />
                              <span>Age</span>
                            </span>
                            <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                              {calculateAnimalAge(patient?.dob)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium flex items-center space-x-1.5">
                              <User className="w-3 h-3 text-emerald-400" />
                              <span>Sex</span>
                            </span>
                            <span className={`font-bold ${patient?.sex === 'Female' ? 'text-pink-400' : 'text-blue-400'}`}>
                              {patient?.sex === 'Female' ? '♀ Female' : '♂ Male'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* If completed, show the exact consultation details entered by the Vet */}
                    {apt.status === 'Completed' ? (
                      (() => {
                        const record = medicalRecords.find(r => r.appointmentId === apt.id) ||
                                       medicalRecords.find(r => r.animalId === apt.animalId && r.recordDate === apt.date) ||
                                       medicalRecords.filter(r => r.animalId === apt.animalId).sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime())[0];
                        return (
                          <div className={`p-4 rounded-2xl border shadow-md space-y-4 ${
                            isDarkMode ? 'bg-[#04110A] border-emerald-950/70' : 'bg-white border-slate-200/80'
                          }`}>
                            <div className="flex items-center space-x-2 border-b border-emerald-950/20 dark:border-emerald-950/40 pb-3">
                              <ClipboardList className="w-5 h-5 text-emerald-400" />
                              <div>
                                <h4 className={`font-extrabold text-xs uppercase tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                  Clinical Consultation Details
                                </h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">Logged session details for this completed visit</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                              <div className={`p-3 rounded-2xl border ${
                                isDarkMode ? 'bg-[#06180F] border-emerald-950/60' : 'bg-slate-50 border-slate-100'
                              }`}>
                                <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block mb-1">
                                  Consultation Type
                                </span>
                                <span className={`font-extrabold text-xs ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                  {record?.recordType || 'Medical Examination'}
                                </span>
                              </div>

                              <div className={`p-3 rounded-2xl border ${
                                isDarkMode ? 'bg-[#06180F] border-emerald-950/60' : 'bg-slate-50 border-slate-100'
                              }`}>
                                <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block mb-1">
                                  Diagnosis / Conclusion
                                </span>
                                <span className="font-extrabold text-xs text-slate-200">
                                  {record?.diagnosis || 'Routine clinical monitoring'}
                                </span>
                              </div>
                            </div>

                            <div className={`p-4 rounded-2xl border space-y-3 ${
                              isDarkMode ? 'bg-[#06180F] border-emerald-950/60' : 'bg-slate-50 border-slate-100'
                            }`}>
                              <div>
                                <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block mb-1">
                                  Clinical Observations
                                </span>
                                <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                                  {record?.clinicalObservation || 'No clinical observations logged.'}
                                </p>
                              </div>

                              <div className="pt-3 border-t border-emerald-950/20 dark:border-emerald-950/40">
                                <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block mb-1">
                                  Prescribed Treatment & Medicine Regimen
                                </span>
                                <p className="text-xs text-slate-200 leading-relaxed font-bold">
                                  {record?.treatment || 'None prescribed.'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                              <span>Attending Veterinarian: <strong>{resolveVeterinarianName(record?.veterinarian || apt.veterinarian, staffMembers)}</strong></span>
                              {record?.nextCheckup && (
                                <span className="font-mono text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/20">
                                  Recheck: {record.nextCheckup}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <>
                        {/* 2. Treatment Card */}
                        <div className={`p-4 rounded-2xl border ${
                          isDarkMode ? 'bg-[#04110A] border-emerald-950/70' : 'bg-white border-slate-200/80 shadow-2xs'
                        }`}>
                          <div className="flex items-center space-x-2 mb-2.5">
                            <Syringe className="w-4 h-4 text-emerald-500" />
                            <h4 className={`font-extrabold text-xs uppercase tracking-wider ${
                              isDarkMode ? 'text-white' : 'text-slate-800'
                            }`}>
                              Treatment
                            </h4>
                          </div>

                          <div className={`p-3 rounded-xl border flex items-start space-x-2.5 ${
                            isDarkMode ? 'bg-amber-950/20 border-amber-900/40 text-amber-300' : 'bg-amber-50/80 border-amber-200/80 text-amber-900'
                          }`}>
                            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div className="text-xs">
                              <p className="font-bold">No treatment has been assigned.</p>
                              <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-amber-400/80' : 'text-amber-700'}`}>
                                Treatment details will appear here after the examination.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* 3. Previous Medical Summary */}
                        {latestRecord && (
                          <div className={`p-4 rounded-2xl border ${
                            isDarkMode ? 'bg-[#04110A] border-emerald-950/70' : 'bg-white border-slate-200/80 shadow-2xs'
                          }`}>
                            <div className="flex items-center space-x-2 mb-2.5">
                              <FileText className="w-4 h-4 text-emerald-500" />
                              <h4 className={`font-extrabold text-xs uppercase tracking-wider ${
                                isDarkMode ? 'text-white' : 'text-slate-800'
                              }`}>
                                Previous Medical Summary
                              </h4>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                              <div className={`p-2 rounded-xl border text-center ${
                                isDarkMode ? 'bg-[#06180F] border-emerald-950/60' : 'bg-slate-50 border-slate-100'
                              }`}>
                                <span className="text-[10px] font-bold text-slate-400 flex items-center justify-center space-x-1 mb-1">
                                  <CalendarIcon className="w-3 h-3 text-emerald-500" />
                                  <span>Last Checkup</span>
                                </span>
                                <p className={`font-extrabold text-[11px] truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                  {latestRecord.recordDate}
                                </p>
                                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                  {latestRecord.recordType || 'Completed'}
                                </span>
                              </div>

                              <div className={`p-2 rounded-xl border text-center ${
                                isDarkMode ? 'bg-[#06180F] border-emerald-950/60' : 'bg-slate-50 border-slate-100'
                              }`}>
                                <span className="text-[10px] font-bold text-slate-400 flex items-center justify-center space-x-1 mb-1">
                                  <Stethoscope className="w-3 h-3 text-emerald-500" />
                                  <span>Last Diagnosis</span>
                                </span>
                                <p className={`font-extrabold text-[11px] truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                  {latestRecord.diagnosis || 'Healthy'}
                                </p>
                                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                  {latestRecord.purpose || 'Checked'}
                                </span>
                              </div>

                              <div className={`p-2 rounded-xl border text-center ${
                                isDarkMode ? 'bg-[#06180F] border-emerald-950/60' : 'bg-slate-50 border-slate-100'
                              }`}>
                                <span className="text-[10px] font-bold text-slate-400 flex items-center justify-center space-x-1 mb-1">
                                  <FileText className="w-3 h-3 text-emerald-500" />
                                  <span>Last Treatment</span>
                                </span>
                                <p className={`font-extrabold text-[11px] truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                  {latestRecord.treatment || 'None'}
                                </p>
                                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {latestRecord.veterinarian ? 'Vet Recorded' : 'N/A'}
                                </span>
                              </div>
                            </div>

                            {patient?.notes && (
                              <div className={`p-2.5 rounded-xl border ${
                                isDarkMode ? 'bg-[#06180F] border-emerald-950/40' : 'bg-slate-50 border-slate-100'
                              }`}>
                                <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Allergies / Notes</p>
                                <p className={`text-xs mt-0.5 font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {patient.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* RIGHT COLUMN */}
                  <div className="space-y-4">
                    {/* 1. Appointment Information Card */}
                    <div className={`p-4 rounded-2xl border ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950/70' : 'bg-white border-slate-200/80 shadow-2xs'
                    }`}>
                      <div className="flex items-center space-x-2 mb-3.5">
                        <CalendarDays className="w-4 h-4 text-emerald-500" />
                        <h4 className={`font-extrabold text-xs uppercase tracking-wider ${
                          isDarkMode ? 'text-white' : 'text-slate-800'
                        }`}>
                          Appointment Information
                        </h4>
                      </div>

                      {/* High-visibility schedule spotlight inside modal */}
                      <div className={`p-3.5 rounded-2xl border-2 mb-4 flex items-center justify-between shadow-md ${
                        isDarkMode ? 'bg-[#031d13] border-emerald-400 text-white shadow-emerald-950/70' : 'bg-emerald-50 border-emerald-400 text-emerald-950'
                      }`}>
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500 text-slate-950 flex flex-col items-center justify-center font-black shadow-sm shrink-0">
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-950/80 leading-none">TIME</span>
                            <span className="text-sm font-black leading-tight">📅</span>
                          </div>
                          <div>
                            <span className={`text-[10px] font-black uppercase tracking-widest block ${
                              isDarkMode ? 'text-emerald-400' : 'text-emerald-800'
                            }`}>
                              Scheduled Date & Time
                            </span>
                            <div className={`text-sm sm:text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {formatDateWithWeekday(apt.date)}
                            </div>
                            <div className={`text-xs font-extrabold flex items-center gap-1.5 mt-0.5 ${
                              isDarkMode ? 'text-emerald-300' : 'text-emerald-800'
                            }`}>
                              <Clock className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                              <span className={isDarkMode ? 'bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-400/40 text-emerald-300' : 'bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-900'}>{apt.time}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            handleSelectDateFromAppointment(apt.date);
                            setSelectedAppointmentForDetails(null);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
                          title="Click to jump to calendar for this date"
                        >
                          <span>Open Date</span>
                          <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium flex items-center space-x-2">
                            <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Date</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectDateFromAppointment(apt.date);
                              setSelectedAppointmentForDetails(null);
                            }}
                            className="font-extrabold text-emerald-400 hover:text-emerald-300 underline decoration-dotted flex items-center space-x-1.5 cursor-pointer group"
                            title="Click to switch schedule view to this date"
                          >
                            <span>{formatDateWithWeekday(apt.date)}</span>
                            <CalendarDays className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium flex items-center space-x-2">
                            <Clock className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Time</span>
                          </span>
                          <span className={`font-bold font-mono ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {apt.time}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium flex items-center space-x-2">
                            <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Appointment Type</span>
                          </span>
                          <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {apt.type}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium flex items-center space-x-2">
                            <User className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Requested By</span>
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                              {getAppointmentRequesterInfo(apt, staffMembers).name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              {getAppointmentRequesterInfo(apt, staffMembers).roleLabel}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium flex items-center space-x-2">
                            <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Assigned Veterinarian</span>
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                              {resolveVeterinarianName(apt.veterinarian, staffMembers)}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                              Assigned Vet
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-emerald-950/40">
                          <span className="text-slate-400 font-medium flex items-center space-x-2 mb-1.5">
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Reason for Appointment</span>
                          </span>
                          <p className={`p-2.5 rounded-xl text-xs font-medium leading-relaxed ${
                            isDarkMode ? 'bg-[#06180F] text-slate-200' : 'bg-slate-50 text-slate-700'
                          }`}>
                            {apt.purpose || 'Routine monthly health examination.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 2. Additional Information Card */}
                    <div className={`p-4 rounded-2xl border ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950/70' : 'bg-white border-slate-200/80 shadow-2xs'
                    }`}>
                      <div className="flex items-center space-x-2 mb-3.5">
                        <Info className="w-4 h-4 text-emerald-500" />
                        <h4 className={`font-extrabold text-xs uppercase tracking-wider ${
                          isDarkMode ? 'text-white' : 'text-slate-800'
                        }`}>
                          Additional Information
                        </h4>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium flex items-center space-x-2">
                            <User className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Created By</span>
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                              {apt.requestedBy || 'Admin'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              Admin
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium flex items-center space-x-2">
                            <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Created On</span>
                          </span>
                          <span className={`font-bold font-mono text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {formatDateTimeDisplay(apt.createdOn || apt.date)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium flex items-center space-x-2">
                            <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Last Updated</span>
                          </span>
                          <span className={`font-bold font-mono text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {formatDateTimeDisplay(apt.createdOn || apt.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Callout Footer */}
                {apt.status === 'Reschedule Requested' ? (
                  <div className={`p-3.5 rounded-2xl border flex items-center space-x-3 ${
                    isDarkMode ? 'bg-purple-950/40 border-purple-900/50 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900'
                  }`}>
                    <RotateCcw className="w-5 h-5 text-purple-400 shrink-0" />
                    <div className="text-xs space-y-0.5">
                      <p className="font-extrabold text-purple-300">
                        {apt.rescheduledBy === 'vet' ? 'Reschedule Proposed by Vet (Awaiting Admin Approval)' : 'Reschedule Proposed by Administrator'}
                      </p>
                      <p className={`text-[11px] ${isDarkMode ? 'text-purple-200/90' : 'text-purple-800'}`}>
                        Proposed: <strong>{apt.proposedDate} at {apt.proposedTime || '10:00 AM'}</strong>. Reason: {apt.rescheduleReason || 'Clinical duty adjustment'}. Awaiting Administrator Eleanor Vance authorization.
                      </p>
                    </div>
                  </div>
                ) : info.isPendingAdminAuth ? (
                  <div className={`p-3.5 rounded-2xl border flex items-center space-x-3 ${
                    isDarkMode ? 'bg-amber-950/40 border-amber-900/50 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                    <div className="text-xs">
                      <p className="font-extrabold text-amber-300">Awaiting Administrator Authorization</p>
                      <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-amber-200/90' : 'text-amber-800'}`}>
                        This follow-up examination was requested by the Veterinarian. Administrator Eleanor Vance must review and authorize this schedule before consultation can begin.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={`p-3.5 rounded-2xl border flex items-center space-x-3 ${
                    isDarkMode ? 'bg-blue-950/30 border-blue-900/50 text-blue-300' : 'bg-blue-50/80 border-blue-200 text-blue-900'
                  }`}>
                    <Info className="w-5 h-5 text-blue-500 shrink-0" />
                    <div className="text-xs">
                      <p className="font-extrabold">Ready to proceed?</p>
                      <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-blue-400/90' : 'text-blue-700'}`}>
                        You can view the animal profile first or start the examination directly.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Action Buttons Footer */}
              <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 flex-wrap ${
                isDarkMode ? 'border-emerald-950/60 bg-[#04110A]' : 'border-slate-100 bg-slate-50/80'
              }`}>
                <div className="flex items-center space-x-2">
                  {apt.status === 'Reschedule Requested' ? (
                    <div className="flex items-center space-x-2 text-xs font-bold text-amber-400">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Awaiting Admin Authorization</span>
                    </div>
                  ) : info.isPendingAdminAuth || (info.isVetRequest && (apt.status === 'Pending' || apt.status === 'Pending Approval')) ? (
                    <div className="flex items-center space-x-2 text-xs font-bold text-amber-400">
                      <Clock className="w-4 h-4" />
                      <span>Awaiting Admin Sign-off</span>
                    </div>
                  ) : (!info.isVetRequest && (apt.status === 'Pending' || apt.status === 'Pending Approval' || (apt.status === 'Approved' && !apt.approvedBy))) ? (
                    <button
                      onClick={() => {
                        handleAcceptAppointment(apt);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center space-x-2 cursor-pointer shadow-md transition-all active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept Schedule</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const animId = apt.animalId;
                        const aptId = apt.id;
                        setSelectedAppointmentForDetails(null);
                        onSelectAnimalForConsult(animId, aptId);
                      }}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs flex items-center space-x-2 cursor-pointer shadow-md transition-all"
                    >
                      <Stethoscope className="w-4 h-4" />
                      <span>Start Examination</span>
                    </button>
                  )}

                  {/* Request Different Date Button from inside Details modal */}
                  {apt.status !== 'Completed' && apt.status !== 'Cancelled' && apt.status !== 'Declined' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAppointmentForDetails(null);
                        openRescheduleModal(apt);
                      }}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95 ${
                        isDarkMode
                          ? 'border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-950 hover:border-amber-400'
                          : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                      }`}
                      title="Propose or request a different date/time to Admin"
                    >
                      <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>{apt.status === 'Reschedule Requested' ? 'Modify Reschedule' : 'Request Different Date'}</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setSelectedAppointmentForDetails(null)}
                  className={`px-5 py-2 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                    isDarkMode ? 'border-emerald-950 bg-[#06180F] text-slate-300 hover:text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Veterinarian Request Different Date / Reschedule Modal */}
      {selectedForReschedule && (() => {
        const patient = animals.find(a => a.id === selectedForReschedule.animalId);
        const patientName = patient?.name || selectedForReschedule.animalId;
        const currentSched = parseScheduleDetails(selectedForReschedule.date, selectedForReschedule.time);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
            <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
              isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="p-5 border-b border-emerald-950/40 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-transparent to-transparent">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black">Request Different Date & Time</h3>
                    <p className="text-xs text-slate-400">Propose an alternate clinical schedule to Facility Administrator.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedForReschedule(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                {/* Current Appointment Summary */}
                <div className={`p-3.5 rounded-2xl border flex items-center space-x-3.5 ${
                  isDarkMode ? 'bg-[#04110A] border-emerald-950/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="w-11 h-11 rounded-xl bg-emerald-950 border border-emerald-800/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm">{patientName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                        {selectedForReschedule.animalId}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{selectedForReschedule.type}</p>
                    <div className="flex items-center space-x-2 mt-1 text-[11px] text-amber-400 font-medium">
                      <span>Original Date:</span>
                      <span className="font-bold">{currentSched.weekday}, {currentSched.fullDateFormatted} at {currentSched.timeFormatted}</span>
                    </div>
                  </div>
                </div>

                {/* Proposed New Schedule */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block font-bold mb-1 flex items-center space-x-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>Proposed Date *</span>
                    </label>
                    <input
                      type="date"
                      value={proposedRescheduleDate}
                      onChange={(e) => setProposedRescheduleDate(e.target.value)}
                      required
                      className={`w-full px-3 py-2 rounded-xl border font-bold focus:outline-hidden ${
                        isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block font-bold mb-1 flex items-center space-x-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Proposed Time *</span>
                    </label>
                    <select
                      value={proposedRescheduleTime}
                      onChange={(e) => setProposedRescheduleTime(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border font-bold focus:outline-hidden ${
                        isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="08:30 AM">08:30 AM (Morning Rounds)</option>
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="09:30 AM">09:30 AM</option>
                      <option value="10:00 AM">10:00 AM (Standard Exam)</option>
                      <option value="10:30 AM">10:30 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="01:30 PM">01:30 PM (Afternoon)</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="02:30 PM">02:30 PM</option>
                      <option value="03:30 PM">03:30 PM</option>
                      <option value="04:30 PM">04:30 PM (Late Session)</option>
                    </select>
                  </div>
                </div>

                {/* Reason Selection */}
                <div>
                  <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Reason for Rescheduling *</label>
                  <select
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border font-bold focus:outline-hidden ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Veterinarian clinical schedule / surgery conflict">Veterinarian clinical schedule / surgery conflict</option>
                    <option value="Animal pre-procedure fasting / medical window required">Animal pre-procedure fasting / medical window required</option>
                    <option value="Diagnostic equipment or surgical suite reservation adjustment">Diagnostic equipment or surgical suite reservation adjustment</option>
                    <option value="Attending veterinarian off-duty / on-call rotation">Attending veterinarian off-duty / on-call rotation</option>
                    <option value="Priority critical emergency case intervention required">Priority critical emergency case intervention required</option>
                    <option value="Other schedule optimization">Other schedule optimization</option>
                  </select>
                </div>

                {/* Notes & Rationale for Admin */}
                <div>
                  <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Explanation / Notes for Admin Approval</label>
                  <textarea
                    value={rescheduleNotes}
                    onChange={(e) => setRescheduleNotes(e.target.value)}
                    placeholder="Provide context for Administrator Eleanor Vance regarding why this date/time change is recommended..."
                    rows={3}
                    className={`w-full p-3 rounded-xl border font-medium focus:outline-hidden ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Notice banner */}
                <div className={`p-3 rounded-xl border flex items-start space-x-2.5 text-[11px] ${
                  isDarkMode ? 'bg-amber-950/30 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Admin Authorization Required:</strong> Submitting this request sends a formal reschedule proposal to Facility Administrator Eleanor Vance. The official schedule will update once approved.
                  </p>
                </div>
              </div>

              <div className={`p-4 border-t flex items-center justify-end space-x-2 ${
                isDarkMode ? 'border-emerald-950/60 bg-[#04110A]' : 'border-slate-100 bg-slate-50'
              }`}>
                <button
                  type="button"
                  onClick={() => setSelectedForReschedule(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReschedule}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold flex items-center space-x-1.5 shadow-md active:scale-95 cursor-pointer text-xs transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Reschedule Proposal to Admin</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Date & Year Calendar Navigator Modal */}
      <VetDateYearPickerModal
        isOpen={isDateYearPickerOpen}
        onClose={() => setIsDateYearPickerOpen(false)}
        currentViewDate={calendarViewDate}
        selectedDate={selectedDate}
        onSelectDate={(newDate) => setSelectedDate(newDate)}
        onChangeViewDate={(newDate) => setCalendarViewDate(newDate)}
        appointments={appointments}
        isDarkMode={isDarkMode}
        systemDate={systemDate}
      />

      {/* Veterinarian Request Checkup Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="p-5 border-b border-emerald-950/40 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black">Schedule Veterinary Examination</h3>
                  <p className="text-xs text-slate-400">Schedule an upcoming clinical examination or follow-up checkup.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsRequestModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVetCreateRequest} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Select Animal Patient *</label>
                {activeAnimals.length === 0 ? (
                  <p className="text-amber-400">No active animals available.</p>
                ) : (
                  <select
                    value={reqAnimalId}
                    onChange={(e) => setReqAnimalId(e.target.value)}
                    required
                    className={`w-full px-3 py-2 rounded-xl border font-bold focus:outline-none ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {activeAnimals.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.id} • {a.name ? `${a.name} (${a.species})` : a.species}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Examination Type *</label>
                  <select
                    value={reqType}
                    onChange={(e) => setReqType(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border font-bold focus:outline-none ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Routine Check-up">Routine Check-up</option>
                    <option value="Medical Examination">Medical Examination</option>
                    <option value="Follow-up Examination">Follow-up Examination</option>
                    <option value="Treatment Session">Treatment Session</option>
                    <option value="Quarantine Evaluation">Quarantine Evaluation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Priority Level *</label>
                  <select
                    value={reqPriority}
                    onChange={(e) => setReqPriority(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl border font-bold focus:outline-none ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>

              {reqType === 'Other' && (
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Specify Type *</label>
                  <input
                    type="text"
                    value={reqCustomType}
                    onChange={(e) => setReqCustomType(e.target.value)}
                    placeholder="e.g. Parasitology screen, Radiograph, Follow-up check"
                    required
                    className={`w-full px-3 py-2 rounded-xl border font-bold focus:outline-none ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Requested Date *</label>
                  <input
                    type="date"
                    value={reqDate}
                    onChange={(e) => setReqDate(e.target.value)}
                    required
                    className={`w-full px-3 py-2 rounded-xl border font-bold focus:outline-none ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Requested Time *</label>
                  <input
                    type="text"
                    value={reqTime}
                    onChange={(e) => setReqTime(e.target.value)}
                    placeholder="10:00 AM"
                    required
                    className={`w-full px-3 py-2 rounded-xl border font-bold focus:outline-none ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Clinical Notes / Rationale</label>
                <textarea
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  placeholder="Clinical purpose, symptoms observed, or follow-up instructions..."
                  rows={3}
                  className={`w-full p-3 rounded-xl border font-medium focus:outline-none ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={activeAnimals.length === 0}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center space-x-1.5 shadow-md active:scale-95 disabled:opacity-50"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>Schedule Examination</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Complete Confirmation Modal */}
      {selectedForComplete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl animate-in zoom-in-95 duration-150 ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold">Complete Appointment?</h3>
                <p className="text-xs text-slate-400">Action confirmation required</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to mark this appointment as <strong className="text-emerald-400">Completed</strong>? This will archive the appointment record and finalize the veterinarian session logs.
            </p>

            <div className="flex justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setSelectedForComplete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateAppointmentStatus(selectedForComplete.id, 'Completed');
                  setSelectedForComplete(null);
                  setAppointmentActionFeedback('✓ Appointment successfully marked as Completed.');
                  setTimeout(() => setAppointmentActionFeedback(null), 5000);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md active:scale-95 transition-all"
              >
                Yes, Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
