import { Router, Request, Response } from 'express';
import { adminDb } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { validatePayload, TelemetryPayload } from '../middleware/validatePayload.js';
import { validateDevice } from '../middleware/validateDevice.js';
import {
  evaluateTelemetryAlerts,
  evaluateGeofenceBreach,
  clearOpenAlerts,
} from '../services/alertService.js';

const router = Router();

// Normalise optional fields the collar firmware does not always send
// (TrackerRecord only carries deviceId/apiKey/livestockId/lat/lng/accuracy/
// battery/movement/timestamp/gpsStatus).
function normalizePayload(payload: TelemetryPayload) {
  const collarId =
    typeof payload.collarId === 'string' && payload.collarId.trim() !== '' ? payload.collarId : payload.deviceId;
  const temperature = typeof payload.temperature === 'number' ? payload.temperature : 0;
  const signalStrength = typeof payload.signalStrength === 'number' ? payload.signalStrength : 0;
  return { collarId, temperature, signalStrength };
}

/**
 * Whether this payload carries a usable position.
 *
 * The collar deliberately uploads NO_FIX records — they prove it is alive and
 * carry battery/movement telemetry even when GNSS saw nothing. What they do
 * NOT carry is a location: latitude and longitude are left at their 0.0
 * defaults. Storing those as a real position drops the animal on Null Island,
 * drags the livestock marker with it, and reads as thousands of kilometres
 * outside any geofence.
 */
function hasUsablePosition(payload: TelemetryPayload): boolean {
  if (payload.gpsStatus === 'NO_FIX') return false;
  if (typeof payload.latitude !== 'number' || typeof payload.longitude !== 'number') return false;
  if (Number.isNaN(payload.latitude) || Number.isNaN(payload.longitude)) return false;
  // Exactly 0,0 is the firmware's unset default, not a real fix in the
  // Gulf of Guinea. No livestock operation is plausibly located there.
  if (payload.latitude === 0 && payload.longitude === 0) return false;
  return true;
}

/**
 * Resolves the livestock document for a collar, scoped to the collar's own farm.
 *
 * livestockId is only unique WITHIN a farm — generateLivestockId() numbers from
 * GT-0001 per farm, so every farm's first animal is called GT-0001. The old
 * lookup queried livestockId across the whole collection with `.limit(1)`, and
 * Firestore promises no ordering without an orderBy, so a collar belonging to
 * one farm could resolve to a different farm's animal, write its position into
 * that document, and then adopt that farm's uid for the gpsHistory row and
 * every alert that followed. One farm's herd would surface on a stranger's map.
 *
 * The farm match is therefore a hard filter, not a ranking: an authenticated
 * collar never touches a document outside its own farm, and if nothing matches
 * inside the farm we return null rather than reaching for the next best thing.
 * Ordering within the farm is only to keep genuine intra-farm duplicates stable.
 */
async function resolveLivestockDoc(payload: TelemetryPayload, deviceFarmUid: string) {
  const livestockRef = adminDb.collection('livestock');

  let snap = await livestockRef.where('livestockId', '==', payload.livestockId).get();
  if (snap.empty && payload.collarId) {
    snap = await livestockRef.where('collarId', '==', payload.collarId).get();
  }
  if (snap.empty) return null;

  // 'system' means the collar authenticated on the legacy shared key and has
  // no farm of its own, so there is no boundary to enforce.
  const scoped =
    deviceFarmUid && deviceFarmUid !== 'system'
      ? snap.docs.filter((d) => d.data().farmUid === deviceFarmUid)
      : snap.docs;

  if (scoped.length === 0) {
    console.warn(
      `[upload] livestockId=${payload.livestockId} exists but not under farm ${deviceFarmUid}; ` +
        `refusing to write to another farm's document.`,
    );
    return null;
  }

  const toMs = (v: { toDate?: () => Date } | undefined) =>
    v && typeof v.toDate === 'function' ? v.toDate().getTime() : 0;

  const candidates = scoped.slice().sort((a, b) => {
    const da = a.data();
    const dbb = b.data();

    const reportA = toMs(da.lastReportAt) > 0 ? 0 : 1;
    const reportB = toMs(dbb.lastReportAt) > 0 ? 0 : 1;
    if (reportA !== reportB) return reportA - reportB;

    const createdA = toMs(da.createdAt);
    const createdB = toMs(dbb.createdAt);
    if (createdA !== createdB) return createdA - createdB;

    return a.id < b.id ? -1 : 1;
  });

  if (candidates.length > 1) {
    console.warn(
      `[upload] ${candidates.length} livestock docs share livestockId=${payload.livestockId} ` +
        `within farm ${deviceFarmUid}; using ${candidates[0].id}.`,
    );
  }

  return candidates[0];
}

