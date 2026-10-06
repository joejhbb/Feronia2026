/**
 * Feronia Wildlife Facility Management Information System
 * Official Firebase Firestore & Persistence Client Service
 * 
 * Connected to Firebase Firestore Database (ai-studio-feronia-51fae982-f114-4b70-bee1-14a94a853688)
 */

import { StaffMember } from '../types';
import {
  firestoreSave,
  firestoreDelete,
  firestoreFetch,
  firestoreGet as rawFirestoreGet,
  firestoreSubscribe,
  testFirestoreConnection,
  checkFirestoreQuotaExhausted
} from './firebaseClient';
import {
  getSupabaseClient,
  supabaseUpsert,
  supabaseDelete,
  supabaseFetch,
  supabaseClearTable,
  supabaseSubscribe,
  supabaseGet,
  testSupabaseConnection,
  getSupabaseConfig
} from './supabaseClient';

export { testFirestoreConnection };

export async function testDatabaseConnection(): Promise<{ success: boolean; message: string }> {
  const { url, anonKey } = getSupabaseConfig();
  if (url && anonKey) {
    const res = await testSupabaseConnection();
    if (res.success) {
      return res;
    }
  }
  return await testFirestoreConnection();
}

export async function clearAllSupabaseTables(): Promise<void> {
  const collections = [
    'animals',
    'enclosures',
    'tasks',
    'medical_records',
    'appointments',
    'breeding_records',
    'breeding_assessments',
    'inventory',
    'transfers',
    'staff_members',
    'statutory_reports',
    'facility_reports',
    'species_schedule_templates'
  ];
  try {
    await Promise.all(collections.map(c => clearCollection(c)));
  } catch (err) {
    console.warn('[Database] Clear collections notice:', err);
  }
}

/**
 * Save or persist a record directly - Supabase as PRIMARY
 */
export async function saveRecord<T extends { id: string }>(
  collectionName: string,
  item: T
): Promise<boolean> {
  // 1. Supabase PRIMARY save
  try {
    const supabaseClient = getSupabaseClient();
    if (supabaseClient) {
      const res = await supabaseUpsert(collectionName, item);
      return !!res.success;
    }
  } catch (err) {
    console.warn(`[Supabase-Primary] Upsert warning on ${collectionName}:`, err);
  }

  // 2. Dual-persist to Firestore backup ONLY if Supabase is unavailable and quota is not exhausted
  if (!checkFirestoreQuotaExhausted()) {
    try {
      await firestoreSave(collectionName, item);
    } catch {}
  }

  return true;
}

/**
 * Archive / Soft-delete a record - Supabase as PRIMARY
 */
export async function archiveRecord<T extends { id: string }>(
  collectionName: string,
  id: string,
  archiveReason?: string
): Promise<boolean> {
  const patch = {
    id,
    isArchived: true,
    is_archived: true,
    archiveReason: archiveReason || 'Archived in Database',
    archiveDate: new Date().toISOString().split('T')[0]
  };

  // 1. Supabase PRIMARY
  try {
    const supabaseClient = getSupabaseClient();
    if (supabaseClient) {
      await supabaseUpsert(collectionName, patch);
      return true;
    }
  } catch (err) {
    console.warn(`[Supabase-Primary] Archive warning on ${collectionName}:`, err);
  }

  // 2. Firestore backup ONLY if Supabase is unavailable
  if (!checkFirestoreQuotaExhausted()) {
    try {
      await firestoreSave(collectionName, patch as any);
    } catch {}
  }

  return true;
}

/**
 * Delete a record from Supabase PRIMARY and Firestore
 */
export async function deleteRecord(
  collectionName: string,
  id: string,
  _forceHardDelete = false
): Promise<boolean> {
  // 1. Supabase PRIMARY
  try {
    const supabaseClient = getSupabaseClient();
    if (supabaseClient) {
      await supabaseDelete(collectionName, id);
      return true;
    }
  } catch (err) {
    console.warn(`[Supabase-Primary] Delete error for ${collectionName}/${id}:`, err);
  }

  // 2. Firestore fallback if Supabase is unavailable
  if (!checkFirestoreQuotaExhausted()) {
    return await firestoreDelete(collectionName, id);
  }
  return true;
}

