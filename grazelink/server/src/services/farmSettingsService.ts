import { adminDb } from '../config/firebase.js';

export interface FarmGeofenceSettings {
  enabled: boolean;
  radiusM: number;
  centerLat: number | null;
  centerLng: number | null;
}

const DEFAULTS: FarmGeofenceSettings = {
  enabled: false,
  radiusM: 500,
  centerLat: null,
  centerLng: null,
};

/**
 * Reads the geofence configuration for a farm from `farmSettings/{farmUid}`.
 * The dashboard writes this document (see src/hooks/useFarmGeofence.ts) so the
 * server can enforce the same safe zone that the GPS page displays.
 */
export async function getFarmGeofenceSettings(farmUid: string): Promise<FarmGeofenceSettings> {
  if (!farmUid || farmUid === 'system') return DEFAULTS;

  try {
    const snap = await adminDb.collection('farmSettings').doc(farmUid).get();
    if (!snap.exists) return DEFAULTS;

    const data = snap.data() ?? {};
    return {
      enabled: data.geofenceEnabled === true,
      radiusM:
        typeof data.geofenceRadiusM === 'number' && data.geofenceRadiusM > 0
          ? data.geofenceRadiusM
          : DEFAULTS.radiusM,
      centerLat: typeof data.geofenceCenterLat === 'number' ? data.geofenceCenterLat : null,
      centerLng: typeof data.geofenceCenterLng === 'number' ? data.geofenceCenterLng : null,
    };
  } catch (error) {
    console.error('Error loading farm geofence settings:', error);
    return DEFAULTS;
  }
}
