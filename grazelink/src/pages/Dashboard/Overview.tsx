import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiActivity,
  FiAlertTriangle,
  FiArrowRight,
  FiBatteryCharging,
  FiCheckCircle,
  FiGrid,
  FiHeart,
  FiHome,
  FiMapPin,
  FiPlus,
  FiRefreshCw,
  FiThermometer,
  FiUser,
  FiWifi,
  FiWifiOff,
} from 'react-icons/fi';

import StatCard from '@/components/Cards/StatCard';
import { useAuth } from '@/hooks/useAuth';
import { useFarmProfile } from '@/hooks/useFarmProfile';
import { useAllGoats } from '@/hooks/useAllGoats';
import { useDevices } from '@/hooks/useDevices';
import { useAlerts } from '@/hooks/useAlerts';
import { ALERT_COLORS } from '@/types/alert';
import { getBatteryThreshold } from '@/utils/alertThresholds';

interface MetricTileProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tone?: 'default' | 'success' | 'danger' | 'warning';
}

const TILE_TONES = {
  default: 'text-ink dark:text-white',
  success: 'text-emerald-600 dark:text-emerald-400',
  danger: 'text-rose-600 dark:text-rose-400',
  warning: 'text-amber-600 dark:text-amber-400',
} as const;

function MetricTile({ icon: Icon, label, value, tone = 'default' }: MetricTileProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/5 bg-white/60 px-4 py-3.5 dark:border-white/5 dark:bg-white/[0.03]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg text-primary dark:bg-primary/20 dark:text-primary-light">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className={`truncate text-lg font-bold leading-tight ${TILE_TONES[tone]}`}>{value}</p>
        <p className="truncate text-xs font-medium text-muted dark:text-dark-muted">{label}</p>
      </div>
    </div>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useFarmProfile();
  const { goats, loading: goatsLoading, error: goatsError } = useAllGoats();
  const { devices, onlineDevices, offlineDevices, lowBatteryDevices, avgBattery, avgTemperature } =
    useDevices();
  const { alerts, unreadCount } = useAlerts();

  const isLoading = profileLoading || goatsLoading;
  const error = profileError || goatsError;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-36 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-rose-600 dark:text-rose-400">
        <p className="font-semibold">Could not load your farm overview.</p>
        <p className="mt-1 text-sm opacity-80">{error}</p>
      </div>
    );
  }

  const farms = profile ? 1 : 0;
  const sheds = profile?.numberOfSheds ?? 0;

  const totalGoats = goats.length;
  const healthyCount = goats.filter((g) => g.healthStatus === 'Healthy').length;
  const sickCount = goats.length - healthyCount;
  const gpsConnectedCount = goats.filter((g) => g.lat != null && g.lng != null).length;
  const pendingSyncCount = totalGoats - gpsConnectedCount;
  const totalDevices = devices.length;
  const healthyPct = totalGoats ? Math.round((healthyCount / totalGoats) * 100) : 0;

  const recentAlerts = alerts;
  const activeAlerts = recentAlerts.filter((a) => !a.dismissed);

  const lastSyncLabel = (() => {
    if (devices.length === 0) return '—';
    const times = devices
      .map((d) => (d.lastSync ? new Date(d.lastSync).getTime() : 0))
      .filter((t) => !Number.isNaN(t));
    if (times.length === 0) return 'Just now';
    const latest = Math.max(...times);
    const diff = Date.now() - latest;
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  })();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-7xl space-y-6 px-1 py-6 sm:px-4"
    >
      {/* ===== Header ===== */}
      <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-6 dark:border-white/5 dark:from-primary/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-muted dark:text-dark-muted">
              {todayLabel}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl dark:text-white">
              {greeting}
              {user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}
              <span className="text-primary">.</span>
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white px-3 py-1 text-xs font-semibold text-muted dark:border-white/10 dark:bg-white/5 dark:text-dark-muted">
                <FiHome className="h-3.5 w-3.5 text-primary" />
                {sheds} {sheds === 1 ? 'Shed' : 'Sheds'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white px-3 py-1 text-xs font-semibold text-muted dark:border-white/10 dark:bg-white/5 dark:text-dark-muted">
                <FiGrid className="h-3.5 w-3.5 text-primary" />
                {farms} {farms === 1 ? 'Farm' : 'Farms'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white px-3 py-1 text-xs font-semibold text-muted dark:border-white/10 dark:bg-white/5 dark:text-dark-muted">
                <FiUser className="h-3.5 w-3.5 text-primary" />
                {totalGoats} goats
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/gps"
              className="inline-flex items-center gap-2 rounded-xl border border-black/5 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-black/[0.02] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              <FiMapPin className="h-4 w-4 text-primary" />
              GPS Map
            </Link>
            <Link
              to="/dashboard/goats/add"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-primary/90 hover:shadow-card"
            >
              <FiPlus className="h-4 w-4" />
              Add Goat
            </Link>
          </div>
        </div>
      </div>

      {/* ===== Alert banner ===== */}
      {unreadCount > 0 && (
        <Link
          to="/dashboard/alerts"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-3.5 transition-colors hover:bg-amber-500/15"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-lg text-amber-600 dark:text-amber-400">
              <FiAlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                {unreadCount} unread {unreadCount === 1 ? 'alert' : 'alerts'} need your attention
              </p>
              <p className="text-xs font-medium text-amber-700/70 dark:text-amber-400/70">
                View pending alerts
              </p>
            </div>
          </div>
          <FiArrowRight className="h-4 w-4 shrink-0 text-amber-600 transition-transform group-hover:translate-x-1 dark:text-amber-400" />
        </Link>
      )}

      {/* ===== Hero stats ===== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={FiActivity}
          label="Total Goats"
          value={totalGoats}
          subtext={`${totalDevices} collars linked`}
          accent="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light"
        />
        <StatCard
          icon={FiHeart}
          label="Healthy Goats"
          value={healthyCount}
          subtext={`${healthyPct}% of herd`}
          trend={{ value: `${healthyPct}% healthy`, isPositive: healthyPct >= 90 }}
          accent="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
        />
        <StatCard
          icon={FiAlertTriangle}
          label="Sick / Injured"
          value={sickCount}
          subtext={sickCount > 0 ? 'Needs attention' : 'All clear'}
          accent="bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
        />
        <StatCard
          icon={FiMapPin}
          label="GPS Tracking Active"
          value={gpsConnectedCount}
          subtext={pendingSyncCount ? `${pendingSyncCount} pending sync` : 'All synced'}
          accent="bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400"
        />
      </div>

      {/* ===== Fleet health + alerts ===== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-soft dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink dark:text-white">Collar Fleet Health</h2>
              <p className="text-sm text-muted dark:text-dark-muted">Live device status</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricTile icon={FiWifi} label="Online" value={onlineDevices} tone="success" />
            <MetricTile icon={FiWifiOff} label="Offline" value={offlineDevices} tone="danger" />
            <MetricTile
              icon={FiBatteryCharging}
              label="Low Battery"
              value={lowBatteryDevices}
              tone="warning"
            />
            <MetricTile icon={FiRefreshCw} label="Last Sync" value={lastSyncLabel} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-black/5 bg-white/60 p-4 dark:border-white/5 dark:bg-white/[0.03]">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted dark:text-dark-muted">
                  Average Battery
                </p>
                <span className="text-sm font-bold text-ink dark:text-white">
                  {avgBattery != null ? `${avgBattery}%` : '—'}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-primary transition-all duration-700"
                  style={{ width: `${Math.min(100, avgBattery ?? 0)}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-black/5 bg-white/60 px-4 py-3.5 dark:border-white/5 dark:bg-white/[0.03]">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light">
                <FiThermometer className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold leading-tight text-ink dark:text-white">
                  {avgTemperature != null ? avgTemperature : '—'}
                </p>
                <p className="text-xs font-medium text-muted dark:text-dark-muted">
                  Average Temperature
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent alerts */}
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-soft dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink dark:text-white">Recent Alerts</h2>
              <p className="text-sm text-muted dark:text-dark-muted">Latest notifications</p>
            </div>
            <Link
              to="/dashboard/alerts"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 dark:text-primary-light"
            >
              View all <FiArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <FiCheckCircle className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-ink dark:text-white">All clear</p>
              <p className="text-xs text-muted dark:text-dark-muted">No active alerts</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {activeAlerts.slice(0, 4).map((alert) => {
                const tone = ALERT_COLORS[alert.severity] ?? ALERT_COLORS.info;
                return (
                  <li key={alert.id}>
                    <Link
                      to="/dashboard/alerts"
                      className="flex items-start gap-3 rounded-xl border border-black/5 bg-white/60 px-3.5 py-3 transition-colors hover:bg-black/[0.02] dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${tone}`}
                      >
                        <FiAlertTriangle className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink dark:text-white">
                          {alert.message}
                        </p>
                        <p className="text-xs font-medium capitalize text-muted dark:text-dark-muted">
                          {alert.severity}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ===== Compact stats ===== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={FiWifiOff}
          label="Offline Devices"
          value={offlineDevices}
          subtext={offlineDevices ? 'Check connectivity' : 'All devices connected'}
          accent="bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
        />
        <StatCard
          icon={FiBatteryCharging}
          label="Low Battery Devices"
          value={lowBatteryDevices}
          subtext={`Below ${getBatteryThreshold()}% charge`}
          accent="bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
        />
        <StatCard
          icon={FiActivity}
          label="Average Battery"
          value={avgBattery != null ? `${avgBattery}%` : '—'}
          subtext={avgBattery != null && avgBattery >= 50 ? 'Fleet healthy' : 'Charge soon'}
          accent="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
        />
        <StatCard
          icon={FiThermometer}
          label="Average Temperature"
          value={avgTemperature != null ? avgTemperature : '—'}
          subtext="Across herd"
          accent="bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400"
        />
      </div>
    </motion.div>
  );
}
