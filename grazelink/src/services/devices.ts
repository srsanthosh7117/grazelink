import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Device, DevicePayload } from '@/types/device';
import { withTimeout } from '@/utils/withTimeout';

const TIMEOUT_MESSAGE =
  'This is taking too long to reach the database. Please check your internet connection and try again.';

const devicesRef = collection(db, 'devices');

/**
 * Generates a cryptographically random per-device API key, e.g.
 * "gzl_9f3a1c2e8b4d6f01a7c5e9b2d4f6a8c0". This is what the collar
 * firmware sends as the `x-api-key` header on every telemetry upload,
 * and what the backend's validateDevice middleware checks against the
 * matching `devices` document — so each collar has its own secret and
 * a compromised one can be rotated without affecting the rest of the farm.
 */
function generateApiKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `gzl_${hex}`;
}

/** Registers a new smart collar device for a farm and issues it a fresh API key.
 *  The device starts in `registrationStatus: 'pending'` — it becomes
 *  linkable only after the collar reports its first GPS fix. */
export async function registerDevice(farmUid: string, payload: DevicePayload) {
  const apiKey = generateApiKey();
  const docRef = await withTimeout(
    addDoc(devicesRef, {
      ...payload,
      farmUid,
      apiKey,
      registrationStatus: 'pending',
      initialLatitude: null,
      initialLongitude: null,
      createdAt: serverTimestamp(),
    }),
    15000,
    TIMEOUT_MESSAGE,
  );
  return { docRef, apiKey };
}

/** Reads a single device record — used to poll a fresh collar until its
 *  GPS registration handshake flips it to 'gps_confirmed'. */
export async function getDevice(deviceDocId: string): Promise<Device | null> {
  const ref = doc(db, 'devices', deviceDocId);
  const snap = await withTimeout(getDoc(ref), 15000, TIMEOUT_MESSAGE);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Device;
}

export async function updateDevice(
  deviceDocId: string,
  payload: Partial<DevicePayload>,
) {
  const ref = doc(db, 'devices', deviceDocId);
  return withTimeout(updateDoc(ref, payload), 15000, TIMEOUT_MESSAGE);
}

/** Rotates a device's API key — use if a collar's key may have leaked.
 *  The old key stops working the moment this write lands. */
export async function regenerateDeviceApiKey(deviceDocId: string) {
  const apiKey = generateApiKey();
  const ref = doc(db, 'devices', deviceDocId);
  await withTimeout(updateDoc(ref, { apiKey }), 15000, TIMEOUT_MESSAGE);
  return apiKey;
}

export async function deleteDevice(deviceDocId: string) {
  const ref = doc(db, 'devices', deviceDocId);
  return withTimeout(deleteDoc(ref), 15000, TIMEOUT_MESSAGE);
}
