import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from './useAuth';
import { Device } from '@/types/device';
import { getBatteryThreshold } from '@/utils/alertThresholds';

export function useDevices() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setDevices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'devices'), where('farmUid', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setDevices(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Device));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const onlineDevices = devices.filter((d) => d.status === 'Online').length;
  const offlineDevices = devices.filter((d) => d.status === 'Offline').length;
  const lowBatteryDevices = devices.filter(
    (d) => d.battery != null && d.battery < getBatteryThreshold()
  ).length;

  const avgBattery =
    devices.length > 0
      ? Math.round(devices.reduce((acc, d) => acc + (d.battery ?? 0), 0) / devices.length)
      : null;

  const avgTemperature =
    devices.length > 0
      ? Math.round((devices.reduce((acc, d) => acc + (d.temperature ?? 0), 0) / devices.length) * 10) / 10
      : null;

  return {
    devices,
    loading,
    error,
    onlineDevices,
    offlineDevices,
    lowBatteryDevices,
    avgBattery,
    avgTemperature,
  };
}
