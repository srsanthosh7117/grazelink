import { adminDb } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

// How long a collar may go silent before its livestock is flagged offline.
const OFFLINE_TIMEOUT_MS = Number(process.env.OFFLINE_TIMEOUT_MS || 10 * 60 * 1000);

/**
 * Scans the herd for collars that have stopped reporting. A livestock is marked
 * Offline once `lastReportAt` is older than OFFLINE_TIMEOUT_MS, and a
 * deduped `deviceOffline` alert is raised (one open alert per livestock). Livestock
 * that never reported (no `lastReportAt`, e.g. unprovisioned) are skipped.
 *
 * Queries use a single-field filter (`lastReportAt != null`) so no composite
 * Firestore indexes are required.
 */
export async function runOfflineCheck() {
  const cutoff = new Date(Date.now() - OFFLINE_TIMEOUT_MS);

  try {
    const snap = await adminDb.collection('livestock').where('lastReportAt', '!=', null).get();
    const alertsRef = adminDb.collection('alerts');

    let batch = adminDb.batch();
    let ops = 0;

    const commit = async () => {
      if (ops > 0) await batch.commit();
      batch = adminDb.batch();
      ops = 0;
    };

    for (const doc of snap.docs) {
      const data = doc.data();

      const lastReport = data.lastReportAt?.toDate ? data.lastReportAt.toDate() : data.lastReportAt;
      if (!(lastReport instanceof Date) || Number.isNaN(lastReport.getTime())) continue;
      if (lastReport.getTime() > cutoff.getTime()) continue; // recently reported
      if (data.status === 'Offline') continue;

      const livestockId = data.livestockId;
      const farmUid = data.farmUid || 'system';

      batch.update(doc.ref, { status: 'Offline', updatedAt: FieldValue.serverTimestamp() });
      ops++;

      // Keep the linked device document in sync so the dashboard's fleet
      // health panel shows the same offline status.
      if (data.deviceId) {
        const devSnap = await adminDb
          .collection('devices')
          .where('deviceId', '==', data.deviceId)
          .limit(1)
          .get();
        if (!devSnap.empty) {
          batch.update(devSnap.docs[0].ref, { status: 'Offline', updatedAt: FieldValue.serverTimestamp() });
          ops++;
        }
      }

      if (livestockId) {
        const existing = await alertsRef.where('livestockId', '==', livestockId).limit(20).get();
        const alreadyOpen = existing.docs.some(
          (alertDoc) =>
            alertDoc.data().farmUid === farmUid &&
            alertDoc.data().type === 'deviceOffline' &&
            alertDoc.data().dismissed !== true,
        );

        if (!alreadyOpen) {
          batch.set(alertsRef.doc(), {
            type: 'deviceOffline',
            severity: 'warning',
            message: `Collar ${data.collarId || livestockId} on livestock ${livestockId} stopped reporting. Last seen ${lastReport.toLocaleString()}.`,
            livestockId,
            deviceId: data.deviceId || null,
            farmUid,
            read: false,
            dismissed: false,
            createdAt: FieldValue.serverTimestamp(),
          });
          ops++;
        }
      }

      if (ops >= 400) await commit();
    }

    await commit();
    console.log(`[offlineMonitor] Check complete (${snap.size} tracked livestock, cutoff ${cutoff.toISOString()})`);
  } catch (error) {
    console.error('[offlineMonitor] Error running offline check:', error);
  }
}

let started = false;

/** Starts the periodic offline monitor. Safe to call more than once. */
export function startOfflineMonitor() {
  if (started) return;
  started = true;

  const intervalMs = Number(process.env.OFFLINE_CHECK_MS || 5 * 60 * 1000);

  runOfflineCheck();
  const id = setInterval(() => {
    runOfflineCheck();
  }, intervalMs);

  // Don't keep the Node process alive on the interval alone (tests).
  if (typeof (id as unknown as { unref?: () => void }).unref === 'function') {
    (id as unknown as { unref: () => void }).unref();
  }

  console.log(`[offlineMonitor] Started (every ${Math.round(intervalMs / 60000)}m, timeout ${Math.round(OFFLINE_TIMEOUT_MS / 60000)}m)`);
}
