import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { GpsHistoryEntry } from '@/types/gpsHistory';
import { calculateDistance, getGpsHistory } from '@/services/gpsHistory';

export function useGpsHistory(
  livestockId?: string,
  options?: { from?: Date; to?: Date; maxEntries?: number },
) {
  const { user } = useAuth();
  const [history, setHistory] = useState<GpsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const from = options?.from;
  const to = options?.to;
  const maxEntries = options?.maxEntries;

  useEffect(() => {
    if (!user || !livestockId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getGpsHistory(livestockId, user.uid, { from, to, maxEntries: maxEntries ?? 300 })
      .then((data) => {
        setHistory(data);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [user, livestockId, from, to, maxEntries]);

  const totalDistance = calculateDistance(history);

  return { history, totalDistance, loading, error };
}