/**
 * Clear all records for a collection in Supabase and Firestore
 */
export async function clearCollection(collectionName: string): Promise<boolean> {
  try {
    const supabaseClient = getSupabaseClient();
    if (supabaseClient) {
      await supabaseClearTable(collectionName);
      return true;
    }
  } catch {}

  if (!checkFirestoreQuotaExhausted()) {
    try {
      const items = await firestoreFetch<any>(collectionName);
      await Promise.all(items.map(item => firestoreDelete(collectionName, item.id)));
      return true;
    } catch (err) {
      console.error(`[Firestore] Error clearing collection ${collectionName}:`, err);
      return false;
    }
  }
  return true;
}

/**
 * Push all active local records directly into Supabase and Firestore
 */
export async function syncAllDataToDatabase(payload: {
  animals?: any[];
  enclosures?: any[];
  tasks?: any[];
  medicalRecords?: any[];
  appointments?: any[];
  breedingRecords?: any[];
  breedingAssessments?: any[];
  inventory?: any[];
  transfers?: any[];
  staffMembers?: any[];
  statutoryReports?: any[];
  facilityReports?: any[];
  speciesScheduleTemplates?: any[];
}): Promise<void> {
  try {
    const promises: Promise<any>[] = [];

    if (Array.isArray(payload.animals) && payload.animals.length > 0) {
      payload.animals.forEach(item => promises.push(saveRecord('animals', item)));
    }
    if (Array.isArray(payload.enclosures) && payload.enclosures.length > 0) {
      payload.enclosures.forEach(item => promises.push(saveRecord('enclosures', item)));
    }
    if (Array.isArray(payload.tasks) && payload.tasks.length > 0) {
      payload.tasks.forEach(item => promises.push(saveRecord('tasks', item)));
    }
    if (Array.isArray(payload.medicalRecords) && payload.medicalRecords.length > 0) {
      payload.medicalRecords.forEach(item => promises.push(saveRecord('medical_records', item)));
    }
    if (Array.isArray(payload.appointments) && payload.appointments.length > 0) {
      payload.appointments.forEach(item => promises.push(saveRecord('appointments', item)));
    }
    if (Array.isArray(payload.breedingRecords) && payload.breedingRecords.length > 0) {
      payload.breedingRecords.forEach(item => promises.push(saveRecord('breeding_records', item)));
    }
    if (Array.isArray(payload.breedingAssessments) && payload.breedingAssessments.length > 0) {
      payload.breedingAssessments.forEach(item => promises.push(saveRecord('breeding_assessments', item)));
    }
    if (Array.isArray(payload.inventory) && payload.inventory.length > 0) {
      payload.inventory.forEach(item => promises.push(saveRecord('inventory', item)));
    }
    if (Array.isArray(payload.transfers) && payload.transfers.length > 0) {
      payload.transfers.forEach(item => promises.push(saveRecord('transfers', item)));
    }
    if (Array.isArray(payload.staffMembers) && payload.staffMembers.length > 0) {
      payload.staffMembers.forEach(item => promises.push(saveRecord('staff_members', item)));
    }
    if (Array.isArray(payload.statutoryReports) && payload.statutoryReports.length > 0) {
      payload.statutoryReports.forEach(item => promises.push(saveRecord('statutory_reports', item)));
    }
    if (Array.isArray(payload.facilityReports) && payload.facilityReports.length > 0) {
      payload.facilityReports.forEach(item => promises.push(saveRecord('facility_reports', item)));
    }
    if (Array.isArray(payload.speciesScheduleTemplates) && payload.speciesScheduleTemplates.length > 0) {
      payload.speciesScheduleTemplates.forEach(item => promises.push(saveRecord('species_schedule_templates', item)));
    }

    await Promise.all(promises);
  } catch (err) {
    console.error('Error syncing data to database:', err);
  }
}

