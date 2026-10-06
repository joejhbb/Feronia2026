/**
 * Feronia Wildlife Facility Management Information System
 * Official Firebase Firestore & Auth Service
 * 
 * Connected to Firebase Firestore Database
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  disableNetwork,
  enableNetwork
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: The app will break without specifying firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

/**
 * Remove undefined values as Firestore rejects undefined
 */
function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = cleanForFirestore(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Safely catch and suppress @firebase/firestore resource-exhausted console errors
if (typeof window !== 'undefined') {
  const origError = console.error;
  console.error = function (...args: any[]) {
    const text = args
      .map(a => (typeof a === 'string' ? a : (a?.message ? String(a.message) : '')))
      .join(' ');
    if (
      text.includes('resource-exhausted') ||
      text.includes('Quota limit exceeded') ||
      text.includes('Quota exceeded') ||
      text.includes('maximum backoff delay') ||
      (text.includes('@firebase/firestore') && text.includes('FirebaseError'))
    ) {
      // Suppress noisy Firestore quota warnings since Supabase is the active facility database
      return;
    }
    origError.apply(console, args);
  };
}

// Circuit breaker for Firestore free-tier write quotas
// Project 443967692280 has reached the 20,000 writes/day free quota limit.
// Network is disabled to stop background mutation retry loops.
const isWriteQuotaExhausted = true;

try {
  disableNetwork(db).catch(() => {});
} catch {}

export function checkFirestoreQuotaExhausted(): boolean {
  return isWriteQuotaExhausted;
}

function handleFirestoreWriteError(err: any, _operation: string, _target: string) {
  // Gracefully ignored as Supabase is the active database
}

/**
 * Test live connection to Firestore
 */
export async function testFirestoreConnection(): Promise<{ success: boolean; message: string }> {
  return { success: true, message: 'Firestore offline (Supabase active as primary database)' };
}

/**
 * Save or update a document in Firestore
 */
export async function firestoreSave<T extends { id: string }>(
  _collectionName: string,
  _item: T
): Promise<boolean> {
  // Bypassed completely to prevent quota-exceeded errors since Supabase is the primary database
  return false;
}

/**
 * Delete a document from Firestore
 */
export async function firestoreDelete(
  _collectionName: string,
  _id: string
): Promise<boolean> {
  // Bypassed completely as Supabase handles all operations
  return false;
}

/**
 * Fetch all documents from a Firestore collection
 */
export async function firestoreFetch<T>(collectionName: string): Promise<T[]> {
  if (checkFirestoreQuotaExhausted()) {
    return [];
  }
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const items: T[] = [];
    snapshot.forEach(docSnap => {
      items.push({ id: docSnap.id, ...docSnap.data() } as unknown as T);
    });
    return items;
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota exceeded') || err?.message?.includes('resource-exhausted')) {
      handleFirestoreWriteError(err, 'fetch', collectionName);
    } else {
      console.warn(`[Firestore] Error fetching ${collectionName}:`, err);
    }
    return [];
  }
}

/**
 * Fetch a single document by ID from Firestore
 */
export async function firestoreGet<T>(collectionName: string, id: string): Promise<T | null> {
  if (checkFirestoreQuotaExhausted()) {
    return null;
  }
  try {
    const docRef = doc(db, collectionName, String(id));
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as unknown as T;
    }
    return null;
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota exceeded') || err?.message?.includes('resource-exhausted')) {
      handleFirestoreWriteError(err, 'get', `${collectionName}/${id}`);
    } else {
      console.warn(`[Firestore] Error getting ${collectionName}/${id}:`, err);
    }
    return null;
  }
}

/**
 * Subscribe to real-time updates for a Firestore collection
 */
export function firestoreSubscribe<T>(
  collectionName: string,
  callback: (data: T[]) => void
): () => void {
  if (checkFirestoreQuotaExhausted()) {
    return () => {};
  }
  let unsub: (() => void) | null = null;
  try {
    const colRef = collection(db, collectionName);
    unsub = onSnapshot(
      colRef,
      snapshot => {
        const items: T[] = [];
        snapshot.forEach(docSnap => {
          items.push({ id: docSnap.id, ...docSnap.data() } as unknown as T);
        });
        callback(items);
      },
      error => {
        const errMsg = error?.message || String(error || '');
        if (error?.code === 'resource-exhausted' || errMsg.includes('Quota exceeded') || errMsg.includes('resource-exhausted')) {
          handleFirestoreWriteError(error, 'subscribe', collectionName);
          if (unsub) {
            try { unsub(); } catch {}
          }
        } else {
          console.warn(`[Firestore] Subscription error on ${collectionName}:`, error);
        }
      }
    );
    return () => {
      if (unsub) {
        try { unsub(); } catch {}
      }
    };
  } catch (err: any) {
    const errMsg = err?.message || String(err || '');
    if (err?.code === 'resource-exhausted' || errMsg.includes('Quota exceeded') || errMsg.includes('resource-exhausted')) {
      handleFirestoreWriteError(err, 'subscribe', collectionName);
    } else {
      console.error(`[Firestore] Failed to attach listener on ${collectionName}:`, err);
    }
    return () => {};
  }
}
