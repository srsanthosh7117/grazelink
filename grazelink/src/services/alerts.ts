import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { withTimeout } from '@/utils/withTimeout';
import { AlertType, AlertSeverity } from '@/types/alert';

const TIMEOUT_MESSAGE =
  'Could not update the alert. Please try again.';

const alertsRef = collection(db, 'alerts');

/** Marks an alert as read. */
export async function markAlertRead(alertId: string) {
  const ref = doc(db, 'alerts', alertId);
  return withTimeout(updateDoc(ref, { read: true }), 10000, TIMEOUT_MESSAGE);
}

/** Dismisses an alert (soft delete). */
export async function dismissAlert(alertId: string) {
  const ref = doc(db, 'alerts', alertId);
  return withTimeout(updateDoc(ref, { dismissed: true }), 10000, TIMEOUT_MESSAGE);
}

/** Permanently deletes an alert. */
export async function deleteAlert(alertId: string) {
  const ref = doc(db, 'alerts', alertId);
  return withTimeout(deleteDoc(ref), 10000, TIMEOUT_MESSAGE);
}

/** Returns a query for alerts belonging to a farm. */
export function alertsQuery(farmUid: string) {
  return query(alertsRef, where('farmUid', '==', farmUid));
}

/** Creates a new alert (e.g. geofence breach) for a farm. */
export async function createAlert(payload: {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  goatId?: string;
  deviceId?: string;
  farmUid: string;
}) {
  return withTimeout(
    addDoc(alertsRef, {
      ...payload,
      read: false,
      dismissed: false,
      createdAt: serverTimestamp(),
    }),
    10000,
    TIMEOUT_MESSAGE,
  );
}
