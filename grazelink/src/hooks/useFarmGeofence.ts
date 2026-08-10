import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from './useAuth';
import { GeoPoint, getGeofenceRadius } from './useGeofence';

export interface FarmGeofenceSettings {
  enabled: boolean;
  radiusM: number;
  center: GeoPoint | null;
}

/**
 * Server-backed geofence configuration, stored on `farmSettings/{farmUid}` so
 * the ingestion API can enforce the safe zone on every collar report. The GPS
 * page reads the same document, keeping the map, settings and server in sync.
 *
 * The legacy localStorage radius is used as a fallback default so existing
 * installs keep their boundary until a cloud copy is saved.
 */
export function useFarmGeofence() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<FarmGeofenceSettings>(() => ({
    enabled: false,
    radiusM: getGeofenceRadius(),
    center: null,
  }));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSettings({ enabled: false, radiusM: getGeofenceRadius(), center: null });
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, 'farmSettings', user.uid);
    const unsubscribe = onSnapshot(
      ref,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings({
            enabled: data.geofenceEnabled === true,
            radiusM:
              typeof data.geofenceRadiusM === 'number' && data.geofenceRadiusM > 0
                ? data.geofenceRadiusM
                : getGeofenceRadius(),
            center:
              typeof data.geofenceCenterLat === 'number' &&
              typeof data.geofenceCenterLng === 'number'
                ? { lat: data.geofenceCenterLat, lng: data.geofenceCenterLng }
                : null,
          });
        } else {
          setSettings({ enabled: false, radiusM: getGeofenceRadius(), center: null });
        }
        setLoading(false);
      },
      () => {
        setSettings({ enabled: false, radiusM: getGeofenceRadius(), center: null });
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const saveFarmGeofence = useCallback(
    async (patch: { enabled?: boolean; radiusM?: number; center?: GeoPoint | null }) => {
      if (!user) return;
      const ref = doc(db, 'farmSettings', user.uid);
      const data: Record<string, unknown> = {};
      if (patch.enabled !== undefined) data.geofenceEnabled = patch.enabled;
      if (patch.radiusM !== undefined) data.geofenceRadiusM = patch.radiusM;
      if (patch.center !== undefined) {
        data.geofenceCenterLat = patch.center ? patch.center.lat : null;
        data.geofenceCenterLng = patch.center ? patch.center.lng : null;
      }
      await setDoc(ref, data, { merge: true });
    },
    [user]
  );

  return { ...settings, loading, saveFarmGeofence };
}
