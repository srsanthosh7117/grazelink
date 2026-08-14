import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, Circle, Popup, Tooltip, ScaleControl, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { FiNavigation, FiMapPin, FiLayers, FiCompass, FiSearch, FiChevronDown, FiMaximize2, FiCheck } from 'react-icons/fi';
import 'leaflet/dist/leaflet.css';
import { Livestock } from '@/types/livestock';
import { GeoPoint, geofenceStatus } from '@/hooks/useGeofence';
import { getBatteryThreshold } from '@/utils/alertThresholds';
import { haversine } from '@/services/gpsHistory';
import { formatIstTime } from '@/utils/datetime';

type LatLng = [number, number];

export interface CollarTrailPoint {
  lat: number;
  lng: number;
  ts: number;
}

export interface CollarTrail {
  livestockId: string;
  points: CollarTrailPoint[];
}

interface TrackingMapProps {
  livestock: Livestock[];
  selectedLivestockId: string;
  onSelect: (livestockId: string) => void;
  center: GeoPoint | null;
  radiusMeters: number;
  trails: CollarTrail[];
}

type TileStyle = 'streets' | 'light' | 'dark' | 'satellite' | 'terrain';

const TILE_STYLES: Record<TileStyle, { url: string; attribution: string; label: string; maxNativeZoom: number }> = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    label: 'Streets',
    maxNativeZoom: 19,
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    label: 'Light',
    maxNativeZoom: 19,
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    label: 'Dark',
    maxNativeZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    label: 'Satellite',
    maxNativeZoom: 19,
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data &copy; OpenStreetMap contributors, SRTM | Style &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    label: 'Terrain',
    maxNativeZoom: 17,
  },
};

/** Distinct hues so each collar's trail is tellable apart when all are plotted. */
const TRAIL_COLORS = ['#E8B23C', '#38BDF8', '#A78BFA', '#34D399', '#F472B6', '#FB923C', '#22D3EE', '#A3E635'];

/**
 * Break the trail wherever consecutive fixes are more than this far apart in
 * time. The collar samples every 20 min while roaming and goes silent for
 * 30-min stretches at the barn, so a straight line drawn across a multi-hour
 * gap is fiction — it implies travel that was never recorded. Splitting at
 * ~2.5x the roam interval keeps each grazing excursion its own clean segment.
 */
const MAX_TRAIL_GAP_MS = 50 * 60 * 1000;

/** Split chronological points into runs unbroken by a long time gap. */
function splitSegments(points: CollarTrailPoint[], maxGapMs: number): CollarTrailPoint[][] {
  if (points.length === 0) return [];
  const segs: CollarTrailPoint[][] = [];
  let cur: CollarTrailPoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (points[i].ts - points[i - 1].ts > maxGapMs) {
      segs.push(cur);
      cur = [points[i]];
    } else {
      cur.push(points[i]);
    }
  }
  segs.push(cur);
  return segs;
}

function pinColorFor(livestock: Livestock, breached: boolean): string {
  if (breached) return '#EF4444';
  if (livestock.battery != null && livestock.battery < getBatteryThreshold()) return '#F59E0B';
  return livestock.status === 'Online' ? '#22C55E' : '#9CA3AF';
}

function makePinIcon(color: string, selected: boolean): L.DivIcon {
  return L.divIcon({
    className: 'gzl-pin-wrapper',
    html: `<div class="gzl-pin${selected ? ' gzl-pin-selected' : ''}" style="--pin-color:${color}"></div>`,
    iconSize: [26, 34],
    iconAnchor: [13, 32],
    popupAnchor: [0, -30],
  });
}

