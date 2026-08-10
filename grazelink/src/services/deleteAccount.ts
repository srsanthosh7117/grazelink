import {
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { withTimeout } from '@/utils/withTimeout';

const COLLECTIONS = ['livestock', 'devices', 'gpsHistory', 'alerts'] as const;

/**
 * Permanently deletes the signed-in farm's account:
 *  1. Re-authenticates with the account password (Firebase requires a
 *     recent login before an account can be deleted).
 *  2. Deletes every farm-owned document (profile, livestock, devices,
 *     gpsHistory, alerts) in batches.
 *  3. Deletes the Firebase Auth user, which also signs the client out.
 */
export async function deleteFarmAccount(password: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('You are not signed in.');

  await withTimeout(
    reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email ?? '', password),
    ),
    15000,
    'Could not verify your password. Please try again.',
  );

  const farmUid = user.uid;

  await withTimeout(
    deleteDoc(doc(db, 'farms', farmUid)),
    15000,
    'Could not delete your farm profile. Please try again.',
  );

  for (const name of COLLECTIONS) {
    const snap = await getDocs(query(collection(db, name), where('farmUid', '==', farmUid)));
    for (let i = 0; i < snap.size; i += 400) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(doc(db, name, d.id)));
      await batch.commit();
    }
  }

  await withTimeout(
    deleteUser(user),
    15000,
    'Could not delete your account. Please try again.',
  );
}
