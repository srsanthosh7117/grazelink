import { Router, Request, Response } from 'express';
import { adminDb } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { validatePayload, TelemetryPayload } from '../middleware/validatePayload.js';
import { validateDevice } from '../middleware/validateDevice.js';
import { evaluateTelemetryAlerts } from '../services/alertService.js';

const router = Router();

/**
 * POST /api/device/upload
 * The primary ESP32 telemetry ingestion endpoint.
 */
router.post('/upload', validateDevice, validatePayload, async (req: Request, res: Response) => {
  try {
    const payload = req.body as TelemetryPayload;

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
        temperature: payload.temperature,
        signalStrength: payload.signalStrength,
        status: 'Online',
        gpsStatus: 'Active',
        lastSeen: new Date().toLocaleTimeString(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // 2. Store GPS History entry
    await adminDb.collection('gpsHistory').add({
      latitude: payload.latitude,
      longitude: payload.longitude,
      speed: payload.speed ?? 0,
      battery: payload.battery,
      temperature: payload.temperature,
      signalStrength: payload.signalStrength,
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
        wifiSignal: payload.signalStrength,
        temperature: payload.temperature,
        lastSync: new Date().toLocaleTimeString(),
        status: 'Online',
        collarId: payload.collarId,
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
        collarId: payload.collarId,
        goatId: payload.goatId,
        farmUid,
        firmwareVersion: 'v2.1.0',
        battery: payload.battery,
        wifiSignal: payload.signalStrength,
        temperature: payload.temperature,
        lastSync: new Date().toLocaleTimeString(),
        status: 'Online',
        registrationStatus: 'gps_confirmed',
        initialLatitude: payload.latitude,
        initialLongitude: payload.longitude,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // 4. Evaluate automated alerts
    await evaluateTelemetryAlerts(payload, farmUid);

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