/** Initial compass bearing (deg, 0 = north) from point a to point b. */
function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** A chevron pointing along the direction of travel, rotated to `bearing`. */
function makeArrowIcon(color: string, bearing: number, emphasized: boolean): L.DivIcon {
  const size = emphasized ? 18 : 14;
  return L.divIcon({
    className: 'gzl-arrow',
    html:
      `<div style="transform:rotate(${bearing}deg);width:${size}px;height:${size}px;` +
      `display:flex;align-items:center;justify-content:center">` +
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
      `stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" ` +
      `style="filter:drop-shadow(0 0 1px rgba(0,0,0,0.55))">` +
      `<path d="M12 4 L20 20 L12 15 L4 20 Z" fill="${color}" stroke="none"/></svg></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Direction arrows sampled at even ground-distance spacing along a trail.
 *
 * Sampling by cumulative metres (not per point) means a near-stationary collar
 * — whose fixes pile onto the same spot — produces no arrows and declutters to
 * a clean line, while a moving one gets evenly spaced heading markers no matter
 * how dense or sparse its fixes are.
 */
function trailArrows(
  points: CollarTrailPoint[],
  spacingM: number,
): Array<{ lat: number; lng: number; bearing: number }> {
  const out: Array<{ lat: number; lng: number; bearing: number }> = [];
  if (points.length < 2) return out;

  // Anchor on straight-line displacement, not path length: an arrow appears
  // only once the collar has actually moved `spacingM` from the last anchor,
  // so jitter that wanders back and forth around one spot never triggers one.
  let anchor = points[0];
  for (let i = 1; i < points.length; i++) {
    const b = points[i];
    const displM = haversine(anchor.lat, anchor.lng, b.lat, b.lng) * 1000;
    if (displM >= spacingM) {
      out.push({ lat: b.lat, lng: b.lng, bearing: bearingDeg(anchor.lat, anchor.lng, b.lat, b.lng) });
      anchor = b;
    }
  }
  return out;
}

function timeAgo(iso?: string): string {
  if (!iso) return 'N/A';
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return 'N/A';
  const diff = Math.max(0, Date.now() - ms);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtTime(ms: number): string {
  return formatIstTime(ms);
}

function segmentDistance(points: CollarTrailPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversine(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
  }
  return Math.round(total * 100) / 100;
}

/** Smoothly interpolates a marker between position updates (Google-Maps feel). */
function AnimatedMarker({
  position,
  color,
  selected,
  label,
  tip,
  onClick,
}: {
  position: LatLng;
  color: string;
  selected: boolean;
  label: string;
  tip?: string;
  onClick?: () => void;
}) {
  const [pos, setPos] = useState<LatLng>(position);
  const prevRef = useRef<LatLng>(position);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevRef.current;
    if (from[0] === position[0] && from[1] === position[1]) return;
    const start = performance.now();
    const duration = 1200;
    const step = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setPos([from[0] + (position[0] - from[0]) * ease, from[1] + (position[1] - from[1]) * ease]);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        prevRef.current = position;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafRef.current);
      prevRef.current = position;
    };
  }, [position]);

  const icon = useMemo(() => makePinIcon(color, selected), [color, selected]);

  return (
    <Marker
      position={pos}
      icon={icon}
      eventHandlers={onClick ? { click: onClick } : undefined}
      zIndexOffset={selected ? 1000 : 0}
    >
      {tip && (
        <Tooltip direction="top" offset={[0, -34]} permanent opacity={1} className="gzl-marker-tip">
          {tip}
        </Tooltip>
      )}
      <Popup>{label}</Popup>
    </Marker>
  );
}

/** Pans/flies the map to the selected collar while follow-mode is on. */
function FollowController({ position, follow }: { position: LatLng | null; follow: boolean }) {
  const map = useMap();
  const lastPos = useRef<LatLng | null>(null);

  useEffect(() => {
    if (!follow || !position) return;
    const moved = !lastPos.current || lastPos.current[0] !== position[0] || lastPos.current[1] !== position[1];
    if (moved) {
      map.flyTo(position, Math.max(map.getZoom(), 18), { duration: 1.2 });
    }
    lastPos.current = position;
  }, [position, follow, map]);

  return null;
}

/** Initial camera: fit to everything plotted, or centre on the geofence, once. */
function FitBoundsController({ positions, center }: { positions: LatLng[]; center: GeoPoint | null }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions as L.LatLngBoundsExpression, { padding: [48, 48] });
    } else if (positions.length === 1) {
      map.setView(positions[0], 17);
    } else if (center) {
      map.setView([center.lat, center.lng], 13);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/** Hands the Leaflet instance back out so chrome outside the map can drive it. */
function MapRefBridge({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

/** Google-Maps-style place search powered by OpenStreetMap's Nominatim. */
function SearchBox() {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number>(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  const search = (q: string) => {
    setQuery(q);
    window.clearTimeout(timerRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(q.trim())}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as NominatimResult[];
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setOpen(false);
      }
    }, 450);
  };

  const go = (lat: number, lon: number) => {
    map.flyTo([lat, lon], 18, { duration: 1.2 });
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="absolute left-3 top-3 z-[1100]">
      <div className="flex items-center gap-1.5 rounded-2xl border border-black/10 bg-white/95 px-3 py-2 shadow-soft dark:border-white/10 dark:bg-dark-card/95">
        <FiSearch className="shrink-0 text-sm text-muted dark:text-dark-muted" />
        <input
          value={query}
          onChange={(e) => search(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) go(Number(results[0].lat), Number(results[0].lon));
          }}
          placeholder="Search for a place…"
          className="w-44 bg-transparent text-xs font-medium text-ink outline-none placeholder:text-muted dark:text-white dark:placeholder:text-dark-muted"
        />
        <span className="mx-0.5 h-4 w-px bg-black/10 dark:bg-white/10" />
        <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-muted dark:text-dark-muted">
          <FiCompass className="text-sm" /> N
        </span>
      </div>

      {open && results.length > 0 && (
        <div className="mt-1 w-72 overflow-hidden rounded-2xl border border-black/10 bg-white/95 shadow-soft dark:border-white/10 dark:bg-dark-card/95">
          {results.map((r) => (
            <button
              key={r.place_id}
              onClick={() => go(Number(r.lat), Number(r.lon))}
              className="block w-full px-3 py-2 text-left text-[11px] font-medium text-ink transition-colors hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TrackingMap({
  livestock,
  selectedLivestockId,
  onSelect,
  center,
  radiusMeters,
  trails,
}: TrackingMapProps) {
  const [follow, setFollow] = useState(true);
  const [tileStyle, setTileStyle] = useState<TileStyle>('streets');
  const [layersOpen, setLayersOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);

  const mapRef = useRef<L.Map | null>(null);
  const onMapReady = useCallback((m: L.Map) => {
    mapRef.current = m;
  }, []);
  const layersRef = useRef<HTMLDivElement>(null);

  // The layer menu is a popover — close it on any outside click.
  useEffect(() => {
    if (!layersOpen) return;
    const onDown = (e: MouseEvent) => {
      if (layersRef.current && !layersRef.current.contains(e.target as Node)) setLayersOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [layersOpen]);

  const positions = useMemo(
    () => livestock.filter((g) => g.lat != null && g.lng != null).map((g) => [g.lat as number, g.lng as number] as LatLng),
    [livestock],
  );

  /** Reset the camera to show every plotted collar at once. */
  const fitAll = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setFollow(false);
    if (positions.length > 1) map.fitBounds(positions as L.LatLngBoundsExpression, { padding: [48, 48] });
    else if (positions.length === 1) map.setView(positions[0], 17);
    else if (center) map.setView([center.lat, center.lng], 13);
  }, [positions, center]);

  /** Legend row click: select the collar and bring it into view. */
  const focusCollar = useCallback((g: Livestock) => {
    onSelect(g.livestockId);
    if (g.lat != null && g.lng != null) {
      mapRef.current?.flyTo([g.lat, g.lng], Math.max(mapRef.current.getZoom(), 17), { duration: 1 });
    }
  }, [onSelect]);

  const selected = useMemo(
    () => livestock.find((g) => g.livestockId === selectedLivestockId && g.lat != null && g.lng != null),
    [livestock, selectedLivestockId],
  );

  const selectedPosition = selected ? ([selected.lat as number, selected.lng as number] as LatLng) : null;

  const anyBreach = useMemo(
    () => (center ? livestock.some((g) => (g.lat != null && g.lng != null ? geofenceStatus(g, center, radiusMeters).breached : false)) : false),
    [livestock, center, radiusMeters],
  );

  // When a single collar is selected, its trail is emphasised (full opacity,
  // thicker) and every other collar's trail fades.
  const singleSelected = selectedLivestockId !== 'all';

  const trailColor = (livestockId: string): string => {
    const idx = livestock.findIndex((g) => g.livestockId === livestockId);
    return TRAIL_COLORS[Math.max(0, idx) % TRAIL_COLORS.length];
  };

  // ---- Trail time window ----
  const timeBounds = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const t of trails) {
      for (const p of t.points) {
        if (p.ts < min) min = p.ts;
        if (p.ts > max) max = p.ts;
      }
    }
    return { min, max, span: max > min ? max - min : 0 };
  }, [trails]);

  const [startPct, setStartPct] = useState(0);
  const [endPct, setEndPct] = useState(100);

  const filteredTrails = useMemo(() => {
    if (!timeBounds.span) return trails;
    const startMs = timeBounds.min + (startPct / 100) * timeBounds.span;
    const endMs = timeBounds.min + (endPct / 100) * timeBounds.span;
    return trails.map((t) => ({
      livestockId: t.livestockId,
      points: t.points.filter((p) => p.ts >= startMs && p.ts <= endMs),
    }));
  }, [trails, timeBounds, startPct, endPct]);

  const filteredCount = useMemo(() => filteredTrails.reduce((s, t) => s + t.points.length, 0), [filteredTrails]);
  const filteredDistance = useMemo(() => filteredTrails.reduce((s, t) => s + segmentDistance(t.points), 0), [filteredTrails]);
  const latestFix = useMemo(() => {
    let latest: string | undefined;
    for (const t of trails) {
      for (const p of t.points) {
        if (!latest || p.ts > new Date(latest).getTime()) latest = new Date(p.ts).toISOString();
      }
    }
    return latest;
  }, [trails]);

  const windowStartMs = timeBounds.span ? timeBounds.min + (startPct / 100) * timeBounds.span : timeBounds.min;
  const windowEndMs = timeBounds.span ? timeBounds.min + (endPct / 100) * timeBounds.span : timeBounds.max;

  const tile = TILE_STYLES[tileStyle];

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={selectedPosition ?? positions[0] ?? (center ? [center.lat, center.lng] : [11.1, 77.1])}
        zoom={16}
        // OSM/CARTO/Esri publish tiles only up to zoom 19 (terrain to 17); a
        // request at 20 comes back HTTP 400, leaving the dark container showing
        // through. Cap at 19 so the deepest zoom always has real tiles. At 19
        // that's already ~0.3 m/pixel — finer than the collar's GPS accuracy.
        maxZoom={19}
        worldCopyJump
        scrollWheelZoom
        zoomControl={false}
        attributionControl
        className="h-full w-full"
      >
        <TileLayer
          key={tileStyle}
          url={tile.url}
          attribution={tile.attribution}
          maxNativeZoom={tile.maxNativeZoom}
          noWrap
          // Don't refetch tiles mid-zoom: scale the ones we have and load the
          // new level only once the animation settles. Prevents the dark
          // container flashing through the gaps during a zoom-in.
          updateWhenZooming={false}
          // Keep a wide ring of tiles cached around the viewport so panning and
          // zooming rarely expose an unpainted (dark) edge.
          keepBuffer={6}
        />
        {/* Zoom lives bottom-right: top-left is taken by the search box. */}
        <ZoomControl position="bottomright" />
        <ScaleControl position="bottomright" imperial={false} />

        <MapRefBridge onReady={onMapReady} />
        <SearchBox />
        <FitBoundsController positions={positions} center={center} />
        <FollowController position={selectedPosition} follow={follow} />

        {/* Geofence circle */}
        {center && (
          <Circle
            center={[center.lat, center.lng]}
            radius={radiusMeters}
            pathOptions={{
              color: anyBreach ? '#EF4444' : '#22C55E',
              weight: 2,
              fillColor: anyBreach ? '#EF4444' : '#22C55E',
              fillOpacity: 0.08,
              dashArray: '6 6',
            }}
          />
        )}

        {/* Every collar's trail — cased line per gap-free segment, arrows, dots */}
        {filteredTrails.map((trail) => {
          const pts = trail.points.filter((p) => p.lat != null && p.lng != null);
          if (pts.length < 1) return null;
          const isSelected = singleSelected && trail.livestockId === selectedLivestockId;
          const dimmed = singleSelected && !isSelected;
          const color = trailColor(trail.livestockId);
          const first = pts[0];
          const last = pts[pts.length - 1];
          const coreW = isSelected ? 5 : 3.5;
          const coreOpacity = dimmed ? 0.3 : isSelected ? 0.98 : 0.75;
          const segments = splitSegments(pts, MAX_TRAIL_GAP_MS);
          return (
            <div key={trail.livestockId}>
              {segments.map((seg, si) => {
                if (seg.length < 2) return null;
                const line = seg.map((p) => [p.lat, p.lng] as LatLng);
                // Wider arrow spacing when zoomed out / many collars, tighter when focused.
                const arrows = dimmed ? [] : trailArrows(seg, isSelected ? 12 : 20);
                return (
                  <div key={si}>
                    {/* Soft outer glow under the selected collar */}
                    {isSelected && (
                      <Polyline
                        positions={line}
                        pathOptions={{ color, weight: coreW + 8, opacity: 0.16, lineCap: 'round', lineJoin: 'round' }}
                      />
                    )}
                    {/* Dark casing — makes the coloured core pop on any basemap */}
                    <Polyline
                      positions={line}
                      pathOptions={{
                        color: '#0b1220',
                        weight: coreW + 3,
                        opacity: dimmed ? 0.12 : 0.35,
                        lineCap: 'round',
                        lineJoin: 'round',
                      }}
                    />
                    {/* Coloured core */}
                    <Polyline
                      positions={line}
                      pathOptions={{ color, weight: coreW, opacity: coreOpacity, lineCap: 'round', lineJoin: 'round' }}
                    />
                    {/* Direction-of-travel arrows */}
                    {arrows.map((a, i) => (
                      <Marker
                        key={`arrow-${i}`}
                        position={[a.lat, a.lng]}
                        icon={makeArrowIcon(color, a.bearing, isSelected)}
                        interactive={false}
                        keyboard={false}
                      />
                    ))}
                  </div>
                );
              })}

              {/* Start of trail (hollow) */}
              {pts.length > 1 && (
                <CircleMarker
                  center={[first.lat, first.lng]}
                  radius={4}
                  pathOptions={{ color, weight: 2, fillColor: '#ffffff', fillOpacity: dimmed ? 0.3 : 0.9 }}
                />
              )}

              {/* Current / last position (filled) */}
              <CircleMarker
                center={[last.lat, last.lng]}
                radius={isSelected ? 6 : 4}
                pathOptions={{
                  color: '#ffffff',
                  weight: 1.5,
                  fillColor: color,
                  fillOpacity: dimmed ? 0.35 : isSelected ? 1 : 0.9,
                }}
              />
            </div>
          );
        })}

        {/* Collar pins: the selected one animates between fixes */}
        {livestock.map((g) => {
          if (g.lat == null || g.lng == null) return null;
          const breached = center ? geofenceStatus(g, center, radiusMeters).breached : false;
          const isSelected = g.livestockId === selectedLivestockId;
          const color = pinColorFor(g, breached);
          const label = `${g.livestockId}${g.name ? ` (${g.name})` : ''} · ${g.status ?? 'Offline'}${
            g.lastSeen ? ` · Fix ${formatIstTime(g.lastSeen)}` : ''
          }`;
          const tip = g.name ?? g.livestockId;
          if (isSelected) {
            return (
              <AnimatedMarker
                key={g.id}
                position={[g.lat, g.lng]}
                color={color}
                selected
                label={label}
                tip={tip}
                onClick={() => onSelect(g.livestockId)}
              />
            );
          }
          return (
            <Marker
              key={g.id}
              position={[g.lat, g.lng]}
              icon={makePinIcon(color, false)}
              eventHandlers={{ click: () => onSelect(g.livestockId) }}
            >
              {tip && (
                <Tooltip direction="top" offset={[0, -30]} permanent opacity={1} className="gzl-marker-tip">
                  {tip}
                </Tooltip>
              )}
              <Popup>{label}</Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Right-hand toolbar — one stack so nothing overlaps */}
      <div className="absolute right-3 top-3 z-[1000] flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={fitAll}
            title="Fit all collars in view"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-black/10 bg-white/95 text-ink shadow-soft transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:bg-dark-card/95 dark:text-white"
          >
            <FiMaximize2 className="text-sm" />
          </button>

          <button
            onClick={() => setFollow((f) => !f)}
            title={follow ? 'Stop following the selected collar' : 'Follow the selected collar'}
            className={`flex h-9 items-center gap-1.5 rounded-2xl border px-3 text-xs font-bold shadow-soft transition-colors ${
              follow
                ? 'border-primary/30 bg-primary text-white'
                : 'border-black/10 bg-white/95 text-ink hover:border-primary hover:text-primary dark:border-white/10 dark:bg-dark-card/95 dark:text-white'
            }`}
          >
            <FiNavigation className="text-sm" /> {follow ? 'Following' : 'Follow'}
          </button>
        </div>

        {/* Basemap picker — collapsed to one button instead of five */}
        <div ref={layersRef} className="relative">
          <button
            onClick={() => setLayersOpen((o) => !o)}
            title="Change basemap"
            className="flex h-9 items-center gap-1.5 rounded-2xl border border-black/10 bg-white/95 px-3 text-xs font-bold text-ink shadow-soft transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:bg-dark-card/95 dark:text-white"
          >
            <FiLayers className="text-sm" /> {tile.label}
            <FiChevronDown className={`text-sm transition-transform ${layersOpen ? 'rotate-180' : ''}`} />
          </button>

          {layersOpen && (
            <div className="absolute right-0 mt-1 w-36 overflow-hidden rounded-2xl border border-black/10 bg-white/98 shadow-soft dark:border-white/10 dark:bg-dark-card">
              {(Object.keys(TILE_STYLES) as TileStyle[]).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setTileStyle(key);
                    setLayersOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-[11px] font-bold transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                    tileStyle === key ? 'text-primary' : 'text-ink dark:text-white'
                  }`}
                >
                  {TILE_STYLES[key].label}
                  {tileStyle === key && <FiCheck className="text-xs" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Collar legend — collapsible, scrollable, and each row selects a collar */}
      {livestock.length > 0 && (
        <div className="absolute left-3 top-16 z-[1000] w-[212px] overflow-hidden rounded-2xl border border-black/10 bg-white/95 shadow-soft dark:border-white/10 dark:bg-dark-card/95">
          <button
            onClick={() => setLegendOpen((o) => !o)}
            className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:text-ink dark:text-dark-muted dark:hover:text-white"
          >
            <span>Collars ({livestock.length})</span>
            <FiChevronDown className={`text-sm transition-transform ${legendOpen ? '' : '-rotate-90'}`} />
          </button>

          {legendOpen && (
            <div className="max-h-[190px] overflow-y-auto border-t border-black/5 pb-1 dark:border-white/5">
              <button
                onClick={() => onSelect('all')}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-bold transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                  selectedLivestockId === 'all' ? 'text-primary' : 'text-ink dark:text-white'
                }`}
              >
                <FiMapPin className="shrink-0 text-xs" />
                All collars
              </button>

              {livestock.map((g) => {
                const isSelected = g.livestockId === selectedLivestockId;
                return (
                  <button
                    key={g.id}
                    onClick={() => focusCollar(g)}
                    title={`Focus ${g.livestockId}`}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                      isSelected ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-ink dark:text-white'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: g.lat != null ? trailColor(g.livestockId) : '#9CA3AF' }}
                    />
                    <span className="truncate">{g.name ?? g.livestockId}</span>
                    <span className="ml-auto shrink-0 text-[9px] text-muted dark:text-dark-muted">
                      {timeAgo(g.lastSeen)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Trip / route stats bar */}
      {filteredCount > 0 && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] flex max-w-[240px] flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-black/10 bg-white/95 px-4 py-2.5 text-xs shadow-soft dark:border-white/10 dark:bg-dark-card/95 dark:text-white">
          <span className="flex items-center gap-1.5 font-bold">
            <FiMapPin className="text-primary" /> {filteredCount} pts
          </span>
          <span className="font-bold text-amber-600 dark:text-amber-400">
            {filteredDistance > 0 ? `${filteredDistance} km` : '— km'}
          </span>
          <span className="text-muted dark:text-dark-muted">Last fix {timeAgo(latestFix)}</span>
          {center && (
            <span className="w-full border-t border-black/5 pt-1 font-bold text-emerald-600 dark:border-white/5 dark:text-emerald-400">
              Safe zone · {radiusMeters} m
            </span>
          )}
        </div>
      )}

      {/* Trail time window slider */}
      {timeBounds.span > 0 && filteredCount > 0 && (
        <div className="absolute bottom-3 left-1/2 z-[1000] w-[min(420px,calc(100%-320px))] -translate-x-1/2 rounded-2xl border border-black/10 bg-white/95 px-4 py-2.5 shadow-soft dark:border-white/10 dark:bg-dark-card/95">
          <div className="flex items-center justify-between gap-3 text-[10px] font-bold text-ink dark:text-white">
            <span className="uppercase tracking-wide text-muted dark:text-dark-muted">Trail</span>
            <span className="tabular-nums">
              {fmtTime(windowStartMs)} – {fmtTime(windowEndMs)}
            </span>
            {(startPct > 0 || endPct < 100) && (
              <button
                onClick={() => {
                  setStartPct(0);
                  setEndPct(100);
                }}
                className="font-bold text-primary hover:underline"
              >
                All
              </button>
            )}
          </div>
          <div className="relative mt-1 h-5">
            <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-black/10 dark:bg-white/15" />
            <div
              className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary"
              style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
            />
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={startPct}
              onChange={(e) => setStartPct(Math.min(Number(e.target.value), endPct))}
              className="gzl-range-dual"
              style={{ zIndex: startPct > endPct ? 3 : 1 }}
              aria-label="Trail start time"
            />
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={endPct}
              onChange={(e) => setEndPct(Math.max(Number(e.target.value), startPct))}
              className="gzl-range-dual"
              style={{ zIndex: endPct >= startPct ? 3 : 1 }}
              aria-label="Trail end time"
            />
          </div>
        </div>
      )}
    </div>
  );
}
