export interface KeeperLogEntry {
  id: string;
  animalId: string;
  date: string; // YYYY-MM-DD
  time?: string;
  keeperName: string;
  logType: 'Medicine Administration' | 'Clinical Checkup' | 'Feeding Log' | 'General Care' | 'Observation' | 'Other';
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  clinicalObservation?: string;
  prescribedTreatment?: string;
  medicineName?: string;
  dosage?: string;
  administrationStatus?: 'Full Dosage Administered' | 'Partial Dosage Administered' | 'Refused' | 'Topical Application' | 'Completed';
  inventoryItemId?: string;
  deductedQuantity?: number;
  notes?: string;
  createdAt?: string;
}

export interface Animal {
  id: string;
  name?: string;
  species: string;
  otherSpecies?: string;
  scientificName?: string;
  morph: string;
  sex: 'Male' | 'Female';
  dob: string;
  dateAcquired: string;
  source: string;
  weight: number; // in grams
  length: number; // in cm
  healthStatus: 'Healthy' | 'Under Treatment' | 'Under Observation' | 'Injured' | 'Sick' | 'Require Vet' | 'Pending Checkup' | 'Unassessed' | 'Other' | string;
  breedingStatus: 'Ready for Pairing' | 'Resting' | 'In Progress' | 'Successful' | 'Require Vet' | 'Underweight' | 'Pending Assessment' | 'Unassessed' | 'Not Eligible';
  enclosureId?: string;
  image?: string;
  imageUrl?: string;
  photoUrl?: string;
  notes?: string;
  keeperLogs?: KeeperLogEntry[];
  isArchived?: boolean;
  archiveReason?: string;
  archiveDate?: string;
  archiveCategory?: 'Mortality' | 'Transferred' | 'Deleted' | 'Others';
  archiveNotes?: string;
  mortalityCause?: string;
  assignedKeeperId?: string;
  assignedKeeperName?: string;
}

export function getAnimalArchiveCategory(animal: Animal): 'Mortality' | 'Transferred' | 'Deleted' | 'Others' {
  if (animal.archiveCategory) return animal.archiveCategory;
  const reason = (animal.archiveReason || '').toLowerCase();
  if (reason.includes('mortal') || reason.includes('decease') || reason.includes('died') || reason.includes('death') || reason.includes('dead') || reason.includes('namatay')) {
    return 'Mortality';
  }
  if (reason.includes('transfer') || reason.includes('sold') || reason.includes('release') || reason.includes('donat') || reason.includes('rehome')) {
    return 'Transferred';
  }
  if (reason.includes('delete') || reason.includes('mistake') || reason.includes('duplicate') || reason.includes('test') || reason.includes('remove')) {
    return 'Deleted';
  }
  return 'Others';
}

export interface EnclosureClimateProfile {
  isActive: boolean;
  status: 'Inactive' | 'Pending Setup' | 'Pending Approval' | 'Approved' | 'Rejected';
  dayTemp?: number;
  nightTemp?: number;
  photoperiodHours?: number;
  humidity?: number;
  mode?: string;
  configuredByKeeper?: string;
  configuredAt?: string;
  approvedByAdmin?: string;
  approvedAt?: string;
  notes?: string;
  targetAnimalId?: string;
  targetAnimalName?: string;
  targetSpecies?: string;
  coolingDurationWeeks?: string;
  coolingTempRange?: string;
  requestedAt?: string;
  requestedBy?: string;
}

export interface Enclosure {
  id: string;
  name: string;
  type: string;
  facility: string;
  capacity: string; // e.g. "1 / 1"
  status: 'Occupied' | 'Available';
  condition: 'Good' | 'Needs Attention' | 'Out of Service' | 'Under Maintenance' | string;
  temperature?: string;
  humidity?: string;
  image?: string;
  notes?: string;
  assignedDate?: string;
  climateProfile?: EnclosureClimateProfile;
}

