import { useCallback, useEffect, useState } from 'react';
import { Livestock } from '@/types/livestock';

const STORAGE_KEY = 'grazelink_geofence_radius';
const DEFAULT_RADIUS = 500;

export function getGeofenceRadius(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = raw != null ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RADIUS;
}

export function setGeofenceRadius(radius: number) {
  localStorage.setItem(STORAGE_KEY, String(radius));
}

/** Live geofence radius, persisted to localStorage so Settings and the GPS page stay in sync. */
export function useGeofenceSettings() {
  const [radius, setRadius] = useState<number>(() => getGeofenceRadius());

  const updateRadius = useCallback((next: number) => {
    setRadius(next);
    setGeofenceRadius(next);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRadius(getGeofenceRadius());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { radius, setRadius: updateRadius };
}

/** Haversine distance between two coordinates, in meters. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Farm centre = centroid of all livestock with a live GPS fix. Falls back to null when none are located. */
export function farmCenterOf(livestock: Livestock[]): GeoPoint | null {
  const located = livestock.filter((g) => g.lat != null && g.lng != null) as (Livestock & {
    lat: number;
    lng: number;
  })[];
  if (located.length === 0) return null;
  const sumLat = located.reduce((s, g) => s + g.lat, 0);
  const sumLng = located.reduce((s, g) => s + g.lng, 0);
  return { lat: sumLat / located.length, lng: sumLng / located.length };
}

export interface BreachStatus {
  breached: boolean;
  distanceM: number;
}

export function geofenceStatus(livestock: Livestock, center: GeoPoint, radiusM: number): BreachStatus {
  if (livestock.lat == null || livestock.lng == null) {
    return { breached: false, distanceM: 0 };
  }
  const d = distanceMeters(livestock.lat, livestock.lng, center.lat, center.lng);
  return { breached: d > radiusM, distanceM: Math.round(d) };
}

/**
 * Computes the vertices of a circle of `radiusM` metres around `center`,
 * sampled every `segments` degrees — used to draw the geofence boundary on the globe.
 */
export function geofenceRing(center: GeoPoint, radiusM: number, segments = 64): [number, number][] {
  const R = 6371000;
  const lat1 = (center.lat * Math.PI) / 180;
  const lng1 = (center.lng * Math.PI) / 180;
  const angular = radiusM / R;
  const points: [number, number][] = [];

  for (let i = 0; i < segments; i++) {
    const bearing = (i / segments) * 2 * Math.PI;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
    );
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
        Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
      );
    points.push([(lat2 * 180) / Math.PI, (lng2 * 180) / Math.PI]);
  }

  return points;
}
