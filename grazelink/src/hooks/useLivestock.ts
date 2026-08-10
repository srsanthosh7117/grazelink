import { useEffect, useRef, useState, useCallback } from 'react';
import {
  collection,
  DocumentData,
  DocumentSnapshot,
  getCountFromServer,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from './useAuth';
import { Livestock } from '@/types/livestock';

function toLivestock(doc: DocumentSnapshot<DocumentData>): Livestock {
  return { id: doc.id, ...doc.data() } as Livestock;
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

/**
 * Farm herd query.
 *
 * Uses a single-field `farmUid` filter (auto-indexed, no composite index
 * required) and sorts client-side, so the list works regardless of which
 * Firestore indexes are deployed. The whole herd is streamed in real time.
 */
export function useLivestock() {
  const { user } = useAuth();
  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const lastDocRef = useRef<DocumentSnapshot<DocumentData> | null>(null);

  useEffect(() => {
    if (!user) {
      setLivestock([]);
      setLoading(false);
      setTotalCount(0);
      setHasMore(false);
      return;
    }

    setLoading(true);
    const ref = collection(db, 'livestock');
    const q = query(ref, where('farmUid', '==', user.uid));

    getCountFromServer(q)
      .then((snap) => setTotalCount(snap.data().count))
      .catch((err) => {
        console.warn('Livestock count query failed:', err);
        setTotalCount(null);
      });

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map(toLivestock)
          .sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt));
        setLivestock(list);
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] ?? null;
        setHasMore(false);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, refreshKey]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 250));
    } finally {
      setLoadingMore(false);
    }
  }, []);

  const reset = useCallback(() => setRefreshKey((k) => k + 1), []);

  return { livestock, loading, loadingMore, error, totalCount, hasMore, loadMore, reset };
}