export interface Task {
  id: string;
  animalId: string;
  type: 'Feeding' | 'Cleaning' | 'Water Change' | 'Health Check' | 'Observation' | 'Care' | string;
  title: string;
  time: string;
  date: string;
  details: string;
  frequency: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
  assignedBy?: 'Admin' | 'Veterinarian' | string;
  assignedByName?: string;
  assignedKeeperId?: string;
  assignedKeeperName?: string;
  createdAt?: string;
  completedBy?: string;
  completedAt?: string;
  notes?: string;
  photoUrl?: string;
  enclosureId?: string;
}

export interface SpeciesScheduleTemplate {
  id: string;
  species: string;
  cleanSpecies: string;
  ageStage: 'Hatchling / Baby' | 'Juvenile / Sub-Adult' | 'Adult' | 'All Ages' | string;
  title: string;
  scheduleType: 'both' | 'feeding' | 'care';
  foodItemName: string;
  feedingMethod: string;
  feedingFreq: string;
  feedingQuantity: string;
  feedingTime?: string;
  feedingNotes: string;
  careTaskName: string;
  careFreq: string;
  careTime?: string;
  careNotes: string;
  careSupplyItemId?: string;
  careSupplyQty?: number | string;
  careSupplyUnit?: string;
  assignedKeeperId?: string;
  assignedKeeperName?: string;
  createdAt: string;
  createdBy?: string;
  isDefaultForSpeciesAge?: boolean;
}

export function getTaskAssignedBy(task: Task): 'Admin' | 'Veterinarian' {
  if (!task) return 'Admin';
  if (task.assignedBy) {
    const lower = String(task.assignedBy).toLowerCase();
    if (lower.includes('vet')) return 'Veterinarian';
    return 'Admin';
  }
  const taskIdLower = (task.id || '').toLowerCase();
  const taskTitleLower = (task.title || '').toLowerCase();
  if (
    taskIdLower.includes('vet') || 
    task.type === 'Health Check' || 
    (task.type as string) === 'Medical' || 
    taskTitleLower.includes('treatment') || 
    taskTitleLower.includes('medication') || 
    taskTitleLower.includes('prescribed')
  ) {
    return 'Veterinarian';
  }
  return 'Admin';
}

export function getTaskComputedStatus(task: Task, currentSystemDate?: string): 'Pending' | 'Completed' | 'Overdue' {
  if (task.status === 'Completed') return 'Completed';
  if (task.status === 'Overdue') return 'Overdue';
  if (task.date && currentSystemDate && task.date < currentSystemDate) {
    return 'Overdue';
  }
  return 'Pending';
}

export interface MedicalRecord {
  id: string;
  animalId: string;
  appointmentId?: string;
  recordType: string; // "Routine Check-up" | "Treatment" | "Surgery" | "Previous Vet Record" | "Lab Result"
  recordDate: string;
  purpose: string;
  clinicalObservation: string;
  diagnosis: string;
  treatment: string;
  nextCheckup?: string;
  notes?: string;
  veterinarian: string;
  status: 'Active' | 'Document' | 'Archived';
  attachments?: Array<{ name: string; size: string }>;
}

export interface Appointment {
  id: string;
  animalId: string;
  type: string; // "Routine Check-up" | "Follow-up" | "Medical Examination" | "Treatment Session"
  veterinarian: string;
  requestedBy: string; // e.g. "Eleanor Vance (Admin)" | "Dr. Vicente (Veterinarian)" | "Jason Lee (Keeper)"
  requestedByRole?: 'keeper' | 'vet' | 'admin';
  requestedById?: string;
  requestedByEmail?: string;
  date: string;
  time: string;
  purpose: string;
  status: 'Pending Approval' | 'Approved' | 'Pending' | 'Ongoing' | 'Completed' | 'Cancelled' | 'Declined' | 'Reschedule Requested';
  priority: 'Normal' | 'High' | 'Emergency';
  createdOn: string;
  adminNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  declineReason?: string;
  declineNotes?: string;
  declinedBy?: string;
  declinedAt?: string;
  rescheduleReason?: string;
  rescheduleNotes?: string;
  proposedDate?: string;
  proposedTime?: string;
  rescheduledBy?: 'admin' | 'vet' | 'keeper';
  rescheduledByName?: string;
  rescheduledAt?: string;
}

