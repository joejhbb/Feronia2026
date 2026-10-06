import { useState, useEffect } from 'react';
import {
  INITIAL_ANIMALS,
  INITIAL_ENCLOSURES,
  INITIAL_TASKS,
  INITIAL_MEDICAL_RECORDS,
  INITIAL_APPOINTMENTS,
  INITIAL_BREEDING_RECORDS,
  INITIAL_BREEDING_ASSESSMENTS,
  INITIAL_INVENTORY,
  DEMO_ANIMALS,
  DEMO_ENCLOSURES,
  DEMO_TASKS,
  DEMO_MEDICAL_RECORDS,
  DEMO_APPOINTMENTS,
  DEMO_STAFF_MEMBERS
} from './data';
import { Animal, Enclosure, Task, MedicalRecord, Appointment, BreedingRecord, BreedingAssessment, TransferRecord, InventoryItem, DeletedInventoryItem, DeletedEnclosure, DeletedTask, DeletedMedicalRecord, DeletedBreedingRecord, DeletedAppointment, Role, InventoryNotification, getTaskAssignedBy, StaffMember } from './types';
import { isBreedingRecordActive } from './utils/breedingStateMachine';
import { getRecommendedFeedingAndCare, syncSpeciesScheduleTemplatesFromDb, SpeciesScheduleTemplate } from './utils/careUtils';
import { calculatePreciseAge, getEffectiveSystemDate } from './utils/timeUtils';
import { computeStockStatus } from './utils/inventory';
import { 
  saveRecord, 
  deleteRecord, 
  subscribeToData,
  saveToFirestore,
  deleteFromFirestore,
  subscribeToCollection,
  clearAllSupabaseTables,
  fetchRecords,
  testDatabaseConnection
} from './lib/dbClient';
import { getSupabaseConfig, testSupabaseConnection, supabaseFetch } from './lib/supabaseClient';
import { resolveEnclosureFromScan } from './utils/qrUtils';

import LaunchPage from './components/LaunchPage';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import VetDashboard from './components/VetDashboard';
import KeeperDashboard from './components/KeeperDashboard';
import EnclosureInspectionModal from './components/common/EnclosureInspectionModal';

const INITIAL_INVENTORY_NOTIFICATIONS: InventoryNotification[] = [];

// Helper to strip heavy base64 strings if payload is large before saving to localStorage
const stripHeavyDataUrls = (val: string): string => {
  if (val.length < 30000) return val;
  try {
    const parsed = JSON.parse(val);
    const cleanHeavy = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(cleanHeavy);
      }
      if (obj && typeof obj === 'object') {
        const copy: any = { ...obj };
        for (const k of Object.keys(copy)) {
          if (typeof copy[k] === 'string' && copy[k].startsWith('data:image/') && copy[k].length > 1000) {
            // Drop oversized data URL from localStorage cache
            copy[k] = '';
          } else if (typeof copy[k] === 'object') {
            copy[k] = cleanHeavy(copy[k]);
          }
        }
        return copy;
      }
      return obj;
    };
    return JSON.stringify(cleanHeavy(parsed));
  } catch {
    return val;
  }
};

const safeSetItem = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch (error: any) {
    const isQuota =
      error?.name === 'QuotaExceededError' ||
      error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error?.code === 22 ||
      error?.code === 1014 ||
      error?.message?.toLowerCase().includes('quota') ||
      error?.message?.toLowerCase().includes('exceeded');

    if (isQuota) {
      try {
        // Step 1: Remove obsolete/legacy version keys and deleted lists
        const obsoleteKeys = [
          'feronia_deleted_inventory_v1',
          'feronia_deleted_enclosures_v1',
          'feronia_deleted_staff_v1',
          'feronia_deleted_tasks_v1',
          'feronia_deleted_medical_records_v1',
          'feronia_deleted_breeding_records_v1',
          'feronia_deleted_appointments_v1',
          'feronia_breeding_assessments_v1',
          'feronia_breeding_assessments_v2',
          'feronia_breeding_assessments_v3',
          'feronia_breeding_records_v1',
          'feronia_breeding_records_v2',
          'feronia_breeding_records_v3',
          'feronia_inventory_v1',
          'feronia_inventory_v2'
        ];
        obsoleteKeys.forEach(k => {
          try { window.localStorage.removeItem(k); } catch {}
        });

        // Step 2: Try saving directly after cleaning
        window.localStorage.setItem(key, value);
        return;
      } catch {
        // Step 3: Strip heavy base64 data URLs from the cache payload and retry
        try {
          const stripped = stripHeavyDataUrls(value);
          window.localStorage.setItem(key, stripped);
          return;
        } catch {
          // Graceful fallback: state remains fully active in React state & Firestore/Supabase
        }
      }
    }
  }
};

