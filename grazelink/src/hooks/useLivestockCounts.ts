import { useEffect, useState } from 'react';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from './useAuth';

type Counts = {
  total: number | null;
  healthy: number | null;
  sick: number | null;
  gps: number | null;
};

const EMPTY: Counts = { total: null, healthy: null, sick: null, gps: null };

/**
 * Aggregate herd statistics. Only the total count is queried server-side
 * (single-field `farmUid` filter — no composite index required). Health and
 * GPS breakdowns are null here and computed client-side from the herd array
 * by callers that already have the livestock loaded.
 */
export function useLivestockCounts() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Counts>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCounts({ total: 0, healthy: 0, sick: 0, gps: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = collection(db, 'livestock');
    const q = query(ref, where('farmUid', '==', user.uid));

    getCountFromServer(q)
      .then((snap) => {
        setCounts({ total: snap.data().count, healthy: null, sick: null, gps: null });
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Livestock count query failed:', err);
        setCounts(EMPTY);
        setLoading(false);
      });
  }, [user]);

  return { ...counts, loading };
}
