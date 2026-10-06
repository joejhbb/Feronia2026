import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertTriangle,
  Stethoscope,
  FileText,
  Check,
  X,
  ChevronRight,
  Filter,
  Search,
  PawPrint,
  Heart,
  Shield,
  UserCheck,
  FileCheck,
  RotateCcw,
  Eye,
  Plus,
  ArrowRight,
  Pill,
  Info,
  Trash2
} from 'lucide-react';
import { Animal, Appointment, MedicalRecord, Task, StaffMember, getAppointmentRequesterInfo, resolveVeterinarianName, resolveAdminName } from '../../types';

interface ApprovalsModuleProps {
  appointments: Appointment[];
  animals: Animal[];
  medicalRecords: MedicalRecord[];
  staffMembers?: StaffMember[];
  onUpdateAppointment?: (appointment: Appointment) => void;
  onUpdateAppointmentStatus?: (id: string, status: Appointment['status']) => void;
  onAddTask?: (task: Task) => void;
  onSelectAnimalForDetail?: (animal: Animal) => void;
  onAddAppointment?: (appointment: Appointment) => void;
  isDarkMode?: boolean;
}

export const ApprovalsModule: React.FC<ApprovalsModuleProps> = ({
  appointments = [],
  animals = [],
  medicalRecords = [],
  staffMembers = [],
  onUpdateAppointment,
  onUpdateAppointmentStatus,
  onAddTask,
  onSelectAnimalForDetail,
  onAddAppointment,
  isDarkMode = true
}) => {
  // Registered Veterinarians list (filtered from staffMembers)
  const registeredVets = (staffMembers || []).filter(s => {
    const role = (s.role || '').toLowerCase();
    const name = (s.name || '').toLowerCase();
    return (role.includes('vet') || role.includes('veterinarian') || role.includes('doctor') || role.includes('dvm') || name.startsWith('dr.')) && s.status !== 'Inactive';
  });

  // Navigation & Filter states
  const [activeTab, setActiveTab] = useState<'pending' | 'sent_vet' | 'approved' | 'declined' | 'all'>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedForReview, setSelectedForReview] = useState<Appointment | null>(null);
  const [selectedForDecline, setSelectedForDecline] = useState<Appointment | null>(null);

  // Authorize form state
  const [authDate, setAuthDate] = useState('');
  const [authTime, setAuthTime] = useState('');
  const [authVet, setAuthVet] = useState(() => registeredVets.length > 0 ? registeredVets[0].name : 'Attending Veterinarian');
  const [authLocation, setAuthLocation] = useState('Clinical Suite A');
  const [authNotes, setAuthNotes] = useState('');
  const [createKeeperTask, setCreateKeeperTask] = useState(true);

  // Decline form state
  const [declineReason, setDeclineReason] = useState('Patient Already Recovered / Cleared');
  const [declineRemarks, setDeclineRemarks] = useState('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Pre-fill modal when opening Review & Authorize
  const openReviewModal = (apt: Appointment) => {
    setSelectedForReview(apt);
    setAuthDate(apt.proposedDate || apt.date || new Date().toISOString().split('T')[0]);
    setAuthTime(apt.proposedTime || apt.time || '10:00 AM');
    setAuthVet(resolveVeterinarianName(apt.veterinarian, staffMembers));
    setAuthLocation('Clinical Suite A');
    setAuthNotes(
      apt.status === 'Reschedule Requested'
        ? `Reschedule authorized: ${apt.rescheduleReason || 'Adjustment approved'}. Authorized by Facility Administrator.`
        : (apt.adminNotes || 'Authorized by Facility Administrator. Fast reptile 4 hours prior; keeper to assist.')
    );
    setCreateKeeperTask(true);
  };

  const openDeclineModal = (apt: Appointment) => {
    setSelectedForDecline(apt);
    setDeclineReason('Patient Already Recovered / Cleared');
    setDeclineRemarks('');
  };

  // Helper to find animal
  const getAnimalForApt = (animalId: string): Animal | undefined => {
    return animals.find(a => a.id.toLowerCase() === animalId.toLowerCase());
  };

  // Helper to find latest medical record
  const getLatestMedRecord = (animalId: string): MedicalRecord | undefined => {
    const recs = medicalRecords.filter(m => m.animalId.toLowerCase() === animalId.toLowerCase());
    if (recs.length === 0) return undefined;
    return recs.sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime())[0];
  };

  // Helper to check if an appointment was ordered by the Facility Admin
  const isAptFromAdmin = (apt: Appointment) => {
    return apt.requestedByRole === 'admin' || 
           apt.requestedBy?.toLowerCase().includes('admin') || 
           apt.id?.startsWith('APT-ADM-');
  };

  // Action: Authorize / Approve Reschedule Proposal
  const handleApproveReschedule = (apt: Appointment) => {
    const patient = getAnimalForApt(apt.animalId);
    const patientName = patient?.name || apt.animalId;
    const newDate = apt.proposedDate || apt.date;
    const newTime = apt.proposedTime || apt.time;

    const adminName = resolveAdminName(undefined, staffMembers);
    const updated: Appointment = {
      ...apt,
      status: 'Approved',
      date: newDate,
      time: newTime,
      approvedBy: `${adminName} (Administrator)`,
      approvedAt: new Date().toISOString(),
      adminNotes: `Reschedule approved by Administrator on ${new Date().toLocaleDateString()}. Reason: ${apt.rescheduleReason || 'Schedule adjustment approved'}.`
    };

    if (onUpdateAppointment) {
      onUpdateAppointment(updated);
    } else if (onUpdateAppointmentStatus) {
      onUpdateAppointmentStatus(apt.id, 'Approved');
    }

    showToast(`✓ Reschedule approved for ${patientName}! Official appointment date updated to ${newDate} at ${newTime}.`);
  };

  // Action: Decline Reschedule (Keep original schedule)
  const handleDeclineReschedule = (apt: Appointment) => {
    const patient = getAnimalForApt(apt.animalId);
    const patientName = patient?.name || apt.animalId;

    const updated: Appointment = {
      ...apt,
      status: 'Approved',
      adminNotes: `Reschedule proposal declined by Administrator. Retained original schedule: ${apt.date} at ${apt.time}.`
    };

    if (onUpdateAppointment) {
      onUpdateAppointment(updated);
    } else if (onUpdateAppointmentStatus) {
      onUpdateAppointmentStatus(apt.id, 'Approved');
    }

    showToast(`✕ Reschedule proposal declined for ${patientName}. Original schedule (${apt.date} at ${apt.time}) retained.`);
  };

  // Counts
  // 1. Pending list: Requests from Keepers & subordinate staff requiring Admin authorization + Reschedule proposals
  const pendingList = useMemo(() => {
    return appointments.filter(a => 
      a.status === 'Reschedule Requested' ||
      ((a.status === 'Pending Approval' || a.status === 'Pending') && !isAptFromAdmin(a))
    );
  }, [appointments]);

  // 2. Sent to Vet list: Admin consultation requests currently waiting for Vet approval
  const sentToVetPendingList = useMemo(() => {
    return appointments.filter(a => 
      (a.status === 'Pending Approval' || a.status === 'Pending') && isAptFromAdmin(a)
    );
  }, [appointments]);

  // 3. Approved list: Officially confirmed clinical appointments
  const approvedList = useMemo(() => {
    return appointments.filter(a => 
      a.status === 'Approved' || 
      a.status === 'Ongoing' || 
      a.status === 'Completed'
    );
  }, [appointments]);

  const declinedList = useMemo(() => {
    return appointments.filter(a => a.status === 'Declined');
  }, [appointments]);

  const followUpPendingCount = useMemo(() => {
    return pendingList.filter(a => a.type.toLowerCase().includes('follow-up') || a.type.toLowerCase().includes('follow up')).length;
  }, [pendingList]);

  const reschedulePendingCount = useMemo(() => {
    return appointments.filter(a => a.status === 'Reschedule Requested').length;
  }, [appointments]);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    let list = appointments;

    if (activeTab === 'pending') {
      list = pendingList;
    } else if (activeTab === 'sent_vet') {
      list = sentToVetPendingList;
    } else if (activeTab === 'approved') {
      list = approvedList;
    } else if (activeTab === 'declined') {
      list = declinedList;
    }

    if (typeFilter !== 'All') {
      list = list.filter(a => {
        if (typeFilter === 'Follow-up') {
          return a.type.toLowerCase().includes('follow-up') || a.type.toLowerCase().includes('follow up');
        }
        return a.type === typeFilter;
      });
    }

    if (priorityFilter !== 'All') {
      list = list.filter(a => a.priority === priorityFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => {
        const animal = getAnimalForApt(a.animalId);
        const nameMatch = animal?.name?.toLowerCase().includes(q);
        const speciesMatch = animal?.species?.toLowerCase().includes(q);
        const idMatch = a.animalId.toLowerCase().includes(q) || a.id.toLowerCase().includes(q);
        const purposeMatch = a.purpose?.toLowerCase().includes(q);
        const vetMatch = a.veterinarian?.toLowerCase().includes(q);
        const notesMatch = a.adminNotes?.toLowerCase().includes(q);
        return nameMatch || speciesMatch || idMatch || purposeMatch || vetMatch || notesMatch;
      });
    }

    // Sort: Pending first, then by date descending
    return list.sort((a, b) => {
      const isAPending = a.status === 'Pending Approval' || a.status === 'Pending';
      const isBPending = b.status === 'Pending Approval' || b.status === 'Pending';
      if (isAPending && !isBPending) return -1;
      if (!isAPending && isBPending) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [appointments, activeTab, pendingList, approvedList, declinedList, typeFilter, priorityFilter, searchQuery, animals]);

  // Action: Authorize / Approve
  const handleConfirmAuthorize = () => {
    if (!selectedForReview) return;

    const patient = getAnimalForApt(selectedForReview.animalId);
    const patientName = patient?.name || selectedForReview.animalId;

    const adminName = resolveAdminName(undefined, staffMembers);
    const updated: Appointment = {
      ...selectedForReview,
      status: 'Approved',
      date: authDate || selectedForReview.date,
      time: authTime || selectedForReview.time,
      veterinarian: authVet || selectedForReview.veterinarian,
      approvedBy: `${adminName} (Administrator)`,
      approvedAt: new Date().toISOString(),
      adminNotes: authNotes || `Authorized for ${authLocation}. Approved by Facility Administrator.`
    };

    if (onUpdateAppointment) {
      onUpdateAppointment(updated);
    } else if (onUpdateAppointmentStatus) {
      onUpdateAppointmentStatus(selectedForReview.id, 'Approved');
    }

    // Optional: create operational handling task for keepers
    if (createKeeperTask && onAddTask) {
      const taskDate = authDate || selectedForReview.date;
      const newTask: Task = {
        id: `TASK-VET-${Date.now().toString().slice(-6)}`,
        animalId: selectedForReview.animalId,
        type: 'Health Check',
        title: `Clinical Assistance: ${selectedForReview.type} for ${patientName}`,
        details: `Assist Dr. ${authVet} with authorized ${selectedForReview.type}.\nLocation: ${authLocation}\nScheduled Time: ${authTime}\nPurpose: ${selectedForReview.purpose}\nAdmin Directives: ${authNotes || 'None'}`,
        frequency: 'Daily',
        time: authTime || '10:00 AM',
        date: taskDate,
        status: 'Pending',
        assignedBy: 'Admin',
        enclosureId: patient?.enclosureId || 'Clinical Suite'
      };
      onAddTask(newTask);
    }

    setSelectedForReview(null);
    showToast(`✓ Follow-up request for ${patientName} has been officially authorized and scheduled for ${authDate} at ${authTime}.`);
  };

  // Fast 1-Click Authorize
  const handleFastAuthorize = (apt: Appointment) => {
    const patient = getAnimalForApt(apt.animalId);
    const patientName = patient?.name || apt.animalId;
    const adminName = resolveAdminName(undefined, staffMembers);

    const updated: Appointment = {
      ...apt,
      status: 'Approved',
      approvedBy: `${adminName} (Administrator)`,
      approvedAt: new Date().toISOString(),
      adminNotes: 'Fast-track authorized by Facility Administrator.'
    };

    if (onUpdateAppointment) {
      onUpdateAppointment(updated);
    } else if (onUpdateAppointmentStatus) {
      onUpdateAppointmentStatus(apt.id, 'Approved');
    }

    showToast(`✓ Request for ${patientName} quickly authorized as requested.`);
  };

  // Action: Decline
  const handleConfirmDecline = () => {
    if (!selectedForDecline) return;

    const patient = getAnimalForApt(selectedForDecline.animalId);
    const patientName = patient?.name || selectedForDecline.animalId;

    const updated: Appointment = {
      ...selectedForDecline,
      status: 'Declined',
      declineReason: declineReason,
      adminNotes: declineRemarks ? `Declined: ${declineReason}. Remarks: ${declineRemarks}` : `Declined by Administrator: ${declineReason}`
    };

    if (onUpdateAppointment) {
      onUpdateAppointment(updated);
    } else if (onUpdateAppointmentStatus) {
      onUpdateAppointmentStatus(selectedForDecline.id, 'Declined');
    }

    setSelectedForDecline(null);
    showToast(`✕ Request for ${patientName} has been marked as Declined.`);
  };

  // Action: Reopen / Reconsider
  const handleReopenRequest = (apt: Appointment) => {
    const updated: Appointment = {
      ...apt,
      status: 'Pending Approval',
      declineReason: undefined,
      adminNotes: 'Reopened by Administrator for re-evaluation.'
    };

    if (onUpdateAppointment) {
      onUpdateAppointment(updated);
    }

    showToast(`🔄 Request reopened for administrative review.`);
  };

  // Seed / Demo generator for quick testing
  const handleSeedSampleFollowUp = () => {
    if (!onAddAppointment) return;

    // Pick an animal
    const targetAnimal = animals.find(a => a.healthStatus !== 'Healthy') || animals[0] || {
      id: 'BP-21',
      name: 'Saffron',
      species: 'Ball Python'
    };

    const vetName = resolveVeterinarianName(undefined, staffMembers);
    const newApt: Appointment = {
      id: `APT-REQ-${Date.now().toString().slice(-5)}`,
      animalId: targetAnimal.id,
      type: 'Follow-up Checkup',
      veterinarian: vetName,
      requestedBy: `${vetName} (Follow-up Recommendation)`,
      date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      time: '10:30 AM',
      purpose: `Clinical follow-up evaluation for ${targetAnimal.name || targetAnimal.id}: Assess treatment response, respiratory clear, and body condition re-check.`,
      status: 'Pending Approval',
      priority: 'High',
      createdOn: new Date().toISOString().split('T')[0]
    };

    onAddAppointment(newApt);
    showToast(`✓ Sample follow-up check-up request generated for ${targetAnimal.name || targetAnimal.id}!`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 max-w-md p-4 rounded-2xl bg-emerald-900/95 text-white border border-emerald-500/40 shadow-2xl backdrop-blur-md flex items-center space-x-3 transition-all animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs font-semibold leading-relaxed">{toastMessage}</p>
        </div>
      )}

      {/* Header & Oversight Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center space-x-2.5 text-slate-900 dark:text-white">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <span>Veterinary Approvals & Authorizations</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Administrative triage portal to review, schedule, authorize, or decline follow-up check-ups and veterinary examination requests submitted by clinical staff.
          </p>
        </div>

        {/* Action button to test sample follow-up generation */}
        {onAddAppointment && (
          <button
            onClick={handleSeedSampleFollowUp}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all border shrink-0 ${
              isDarkMode 
                ? 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800/40' 
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Follow-up Request</span>
          </button>
        )}
      </div>

      {/* KPI Oversight Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Card 1: Awaiting Authorization */}
        <div
          onClick={() => setActiveTab('pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
            activeTab === 'pending'
              ? 'ring-2 ring-amber-500 bg-amber-500/10 border-amber-500/30'
              : (isDarkMode ? 'bg-[#06180F] border-emerald-950/60 hover:border-amber-500/40' : 'bg-white border-slate-200 hover:border-amber-300 shadow-xs')
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider">
              Awaiting Authorization
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2 flex-wrap gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {pendingList.length}
            </span>
            {followUpPendingCount > 0 && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded-md">
                {followUpPendingCount} follow-up{followUpPendingCount === 1 ? '' : 's'}
              </span>
            )}
            {reschedulePendingCount > 0 && (
              <span className="text-[10px] font-bold text-purple-300 bg-purple-500/25 px-1.5 py-0.5 rounded-md border border-purple-500/30">
                {reschedulePendingCount} reschedule{reschedulePendingCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Requires administrative sign-off</p>
        </div>

        {/* Card 2: Authorized / Scheduled */}
        <div
          onClick={() => setActiveTab('approved')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
            activeTab === 'approved'
              ? 'ring-2 ring-emerald-500 bg-emerald-500/10 border-emerald-500/30'
              : (isDarkMode ? 'bg-[#06180F] border-emerald-950/60 hover:border-emerald-500/40' : 'bg-white border-slate-200 hover:border-emerald-300 shadow-xs')
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">
              Authorized & Scheduled
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {approvedList.length}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Cleared for clinic schedule</p>
        </div>

        {/* Card 3: High / Emergency Priority */}
        <div
          onClick={() => {
            setActiveTab('pending');
            setPriorityFilter('High');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950/60 hover:border-rose-500/40' : 'bg-white border-slate-200 hover:border-rose-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider">
              Urgent / High Priority
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {pendingList.filter(a => a.priority === 'High' || a.priority === 'Emergency').length}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Expedited patient review</p>
        </div>

        {/* Card 4: Declined Requests */}
        <div
          onClick={() => setActiveTab('declined')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
            activeTab === 'declined'
              ? 'ring-2 ring-slate-500 bg-slate-500/10 border-slate-500/30'
              : (isDarkMode ? 'bg-[#06180F] border-emerald-950/60 hover:border-slate-500/40' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs')
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Declined Requests
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-500/10 text-slate-400 flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {declinedList.length}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Archived rejections & notes</p>
        </div>
      </div>

      {/* Filter Bar & Controls */}
      <div className={`p-4 rounded-2xl border transition-all space-y-3.5 ${
        isDarkMode ? 'bg-[#06180F] border-emerald-950/60' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-emerald-950/60 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'pending', label: 'Awaiting Admin Auth', count: pendingList.length, color: 'text-amber-500' },
              { id: 'sent_vet', label: 'Waiting for Vet Approval', count: sentToVetPendingList.length, color: 'text-cyan-400' },
              { id: 'approved', label: 'Authorized & Scheduled', count: approvedList.length, color: 'text-emerald-500' },
              { id: 'declined', label: 'Declined', count: declinedList.length, color: 'text-rose-500' },
              { id: 'all', label: 'All Records', count: appointments.length, color: 'text-slate-400' }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                    isActive
                      ? (isDarkMode ? 'bg-[#113C24] text-white shadow-xs' : 'bg-emerald-800 text-white shadow-xs')
                      : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-emerald-950/30' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : (isDarkMode ? 'bg-emerald-950 text-slate-400' : 'bg-slate-200 text-slate-700')
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            Showing {filteredAppointments.length} request{filteredAppointments.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Secondary Filters: Type, Priority, Search */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by animal name, ID, species, vet, purpose..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium transition-colors border focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                isDarkMode 
                  ? 'bg-[#04110A] border-emerald-950 text-slate-200 placeholder-slate-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="flex items-center space-x-1.5 w-full sm:w-auto">
            <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer focus:outline-hidden ${
                isDarkMode 
                  ? 'bg-[#04110A] border-emerald-950 text-slate-200' 
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Types</option>
              <option value="Follow-up">Follow-up Checkup</option>
              <option value="Routine Check-up">Routine Check-up</option>
              <option value="Medical Examination">Medical Examination</option>
              <option value="Treatment Session">Treatment Session</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center space-x-1.5 w-full sm:w-auto">
            <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer focus:outline-hidden ${
                isDarkMode 
                  ? 'bg-[#04110A] border-emerald-950 text-slate-200' 
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Priorities</option>
              <option value="Emergency">Emergency</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Request Cards List */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <div className={`p-12 text-center rounded-2xl border ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950/60 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
          }`}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              No requests found
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {activeTab === 'pending'
                ? 'All clinical follow-up check-ups and examination requests have been authorized or reviewed.'
                : 'No veterinary appointment records match the selected status or filters.'}
            </p>
            {activeTab === 'pending' && onAddAppointment && (
              <button
                onClick={handleSeedSampleFollowUp}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                Generate Sample Follow-up Request
              </button>
            )}
          </div>
        ) : (
          filteredAppointments.map(apt => {
            const animal = getAnimalForApt(apt.animalId);
            const latestMed = getLatestMedRecord(apt.animalId);
            const isAdminApt = isAptFromAdmin(apt);
            const isReschedule = apt.status === 'Reschedule Requested';
            const isWaitingVet = (apt.status === 'Pending Approval' || apt.status === 'Pending') && isAdminApt && !isReschedule;
            const isPending = (apt.status === 'Pending Approval' || apt.status === 'Pending') && !isAdminApt && !isReschedule;
            const isApproved = apt.status === 'Approved' || apt.status === 'Ongoing' || apt.status === 'Completed';
            const isDeclined = apt.status === 'Declined';
            const isFollowUp = apt.type.toLowerCase().includes('follow-up') || apt.type.toLowerCase().includes('follow up');

            return (
              <div
                key={apt.id}
                className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${
                  isReschedule
                    ? (isDarkMode ? 'bg-[#0E0720] border-purple-500/50 shadow-md' : 'bg-purple-50/60 border-purple-300 shadow-sm')
                    : isWaitingVet
                    ? (isDarkMode ? 'bg-[#071F11] border-amber-500/40 shadow-xs' : 'bg-white border-amber-300 shadow-sm')
                    : isPending
                    ? (isDarkMode ? 'bg-[#071F11] border-amber-500/30' : 'bg-white border-amber-200 shadow-sm')
                    : isDeclined
                      ? (isDarkMode ? 'bg-[#06180F]/60 border-rose-950/40 opacity-80' : 'bg-slate-50 border-rose-100 opacity-90')
                      : (isDarkMode ? 'bg-[#06180F] border-emerald-950/60' : 'bg-white border-slate-200 shadow-xs')
                }`}
              >
                {/* Left accent border badge */}
                <div
                  className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                    isReschedule
                      ? 'bg-purple-500'
                      : isWaitingVet
                      ? 'bg-amber-400'
                      : isPending
                      ? (apt.priority === 'Emergency' ? 'bg-rose-500' : apt.priority === 'High' ? 'bg-amber-500' : 'bg-amber-400')
                      : isDeclined
                        ? 'bg-rose-500/60'
                        : 'bg-emerald-500'
                  }`}
                />

                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left Column: Animal & Request Profile */}
                  <div className="flex items-start space-x-4 min-w-0 flex-1">
                    {/* Animal Photo Thumbnail */}
                    <div className="relative shrink-0">
                      {(animal?.image || animal?.imageUrl) ? (
                        <img
                          src={animal.image || animal.imageUrl}
                          alt={animal.name || apt.animalId}
                          className="w-16 h-16 rounded-xl object-cover border border-emerald-950/40 shadow-xs"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-900/40 flex items-center justify-center">
                          <PawPrint className="w-7 h-7 opacity-60" />
                        </div>
                      )}
                      <span className={`absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shadow-xs ${
                        animal?.healthStatus === 'Under Treatment' || animal?.healthStatus === 'Sick'
                          ? 'bg-rose-500 text-white border-rose-600'
                          : animal?.healthStatus === 'Under Observation'
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-emerald-700 text-white border-emerald-800'
                      }`}>
                        {animal?.healthStatus || 'Patient'}
                      </span>
                    </div>

                    {/* Animal & Request Details */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-base text-slate-900 dark:text-white truncate">
                          {animal?.name || apt.animalId}
                        </h3>
                        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-md">
                          {apt.animalId}
                        </span>

                        {/* Request Type Badge */}
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center space-x-1 ${
                          isReschedule
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : isFollowUp
                            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30'
                            : 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30'
                        }`}>
                          <Stethoscope className="w-3 h-3" />
                          <span>{apt.type}</span>
                        </span>

                        {/* Priority Badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          apt.priority === 'Emergency'
                            ? 'bg-rose-500 text-white font-black'
                            : apt.priority === 'High'
                              ? 'bg-amber-500/20 text-amber-500 dark:text-amber-300 border border-amber-500/30 font-bold'
                              : 'bg-slate-500/10 text-slate-400 font-medium'
                        }`}>
                          {apt.priority} Priority
                        </span>

                        {/* Status Badge */}
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center space-x-1.5 ${
                          isReschedule
                            ? 'bg-purple-500/25 text-purple-300 border-purple-500/50 animate-pulse'
                            : isWaitingVet
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                            : isPending
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                            : isApproved
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}>
                          {isReschedule && <RotateCcw className="w-3 h-3" />}
                          {!isReschedule && isWaitingVet && <Clock className="w-2.5 h-2.5" />}
                          {!isReschedule && !isWaitingVet && isPending && <Clock className="w-2.5 h-2.5" />}
                          {isApproved && <Check className="w-2.5 h-2.5" />}
                          {isDeclined && <X className="w-2.5 h-2.5" />}
                          <span>{isReschedule ? 'Reschedule Approval Needed' : isWaitingVet ? 'Waiting for Vet Approval' : apt.status}</span>
                        </span>
                      </div>

                      {/* Species & Habitat info */}
                      <p className="text-xs text-slate-400 font-medium flex items-center space-x-2">
                        <span>{animal?.species || 'Reptile Patient'}</span>
                        {animal?.morph && <span>• {animal.morph}</span>}
                        {animal?.enclosureId && (
                          <span className="flex items-center space-x-1 text-emerald-500/80">
                            <Shield className="w-3 h-3" />
                            <span>Enclosure: {animal.enclosureId}</span>
                          </span>
                        )}
                      </p>

                      {/* Reschedule Proposal Box */}
                      {isReschedule && (
                        <div className={`mt-2 p-3 rounded-xl border text-xs space-y-2 ${
                          isDarkMode ? 'bg-purple-950/40 border-purple-500/40 text-purple-200' : 'bg-purple-50 border-purple-300 text-purple-900'
                        }`}>
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="font-extrabold text-purple-300 flex items-center space-x-1.5">
                              <RotateCcw className="w-4 h-4 text-purple-400" />
                              <span>Requested Reschedule from {apt.rescheduledByName || resolveVeterinarianName(apt.requestedBy || apt.veterinarian, staffMembers)}</span>
                            </span>
                            {apt.rescheduledAt && (
                              <span className="text-[10px] text-purple-300/80 font-mono">
                                Requested on {new Date(apt.rescheduledAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-3 text-xs flex-wrap">
                            <span className="line-through text-slate-400 font-mono">Original Schedule: {apt.date} @ {apt.time}</span>
                            <span className="font-extrabold text-emerald-400 font-mono">➔ Proposed: {apt.proposedDate} @ {apt.proposedTime || '10:00 AM'}</span>
                          </div>

                          {apt.rescheduleReason && (
                            <p className="text-[11px] text-purple-100">
                              <strong>Reason for Date Change:</strong> {apt.rescheduleReason}
                            </p>
                          )}

                          {apt.rescheduleNotes && (
                            <p className="text-[11px] text-purple-200/90 bg-purple-900/20 p-2 rounded-lg border border-purple-500/20">
                              <strong>Clinical Notes from Requester:</strong> {apt.rescheduleNotes}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Clinical Indication / Reason Box */}
                      {!isReschedule && (
                        <div className={`p-3 rounded-xl border mt-2 ${
                          isDarkMode ? 'bg-[#04110A]/80 border-emerald-950/80' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                              <FileText className="w-3 h-3" />
                              <span>Veterinary Clinical Purpose & Indication</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Requested by: <strong className="text-slate-700 dark:text-slate-300">{getAppointmentRequesterInfo(apt, staffMembers).name}</strong>
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                            {apt.purpose}
                          </p>
                        </div>
                      )}

                      {/* Associated Medical History Snippet (if available) */}
                      {latestMed && (
                        <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-1">
                          <span className="font-bold text-slate-500">Prior Medical Context:</span>
                          <span className="text-slate-300 truncate max-w-md">
                            {latestMed.diagnosis} ({latestMed.recordDate})
                          </span>
                          {latestMed.treatment && (
                            <span className="text-emerald-400 font-mono text-[10px] truncate max-w-xs">
                              • Rx: {latestMed.treatment}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Waiting for Vet Approval Details */}
                      {isWaitingVet && (
                        <div className="mt-2 p-2.5 rounded-xl bg-amber-950/30 border border-amber-900/40 text-xs text-amber-300 space-y-1">
                          <div className="flex items-center space-x-1.5 font-bold">
                            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                            <span>⏳ Waiting for Vet Approval ({resolveVeterinarianName(apt.veterinarian, staffMembers)})</span>
                          </div>
                          <p className="text-[11px] text-amber-200/80 pl-5">
                            Request dispatched to {resolveVeterinarianName(apt.veterinarian, staffMembers)}. Awaiting confirmation and approval in the Vet Portal prior to clinical execution.
                          </p>
                        </div>
                      )}

                      {/* Authorization / Decision Directives Details */}
                      {isApproved && (
                        <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-xs text-emerald-300 space-y-1">
                          <div className="flex items-center space-x-1.5 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Officially Authorized by {resolveVeterinarianName(apt.approvedBy, staffMembers) || 'Facility Administrator'}</span>
                            {apt.approvedAt && (
                              <span className="text-[10px] text-emerald-400/70 font-normal">
                                on {new Date(apt.approvedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {apt.adminNotes && (
                            <p className="text-[11px] text-emerald-200/90 pl-5">
                              Admin Directives: {apt.adminNotes}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Waiting for Vet Approval Notice */}
                      {isWaitingVet && (
                        <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                          <div className="flex items-center space-x-1.5 font-bold">
                            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                            <span>Waiting for Vet Approval: Sent to {resolveVeterinarianName(apt.veterinarian, staffMembers)}</span>
                          </div>
                          <p className="text-[11px] text-amber-200/80 pl-5">
                            This consultation was requested by Facility Admin. It is currently waiting for {resolveVeterinarianName(apt.veterinarian, staffMembers)} to review and confirm in the Vet Portal.
                          </p>
                        </div>
                      )}

                      {/* Declined Reason Details */}
                      {isDeclined && (
                        <div className="mt-2 p-2.5 rounded-xl bg-rose-950/30 border border-rose-900/40 text-xs text-rose-300 space-y-1">
                          <div className="flex items-center space-x-1.5 font-bold">
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Declined: {apt.declineReason || 'Administrative decision'}</span>
                          </div>
                          {apt.adminNotes && (
                            <p className="text-[11px] text-rose-200/90 pl-5">
                              Remarks: {apt.adminNotes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Time Slot & Action Controls */}
                  <div className="flex flex-col lg:items-end justify-between self-stretch gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-emerald-950/60">
                    {/* Proposed / Scheduled Schedule */}
                    <div className="lg:text-right space-y-0.5">
                      <div className="flex items-center lg:justify-end space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{apt.date || 'TBD'}</span>
                        <span>•</span>
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>{apt.time || 'TBD'}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Attending: <span className="font-semibold text-slate-300">{resolveVeterinarianName(apt.veterinarian, staffMembers)}</span>
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* View Animal profile shortcut */}
                      {animal && onSelectAnimalForDetail && (
                        <button
                          onClick={() => onSelectAnimalForDetail(animal)}
                          className={`p-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            isDarkMode 
                              ? 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-900/40' 
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                          title="View Animal Clinical Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* When Waiting for Vet Approval (Admin Request): Allow cancelling */}
                      {isWaitingVet && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onUpdateAppointmentStatus) {
                              onUpdateAppointmentStatus(apt.id, 'Cancelled');
                              showToast('✓ Consult request cancelled.');
                            } else if (onUpdateAppointment) {
                              onUpdateAppointment({ ...apt, status: 'Cancelled' });
                              showToast('✓ Consult request cancelled.');
                            }
                          }}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/15 border border-rose-500/20 cursor-pointer transition-all flex items-center space-x-1"
                          title="Cancel this consult request"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Cancel Request</span>
                        </button>
                      )}

                      {/* When Reschedule Requested: Authorize New Date, Review & Adjust, Keep Original */}
                      {isReschedule && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDeclineReschedule(apt)}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 cursor-pointer transition-all"
                            title="Keep original schedule and decline proposed date change"
                          >
                            Keep Original
                          </button>

                          <button
                            type="button"
                            onClick={() => openReviewModal(apt)}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-purple-300 hover:bg-purple-900/40 border border-purple-500/40 cursor-pointer transition-all"
                            title="Review and adjust reschedule date/time/location"
                          >
                            Review & Adjust
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApproveReschedule(apt)}
                            className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 cursor-pointer transition-all flex items-center space-x-1.5"
                            title="Authorize and apply the proposed new date and time"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Authorize New Date</span>
                          </button>
                        </>
                      )}

                      {/* When Pending: Authorize & Decline Buttons */}
                      {isPending && (
                        <>
                          <button
                            onClick={() => openDeclineModal(apt)}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/15 border border-rose-500/20 cursor-pointer transition-all"
                          >
                            Decline
                          </button>

                          <button
                            onClick={() => handleFastAuthorize(apt)}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/30 cursor-pointer transition-all"
                            title="Quick 1-Click Authorize without adjusting details"
                          >
                            Quick Authorize
                          </button>

                          <button
                            onClick={() => openReviewModal(apt)}
                            className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer transition-all flex items-center space-x-1.5 active:scale-95"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            <span>Review & Authorize</span>
                          </button>
                        </>
                      )}

                      {/* When Approved: Allow rescheduling / modifying directives */}
                      {isApproved && (
                        <button
                          onClick={() => openReviewModal(apt)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/30 cursor-pointer transition-all flex items-center space-x-1"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>Edit Authorization</span>
                        </button>
                      )}

                      {/* When Declined: Allow reopening */}
                      {isDeclined && (
                        <button
                          onClick={() => handleReopenRequest(apt)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-400 hover:bg-amber-500/15 border border-amber-500/30 cursor-pointer transition-all flex items-center space-x-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reopen Request</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: REVIEW & AUTHORIZE REQUEST */}
      {selectedForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in-95 ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="p-5 border-b border-emerald-950/60 flex items-center justify-between bg-gradient-to-r from-emerald-950/60 to-transparent">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">
                    Authorize Check-up Request
                  </h3>
                  <p className="text-xs text-slate-400">
                    Administrative authorization & scheduling sign-off
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedForReview(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Patient Quick Summary Box */}
              {(() => {
                const patient = getAnimalForApt(selectedForReview.animalId);
                return (
                  <div className={`p-4 rounded-2xl border flex items-center space-x-4 ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {(patient?.image || patient?.imageUrl) ? (
                      <img
                        src={patient.image || patient.imageUrl}
                        alt={patient.name}
                        className="w-14 h-14 rounded-xl object-cover border border-emerald-950"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center">
                        <PawPrint className="w-6 h-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-sm">{patient?.name || selectedForReview.animalId}</span>
                        <span className="text-xs font-mono text-slate-400 font-bold">[{selectedForReview.animalId}]</span>
                      </div>
                      <p className="text-xs text-slate-400">{patient?.species} • Enclosure: {patient?.enclosureId || 'General'}</p>
                      <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                        Current Health: {patient?.healthStatus || 'Under Care'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Reschedule Proposal Details (If applicable) */}
              {selectedForReview.status === 'Reschedule Requested' && (
                <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                  isDarkMode ? 'bg-purple-950/40 border-purple-500/40 text-purple-200' : 'bg-purple-50 border-purple-300 text-purple-900'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-purple-300 flex items-center space-x-1.5">
                      <RotateCcw className="w-4 h-4" />
                      <span>Reschedule Proposal from {resolveVeterinarianName(selectedForReview.rescheduledByName || selectedForReview.requestedBy, staffMembers)}</span>
                    </span>
                    {selectedForReview.rescheduledAt && (
                      <span className="text-[10px] text-purple-300/80 font-mono">
                        {new Date(selectedForReview.rescheduledAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-xs flex-wrap">
                    <span className="line-through text-slate-400 font-mono">Original: {selectedForReview.date} @ {selectedForReview.time}</span>
                    <span className="font-extrabold text-emerald-400 font-mono">➔ Requested: {selectedForReview.proposedDate} @ {selectedForReview.proposedTime || '10:00 AM'}</span>
                  </div>
                  {selectedForReview.rescheduleReason && (
                    <p className="text-[11px] text-purple-100">
                      <strong>Reason:</strong> {selectedForReview.rescheduleReason}
                    </p>
                  )}
                  {selectedForReview.rescheduleNotes && (
                    <p className="text-[11px] text-purple-200/90">
                      <strong>Notes:</strong> {selectedForReview.rescheduleNotes}
                    </p>
                  )}
                </div>
              )}

              {/* Vet Clinical Purpose (Read-Only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Clinical Indication / Reason (From Vet)</span>
                </label>
                <div className={`p-3 rounded-xl border text-xs leading-relaxed font-medium ${
                  isDarkMode ? 'bg-[#04110A] border-emerald-950 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}>
                  {selectedForReview.purpose}
                </div>
                <p className="text-[10px] text-slate-400">
                  Requested by: <strong>{selectedForReview.requestedBy || selectedForReview.veterinarian}</strong> on {selectedForReview.createdOn || 'Recent'}
                </p>
              </div>

              {/* Scheduling Adjustment Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Scheduled Date</span>
                  </label>
                  <input
                    type="date"
                    value={authDate}
                    onChange={(e) => setAuthDate(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold border focus:outline-hidden ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Scheduled Time</span>
                  </label>
                  <input
                    type="text"
                    value={authTime}
                    onChange={(e) => setAuthTime(e.target.value)}
                    placeholder="e.g. 10:00 AM"
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold border focus:outline-hidden ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Attending Vet & Exam Room */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Attending Veterinarian</span>
                  </label>
                  <select
                    value={authVet}
                    onChange={(e) => setAuthVet(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold border focus:outline-hidden ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {registeredVets.length > 0 ? (
                      registeredVets.map(v => (
                        <option key={v.id} value={v.name}>
                          {v.name} ({v.role === 'vet' ? 'Veterinarian' : (v.role || 'Veterinarian')})
                        </option>
                      ))
                    ) : (
                      <option value="Attending Veterinarian">Attending Veterinarian</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>Facility Exam Location</span>
                  </label>
                  <select
                    value={authLocation}
                    onChange={(e) => setAuthLocation(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold border focus:outline-hidden ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Clinical Suite A">Clinical Suite A (Primary Exam)</option>
                    <option value="Quarantine Room 1">Quarantine Holding Room 1</option>
                    <option value="Procedure Room B">Procedure Room B (Sterile)</option>
                    <option value="In-Enclosure Bedside">In-Enclosure Bedside Exam</option>
                  </select>
                </div>
              </div>

              {/* Admin Directives & Direct Orders */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Administrative Authorization Notes & Directives</span>
                </label>
                <textarea
                  rows={2}
                  value={authNotes}
                  onChange={(e) => setAuthNotes(e.target.value)}
                  placeholder="e.g. Authorized. Room A reserved. Fast animal 4 hours prior; keeper to assist with secure transport."
                  className={`w-full p-3 rounded-xl text-xs border focus:outline-hidden ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* Checkbox: Assign Keeper Preparation Task */}
              {onAddTask && (
                <label className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-colors ${
                  createKeeperTask 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : (isDarkMode ? 'bg-[#04110A] border-emerald-950' : 'bg-slate-50 border-slate-200')
                }`}>
                  <input
                    type="checkbox"
                    checked={createKeeperTask}
                    onChange={(e) => setCreateKeeperTask(e.target.checked)}
                    className="w-4 h-4 rounded-md accent-emerald-500 cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Generate Keeper Preparation & Assistance Task
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Automatically assigns an operational handling task for facility keepers on {authDate}.
                    </p>
                  </div>
                </label>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-emerald-950/60 flex items-center justify-end space-x-2.5 bg-[#04110A]/50">
              <button
                type="button"
                onClick={() => setSelectedForReview(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAuthorize}
                className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Authorize Schedule</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DECLINE REQUEST */}
      {selectedForDecline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in-95 ${
            isDarkMode ? 'bg-[#06180F] border-rose-950/60 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="p-5 border-b border-rose-950/40 flex items-center justify-between bg-rose-950/20">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Decline Check-up Request</h3>
                  <p className="text-xs text-slate-400">Record administrative rejection reason</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedForDecline(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-300">
                You are declining the <strong className="text-white">{selectedForDecline.type}</strong> request for patient <strong className="text-white">{selectedForDecline.animalId}</strong>.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Decline Justification</label>
                <select
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold border focus:outline-hidden ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="Patient Already Recovered / Cleared">Patient Already Recovered / Cleared</option>
                  <option value="Duplicate Request">Duplicate Request</option>
                  <option value="Schedule Conflict - Resubmission Requested">Schedule Conflict - Resubmission Requested</option>
                  <option value="Alternative Remote Observation Protocol Enacted">Alternative Remote Observation Protocol Enacted</option>
                  <option value="Other Administrative Reason">Other Administrative Reason</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Additional Remarks / Notes</label>
                <textarea
                  rows={3}
                  value={declineRemarks}
                  onChange={(e) => setDeclineRemarks(e.target.value)}
                  placeholder="Provide guidance for clinical staff regarding this decision..."
                  className={`w-full p-3 rounded-xl text-xs border focus:outline-hidden ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>

            <div className="p-5 border-t border-rose-950/40 flex items-center justify-end space-x-2.5 bg-[#04110A]/50">
              <button
                type="button"
                onClick={() => setSelectedForDecline(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecline}
                className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-md transition-all active:scale-95"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
