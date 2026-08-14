import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { FarmHistoryGroup, getAllGpsHistory } from '@/services/gpsHistory';

const DEFAULT_POLL_MS = 30_000;

/**
 * Fetches the whole farm's GPS history in one query, grouped per livestock —
 * powers the map's "all collars" view where every collar's trail is plotted
 * at once. Polls like useGpsHistory and pauses while the tab is hidden.
 */
export function useAllGpsHistory(
  options?: { from?: Date; to?: Date; maxEntries?: number; pollMs?: number },
) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<FarmHistoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const from = options?.from;
  const to = options?.to;
  const maxEntries = options?.maxEntries;
  const pollMs = options?.pollMs ?? DEFAULT_POLL_MS;

  useEffect(() => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = (isRefresh: boolean) => {
      if (!isRefresh) setLoading(true);
      return getAllGpsHistory(user.uid, { from, to, maxEntries: maxEntries ?? 300 })
        .then((data) => {
          if (cancelled) return;
          setGroups(data);
          setError(null);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    load(false);

    if (pollMs <= 0) {
      return () => {
        cancelled = true;
      };
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load(true);
    }, pollMs);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') load(true);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user, from, to, maxEntries, pollMs]);

  return { groups, loading, error };
}
