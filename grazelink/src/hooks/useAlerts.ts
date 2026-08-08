import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from './useAuth';
import { Alert } from '@/types/alert';

export function useAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'alerts'), where('farmUid', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Alert)
          .filter((a) => a.dismissed !== true)
          .sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt));
        setAlerts(list);
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

  const unreadCount = alerts.filter((a) => !a.read).length;

  return { alerts, unreadCount, loading, error };
}

function createdAtMs(value: unknown): number {
  if (value == null) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  const t = new Date(value as string | number).getTime();
  return Number.isNaN(t) ? 0 : t;
}
