import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { Livestock, LivestockPayload } from '@/types/livestock';
import { withTimeout } from '@/utils/withTimeout';

const TIMEOUT_MESSAGE =
  'This is taking too long to reach the database. Please check your internet connection and Firestore configuration, then try again.';

const livestockRef = collection(db, 'livestock');

/** Generates a unique livestock ID like GT-0001 */
export async function generateLivestockId(farmUid: string): Promise<string> {
  const q = query(livestockRef, where('farmUid', '==', farmUid));
  const snap = await getDocs(q);
  let nextNum = 1;
  for (const docSnap of snap.docs) {
    const livestockId = docSnap.data().livestockId as string | undefined;
    const match = typeof livestockId === 'string' ? livestockId.match(/GT-(\d+)/) : null;
    if (match) {
      const num = parseInt(match[1], 10);
      if (num + 1 > nextNum) nextNum = num + 1;
    }
  }
  return `GT-${String(nextNum).padStart(4, '0')}`;
}

/** One-shot fetch of the entire herd. Use sparingly on pages that need full data (reports/analytics). */
export async function fetchAllLivestock(farmUid: string): Promise<Livestock[]> {
  const q = query(livestockRef, where('farmUid', '==', farmUid));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Livestock);
  return list.sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt));
}

function createdAtMs(value: unknown): number {
  if (value == null) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  const t = new Date(value as string | number).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Registers a livestock under the given farm (uid) in top-level livestock
 * collection.
 *
 * Rejects a livestockId the farm already uses. The ingestion API resolves a
 * collar's telemetry by livestockId, so duplicates make it ambiguous which
 * document receives a position — and a duplicate also shows up as a phantom
 * second animal on the map, frozen at whatever coordinates it last held.
 */
export async function registerLivestock(farmUid: string, payload: LivestockPayload) {
  if (payload.livestockId) {
    const existing = await withTimeout(
      getDocs(query(livestockRef, where('farmUid', '==', farmUid))),
      15000,
      TIMEOUT_MESSAGE,
    );
    const clash = existing.docs.some((d) => d.data().livestockId === payload.livestockId);
    if (clash) {
      throw new Error(
        `Livestock ID "${payload.livestockId}" is already registered on this farm. Pick a different ID.`,
      );
    }
  }

  return withTimeout(
    addDoc(livestockRef, { ...payload, farmUid, createdAt: serverTimestamp() }),
    15000,
    TIMEOUT_MESSAGE,
  );
}

export async function updateLivestock(
  farmUid: string,
  livestockDocId: string,
  payload: Partial<LivestockPayload>,
) {
  const ref = doc(db, 'livestock', livestockDocId);
  return withTimeout(updateDoc(ref, payload), 15000, TIMEOUT_MESSAGE);
}

export async function deleteLivestock(farmUid: string, livestockDocId: string) {
  const ref = doc(db, 'livestock', livestockDocId);
  return withTimeout(deleteDoc(ref), 15000, TIMEOUT_MESSAGE);
}
