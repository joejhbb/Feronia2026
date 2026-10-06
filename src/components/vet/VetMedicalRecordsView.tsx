import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText, Stethoscope, CheckCircle2, ClipboardList, Search, Filter,
  Calendar, AlertCircle, Package, ArrowRight, ArrowLeft, Sparkles, Download, Clock,
  Plus, Minus, AlertTriangle, Info, HelpCircle, Check, ChevronDown, ChevronUp,
  Activity, ShieldCheck, HeartPulse, RefreshCw, X, Camera
} from 'lucide-react';
import { Animal, MedicalRecord, InventoryItem, Task, Appointment, KeeperLogEntry, Enclosure, StaffMember } from '../../types';

interface VetMedicalRecordsViewProps {
  animals: Animal[];
  medicalRecords: MedicalRecord[];
  inventory: InventoryItem[];
  isDarkMode: boolean;
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
  activeAppointmentId?: string | null;
  setActiveAppointmentId?: (id: string | null) => void;
  onAddMedicalRecord: (record: MedicalRecord) => void;
  onUpdateAnimal: (animal: Animal) => void;
  onUpdateInventory: (inventory: InventoryItem[]) => void;
  onAddTask: (task: Task) => void;
  appointments?: Appointment[];
  staffMembers?: StaffMember[];
  onAddAppointment?: (appointment: Appointment) => void;
  onUpdateAppointment?: (appointment: Appointment) => void;
  onUpdateAppointmentStatus?: (id: string, status: Appointment['status']) => void;
  systemDate: string;
  onNotify?: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onBackToDashboard?: () => void;
  onBack?: () => void;
  tasks?: Task[];
  onUpdateTaskStatus?: (id: string, status: Task['status']) => void;
  enclosures?: Enclosure[];
  onUpdateEnclosure?: (enclosure: Enclosure) => void;
}

// 5 Step Definition
const CONSULT_STEPS = [
  { id: 1, title: 'Patient Selection', subtitle: 'Select reptile & view vitals' },
  { id: 2, title: 'Clinical Examination', subtitle: 'Exam type & observations' },
  { id: 3, title: 'Health Clearance', subtitle: 'Diagnosis & status rating' },
  { id: 4, title: 'Treatment & Pharmacy', subtitle: 'Rx instructions & inventory' },
  { id: 5, title: 'Follow-up & Review', subtitle: 'Schedule checkup & submit' },
];