export function getAppointmentRequesterInfo(
  apt: Appointment,
  staffList?: StaffMember[]
): {
  role: 'vet' | 'keeper' | 'admin';
  name: string;
  email?: string;
  roleLabel: string;
  badgeColor: string;
  badgeIcon: string;
  iconType: 'vet' | 'keeper' | 'admin';
} {
  let role: 'vet' | 'keeper' | 'admin' = apt.requestedByRole || 'admin';
  let matchedStaff: StaffMember | undefined;

  // 1. Try to match registered staff
  if (staffList && staffList.length > 0) {
    matchedStaff = staffList.find(s => 
      (apt.requestedById && s.id === apt.requestedById) ||
      (apt.requestedByEmail && (s.email || '').toLowerCase() === apt.requestedByEmail.toLowerCase()) ||
      (apt.requestedBy && (s.name || '').toLowerCase() === apt.requestedBy.replace(/\s*\([^)]*\)/, '').trim().toLowerCase())
    );
    // Only inherit role from staff if apt.requestedByRole was not explicitly set
    if (matchedStaff && !apt.requestedByRole) {
      role = matchedStaff.role;
    }
  }

  // 2. If no role explicitly set and no matched staff, deduce from ID and text
  if (!apt.requestedByRole) {
    const rawReq = (apt.requestedBy || '').toLowerCase();
    const aptId = (apt.id || '').toUpperCase();
    const rawPurpose = (apt.purpose || '').toLowerCase();

    if (aptId.startsWith('APT-VET') || aptId.startsWith('APP-') || rawReq.includes('vet') || rawReq.includes('vicente') || rawReq.includes('dr.') || rawReq.includes('doctor')) {
      role = 'vet';
    } else if (aptId.startsWith('APT-REQ-KEEPER') || aptId.startsWith('APT-KP') || rawReq.includes('keeper') || rawReq.includes('jason') || rawPurpose.includes('keeper request')) {
      role = 'keeper';
    } else if (aptId.startsWith('APT-ADM') || rawReq.includes('admin') || rawReq.includes('eleanor') || rawReq.includes('vance') || rawReq.includes('reyes') || rawReq.includes('maria') || rawReq.includes('facility')) {
      role = 'admin';
    } else if (apt.type?.toLowerCase().includes('observation')) {
      role = 'keeper';
    } else {
      role = 'admin';
    }
  }

  let cleanName = matchedStaff?.name;
  if (!cleanName && apt.requestedBy) {
    const raw = apt.requestedBy.replace(/\s*\([^)]*\)/, '').trim();
    if (role === 'vet' && (raw.toLowerCase().includes('vicente') || raw.toLowerCase().includes('doctor') || raw.toLowerCase().includes('vet'))) {
      cleanName = staffList?.find(s => s.role === 'vet' && s.status !== 'Inactive')?.name || 'Attending Veterinarian';
    } else if (role === 'admin' && (raw.toLowerCase().includes('vance') || raw.toLowerCase().includes('eleanor') || raw.toLowerCase().includes('facility admin'))) {
      cleanName = staffList?.find(s => s.role === 'admin')?.name || 'Facility Admin';
    } else if (role === 'keeper' && (raw.toLowerCase().includes('jason') || raw.toLowerCase().includes('lee'))) {
      cleanName = staffList?.find(s => s.role === 'keeper' && s.status !== 'Inactive')?.name || 'Assigned Keeper';
    } else {
      cleanName = raw;
    }
  }
  if (!cleanName) {
    cleanName = role === 'admin'
      ? (staffList?.find(s => s.role === 'admin')?.name || 'Facility Admin')
      : role === 'vet'
      ? (staffList?.find(s => s.role === 'vet' && s.status !== 'Inactive')?.name || 'Attending Veterinarian')
      : (staffList?.find(s => s.role === 'keeper' && s.status !== 'Inactive')?.name || 'Assigned Keeper');
  }

  return {
    role,
    name: cleanName,
    email: matchedStaff?.email || apt.requestedByEmail,
    roleLabel: role === 'vet' ? 'Veterinarian' : role === 'keeper' ? 'Keeper' : 'Facility Admin',
    badgeColor: role === 'vet' ? 'cyan' : role === 'keeper' ? 'amber' : 'emerald',
    badgeIcon: role === 'vet' ? '🩺' : role === 'keeper' ? '👁️' : '🛡️',
    iconType: role
  };
}

