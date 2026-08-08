import { useEffect, useState } from 'react';
import { fetchAllGoats } from '@/services/goats';
import { useAuth } from './useAuth';
import { Goat } from '@/types/goat';

/**
 * One-shot fetch of the entire herd (no realtime, no pagination).
 * Only for pages that genuinely need the full dataset, like Analytics
 * and Reports. For browse lists, prefer the paginated useGoats hook.
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

    let cancelled = false;
    setLoading(true);
    fetchAllGoats(user.uid)
      .then((list) => {
        if (!cancelled) {
          setGoats(list);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load goats.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { goats, loading, error };
}
