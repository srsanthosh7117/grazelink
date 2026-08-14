import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiBatteryCharging, FiThermometer, FiZap, FiCheckCircle, FiAlertTriangle, FiTrendingUp, FiCompass, FiChevronLeft, FiChevronRight, FiRadio } from 'react-icons/fi';
import EmptyState from '@/components/Dashboard/EmptyState';
import TrackingMap, { CollarTrail } from '@/components/Dashboard/TrackingMap';
import { useLivestock } from '@/hooks/useLivestock';
import { useAllGpsHistory } from '@/hooks/useAllGpsHistory';
import { haversine } from '@/services/gpsHistory';
import { formatIstTime } from '@/utils/datetime';
import { farmCenterOf, geofenceStatus } from '@/hooks/useGeofence';
import { useFarmGeofence } from '@/hooks/useFarmGeofence';

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function compassHeading(bearing: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const norm = ((bearing % 360) + 360) % 360;
  return `${dirs[Math.round(norm / 45) % 8]}`;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Local-time YYYY-MM-DD for a Date (not UTC — the farmer's calendar day). */
function toDayStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Start/end instants of a local calendar day, for the history query window. */
function dayBounds(dayStr: string): { from: Date; to: Date } {
  const [y, m, d] = dayStr.split('-').map(Number);
  return {
    from: new Date(y, m - 1, d, 0, 0, 0, 0),
    to: new Date(y, m - 1, d, 23, 59, 59, 999),
  };
}

/** Shift a YYYY-MM-DD string by whole days. */
function shiftDay(dayStr: string, delta: number): string {
  const [y, m, d] = dayStr.split('-').map(Number);
  return toDayStr(new Date(y, m - 1, d + delta));
}

function prettyDay(dayStr: string, todayStr: string): string {
  if (dayStr === todayStr) return 'Today';
  if (dayStr === shiftDay(todayStr, -1)) return 'Yesterday';
  const [y, m, d] = dayStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function GPSTracking() {
  const { livestock, loading } = useLivestock();
  const { radiusM, enabled, center: savedCenter } = useFarmGeofence();
  const navigate = useNavigate();

  const [selectedLivestockId, setSelectedLivestockId] = useState<string>('all');

  const todayStr = useMemo(() => toDayStr(new Date()), []);
  const [selectedDay, setSelectedDay] = useState<string>(todayStr);
  const isToday = selectedDay === todayStr;

  const located = useMemo(() => livestock.filter((g) => g.lat != null && g.lng != null), [livestock]);
  const center = useMemo(() => savedCenter ?? farmCenterOf(livestock), [savedCenter, livestock]);

  const activeLivestock =
    selectedLivestockId !== 'all' ? located.find((g) => g.livestockId === selectedLivestockId) : located[0];

  // Memoised so the from/to Date identities are stable across renders (they are
  // effect deps in the hook — fresh instances every render would refetch forever).
  const { from, to } = useMemo(() => dayBounds(selectedDay), [selectedDay]);

  // One farm-wide query for the chosen day, grouped per collar. Live-poll only
  // for today; a past day is immutable, so fetch it once.
  const { groups, loading: historyLoading } = useAllGpsHistory({
    from,
    to,
    maxEntries: 1500,
    pollMs: isToday ? undefined : 0,
  });

  const activeEntries = useMemo(() => {
    if (!activeLivestock) return [];
    return groups.find((g) => g.livestockId === activeLivestock.livestockId)?.entries ?? [];
  }, [groups, activeLivestock]);

  const speedKmh = useMemo(() => {
    const [a, b] = activeEntries;
    if (!a || !b) return null;
    const dtH = (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) / 3_600_000;
    if (dtH <= 0) return null;
    const dKm = haversine(b.latitude, b.longitude, a.latitude, a.longitude);
    return dKm / dtH;
  }, [activeEntries]);

  const heading = useMemo(() => {
    const [a, b] = activeEntries;
    if (!a || !b) return null;
    return bearingDeg(b.latitude, b.longitude, a.latitude, a.longitude);
  }, [activeEntries]);

  const trails = useMemo<CollarTrail[]>(() => {
    const all: CollarTrail[] = groups
      .filter((g) => g.entries.length > 0)
      .map((g) => ({
        livestockId: g.livestockId,
        // history is newest-first; reverse to draw the trail in chronological order
        points: [...g.entries]
          .reverse()
          .map((e) => ({ lat: e.latitude, lng: e.longitude, ts: new Date(e.timestamp).getTime() })),
      }));
    return all;
  }, [groups]);

  const dayTrailCount = trails.length;
  const dayPointCount = useMemo(() => trails.reduce((s, t) => s + t.points.length, 0), [trails]);

  const breachCount = useMemo(() => {
    if (!center || !enabled) return 0;
    return located.filter((g) => geofenceStatus(g, center, radiusM).breached).length;
  }, [located, center, radiusM, enabled]);

  const insideCount = located.length - breachCount;

  const activeStatus =
    activeLivestock && center && enabled ? geofenceStatus(activeLivestock, center, radiusM) : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-ink dark:text-white md:text-3xl">
            GPS Tracking &amp; Geofencing
            {isToday ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                LIVE
              </span>
            ) : (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                HISTORY
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">
            {isToday
              ? 'Live trail, moving collars and an automated geofence safe zone.'
              : `Showing the recorded trail for ${prettyDay(selectedDay, todayStr)}.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Day picker — jump to any recorded day's tracking */}
          <div className="flex items-center gap-1 rounded-2xl border border-black/10 bg-white p-1 shadow-soft dark:border-white/10 dark:bg-dark-card">
            <button
              onClick={() => setSelectedDay((d) => shiftDay(d, -1))}
              title="Previous day"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted transition-colors hover:bg-black/5 hover:text-primary dark:text-dark-muted dark:hover:bg-white/10"
            >
              <FiChevronLeft />
            </button>
            <input
              type="date"
              value={selectedDay}
              max={todayStr}
              onChange={(e) => e.target.value && setSelectedDay(e.target.value)}
              className="bg-transparent px-1 text-sm font-semibold text-ink outline-none dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
            />
            <button
              onClick={() => setSelectedDay((d) => shiftDay(d, 1))}
              disabled={isToday}
              title="Next day"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted transition-colors hover:bg-black/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 dark:text-dark-muted dark:hover:bg-white/10"
            >
              <FiChevronRight />
            </button>
            {!isToday && (
              <button
                onClick={() => setSelectedDay(todayStr)}
                title="Back to today's live view"
                className="ml-0.5 flex h-8 items-center gap-1 rounded-xl bg-primary px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-primary-dark"
              >
                <FiRadio className="text-xs" /> Live
              </button>
            )}
          </div>

          <span className="rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-xs font-bold shadow-soft dark:border-white/10 dark:bg-dark-card">
            {historyLoading ? (
              <span className="text-muted dark:text-dark-muted">Loading day…</span>
            ) : dayPointCount > 0 ? (
              <span className="text-ink dark:text-white">
                <span className="text-primary">{dayPointCount}</span> fixes ·{' '}
                {dayTrailCount} trail{dayTrailCount === 1 ? '' : 's'}
              </span>
            ) : (
              <span className="text-muted dark:text-dark-muted">No fixes recorded this day</span>
            )}
          </span>

          {center && (
            <span className="rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-xs font-bold text-ink shadow-soft dark:border-white/10 dark:bg-dark-card dark:text-white">
              Safe zone: {radiusM} m{enabled ? ' · server-enforced' : ''} ·{' '}
              <span className="text-emerald-500">{insideCount} inside</span>
              {' · '}
              <span className={breachCount > 0 ? 'text-rose-500' : 'text-muted'}>
                {breachCount} breached
              </span>
            </span>
          )}

          {located.length > 0 && (
            <select
              value={selectedLivestockId}
              onChange={(e) => setSelectedLivestockId(e.target.value)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink outline-none shadow-soft transition-colors focus:border-primary dark:border-white/10 dark:bg-dark-card dark:text-white"
            >
              <option value="all">📍 All Active Collars ({located.length})</option>
              {located.map((g) => (
                <option key={g.id} value={g.livestockId}>
                  {g.livestockId} {g.name ? `(${g.name})` : ''} · Collar {g.collarId}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-[520px] animate-pulse rounded-3xl bg-black/5 dark:bg-white/5" />
      ) : located.length === 0 ? (
        <EmptyState
          icon={FiMapPin}
          title="No GPS Telemetry Available"
          description="Once a collar posts coordinates to the cloud API, the herd will appear on the 2D map."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Interactive 2D Map */}
          <div className="h-[560px] overflow-hidden rounded-3xl border border-black/5 shadow-soft dark:border-white/5 dark:shadow-dark-card lg:col-span-3">
            <TrackingMap
              livestock={located}
              selectedLivestockId={selectedLivestockId}
              onSelect={(livestockId) => setSelectedLivestockId(livestockId)}
              center={center}
              radiusMeters={radiusM}
              trails={trails}
            />
          </div>

          {/* Side Telemetry Panel */}
          <div className="space-y-4 rounded-3xl border border-black/5 bg-white p-6 shadow-soft dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card lg:col-span-1">
            <h2 className="font-bold text-ink dark:text-white flex items-center gap-2">
              <FiZap className="text-primary" /> Active Collar Panel
            </h2>

            {activeLivestock ? (
              <div className="space-y-3 text-xs">
                <div className="rounded-2xl bg-surface-light p-3 dark:bg-dark-surface">
                  <span className="text-muted dark:text-dark-muted">Selected Livestock</span>
                  <p className="mt-0.5 text-sm font-extrabold text-ink dark:text-white">
                    {activeLivestock.livestockId} {activeLivestock.name ? `(${activeLivestock.name})` : ''}
                  </p>
                  <p className="text-muted dark:text-dark-muted">Collar ID: {activeLivestock.collarId}</p>
                </div>

                <button
                  onClick={() => navigate(`/dashboard/livestock/${activeLivestock.id}`)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-card transition-all hover:scale-[1.02] hover:bg-primary-dark"
                >
                  <FiTrendingUp className="text-sm" /> View {activeLivestock.livestockId} analytics
                </button>

                <div className="rounded-2xl bg-surface-light p-3 dark:bg-dark-surface space-y-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted dark:text-dark-muted flex items-center gap-1">
                        <FiBatteryCharging className="text-emerald-500" /> Battery
                      </span>
                      <span className="font-bold text-ink dark:text-white">
                        {activeLivestock.battery != null ? `${activeLivestock.battery}%` : 'N/A'}
                      </span>
                    </div>
                    {activeLivestock.battery != null && (
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                        <div
                          className={`h-full rounded-full ${
                            activeLivestock.battery < 20
                              ? 'bg-rose-500'
                              : activeLivestock.battery < 50
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, activeLivestock.battery))}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted dark:text-dark-muted flex items-center gap-1">
                      <FiThermometer className="text-amber-500" /> Temp
                    </span>
                    <span className="font-bold text-ink dark:text-white">
                      {activeLivestock.temperature != null ? `${activeLivestock.temperature}°C` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted dark:text-dark-muted">Signal</span>
                    <span className="font-bold text-ink dark:text-white">
                      {activeLivestock.signalStrength != null ? `${activeLivestock.signalStrength} dBm` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted dark:text-dark-muted flex items-center gap-1">
                      <FiCompass className="text-sky-500" /> Heading
                    </span>
                    <span className="font-bold text-ink dark:text-white">
                      {heading != null ? `${compassHeading(heading)} ${Math.round(((heading % 360) + 360) % 360)}°` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted dark:text-dark-muted">Speed</span>
                    <span className="font-bold text-ink dark:text-white">
                      {speedKmh != null ? `${speedKmh.toFixed(1)} km/h` : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-surface-light p-3 dark:bg-dark-surface space-y-1">
                  <span className="text-muted dark:text-dark-muted">GPS Coordinates</span>
                  <p className="font-mono text-xs text-ink dark:text-gray-200">
                    {activeLivestock.lat?.toFixed(5)}, {activeLivestock.lng?.toFixed(5)}
                  </p>
                  <p className="text-[11px] font-semibold text-ink dark:text-white">
                    {activeLivestock.lastSeen ? `Last fix · ${formatIstTime(activeLivestock.lastSeen)} IST` : 'No fix yet'}
                  </p>
                </div>

                {center && activeStatus ? (
                  activeStatus.breached ? (
                    <div className="rounded-2xl bg-rose-500/10 p-3 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 font-semibold flex items-center gap-2">
                      <FiAlertTriangle /> Outside Safe Zone — {activeStatus.distanceM} m from farm
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 font-semibold flex items-center gap-2">
                      <FiCheckCircle /> Inside Safe Zone ({radiusM} m)
                    </div>
                  )
                ) : center ? (
                  <div className="rounded-2xl bg-surface-light p-3 text-muted dark:bg-dark-surface dark:text-dark-muted font-semibold flex items-center gap-2">
                    <FiMapPin /> Geofence is off — enable it in Settings to monitor the safe zone
                  </div>
                ) : (
                  <div className="rounded-2xl bg-surface-light p-3 text-muted dark:bg-dark-surface dark:text-dark-muted font-semibold flex items-center gap-2">
                    <FiMapPin /> Geofence unavailable — no GPS fix yet
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted dark:text-dark-muted">
                Select a livestock to inspect real-time collar telemetry.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