/**
 * Resolves the display name of a veterinarian against registered facility staff.
 * Replaces hardcoded mock names (e.g. 'Dr. Vicente') with the actual active veterinarian (e.g. 'hannnah').
 */
export function resolveVeterinarianName(vetName?: string, staffList?: StaffMember[]): string {
  const registeredVets = (staffList || []).filter(s => {
    const role = (s.role || '').toLowerCase();
    const name = (s.name || '').toLowerCase();
    return (role === 'vet' || role.includes('veterinarian') || role.includes('doctor') || name.startsWith('dr.')) && s.status !== 'Inactive';
  });

  if (vetName && vetName.trim().length > 0) {
    const clean = vetName.replace(/\s*\([^)]*\)/, '').trim();
    const matched = registeredVets.find(v => v.name.toLowerCase() === clean.toLowerCase() || clean.toLowerCase().includes(v.name.toLowerCase()));
    if (matched) return matched.name;
    
    // If it's a legacy mock name, map to the active veterinarian
    if (clean.toLowerCase().includes('vicente') || clean.toLowerCase().includes('santos') || clean.toLowerCase().includes('cruz') || clean.toLowerCase().includes('elena') || clean.toLowerCase().includes('ramos')) {
      if (registeredVets.length > 0) return registeredVets[0].name;
      return 'Attending Veterinarian';
    }
    return clean;
  }

  if (registeredVets.length > 0) return registeredVets[0].name;
  return 'Attending Veterinarian';
}

/**
 * Resolves the display name of an administrator against registered facility staff.
 */
export function resolveAdminName(adminName?: string, staffList?: StaffMember[]): string {
  const admins = (staffList || []).filter(s => s.role === 'admin');
  if (admins.length > 0) {
    if (adminName) {
      const clean = adminName.replace(/\s*\([^)]*\)/, '').trim();
      const matched = admins.find(a => a.name.toLowerCase() === clean.toLowerCase() || clean.toLowerCase().includes(a.name.toLowerCase()));
      if (matched) return matched.name;
      if (clean.toLowerCase().includes('eleanor') || clean.toLowerCase().includes('vance') || clean.toLowerCase().includes('facility admin')) {
        return admins[0].name;
      }
      return clean;
    }
    return admins[0].name;
  }
  return adminName?.replace(/\s*\([^)]*\)/, '').trim() || 'Facility Admin';
}

/**
 * Resolves the display name of a keeper against registered facility staff.
 */
export function resolveKeeperName(keeperName?: string, staffList?: StaffMember[]): string {
  const keepers = (staffList || []).filter(s => s.role === 'keeper' && s.status !== 'Inactive');
  if (keepers.length > 0) {
    if (keeperName) {
      const clean = keeperName.replace(/\s*\([^)]*\)/, '').trim();
      const matched = keepers.find(k => k.name.toLowerCase() === clean.toLowerCase() || clean.toLowerCase().includes(k.name.toLowerCase()));
      if (matched) return matched.name;
      if (clean.toLowerCase().includes('jason') || clean.toLowerCase().includes('lee') || clean.toLowerCase().includes('primary keeper')) {
        return keepers[0].name;
      }
      return clean;
    }
    return keepers[0].name;
  }
  return keeperName?.replace(/\s*\([^)]*\)/, '').trim() || 'Assigned Keeper';
}

export type BreedingLifecycleStatus =
  | 'PAIRED'
  | 'IN PROGRESS'
  | 'POSSIBLE MATED'
  | 'LIKELY MATED'
  | 'CLUTCH RECORDED'
  | 'INCUBATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SUCCESSFUL';