export default function App() {
  const [currentView, setCurrentView] = useState<'launch' | 'login' | Role>(() => {
    const savedRole = localStorage.getItem('feronia_current_role');
    if (savedRole === 'admin' || savedRole === 'vet' || savedRole === 'keeper') {
      return savedRole as Role;
    }
    return 'launch';
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('feronia_dark_mode');
    return savedTheme ? savedTheme === 'true' : true;
  });

  // Helper to get active set of deleted enclosure IDs from localStorage and state
  const getDeletedEnclosureIds = (): Set<string> => {
    const ids = new Set<string>();
    try {
      const saved = localStorage.getItem('feronia_deleted_enclosures_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((d: any) => { if (d && d.id) ids.add(d.id); });
        }
      }
    } catch {}
    return ids;
  };

  // Sync state with data fetched from Supabase
  const handleSupabaseDataSynced = (pulledData: any) => {
    if (!pulledData) return;
    if (Array.isArray(pulledData.animals) && pulledData.animals.length > 0) {
      setAnimals(pulledData.animals);
      safeSetItem('feronia_animals', JSON.stringify(pulledData.animals));
    }
    if (Array.isArray(pulledData.enclosures)) {
      const deletedIds = getDeletedEnclosureIds();
      const activeEnclosures = pulledData.enclosures.filter((e: any) => e && e.id && !deletedIds.has(e.id));
      setEnclosures(activeEnclosures);
      safeSetItem('feronia_enclosures', JSON.stringify(activeEnclosures));
    }
    if (Array.isArray(pulledData.tasks) && pulledData.tasks.length > 0) {
      setTasks(pulledData.tasks);
      safeSetItem('feronia_tasks', JSON.stringify(pulledData.tasks));
    }
    if (Array.isArray(pulledData.inventory) && pulledData.inventory.length > 0) {
      setInventory(pulledData.inventory);
      safeSetItem('feronia_inventory_v3', JSON.stringify(pulledData.inventory));
    }
    if (Array.isArray(pulledData.medicalRecords) && pulledData.medicalRecords.length > 0) {
      setMedicalRecords(pulledData.medicalRecords);
      safeSetItem('feronia_medical_records', JSON.stringify(pulledData.medicalRecords));
    }
    if (Array.isArray(pulledData.appointments) && pulledData.appointments.length > 0) {
      setAppointments(pulledData.appointments);
      safeSetItem('feronia_appointments', JSON.stringify(pulledData.appointments));
    }
    if (Array.isArray(pulledData.breedingRecords) && pulledData.breedingRecords.length > 0) {
      setBreedingRecords(pulledData.breedingRecords);
      safeSetItem('feronia_breeding_records_v4', JSON.stringify(pulledData.breedingRecords));
    }
    if (Array.isArray(pulledData.breedingAssessments) && pulledData.breedingAssessments.length > 0) {
      setBreedingAssessments(pulledData.breedingAssessments);
      safeSetItem('feronia_breeding_assessments_v4', JSON.stringify(pulledData.breedingAssessments));
    }
    if (Array.isArray(pulledData.transfers) && pulledData.transfers.length > 0) {
      setTransfers(pulledData.transfers);
      safeSetItem('feronia_transfers', JSON.stringify(pulledData.transfers));
    }
  };

  // Background database sync on mount (merges remote database records into local state without overwriting new items)
  useEffect(() => {
    const timer = setTimeout(() => {
      testDatabaseConnection().then(res => {
        if (res.success) {
          console.log('[Database] Connected to database:', res.message);
        }
      });

      Promise.all([
        fetchRecords<Animal>('animals'),
        fetchRecords<Enclosure>('enclosures'),
        fetchRecords<Task>('tasks'),
        fetchRecords<InventoryItem>('inventory'),
        fetchRecords<MedicalRecord>('medical_records'),
        fetchRecords<Appointment>('appointments'),
        fetchRecords<BreedingRecord>('breeding_records'),
        fetchRecords<BreedingAssessment>('breeding_assessments'),
        fetchRecords<TransferRecord>('transfers'),
        fetchRecords<StaffMember>('staff_members')
      ]).then(([dbAnimals, dbEnclosures, dbTasks, dbInventory, dbMed, dbApts, dbBreed, dbAssess, dbTransfers, dbStaff]) => {
        if (Array.isArray(dbAnimals) && dbAnimals.length > 0) {
          setAnimals(prev => {
            const map = new Map<string, Animal>();
            prev.forEach(a => map.set(a.id, a));
            dbAnimals.forEach(a => {
              if (!map.has(a.id)) map.set(a.id, a);
            });
            const merged = Array.from(map.values());
            safeSetItem('feronia_animals', JSON.stringify(merged));
            return merged;
          });
        }
        if (Array.isArray(dbEnclosures)) {
          const deletedIds = getDeletedEnclosureIds();
          setEnclosures(prev => {
            const map = new Map<string, Enclosure>();
            prev.forEach(e => {
              if (e && e.id && !deletedIds.has(e.id)) map.set(e.id, e);
            });
            dbEnclosures.forEach(e => {
              if (e && e.id && !deletedIds.has(e.id) && !map.has(e.id)) {
                map.set(e.id, e);
              }
            });
            const merged = Array.from(map.values());
            safeSetItem('feronia_enclosures', JSON.stringify(merged));
            return merged;
          });
        }
        if (Array.isArray(dbTasks) && dbTasks.length > 0) {
          setTasks(prev => {
            const seen = new Set<string>();
            const merged: Task[] = [];
            [...prev, ...dbTasks].forEach(t => {
              if (!t || !t.id || t.id === 'null' || !t.animalId || t.animalId === 'null') return;
              let title = (t.title || '').trim();
              if (title.includes(' - ') && (title.match(/ - /g) || []).length > 1) {
                const parts = title.split(' - ');
                title = parts[0] + ' - ' + parts[1];
                t.title = title;
              }
              const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
              const key = `${t.animalId}_${normTitle}_${t.frequency || 'Daily'}`;
              if (!seen.has(key)) {
                seen.add(key);
                merged.push(t);
              }
            });
            safeSetItem('feronia_tasks', JSON.stringify(merged));
            return merged;
          });
        }
        if (Array.isArray(dbInventory) && dbInventory.length > 0) {
          setInventory(prev => {
            const map = new Map<string, InventoryItem>();
            prev.forEach(i => map.set(i.id, i));
            dbInventory.forEach(i => {
              if (!map.has(i.id)) map.set(i.id, i);
            });
            const merged = Array.from(map.values());
            safeSetItem('feronia_inventory_v3', JSON.stringify(merged));
            return merged;
          });
        }
        if (Array.isArray(dbMed) && dbMed.length > 0) {
          setMedicalRecords(prev => {
            const map = new Map<string, MedicalRecord>();
            prev.forEach(m => map.set(m.id, m));
            dbMed.forEach(m => {
              if (!map.has(m.id)) map.set(m.id, m);
            });
            const merged = Array.from(map.values());
            safeSetItem('feronia_medical_records', JSON.stringify(merged));
            return merged;
          });
        }
        if (Array.isArray(dbApts) && dbApts.length > 0) {
          setAppointments(prev => {
            const map = new Map<string, Appointment>();
            prev.forEach(a => map.set(a.id, a));
            dbApts.forEach(a => {
              if (!map.has(a.id)) map.set(a.id, a);
            });
            const merged = Array.from(map.values());
            safeSetItem('feronia_appointments', JSON.stringify(merged));
            return merged;
          });
        }
        if (Array.isArray(dbBreed) && dbBreed.length > 0) {
          setBreedingRecords(prev => {
            const map = new Map<string, BreedingRecord>();
            prev.forEach(b => map.set(b.id, b));
            dbBreed.forEach(b => {
              if (!map.has(b.id)) map.set(b.id, b);
            });
            const merged = Array.from(map.values());
            safeSetItem('feronia_breeding_records_v4', JSON.stringify(merged));
            return merged;
          });
        }
        if (Array.isArray(dbAssess) && dbAssess.length > 0) {
          setBreedingAssessments(prev => {
            const map = new Map<string, BreedingAssessment>();
            prev.forEach(a => map.set(a.id, a));
            dbAssess.forEach(a => {
              if (!map.has(a.id)) map.set(a.id, a);
            });
            const merged = Array.from(map.values());
            safeSetItem('feronia_breeding_assessments_v4', JSON.stringify(merged));
            return merged;
          });
        }
        if (Array.isArray(dbTransfers) && dbTransfers.length > 0) {
          setTransfers(prev => {
            const map = new Map<string, TransferRecord>();
            prev.forEach(t => map.set(t.id, t));
            dbTransfers.forEach(t => {
              if (!map.has(t.id)) map.set(t.id, t);
            });
            const merged = Array.from(map.values());
            safeSetItem('feronia_transfers', JSON.stringify(merged));
            return merged;
          });
        }
        const savedStaff = localStorage.getItem('feronia_staff_members');
        let currentLocalStaff: StaffMember[] = [];
        if (savedStaff) {
          try { currentLocalStaff = JSON.parse(savedStaff); } catch {}
        }
        const adminStaff: StaffMember = currentLocalStaff.find(s => s.role === 'admin' || s.id === 'STF-ADM-001') || {
          id: 'STF-ADM-001',
          name: 'Justin Admin',
          email: 'justunme0423@gmail.com',
          role: 'admin',
          status: 'Active',
          assignedFacilities: ['Main Facility', 'All Sectors'],
          dutyLoad: 'Facility Management & Operations',
          phone: '+63 919 345 6789',
          assignedAnimalIds: []
        };

        if (Array.isArray(dbStaff)) {
          try {
            const map = new Map<string, StaffMember>();
            if (Array.isArray(currentLocalStaff)) {
              currentLocalStaff.forEach(s => { if (s && s.id) map.set(s.id, s); });
            }
            dbStaff.forEach(s => {
              if (s && s.id && !map.has(s.id)) {
                map.set(s.id, s);
              }
            });
            if (!map.has('STF-ADM-001')) {
              map.set('STF-ADM-001', adminStaff);
            }
            const merged = Array.from(map.values());
            safeSetItem('feronia_staff_members', JSON.stringify(merged));
            setStaffMembers(merged);

            // Ensure Admin is stored in database if not found in dbStaff
            const dbHasAdmin = dbStaff.some(s => s.role === 'admin' || s.id === 'STF-ADM-001' || s.email === 'justunme0423@gmail.com');
            if (!dbHasAdmin) {
              saveRecord('staff_members', adminStaff).catch(() => {});
            }
          } catch {}
        } else {
          saveRecord('staff_members', adminStaff).catch(() => {});
        }
      }).catch(err => console.warn('Database fetch on mount notice:', err));
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (isDarkMode) {
      root.classList.add('dark');
      if (body) {
        body.classList.add('dark');
      }
    } else {
      root.classList.remove('dark');
      if (body) {
        body.classList.remove('dark');
      }
    }
    safeSetItem('feronia_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  // Helper to sanitize test tokens and auto-appended keeper log blocks from animal.notes
  const sanitizeAnimalNotes = (notes?: string) => {
    if (!notes) return '';
    return notes
      .replace(/\[Keeper(?:'s)? (?:Medical )?Log [\s\S]*?(?=\n\[Keeper|$)/gi, '')
      .replace(/\[Keeper(?:'s)? Log[\s\S]*?(?=\n\[Keeper|$)/gi, '')
      .replace(/\bEYYY\b/gi, '')
      .trim();
  };

  const sanitizeKeeperLogs = (logs?: any[]) => {
    if (!Array.isArray(logs)) return [];
    return logs.filter(log => {
      const text = `${log.notes || ''} ${log.prescribedTreatment || ''} ${log.medicationSupply || ''} ${log.keeperName || ''}`.toLowerCase();
      if (text.includes('worms') && text.includes('feed bearded dragon')) return false;
      if (log.id && String(log.id).startsWith('DEMO-')) return false;
      return true;
    });
  };

  // State initialization with localStorage synchronization
  const [animals, setAnimals] = useState<Animal[]>(() => {
    const saved = localStorage.getItem('feronia_animals');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((a: Animal) => ({
            ...a,
            breedingStatus: a.breedingStatus || 'Pending Assessment',
            notes: sanitizeAnimalNotes(a.notes),
            keeperLogs: sanitizeKeeperLogs(Array.isArray(a.keeperLogs) ? a.keeperLogs : [])
          }));
        }
      } catch {}
    }
    return [];
  });

  // Ensure any cached legacy test tokens and auto-appended note log strings are sanitized on load
  useEffect(() => {
    setAnimals(prev => {
      let needsCleaning = false;
      const cleaned = prev.map(a => {
        let modified = { ...a };
        const sanitized = sanitizeAnimalNotes(a.notes);
        if (sanitized !== (a.notes || '')) {
          needsCleaning = true;
          modified.notes = sanitized;
        }
        const cleanedLogs = sanitizeKeeperLogs(modified.keeperLogs);
        if (cleanedLogs.length !== (modified.keeperLogs || []).length) {
          needsCleaning = true;
          modified.keeperLogs = cleanedLogs;
        }
        if (!Array.isArray(modified.keeperLogs)) {
          modified.keeperLogs = [];
        }
        return modified;
      });
      if (needsCleaning) {
        safeSetItem('feronia_animals', JSON.stringify(cleaned));
        return cleaned;
      }
      return prev;
    });
  }, []);

  const [facilities, setFacilities] = useState<string[]>(() => {
    const saved = localStorage.getItem('feronia_facilities');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((f: string) => f !== 'Reptile Lounge 1');
        }
      } catch {}
    }
    return [];
  });

  const [enclosures, setEnclosures] = useState<Enclosure[]>(() => {
    const saved = localStorage.getItem('feronia_enclosures');
    if (saved !== null) {
      try {
        const parsed: Enclosure[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {}
    }
    return [];
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('feronia_tasks');
    if (saved !== null) {
      try {
        const parsed: Task[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          const deduped: Task[] = [];
          for (const t of parsed) {
            if (!t || !t.id || t.id === 'null' || !t.animalId || t.animalId === 'null' || t.animalId === 'undefined' || t.animalId === 'GENERAL' || t.animalId === 'Animal') continue;
            let title = (t.title || '').trim();
            if (title.includes(' - ') && (title.match(/ - /g) || []).length > 1) {
              const parts = title.split(' - ');
              title = parts[0] + ' - ' + parts[1];
              t.title = title;
            }
            const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
            const key = `${t.animalId}_${normTitle}_${t.frequency || 'Daily'}`;
            if (seen.has(key)) continue;
            seen.add(key);
            deduped.push(t);
          }
          safeSetItem('feronia_tasks', JSON.stringify(deduped));
          return deduped;
        }
      } catch {}
    }
    return [];
  });

  // Purge corrupted null/generic tasks and duplicate clones
  useEffect(() => {
    setTasks(prev => {
      let changed = false;
      const seen = new Set<string>();
      const validTasks: Task[] = [];

      for (const t of prev) {
        if (!t || !t.id || t.id === 'null' || t.id.startsWith('at-incomplete-animal-') || !t.animalId || t.animalId === 'null' || t.animalId === 'undefined' || t.animalId === 'GENERAL' || t.animalId === 'Animal' || t.title === 'null' || t.title?.includes('null Task') || t.title?.includes('null: null') || t.title?.includes('Daily Care Task: Animal') || t.title === 'Daily Care Task: Animal') {
          changed = true;
          continue;
        }

        let title = (t.title || '').trim();
        if (title.includes(' - ') && (title.match(/ - /g) || []).length > 1) {
          const parts = title.split(' - ');
          title = parts[0] + ' - ' + parts[1];
          t.title = title;
          changed = true;
        }

        const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
        const key = `${t.animalId}_${normTitle}_${t.frequency || 'Daily'}`;
        if (seen.has(key)) {
          changed = true;
          continue;
        }

        seen.add(key);
        validTasks.push(t);
      }

      if (changed || validTasks.length !== prev.length) {
        safeSetItem('feronia_tasks', JSON.stringify(validTasks));
        return validTasks;
      }
      return prev;
    });
  }, []);

  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>(() => {
    const saved = localStorage.getItem('feronia_medical_records');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('feronia_appointments');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((a: Appointment) => {
            if (a.id === 'APT-2026-KP-002' || a.id === 'APT-2026-ADM-001' || a.id === 'APT-2026-004' || a.id === 'APT-2026-001' || a.id === 'APT-2026-002' || a.id === 'APT-2026-003') return false;
            if (a.purpose?.toLowerCase().includes('refusing prey item, mild wheezing & mucus bubbles')) return false;
            return true;
          }).map((a: Appointment) => {
            if (a.adminNotes?.includes('Examination completed by Veterinarian.')) {
              return {
                ...a,
                status: 'Completed' as const
              };
            }
            // Admin consultation requests stay Pending until approved by the attending Veterinarian
            const isAdmin = a.requestedByRole === 'admin' || a.requestedBy?.toLowerCase().includes('admin') || a.id?.startsWith('APT-ADM-');
            if (isAdmin && a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'Declined' && (!a.approvedBy || a.approvedBy.includes('Admin') || a.approvedBy.includes('Reyes'))) {
              return {
                ...a,
                status: 'Pending' as const,
                approvedBy: undefined,
                approvedAt: undefined,
                adminNotes: a.adminNotes || 'Waiting for Veterinarian confirmation and acceptance in Vet Portal.'
              };
            }
            return a;
          });
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  const [scannedUrlEnclosure, setScannedUrlEnclosure] = useState<Enclosure | null>(null);

  // Detect ?enclosure=E-01 or #enclosure=E-01 from URL parameters (e.g. when user scans with external phone camera app)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const encIdFromQuery = searchParams.get('enclosure') || searchParams.get('enc');
    
    if (encIdFromQuery && enclosures.length > 0) {
      const match = resolveEnclosureFromScan(encIdFromQuery, enclosures);
      if (match) {
        setScannedUrlEnclosure(match);
      }
    }
  }, [enclosures]);

  const [breedingRecords, setBreedingRecords] = useState<BreedingRecord[]>(() => {
    const saved = localStorage.getItem('feronia_breeding_records_v4') || localStorage.getItem('feronia_breeding_records_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sampleIds = new Set(['BR-2026-001', 'BR-2026-002', 'BR-2026-003', 'BR-2026-004']);
          const userRecords = parsed.filter((r: BreedingRecord) => {
            if (sampleIds.has(r.id)) return false;
            // Filter out default demo BP records if they have no match
            const fem = (r.femaleId || '').toLowerCase();
            const mal = (r.maleId || '').toLowerCase();
            if ((fem === 'bp-21' && mal === 'bp-22') || (fem === 'bp-22' && mal === 'bp-21')) return false;
            return true;
          }).map((r: BreedingRecord) => {
            // Heal legacy 2025 or outdated pairing dates (like 119 days) for active records
            const updated = { ...r };
            const isActive = updated.status === 'IN PROGRESS' || updated.status === 'PAIRED' || updated.status === 'POSSIBLE MATED' || updated.status === 'LIKELY MATED';
            if (isActive) {
              const bDate = new Date(updated.breedingDate);
              const now = new Date();
              const diffDays = !isNaN(bDate.getTime()) ? Math.floor((now.getTime() - bDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
              // If pairing date is older than 21 days (e.g. 119 days old stale data) or legacy 2025, heal to recent active pairing date
              if (diffDays > 21 || updated.breedingDate?.startsWith('2025') || updated.breedingDate === '2025-05-18') {
                const recent = new Date();
                recent.setDate(recent.getDate() - 5);
                updated.breedingDate = recent.toISOString().split('T')[0];
                if (updated.startedBreedingDate) {
                  updated.startedBreedingDate = updated.breedingDate;
                }
              }
              if (updated.clutchDate && (updated.clutchDate.startsWith('2025') || updated.clutchDate === '2025-05-18')) {
                const recentClutch = new Date();
                recentClutch.setDate(recentClutch.getDate() - 14);
                updated.clutchDate = recentClutch.toISOString().split('T')[0];
                const estHatch = new Date(recentClutch);
                estHatch.setDate(estHatch.getDate() + 60);
                updated.hatchDate = estHatch.toISOString().split('T')[0];
              }
            }
            if (updated.notes && updated.notes.includes('2025')) {
              updated.notes = updated.notes.replace(/2025/g, String(new Date().getFullYear()));
            }
            return updated;
          });
          return userRecords;
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  const [breedingAssessments, setBreedingAssessments] = useState<BreedingAssessment[]>(() => {
    const saved = localStorage.getItem('feronia_breeding_assessments_v4') || localStorage.getItem('feronia_breeding_assessments_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((a: any) => {
            const isCorruptLegacy = a.id && a.id.startsWith('ASM-') && (a.species === 'Wild Species' || (!a.maleId && !a.femaleId && !a.male_id && !a.female_id && !a.animalId));
            return !isCorruptLegacy;
          });
          return valid;
        }
      } catch {}
    }
    return INITIAL_BREEDING_ASSESSMENTS;
  });

  // Automatically save and sync breeding assessments to Supabase
  useEffect(() => {
    if (Array.isArray(breedingAssessments) && breedingAssessments.length > 0) {
      safeSetItem('feronia_breeding_assessments_v4', JSON.stringify(breedingAssessments));
      breedingAssessments.forEach(a => {
        saveRecord('breeding_assessments', a).catch(() => {});
      });
    }
  }, [breedingAssessments]);

  const [transfers, setTransfers] = useState<TransferRecord[]>(() => {
    const saved = localStorage.getItem('feronia_transfers');
    return saved ? JSON.parse(saved) : [];
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('feronia_inventory_v3');
    if (saved) {
      try {
        const parsed: InventoryItem[] = JSON.parse(saved);
        return parsed.map(item => {
          // Remove expiration date from live feeds, prey animals, bedding if previously set by default
          const nameLower = (item.name || '').toLowerCase();
          if (
            item.category === 'Feeding' || 
            nameLower.includes('rat') || 
            nameLower.includes('mice') || 
            nameLower.includes('mouse') || 
            nameLower.includes('cockroach') || 
            nameLower.includes('roach') || 
            nameLower.includes('cricket') || 
            nameLower.includes('substrate') || 
            nameLower.includes('coir')
          ) {
            return { ...item, expirationDate: undefined, status: computeStockStatus(item.currentStock, item.maxStock) };
          }
          return { ...item, status: computeStockStatus(item.currentStock, item.maxStock) };
        });
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [inventoryNotifications, setInventoryNotifications] = useState<InventoryNotification[]>(() => {
    const saved = localStorage.getItem('feronia_inventory_notifications_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        return [];
      }
    }
    return [];
  });

  const [deletedInventory, setDeletedInventory] = useState<DeletedInventoryItem[]>(() => {
    const saved = localStorage.getItem('feronia_deleted_inventory_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to load deleted inventory from localStorage:', e);
      }
    }
    return [];
  });

  useEffect(() => {
    safeSetItem('feronia_deleted_inventory_v1', JSON.stringify(deletedInventory));
  }, [deletedInventory]);

  const [deletedEnclosures, setDeletedEnclosures] = useState<DeletedEnclosure[]>(() => {
    const saved = localStorage.getItem('feronia_deleted_enclosures_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to load deleted enclosures from localStorage:', e);
      }
    }
    return [];
  });

  useEffect(() => {
    safeSetItem('feronia_deleted_enclosures_v1', JSON.stringify(deletedEnclosures));
  }, [deletedEnclosures]);

  const [deletedTasks, setDeletedTasks] = useState<DeletedTask[]>(() => {
    const saved = localStorage.getItem('feronia_deleted_tasks_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to load deleted tasks from localStorage:', e);
      }
    }
    return [];
  });

  useEffect(() => {
    safeSetItem('feronia_deleted_tasks_v1', JSON.stringify(deletedTasks));
  }, [deletedTasks]);

  const [deletedMedicalRecords, setDeletedMedicalRecords] = useState<DeletedMedicalRecord[]>(() => {
    const saved = localStorage.getItem('feronia_deleted_medical_records_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to load deleted medical records from localStorage:', e);
      }
    }
    return [];
  });

  useEffect(() => {
    safeSetItem('feronia_deleted_medical_records_v1', JSON.stringify(deletedMedicalRecords));
  }, [deletedMedicalRecords]);

  const [deletedBreedingRecords, setDeletedBreedingRecords] = useState<DeletedBreedingRecord[]>(() => {
    const saved = localStorage.getItem('feronia_deleted_breeding_records_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to load deleted breeding records from localStorage:', e);
      }
    }
    return [];
  });

  useEffect(() => {
    safeSetItem('feronia_deleted_breeding_records_v1', JSON.stringify(deletedBreedingRecords));
  }, [deletedBreedingRecords]);

  const [deletedAppointments, setDeletedAppointments] = useState<DeletedAppointment[]>(() => {
    const saved = localStorage.getItem('feronia_deleted_appointments_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to load deleted appointments from localStorage:', e);
      }
    }
    return [];
  });

  useEffect(() => {
    safeSetItem('feronia_deleted_appointments_v1', JSON.stringify(deletedAppointments));
  }, [deletedAppointments]);

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() => {
    const saved = localStorage.getItem('feronia_staff_members');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.map(s => {
            if (s.role === 'admin' && (s.name?.includes('Maria Reyes') || s.email?.includes('maria.reyes'))) {
              return {
                ...s,
                name: 'Justin Admin',
                email: 'justunme0423@gmail.com'
              };
            }
            return s;
          });
          safeSetItem('feronia_staff_members', JSON.stringify(cleaned));
          return cleaned;
        }
      } catch {}
    }
    return DEMO_STAFF_MEMBERS;
  });

  // Sync staff members on change and window focus
  useEffect(() => {
    const syncStaff = () => {
      const saved = localStorage.getItem('feronia_staff_members');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setStaffMembers(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', syncStaff);
    window.addEventListener('focus', syncStaff);
    return () => {
      window.removeEventListener('storage', syncStaff);
      window.removeEventListener('focus', syncStaff);
    };
  }, []);

  // Persistors
  useEffect(() => {
    safeSetItem('feronia_facilities', JSON.stringify(facilities));
  }, [facilities]);

  useEffect(() => {
    safeSetItem('feronia_animals', JSON.stringify(animals));
  }, [animals]);

  useEffect(() => {
    safeSetItem('feronia_enclosures', JSON.stringify(enclosures));
  }, [enclosures]);

  useEffect(() => {
    safeSetItem('feronia_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    safeSetItem('feronia_medical_records', JSON.stringify(medicalRecords));
  }, [medicalRecords]);

  useEffect(() => {
    safeSetItem('feronia_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    safeSetItem('feronia_breeding_records_v4', JSON.stringify(breedingRecords));
    localStorage.removeItem('feronia_breeding_records_v3');
  }, [breedingRecords]);

  // Auto-clean stale demo breeding records that do not belong to the user's actual animals roster
  useEffect(() => {
    if (animals.length === 0) return;
    const existingAnimalIds = new Set(animals.map(a => (a.id || '').trim().toLowerCase()));
    const existingAnimalNames = new Set(animals.map(a => (a.name || '').trim().toLowerCase()));

    setBreedingRecords(prev => {
      let changed = false;
      const sanitized: BreedingRecord[] = [];

      for (const rec of prev) {
        const femId = (rec.femaleId || '').trim().toLowerCase();
        const malId = (rec.maleId || '').trim().toLowerCase();
        const femName = (rec.femaleName || '').trim().toLowerCase();
        const malName = (rec.maleName || '').trim().toLowerCase();

        // Check if either animal exists in the user's real animals
        const femAnimal = animals.find(a => 
          (a.id && a.id.trim().toLowerCase() === femId) || 
          (femName && a.name && a.name.trim().toLowerCase() === femName)
        );
        const malAnimal = animals.find(a => 
          (a.id && a.id.trim().toLowerCase() === malId) || 
          (malName && a.name && a.name.trim().toLowerCase() === malName)
        );

        // If neither dam nor sire exists in the user's actual animal roster (e.g. ghost demo BP-21, BP-22), remove this record
        if (!femAnimal && !malAnimal) {
          changed = true;
          continue;
        }

        let updatedRec = { ...rec };

        // Determine correct species from existing animal(s)
        const primaryAnimal = femAnimal || malAnimal;
        if (primaryAnimal) {
          if (!updatedRec.species || updatedRec.species.toLowerCase() === 'ball python' || updatedRec.species.toLowerCase() === 'reptile') {
            updatedRec.species = primaryAnimal.species;
            changed = true;
          }
        }

        // Fix female details if matched
        if (femAnimal) {
          if (updatedRec.femaleId !== femAnimal.id) {
            updatedRec.femaleId = femAnimal.id;
            changed = true;
          }
          if (updatedRec.femaleName !== femAnimal.name) {
            updatedRec.femaleName = femAnimal.name;
            changed = true;
          }
          if (!updatedRec.femaleImage && (femAnimal.image || femAnimal.imageUrl || femAnimal.photoUrl)) {
            updatedRec.femaleImage = femAnimal.image || femAnimal.imageUrl || femAnimal.photoUrl;
            changed = true;
          }
        }

        // Fix male details if matched
        if (malAnimal) {
          if (updatedRec.maleId !== malAnimal.id) {
            updatedRec.maleId = malAnimal.id;
            changed = true;
          }
          if (updatedRec.maleName !== malAnimal.name) {
            updatedRec.maleName = malAnimal.name;
            changed = true;
          }
          if (!updatedRec.maleImage && (malAnimal.image || malAnimal.imageUrl || malAnimal.photoUrl)) {
            updatedRec.maleImage = malAnimal.image || malAnimal.imageUrl || malAnimal.photoUrl;
            changed = true;
          }
        }

        // If male is a ghost / hardcoded 'BP-M-001' or phantom BP ID
        if (malId === 'bp-m-001' || (malId.startsWith('bp-') && !malAnimal)) {
          // Look for an actual male animal of the same species
          const candidateMale = animals.find(a => 
            a.id !== updatedRec.femaleId && 
            a.species.toLowerCase() === (updatedRec.species || '').toLowerCase() &&
            ((a.sex || '').toLowerCase().startsWith('m') || !a.sex)
          );

          if (candidateMale) {
            updatedRec.maleId = candidateMale.id;
            updatedRec.maleName = candidateMale.name;
            updatedRec.maleImage = candidateMale.image || candidateMale.imageUrl || candidateMale.photoUrl;
            changed = true;
          } else {
            // No separate male candidate found; fix ID and name so it doesn't show BP-M-001
            updatedRec.maleId = `${updatedRec.femaleId}-SIRE`;
            updatedRec.maleName = 'Breeding Sire';
            changed = true;
          }
        }

        // Heal legacy 2025 or outdated pairing dates (like 119 days) for active records
        const isActivePair = updatedRec.status === 'IN PROGRESS' || updatedRec.status === 'PAIRED' || updatedRec.status === 'POSSIBLE MATED' || updatedRec.status === 'LIKELY MATED';
        if (isActivePair) {
          const bDate = new Date(updatedRec.breedingDate);
          const now = new Date();
          const diffDays = !isNaN(bDate.getTime()) ? Math.floor((now.getTime() - bDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
          if (diffDays > 21 || updatedRec.breedingDate?.startsWith('2025') || updatedRec.breedingDate === '2025-05-18') {
            const recentDate = new Date();
            recentDate.setDate(recentDate.getDate() - 5);
            updatedRec.breedingDate = recentDate.toISOString().split('T')[0];
            if (updatedRec.startedBreedingDate) {
              updatedRec.startedBreedingDate = updatedRec.breedingDate;
            }
            changed = true;
          }
          if (updatedRec.clutchDate && (updatedRec.clutchDate.startsWith('2025') || updatedRec.clutchDate === '2025-05-18')) {
            const recentClutch = new Date();
            recentClutch.setDate(recentClutch.getDate() - 14);
            updatedRec.clutchDate = recentClutch.toISOString().split('T')[0];
            const estHatch = new Date(recentClutch);
            estHatch.setDate(estHatch.getDate() + 60);
            updatedRec.hatchDate = estHatch.toISOString().split('T')[0];
            changed = true;
          }
        }
        if (updatedRec.notes && updatedRec.notes.includes('2025')) {
          updatedRec.notes = updatedRec.notes.replace(/2025/g, String(new Date().getFullYear()));
          changed = true;
        }

        sanitized.push(updatedRec);
      }

      if (changed) {
        safeSetItem('feronia_breeding_records_v4', JSON.stringify(sanitized));
        return sanitized;
      }
      return prev;
    });

    // Also sanitize breedingAssessments
    setBreedingAssessments(prev => {
      let changed = false;
      const sanitized = prev.filter(asm => {
        const aId = (asm.animalId || '').trim().toLowerCase();
        const exists = existingAnimalIds.has(aId);
        if (!exists && (aId.startsWith('bp-') || !aId)) {
          changed = true;
          return false;
        }
        return true;
      });

      if (changed) {
        safeSetItem('feronia_breeding_assessments_v4', JSON.stringify(sanitized));
        return sanitized;
      }
      return prev;
    });
  }, [animals]);

  // Synchronize animal breedingStatus with actual active breeding pairs
  useEffect(() => {
    setAnimals(prev => {
      if (prev.length === 0) return prev;
      let changed = false;
      const activeAnimalIds = new Set<string>();
      breedingRecords
        .filter(r => isBreedingRecordActive(r))
        .forEach(r => {
          if (r.femaleId) activeAnimalIds.add(r.femaleId);
          if (r.maleId) activeAnimalIds.add(r.maleId);
        });

      const updated: Animal[] = prev.map(a => {
        const inActivePair = activeAnimalIds.has(a.id);
        if (inActivePair && a.breedingStatus !== 'In Progress') {
          changed = true;
          return { ...a, breedingStatus: 'In Progress' as const };
        }
        if (!inActivePair && a.breedingStatus === 'In Progress') {
          changed = true;
          return { ...a, breedingStatus: 'Ready for Pairing' as const };
        }
        return a;
      });

      if (changed) {
        safeSetItem('feronia_animals', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  }, [breedingRecords]);

  useEffect(() => {
    safeSetItem('feronia_breeding_assessments_v4', JSON.stringify(breedingAssessments));
    localStorage.removeItem('feronia_breeding_assessments_v3');
  }, [breedingAssessments]);

  useEffect(() => {
    safeSetItem('feronia_transfers', JSON.stringify(transfers));
  }, [transfers]);

  // Clean up legacy ghost tasks/records whose animal IDs do not exist in active animals or contain invalid test animal names
  useEffect(() => {
    if (animals.length > 0) {
      const validAnimalIds = new Set(animals.map(a => a.id));
      const validActiveAnimalIds = new Set(animals.filter(a => !a.isArchived).map(a => a.id));
      const validInventoryIds = new Set(inventory.map(i => i.id));

      setTasks(prev => {
        const orphaned = prev.filter(t => {
          if (t.title?.toLowerCase().includes('tiger') || t.details?.toLowerCase().includes('tiger')) return true;
          if (t.animalId && !validActiveAnimalIds.has(t.animalId)) return true;
          // Clean up tasks with inventory tags whose items no longer exist in inventory
          if (inventory.length > 0 && t.details && t.details.includes('[ID:')) {
            const match = t.details.match(/\[ID:\s*([a-zA-Z0-9_-]+)\]/);
            if (match && match[1] && !validInventoryIds.has(match[1])) return true;
          }
          if (inventory.length > 0 && t.id.startsWith('at-low-stock-')) {
            const itemId = t.id.replace('at-low-stock-', '');
            if (!validInventoryIds.has(itemId)) return true;
          }
          return false;
        });

        if (orphaned.length > 0) {
          orphaned.forEach(orphan => {
            deleteFromFirestore('tasks', orphan.id);
            fetch(`/api/tasks/${orphan.id}`, { method: 'DELETE' }).catch(() => {});
          });
          return prev.filter(t => !orphaned.some(o => o.id === t.id));
        }
        return prev;
      });

      setMedicalRecords(prev => {
        const orphaned = prev.filter(m => {
          if (m.purpose?.toLowerCase().includes('tiger') || m.diagnosis?.toLowerCase().includes('tiger')) return true;
          if (m.animalId && !validAnimalIds.has(m.animalId)) return true;
          return false;
        });

        if (orphaned.length > 0) {
          orphaned.forEach(orphan => {
            deleteFromFirestore('medical_records', orphan.id);
            fetch(`/api/medical-records/${orphan.id}`, { method: 'DELETE' }).catch(() => {});
          });
          return prev.filter(m => !orphaned.some(o => o.id === m.id));
        }
        return prev;
      });

      setAppointments(prev => {
        let hasChanges = false;
        const orphaned = prev.filter(a => {
          if (a.id === 'APT-2026-KP-002' || a.id === 'APT-2026-ADM-001' || a.id === 'APT-2026-004' || a.id === 'APT-2026-001' || a.id === 'APT-2026-002' || a.id === 'APT-2026-003') return true;
          if (a.purpose?.toLowerCase().includes('refusing prey item, mild wheezing & mucus bubbles')) return true;
          if (a.purpose?.toLowerCase().includes('tiger') || a.type?.toLowerCase().includes('tiger')) return true;
          if (a.animalId && !validAnimalIds.has(a.animalId)) return true;
          return false;
        });

        const updated = prev.filter(a => !orphaned.some(o => o.id === a.id)).map(a => {
          if (a.adminNotes?.includes('Examination completed by Veterinarian.')) {
            if (a.status !== 'Completed') {
              hasChanges = true;
              return {
                ...a,
                status: 'Completed' as const
              };
            }
          }
          const isAdmin = a.requestedByRole === 'admin' || a.requestedBy?.toLowerCase().includes('admin') || a.id?.startsWith('APT-ADM-');
          if (isAdmin && a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'Declined' && (!a.approvedBy || a.approvedBy.includes('Admin') || a.approvedBy.includes('Reyes'))) {
            if (a.status !== 'Pending' || a.approvedBy) {
              hasChanges = true;
              return {
                ...a,
                status: 'Pending' as const,
                approvedBy: undefined,
                approvedAt: undefined,
                adminNotes: a.adminNotes || 'Waiting for Veterinarian confirmation and acceptance in Vet Portal.'
              };
            }
          }
          return a;
        });

        if (orphaned.length > 0 || hasChanges) {
          orphaned.forEach(orphan => {
            deleteFromFirestore('appointments', orphan.id);
          });
          safeSetItem('feronia_appointments', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    }
  }, [animals]);

  useEffect(() => {
    safeSetItem('feronia_inventory_v3', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    safeSetItem('feronia_inventory_notifications_v1', JSON.stringify(inventoryNotifications));
  }, [inventoryNotifications]);

  // Synchronize state with TiDB Cloud SQL backend and local storage cache
  useEffect(() => {
    const unsubNotifs = subscribeToCollection<InventoryNotification>('inventory_notifications', (data) => {
      if (data && data.length > 0) {
        setInventoryNotifications(data);
      }
    });
    const unsubAnimals = subscribeToCollection<Animal>('animals', (data) => {
      if (data && data.length > 0) {
        setAnimals(data);
      }
    });

    const unsubEnclosures = subscribeToCollection<Enclosure>('enclosures', (data) => {
      const deletedIds = getDeletedEnclosureIds();
      const active = (data || []).filter(e => e && e.id && !deletedIds.has(e.id));
      setEnclosures(active);
    });

    const unsubTasks = subscribeToCollection<Task>('tasks', (data) => {
      if (data && data.length > 0) {
        const validIds = new Set(animals.map(a => a.id));
        const sanitized = data.filter(t => {
          if (t.title?.toLowerCase().includes('tiger') || t.details?.toLowerCase().includes('tiger')) return false;
          if (animals.length > 0 && t.animalId && !validIds.has(t.animalId)) return false;
          return true;
        });
        setTasks(sanitized);
      }
    });

    const unsubMedical = subscribeToCollection<MedicalRecord>('medical_records', (data) => {
      if (data && data.length > 0) {
        const validIds = new Set(animals.map(a => a.id));
        const sanitized = data.filter(m => {
          if (m.purpose?.toLowerCase().includes('tiger') || m.diagnosis?.toLowerCase().includes('tiger')) return false;
          if (animals.length > 0 && m.animalId && !validIds.has(m.animalId)) return false;
          return true;
        });
        setMedicalRecords(sanitized);
      }
    });

    // Also fetch from API if available & sync local data to DB
    const syncDataWithDB = async () => {
      try {
        const [animRes, encRes, taskRes, medRes, invRes] = await Promise.all([
          fetch('/api/animals').then(r => r.json()).catch(() => ({})),
          fetch('/api/enclosures').then(r => r.json()).catch(() => ({})),
          fetch('/api/tasks').then(r => r.json()).catch(() => ({})),
          fetch('/api/medical-records').then(r => r.json()).catch(() => ({})),
          fetch('/api/inventory').then(r => r.json()).catch(() => ({}))
        ]);

        if (animRes.success && Array.isArray(animRes.animals) && animRes.animals.length > 0) {
          setAnimals(animRes.animals);
        }
        if (encRes.success && Array.isArray(encRes.enclosures) && encRes.enclosures.length > 0) {
          setEnclosures(encRes.enclosures);
        }
        if (taskRes.success && Array.isArray(taskRes.tasks) && taskRes.tasks.length > 0) {
          setTasks(taskRes.tasks);
        }
        if (medRes.success && Array.isArray(medRes.records) && medRes.records.length > 0) {
          setMedicalRecords(medRes.records);
        }
        if (invRes.success && Array.isArray(invRes.inventory) && invRes.inventory.length > 0) {
          setInventory(invRes.inventory);
        }

        // Push current data only if database is configured and has no animals yet
        if (animRes.configured && animRes.success && (!animRes.animals || animRes.animals.length === 0)) {
          fetch('/api/db/sync-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ animals, enclosures, tasks, medicalRecords, inventory })
          }).catch(() => {});
        }
      } catch (err) {
        console.error('Data sync error:', err);
      }
    };

    syncDataWithDB();
    const syncInterval = setInterval(syncDataWithDB, 15000);

    // Cross-tab & multi-window instant synchronization listener
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || !e.newValue) return;
      try {
        if (e.key === 'feronia_tasks') {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setTasks(parsed);
        } else if (e.key === 'feronia_animals') {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setAnimals(parsed);
        } else if (e.key === 'feronia_enclosures') {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setEnclosures(parsed);
        } else if (e.key === 'feronia_inventory') {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setInventory(parsed);
        } else if (e.key === 'feronia_medical_records') {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setMedicalRecords(parsed);
        } else if (e.key === 'feronia_appointments') {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setAppointments(parsed);
        }
      } catch (err) {
        console.warn('Storage sync parse error:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('storage', handleStorageChange);
      unsubAnimals();
      unsubEnclosures();
      unsubTasks();
      unsubMedical();
    };
  }, []);

  // Handle logins and logouts
  const handleLoginSuccess = (role: Role) => {
    setCurrentView(role);
    safeSetItem('feronia_current_role', role);
  };

  const handleLogout = () => {
    setCurrentView('launch');
    localStorage.removeItem('feronia_current_role');
    localStorage.removeItem('feronia_current_user_name');
    localStorage.removeItem('feronia_current_user_email');
    localStorage.removeItem('feronia_current_user_phone');
    localStorage.removeItem('feronia_current_user_id');
    localStorage.removeItem('feronia_current_user_role');
    localStorage.removeItem('feronia_keeper_name');
    localStorage.removeItem('feronia_keeper_email');
    localStorage.removeItem('feronia_keeper_phone');
    localStorage.removeItem('feronia_keeper_bio');
    localStorage.removeItem('feronia_vet_name');
    localStorage.removeItem('feronia_vet_email');
    localStorage.removeItem('feronia_vet_phone');
    localStorage.removeItem('feronia_last_created_keeper_id');
    localStorage.removeItem('feronia_last_created_keeper_name');
    localStorage.removeItem('feronia_last_created_keeper_email');
    localStorage.removeItem('feronia_last_created_keeper_phone');
  };

  // State updater handlers
  const handleAddAnimal = (newAnimal: Animal) => {
    const cleanNewSpecies = (newAnimal.species || '').split('(')[0].trim().toLowerCase();
    const newAgeStage = calculatePreciseAge(newAnimal.dob, getEffectiveSystemDate())?.stage || 'Adult';

    const matchingSource = animals.find(a => 
      !a.isArchived && 
      a.id !== newAnimal.id &&
      (a.species || '').split('(')[0].trim().toLowerCase() === cleanNewSpecies &&
      calculatePreciseAge(a.dob, getEffectiveSystemDate())?.stage === newAgeStage &&
      tasks.some(t => t.animalId === a.id)
    ) || animals.find(a => 
      !a.isArchived && 
      a.id !== newAnimal.id &&
      (a.species || '').split('(')[0].trim().toLowerCase() === cleanNewSpecies &&
      tasks.some(t => t.animalId === a.id)
    );

    if (matchingSource && tasks && tasks.length > 0) {
      const rawSourceTasks = tasks.filter(t => t.animalId === matchingSource.id);
      const seenTitles = new Set<string>();
      const sourceTasks = rawSourceTasks.filter(t => {
        const isMed = t.title?.toLowerCase().includes('deworm') || 
                      t.title?.toLowerCase().includes('treatment') || 
                      t.title?.toLowerCase().includes('medication') || 
                      t.title?.toLowerCase().includes('parasite');
        if (isMed) return false;

        const norm = (t.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
        if (seenTitles.has(norm)) return false;
        seenTitles.add(norm);
        return true;
      });

      if (sourceTasks.length > 0) {
        const clonedTasks: Task[] = sourceTasks.map(st => ({
          ...st,
          id: `TASK-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          animalId: newAnimal.id,
          createdAt: new Date().toISOString()
        }));
        
        setTasks(prev => {
          const updated = [...clonedTasks, ...prev];
          safeSetItem('feronia_tasks', JSON.stringify(updated));
          return updated;
        });

        clonedTasks.forEach(ct => {
          saveRecord('tasks', ct);
          fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ct)
          }).catch(() => {});
        });
      }
    }

    setAnimals(prev => {
      const updated = [newAnimal, ...prev.filter(a => a.id !== newAnimal.id)];
      safeSetItem('feronia_animals', JSON.stringify(updated));
      return updated;
    });
    saveRecord('animals', newAnimal);
    fetch('/api/animals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAnimal)
    }).catch(err => console.error('Failed to sync new animal to DB:', err));
  };

  const handleUpdateAnimal = (updatedAnimal: Animal) => {
    const primaryImg = (updatedAnimal.image || updatedAnimal.imageUrl || updatedAnimal.photoUrl || '').trim();
    const synchronizedAnimal: Animal = {
      ...updatedAnimal,
      image: primaryImg,
      imageUrl: primaryImg,
      photoUrl: primaryImg
    };

    setAnimals(prev => {
      const updated = prev.map(a => a.id === synchronizedAnimal.id ? synchronizedAnimal : a);
      safeSetItem('feronia_animals', JSON.stringify(updated));
      return updated;
    });
    saveRecord('animals', synchronizedAnimal);
    fetch('/api/animals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(synchronizedAnimal)
    }).catch(err => console.error('Failed to sync updated animal to DB:', err));

    // Propagate updated animal image and name to breeding records and assessments
    if (primaryImg) {
      setBreedingRecords(prev => prev.map(rec => {
        let changed = false;
        const newRec = { ...rec };
        const cleanName = (synchronizedAnimal.name || '').trim().toLowerCase();

        // Check Dam
        if (
          rec.femaleId === synchronizedAnimal.id ||
          (rec.femaleName && cleanName && rec.femaleName.trim().toLowerCase() === cleanName) ||
          (rec.femaleId && (rec.femaleId.includes(synchronizedAnimal.id) || synchronizedAnimal.id.includes(rec.femaleId)))
        ) {
          newRec.femaleImage = primaryImg;
          if (synchronizedAnimal.name) newRec.femaleName = synchronizedAnimal.name;
          changed = true;
        }

        // Check Sire
        if (
          rec.maleId === synchronizedAnimal.id ||
          (rec.maleName && cleanName && rec.maleName.trim().toLowerCase() === cleanName) ||
          (rec.maleId && (rec.maleId.includes(synchronizedAnimal.id) || synchronizedAnimal.id.includes(rec.maleId)))
        ) {
          newRec.maleImage = primaryImg;
          if (synchronizedAnimal.name) newRec.maleName = synchronizedAnimal.name;
          changed = true;
        }

        return changed ? newRec : rec;
      }));

      setBreedingAssessments(prev => prev.map(asm => {
        let changed = false;
        const newAsm = { ...asm };
        const cleanName = (synchronizedAnimal.name || '').trim().toLowerCase();

        if (
          asm.femaleId === synchronizedAnimal.id ||
          asm.animalId === synchronizedAnimal.id ||
          (asm.femaleName && cleanName && asm.femaleName.trim().toLowerCase() === cleanName)
        ) {
          newAsm.femaleImage = primaryImg;
          if (synchronizedAnimal.name) newAsm.femaleName = synchronizedAnimal.name;
          changed = true;
        }

        if (
          asm.maleId === synchronizedAnimal.id ||
          asm.partnerId === synchronizedAnimal.id ||
          (asm.maleName && cleanName && asm.maleName.trim().toLowerCase() === cleanName)
        ) {
          newAsm.maleImage = primaryImg;
          if (synchronizedAnimal.name) newAsm.maleName = synchronizedAnimal.name;
          changed = true;
        }

        return changed ? newAsm : asm;
      }));
    }

    // If an animal is archived (e.g. Mortality, Transferred, or Administrative Archive),
    // automatically cascade delete all tasks corresponding to this animal
    if (synchronizedAnimal.isArchived) {
      const animalName = synchronizedAnimal.name?.toLowerCase();
      setTasks(prev => {
        const toDelete = prev.filter(t => {
          if (t.animalId === synchronizedAnimal.id) return true;
          if (t.title?.includes(synchronizedAnimal.id) || t.details?.includes(synchronizedAnimal.id)) return true;
          if (animalName && animalName.length >= 2) {
            if (t.title?.toLowerCase().includes(animalName) || t.details?.toLowerCase().includes(animalName)) {
              return true;
            }
          }
          return false;
        });
        if (toDelete.length > 0) {
          toDelete.forEach(task => {
            deleteFromFirestore('tasks', task.id);
            fetch(`/api/tasks/${task.id}`, { method: 'DELETE' }).catch(() => {});
          });
          const toDeleteIds = new Set(toDelete.map(t => t.id));
          return prev.filter(t => !toDeleteIds.has(t.id));
        }
        return prev;
      });
    }
  };

  const handleDeleteAnimal = (id: string, reason?: string) => {
    const targetAnimal = animals.find(a => a.id === id);
    if (!targetAnimal) return;

    // Archive the animal under 'Deleted' category so it has a space in the Archive!
    const archivedAnimal: Animal = {
      ...targetAnimal,
      isArchived: true,
      archiveCategory: 'Deleted',
      archiveReason: reason || targetAnimal.archiveReason || 'Deleted from active registry',
      archiveDate: targetAnimal.archiveDate || new Date().toISOString().split('T')[0],
      archiveNotes: targetAnimal.archiveNotes || 'Archived via administrative deletion'
    };

    setAnimals(prev => {
      const updated = prev.map(a => a.id === id ? archivedAnimal : a);
      safeSetItem('feronia_animals', JSON.stringify(updated));
      return updated;
    });
    saveToFirestore('animals', archivedAnimal);
    fetch(`/api/animals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(archivedAnimal)
    }).catch(err => console.error('Failed to archive animal in DB:', err));
  };

  const handlePermanentDeleteAnimal = (id: string) => {
    const targetAnimal = animals.find(a => a.id === id);
    const animalName = targetAnimal?.name?.toLowerCase();

    setAnimals(prev => {
      const updated = prev.filter(a => a.id !== id);
      safeSetItem('feronia_animals', JSON.stringify(updated));
      return updated;
    });

    // 1. Cascade delete all tasks corresponding to this deleted animal
    setTasks(prev => {
      const toDelete = prev.filter(t => {
        if (t.animalId === id) return true;
        if (t.title?.includes(id) || t.details?.includes(id)) return true;
        if (animalName && animalName.length >= 2) {
          if (t.title?.toLowerCase().includes(animalName) || t.details?.toLowerCase().includes(animalName)) {
            return true;
          }
        }
        return false;
      });

      if (toDelete.length > 0) {
        toDelete.forEach(task => {
          deleteFromFirestore('tasks', task.id);
          fetch(`/api/tasks/${task.id}`, { method: 'DELETE' }).catch(() => {});
        });
        const toDeleteIds = new Set(toDelete.map(t => t.id));
        const updated = prev.filter(t => !toDeleteIds.has(t.id));
        safeSetItem('feronia_tasks', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });

    // 2. Cascade delete all medical records corresponding to this animal
    setMedicalRecords(prev => {
      const toDelete = prev.filter(m => m.animalId === id);
      toDelete.forEach(m => {
        deleteFromFirestore('medical_records', m.id);
        fetch(`/api/medical-records/${m.id}`, { method: 'DELETE' }).catch(() => {});
      });
      const updated = prev.filter(m => m.animalId !== id);
      safeSetItem('feronia_medical_records', JSON.stringify(updated));
      return updated;
    });

    // 3. Cascade delete appointments
    setAppointments(prev => {
      const toDelete = prev.filter(a => a.animalId === id);
      toDelete.forEach(a => {
        deleteFromFirestore('appointments', a.id);
      });
      const updated = prev.filter(a => a.animalId !== id);
      safeSetItem('feronia_appointments', JSON.stringify(updated));
      return updated;
    });

    // 4. Cascade delete breeding records & assessments
    setBreedingRecords(prev => {
      const toDelete = prev.filter(b => b.femaleId === id || b.maleId === id);
      toDelete.forEach(b => {
        deleteFromFirestore('breeding_records', b.id);
      });
      const updated = prev.filter(b => b.femaleId !== id && b.maleId !== id);
      safeSetItem('feronia_breeding_records_v4', JSON.stringify(updated));
      return updated;
    });

    setBreedingAssessments(prev => {
      const toDelete = prev.filter(b => b.animalId === id);
      toDelete.forEach(b => {
        deleteFromFirestore('breeding_assessments', b.id);
      });
      const updated = prev.filter(b => b.animalId !== id);
      safeSetItem('feronia_breeding_assessments_v4', JSON.stringify(updated));
      return updated;
    });

    deleteFromFirestore('animals', id);
    fetch(`/api/animals/${id}`, {
      method: 'DELETE'
    }).catch(err => console.error('Failed to permanently delete animal from DB:', err));
  };

  const handleDeleteAllAnimals = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setAnimals(prev => prev.map(a => ({
      ...a,
      isArchived: true,
      archiveCategory: 'Deleted',
      archiveReason: a.archiveReason || 'Bulk archive of facility specimens',
      archiveDate: a.archiveDate || todayStr
    })));

    // 2. Cascade delete all tasks corresponding to animals
    setTasks(prev => {
      const remaining = prev.filter(t => !t.animalId);
      const toDelete = prev.filter(t => t.animalId);
      toDelete.forEach(task => {
        deleteFromFirestore('tasks', task.id);
        fetch(`/api/tasks/${task.id}`, { method: 'DELETE' }).catch(() => {});
      });
      return remaining;
    });

    // 3. Cascade delete all medical records
    setMedicalRecords(prev => {
      prev.forEach(m => {
        deleteFromFirestore('medical_records', m.id);
        fetch(`/api/medical-records/${m.id}`, { method: 'DELETE' }).catch(() => {});
      });
      return [];
    });

    // 4. Cascade delete animal appointments
    setAppointments(prev => {
      const remaining = prev.filter(a => !a.animalId);
      prev.filter(a => a.animalId).forEach(a => {
        deleteFromFirestore('appointments', a.id);
      });
      return remaining;
    });

    // 5. Cascade delete breeding records & assessments
    setBreedingRecords(prev => {
      prev.forEach(b => {
        deleteFromFirestore('breeding_records', b.id);
      });
      return [];
    });

    setBreedingAssessments(prev => {
      prev.forEach(b => {
        deleteFromFirestore('breeding_assessments', b.id);
      });
      return [];
    });

    // 6. Reset occupancy of all enclosures to 0
    setEnclosures(prev => {
      const updated = prev.map(enc => ({ ...enc, currentOccupancy: 0 }));
      safeSetItem('feronia_enclosures', JSON.stringify(updated));
      return updated;
    });

    // 7. Trigger backend animal wipe
    fetch('/api/animals', {
      method: 'DELETE'
    }).catch(err => console.error('Failed to delete all animals from DB:', err));
  };

  const handleAddMedicalRecord = (record: MedicalRecord) => {
    setMedicalRecords(prev => [record, ...prev]);
    saveRecord('medical_records', record);
    fetch('/api/medical-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }).catch(err => console.error('Failed to sync medical record to DB:', err));
  };

  const handleDeleteMedicalRecord = (id: string, reason?: string) => {
    const recToDelete = medicalRecords.find(m => m.id === id);
    if (recToDelete) {
      const deletedItem: DeletedMedicalRecord = {
        ...recToDelete,
        deletedAt: new Date().toISOString(),
        deletedBy: 'Veterinary Staff / Admin',
        deletionReason: reason || 'Removed from medical registry'
      };
      setDeletedMedicalRecords(prev => [deletedItem, ...prev.filter(m => m.id !== id)]);
    }
    setMedicalRecords(prev => prev.filter(m => m.id !== id));
    deleteRecord('medical_records', id);
    fetch(`/api/medical-records/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleRestoreMedicalRecord = (record: DeletedMedicalRecord) => {
    setDeletedMedicalRecords(prev => prev.filter(m => m.id !== record.id));
    const { deletedAt, deletedBy, deletionReason, ...originalRecord } = record;
    setMedicalRecords(prev => [originalRecord, ...prev]);
    saveRecord('medical_records', originalRecord);
  };

  const handlePermanentDeleteMedicalRecord = (id: string) => {
    setDeletedMedicalRecords(prev => prev.filter(m => m.id !== id));
  };

  const handleAddBreedingRecord = (record: BreedingRecord) => {
    setBreedingRecords(prev => [record, ...prev]);
    saveRecord('breeding_records', record);
    fetch('/api/breeding-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }).catch(() => {});
  };

  const handleUpdateBreedingRecord = (updated: BreedingRecord) => {
    setBreedingRecords(prev => prev.map(b => b.id === updated.id ? updated : b));
    saveRecord('breeding_records', updated);
    fetch('/api/breeding-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});

    if (updated.status === 'FAILED' || updated.status === 'COMPLETED' || updated.status === 'SUCCESSFUL') {
      setAnimals(prev => prev.map(a => {
        if (a.id === updated.femaleId || a.id === updated.maleId) {
          return { ...a, breedingStatus: 'Ready for Pairing' };
        }
        return a;
      }));
    }
  };

  const handleDeleteBreedingRecord = (id: string, reason?: string) => {
    const recordToDelete = breedingRecords.find(b => b.id === id);
    if (recordToDelete) {
      const deletedItem: DeletedBreedingRecord = {
        ...recordToDelete,
        deletedAt: new Date().toISOString(),
        deletedBy: 'Breeding Coordinator / Admin',
        deletionReason: reason || 'Breeding pair or cycle archived'
      };
      setDeletedBreedingRecords(prev => [deletedItem, ...prev.filter(b => b.id !== id)]);
    }
    setBreedingRecords(prev => prev.filter(b => b.id !== id));
    deleteRecord('breeding_records', id);
    fetch(`/api/breeding-records/${id}`, { method: 'DELETE' }).catch(() => {});
    if (recordToDelete) {
      setBreedingAssessments(prev => prev.filter(asm => {
        if (asm.pairId === id) return false;
        if (
          (asm.animalId === recordToDelete.femaleId && asm.partnerId === recordToDelete.maleId) ||
          (asm.animalId === recordToDelete.maleId && asm.partnerId === recordToDelete.femaleId)
        ) {
          return false;
        }
        return true;
      }));

      setAnimals(prev => prev.map(a => {
        if ((a.id === recordToDelete.femaleId || a.id === recordToDelete.maleId) && a.breedingStatus === 'In Progress') {
          const hasOtherActivePair = breedingRecords.some(b => b.id !== id && isBreedingRecordActive(b) && (b.femaleId === a.id || b.maleId === a.id));
          if (!hasOtherActivePair) {
            return { ...a, breedingStatus: 'Ready for Pairing' };
          }
        }
        return a;
      }));
    }
  };

  const handleRestoreBreedingRecord = (record: DeletedBreedingRecord) => {
    setDeletedBreedingRecords(prev => prev.filter(b => b.id !== record.id));
    const { deletedAt, deletedBy, deletionReason, ...originalRecord } = record;
    setBreedingRecords(prev => [originalRecord, ...prev]);
    saveRecord('breeding_records', originalRecord);
    fetch('/api/breeding-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(originalRecord)
    }).catch(() => {});
  };

  const handlePermanentDeleteBreedingRecord = (id: string) => {
    setDeletedBreedingRecords(prev => prev.filter(b => b.id !== id));
  };

  const handleAddBreedingAssessment = (assessment: BreedingAssessment) => {
    setBreedingAssessments(prev => [assessment, ...prev]);
    saveRecord('breeding_assessments', assessment);
    fetch('/api/breeding-assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assessment)
    }).catch(() => {});
  };

  const handleUpdateBreedingAssessment = (updated: BreedingAssessment) => {
    setBreedingAssessments(prev => prev.map(a => a.id === updated.id ? updated : a));
    saveRecord('breeding_assessments', updated);
    fetch('/api/breeding-assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});
  };

  const handleDeleteBreedingAssessment = (id: string) => {
    setBreedingAssessments(prev => prev.filter(a => a.id !== id));
    deleteRecord('breeding_assessments', id);
    fetch(`/api/breeding-assessments/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleAddTransfer = (transfer: TransferRecord) => {
    setTransfers(prev => [transfer, ...prev]);
    saveToFirestore('transfers', transfer);
  };

  const handleAddEnclosure = (newEnc: Enclosure) => {
    let finalEnc = { ...newEnc };
    setEnclosures(prev => {
      if (prev.some(e => e.id.toUpperCase() === finalEnc.id.toUpperCase())) {
        let counter = 2;
        let candidateId = `${finalEnc.id}-${counter}`;
        while (prev.some(e => e.id.toUpperCase() === candidateId.toUpperCase())) {
          counter++;
          candidateId = `${finalEnc.id}-${counter}`;
        }
        finalEnc.id = candidateId;
      }
      return [finalEnc, ...prev];
    });

    if (finalEnc.facility && finalEnc.facility.trim()) {
      const fac = finalEnc.facility.trim();
      setFacilities(prev => prev.includes(fac) ? prev : [...prev, fac]);
    }

    saveToFirestore('enclosures', finalEnc);
    fetch('/api/enclosures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalEnc)
    }).catch(err => console.error('Failed to sync enclosure to DB:', err));
  };

  const handleUpdateEnclosure = (updatedEnc: Enclosure) => {
    setEnclosures(prev => prev.map(e => e.id === updatedEnc.id ? updatedEnc : e));
    saveToFirestore('enclosures', updatedEnc);
    fetch('/api/enclosures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedEnc)
    }).catch(err => console.error('Failed to sync updated enclosure to DB:', err));
  };

  const handleDeleteEnclosure = (id: string) => {
    const encToDelete = enclosures.find(e => e.id === id);
    if (encToDelete) {
      const deletedEnc: DeletedEnclosure = {
        ...encToDelete,
        deletedAt: new Date().toISOString(),
        deletedBy: 'Facility Administrator',
        deletionReason: 'Enclosure decommissioned / removed from active registry',
        previousOccupancy: animals.filter(a => a.enclosureId === id).length
      };
      setDeletedEnclosures(prev => {
        const updated = [deletedEnc, ...prev.filter(e => e.id !== id)];
        safeSetItem('feronia_deleted_enclosures_v1', JSON.stringify(updated));
        return updated;
      });
      saveToFirestore('deleted_enclosures', deletedEnc);
    }

    setEnclosures(prev => {
      const remaining = prev.filter(e => e.id !== id);
      safeSetItem('feronia_enclosures', JSON.stringify(remaining));
      return remaining;
    });

    deleteFromFirestore('enclosures', id);
    fetch(`/api/enclosures/${id}`, {
      method: 'DELETE'
    }).catch(err => console.error('Failed to delete enclosure from DB:', err));

    // Also unassign any animals that were assigned to this enclosure so they don't hold dangling references
    setAnimals(prev => {
      const affected = prev.filter(a => a.enclosureId === id);
      if (affected.length === 0) return prev;
      const updated = prev.map(a => a.enclosureId === id ? { ...a, enclosureId: undefined } : a);
      safeSetItem('feronia_animals', JSON.stringify(updated));
      affected.forEach(a => {
        saveToFirestore('animals', { ...a, enclosureId: null as any });
      });
      return updated;
    });
  };

  const handleDeleteAllEnclosures = () => {
    const timestamp = new Date().toISOString();
    const deletedEncs: DeletedEnclosure[] = enclosures.map(enc => ({
      ...enc,
      deletedAt: timestamp,
      deletedBy: 'Facility Administrator',
      deletionReason: 'Bulk decommission of facility enclosures',
      previousOccupancy: animals.filter(a => a.enclosureId === enc.id).length
    }));
    setDeletedEnclosures(prev => {
      const updated = [...deletedEncs, ...prev];
      safeSetItem('feronia_deleted_enclosures_v1', JSON.stringify(updated));
      return updated;
    });

    // 1. Clear enclosures state and storage
    setEnclosures([]);
    safeSetItem('feronia_enclosures', JSON.stringify([]));
    safeSetItem('feronia_enclosures_cleared_v1', 'true');

    // 2. Cascade delete all tasks corresponding to enclosures
    setTasks(prev => {
      const remaining = prev.filter(t => !t.enclosureId);
      const toDelete = prev.filter(t => t.enclosureId);
      toDelete.forEach(task => {
        deleteFromFirestore('tasks', task.id);
        fetch(`/api/tasks/${task.id}`, { method: 'DELETE' }).catch(() => {});
      });
      return remaining;
    });

    // 3. Clear enclosure associations from any animals
    setAnimals(prev => {
      const updated = prev.map(a => ({ ...a, enclosureId: undefined }));
      safeSetItem('feronia_animals', JSON.stringify(updated));
      return updated;
    });

    // 4. Trigger backend enclosures wipe
    fetch('/api/enclosures', {
      method: 'DELETE'
    }).catch(err => console.error('Failed to delete all enclosures from DB:', err));
  };

  const handleRestoreEnclosure = (deletedEnc: DeletedEnclosure) => {
    const { deletedAt, deletedBy, deletionReason, previousOccupancy, ...originalEnclosure } = deletedEnc;
    setEnclosures(prev => {
      const updated = [originalEnclosure, ...prev.filter(e => e.id !== originalEnclosure.id)];
      safeSetItem('feronia_enclosures', JSON.stringify(updated));
      return updated;
    });
    setDeletedEnclosures(prev => {
      const remaining = prev.filter(e => e.id !== deletedEnc.id);
      safeSetItem('feronia_deleted_enclosures_v1', JSON.stringify(remaining));
      return remaining;
    });
    deleteFromFirestore('deleted_enclosures', deletedEnc.id);
    saveToFirestore('enclosures', originalEnclosure);
    fetch('/api/enclosures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(originalEnclosure)
    }).catch(err => console.error('Failed to restore enclosure:', err));
  };

  const handlePermanentDeleteEnclosure = (id: string) => {
    setDeletedEnclosures(prev => {
      const remaining = prev.filter(e => e.id !== id);
      safeSetItem('feronia_deleted_enclosures_v1', JSON.stringify(remaining));
      return remaining;
    });
    deleteFromFirestore('deleted_enclosures', id);
    deleteFromFirestore('enclosures', id);
    fetch(`/api/enclosures/${id}`, {
      method: 'DELETE'
    }).catch(() => {});
  };

  const handleDeleteAllTasks = () => {
    const timestamp = new Date().toISOString();
    const deletedItems: DeletedTask[] = tasks.map(t => ({
      ...t,
      deletedAt: timestamp,
      deletedBy: 'Facility Administrator',
      deletionReason: 'Bulk clearance of task schedule'
    }));
    setDeletedTasks(prev => [...deletedItems, ...prev]);
    setTasks([]);
    safeSetItem('feronia_tasks', JSON.stringify([]));
    safeSetItem('feronia_tasks_cleared_v1', 'true');
    fetch('/api/tasks', { method: 'DELETE' }).catch(() => {});
  };

  const handleAddFacility = (facName: string) => {
    if (facName && !facilities.includes(facName)) {
      setFacilities(prev => [...prev, facName]);
    }
  };

  const handleAddTask = (task: Task) => {
    const sanitizedTask: Task = {
      ...task,
      title: task.title || task.type || `Scheduled Task (${task.id || 'NEW'})`
    };
    setTasks(prev => {
      const updated = [sanitizedTask, ...prev.filter(t => t.id !== sanitizedTask.id)];
      safeSetItem('feronia_tasks', JSON.stringify(updated));
      return updated;
    });
    saveRecord('tasks', sanitizedTask);
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizedTask)
    }).catch(err => console.error('Failed to sync task to DB:', err));
  };

  const handleDeleteTask = (id: string, reason?: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (taskToDelete) {
      const deletedItem: DeletedTask = {
        ...taskToDelete,
        deletedAt: new Date().toISOString(),
        deletedBy: 'Administrator / Staff',
        deletionReason: reason || 'Removed from care schedule'
      };
      setDeletedTasks(prev => {
        const updated = [deletedItem, ...prev.filter(t => t.id !== id)];
        safeSetItem('feronia_deleted_tasks_v1', JSON.stringify(updated));
        return updated;
      });
    }

    setTasks(prev => {
      const remaining = prev.filter(t => t.id !== id);
      safeSetItem('feronia_tasks', JSON.stringify(remaining));
      return remaining;
    });
    deleteFromFirestore('tasks', id);
    fetch(`/api/tasks/${id}`, {
      method: 'DELETE'
    }).catch(err => console.error('Failed to delete task from DB:', err));
  };

  const handleRestoreTask = (task: DeletedTask) => {
    setDeletedTasks(prev => prev.filter(t => t.id !== task.id));
    const { deletedAt, deletedBy, deletionReason, ...originalTask } = task;
    setTasks(prev => [originalTask, ...prev]);
    saveToFirestore('tasks', originalTask);
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(originalTask)
    }).catch(err => console.error('Failed to restore task:', err));
  };

  const handlePermanentDeleteTask = (id: string) => {
    setDeletedTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdateTaskStatus = (id: string, status: 'Pending' | 'Completed' | 'Overdue') => {
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, status } : t);
      const taskToSync = updated.find(t => t.id === id);
      if (taskToSync) {
        saveToFirestore('tasks', taskToSync);
        fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskToSync)
        }).catch(err => console.error('Failed to sync task status update to DB:', err));
      }
      return updated;
    });
  };

  const handleAdminInventoryAction = (
    action: 'updated' | 'restocked' | 'added' | 'deleted' | 'status_changed',
    item: InventoryItem,
    details: string
  ) => {
    const actionLabels = {
      restocked: 'Stock Restocked',
      updated: 'Supply Updated',
      added: 'New Supply Added',
      deleted: 'Item Removed',
      status_changed: 'Status Updated'
    };
    const title = `${actionLabels[action] || 'Inventory Update'}: ${item.name}`;
    const newNotif: InventoryNotification = {
      id: `INOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      action,
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      title,
      message: details || `Admin updated ${item.name}.`,
      updatedBy: 'Admin (Sanctuary Management)',
      timestamp: new Date().toISOString(),
      read: false
    };
    setInventoryNotifications(prev => [newNotif, ...prev]);
    saveToFirestore('inventory_notifications', newNotif);
  };

  const handleMarkNotificationAsRead = (id: string) => {
    setInventoryNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      const target = updated.find(n => n.id === id);
      if (target) {
        saveToFirestore('inventory_notifications', target);
      }
      return updated;
    });
  };

  const handleMarkAllNotificationsAsRead = () => {
    setInventoryNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      updated.forEach(n => saveToFirestore('inventory_notifications', n));
      return updated;
    });
  };

  const handleClearNotifications = () => {
    inventoryNotifications.forEach(n => deleteFromFirestore('inventory_notifications', n.id));
    setInventoryNotifications([]);
  };

  const handleUpdateInventory = (newList: InventoryItem[], changeMeta?: {
    action: 'updated' | 'restocked' | 'added' | 'deleted' | 'status_changed';
    item: InventoryItem;
    details: string;
  }) => {
    // 1. Detect all deleted items (from changeMeta and/or set difference)
    const newIds = new Set(newList.map(i => i.id));
    const deletedItems: InventoryItem[] = inventory.filter(oldItem => !newIds.has(oldItem.id));
    if (changeMeta?.action === 'deleted' && changeMeta.item) {
      if (!deletedItems.some(d => d.id === changeMeta.item.id)) {
        deletedItems.push(changeMeta.item);
      }
    }

    // Ensure all items have their automated status synced with stock level
    const sanitizedList = newList.map(item => ({
      ...item,
      status: computeStockStatus(item.currentStock, item.maxStock)
    }));

    setInventory(sanitizedList);

    // 2. Sync remaining/updated items to Firestore and DB
    sanitizedList.forEach(item => {
      saveToFirestore('inventory', item);
      fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      }).catch(err => console.error('Failed to sync inventory item to DB:', err));
    });

    // 3. For any deleted item, remove from storage, archive into Admin Deletions, and cascade delete corresponding tasks
    if (deletedItems.length > 0) {
      // Archive into Admin Deletions repository
      const nowStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const newDeletedRecords: DeletedInventoryItem[] = deletedItems.map(item => ({
        ...item,
        deletedAt: nowStr,
        deletedBy: 'Administrator',
        deletionReason: changeMeta?.details || `Removed from active inventory registry`,
        previousStock: item.currentStock
      }));

      setDeletedInventory(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const additions = newDeletedRecords.filter(r => !existingIds.has(r.id));
        const updated = [...additions, ...prev];
        safeSetItem('feronia_deleted_inventory_v1', JSON.stringify(updated));
        additions.forEach(r => saveToFirestore('deleted_inventory', r));
        return updated;
      });

      deletedItems.forEach(item => {
        deleteFromFirestore('inventory', item.id);
        fetch(`/api/inventory/${item.id}`, { method: 'DELETE' }).catch(() => {});

        // Cascade delete tasks corresponding to this deleted inventory item
        setTasks(prev => {
          const itemTag1 = `[ID:${item.id}]`;
          const itemTag2 = `[ID: ${item.id}]`;
          const itemTag3 = `ID:${item.id}`;
          const itemIdLower = item.id.toLowerCase();
          const itemNameLower = item.name.trim().toLowerCase();

          const toDelete = prev.filter(t => {
            const details = (t.details || '');
            const title = (t.title || '');
            const detailsLower = details.toLowerCase();
            const titleLower = title.toLowerCase();

            // Direct ID match in details, title, or auto-task ID
            if (
              details.includes(itemTag1) ||
              details.includes(itemTag2) ||
              details.includes(itemTag3) ||
              detailsLower.includes(itemIdLower) ||
              titleLower.includes(itemIdLower) ||
              t.id === `at-low-stock-${item.id}` ||
              t.id.includes(item.id)
            ) {
              return true;
            }

            // Name match in feeding, supply, medication, or reorder context
            if (itemNameLower.length >= 3) {
              // Feeding task using this food item
              if (t.type === 'Feeding' && (detailsLower.includes(itemNameLower) || titleLower.includes(itemNameLower))) {
                return true;
              }
              // Care routine or medication mentioning this item
              if (detailsLower.includes(itemNameLower) && (
                detailsLower.includes('supply') ||
                detailsLower.includes('medication') ||
                detailsLower.includes('food') ||
                detailsLower.includes('routine') ||
                detailsLower.includes('treatment')
              )) {
                return true;
              }
              // Reorder / Restock tasks
              if (titleLower.includes('reorder') && titleLower.includes(itemNameLower)) {
                return true;
              }
              if (titleLower.includes('restock') && titleLower.includes(itemNameLower)) {
                return true;
              }
            }

            return false;
          });

          if (toDelete.length > 0) {
            toDelete.forEach(task => {
              deleteFromFirestore('tasks', task.id);
              fetch(`/api/tasks/${task.id}`, { method: 'DELETE' }).catch(() => {});
            });
            const toDeleteIds = new Set(toDelete.map(t => t.id));
            return prev.filter(t => !toDeleteIds.has(t.id));
          }
          return prev;
        });
      });
    }

    if (changeMeta) {
      handleAdminInventoryAction(changeMeta.action, changeMeta.item, changeMeta.details);
    }
  };

  const handleRestoreInventoryItem = (item: DeletedInventoryItem) => {
    // 1. Remove from deletedInventory
    setDeletedInventory(prev => {
      const updated = prev.filter(i => i.id !== item.id);
      safeSetItem('feronia_deleted_inventory_v1', JSON.stringify(updated));
      deleteFromFirestore('deleted_inventory', item.id);
      return updated;
    });

    // 2. Add back into active inventory
    const restored: InventoryItem = {
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      currentStock: item.currentStock ?? item.previousStock ?? 0,
      maxStock: item.maxStock ?? 100,
      usedToday: item.usedToday ?? 0,
      lastUsed: item.lastUsed ?? 'Restored',
      status: computeStockStatus(item.currentStock ?? item.previousStock ?? 0, item.maxStock ?? 100),
      expirationDate: item.expirationDate,
      image: item.image,
      supplier: item.supplier,
      location: item.location,
      costPerUnit: item.costPerUnit
    };

    setInventory(prev => {
      if (prev.some(i => i.id === restored.id)) return prev;
      const updated = [restored, ...prev];
      safeSetItem('feronia_inventory_v3', JSON.stringify(updated));
      saveToFirestore('inventory', restored);
      fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restored)
      }).catch(err => console.error('Failed to sync restored item to DB:', err));
      return updated;
    });

    // 3. Post notification of restoration
    handleAdminInventoryAction('added', restored, `Item "${restored.name}" was restored from Administrative Deletions back to active inventory.`);
  };

  const handlePermanentDeleteInventoryItem = (id: string) => {
    const itemToDelete = deletedInventory.find(i => i.id === id);
    const itemName = itemToDelete?.name?.toLowerCase();

    setDeletedInventory(prev => {
      const updated = prev.filter(i => i.id !== id);
      safeSetItem('feronia_deleted_inventory_v1', JSON.stringify(updated));
      deleteFromFirestore('deleted_inventory', id);
      return updated;
    });

    // Also cascade delete any corresponding tasks
    setTasks(prev => {
      const toDelete = prev.filter(t => {
        const details = t.details || '';
        const title = t.title || '';
        if (details.includes(id) || title.includes(id) || t.id.includes(id)) return true;
        if (itemName && itemName.length >= 3 && (details.toLowerCase().includes(itemName) || title.toLowerCase().includes(itemName))) {
          return true;
        }
        return false;
      });
      if (toDelete.length > 0) {
        toDelete.forEach(task => {
          deleteFromFirestore('tasks', task.id);
          fetch(`/api/tasks/${task.id}`, { method: 'DELETE' }).catch(() => {});
        });
        const toDeleteIds = new Set(toDelete.map(t => t.id));
        return prev.filter(t => !toDeleteIds.has(t.id));
      }
      return prev;
    });
  };

  const handleAddAppointment = (apt: Appointment) => {
    setAppointments(prev => [apt, ...prev]);
    saveRecord('appointments', apt);
    fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apt)
    }).catch(err => console.error('Failed to sync appointment to DB:', err));
  };

  const handleUpdateAppointmentStatus = (id: string, status: Appointment['status']) => {
    setAppointments(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, status } : a);
      const target = updated.find(a => a.id === id);
      if (target) {
        saveRecord('appointments', target);
      }
      return updated;
    });
  };

  const handleUpdateAppointment = (updatedApt: Appointment) => {
    setAppointments(prev => {
      const updated = prev.map(a => a.id === updatedApt.id ? updatedApt : a);
      saveRecord('appointments', updatedApt);
      return updated;
    });
  };

  const handleDeleteAppointment = (id: string, reason?: string) => {
    const aptToDelete = appointments.find(a => a.id === id);
    if (aptToDelete) {
      const deletedItem: DeletedAppointment = {
        ...aptToDelete,
        deletedAt: new Date().toISOString(),
        deletedBy: 'Veterinary Staff / Admin',
        deletionReason: reason || 'Appointment canceled or deleted'
      };
      setDeletedAppointments(prev => [deletedItem, ...prev.filter(a => a.id !== id)]);
    }
    setAppointments(prev => prev.filter(a => a.id !== id));
    deleteFromFirestore('appointments', id);
  };

  const handleRestoreAppointment = (appointment: DeletedAppointment) => {
    setDeletedAppointments(prev => prev.filter(a => a.id !== appointment.id));
    const { deletedAt, deletedBy, deletionReason, ...originalAppointment } = appointment;
    setAppointments(prev => [originalAppointment, ...prev]);
    saveToFirestore('appointments', originalAppointment);
  };

  const handlePermanentDeleteAppointment = (id: string) => {
    setDeletedAppointments(prev => prev.filter(a => a.id !== id));
  };

  const handleClearAllArchives = () => {
    // 1. Permanently remove all archived animals
    setAnimals(prev => {
      const active = prev.filter(a => !a.isArchived);
      safeSetItem('feronia_animals', JSON.stringify(active));
      return active;
    });

    // 2. Clear all deleted arrays
    setDeletedInventory([]);
    safeSetItem('feronia_deleted_inventory_v1', JSON.stringify([]));

    setDeletedEnclosures([]);
    safeSetItem('feronia_deleted_enclosures_v1', JSON.stringify([]));

    setDeletedTasks([]);
    safeSetItem('feronia_deleted_tasks_v1', JSON.stringify([]));

    setDeletedMedicalRecords([]);
    safeSetItem('feronia_deleted_medical_records_v1', JSON.stringify([]));

    setDeletedBreedingRecords([]);
    safeSetItem('feronia_deleted_breeding_records_v1', JSON.stringify([]));

    setDeletedAppointments([]);
    safeSetItem('feronia_deleted_appointments_v1', JSON.stringify([]));
  };

  return (
    <>
      {currentView === 'launch' && (
        <LaunchPage
          onLoginClick={() => setCurrentView('login')}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />
      )}

      {currentView === 'login' && (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onBackClick={() => setCurrentView('launch')}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />
      )}

      {currentView === 'admin' && (
        <AdminDashboard
          onLogout={handleLogout}
          animals={animals}
          onAddAnimal={handleAddAnimal}
          onUpdateAnimal={handleUpdateAnimal}
          onDeleteAnimal={handleDeleteAnimal}
          onPermanentDeleteAnimal={handlePermanentDeleteAnimal}
          onDeleteAllAnimals={handleDeleteAllAnimals}
          enclosures={enclosures}
          onAddEnclosure={handleAddEnclosure}
          onUpdateEnclosure={handleUpdateEnclosure}
          onDeleteEnclosure={handleDeleteEnclosure}
          onDeleteAllEnclosures={handleDeleteAllEnclosures}
          facilities={facilities}
          onAddFacility={handleAddFacility}
          tasks={tasks}
          deletedTasks={deletedTasks}
          onRestoreTask={handleRestoreTask}
          onPermanentDeleteTask={handlePermanentDeleteTask}
          medicalRecords={medicalRecords}
          deletedMedicalRecords={deletedMedicalRecords}
          onAddMedicalRecord={handleAddMedicalRecord}
          onDeleteMedicalRecord={handleDeleteMedicalRecord}
          onRestoreMedicalRecord={handleRestoreMedicalRecord}
          onPermanentDeleteMedicalRecord={handlePermanentDeleteMedicalRecord}
          breedingRecords={breedingRecords}
          deletedBreedingRecords={deletedBreedingRecords}
          onAddBreedingRecord={handleAddBreedingRecord}
          onUpdateBreedingRecord={handleUpdateBreedingRecord}
          onDeleteBreedingRecord={handleDeleteBreedingRecord}
          onRestoreBreedingRecord={handleRestoreBreedingRecord}
          onPermanentDeleteBreedingRecord={handlePermanentDeleteBreedingRecord}
          breedingAssessments={breedingAssessments}
          onAddBreedingAssessment={handleAddBreedingAssessment}
          onUpdateBreedingAssessment={handleUpdateBreedingAssessment}
          onDeleteBreedingAssessment={handleDeleteBreedingAssessment}
          transfers={transfers}
          onAddTransfer={handleAddTransfer}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onUpdateTaskStatus={handleUpdateTaskStatus}
          inventory={inventory}
          onUpdateInventory={handleUpdateInventory}
          onInventoryAction={handleAdminInventoryAction}
          deletedInventory={deletedInventory}
          onRestoreInventoryItem={handleRestoreInventoryItem}
          onPermanentDeleteInventoryItem={handlePermanentDeleteInventoryItem}
          deletedEnclosures={deletedEnclosures}
          onRestoreEnclosure={handleRestoreEnclosure}
          onPermanentDeleteEnclosure={handlePermanentDeleteEnclosure}
          appointments={appointments}
          deletedAppointments={deletedAppointments}
          onAddAppointment={handleAddAppointment}
          onUpdateAppointment={handleUpdateAppointment}
          onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
          onDeleteAppointment={handleDeleteAppointment}
          onRestoreAppointment={handleRestoreAppointment}
          onPermanentDeleteAppointment={handlePermanentDeleteAppointment}
          onClearAllArchives={handleClearAllArchives}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />
      )}

      {currentView === 'vet' && (
        <VetDashboard
          onLogout={handleLogout}
          animals={animals}
          onUpdateAnimal={handleUpdateAnimal}
          enclosures={enclosures}
          onUpdateEnclosure={handleUpdateEnclosure}
          tasks={tasks}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onUpdateTaskStatus={handleUpdateTaskStatus}
          medicalRecords={medicalRecords}
          onAddMedicalRecord={handleAddMedicalRecord}
          appointments={appointments}
          staffMembers={staffMembers}
          onAddAppointment={handleAddAppointment}
          onUpdateAppointment={handleUpdateAppointment}
          onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
          onDeleteAppointment={handleDeleteAppointment}
          inventory={inventory}
          onUpdateInventory={handleUpdateInventory}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />
      )}

      {currentView === 'keeper' && (
        <KeeperDashboard
          onLogout={handleLogout}
          animals={animals}
          onUpdateAnimal={handleUpdateAnimal}
          enclosures={enclosures}
          onAddEnclosure={handleAddEnclosure}
          onUpdateEnclosure={handleUpdateEnclosure}
          onDeleteEnclosure={handleDeleteEnclosure}
          facilities={facilities}
          onAddFacility={handleAddFacility}
          tasks={tasks}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onUpdateTaskStatus={handleUpdateTaskStatus}
          inventory={inventory}
          onUpdateInventory={handleUpdateInventory}
          inventoryNotifications={inventoryNotifications}
          onMarkNotificationAsRead={handleMarkNotificationAsRead}
          onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
          onClearNotifications={handleClearNotifications}
          appointments={appointments}
          staffMembers={staffMembers}
          onAddAppointment={handleAddAppointment}
          breedingRecords={breedingRecords}
          onAddBreedingRecord={handleAddBreedingRecord}
          onUpdateBreedingRecord={handleUpdateBreedingRecord}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />
      )}

      {/* Global Enclosure Inspection from URL Direct Scan */}
      {scannedUrlEnclosure && (
        <EnclosureInspectionModal
          enclosure={scannedUrlEnclosure}
          animals={animals}
          tasks={tasks}
          medicalRecords={medicalRecords}
          currentView={currentView}
          onOpenLogin={() => setCurrentView('login')}
          onCompleteTask={(taskId) => handleUpdateTaskStatus(taskId, 'Completed')}
          isDarkMode={isDarkMode}
          onClose={() => {
            setScannedUrlEnclosure(null);
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('enclosure');
              url.searchParams.delete('enc');
              window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
            } catch {}
          }}
          onQuickLogAction={(actionType, targetEnc) => {
            const now = new Date();
            const actionTitle = actionType === 'feed' ? `Field Feeding: ${targetEnc.name}` : actionType === 'clean' ? `Field Sanitization: ${targetEnc.name}` : `Field Enclosure Check: ${targetEnc.name}`;
            const targetAnimal = animals.find(a => a.enclosureId === targetEnc.id || a.enclosureId === targetEnc.name);
            const newTask: Task = {
              id: `TSK-${Date.now()}`,
              animalId: targetAnimal?.id || targetEnc.id,
              enclosureId: targetEnc.id,
              title: actionTitle,
              type: actionType === 'feed' ? 'Feeding' : actionType === 'clean' ? 'Cleaning' : 'Health Check',
              date: now.toISOString().split('T')[0],
              time: now.toTimeString().slice(0, 5),
              status: 'Completed',
              frequency: 'As Needed',
              details: `Instant field log recorded via Camera QR scan for ${targetEnc.name} (${targetEnc.id}).`,
              completedAt: now.toISOString(),
              assignedBy: 'QR Scanner Field Log'
            };
            handleAddTask(newTask);
          }}
        />
      )}
    </>
  );
}
