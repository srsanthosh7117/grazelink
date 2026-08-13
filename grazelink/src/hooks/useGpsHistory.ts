import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { GpsHistoryEntry } from '@/types/gpsHistory';
import { calculateDistance, getGpsHistory } from '@/services/gpsHistory';

/**
 * How often the trail is re-fetched while the tab is in the foreground.
 * Collars report every 20 minutes, so this is far finer-grained than the
 * data itself changes — it exists so a dashboard left open on the GPS page
 * picks up new points without the farmer reloading.
 */
const DEFAULT_POLL_MS = 30_000;

export function useGpsHistory(
  livestockId?: string,
  options?: { from?: Date; to?: Date; maxEntries?: number; pollMs?: number },
) {
  const { user } = useAuth();
  const [history, setHistory] = useState<GpsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const from = options?.from;
  const to = options?.to;
  const maxEntries = options?.maxEntries;
  const pollMs = options?.pollMs ?? DEFAULT_POLL_MS;

  useEffect(() => {
    if (!user || !livestockId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    // Guards against a slow response for a livestock the user has already
    // navigated away from overwriting the current one's trail.
    let cancelled = false;

    const load = (isRefresh: boolean) => {
      if (!isRefresh) setLoading(true);
      return getGpsHistory(livestockId, user.uid, { from, to, maxEntries: maxEntries ?? 300 })
        .then((data) => {
          if (cancelled) return;
          setHistory(data);
          setError(null);
        })
        .catch((err) => {
          if (cancelled) return;
          // A failed refresh keeps the last good trail on screen rather than
          // blanking a map the farmer is looking at.
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

    // Polling pauses while the tab is hidden: every poll re-reads the farm's
    // gpsHistory collection, and there is no point paying for that against a
    // dashboard nobody is looking at.
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load(true);
    }, pollMs);

    // Coming back to a backgrounded tab, the trail on screen is as stale as
    // however long it was hidden — refresh immediately rather than waiting
    // out the rest of the interval.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') load(true);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user, livestockId, from, to, maxEntries, pollMs]);

  const totalDistance = calculateDistance(history);

  return { history, totalDistance, loading, error };
}
