import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from './useAuth';
import { Goat } from '@/types/goat';

/**
 * Live snapshot of the entire herd (realtime, no pagination). Updates the
 * dashboard the moment a collar uploads telemetry or the offline monitor
 * flags a goat. Only for pages that genuinely need the full dataset, like
 * Overview, Analytics and Reports. For browse lists, prefer the paginated
 * useGoats hook.
 */
export function useAllGoats() {
  const { user } = useAuth();
  const [goats, setGoats] = useState<Goat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setGoats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'goats'), where('farmUid', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setGoats(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Goat));
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

  return { goats, loading, error };
}