export default function VetMedicalRecordsView({
  animals,
  medicalRecords,
  inventory,
  isDarkMode,
  selectedPatientId,
  setSelectedPatientId,
  activeAppointmentId,
  setActiveAppointmentId,
  onAddMedicalRecord,
  onUpdateAnimal,
  onUpdateInventory,
  onAddTask,
  appointments = [],
  onAddAppointment,
  onUpdateAppointment,
  onUpdateAppointmentStatus,
  systemDate,
  onNotify,
  onBackToDashboard,
  onBack,
  tasks = [],
  onUpdateTaskStatus,
  enclosures = [],
  onUpdateEnclosure
}: VetMedicalRecordsViewProps) {
  const handleBack = onBack || onBackToDashboard;
  const [activeSubTab, setActiveSubTab] = useState<'consult' | 'records'>('consult');
  
  // 5-Step Stepper State (1 to 5)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [viewAllSections, setViewAllSections] = useState<boolean>(false);

  // Patient Selection & Search
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);

  // Consultation Form state (Section 2)
  const [recordType, setRecordType] = useState('Routine Check-up');
  const [customRecordType, setCustomRecordType] = useState('');
  const [purpose, setPurpose] = useState('');
  const [clinicalObs, setClinicalObs] = useState('');

  // Diagnosis & Health Status state (Section 3)
  const [healthStatusInput, setHealthStatusInput] = useState<string>('Healthy');
  const [customHealthStatus, setCustomHealthStatus] = useState('');
  const [clinicalDiagnosis, setClinicalDiagnosis] = useState('');

  // Section 4 Master Toggle: Does this reptile need treatment / pharmacy?
  const [needsTreatment, setNeedsTreatment] = useState(false);
  const [dispenseMode, setDispenseMode] = useState<'partial_dose' | 'dedicated_bottle' | 'whole_units'>('partial_dose');
  const [dosePerAdmin, setDosePerAdmin] = useState('0.5');
  const [doseUnit, setDoseUnit] = useState('mL');

  // Section 4A: Keeper Prescription & Clinical Instructions
  const [treatment, setTreatment] = useState('');
  const [rxRoute, setRxRoute] = useState('Topical Ointment');
  const [customRxRoute, setCustomRxRoute] = useState('');
  const [rxFrequency, setRxFrequency] = useState('Once daily');
  const [customRxFrequency, setCustomRxFrequency] = useState('');
  const [rxDuration, setRxDuration] = useState('7 days');
  const [customRxDuration, setCustomRxDuration] = useState('');

  // Section 4B: Pharmacy Dispense & Inventory Stock Deduction
  const [deductFromPharmacy, setDeductFromPharmacy] = useState(false);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState('');
  const [inventoryDeductQty, setInventoryDeductQty] = useState(1);
  const [pharmacyNotes, setPharmacyNotes] = useState('');

  // Section 5: Follow-up Scheduling State
  const [scheduleFollowup, setScheduleFollowup] = useState(false);
  const [nextCheckup, setNextCheckup] = useState('');
  const [followupTime, setFollowupTime] = useState('09:30 AM');
  const [followupPriority, setFollowupPriority] = useState<'Normal' | 'High' | 'Emergency'>('Normal');
  const [followupNotes, setFollowupNotes] = useState('');
  const [followupRecordType, setFollowupRecordType] = useState('Follow-up Checkup');
  const [customFollowupRecordType, setCustomFollowupRecordType] = useState('');

  // Auto-populate from linked appointment or selected patient active appointment
  useEffect(() => {
    const aptToUse = activeAppointmentId 
      ? appointments.find(a => a.id === activeAppointmentId)
      : (selectedPatientId ? appointments.find(a => a.animalId === selectedPatientId && a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'Declined') : null);

    if (aptToUse) {
      const standardTypes = ['Routine Check-up', 'Treatment', 'Medical Examination', 'Surgery', 'Quarantine Inspection', 'Lab Result', 'Previous Vet Record'];
      const isStandard = standardTypes.includes(aptToUse.type);
      if (isStandard) {
        setRecordType(aptToUse.type);
        setCustomRecordType('');
      } else {
        setRecordType('Other');
        setCustomRecordType(aptToUse.type);
      }
      const selPatient = animals.find(a => a.id === aptToUse.animalId);
      setPurpose(aptToUse.purpose || `Veterinary Checkup Request: ${aptToUse.type} for ${selPatient?.name || selPatient?.species || 'Reptile'}`);
    }
  }, [activeAppointmentId, selectedPatientId, appointments, animals]);

  // Notifications
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [showConfirmConsultModal, setShowConfirmConsultModal] = useState(false);

  // Records Timeline filter state
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const activeAnimals = useMemo(() => animals.filter(a => !a.isArchived), [animals]);

  // Filter inventory for medical items (exclude food/diet and cleaning)
  const medicalInventory = useMemo(() => {
    return inventory.filter(item => {
      const cat = (item.category || '').toLowerCase();
      const name = (item.name || '').toLowerCase();
      const isFeeding = cat.includes('feed') || cat.includes('food') || cat.includes('diet') || name.includes('rat') || name.includes('mice') || name.includes('roach') || name.includes('cricket') || name.includes('worm') || name.includes('insect');
      const isCleaning = cat.includes('clean') || cat.includes('sanit') || cat.includes('disinfect') || cat.includes('substrate') || cat.includes('bedding') || name.includes('disinfectant') || name.includes('substrate') || name.includes('bleach') || name.includes('coir');
      return !isFeeding && !isCleaning;
    });
  }, [inventory]);

  // Selected patient details
  const selectedPatient = useMemo(() => {
    return activeAnimals.find(a => a.id === selectedPatientId) || null;
  }, [activeAnimals, selectedPatientId]);

  // Check if selected patient has an active checkup request from Admin/Keeper or scheduled follow-up
  const activeAppointmentForSelectedPatient = useMemo(() => {
    if (!selectedPatientId) return null;
    if (activeAppointmentId) {
      const direct = appointments.find(a => a.id === activeAppointmentId);
      if (direct) {
        const isVetReq = direct.requestedByRole === 'vet' || 
                         (direct.requestedBy || '').toLowerCase().includes('vet') || 
                         (direct.requestedBy || '').toLowerCase().includes('follow-up');
        // If requested by Vet, it must be authorized by Admin first
        if (isVetReq && (direct.status === 'Pending Approval' || direct.status === 'Pending')) {
          return null;
        }
        return direct;
      }
    }
    return appointments.find(apt => {
      if (apt.animalId !== selectedPatientId) return false;
      if (apt.status === 'Completed' || apt.status === 'Cancelled' || apt.status === 'Declined' || apt.status === 'Reschedule Requested') return false;
      
      const isVetReq = apt.requestedByRole === 'vet' || 
                       (apt.requestedBy || '').toLowerCase().includes('vet') || 
                       (apt.requestedBy || '').toLowerCase().includes('follow-up');
      
      // If it is a Vet-requested follow-up, it MUST be authorized by Admin first (status === 'Approved' or 'Ongoing')
      if (isVetReq) {
        return apt.status === 'Approved' || apt.status === 'Ongoing';
      }
      return true;
    }) || null;
  }, [selectedPatientId, activeAppointmentId, appointments]);

  // Check if there is a pending vet follow-up awaiting admin authorization for this patient
  const pendingVetFollowupForSelectedPatient = useMemo(() => {
    if (!selectedPatientId) return null;
    return appointments.find(apt => 
      apt.animalId === selectedPatientId &&
      (apt.status === 'Pending Approval' || apt.status === 'Pending') &&
      (apt.requestedByRole === 'vet' || (apt.requestedBy || '').toLowerCase().includes('vet') || (apt.requestedBy || '').toLowerCase().includes('follow-up'))
    ) || null;
  }, [selectedPatientId, appointments]);

  // Check if there is a pending vet reschedule request awaiting admin authorization for this patient
  const pendingRescheduleForSelectedPatient = useMemo(() => {
    if (!selectedPatientId) return null;
    return appointments.find(apt => 
      apt.animalId === selectedPatientId &&
      apt.status === 'Reschedule Requested'
    ) || null;
  }, [selectedPatientId, appointments]);

  const isConsultationAllowed = Boolean(activeAppointmentForSelectedPatient);

  // Selected inventory item details
  const selectedInventoryItem = useMemo(() => {
    return inventory.find(i => i.id === selectedInventoryItemId) || null;
  }, [inventory, selectedInventoryItemId]);

  // Filtered animals for dropdown
  const filteredPatients = useMemo(() => {
    if (!patientSearchQuery.trim()) return activeAnimals;
    const q = patientSearchQuery.toLowerCase();
    return activeAnimals.filter(a => 
      a.name?.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      a.species.toLowerCase().includes(q) ||
      (a.enclosureId && a.enclosureId.toLowerCase().includes(q))
    );
  }, [activeAnimals, patientSearchQuery]);

  // Step Completion Checks for 5-Step Progress Indicator
  const isStep1Complete = Boolean(selectedPatientId && isConsultationAllowed);
  const isStep2Complete = Boolean(isStep1Complete && clinicalObs.trim().length > 0);
  const isStep3Complete = Boolean(
    isStep2Complete && 
    clinicalDiagnosis.trim().length > 0 &&
    (healthStatusInput === 'Other' ? customHealthStatus.trim().length > 0 : Boolean(healthStatusInput))
  );
  const isStep4Complete = Boolean(
    isStep3Complete &&
    (!needsTreatment || (treatment.trim().length > 0 && (!deductFromPharmacy || Boolean(selectedInventoryItemId))))
  );
  const isStep5Complete = Boolean(
    isStep4Complete &&
    (!scheduleFollowup || Boolean(nextCheckup))
  );

  // Prerequisites for later steps
  const isPrerequisitesComplete = isStep1Complete && isStep2Complete && isStep3Complete;

  // Step Click Guard - Prevent proceeding to step 2, 3, 4, or 5 without completing prior steps
  const handleStepClick = (targetStep: number) => {
    if (targetStep >= 2 && !isStep1Complete) {
      setCurrentStep(1);
      if (onNotify) {
        onNotify(
          'Patient Selection Required (Step 1)',
          selectedPatientId 
            ? 'The selected animal requires an authorized checkup request before proceeding.'
            : 'Please select a patient animal from the facility roster in Step 1 first.',
          'warning'
        );
      }
      return;
    }
    if (targetStep >= 3 && !isStep2Complete) {
      setCurrentStep(2);
      if (onNotify) {
        onNotify(
          'Clinical Examination Required (Step 2)',
          'Please record clinical observations and examination notes in Step 2 first before proceeding to Step 3.',
          'warning'
        );
      }
      return;
    }
    if (targetStep >= 4 && !isStep3Complete) {
      setCurrentStep(3);
      if (onNotify) {
        onNotify(
          'Diagnosis & Clearance Required (Step 3)',
          'Please enter a clinical diagnosis and select health clearance status in Step 3 before proceeding to Treatment or Review.',
          'warning'
        );
      }
      return;
    }
    if (targetStep >= 5 && !isStep3Complete) {
      setCurrentStep(3);
      if (onNotify) {
        onNotify(
          'Diagnosis & Clearance Required (Step 3)',
          'Please complete Steps 1, 2, and 3 before proceeding to Review & Follow-up.',
          'warning'
        );
      }
      return;
    }
    setCurrentStep(targetStep);
  };

  // Quick date helper
  const setQuickDateOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dateStr = d.toISOString().split('T')[0];
    setNextCheckup(dateStr);
    setScheduleFollowup(true);
  };

  // Sync selected patient defaults
  const handleSelectPatient = (id: string) => {
    setSelectedPatientId(id);
    setIsPatientDropdownOpen(false);
    const animal = activeAnimals.find(a => a.id === id);
    if (animal) {
      const status = (animal.healthStatus as any) || 'Healthy';
      const standardStatuses = ['Healthy', 'Under Treatment', 'Under Observation', 'Injured', 'Sick'];
      if (standardStatuses.includes(status)) {
        setHealthStatusInput(status);
        setCustomHealthStatus('');
      } else {
        setHealthStatusInput('Other');
        setCustomHealthStatus(status === 'Other' ? '' : status);
      }
      if (status === 'Under Treatment' || status === 'Under Observation' || status === 'Injured' || status === 'Sick') {
        setNeedsTreatment(true);
        setScheduleFollowup(true);
        if (!nextCheckup) {
          setQuickDateOffset(status === 'Injured' || status === 'Sick' ? 3 : 7);
        }
      } else if (status === 'Healthy') {
        setNeedsTreatment(false);
      }
    }
  };

  // When health status changes
  const handleHealthStatusChange = (newStatus: string) => {
    setHealthStatusInput(newStatus);
    if (newStatus === 'Under Treatment' || newStatus === 'Under Observation' || newStatus === 'Injured' || newStatus === 'Sick' || newStatus === 'Other') {
      setNeedsTreatment(true);
      setScheduleFollowup(true);
      if (!nextCheckup) {
        setQuickDateOffset(newStatus === 'Injured' || newStatus === 'Sick' ? 3 : 7);
      }
    } else if (newStatus === 'Healthy') {
      setNeedsTreatment(false);
    }
  };

  // Insert template text into Clinical Observation
  const handleInsertObservationSnippet = (snippet: string) => {
    setClinicalObs(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n• ${snippet}` : `• ${snippet}`;
    });
  };

  // Submit Consultation
  const handleConsultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setCurrentStep(1);
      if (onNotify) onNotify('Patient Required', 'Please select a patient animal in Step 1 to consult.', 'warning');
      return;
    }
    if (!isConsultationAllowed) {
      setCurrentStep(1);
      if (onNotify) onNotify(
        'Consultation Restricted',
        'Cannot conduct consultation on this animal until an active checkup request is submitted by Admin/Keeper or a follow-up examination is scheduled.',
        'error'
      );
      return;
    }
    if (!clinicalObs.trim()) {
      setCurrentStep(2);
      if (onNotify) onNotify('Observation Required', 'Please enter your clinical observations in Step 2.', 'warning');
      return;
    }
    if (!clinicalDiagnosis.trim()) {
      setCurrentStep(3);
      if (onNotify) onNotify('Diagnosis Required', 'Please enter a clinical diagnosis in Step 3.', 'warning');
      return;
    }
    if (healthStatusInput === 'Other' && !customHealthStatus.trim()) {
      setCurrentStep(3);
      if (onNotify) onNotify('Health Status Required', 'Please specify the custom health clearance status in Step 3.', 'warning');
      return;
    }

    setShowConfirmConsultModal(true);
  };

  const executeConsultSubmit = () => {
    try {
      const patient = (animals || []).find(a => a.id === selectedPatientId || a.id?.toLowerCase() === (selectedPatientId || '').toLowerCase().trim()) || 
                      (activeAnimals || []).find(a => a.id === selectedPatientId || a.id?.toLowerCase() === (selectedPatientId || '').toLowerCase().trim());
      if (!patient) {
        console.error('Patient not found for consult submit:', selectedPatientId);
        if (onNotify) {
          onNotify('Patient Not Found', 'Could not locate the selected patient animal record.', 'warning');
        }
        return;
      }

      const effectiveDate = systemDate || new Date().toISOString().split('T')[0];

      const finalRecordType = recordType === 'Other'
        ? (customRecordType.trim() || 'Other Consult')
        : (recordType || 'Routine Check-up');

      const finalHealthStatus = healthStatusInput === 'Other'
        ? (customHealthStatus.trim() || 'Other')
        : (healthStatusInput || 'Healthy');

      const finalDiagnosis = (clinicalDiagnosis && clinicalDiagnosis.trim()) || finalRecordType || 'Clinical Evaluation';

      const finalRxRoute = rxRoute === 'Other' ? (customRxRoute.trim() || 'Other Route') : rxRoute;
      const finalRxFrequency = rxFrequency === 'Other' ? (customRxFrequency.trim() || 'Other Frequency') : rxFrequency;
      const finalRxDuration = rxDuration === 'Other' ? (customRxDuration.trim() || 'Other Duration') : rxDuration;

      // 1. Create and add Medical Record
      const newRecordId = `MED-${Date.now().toString().slice(-6)}`;
      let vetName = 'Dr. Veterinarian';
      try {
        vetName = localStorage.getItem('feronia_vet_name') || 'Dr. Veterinarian';
      } catch {}

      const newRecord: MedicalRecord = {
        id: newRecordId,
        animalId: patient.id,
        appointmentId: activeAppointmentId || undefined,
        recordType: finalRecordType,
        recordDate: effectiveDate,
        purpose: purpose || `${finalRecordType} consult`,
        clinicalObservation: clinicalObs || 'Clinical examination conducted.',
        diagnosis: finalDiagnosis,
        treatment: treatment || 'Routine clinical monitoring',
        nextCheckup: (scheduleFollowup && nextCheckup) ? nextCheckup : undefined,
        veterinarian: vetName,
        status: 'Active'
      };
      if (onAddMedicalRecord) {
        onAddMedicalRecord(newRecord);
      }

      // 2. Update Animal Health Status and clean keeper logs (remove any legacy fake VETLOG entries)
      const rawKeeperLogs = Array.isArray(patient.keeperLogs) ? patient.keeperLogs : [];
      const cleanedKeeperLogs = rawKeeperLogs.filter(l => 
        l && typeof l === 'object' && (!l.id || !l.id.startsWith('VETLOG-')) && l.logType !== 'Clinical Checkup'
      );

      const updatedAnimal: Animal = {
        ...patient,
        healthStatus: finalHealthStatus as any,
        keeperLogs: cleanedKeeperLogs
      };
      if (onUpdateAnimal) {
        onUpdateAnimal(updatedAnimal);
      }

      // 3. Deduct inventory if selected
      const safeInventory = Array.isArray(inventory) ? inventory : [];
      if (deductFromPharmacy && selectedInventoryItemId && inventoryDeductQty > 0) {
        const updatedInventory = safeInventory.map(item => {
          if (item && item.id === selectedInventoryItemId) {
            const remainingStock = Math.max(0, (item.currentStock || 0) - inventoryDeductQty);
            const isLow = remainingStock <= ((item.maxStock || 10) * 0.2) || remainingStock <= 2;
            return {
              ...item,
              currentStock: remainingStock,
              status: remainingStock <= 0 ? 'Out of Stock' : (isLow ? 'Low Stock' : 'Good')
            } as InventoryItem;
          }
          return item;
        });
        if (onUpdateInventory) {
          onUpdateInventory(updatedInventory);
        }
      }

      // 4. Auto-generate daily keeper checkup task if treatment prescribed
      if (treatment && treatment.trim().length > 0 && onAddTask) {
        const selectedItemObj = safeInventory.find(i => i && i.id === selectedInventoryItemId);
        const newTask: Task = {
          id: `TASK-VET-${Date.now().toString().slice(-6)}`,
          animalId: patient.id,
          type: 'Health Check',
          title: `Administer Treatment: ${patient.name || patient.id}`,
          time: '09:00 AM',
          date: effectiveDate,
          createdAt: effectiveDate,
          assignedBy: 'Veterinarian',
          assignedByName: `${vetName} (Veterinarian)`,
          details: `Prescription: ${treatment}\nRoute: ${finalRxRoute} | Frequency: ${finalRxFrequency} | Duration: ${finalRxDuration}\nClinical Notes: ${clinicalObs}${selectedItemObj ? `\nMedication Item: [ID:${selectedItemObj.id}] ${selectedItemObj.name}` : ''}`,
          frequency: finalRxFrequency === 'Twice daily' ? 'Twice Daily' : 'Daily',
          status: 'Pending',
          enclosureId: patient.enclosureId || 'General'
        };
        onAddTask(newTask);
      }

      // 5. Schedule Follow-up Checkup / Treatment Appointment if selected
      if (scheduleFollowup && nextCheckup && onAddAppointment) {
        const followUpApt: Appointment = {
          id: `APT-VET-${Date.now().toString().slice(-6)}`,
          animalId: patient.id,
          type: followupRecordType === 'Other' ? (customFollowupRecordType.trim() || 'Other Consult') : (followupRecordType || 'Follow-up Checkup'),
          veterinarian: vetName,
          requestedBy: `${vetName} (Follow-up Recommendation)`,
          requestedByRole: 'vet',
          date: nextCheckup,
          time: followupTime || '09:30 AM',
          purpose: followupNotes || `Follow-up evaluation & treatment review for ${patient.name || patient.id} (${finalDiagnosis})`,
          status: 'Pending Approval',
          priority: followupPriority || 'Normal',
          createdOn: effectiveDate
        };
        onAddAppointment(followUpApt);
      }

      // 6. Automatically complete any associated active/pending appointments for this animal
      if (Array.isArray(appointments) && appointments.length > 0) {
        const activeApts = appointments.filter(a => 
          a && a.animalId === patient.id && 
          a.status !== 'Completed' && 
          a.status !== 'Cancelled' && 
          a.status !== 'Declined'
        );
        activeApts.forEach(apt => {
          const isTarget = activeAppointmentId ? apt.id === activeAppointmentId : true;
          if (isTarget) {
            const updatedApt: Appointment = {
              ...apt,
              status: 'Completed',
              adminNotes: apt.adminNotes 
                ? `${apt.adminNotes} (Examination completed by Veterinarian.)` 
                : 'Examination completed by Veterinarian.'
            };
            if (onUpdateAppointment) {
              onUpdateAppointment(updatedApt);
            } else if (onUpdateAppointmentStatus) {
              onUpdateAppointmentStatus(apt.id, 'Completed');
            }
          }
        });
      }

      // 7. Automatically complete any associated active/pending Health Check tasks for this animal
      if (Array.isArray(tasks) && tasks.length > 0 && onUpdateTaskStatus) {
        const pendingTasks = tasks.filter(t => 
          t && t.animalId === patient.id && 
          t.type === 'Health Check' && 
          t.status !== 'Completed'
        );
        pendingTasks.forEach(task => {
          if (task && task.id) {
            onUpdateTaskStatus(task.id, 'Completed');
          }
        });
      }

      // Reset Form and trigger success
      const bannerMsg = scheduleFollowup && nextCheckup
        ? `✓ Consultation completed! Follow-up checkup requested for ${nextCheckup} (${followupTime}).`
        : `✓ Clinical consultation for ${patient.name || patient.id} successfully recorded!`;
      
      setSuccessBanner(bannerMsg);
      
      if (onNotify) {
        onNotify(
          'Medical Record Saved',
          `Clinical consultation for ${patient.name || patient.id} (${finalRecordType}) has been logged successfully.`,
          'success'
        );
      }

      // Reset form states
      setRecordType('Routine Check-up');
      setCustomRecordType('');
      setHealthStatusInput('Healthy');
      setCustomHealthStatus('');
      setClinicalDiagnosis('');
      setPurpose('');
      setClinicalObs('');
      setTreatment('');
      setRxRoute('Topical Ointment');
      setRxFrequency('Once daily');
      setRxDuration('7 days');
      setDeductFromPharmacy(false);
      setSelectedInventoryItemId('');
      setInventoryDeductQty(1);
      setPharmacyNotes('');
      setNextCheckup('');
      setScheduleFollowup(false);
      setFollowupNotes('');
      setCurrentStep(1);

      // Switch to records tab to immediately display the newly created record
      setSelectedPatientId('');
      if (setActiveAppointmentId) {
        setActiveAppointmentId(null);
      }
      setActiveSubTab('records');

      setTimeout(() => {
        setSuccessBanner(null);
      }, 6000);
    } catch (err: any) {
      console.error('Error executing consultation submit:', err);
      if (onNotify) {
        onNotify('Error Saving Consultation', 'An error occurred while saving the consultation: ' + (err?.message || err), 'error');
      }
    }
  };

  const standardRecordTypes = ['Routine Check-up', 'Treatment', 'Medical Examination', 'Surgery', 'Quarantine Inspection', 'Lab Result', 'Previous Vet Record', 'Other'];
  const filteredRecords = medicalRecords.filter(rec => {
    const animal = animals.find(a => a.id === rec.animalId);
    const matchesSearch = (animal?.name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (animal?.species || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (rec.animalId || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (rec.purpose || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (rec.diagnosis || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (rec.treatment || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (rec.clinicalObservation || '').toLowerCase().includes(searchFilter.toLowerCase());
    const matchesType = typeFilter === 'All' || rec.recordType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Mode Switcher */}
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
            <h2 className="text-xl font-black tracking-tight text-white flex items-center space-x-2">
              <Stethoscope className="w-5 h-5 text-emerald-400" />
              <span>Veterinary Clinical Consultation Station</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Conduct 5-step clinical evaluations, prescribe keeper care, deduct pharmacy supplies, and schedule follow-ups.
            </p>
          </div>
        </div>

        {/* Tab switcher: Consult Station vs Historical Records */}
        <div className={`flex items-center p-1 rounded-xl border ${
          isDarkMode ? 'bg-[#04110A] border-emerald-950' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setActiveSubTab('consult')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeSubTab === 'consult'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Consult Station</span>
          </button>
          <button
            onClick={() => setActiveSubTab('records')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeSubTab === 'records'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Historical Records ({medicalRecords.length})</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs font-bold flex items-center justify-between space-x-3 animate-fade-in shadow-xl">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. CONSULTATION STATION */}
      {activeSubTab === 'consult' && (
        <div className="space-y-6">

          {/* ========================================================================= */}
          {/* 1. FIVE-STEP PROGRESS INDICATOR */}
          {/* ========================================================================= */}
          <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
            isDarkMode ? 'bg-[#061c12] border-emerald-900/60 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                  Clinical Consultation Workflow
                </span>
                <span className="text-[10px] text-slate-400">
                  • Step {currentStep} of 5
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewAllSections(!viewAllSections)}
                className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer border flex items-center space-x-1.5 ${
                  viewAllSections
                    ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                    : 'bg-emerald-900/30 border-emerald-800/40 text-slate-300 hover:text-white'
                }`}
              >
                <span>{viewAllSections ? 'Viewing All 5 Sections' : 'View All 5 Sections (Continuous)'}</span>
                {viewAllSections ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* 5-Step Progress Bar & Clickable Step Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              {CONSULT_STEPS.map((step) => {
                const isActive = currentStep === step.id;
                const isComplete = 
                  (step.id === 1 && isStep1Complete) ||
                  (step.id === 2 && isStep2Complete) ||
                  (step.id === 3 && isStep3Complete) ||
                  (step.id === 4 && isStep4Complete) ||
                  (step.id === 5 && isStep5Complete);

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleStepClick(step.id)}
                    title={step.title}
                    className={`relative p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? isDarkMode
                          ? 'bg-emerald-950/90 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                          : 'bg-emerald-50 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                        : isComplete
                          ? isDarkMode
                            ? 'bg-[#04110A] border-emerald-800/70 hover:border-emerald-600'
                            : 'bg-white border-emerald-300 hover:border-emerald-500 shadow-2xs'
                          : isDarkMode
                            ? 'bg-[#030e07] border-emerald-950/60 opacity-70 hover:opacity-100'
                            : 'bg-slate-50 border-slate-200 text-slate-800 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        isActive
                          ? isDarkMode ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-600 text-white'
                          : isComplete
                            ? isDarkMode
                              ? 'bg-emerald-600/30 border border-emerald-500 text-emerald-400'
                              : 'bg-emerald-100 border border-emerald-500 text-emerald-800'
                            : isDarkMode
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isComplete && !isActive ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          step.id
                        )}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        isActive
                          ? isDarkMode ? 'text-emerald-400' : 'text-emerald-700'
                          : isComplete
                            ? isDarkMode ? 'text-emerald-500/80' : 'text-emerald-600'
                            : isDarkMode ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        {isComplete ? 'Ready' : `Step ${step.id}`}
                      </span>
                    </div>

                    <div>
                      <h4 className={`text-xs font-black leading-tight ${
                        isActive
                          ? isDarkMode ? 'text-white' : 'text-emerald-950'
                          : isDarkMode ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        {step.title}
                      </h4>
                      <p className={`text-[10px] leading-tight mt-0.5 line-clamp-1 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {step.subtitle}
                      </p>
                    </div>

                    {/* Active accent underline */}
                    {isActive && (
                      <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-emerald-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Container */}
          <form onSubmit={handleConsultSubmit} className="space-y-6">

            {/* ========================================================================= */}
            {/* SECTION 1: PATIENT SELECTION & REPTILE CLINICAL VITALS */}
            {/* ========================================================================= */}
            {(viewAllSections || currentStep === 1) && (
              <div className={`p-6 rounded-3xl border transition-all ${
                isDarkMode ? 'bg-[#06180F] border-emerald-950/80 shadow-md' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-emerald-950/40 pb-3.5 mb-5">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
                      1
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-white flex items-center space-x-2">
                        <span>Patient Identification & Reptile Vitals</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Select patient from active facility roster to load baseline biology and clinical history.
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                    System Date: {systemDate}
                  </span>
                </div>

                {/* Patient Search & Dropdown Trigger (Shown only if no patient selected yet) */}
                {!selectedPatient && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                        <span>Select Patient Animal *</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({activeAnimals.length} reptiles available)
                        </span>
                      </label>

                      {/* Search & Custom Selector Bar */}
                      <div className="relative">
                        <div className="flex items-center space-x-2">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={patientSearchQuery}
                              onChange={(e) => {
                                setPatientSearchQuery(e.target.value);
                                setIsPatientDropdownOpen(true);
                              }}
                              onFocus={() => setIsPatientDropdownOpen(true)}
                              placeholder="Search by animal name, species, ID (e.g., BP-21), or enclosure..."
                              className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            />
                            {patientSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setPatientSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsPatientDropdownOpen(!isPatientDropdownOpen)}
                            className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                              isDarkMode ? 'bg-[#04110A] border-emerald-900 text-emerald-300 hover:bg-emerald-950' : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span>Browse List</span>
                            {isPatientDropdownOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Dropdown Menu with Brief Information on Each Animal */}
                        {isPatientDropdownOpen && (
                          <div className={`absolute z-30 left-0 right-0 mt-2 max-h-72 overflow-y-auto rounded-2xl border shadow-2xl p-2 space-y-1 animate-fade-in ${
                            isDarkMode ? 'bg-[#04140C] border-emerald-800/80 text-white' : 'bg-white border-slate-300 text-slate-800'
                          }`}>
                            {filteredPatients.length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-400">
                                No reptile matches "{patientSearchQuery}". Try another name or ID.
                              </div>
                            ) : (
                              filteredPatients.map(pat => {
                                const isSelected = pat.id === selectedPatientId;
                                return (
                                  <button
                                    key={pat.id}
                                    type="button"
                                    onClick={() => handleSelectPatient(pat.id)}
                                    className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer ${
                                      isSelected
                                        ? 'bg-emerald-600/30 border border-emerald-500 text-white'
                                        : 'hover:bg-emerald-950/60 border border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-3 min-w-0">
                                      {/* Thumbnail Photo with Fallback */}
                                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 border border-emerald-800/40 shrink-0 flex items-center justify-center">
                                        {pat.image ? (
                                          <img
                                            src={pat.image}
                                            alt={pat.name || pat.id}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                          />
                                        ) : (
                                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-0.5">
                                            <Camera className="w-3.5 h-3.5 text-emerald-500/80" />
                                            <span className="text-[6px] font-bold uppercase tracking-wider text-slate-400">No Photo</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Brief Information */}
                                      <div className="min-w-0">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-extrabold text-xs text-white truncate">
                                            {pat.name || 'Unnamed'}
                                          </span>
                                          <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800/30">
                                            {pat.id}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-300 truncate">
                                          {pat.species} {pat.morph ? `• ${pat.morph}` : ''}
                                        </p>
                                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono mt-0.5">
                                          <span>{pat.sex || 'Unknown sex'}</span>
                                          {pat.dob && <span>• DOB: {pat.dob}</span>}
                                          {pat.weight ? <span>• {pat.weight}g</span> : null}
                                          {pat.enclosureId && <span>• 🏠 {pat.enclosureId}</span>}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Health Status Pill & Checkup Request Status */}
                                    <div className="shrink-0 text-right ml-2 space-y-1">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border block ${
                                        pat.healthStatus === 'Healthy'
                                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                          : pat.healthStatus === 'Under Treatment'
                                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                                      }`}>
                                        {pat.healthStatus || 'Healthy'}
                                      </span>
                                      {(() => {
                                        const hasReq = appointments.some(a => a.animalId === pat.id && a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'Declined');
                                        return hasReq ? (
                                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 block">
                                            ✓ Checkup Requested
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 block">
                                            No Checkup Req
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                  {/* Enhanced Patient Dossier Card & Climate Setup */}
                  {selectedPatient ? (
                    <div className="space-y-3">
                      <div className={`p-4 rounded-2xl border transition-all animate-fade-in ${
                        isDarkMode ? 'bg-[#04110A] border-emerald-800/80' : 'bg-emerald-50/50 border-emerald-200'
                      }`}>
                        {/* Dossier Card Top Bar with X / Change Patient Button */}
                        <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-emerald-900/30">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                              Active Patient Selected
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPatientId('');
                              setPatientSearchQuery('');
                              setIsPatientDropdownOpen(true);
                            }}
                            title="Change Patient Animal"
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs ${
                              isDarkMode
                                ? 'bg-rose-950/40 hover:bg-rose-900/70 border-rose-800/60 text-rose-300 hover:text-white'
                                : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
                            }`}
                          >
                            <X className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>Change Patient</span>
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center space-x-3.5 min-w-0">
                            {/* Patient Large Photo */}
                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-900 border border-emerald-700/60 shrink-0 shadow-md flex items-center justify-center">
                              {selectedPatient.image ? (
                                <img
                                  src={selectedPatient.image}
                                  alt={selectedPatient.name || selectedPatient.id}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-1">
                                  <Camera className="w-5 h-5 text-emerald-500/80 mb-0.5" />
                                  <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400">No Photo</span>
                                </div>
                              )}
                            </div>

                            {/* Patient Details */}
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-black text-sm text-white truncate">
                                  {selectedPatient.name || 'Unnamed Reptile'}
                                </h4>
                                <span className="text-[10px] font-mono text-emerald-300 font-bold px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-700/60">
                                  {selectedPatient.id}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  selectedPatient.healthStatus === 'Healthy'
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                    : selectedPatient.healthStatus === 'Under Treatment'
                                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                      : 'bg-red-500/20 border-red-500 text-red-300'
                                }`}>
                                  {selectedPatient.healthStatus || 'Healthy'}
                                </span>
                              </div>

                              <p className="text-xs text-slate-300 font-medium mt-1">
                                {selectedPatient.species} {selectedPatient.morph ? `• Morph: ${selectedPatient.morph}` : ''}
                              </p>

                              {/* Brief Information Badges */}
                              <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 font-mono mt-2">
                                <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-900 text-emerald-300">
                                  Sex: {selectedPatient.sex || 'N/A'}
                                </span>
                                {selectedPatient.dob && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-900 text-emerald-300">
                                    DOB: {selectedPatient.dob}
                                  </span>
                                )}
                                {selectedPatient.weight && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-900 text-emerald-300">
                                    Weight: {selectedPatient.weight}g
                                  </span>
                                )}
                                {selectedPatient.length && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-900 text-emerald-300">
                                    Length: {selectedPatient.length}cm
                                  </span>
                                )}
                                {selectedPatient.enclosureId && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-900 text-emerald-300">
                                    Enclosure: {selectedPatient.enclosureId}
                                  </span>
                                )}
                                {selectedPatient.source && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-900 text-emerald-300">
                                    Source: {selectedPatient.source}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick History Pill */}
                          <div className="shrink-0 text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-900/40">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Historical Records
                            </span>
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              {medicalRecords.filter(r => r.animalId === selectedPatient.id).length} prior consults
                            </span>
                          </div>
                        </div>

                        {/* Checkup Authorization Status Banner */}
                        <div className="mt-3 pt-3 border-t border-emerald-900/40">
                          {!isConsultationAllowed ? (
                            pendingRescheduleForSelectedPatient ? (
                              <div className="p-3.5 rounded-xl bg-amber-950/70 border-2 border-amber-500/80 text-amber-200 text-xs font-bold space-y-1.5 animate-fade-in">
                                <div className="flex items-center space-x-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                                  <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                                  <span>Rescheduling Request Awaiting Admin Authorization</span>
                                </div>
                                <p className="leading-relaxed font-semibold">
                                  A consultation reschedule request is pending for ({selectedPatient.name || selectedPatient.id}) for the new date {pendingRescheduleForSelectedPatient.proposedDate} ({pendingRescheduleForSelectedPatient.proposedTime}). It requires Administrator authorization before clinical consultation can proceed.
                                </p>
                                <div className="p-2 rounded-lg bg-amber-900/40 border border-amber-500/30 text-[11px] text-amber-300 font-medium">
                                  🛡️ <strong>Admin Approval Required:</strong> The Administrator will review and authorize the rescheduled date and time in the Sanctuary Admin Portal before the checkup becomes active for the Veterinarian.
                                </div>
                              </div>
                            ) : pendingVetFollowupForSelectedPatient ? (
                              <div className="p-3.5 rounded-xl bg-amber-950/70 border-2 border-amber-500/80 text-amber-200 text-xs font-bold space-y-1.5 animate-fade-in">
                                <div className="flex items-center space-x-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                                  <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                                  <span>Follow-up Checkup Awaiting Admin Authorization</span>
                                </div>
                                <p className="leading-relaxed font-semibold">
                                  A follow-up checkup has been requested for ({selectedPatient.name || selectedPatient.id}) on {pendingVetFollowupForSelectedPatient.date} ({pendingVetFollowupForSelectedPatient.time}). It requires Administrator authorization before new clinical consultation can proceed.
                                </p>
                                <div className="p-2 rounded-lg bg-amber-900/40 border border-amber-500/30 text-[11px] text-amber-300 font-medium">
                                  🛡️ <strong>Admin Approval Required:</strong> The Administrator will authorize the follow-up schedule in the Sanctuary Admin Portal before the checkup becomes active for the Veterinarian.
                                </div>
                              </div>
                            ) : (
                              <div className="p-3.5 rounded-xl bg-amber-950/60 border-2 border-amber-500/80 text-amber-200 text-xs font-bold space-y-1.5 animate-fade-in">
                                <div className="flex items-center space-x-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                                  <span>Consultation Pending Authorization</span>
                                </div>
                                <p className="leading-relaxed font-semibold">
                                  Cannot conduct clinical consultation for ({selectedPatient.name || selectedPatient.id}) as there is no active checkup request from Admin/Keeper or scheduled follow-up examination.
                                </p>
                                <div className="p-2 rounded-lg bg-amber-900/30 border border-amber-500/30 text-[11px] text-amber-300 font-medium">
                                  💡 <strong>Requirement:</strong> Admin or Keeper must first request a checkup for this animal, or Vet must schedule a follow-up examination authorized by Admin before it becomes eligible for consultation.
                                </div>
                              </div>
                            )
                          ) : (
                            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>✓ Checkup Authorized: {activeAppointmentForSelectedPatient?.purpose || activeAppointmentForSelectedPatient?.type || 'Requested Checkup / Scheduled Follow-up'} ({activeAppointmentForSelectedPatient?.date})</span>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-extrabold bg-emerald-800 text-white">
                                {activeAppointmentForSelectedPatient?.priority || 'Normal'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-dashed border-emerald-900/60 text-center text-xs text-slate-400">
                      ℹ️ Please search and select an animal above to begin the consultation exam.
                    </div>
                  )}

                  {/* Step 1 Navigation Buttons */}
                  {!viewAllSections && (
                    <div className="flex justify-end pt-3">
                      <button
                        type="button"
                        disabled={!isStep1Complete}
                        onClick={() => {
                          if (!isStep1Complete) {
                            if (onNotify) {
                              onNotify(
                                'Patient Selection Required (Step 1)',
                                selectedPatientId 
                                  ? 'The selected animal requires an authorized checkup request before proceeding.'
                                  : 'Please select a patient animal from the facility roster in Step 1 first.',
                                'warning'
                              );
                            }
                            return;
                          }
                          setCurrentStep(2);
                        }}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
                          isStep1Complete
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <span>Continue to Examination (Step 2)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* SECTION 2: EXAMINATION TYPE & CLINICAL OBSERVATIONS */}
            {/* ========================================================================= */}
            {(viewAllSections || currentStep === 2) && (
              <div className={`p-6 rounded-3xl border transition-all ${
                isDarkMode ? 'bg-[#06180F] border-emerald-950/80 shadow-md' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-emerald-950/40 pb-3.5 mb-5">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
                      2
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-white flex items-center space-x-2">
                        <span>Examination Type & Clinical Observations</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Specify the consultation reason and record structured anatomical findings.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Consult Type */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-200">Consultation Type *</label>
                        <span className="text-[10px] text-slate-400">Classify exam category</span>
                      </div>
                      {activeAppointmentId ? (
                        <input
                          type="text"
                          readOnly
                          value={recordType === 'Other' ? (customRecordType || 'Other') : recordType}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none select-none cursor-default ${
                            isDarkMode ? 'bg-[#04110A] border-emerald-950 text-emerald-300' : 'bg-slate-100 border-slate-200 text-slate-800'
                          }`}
                        />
                      ) : (
                        <>
                          <select
                            value={recordType}
                            onChange={(e) => setRecordType(e.target.value)}
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                              isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            {standardRecordTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          {recordType === 'Other' && (
                            <input
                              type="text"
                              value={customRecordType}
                              onChange={(e) => setCustomRecordType(e.target.value)}
                              placeholder="Specify custom consultation type..."
                              required={recordType === 'Other'}
                              className={`w-full mt-2 px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none ${
                                isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            />
                          )}
                        </>
                      )}
                    </div>

                    {/* Purpose / Subject */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-200">Purpose / Chief Complaint</label>
                        <span className="text-[10px] text-slate-400">Brief summary header</span>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={purpose || activeAppointmentForSelectedPatient?.purpose || `Veterinary Checkup Request: Routine Checkup for ${selectedPatient?.name || 'Animal'}`}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none select-none cursor-default truncate ${
                          isDarkMode ? 'bg-[#04110A] border-emerald-950 text-emerald-300' : 'bg-slate-100 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Clinical Observation Textarea with Guidance & Snippets */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                        <span>Clinical Observations & Findings *</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {clinicalObs.length} characters
                      </span>
                    </div>

                    {/* Clinical Guidance Box */}
                    <div className={`p-3 rounded-xl border mb-2.5 text-[11px] leading-relaxed flex items-start space-x-2 ${
                      isDarkMode ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300/90' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}>
                      <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Field Guidance:</strong> Inspect and note respiratory sounds, muscle tone, ocular clarity, oral cavity/mucous membranes, cloacal cleanliness, skin hydration/shedding, and alertness.
                      </div>
                    </div>

                    {/* Quick Clinical Observation Snippets / Templates */}
                    <div className="mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Quick Observation Templates (Click to insert):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleInsertObservationSnippet('Normal heart rate, clear ocular condition, hydrated dorsal skin, responsive muscle tone.')}
                          className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-emerald-950/60 border border-emerald-900 text-emerald-300 hover:bg-emerald-900/50 cursor-pointer"
                        >
                          + Normal Physical Exam
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertObservationSnippet('Dysecdysis (retained shed) noted around distal tail and spectacles; soak recommended.')}
                          className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-emerald-950/60 border border-emerald-900 text-emerald-300 hover:bg-emerald-900/50 cursor-pointer"
                        >
                          + Retained Shed (Dysecdysis)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertObservationSnippet('Minor superficial scale abrasion on ventral abdomen; clean wound beds, no purulent discharge.')}
                          className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-emerald-950/60 border border-emerald-900 text-emerald-300 hover:bg-emerald-900/50 cursor-pointer"
                        >
                          + Scale Abrasion / Wound
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertObservationSnippet('Mild respiratory wheezing, no oral mucous bubbling; lungs auscultated.')}
                          className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-emerald-950/60 border border-emerald-900 text-emerald-300 hover:bg-emerald-900/50 cursor-pointer"
                        >
                          + Respiratory Assessment
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={5}
                      value={clinicalObs}
                      onChange={(e) => setClinicalObs(e.target.value)}
                      placeholder="Type thorough clinical exam observations here..."
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans ${
                        isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                      required
                    ></textarea>
                  </div>

                  {/* Step 2 Navigation Buttons */}
                  {!viewAllSections && (
                    <div className="flex justify-between pt-3">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white flex items-center space-x-1.5 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Patient</span>
                      </button>
                      <button
                        type="button"
                        disabled={!isStep1Complete || !isStep2Complete}
                        onClick={() => {
                          if (!isStep1Complete) {
                            setCurrentStep(1);
                            if (onNotify) onNotify('Patient Required (Step 1)', 'Please select an authorized patient animal in Step 1 first.', 'warning');
                            return;
                          }
                          if (!isStep2Complete) {
                            if (onNotify) onNotify('Observations Required (Step 2)', 'Please enter clinical observations in Step 2 before proceeding.', 'warning');
                            return;
                          }
                          setCurrentStep(3);
                        }}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
                          isStep1Complete && isStep2Complete
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <span>Continue to Health Status (Step 3)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SECTION 3: CLINICAL DIAGNOSIS & HEALTH CLEARANCE STATUS */}
            {/* ========================================================================= */}
            {(viewAllSections || currentStep === 3) && (
              <div className={`p-6 rounded-3xl border transition-all ${
                isDarkMode ? 'bg-[#06180F] border-emerald-950/80 shadow-md' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-emerald-950/40 pb-3.5 mb-5">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
                      3
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-white flex items-center space-x-2">
                        <span>Clinical Diagnosis & Health Clearance Rating</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Set the patient's operational health status across the entire facility.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Diagnosis Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-200">Clinical Diagnosis</label>
                      <span className="text-[10px] text-slate-400">Formal medical diagnosis</span>
                    </div>
                    <input
                      type="text"
                      value={clinicalDiagnosis}
                      onChange={(e) => setClinicalDiagnosis(e.target.value)}
                      placeholder="e.g., Healthy - Routine Maintenance, Superficial Scale Dermatitis, Incomplete Shedding..."
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  {/* Health Clearance Status Selector with Clinical Guidance */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Health Clearance Status *</label>
                      <span className={`text-[10px] font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Affects daily keeper routines</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { value: 'Healthy', label: 'Healthy (Cleared)', desc: 'Fit for standard habitat routine & normal diet', color: 'emerald' },
                        { value: 'Under Observation', label: 'Under Observation', desc: 'Monitor closely for 48-72h by assigned keeper', color: 'blue' },
                        { value: 'Under Treatment', label: 'Under Treatment', desc: 'Requires active medication or medical protocol', color: 'amber' },
                        { value: 'Injured', label: 'Injured (Wound Care)', desc: 'Active physical trauma, burn, or wound care', color: 'rose' },
                        { value: 'Sick', label: 'Sick / Critical', desc: 'Severe clinical illness, quarantine isolation', color: 'red' },
                        { value: 'Other', label: 'Other Status', desc: 'Specify custom veterinary status category', color: 'purple' }
                      ].map(item => {
                        const isSelected = healthStatusInput === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => handleHealthStatusChange(item.value)}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? isDarkMode
                                  ? 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-500/30'
                                  : 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                                : isDarkMode
                                  ? 'bg-[#04110A] border-emerald-950/80 hover:border-emerald-800'
                                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`font-extrabold text-xs ${
                                isSelected
                                  ? isDarkMode ? 'text-white' : 'text-emerald-950'
                                  : isDarkMode ? 'text-white' : 'text-slate-900'
                              }`}>
                                {item.label}
                              </span>
                              {isSelected && <Check className={`w-3.5 h-3.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`} />}
                            </div>
                            <p className={`text-[10px] leading-tight ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              {item.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {healthStatusInput === 'Other' && (
                      <input
                        type="text"
                        value={customHealthStatus}
                        onChange={(e) => setCustomHealthStatus(e.target.value)}
                        placeholder="Specify custom clearance status (e.g. Quarantine Cleared, Pre-Breeding Cleared)..."
                        required={healthStatusInput === 'Other'}
                        className={`w-full mt-3 px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                          isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    )}
                  </div>

                  {/* Step 3 Navigation Buttons */}
                  {!viewAllSections && (
                    <div className="flex justify-between pt-3">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white flex items-center space-x-1.5 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Exam</span>
                      </button>
                      <button
                        type="button"
                        disabled={!isPrerequisitesComplete}
                        onClick={() => {
                          if (!isStep1Complete) {
                            setCurrentStep(1);
                            if (onNotify) onNotify('Patient Required (Step 1)', 'Please select an authorized patient animal in Step 1 first.', 'warning');
                            return;
                          }
                          if (!isStep2Complete) {
                            setCurrentStep(2);
                            if (onNotify) onNotify('Observations Required (Step 2)', 'Please enter clinical observations in Step 2 first.', 'warning');
                            return;
                          }
                          if (!isStep3Complete) {
                            if (onNotify) onNotify('Diagnosis Required (Step 3)', 'Please enter a clinical diagnosis and select health clearance in Step 3 before proceeding to Step 4.', 'warning');
                            return;
                          }
                          setCurrentStep(4);
                        }}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all ${
                          isPrerequisitesComplete
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer'
                            : 'bg-slate-800 dark:bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <span>Continue to Treatment & Rx (Step 4)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SECTION 4: SEPARATED PRESCRIPTION INSTRUCTIONS & PHARMACY DEDUCTION */}
            {/* ========================================================================= */}
            {(viewAllSections || currentStep === 4) && (
              <div className={`p-6 rounded-3xl border transition-all ${
                isDarkMode ? 'bg-[#06180F] border-emerald-950/80 shadow-md' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-emerald-950/40 pb-3.5 mb-5">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
                      4
                    </div>
                    <div>
                      <h3 className={`font-extrabold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'} flex items-center space-x-2`}>
                        <span>Treatment Prescription & Pharmacy Stock Deduction</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Separated keeper administration instructions from medical inventory stock deduction.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 🌟 TREATMENT REQUIREMENT MASTER TOGGLE */}
                <div className={`p-4 sm:p-5 rounded-2xl border mb-6 transition-all ${
                  !needsTreatment 
                    ? (isDarkMode ? 'bg-[#041d10] border-emerald-500/40' : 'bg-emerald-50/80 border-emerald-300')
                    : (isDarkMode ? 'bg-[#04120A] border-emerald-900/60' : 'bg-slate-50 border-slate-200')
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Does this reptile require medical treatment or pharmacy supplies?</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Select whether this clinical consultation requires keeper treatment regimens and pharmacy stock deductions.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setNeedsTreatment(false);
                          setDeductFromPharmacy(false);
                          setTreatment('');
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                          !needsTreatment
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40 ring-2 ring-emerald-400/40'
                            : (isDarkMode ? 'bg-[#030e07] text-slate-400 border border-emerald-950/80 hover:text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100')
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>No Treatment Needed (Healthy)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNeedsTreatment(true);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                          needsTreatment
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40 ring-2 ring-emerald-400/40'
                            : (isDarkMode ? 'bg-[#030e07] text-slate-400 border border-emerald-950/80 hover:text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100')
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <span>Prescribe Treatment & Meds</span>
                      </button>
                    </div>
                  </div>

                  {!needsTreatment && (
                    <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-3 animate-fade-in">
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                      <div>
                        <p className="font-bold">Routine Clearance / Healthy Confirmed</p>
                        <p className="text-[11px] text-emerald-400/80 mt-0.5">
                          Animal is in normal health condition. No keeper daily treatment tasks or pharmacy inventory stock deductions will be generated. You can proceed directly to Follow-up & Review (Step 5).
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {needsTreatment && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">

                    {/* ------------------------------------------------------------- */}
                    {/* SUBSECTION 4A: KEEPER PRESCRIPTION & CLINICAL INSTRUCTIONS */}
                    {/* ------------------------------------------------------------- */}
                    <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
                      isDarkMode ? 'bg-[#04120A] border-emerald-900/60' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between border-b border-emerald-950/50 pb-2.5">
                        <div className="flex items-center space-x-2 text-emerald-400">
                          <FileText className="w-4 h-4" />
                          <h4 className="font-extrabold text-xs text-white">
                            4A. Keeper Prescription & Administration Plan
                          </h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          Keeper Directed
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        Specify the care instructions that the Animal Keeper must execute daily for this reptile.
                      </div>

                      {/* Prescription Details Textarea */}
                      <div>
                        <label className="block text-xs font-bold text-slate-200 mb-1.5">
                          Prescription Instructions / Regimen *
                        </label>
                        <textarea
                          rows={3}
                          value={treatment}
                          onChange={(e) => setTreatment(e.target.value)}
                          placeholder="e.g., Apply thin layer of Silver Sulfadiazine to dorsal abrasion; 15-minute lukewarm electrolyte soak prior to ointment application..."
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                            isDarkMode ? 'bg-[#030e07] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        ></textarea>
                      </div>

                      {/* Prescription Parameters (Route, Frequency, Duration) */}
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">Route</label>
                          <select
                            value={rxRoute}
                            onChange={(e) => setRxRoute(e.target.value)}
                            className={`w-full px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold focus:outline-none ${
                              isDarkMode ? 'bg-[#030e07] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            <option value="Topical Ointment">Topical Ointment</option>
                            <option value="Oral / In-Food">Oral / In-Food</option>
                            <option value="Soak / Bath">Soak / Bath</option>
                            <option value="Injectable (SubQ/IM)">Injectable</option>
                            <option value="Environmental">Environmental</option>
                            <option value="Eye / Eye-Drop">Eye Drop</option>
                            <option value="Other">Other</option>
                          </select>
                          {rxRoute === 'Other' && (
                            <input
                              type="text"
                              value={customRxRoute}
                              onChange={(e) => setCustomRxRoute(e.target.value)}
                              placeholder="Specify route..."
                              required={rxRoute === 'Other'}
                              className={`w-full mt-1.5 px-2 py-1 rounded-lg border text-[11px] font-semibold focus:outline-none ${
                                isDarkMode ? 'bg-[#030e07] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            />
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">Frequency</label>
                          <select
                            value={rxFrequency}
                            onChange={(e) => setRxFrequency(e.target.value)}
                            className={`w-full px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold focus:outline-none ${
                              isDarkMode ? 'bg-[#030e07] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            <option value="Once daily">Once daily</option>
                            <option value="Twice daily">Twice daily</option>
                            <option value="Every other day">Every other day</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Single dose">Single dose</option>
                            <option value="As needed (PRN)">As needed</option>
                            <option value="Other">Other</option>
                          </select>
                          {rxFrequency === 'Other' && (
                            <input
                              type="text"
                              value={customRxFrequency}
                              onChange={(e) => setCustomRxFrequency(e.target.value)}
                              placeholder="Specify frequency..."
                              required={rxFrequency === 'Other'}
                              className={`w-full mt-1.5 px-2 py-1 rounded-lg border text-[11px] font-semibold focus:outline-none ${
                                isDarkMode ? 'bg-[#030e07] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            />
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">Duration</label>
                          <select
                            value={rxDuration}
                            onChange={(e) => setRxDuration(e.target.value)}
                            className={`w-full px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold focus:outline-none ${
                              isDarkMode ? 'bg-[#030e07] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            <option value="3 days">3 days</option>
                            <option value="5 days">5 days</option>
                            <option value="7 days">7 days</option>
                            <option value="10 days">10 days</option>
                            <option value="14 days">14 days</option>
                            <option value="Until Follow-up">Until Follow-up</option>
                            <option value="Other">Other</option>
                          </select>
                          {rxDuration === 'Other' && (
                            <input
                              type="text"
                              value={customRxDuration}
                              onChange={(e) => setCustomRxDuration(e.target.value)}
                              placeholder="Specify duration..."
                              required={rxDuration === 'Other'}
                              className={`w-full mt-1.5 px-2 py-1 rounded-lg border text-[11px] font-semibold focus:outline-none ${
                                isDarkMode ? 'bg-[#030e07] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            />
                          )}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/30 text-[10px] text-emerald-300/90 leading-tight">
                        ✨ Entering prescription instructions here automatically schedules a daily task on the Keeper Dashboard so assigned staff can log each treatment.
                      </div>
                    </div>

                    {/* ------------------------------------------------------------- */}
                    {/* SUBSECTION 4B: PHARMACY DISPENSE & INVENTORY DEDUCTION */}
                    {/* ------------------------------------------------------------- */}
                    <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
                      isDarkMode ? 'bg-[#04120A] border-emerald-900/60' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between border-b border-emerald-950/50 pb-2.5">
                        <div className="flex items-center space-x-2 text-emerald-400">
                          <Package className="w-4 h-4" />
                          <h4 className="font-extrabold text-xs text-white">
                            4B. Pharmacy Dispense & Inventory Stock Deduction
                          </h4>
                        </div>

                        {/* Pharmacy Deduction Toggle Switch */}
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={deductFromPharmacy}
                            onChange={(e) => setDeductFromPharmacy(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {deductFromPharmacy 
                          ? 'Select medical supplies from pharmacy inventory to deduct facility stock and audit usage.'
                          : 'Pharmacy deduction is toggled OFF (No inventory stock will be depleted for this consultation).'}
                      </div>

                      {deductFromPharmacy ? (
                        <div className="space-y-3.5 pt-1 animate-fade-in">
                          {/* Select Medicine Item */}
                          <div>
                            <label className="block text-xs font-bold text-slate-200 mb-1">
                              Select Medical Supply / Drug Item *
                            </label>
                            <select
                              value={selectedInventoryItemId}
                              onChange={(e) => setSelectedInventoryItemId(e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                isDarkMode ? 'bg-[#030e07] border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-800'
                              }`}
                              required={deductFromPharmacy}
                            >
                              <option value="">-- Choose item from pharmacy --</option>
                              {medicalInventory.map(item => (
                                <option key={item.id} value={item.id}>
                                  [{item.category}] {item.name} — Current Stock: {item.currentStock} {item.unit}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Bottle / Multi-Dose Tracking Mode */}
                          {selectedInventoryItem && (
                            <div className="space-y-2.5">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                                  Dispense & Deduction Method
                                </label>
                                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDispenseMode('partial_dose');
                                      setInventoryDeductQty(0.1);
                                    }}
                                    className={`px-2 py-1.5 rounded-lg border font-bold text-center cursor-pointer transition-colors ${
                                      dispenseMode === 'partial_dose'
                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                        : 'bg-black/30 border-emerald-950 text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    Partial / Dose
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDispenseMode('dedicated_bottle');
                                      setInventoryDeductQty(1);
                                    }}
                                    className={`px-2 py-1.5 rounded-lg border font-bold text-center cursor-pointer transition-colors ${
                                      dispenseMode === 'dedicated_bottle'
                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                        : 'bg-black/30 border-emerald-950 text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    Dedicated Bottle
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDispenseMode('whole_units');
                                      setInventoryDeductQty(1);
                                    }}
                                    className={`px-2 py-1.5 rounded-lg border font-bold text-center cursor-pointer transition-colors ${
                                      dispenseMode === 'whole_units'
                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                        : 'bg-black/30 border-emerald-950 text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    Whole Units
                                  </button>
                                </div>
                              </div>

                              {/* Multi-Dose Bottle Info Guide */}
                              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-[10px] text-emerald-200/90 space-y-1">
                                <div className="font-bold flex items-center space-x-1 text-emerald-300">
                                  <Info className="w-3.5 h-3.5" />
                                  <span>How Bottle & Liquid Stock Tracking Works:</span>
                                </div>
                                <p className="leading-relaxed">
                                  {dispenseMode === 'partial_dose' 
                                    ? '• Tracks fractional bottle usage (e.g. 0.05 or 0.1 of a 100 mL bottle). Stock decreases incrementally per consult.'
                                    : dispenseMode === 'dedicated_bottle'
                                    ? '• Deducts 1 whole bottle from central inventory and assigns it to this reptile/enclosure for multi-day treatments.'
                                    : '• Deducts standard integer count from inventory stock.'}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Quantity & Stock Calculator */}
                          {selectedInventoryItem && (
                            <div className={`p-3 rounded-xl border space-y-2 ${
                              isDarkMode ? 'bg-[#020b05] border-emerald-800/40' : 'bg-white border-slate-200'
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-300">
                                  {dispenseMode === 'partial_dose' ? 'Fractional Stock to Deduct:' : 'Quantity to Deduct:'}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const step = dispenseMode === 'partial_dose' ? 0.1 : 1;
                                      const minVal = dispenseMode === 'partial_dose' ? 0.05 : 1;
                                      setInventoryDeductQty(Math.max(minVal, Number((inventoryDeductQty - step).toFixed(2))));
                                    }}
                                    className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center justify-center cursor-pointer hover:bg-emerald-900"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <input
                                    type="number"
                                    step={dispenseMode === 'partial_dose' ? '0.05' : '1'}
                                    min="0.01"
                                    max={selectedInventoryItem.currentStock}
                                    value={inventoryDeductQty}
                                    onChange={(e) => setInventoryDeductQty(Math.max(0.01, Number(e.target.value)))}
                                    className="w-20 px-2 py-1 text-center font-mono font-bold text-xs rounded-lg border border-emerald-800 bg-black/40 text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const step = dispenseMode === 'partial_dose' ? 0.1 : 1;
                                      setInventoryDeductQty(Math.min(selectedInventoryItem.currentStock, Number((inventoryDeductQty + step).toFixed(2))));
                                    }}
                                    className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center justify-center cursor-pointer hover:bg-emerald-900"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-[11px] font-bold text-slate-400 font-mono">
                                    {selectedInventoryItem.unit}
                                  </span>
                                </div>
                              </div>

                              {/* Stock preview indicator */}
                              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-emerald-950/60 font-mono">
                                <span className="text-slate-400">Current: {selectedInventoryItem.currentStock} {selectedInventoryItem.unit}</span>
                                <span className="text-emerald-400 font-bold">
                                  Remaining: {Math.max(0, Number((selectedInventoryItem.currentStock - inventoryDeductQty).toFixed(2)))} {selectedInventoryItem.unit}
                                </span>
                              </div>

                              {selectedInventoryItem.currentStock - inventoryDeductQty <= 2 && (
                                <div className="text-[10px] text-amber-400 font-bold flex items-center space-x-1 pt-1">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Warning: Deducting this amount will place item into Low Stock status.</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Optional Pharmacy Notes */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">
                              Pharmacy Batch / Dispense Notes (Optional)
                            </label>
                            <input
                              type="text"
                              value={pharmacyNotes}
                              onChange={(e) => setPharmacyNotes(e.target.value)}
                              placeholder="e.g., Lot #2026-B, Exp: 12/2027, Dispensed 1 bottle to keeper station"
                              className={`w-full px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                                isDarkMode ? 'bg-[#030e07] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-emerald-950 text-center text-xs text-slate-500">
                          Toggle the switch above to deduct medicine from the pharmacy inventory.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 4 Navigation Buttons */}
                {!viewAllSections && (
                  <div className="flex justify-between pt-4 border-t border-emerald-950/40 mt-5">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white flex items-center space-x-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Health Status</span>
                    </button>
                    <button
                      type="button"
                      disabled={!isPrerequisitesComplete}
                      onClick={() => {
                        if (!isStep1Complete) {
                          setCurrentStep(1);
                          if (onNotify) onNotify('Patient Required', 'Please select a patient animal in Step 1 first.', 'warning');
                          return;
                        }
                        if (!isStep2Complete) {
                          setCurrentStep(2);
                          if (onNotify) onNotify('Observations Required', 'Please enter clinical observations in Step 2 first.', 'warning');
                          return;
                        }
                        if (!isStep3Complete) {
                          setCurrentStep(3);
                          if (onNotify) onNotify('Diagnosis Required', 'Please enter a clinical diagnosis in Step 3 first.', 'warning');
                          return;
                        }
                        setCurrentStep(5);
                      }}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all ${
                        isPrerequisitesComplete
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer'
                          : 'bg-slate-800 dark:bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <span>Continue to Follow-up & Review (Step 5)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* SECTION 5: FOLLOW-UP SCHEDULING & CLINICAL VERIFICATION */}
            {/* ========================================================================= */}
            {(viewAllSections || currentStep === 5) && (
              <div className={`p-6 rounded-3xl border transition-all ${
                isDarkMode ? 'bg-[#06180F] border-emerald-950/80 shadow-md' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-emerald-950/40 pb-3.5 mb-5">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
                      5
                    </div>
                    <div>
                      <h3 className={`font-extrabold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'} flex items-center space-x-2`}>
                        <span>Follow-up Scheduling & Consultation Review</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Set follow-up checkup date, time, priority, and submit record to facility database.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Follow-up Scheduling Card with Toggle, Date, Time Selectors */}
                  <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    scheduleFollowup
                      ? (isDarkMode ? 'bg-[#03150C] border-emerald-500/60 ring-1 ring-emerald-500/20' : 'bg-emerald-50/50 border-emerald-300')
                      : (isDarkMode ? 'bg-[#04110A] border-emerald-950/80' : 'bg-slate-50 border-slate-200/80')
                  }`}>
                    {/* Follow-up Toggle Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <Calendar className={`w-5 h-5 ${scheduleFollowup ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <div>
                          <span className={`font-black text-xs ${scheduleFollowup ? 'text-emerald-300' : 'text-slate-200'}`}>
                            Schedule Follow-up Clinical Consultation / Recheck
                          </span>
                          <p className="text-[10px] text-slate-400">
                            {scheduleFollowup ? 'Follow-up is enabled — set date, time, and priority below' : 'Toggle ON to recommend a re-examination visit'}
                          </p>
                        </div>
                      </div>

                      {/* The Follow-up Toggle Switch */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={scheduleFollowup}
                          onChange={(e) => setScheduleFollowup(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {/* Follow-up Date and Time Selectors */}
                    {scheduleFollowup && (
                      <div className="space-y-4 pt-4 border-t border-emerald-900/40 mt-4 animate-fade-in">
                        {/* Quick Date Buttons */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                            Quick Date Presets:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setQuickDateOffset(3)}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 hover:bg-emerald-800/60 cursor-pointer"
                            >
                              +3 Days (Urgent Recheck)
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuickDateOffset(7)}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 hover:bg-emerald-800/60 cursor-pointer"
                            >
                              +1 Week (Standard)
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuickDateOffset(14)}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 hover:bg-emerald-800/60 cursor-pointer"
                            >
                              +2 Weeks (Post-Rx)
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuickDateOffset(30)}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 hover:bg-emerald-800/60 cursor-pointer"
                            >
                              +1 Month (Monthly Review)
                            </button>
                          </div>
                        </div>

                        {/* Date Selector, Time Selector, Priority Selector */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Date Selector */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center space-x-1">
                              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Follow-up Date *</span>
                            </label>
                            <input
                              type="date"
                              min={systemDate || new Date().toISOString().split('T')[0]}
                              value={nextCheckup}
                              onChange={(e) => setNextCheckup(e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono ${
                                isDarkMode ? 'bg-[#06180F] border-emerald-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                              }`}
                              required={scheduleFollowup}
                            />
                          </div>

                          {/* Time Selector */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Consultation Time *</span>
                            </label>
                            <select
                              value={followupTime}
                              onChange={(e) => setFollowupTime(e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                isDarkMode ? 'bg-[#06180F] border-emerald-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            >
                              <option value="08:30 AM">08:30 AM (Early Rounds)</option>
                              <option value="09:00 AM">09:00 AM (Morning Clinic)</option>
                              <option value="09:30 AM">09:30 AM (Standard Clinic)</option>
                              <option value="10:00 AM">10:00 AM</option>
                              <option value="11:00 AM">11:00 AM</option>
                              <option value="01:30 PM">01:30 PM (Afternoon Clinic)</option>
                              <option value="02:30 PM">02:30 PM</option>
                              <option value="03:30 PM">03:30 PM</option>
                              <option value="04:30 PM">04:30 PM (Late Check)</option>
                            </select>
                          </div>

                          {/* Priority Selector */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center space-x-1">
                              <Activity className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Priority Level</span>
                            </label>
                            <select
                              value={followupPriority}
                              onChange={(e) => setFollowupPriority(e.target.value as any)}
                              className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                isDarkMode ? 'bg-[#06180F] border-emerald-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            >
                              <option value="Normal">Normal Priority</option>
                              <option value="High">High Priority</option>
                              <option value="Emergency">Emergency Priority</option>
                            </select>
                          </div>
                        </div>

                        {/* Follow-up Consultation Type selector */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-emerald-950/20 dark:border-emerald-950/40">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center space-x-1">
                              <ClipboardList className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Follow-up Consultation Type *</span>
                            </label>
                            <select
                              value={followupRecordType}
                              onChange={(e) => setFollowupRecordType(e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                isDarkMode ? 'bg-[#06180F] border-emerald-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            >
                              <option value="Follow-up Checkup">Follow-up Checkup</option>
                              <option value="Treatment">Treatment Session</option>
                              <option value="Medical Examination">Medical Examination</option>
                              <option value="Surgery">Surgery / Procedure</option>
                              <option value="Quarantine Inspection">Quarantine Inspection</option>
                              <option value="Lab Result">Lab Work & Diagnostics</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="flex flex-col justify-end">
                            {followupRecordType === 'Other' && (
                              <>
                                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                  Specify Custom Type *
                                </label>
                                <input
                                  type="text"
                                  value={customFollowupRecordType}
                                  onChange={(e) => setCustomFollowupRecordType(e.target.value)}
                                  placeholder="e.g. Parasitology Recheck, Eye Rinse, etc."
                                  required={followupRecordType === 'Other'}
                                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none ${
                                    isDarkMode ? 'bg-[#06180F] border-emerald-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                                  }`}
                                />
                              </>
                            )}
                          </div>
                        </div>

                        {/* Follow-up Notes */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Follow-up Goals / Specific Instructions
                          </label>
                          <input
                            type="text"
                            value={followupNotes}
                            onChange={(e) => setFollowupNotes(e.target.value)}
                            placeholder="e.g., Suture removal, re-weighing, evaluate scale regrowth, verify appetite response..."
                            className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none ${
                              isDarkMode ? 'bg-[#06180F] border-emerald-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          />
                        </div>

                        <div className={`p-2.5 rounded-xl border text-[10px] flex items-center space-x-2 ${
                          isDarkMode ? 'bg-amber-950/20 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}>
                          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                          <span><strong>Administrative Approval Workflow:</strong> Scheduling a follow-up automatically routes this checkup to the Administrator appointment dashboard for final room & keeper confirmation.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary Review Card */}
                  <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-950/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <h4 className="font-extrabold text-xs text-white flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Consultation Summary Checklist</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>• <strong>Patient:</strong> {selectedPatient ? `${selectedPatient.name || selectedPatient.id} (${selectedPatient.id})` : '<Not Selected>'}</div>
                      <div>• <strong>Health Clearance:</strong> <span className="text-emerald-400 font-bold">{healthStatusInput === 'Other' ? (customHealthStatus || 'Other') : healthStatusInput}</span></div>
                      <div>• <strong>Consultation Type:</strong> {recordType === 'Other' ? (customRecordType || 'Other Consult') : recordType}</div>
                      <div>• <strong>Diagnosis:</strong> {clinicalDiagnosis || (recordType === 'Other' ? customRecordType : recordType) || 'Clinical Evaluation'}</div>
                      <div>• <strong>Prescription:</strong> {treatment ? `${treatment} (${rxRoute === 'Other' ? customRxRoute : rxRoute}, ${rxFrequency === 'Other' ? customRxFrequency : rxFrequency})` : 'None'}</div>
                      <div>• <strong>Pharmacy Deduction:</strong> {deductFromPharmacy ? `${inventoryDeductQty} ${selectedInventoryItem?.unit || 'units'} (${selectedInventoryItem?.name || 'Selected Item'})` : 'None'}</div>
                      <div>• <strong>Follow-up:</strong> {scheduleFollowup && nextCheckup ? `${nextCheckup} @ ${followupTime}` : 'None'}</div>
                    </div>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="pt-4 border-t border-emerald-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                    {!viewAllSections && (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(4)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white flex items-center space-x-1.5 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Treatment & Rx</span>
                      </button>
                    )}

                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                      <button
                        type="submit"
                        disabled={!isPrerequisitesComplete}
                        className={`w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg ${
                          isPrerequisitesComplete
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 cursor-pointer'
                            : 'bg-slate-800 dark:bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Consultation & Save Record</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </form>
        </div>
      )}

      {/* 2. HISTORICAL MEDICAL RECORDS TAB */}
      {activeSubTab === 'records' && (
        <div className="space-y-4">
          {/* Filter and Search */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center gap-3 transition-colors ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950/60' : 'bg-white border-slate-100 shadow-2xs'
          }`}>
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search historical consults by reptile name, ID, symptoms, diagnosis..."
                className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none ${
                  isDarkMode ? 'bg-[#04110A] border-emerald-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="All">All Types ({medicalRecords.length})</option>
                {standardRecordTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Records Timeline List */}
          {filteredRecords.length === 0 ? (
            <div className={`p-10 rounded-3xl border text-center transition-colors ${
              isDarkMode ? 'bg-[#06180F] border-emerald-950/60' : 'bg-white border-slate-200'
            }`}>
              <ClipboardList className={`w-10 h-10 mx-auto mb-2 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} />
              <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>No medical records match the filter.</p>
              <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Use the Consult Station tab to conduct a new examination.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map(rec => {
                const animal = animals.find(a => a.id === rec.animalId);
                return (
                  <div
                    key={rec.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isDarkMode ? 'bg-[#06180F] border-emerald-950/80 hover:border-emerald-800/80' : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 mb-3 ${
                      isDarkMode ? 'border-emerald-950/40' : 'border-slate-100'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 border flex items-center justify-center ${
                          isDarkMode ? 'bg-slate-900 border-emerald-800/40' : 'bg-slate-100 border-slate-200'
                        }`}>
                          {animal?.image ? (
                            <img
                              src={animal.image}
                              alt={animal.name || animal.id}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-0.5">
                              <Camera className="w-3.5 h-3.5 text-emerald-500/80" />
                              <span className="text-[6px] font-bold uppercase tracking-wider text-slate-400">No Photo</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`font-extrabold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {animal?.name || 'Unnamed Reptile'}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                              isDarkMode ? 'text-emerald-400 bg-emerald-950 border-emerald-800/30' : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                            }`}>
                              {rec.animalId}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isDarkMode ? 'bg-emerald-950/60 border-emerald-700/40 text-emerald-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}>
                              {rec.recordType}
                            </span>
                          </div>
                          <p className={`text-[11px] mt-0.5 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {rec.purpose || 'Veterinary Consultation'}
                          </p>
                        </div>
                      </div>

                      <div className={`flex items-center space-x-3 text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span className="flex items-center space-x-1">
                          <Calendar className={`w-3.5 h-3.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                          <span>{rec.recordDate}</span>
                        </span>
                        <span>• Dr. {rec.veterinarian || 'Veterinarian'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className={`p-3 rounded-xl border ${
                        isDarkMode ? 'bg-[#04110A] border-emerald-950/80' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Clinical Observations:
                        </span>
                        <p className={`text-[11px] whitespace-pre-wrap leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                          {rec.clinicalObservation || 'No specific notes recorded.'}
                        </p>
                      </div>

                      <div className={`p-3 rounded-xl border ${
                        isDarkMode ? 'bg-[#04110A] border-emerald-950/80' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Prescribed Treatment / Regimen:
                          </span>
                          {rec.nextCheckup && (
                            <span className={`text-[10px] font-mono font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                              Recheck: {rec.nextCheckup}
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] whitespace-pre-wrap leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                          {rec.treatment || 'None prescribed.'}
                        </p>
                        {rec.diagnosis && (
                          <div className={`mt-2 pt-2 border-t text-[10px] ${isDarkMode ? 'border-emerald-950/40 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                            <strong>Diagnosis:</strong> {rec.diagnosis}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Consult Confirmation Modal */}
      {showConfirmConsultModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl animate-in zoom-in-95 duration-150 ${
            isDarkMode ? 'bg-[#06180F] border-emerald-950 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold">Complete Consultation?</h3>
                <p className="text-xs text-slate-400">Confirm and Complete Session</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to save this clinical consultation? 
              <br />
              <br />
              Saving this record will automatically mark the corresponding appointment as <strong className="text-emerald-400">Completed</strong> and record the medical session logs.
            </p>

            <div className="flex justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmConsultModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmConsultModal(false);
                  executeConsultSubmit();
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Yes, Complete & Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
