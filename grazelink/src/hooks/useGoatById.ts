import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from './useAuth';
import { Goat } from '@/types/goat';

/**
 * Fetches a single goat record by document id in real time, verifying it
 * belongs to the signed-in farm before exposing it.
 */
export function useGoatById(id: string | undefined) {
  const { user } = useAuth();
  const [goat, setGoat] = useState<Goat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) {
      setGoat(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, 'goats', id);

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setGoat(null);
        } else {
          const data = snap.data() as Goat;
          setGoat(data.farmUid === user.uid ? { ...data, id: snap.id } : null);
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

  return { goat, loading, error };
}