export interface BreedingObservationLog {
  id: string;
  date: string;
  timestamp?: string;
  keeperName: string;
  type: 'Behavior' | 'Interaction' | 'Aggression' | 'Courtship' | 'Female Indicators' | 'Clutch' | 'Candling' | 'Hatch' | 'General';
  notes: string;
  indicators?: {
    weightIncreaseGrams?: number;
    nestingBehavior?: boolean;
    restlessness?: boolean;
    lossOfAppetite?: boolean;
    tailFlagging?: boolean;
    swellingObserved?: boolean;
    aggressionLevel?: 'None' | 'Mild' | 'Moderate' | 'Severe';
    otherObserved?: boolean;
    otherNotes?: string;
  };
  suggestedNextStatus?: BreedingLifecycleStatus;
}

export interface BreedingStatusTransitionHistory {
  id: string;
  fromStatus: BreedingLifecycleStatus;
  toStatus: BreedingLifecycleStatus;
  changedAt: string;
  changedBy: string;
  reason?: string;
  isOverride?: boolean;
}

export interface BreedingRecord {
  id: string;
  femaleId: string;
  maleId: string;
  femaleName?: string;
  maleName?: string;
  femaleImage?: string;
  maleImage?: string;
  species?: string;
  breedingType: string; // "Natural Mating" | "Artificial Insemination"
  breedingDate: string; // Date pair was established
  startedBreedingDate?: string; // Date moved to IN PROGRESS
  possibleMatedDate?: string;
  likelyMatedDate?: string;
  clutchDate?: string;
  clutchSize?: number;
  fertileEggs?: number;
  infertileEggs?: number;
  incubationTemp?: string;
  incubationHumidity?: string;
  incubatorUnit?: string;
  hatchDate?: string;
  hatchlings?: number;
  unhatchedEggs?: number;
  hatchRate?: number; // e.g. 88.9%
  status: BreedingLifecycleStatus;
  notes?: string;
  observationLogs?: BreedingObservationLog[];
  statusHistory?: BreedingStatusTransitionHistory[];
  failureReason?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface BreedingAssessment {
  id: string;
  animalId?: string;
  partnerId?: string;
  pairId?: string; // e.g. "BD-F-001 x BD-M-004"
  femaleId?: string;
  maleId?: string;
  femaleName?: string;
  maleName?: string;
  femaleImage?: string;
  maleImage?: string;
  species?: string;
  scientificName?: string;
  speciesCode?: string;
  assessmentDate: string;
  assessmentTime?: string;
  status: 'ELIGIBLE' | 'REVIEW' | 'NOT ELIGIBLE';
  resultTitle?: string;
  resultSubtitle?: string;
  compatibilityScore?: number;
  readinessScore?: number;
  benchmarks?: {
    weightGrams?: number;
    ageMonths?: number;
    healthCleared?: boolean;
    quarantineCleared?: boolean;
    seasonalCycleMatched?: boolean;
  };
  femaleAgeMonths?: number;
  femaleWeight?: number;
  maleAgeMonths?: number;
  maleWeight?: number;
  agePassed?: boolean;
  weightPassed?: boolean;
  healthPassed?: boolean;
  seasonPassed?: boolean;
  coolingPassed?: boolean;
  cooldownPassed?: boolean;
  failureReasons?: string[];
  warnings?: string[];
  recommendations?: string[];
  gestationPreLay?: string;
  avgClutchSize?: string;
  incubationTemp?: string;
  incubationHumidity?: string;
  incubationPeriod?: string;
  postLayRest?: string;
  notes?: string;
  assessedBy?: string;
  createdAt?: string;
}

export interface TransferRecord {
  id: string;
  animalId: string;
  transferType: 'To New Owner' | 'To Another Facility' | 'To Different Enclosure' | 'Local Sale' | 'Export / International' | 'Donation / Rehoming' | 'Breeding Loan' | string;
  transferDate: string;
  oldOwner: string;
  newOwnerName: string;
  newOwnerContact: string;
  newOwnerEmail?: string;
  newOwnerAddress: string;
  governmentIdType: string;
  governmentIdNumber: string;
  additionalNotes?: string;
  status: 'Pending' | 'Completed' | 'Ready for Approval';
  documents: string[]; // names of uploaded documents
  referenceNo: string;
  createdBy: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Feeding' | 'Supplement' | 'Cleaning' | 'Medical' | 'Others';
  unit: string;
  currentStock: number;
  maxStock: number;
  usedToday: number;
  lastUsed: string;
  status: 'Good' | 'Low Stock' | 'Out of Stock';
  expirationDate?: string; // YYYY-MM-DD or readable string
  image?: string;
  supplier?: string;
  location?: string;
  costPerUnit?: number;
}

export interface DeletedInventoryItem extends InventoryItem {
  deletedAt: string;
  deletedBy?: string;
  deletionReason?: string;
  previousStock?: number;
}

export interface InventoryNotification {
  id: string;
  itemId: string;
  itemName: string;
  action: 'updated' | 'restocked' | 'added' | 'deleted' | 'status_changed';
  title: string;
  message: string;
  updatedBy: string;
  timestamp: string;
  read: boolean;
  category?: string;
  unit?: string;
  previousStock?: number;
  newStock?: number;
  newStatus?: string;
}

export type Role = 'guest' | 'admin' | 'vet' | 'keeper';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'vet' | 'keeper';
  password?: string;
  mustChangePassword?: boolean;
  createdAt?: string;
  dutyLoad?: string;
  initials?: string;
  assignedAnimalIds?: string[];
  status?: 'Active' | 'Inactive';
  assignedFacilities?: string[];
  assignedEnclosureIds?: string[];
}

