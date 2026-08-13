import { adminDb } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { TelemetryPayload } from '../middleware/validatePayload.js';
import { getFarmGeofenceSettings } from './farmSettingsService.js';
import { AlertType } from '../types/alert.js';

// Alert thresholds. Each raise/clear pair has a deliberate gap: resolving at
// exactly the raise threshold would make a collar sitting on the boundary
// flap between raised and resolved on every single upload.
const LOW_BATTERY_PCT = 20;
const LOW_BATTERY_CLEAR_PCT = 25;
const HIGH_TEMP_C = 40;
const HIGH_TEMP_CLEAR_C = 39;

/**
 * Evaluates the per-upload telemetry alerts. Both conditions are stateful:
 * one open alert per livestock per type (a collar reporting every 20 minutes
 * would otherwise pile up a fresh row on every wake for as long as its
 * battery is flat), and the open alert is resolved automatically once the
 * reading recovers past its clear threshold.
 */
export async function evaluateTelemetryAlerts(
  payload: TelemetryPayload,
  farmUid: string,
  normalized: { temperature: number; collarId: string },
) {
  const alertsRef = adminDb.collection('alerts');
  const { collarId } = normalized;
  const livestockId = payload.livestockId;

  // --- Low battery -------------------------------------------------------
  // A collar reporting exactly 0% while successfully uploading over Wi-Fi is
  // not at 0% — it is a unit whose ADC divider is unwired or unpowered, which
  // reads as zero. Treating that as an emergency buries the farmer in alerts
  // about bench hardware. Firmware-side, BatteryMonitor::IsPresent() draws the
  // same distinction; this is the server's own guard for collars that predate
  // it or lose their divider in the field.
  if (payload.battery === 0) {
    // Nothing to raise and nothing to resolve — the reading is unusable.
  } else if (payload.battery < LOW_BATTERY_PCT) {
    if (!(await hasOpenAlert(farmUid, livestockId, 'lowBattery'))) {
      await alertsRef.add({
        type: 'lowBattery',
        severity: 'warning',
        message: `Collar ${collarId} on livestock ${livestockId} is at low battery (${payload.battery}%).`,
        livestockId,
        deviceId: payload.deviceId,
        farmUid,
        read: false,
        dismissed: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  } else if (payload.battery >= LOW_BATTERY_CLEAR_PCT) {
    // Recharged or swapped — close it out rather than leaving the farmer to
    // dismiss a warning about a battery that is now fine.
    await clearOpenAlerts(farmUid, livestockId, 'lowBattery');
  }

  // --- High temperature --------------------------------------------------
  // Only when the collar actually reported a reading. normalizePayload()
  // substitutes 0 for a missing temperature, and treating that as "cooled
  // down" would silently resolve a real fever alert — the current collar
  // firmware sends no temperature field at all.
  if (typeof payload.temperature === 'number') {
    const temperature = payload.temperature;

    if (temperature > HIGH_TEMP_C) {
      if (!(await hasOpenAlert(farmUid, livestockId, 'highTemperature'))) {
        await alertsRef.add({
          type: 'highTemperature',
          severity: 'critical',
          message: `High body temperature (${temperature}°C) detected on livestock ${livestockId}.`,
          livestockId,
          deviceId: payload.deviceId,
          farmUid,
          read: false,
          dismissed: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    } else if (temperature <= HIGH_TEMP_CLEAR_C) {
      await clearOpenAlerts(farmUid, livestockId, 'highTemperature');
    }
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
 * True when an unresolved alert of this type already exists for the livestock.
 * Same single-field query strategy as clearOpenAlerts below: filter on
 * `livestockId` (auto-indexed) and narrow in code, so no composite index is
 * needed.
 */
export async function hasOpenAlert(
  farmUid: string,
  livestockId: string,
  type: AlertType,
): Promise<boolean> {
  if (!livestockId) return false;

  const snap = await adminDb.collection('alerts').where('livestockId', '==', livestockId).limit(50).get();
  return snap.docs.some((doc) => {
    const data = doc.data();
    return data.farmUid === farmUid && data.type === type && data.dismissed !== true;
  });
}

/**
 * Dismisses all open alerts of a given type for one livestock. Queries by a single
 * `livestockId` field (auto-indexed) and filters the rest in code to avoid needing
 * composite indexes in Firestore.
 */
export async function clearOpenAlerts(farmUid: string, livestockId: string, type: AlertType) {
  if (!livestockId) return;

  const snap = await adminDb.collection('alerts').where('livestockId', '==', livestockId).limit(200).get();
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
  livestockId: string;
  deviceId: string;
  latitude: number;
  longitude: number;
}

/**
 * Server-side geofence enforcement, evaluated on every telemetry upload.
 * When the collar is outside the farm's safe zone it raises a `geofenceBreach`
 * alert (deduped — one open alert per livestock); once it returns inside, the open
 * breach alert is resolved automatically.
 */
export async function evaluateGeofenceBreach(input: GeofenceInput) {
  const { farmUid, livestockId, deviceId, latitude, longitude } = input;
  if (!farmUid || !livestockId) return;

  const settings = await getFarmGeofenceSettings(farmUid);
  if (!settings.enabled || settings.centerLat == null || settings.centerLng == null) return;

  const distance = distanceMeters(latitude, longitude, settings.centerLat, settings.centerLng);

  if (distance <= settings.radiusM) {
    await clearOpenAlerts(farmUid, livestockId, 'geofenceBreach');
    return;
  }

  if (await hasOpenAlert(farmUid, livestockId, 'geofenceBreach')) return;

  await adminDb.collection('alerts').add({
    type: 'geofenceBreach',
    severity: 'critical',
    message: `${livestockId} left the ${Math.round(settings.radiusM)} m safe zone (${Math.round(distance)} m from the farm).`,
    livestockId,
    deviceId: deviceId || null,
    farmUid,
    read: false,
    dismissed: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}
