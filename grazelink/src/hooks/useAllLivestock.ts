import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from './useAuth';
import { Livestock } from '@/types/livestock';

/**
 * Live snapshot of the entire herd (realtime, no pagination). Updates the
 * dashboard the moment a collar uploads telemetry or the offline monitor
 * flags a livestock. Only for pages that genuinely need the full dataset, like
 * Overview, Analytics and Reports. For browse lists, prefer the paginated
 * useLivestock hook.
 */
export function useAllLivestock() {
  const { user } = useAuth();
  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLivestock([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'livestock'), where('farmUid', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setLivestock(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Livestock));
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

  return { livestock, loading, error };
}
