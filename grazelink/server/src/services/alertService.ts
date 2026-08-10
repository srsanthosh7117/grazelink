import { adminDb } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { TelemetryPayload } from '../middleware/validatePayload.js';
import { getFarmGeofenceSettings } from './farmSettingsService.js';
import { AlertType } from '../types/alert.js';

export async function evaluateTelemetryAlerts(
  payload: TelemetryPayload,
  farmUid: string,
  normalized: { temperature: number; collarId: string },
) {
  const alertsRef = adminDb.collection('alerts');
  const { temperature, collarId } = normalized;

  // Low Battery Alert
  if (payload.battery < 20) {
    await alertsRef.add({
      type: 'lowBattery',
      severity: 'warning',
      message: `Collar ${collarId} on goat ${payload.goatId} is at low battery (${payload.battery}%).`,
      goatId: payload.goatId,
      deviceId: payload.deviceId,
      farmUid,
      read: false,
      dismissed: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // High Temperature Alert
  if (temperature > 40) {
    await alertsRef.add({
      type: 'highTemperature',
      severity: 'critical',
      message: `High body temperature (${payload.temperature}°C) detected on goat ${payload.goatId}.`,
      goatId: payload.goatId,
      deviceId: payload.deviceId,
      farmUid,
      read: false,
      dismissed: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
}

/** Haversine distance between two coordinates, in metres. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Dismisses all open alerts of a given type for one goat. Queries by a single
 * `goatId` field (auto-indexed) and filters the rest in code to avoid needing
 * composite indexes in Firestore.
 */
export async function clearOpenAlerts(farmUid: string, goatId: string, type: AlertType) {
  if (!goatId) return;

  const snap = await adminDb.collection('alerts').where('goatId', '==', goatId).limit(200).get();
  const batch = adminDb.batch();
  let ops = 0;

  snap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.farmUid !== farmUid || data.type !== type) return;
    if (data.dismissed === true) return;
    batch.update(doc.ref, {
      dismissed: true,
      read: true,
      resolvedAt: FieldValue.serverTimestamp(),
    });
    ops++;
  });

  if (ops > 0) await batch.commit();
}

export interface GeofenceInput {
  farmUid: string;
  goatId: string;
  deviceId: string;
  latitude: number;
  longitude: number;
}

/**
 * Server-side geofence enforcement, evaluated on every telemetry upload.
 * When the collar is outside the farm's safe zone it raises a `geofenceBreach`
 * alert (deduped — one open alert per goat); once it returns inside, the open
 * breach alert is resolved automatically.
 */
export async function evaluateGeofenceBreach(input: GeofenceInput) {
  const { farmUid, goatId, deviceId, latitude, longitude } = input;
  if (!farmUid || !goatId) return;

  const settings = await getFarmGeofenceSettings(farmUid);
  if (!settings.enabled || settings.centerLat == null || settings.centerLng == null) return;

  const distance = distanceMeters(latitude, longitude, settings.centerLat, settings.centerLng);
  const alertsRef = adminDb.collection('alerts');

  if (distance <= settings.radiusM) {
    await clearOpenAlerts(farmUid, goatId, 'geofenceBreach');
    return;
  }

  const existing = await alertsRef.where('goatId', '==', goatId).limit(20).get();
  const alreadyOpen = existing.docs.some(
    (doc) =>
      doc.data().farmUid === farmUid &&
      doc.data().type === 'geofenceBreach' &&
      doc.data().dismissed !== true,
  );
  if (alreadyOpen) return;

  await alertsRef.add({
    type: 'geofenceBreach',
    severity: 'critical',
    message: `${goatId} left the ${Math.round(settings.radiusM)} m safe zone (${Math.round(distance)} m from the farm).`,
    goatId,
    deviceId: deviceId || null,
    farmUid,
    read: false,
    dismissed: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}
