import { Animal, Enclosure, Task, MedicalRecord, Appointment, BreedingRecord, BreedingAssessment, InventoryItem, StaffMember } from './types';

export const DEMO_ANIMALS: Animal[] = [];
export const INITIAL_ANIMALS: Animal[] = [];

export const DEMO_ENCLOSURES: Enclosure[] = [];
export const INITIAL_ENCLOSURES: Enclosure[] = [];

export const DEMO_TASKS: Task[] = [];

export const INITIAL_TASKS: Task[] = [];

export const DEMO_MEDICAL_RECORDS: MedicalRecord[] = [];

export const INITIAL_MEDICAL_RECORDS: MedicalRecord[] = [];

export const DEMO_APPOINTMENTS: Appointment[] = [];

export const INITIAL_APPOINTMENTS: Appointment[] = [];

export const INITIAL_BREEDING_RECORDS: BreedingRecord[] = [];

export const INITIAL_BREEDING_ASSESSMENTS: BreedingAssessment[] = [];

export const INITIAL_INVENTORY: InventoryItem[] = [];

export const DEMO_STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'STF-ADM-001',
    name: 'Justin Admin',
    email: 'justunme0423@gmail.com',
    phone: '+63 919 345 6789',
    role: 'admin',
    status: 'Active',
    assignedFacilities: ['Main Facility', 'All Sectors'],
    assignedAnimalIds: []
  }
];

export const INITIAL_STAFF_MEMBERS: StaffMember[] = [];

/**
 * Generates a collision-proof, strictly unique staff ID (e.g. STF-2026-001, STF-2026-002, etc.)
 * by inspecting existing members, localStorage active staff, and archived/deleted staff.
 */
export function generateUniqueStaffId(existingStaff: StaffMember[] = []): string {
  const allSaved = (() => {
    try {
      const s = typeof window !== 'undefined' ? localStorage.getItem('feronia_staff_members') : null;
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  })();

  const allDeleted = (() => {
    try {
      const s = typeof window !== 'undefined' ? localStorage.getItem('feronia_deleted_staff_v1') : null;
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  })();

  const allStaff: any[] = [
    ...(Array.isArray(existingStaff) ? existingStaff : []),
    ...(Array.isArray(allSaved) ? allSaved : []),
    ...(Array.isArray(allDeleted) ? allDeleted : [])
  ];

  const existingIds = new Set<string>();
  const numericIds: number[] = [];

  allStaff.forEach(s => {
    if (!s || !s.id) return;
    existingIds.add(s.id);
    const match = s.id.match(/\d+$/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (!isNaN(num)) numericIds.push(num);
    }
  });

  let nextNum = numericIds.length > 0 ? Math.max(...numericIds) + 1 : (allStaff.length > 0 ? allStaff.length + 1 : 1);
  let candidateId = `STF-2026-${String(nextNum).padStart(3, '0')}`;

  while (existingIds.has(candidateId)) {
    nextNum++;
    candidateId = `STF-2026-${String(nextNum).padStart(3, '0')}`;
  }

  return candidateId;
}

