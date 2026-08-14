import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { GpsHistoryEntry } from '@/types/gpsHistory';

const gpsRef = collection(db, 'gpsHistory');

export interface FarmHistoryGroup {
  livestockId: string;
  entries: GpsHistoryEntry[];
}

/** Shared fetch+clean pipeline: one farm-wide query, then client-side guards. */
async function fetchFarmHistory(
  farmUid: string,
  options?: { from?: Date; to?: Date; maxEntries?: number },
): Promise<GpsHistoryEntry[]> {
  const q = query(gpsRef, where('farmUid', '==', farmUid));
  const snap = await getDocs(q);

  const fromMs = options?.from ? options.from.getTime() : null;
  const toMs = options?.to ? options.to.getTime() : null;

  const seen = new Set<string>();

  let entries = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as GpsHistoryEntry)
    .filter((e) => {
      if (typeof e.latitude !== 'number' || typeof e.longitude !== 'number') return false;
      if (e.latitude === 0 && e.longitude === 0) return false;

      const ms = new Date(e.timestamp).getTime();
      if (Number.isNaN(ms)) return false;
      if (fromMs != null && ms < fromMs) return false;
      if (toMs != null && ms > toMs) return false;

      const key = `${e.deviceId}|${e.timestamp}`;
      if (seen.has(key)) return false;
      seen.add(key);

      return true;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const max = options?.maxEntries ?? 500;
  if (entries.length > max) entries = entries.slice(0, max);

  return entries;
}

/**
 * Fetches GPS history for a specific livestock within an optional date range.
 * Uses a single-field `farmUid` filter (no composite index required) and
 * filters/sorts client-side.
 */
export async function getGpsHistory(
  livestockId: string,
  farmUid: string,
  options?: { from?: Date; to?: Date; maxEntries?: number },
): Promise<GpsHistoryEntry[]> {
  const all = await fetchFarmHistory(farmUid, options);
  const filtered = all.filter((e) => e.livestockId === livestockId);
  const max = options?.maxEntries ?? 500;
  return filtered.length > max ? filtered.slice(0, max) : filtered;
}

/**
 * Fetches the farm's entire GPS history in one query and groups it per
 * livestock — used by the map's "all collars" view so every trail can be
 * plotted in a single round trip instead of one query per collar.
 */
export async function getAllGpsHistory(
  farmUid: string,
  options?: { from?: Date; to?: Date; maxEntries?: number },
): Promise<FarmHistoryGroup[]> {
  const all = await fetchFarmHistory(farmUid, options);
  const byLivestock = new Map<string, GpsHistoryEntry[]>();
  for (const e of all) {
    const list = byLivestock.get(e.livestockId) ?? [];
    list.push(e);
    byLivestock.set(e.livestockId, list);
  }
  const max = options?.maxEntries ?? 300;
  return [...byLivestock.entries()].map(([livestockId, entries]) => ({
    livestockId,
    entries: entries.slice(0, max),
  }));
}

/** Calculates total distance in km from GPS entries using Haversine formula. */
export function calculateDistance(entries: GpsHistoryEntry[]): number {
  if (entries.length < 2) return 0;
  let total = 0;
  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  for (let i = 1; i < sorted.length; i++) {
    total += haversine(
      sorted[i - 1].latitude,
      sorted[i - 1].longitude,
      sorted[i].latitude,
      sorted[i].longitude,
    );
  }
  return Math.round(total * 100) / 100;
}

/** Haversine formula — distance between two GPS coordinates in kilometers. */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
