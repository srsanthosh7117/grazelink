import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiBatteryCharging, FiThermometer, FiZap, FiCheckCircle, FiAlertTriangle, FiTrendingUp } from 'react-icons/fi';
import EmptyState from '@/components/Dashboard/EmptyState';
import GeoGlobe from '@/components/Dashboard/GeoGlobe';
import { useLivestock } from '@/hooks/useLivestock';
import { useGpsHistory } from '@/hooks/useGpsHistory';
import { farmCenterOf, geofenceStatus } from '@/hooks/useGeofence';
import { useFarmGeofence } from '@/hooks/useFarmGeofence';

export default function GPSTracking() {
  const { livestock, loading } = useLivestock();
  const { radiusM, enabled, center: savedCenter } = useFarmGeofence();
  const navigate = useNavigate();

  const [selectedLivestockId, setSelectedLivestockId] = useState<string>('all');

  const located = useMemo(() => livestock.filter((g) => g.lat != null && g.lng != null), [livestock]);
  const center = useMemo(() => savedCenter ?? farmCenterOf(livestock), [savedCenter, livestock]);

  const activeLivestock =
    selectedLivestockId !== 'all' ? located.find((g) => g.livestockId === selectedLivestockId) : located[0];

  const { history } = useGpsHistory(activeLivestock?.livestockId);

  const trailPoints = useMemo(
    () =>
      selectedLivestockId !== 'all'
        ? [...history].reverse().map((e) => ({ lat: e.latitude, lng: e.longitude }))
        : undefined,
    [history, selectedLivestockId],
  );

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
          <h1 className="text-2xl font-extrabold tracking-tight text-ink dark:text-white md:text-3xl">
            Live GPS Tracking &amp; Geofencing
          </h1>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">
            Interactive 3D herd view with an automated geofence safe zone.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
          description="Once a collar posts coordinates to the cloud API, the herd will appear on the 3D globe."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* 3D Globe View */}
          <div className="overflow-hidden rounded-3xl border border-black/5 shadow-soft dark:border-white/5 dark:shadow-dark-card lg:col-span-3">
            <GeoGlobe
              livestock={located}
              selectedLivestockId={selectedLivestockId}
              onSelect={(livestockId) => setSelectedLivestockId(livestockId)}
              center={center}
              radiusMeters={radiusM}
              trailPoints={trailPoints}
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
                  <div className="flex items-center justify-between">
                    <span className="text-muted dark:text-dark-muted flex items-center gap-1">
                      <FiBatteryCharging className="text-emerald-500" /> Battery
                    </span>
                    <span className="font-bold text-ink dark:text-white">
                      {activeLivestock.battery != null ? `${activeLivestock.battery}%` : 'N/A'}
                    </span>
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
                </div>

                <div className="rounded-2xl bg-surface-light p-3 dark:bg-dark-surface space-y-1">
                  <span className="text-muted dark:text-dark-muted">GPS Coordinates</span>
                  <p className="font-mono text-xs text-ink dark:text-gray-200">
                    {activeLivestock.lat?.toFixed(5)}, {activeLivestock.lng?.toFixed(5)}
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