export interface DeletedStaffMember extends StaffMember {
  deletedAt: string;
  deletedBy?: string;
  deletionReason?: string;
  previousAssignedAnimalsCount?: number;
  previousAssignedAnimalNames?: string[];
}

export interface DeletedEnclosure extends Enclosure {
  deletedAt: string;
  deletedBy?: string;
  deletionReason?: string;
  previousOccupancy?: number;
}

export interface DeletedTask extends Task {
  deletedAt: string;
  deletedBy?: string;
  deletionReason?: string;
}

export interface DeletedMedicalRecord extends MedicalRecord {
  deletedAt: string;
  deletedBy?: string;
  deletionReason?: string;
}

export interface DeletedBreedingRecord extends BreedingRecord {
  deletedAt: string;
  deletedBy?: string;
  deletionReason?: string;
}

export interface DeletedAppointment extends Appointment {
  deletedAt: string;
  deletedBy?: string;
  deletionReason?: string;
}

export interface KeeperReport {
  id: string;
  type: 'daily_task_accomplishment' | 'inventory_usage';
  title: string;
  reportDate: string;
  shift?: 'Morning' | 'Afternoon' | 'Evening' | 'Full Day';
  keeperName: string;
  keeperEmail?: string;
  createdAt: string;
  status: 'Submitted' | 'Draft';
  
  // Daily Task Accomplishment fields
  taskMetrics?: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completionRate: number;
  };
  tasksIncluded?: Array<{
    id: string;
    title: string;
    type: string;
    animalId?: string;
    animalName?: string;
    enclosureId?: string;
    completedAt?: string;
    status: string;
    notes?: string;
  }>;
  generalObservations?: string;
  handoverNotes?: string;
  veterinaryAlerts?: string;
  enclosureIssues?: string;

  // Inventory Report fields
  inventoryFocus?: 'Supplies Consumption' | 'Daily Supplies Consumption' | 'Low Stock & Restock Alert' | 'Discrepancy / Damaged Stock' | 'Full Supply Audit';
  inventoryItemsLogged?: Array<{
    itemId: string;
    name: string;
    category: string;
    quantityUsed: number;
    unit: string;
    currentStock: number;
    status: string;
    notes?: string;
  }>;
  urgentRestockNeeded?: Array<{
    name: string;
    unit: string;
    quantityRequested: number;
    priority: 'Normal' | 'Urgent' | 'Critical';
    reason: string;
  }>;
  discrepancyNotes?: string;
  notes?: string;
}
