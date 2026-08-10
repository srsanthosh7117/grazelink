import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts';
import { FiTrendingUp, FiMapPin, FiBatteryCharging, FiThermometer, FiActivity, FiCalendar, FiZap } from 'react-icons/fi';
import { useGpsHistory } from '@/hooks/useGpsHistory';
import { useTheme } from '@/context/ThemeContext';
import { haversine } from '@/services/gpsHistory';

function fmtTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtDay(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString([], { month: '2-digit', day: '2-digit' });
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function formatDistance(km: number): string {
  if (km >= 1) return `${km.toFixed(1)} km`;
  return `${Math.round(km * 1000)} m`;
}

interface LivestockAnalyticsProps {
  livestockId: string;
}

type RangeKey = '7d' | '30d' | 'all';

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'all', label: 'All time' },
];

export default function LivestockAnalytics({ livestockId }: LivestockAnalyticsProps) {
  const [range, setRange] = useState<RangeKey>('all');
  const { theme } = useTheme();

  const rangeFrom = useMemo(() => {
    if (range === 'all') return undefined;
    const d = new Date();
    d.setDate(d.getDate() - (range === '7d' ? 7 : 30));
    return d;
  }, [range]);

  const { history, totalDistance, loading } = useGpsHistory(livestockId, { from: rangeFrom });

  const historyAsc = useMemo(
    () =>
      [...history].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
    [history],
  );

  const batteryTrend = useMemo(
    () =>
      historyAsc
        .filter((e) => e.battery != null)
        .map((e) => ({ time: fmtTime(e.timestamp), battery: e.battery as number })),
    [historyAsc],
  );

  const tempTrend = useMemo(
    () =>
      historyAsc
        .filter((e) => e.temperature != null)
        .map((e) => ({ time: fmtTime(e.timestamp), temp: e.temperature as number })),
    [historyAsc],
  );

  const signalTrend = useMemo(
    () =>
      historyAsc
        .filter((e) => e.signalStrength != null)
        .map((e) => ({ time: fmtTime(e.timestamp), signal: e.signalStrength as number })),
    [historyAsc],
  );

  const activityData = useMemo(() => {
    const map = new Map<string, number>();
    historyAsc.forEach((e) => {
      const day = fmtDay(e.timestamp);
      map.set(day, (map.get(day) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, fixes]) => ({ name, fixes }));
  }, [historyAsc]);

  const avgBattery = average(batteryTrend.map((e) => e.battery));
  const avgTemp = average(tempTrend.map((e) => e.temp));
  const avgSignal = average(signalTrend.map((e) => e.signal));

  const speeds = useMemo(() => {
    const out: number[] = [];
    for (let i = 1; i < historyAsc.length; i++) {
      const a = historyAsc[i - 1];
      const b = historyAsc[i];
      const dtHours = (new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) / 3600000;
      if (!Number.isFinite(dtHours) || dtHours <= 0 || dtHours > 3) continue;
      const distanceKm = haversine(a.latitude, a.longitude, b.latitude, b.longitude);
      const speedKmh = distanceKm / dtHours;
      if (Number.isFinite(speedKmh)) out.push(speedKmh);
    }
    return out;
  }, [historyAsc]);

  const avgSpeed = average(speeds);
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : null;

  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const textColor = theme === 'dark' ? '#9CA3AF' : '#6B7280';

  const cardClass =
    'rounded-3xl border border-black/5 bg-white p-6 shadow-soft dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card';

  const stats = [
    {
      icon: FiMapPin,
      label: 'Distance Tracked',
      value: history.length > 1 ? formatDistance(totalDistance) : '—',
      hint: history.length > 1 ? 'from GPS fixes' : 'no movement data yet',
    },
    {
      icon: FiThermometer,
      label: 'Avg Temperature',
      value: avgTemp != null ? `${avgTemp.toFixed(1)}°C` : '—',
      hint: 'healthy range 38.5–39.7°C',
    },
    {
      icon: FiBatteryCharging,
      label: 'Avg Battery',
      value: avgBattery != null ? `${Math.round(avgBattery)}%` : '—',
      hint: batteryTrend.length > 0 ? `across ${batteryTrend.length} reports` : 'no battery reports yet',
    },
    {
      icon: FiActivity,
      label: 'GPS Fixes',
      value: String(history.length),
      hint: activityData.length > 0 ? `across ${activityData.length} days` : 'no reports yet',
    },
    {
      icon: FiZap,
      label: 'Avg Speed',
      value: avgSpeed != null ? `${avgSpeed.toFixed(1)} km/h` : '—',
      hint: 'between GPS fixes',
    },
    {
      icon: FiZap,
      label: 'Max Speed',
      value: maxSpeed != null ? `${maxSpeed.toFixed(1)} km/h` : '—',
      hint: 'peak movement',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink dark:text-white">
          <FiTrendingUp className="text-primary" /> Telemetry Analytics
        </h2>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1 text-xs text-muted dark:text-dark-muted sm:flex">
            <FiCalendar className="text-primary" />
            {history.length > 0 ? `Last ${history.length} reports` : 'No reports yet'}
          </span>
          <div className="flex items-center gap-1 rounded-full border border-black/5 bg-white p-1 shadow-soft dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  range === r.key
                    ? 'bg-primary text-white shadow-card'
                    : 'text-muted hover:text-primary dark:text-dark-muted'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-3xl bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-black/10 p-10 text-center dark:border-white/10">
          <FiActivity className="mx-auto text-2xl text-muted dark:text-dark-muted" />
          <p className="mt-3 text-sm font-semibold text-ink dark:text-white">No telemetry history yet</p>
          <p className="mt-1 text-xs text-muted dark:text-dark-muted">
            Charts for this livestock will appear once the collar starts reporting GPS, battery, and temperature.
          </p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className={cardClass}>
                <div className="flex items-center gap-2 text-muted dark:text-dark-muted">
                  <s.icon className="text-primary" />
                  <span className="text-xs font-semibold">{s.label}</span>
                </div>
                <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink dark:text-white">
                  {s.value}
                </p>
                <p className="mt-0.5 text-[11px] text-muted dark:text-dark-muted">{s.hint}</p>
              </div>
            ))}
          </div>

          {/* Battery & Temperature Trends */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className={cardClass}>
              <h3 className="mb-4 text-sm font-bold text-ink dark:text-white">Battery Trend</h3>
              {batteryTrend.length === 0 ? (
                <p className="py-16 text-center text-xs text-muted dark:text-dark-muted">No battery data</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={batteryTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: textColor }} minTickGap={40} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: textColor }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="battery" stroke="#3B82F6" strokeWidth={2} fill="#3B82F6" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className={cardClass}>
              <h3 className="mb-4 text-sm font-bold text-ink dark:text-white">Temperature Trend</h3>
              {tempTrend.length === 0 ? (
                <p className="py-16 text-center text-xs text-muted dark:text-dark-muted">No temperature data</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={tempTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: textColor }} minTickGap={40} />
                    <YAxis domain={['auto', 'auto']} unit="°C" tick={{ fontSize: 11, fill: textColor }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="temp" stroke="#F59E0B" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Signal Trend */}
            <div className={cardClass}>
              <h3 className="mb-4 text-sm font-bold text-ink dark:text-white">Signal Strength</h3>
              {signalTrend.length === 0 ? (
                <p className="py-16 text-center text-xs text-muted dark:text-dark-muted">No signal data</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={signalTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: textColor }} minTickGap={40} />
                    <YAxis domain={['auto', 'auto']} unit="dBm" tick={{ fontSize: 11, fill: textColor }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="signal" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {avgSignal != null && (
                <p className="mt-2 text-[11px] text-muted dark:text-dark-muted">
                  Average signal: <span className="font-bold text-ink dark:text-white">{avgSignal.toFixed(1)} dBm</span>
                </p>
              )}
            </div>

            {/* Activity per day */}
            <div className={cardClass}>
              <h3 className="mb-4 text-sm font-bold text-ink dark:text-white">Activity (GPS fixes per day)</h3>
              {activityData.length === 0 ? (
                <p className="py-16 text-center text-xs text-muted dark:text-dark-muted">No activity data</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: textColor }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: textColor }} />
                    <Tooltip />
                    <Bar dataKey="fixes" fill="#22C55E" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