/**
 * POST /api/device/location
 * One-time GPS registration handshake (STATE: REGISTER in firmware).
 * A live fix flips the device to registrationStatus: 'gps_confirmed' and
 * stores its initial location; a NO_FIX payload returns 409 so the collar
 * retries on the next wake.
 */
router.post('/location', validateDevice, async (req: Request, res: Response) => {
  try {
    const { deviceId, livestockId, latitude, longitude, gpsStatus } = req.body as Partial<TelemetryPayload>;

    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid or missing deviceId' });
    }

    const hasFix =
      gpsStatus === 'FIX' && typeof latitude === 'number' && typeof longitude === 'number' && (latitude !== 0 || longitude !== 0);

    if (!hasFix) {
      return res.status(409).json({ success: false, error: 'NO_FIX — retry registration on next wake' });
    }

    const devicesRef = adminDb.collection('devices');
    const deviceSnap = await devicesRef.where('deviceId', '==', deviceId).limit(1).get();

    if (!deviceSnap.empty) {
      await deviceSnap.docs[0].ref.update({
        registrationStatus: 'gps_confirmed',
        initialLatitude: latitude,
        initialLongitude: longitude,
        status: 'Online',
        livestockId: typeof livestockId === 'string' ? livestockId : deviceSnap.docs[0].data().livestockId || null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await devicesRef.add({
        deviceId,
        collarId: deviceId,
        livestockId: typeof livestockId === 'string' ? livestockId : null,
        status: 'Online',
        registrationStatus: 'gps_confirmed',
        initialLatitude: latitude,
        initialLongitude: longitude,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return res.status(200).json({ success: true, message: 'GPS fix confirmed' });
  } catch (error) {
    console.error('Error processing GPS registration:', error);
    return res.status(500).json({ success: false, error: 'Internal server error processing registration' });
  }
});

/**
 * POST /api/device/upload
 * The primary ESP32 telemetry ingestion endpoint.
 */
router.post('/upload', validateDevice, validatePayload, async (req: Request, res: Response) => {
  try {
    const payload = req.body as TelemetryPayload;
    const { collarId, temperature, signalStrength } = normalizePayload(payload);
    const positioned = hasUsablePosition(payload);

    // 1. Locate livestock document by livestockId or collarId
    let farmUid = req.device?.farmUid || 'system';
    let livestockDocId: string | null = null;

    const livestockDoc = await resolveLivestockDoc(payload, farmUid);

    if (livestockDoc) {
      livestockDocId = livestockDoc.id;
      // Only adopt the document's farm when the collar had none of its own
      // (legacy shared-key path). An authenticated collar keeps the farm it
      // authenticated as — otherwise a mis-resolved document could redirect
      // this farm's history and alerts into someone else's account.
      if (!req.device?.farmUid) {
        farmUid = livestockDoc.data().farmUid || farmUid;
      }

      // Update Livestock Document with real-time telemetry. A NO_FIX report
      // still proves the collar is alive and still carries battery, so
      // everything except the coordinates is written either way — the last
      // known position is left standing rather than overwritten with 0,0.
      const livestockUpdates: Record<string, unknown> = {
        battery: payload.battery,
        temperature,
        signalStrength,
        status: 'Online',
        gpsStatus: positioned ? 'Active' : 'No Fix',
        lastSeen: new Date().toLocaleTimeString(),
        lastReportAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (positioned) {
        livestockUpdates.lat = payload.latitude;
        livestockUpdates.lng = payload.longitude;
      }

      await livestockDoc.ref.update(livestockUpdates);
    }

    // 2. Store GPS History entry — only for real fixes. A NO_FIX row would be
    // a fabricated 0,0 waypoint in the animal's trail and would corrupt the
    // distance-travelled figure the analytics page derives from it.
    if (positioned) {
      const historyTimestamp = payload.timestamp || new Date().toISOString();

      // Uploads are at-least-once. If the TLS connection dies after we commit
      // but before the collar reads our 200, the collar keeps the record and
      // re-sends it on a later cycle — so the same reading arrives twice and
      // the trail grows a phantom waypoint that also inflates the distance
      // total. (deviceId, timestamp) identifies a reading uniquely: the
      // firmware stamps each one from the GNSS solution, or from NTP.
      const duplicate = await adminDb
        .collection('gpsHistory')
        .where('timestamp', '==', historyTimestamp)
        .limit(10)
        .get();

      const alreadyStored = duplicate.docs.some((d) => d.data().deviceId === payload.deviceId);

      if (alreadyStored) {
        console.log(
          `[upload] duplicate reading from ${payload.deviceId} at ${historyTimestamp} — ` +
            `already stored, skipping gpsHistory write`,
        );
      } else {
        await adminDb.collection('gpsHistory').add({
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed ?? 0,
          battery: payload.battery,
          temperature,
          signalStrength,
          timestamp: historyTimestamp,
          deviceId: payload.deviceId,
          livestockId: payload.livestockId,
          farmUid,
          // Real measurements the collar already sends and this route used to
          // discard. gpsAccuracy is the receiver's own hAcc estimate, so it
          // doubles as a confidence radius on the map.
          gpsAccuracy: typeof payload.gpsAccuracy === 'number' ? payload.gpsAccuracy : null,
          satellites: typeof payload.satellites === 'number' ? payload.satellites : null,
          movement: typeof payload.movement === 'boolean' ? payload.movement : null,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // 3. Update or Upsert Device Document
    const devicesRef = adminDb.collection('devices');
    const deviceSnap = await devicesRef.where('deviceId', '==', payload.deviceId).limit(1).get();

    if (!deviceSnap.empty) {
      const deviceDoc = deviceSnap.docs[0];
      const deviceData = deviceDoc.data();
      const updates: Record<string, unknown> = {
        battery: payload.battery,
        wifiSignal: signalStrength,
        temperature,
        lastSync: new Date().toLocaleTimeString(),
        status: 'Online',
        collarId,
        livestockId: payload.livestockId,
        updatedAt: FieldValue.serverTimestamp(),
      };

      // GPS registration handshake: the dashboard registers a collar as
      // 'pending' and blocks livestock-linking until this flip to 'gps_confirmed'.
      // The first live fix completes the handshake and is stored as the
      // collar's initial location — a NO_FIX must not confirm it, or the
      // handshake is satisfied by a collar that has never seen a satellite
      // and the device is pinned to 0,0 forever.
      if (deviceData.registrationStatus !== 'gps_confirmed' && positioned) {
        updates.registrationStatus = 'gps_confirmed';
        updates.initialLatitude = payload.latitude;
        updates.initialLongitude = payload.longitude;
      }

      await deviceDoc.ref.update(updates);
    } else {
      await devicesRef.add({
        deviceId: payload.deviceId,
        collarId,
        livestockId: payload.livestockId,
        farmUid,
        firmwareVersion: 'v2.1.0',
        battery: payload.battery,
        wifiSignal: signalStrength,
        temperature,
        lastSync: new Date().toLocaleTimeString(),
        status: 'Online',
        registrationStatus: positioned ? 'gps_confirmed' : 'pending',
        ...(positioned
          ? { initialLatitude: payload.latitude, initialLongitude: payload.longitude }
          : {}),
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // 4. Evaluate automated alerts
    await evaluateTelemetryAlerts(payload, farmUid, { temperature, collarId });

    // 5. Server-side geofence enforcement (raises/resolves geofenceBreach alerts).
    // Skipped without a real fix: 0,0 sits ~6000 km off the coast of Africa,
    // so every NO_FIX would read as a breach and alarm the farmer about an
    // animal that is most likely standing exactly where it was.
    if (positioned && payload.livestockId) {
      await evaluateGeofenceBreach({
        farmUid,
        livestockId: payload.livestockId,
        deviceId: payload.deviceId,
        latitude: payload.latitude,
        longitude: payload.longitude,
      });
    }

    // 6. The collar just reported, so any open offline alert is now resolved
    await clearOpenAlerts(farmUid, payload.livestockId, 'deviceOffline');

    return res.status(200).json({
      success: true,
      message: 'Telemetry uploaded and processed successfully',
      livestockDocId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing device upload:', error);
    return res.status(500).json({
      error: 'Internal server error processing telemetry',
    });
  }
});

export default router;
