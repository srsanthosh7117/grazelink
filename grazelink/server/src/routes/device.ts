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
// (TrackerRecord only carries deviceId/apiKey/goatId/lat/lng/accuracy/
// battery/movement/timestamp/gpsStatus).
function normalizePayload(payload: TelemetryPayload) {
  const collarId =
    typeof payload.collarId === 'string' && payload.collarId.trim() !== '' ? payload.collarId : payload.deviceId;
  const temperature = typeof payload.temperature === 'number' ? payload.temperature : 0;
  const signalStrength = typeof payload.signalStrength === 'number' ? payload.signalStrength : 0;
  return { collarId, temperature, signalStrength };
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
    const { deviceId, goatId, latitude, longitude, gpsStatus } = req.body as Partial<TelemetryPayload>;

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
        goatId: typeof goatId === 'string' ? goatId : deviceSnap.docs[0].data().goatId || null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await devicesRef.add({
        deviceId,
        collarId: deviceId,
        goatId: typeof goatId === 'string' ? goatId : null,
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

    // 1. Locate goat document by goatId or collarId
    const goatsRef = adminDb.collection('goats');
    let goatSnap = await goatsRef.where('goatId', '==', payload.goatId).limit(1).get();

    if (goatSnap.empty) {
      goatSnap = await goatsRef.where('collarId', '==', payload.collarId).limit(1).get();
    }

    let farmUid = req.device?.farmUid || 'system';
    let goatDocId: string | null = null;

    if (!goatSnap.empty) {
      const doc = goatSnap.docs[0];
      goatDocId = doc.id;
      farmUid = doc.data().farmUid || farmUid;

      // Update Goat Document with real-time telemetry
      await doc.ref.update({
        lat: payload.latitude,
        lng: payload.longitude,
        battery: payload.battery,
        temperature,
        signalStrength,
        status: 'Online',
        gpsStatus: 'Active',
        lastSeen: new Date().toLocaleTimeString(),
        lastReportAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // 2. Store GPS History entry
    await adminDb.collection('gpsHistory').add({
      latitude: payload.latitude,
      longitude: payload.longitude,
      speed: payload.speed ?? 0,
      battery: payload.battery,
      temperature,
      signalStrength,
      timestamp: payload.timestamp || new Date().toISOString(),
      deviceId: payload.deviceId,
      goatId: payload.goatId,
      farmUid,
      createdAt: FieldValue.serverTimestamp(),
    });

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
        goatId: payload.goatId,
        updatedAt: FieldValue.serverTimestamp(),
      };

      // GPS registration handshake: the dashboard registers a collar as
      // 'pending' and blocks goat-linking until this flip to 'gps_confirmed'.
      // The first live fix completes the handshake and is stored as the
      // collar's initial location.
      if (deviceData.registrationStatus !== 'gps_confirmed') {
        updates.registrationStatus = 'gps_confirmed';
        updates.initialLatitude = payload.latitude;
        updates.initialLongitude = payload.longitude;
      }

      await deviceDoc.ref.update(updates);
    } else {
      await devicesRef.add({
        deviceId: payload.deviceId,
        collarId,
        goatId: payload.goatId,
        farmUid,
        firmwareVersion: 'v2.1.0',
        battery: payload.battery,
        wifiSignal: signalStrength,
        temperature,
        lastSync: new Date().toLocaleTimeString(),
        status: 'Online',
        registrationStatus: 'gps_confirmed',
        initialLatitude: payload.latitude,
        initialLongitude: payload.longitude,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // 4. Evaluate automated alerts
    await evaluateTelemetryAlerts(payload, farmUid, { temperature, collarId });

    // 5. Server-side geofence enforcement (raises/resolves geofenceBreach alerts)
    if (payload.goatId && typeof payload.latitude === 'number' && typeof payload.longitude === 'number') {
      await evaluateGeofenceBreach({
        farmUid,
        goatId: payload.goatId,
        deviceId: payload.deviceId,
        latitude: payload.latitude,
        longitude: payload.longitude,
      });
    }

    // 6. The collar just reported, so any open offline alert is now resolved
    await clearOpenAlerts(farmUid, payload.goatId, 'deviceOffline');

    return res.status(200).json({
      success: true,
      message: 'Telemetry uploaded and processed successfully',
      goatDocId,
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
