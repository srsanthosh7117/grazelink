import { adminDb } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { TelemetryPayload } from '../middleware/validatePayload.js';

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
