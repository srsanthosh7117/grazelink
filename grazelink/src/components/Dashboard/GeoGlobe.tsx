import { useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { Goat } from '@/types/goat';
import {
  GeoPoint,
  geofenceRing,
  geofenceStatus,
} from '@/hooks/useGeofence';
import { getBatteryThreshold } from '@/utils/alertThresholds';

interface GeoGlobeProps {
  goats: Goat[];
  selectedGoatId: string;
  onSelect: (goatId: string) => void;
  center: GeoPoint | null;
  radiusMeters: number;
  trailPoints?: { lat: number; lng: number }[];
}

interface GlobeHandle {
  pointOfView: (pov: { lat?: number; lng?: number; altitude?: number }, ms?: number) => void;
  controls: () => {
    autoRotate: boolean;
    autoRotateSpeed: number;
    enableZoom: boolean;
    minDistance: number;
  };
}

interface RingObject {
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
  breached: boolean;
}

function pinColorFor(goat: Goat, breached: boolean): string {
  if (breached) return '#EF4444';
  if (goat.battery != null && goat.battery < getBatteryThreshold()) return '#F59E0B';
  return goat.status === 'Online' ? '#22C55E' : '#9CA3AF';
}

export default function GeoGlobe({
  goats,
  selectedGoatId,
  onSelect,
  center,
  radiusMeters,
  trailPoints,
}: GeoGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeHandle | undefined>(undefined);
  const [size, setSize] = useState({ width: 600, height: 500 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const globeMaterial = useMemo(
    () => new THREE.MeshPhongMaterial({ color: new THREE.Color('#1B2317'), shininess: 3 }),
    [],
  );

  const ring = useMemo<RingObject[]>(() => {
    if (!center) return [];
    const ringCoords = geofenceRing(center, radiusMeters).map(([lat, lng]): [number, number] => [lng, lat]);
    return [
      {
        geometry: { type: 'Polygon', coordinates: [ringCoords] },
        breached: false,
      },
    ];
  }, [center, radiusMeters]);

  const anyBreach = useMemo(
    () =>
      center
        ? goats.some((g) => (g.lat != null && g.lng != null ? geofenceStatus(g, center, radiusMeters).breached : false))
        : false,
    [goats, center, radiusMeters],
  );

  const pointsData = useMemo(() => goats.filter((g) => g.lat != null && g.lng != null), [goats]);

  const pathsData = useMemo(() => (trailPoints && trailPoints.length > 1 ? [trailPoints] : []), [trailPoints]);

  const selected = useMemo(
    () => pointsData.find((g) => g.goatId === selectedGoatId),
    [pointsData, selectedGoatId],
  );

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
      controls.enableZoom = true;
      controls.minDistance = 120;
    }
    if (center) globe.pointOfView({ lat: center.lat, lng: center.lng, altitude: 0.5 }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    if (selected) {
      const controls = globe.controls();
      if (controls) controls.autoRotate = false;
      globe.pointOfView({ lat: selected.lat as number, lng: selected.lng as number, altitude: 0.22 }, 1200);
    } else {
      const controls = globe.controls();
      if (controls) controls.autoRotate = true;
    }
  }, [selected]);

  const ringBreachColor = anyBreach ? '#EF4444' : '#22C55E';

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <Globe
        ref={globeRef as never}
        width={size.width}
        height={size.height}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={globeMaterial}
        showAtmosphere
        atmosphereColor="#3C4633"
        atmosphereAltitude={0.18}
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointColor={(d: object) =>
          pinColorFor(
            d as Goat,
            center
              ? geofenceStatus(d as Goat, center, radiusMeters).breached
              : false,
          )
        }
        pointAltitude={0.015}
        pointRadius={(d: object) =>
          (d as Goat).goatId === selectedGoatId ? 0.55 : 0.35
        }
        pointLabel={(d: object) => {
          const g = d as Goat;
          return `${g.goatId}${g.name ? ` (${g.name})` : ''} · ${g.status ?? 'Offline'}`;
        }}
        onPointClick={(d: object) => onSelect((d as Goat).goatId)}
        polygonsData={ring}
        polygonGeoJsonGeometry={(d: object) =>
          (d as RingObject).geometry as unknown as { type: string; coordinates: number[] }
        }
        polygonAltitude={0.008}
        polygonCapColor={() => (anyBreach ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.08)')}
        polygonSideColor={() => 'rgba(0,0,0,0)'}
        polygonStrokeColor={() => ringBreachColor}
        pathsData={pathsData}
        pathPoints={(d: object) => d as { lat: number; lng: number }[]}
        pathPointLat={(p: unknown) => (p as { lat: number }).lat}
        pathPointLng={(p: unknown) => (p as { lng: number }).lng}
        pathColor={() => ['rgba(232,178,60,0.08)', '#E8B23C']}
        pathDashLength={0.01}
        pathDashGap={0.004}
        pathDashAnimateTime={8000}
      />

      {/* Geofence legend overlay */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-2xl border border-black/5 bg-white/90 px-3 py-2 text-[10px] font-semibold text-ink shadow-soft backdrop-blur dark:border-white/10 dark:bg-dark-card/90 dark:text-white">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" /> In safe zone
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Breach
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Low battery
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gray-400" /> Offline
        </div>
      </div>

      {/* Safe zone badge */}
      {center && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-2xl border border-black/5 bg-white/90 px-3 py-2 text-[10px] font-bold text-ink shadow-soft backdrop-blur dark:border-white/10 dark:bg-dark-card/90 dark:text-white">
          Safe zone · {radiusMeters} m
        </div>
      )}
    </div>
  );
}
