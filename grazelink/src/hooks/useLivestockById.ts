import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from './useAuth';
import { Livestock } from '@/types/livestock';

/**
 * Fetches a single livestock record by document id in real time, verifying it
 * belongs to the signed-in farm before exposing it.
 */
export function useLivestockById(id: string | undefined) {
  const { user } = useAuth();
  const [livestock, setLivestock] = useState<Livestock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) {
      setLivestock(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, 'livestock', id);

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setLivestock(null);
        } else {
          const data = snap.data() as Livestock;
          setLivestock(data.farmUid === user.uid ? { ...data, id: snap.id } : null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, id]);

  return { livestock, loading, error };
}
