import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiBatteryCharging, FiThermometer, FiZap, FiCheckCircle, FiAlertTriangle, FiTrendingUp } from 'react-icons/fi';
import EmptyState from '@/components/Dashboard/EmptyState';
import GeoGlobe from '@/components/Dashboard/GeoGlobe';
import { useGoats } from '@/hooks/useGoats';
import { useAuth } from '@/hooks/useAuth';
import { useAlerts } from '@/hooks/useAlerts';
import { useGpsHistory } from '@/hooks/useGpsHistory';
import {
  farmCenterOf,
  geofenceStatus,
  useGeofenceSettings,
} from '@/hooks/useGeofence';
import { createAlert } from '@/services/alerts';

export default function GPSTracking() {
  const { goats, loading } = useGoats();
  const { user } = useAuth();
  const { alerts } = useAlerts();
  const { radius } = useGeofenceSettings();
  const navigate = useNavigate();

  const [selectedGoatId, setSelectedGoatId] = useState<string>('all');

  const located = useMemo(() => goats.filter((g) => g.lat != null && g.lng != null), [goats]);
  const center = useMemo(() => farmCenterOf(goats), [goats]);

  const activeGoat =
    selectedGoatId !== 'all' ? located.find((g) => g.goatId === selectedGoatId) : located[0];

  const { history } = useGpsHistory(activeGoat?.goatId);

  const trailPoints = useMemo(
    () =>
      selectedGoatId !== 'all'
        ? [...history].reverse().map((e) => ({ lat: e.latitude, lng: e.longitude }))
        : undefined,
    [history, selectedGoatId],
  );

  const breachCount = useMemo(() => {
    if (!center) return 0;
    return located.filter((g) => geofenceStatus(g, center, radius).breached).length;
  }, [located, center, radius]);

  const insideCount = located.length - breachCount;

  /* Create one geofence breach alert per goat (deduped per session + existing alerts). */
  const createdRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user || !center) return;
    const existingBreaches = new Set(
      alerts.filter((a) => a.type === 'geofenceBreach').map((a) => a.goatId).filter(Boolean),
    );
    located.forEach((g) => {
      const status = geofenceStatus(g, center, radius);
      if (!status.breached) return;
      if (existingBreaches.has(g.goatId) || createdRef.current.has(g.goatId)) return;
      createdRef.current.add(g.goatId);
      createAlert({
        type: 'geofenceBreach',
        severity: 'critical',
        message: `${g.goatId} left the ${radius} m safe zone (${status.distanceM} m from the farm).`,
        goatId: g.goatId,
        deviceId: g.deviceId,
        farmUid: user.uid,
      }).catch(() => {});
    });
  }, [located, center, radius, user, alerts]);

  const activeStatus = activeGoat && center ? geofenceStatus(activeGoat, center, radius) : null;

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
              Safe zone: {radius} m ·{' '}
              <span className="text-emerald-500">{insideCount} inside</span>
              {' · '}
              <span className={breachCount > 0 ? 'text-rose-500' : 'text-muted'}>
                {breachCount} breached
              </span>
            </span>
          )}

          {located.length > 0 && (
            <select
              value={selectedGoatId}
              onChange={(e) => setSelectedGoatId(e.target.value)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink outline-none shadow-soft transition-colors focus:border-primary dark:border-white/10 dark:bg-dark-card dark:text-white"
            >
              <option value="all">📍 All Active Collars ({located.length})</option>
              {located.map((g) => (
                <option key={g.id} value={g.goatId}>
                  {g.goatId} {g.name ? `(${g.name})` : ''} · Collar {g.collarId}
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
              goats={located}
              selectedGoatId={selectedGoatId}
              onSelect={(goatId) => setSelectedGoatId(goatId)}
              center={center}
              radiusMeters={radius}
              trailPoints={trailPoints}
            />
          </div>

          {/* Side Telemetry Panel */}
          <div className="space-y-4 rounded-3xl border border-black/5 bg-white p-6 shadow-soft dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card lg:col-span-1">
            <h2 className="font-bold text-ink dark:text-white flex items-center gap-2">
              <FiZap className="text-primary" /> Active Collar Panel
            </h2>

            {activeGoat ? (
              <div className="space-y-3 text-xs">
                <div className="rounded-2xl bg-surface-light p-3 dark:bg-dark-surface">
                  <span className="text-muted dark:text-dark-muted">Selected Goat</span>
                  <p className="mt-0.5 text-sm font-extrabold text-ink dark:text-white">
                    {activeGoat.goatId} {activeGoat.name ? `(${activeGoat.name})` : ''}
                  </p>
                  <p className="text-muted dark:text-dark-muted">Collar ID: {activeGoat.collarId}</p>
                </div>

                <button
                  onClick={() => navigate(`/dashboard/goats/${activeGoat.id}`)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-card transition-all hover:scale-[1.02] hover:bg-primary-dark"
                >
                  <FiTrendingUp className="text-sm" /> View {activeGoat.goatId} analytics
                </button>

                <div className="rounded-2xl bg-surface-light p-3 dark:bg-dark-surface space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted dark:text-dark-muted flex items-center gap-1">
                      <FiBatteryCharging className="text-emerald-500" /> Battery
                    </span>
                    <span className="font-bold text-ink dark:text-white">
                      {activeGoat.battery != null ? `${activeGoat.battery}%` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted dark:text-dark-muted flex items-center gap-1">
                      <FiThermometer className="text-amber-500" /> Temp
                    </span>
                    <span className="font-bold text-ink dark:text-white">
                      {activeGoat.temperature != null ? `${activeGoat.temperature}°C` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted dark:text-dark-muted">Signal</span>
                    <span className="font-bold text-ink dark:text-white">
                      {activeGoat.signalStrength != null ? `${activeGoat.signalStrength} dBm` : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-surface-light p-3 dark:bg-dark-surface space-y-1">
                  <span className="text-muted dark:text-dark-muted">GPS Coordinates</span>
                  <p className="font-mono text-xs text-ink dark:text-gray-200">
                    {activeGoat.lat?.toFixed(5)}, {activeGoat.lng?.toFixed(5)}
                  </p>
                </div>

                {center && activeStatus ? (
                  activeStatus.breached ? (
                    <div className="rounded-2xl bg-rose-500/10 p-3 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 font-semibold flex items-center gap-2">
                      <FiAlertTriangle /> Outside Safe Zone — {activeStatus.distanceM} m from farm
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 font-semibold flex items-center gap-2">
                      <FiCheckCircle /> Inside Safe Zone ({radius} m)
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl bg-surface-light p-3 text-muted dark:bg-dark-surface dark:text-dark-muted font-semibold flex items-center gap-2">
                    <FiMapPin /> Geofence unavailable — no GPS fix yet
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted dark:text-dark-muted">
                Select a goat to inspect real-time collar telemetry.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
