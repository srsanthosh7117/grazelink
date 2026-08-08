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
import { Goat, GoatPayload } from '@/types/goat';
import { withTimeout } from '@/utils/withTimeout';

const TIMEOUT_MESSAGE =
  'This is taking too long to reach the database. Please check your internet connection and Firestore configuration, then try again.';

const goatsRef = collection(db, 'goats');

/** Generates a unique goat ID like GT-0001 */
export async function generateGoatId(farmUid: string): Promise<string> {
  const q = query(goatsRef, where('farmUid', '==', farmUid));
  const snap = await getDocs(q);
  let nextNum = 1;
  for (const docSnap of snap.docs) {
    const goatId = docSnap.data().goatId as string | undefined;
    const match = typeof goatId === 'string' ? goatId.match(/GT-(\d+)/) : null;
    if (match) {
      const num = parseInt(match[1], 10);
      if (num + 1 > nextNum) nextNum = num + 1;
    }
  }
  return `GT-${String(nextNum).padStart(4, '0')}`;
}

/** One-shot fetch of the entire herd. Use sparingly on pages that need full data (reports/analytics). */
export async function fetchAllGoats(farmUid: string): Promise<Goat[]> {
  const q = query(goatsRef, where('farmUid', '==', farmUid));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Goat);
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

/** Registers a goat under the given farm (uid) in top-level goats collection. */export async function registerGoat(farmUid: string, payload: GoatPayload) {
  return withTimeout(
    addDoc(goatsRef, { ...payload, farmUid, createdAt: serverTimestamp() }),
    15000,
    TIMEOUT_MESSAGE,
  );
}

export async function updateGoat(
  farmUid: string,
  goatDocId: string,
  payload: Partial<GoatPayload>,
) {
  const ref = doc(db, 'goats', goatDocId);
  return withTimeout(updateDoc(ref, payload), 15000, TIMEOUT_MESSAGE);
}

export async function deleteGoat(farmUid: string, goatDocId: string) {
  const ref = doc(db, 'goats', goatDocId);
  return withTimeout(deleteDoc(ref), 15000, TIMEOUT_MESSAGE);
}