/**
 * Fetch records for a collection - Supabase as PRIMARY, Firestore as fallback
 */
export async function fetchRecords<T>(collectionName: string): Promise<T[]> {
  // 1. Supabase PRIMARY
  try {
    const supabaseClient = getSupabaseClient();
    if (supabaseClient) {
      const supabaseItems = await supabaseFetch<T>(collectionName);
      if (supabaseItems && supabaseItems.length > 0) {
        return supabaseItems;
      }
    }
  } catch (err) {
    console.warn(`[Supabase-Primary] Fetch error for ${collectionName}:`, err);
  }

  // 2. Firestore fallback
  try {
    const firestoreItems = await firestoreFetch<T>(collectionName);
    if (firestoreItems && firestoreItems.length > 0) {
      return firestoreItems;
    }
  } catch (err) {
    console.warn(`[Firestore] Fetch warning for ${collectionName}:`, err);
  }

  return [];
}

/**
 * Real-time data subscription - Supabase PRIMARY, Firestore fallback
 */
export function subscribeToData<T>(
  collectionName: string,
  callback: (data: T[]) => void
): () => void {
  const supabaseClient = getSupabaseClient();
  if (supabaseClient) {
    return supabaseSubscribe<T>(collectionName, callback);
  }
  return firestoreSubscribe<T>(collectionName, callback);
}

/**
 * Fetch a single record by ID - Supabase PRIMARY, Firestore fallback
 */
export async function getDatabaseRecord<T = any>(tableName: string, id: string): Promise<T | null> {
  const supabaseClient = getSupabaseClient();
  if (supabaseClient) {
    try {
      const data = await supabaseGet<T>(tableName, id);
      if (data) return data;
    } catch {}
  }
  return await rawFirestoreGet<T>(tableName, id);
}

export const firestoreGet = getDatabaseRecord;

/**
 * Staff management helpers
 */
export async function saveStaffMember(member: StaffMember): Promise<boolean> {
  return await saveRecord('staff_members', member);
}

export async function deleteStaffMember(id: string): Promise<boolean> {
  return await deleteRecord('staff_members', id, true);
}

export function subscribeToStaff(callback: (staff: StaffMember[]) => void): () => void {
  return subscribeToData<StaffMember>('staff_members', callback);
}

export async function fetchStaffMembers(): Promise<StaffMember[]> {
  return await fetchRecords<StaffMember>('staff_members');
}

export async function deleteAllStaffMembers(): Promise<void> {
  await clearCollection('staff_members');
}

/**
 * Statutory Reports database helpers
 */
export async function saveStatutoryReport(report: { id: string; [key: string]: any }): Promise<boolean> {
  return await saveRecord('statutory_reports', report);
}

export async function fetchStatutoryReports<T = any>(): Promise<T[]> {
  return await fetchRecords<T>('statutory_reports');
}

export async function fetchStatutoryReport<T = any>(id: string): Promise<T | null> {
  return await getDatabaseRecord<T>('statutory_reports', id);
}

/**
 * Facility Reports database helpers
 */
export async function saveFacilityReport(report: { id: string; [key: string]: any }): Promise<boolean> {
  return await saveRecord('facility_reports', report);
}

export async function fetchFacilityReports<T = any>(): Promise<T[]> {
  return await fetchRecords<T>('facility_reports');
}

export async function deleteFacilityReport(id: string): Promise<boolean> {
  return await deleteRecord('facility_reports', id, true);
}

/**
 * Aliases for seamless backwards compatibility
 */
export const saveToDatabase = saveRecord;
export const deleteFromDatabase = deleteRecord;
export const archiveInDatabase = archiveRecord;
export const subscribeToDatabase = subscribeToData;
export const saveToFirestore = saveRecord;
export const deleteFromFirestore = deleteRecord;
export const archiveInFirestore = archiveRecord;
export const subscribeToCollection = subscribeToData;
