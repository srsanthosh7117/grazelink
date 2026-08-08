import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { FiBarChart2, FiChevronRight, FiBatteryCharging, FiThermometer } from 'react-icons/fi';
import EmptyState from '@/components/Dashboard/EmptyState';
import { useAllGoats } from '@/hooks/useAllGoats';
import { getBatteryThreshold, getTempThreshold } from '@/utils/alertThresholds';
import { useDevices } from '@/hooks/useDevices';
import { useTheme } from '@/context/ThemeContext';

const PIE_COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function toCountEntries(values: string[]) {
  const map = new Map<string, number>();
  values.forEach((v) => map.set(v, (map.get(v) ?? 0) + 1));
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

export default function Analytics() {
  const { goats, loading: goatsLoading } = useAllGoats();
  const { devices, loading: devicesLoading } = useDevices();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const loading = goatsLoading || devicesLoading;

  const goatIdToDoc = useMemo(() => new Map(goats.map((g) => [g.goatId, g.id])), [goats]);

  const openGoatAnalytics = (goatId: string) => {
    const docId = goatIdToDoc.get(goatId);
    if (docId) navigate(`/dashboard/goats/${docId}`);
  };

  const healthData = useMemo(() => toCountEntries(goats.map((g) => g.healthStatus || 'Unknown')), [goats]);
  const vaccineData = useMemo(() => toCountEntries(goats.map((g) => g.vaccinationStatus || 'Unknown')), [goats]);
  const shedData = useMemo(() => toCountEntries(goats.map((g) => g.shedName || 'Unassigned')), [goats]);

  const deviceStatusData = useMemo(() => {
    const online = devices.filter((d) => d.status === 'Online').length;
    const offline = devices.filter((d) => d.status === 'Offline').length;
    if (devices.length === 0) return [];
    return [
      { name: 'Online', value: online },
      { name: 'Offline', value: offline },
    ];
  }, [devices]);

  const batteryData = useMemo(
    () =>
      goats
        .filter((g) => g.battery != null)
        .map((g) => ({ name: g.goatId, battery: g.battery as number })),
    [goats]
  );

  const temperatureData = useMemo(
    () =>
      goats
        .filter((g) => g.temperature != null)
        .map((g) => ({ name: g.goatId, temp: g.temperature as number })),
    [goats]
  );

  const cardClass =
    'rounded-3xl border border-black/5 bg-white p-6 shadow-soft dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const textColor = theme === 'dark' ? '#9CA3AF' : '#6B7280';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink dark:text-white md:text-3xl">
          Analytics &amp; Telemetry Reports
        </h1>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          Real-time herd composition, device health, and telemetry distributions.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-3xl bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      ) : goats.length === 0 && devices.length === 0 ? (
        <EmptyState
          icon={FiBarChart2}
          title="No Data Available"
          description="Analytics charts will automatically render once goats and smart collars report data to the system."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Health Status Distribution */}
          <div className={cardClass}>
            <h2 className="font-bold text-ink dark:text-white mb-4">Health Status Distribution</h2>
            {healthData.length === 0 ? (
              <p className="py-16 text-center text-xs text-muted dark:text-dark-muted">No Data Available</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={healthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: textColor }} />
                  <YAxis allowDecimals={false} tick={{ fill: textColor }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#22C55E" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Vaccination Status */}
          <div className={cardClass}>
            <h2 className="font-bold text-ink dark:text-white mb-4">Vaccination Status</h2>
            {vaccineData.length === 0 ? (
              <p className="py-16 text-center text-xs text-muted dark:text-dark-muted">No Data Available</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={vaccineData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                    {vaccineData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Online vs Offline Devices */}
          <div className={cardClass}>
            <h2 className="font-bold text-ink dark:text-white mb-4">Device Status (Online vs Offline)</h2>
            {deviceStatusData.length === 0 ? (
              <p className="py-16 text-center text-xs text-muted dark:text-dark-muted">No Data Available</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={deviceStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                    <Cell fill="#22C55E" />
                    <Cell fill="#EF4444" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Battery Levels Chart */}
          <div className={cardClass}>
            <h2 className="font-bold text-ink dark:text-white mb-4">Collar Battery Levels (%)</h2>
            {batteryData.length === 0 ? (
              <p className="py-16 text-center text-xs text-muted dark:text-dark-muted">No Data Available</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={batteryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: textColor }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fill: textColor }} />
                    <Tooltip />
                    <Bar
                      dataKey="battery"
                      fill="#3B82F6"
                      radius={[8, 8, 0, 0]}
                      onClick={(data) => {
                        if (data?.payload?.name) openGoatAnalytics(data.payload.name);
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <p className="mt-2 text-[11px] text-muted dark:text-dark-muted">
                  Click a bar to open that goat's analytics.
                </p>
              </>
            )}
          </div>

          {/* Temperature Trend */}
          <div className={cardClass}>
            <h2 className="font-bold text-ink dark:text-white mb-4">Livestock Body Temperature (°C)</h2>
            {temperatureData.length === 0 ? (
              <p className="py-16 text-center text-xs text-muted dark:text-dark-muted">No Data Available</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={temperatureData}
                    onClick={(state) => {
                      if (state?.activeLabel) openGoatAnalytics(state.activeLabel);
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: textColor }} />
                    <YAxis domain={[30, 45]} unit="°C" tick={{ fill: textColor }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="temp" stroke="#F59E0B" strokeWidth={3} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
                <p className="mt-2 text-[11px] text-muted dark:text-dark-muted">
                  Click a point to open that goat's analytics.
                </p>
              </>
            )}
          </div>

          {/* Shed Distribution */}
          <div className={cardClass}>
            <h2 className="font-bold text-ink dark:text-white mb-4">Shed Population Distribution</h2>
            {shedData.length === 0 ? (
              <p className="py-16 text-center text-xs text-muted dark:text-dark-muted">No Data Available</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={shedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: textColor }} />
                  <YAxis allowDecimals={false} tick={{ fill: textColor }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick Drill-Down — every goat, click to open its analytics */}
          <div className={`${cardClass} lg:col-span-2`}>
            <h2 className="font-bold text-ink dark:text-white mb-4">Goats — open individual analytics</h2>
            {goats.length === 0 ? (
              <p className="py-16 text-center text-xs text-muted dark:text-dark-muted">No Data Available</p>
            ) : (
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {goats.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => openGoatAnalytics(g.goatId)}
                    className="group flex w-full items-center justify-between gap-3 px-2 py-3 text-left transition-colors hover:bg-surface-light dark:hover:bg-dark-surface"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                        {g.goatId.replace(/^GT-/, '')}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink dark:text-white">
                          {g.goatId} {g.name ? <span className="font-medium text-muted dark:text-dark-muted">· {g.name}</span> : null}
                        </p>
                        <p className="text-xs text-muted dark:text-dark-muted">
                          {g.breed || 'Unknown breed'} · {g.shedName || 'No shed'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-ink dark:text-gray-200">
                        <FiBatteryCharging className={g.battery != null && g.battery < getBatteryThreshold() ? 'text-rose-500' : 'text-emerald-500'} />
                        {g.battery != null ? `${g.battery}%` : '—'}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-ink dark:text-gray-200">
                        <FiThermometer className={g.temperature != null && g.temperature > getTempThreshold() ? 'text-rose-500' : 'text-amber-500'} />
                        {g.temperature != null ? `${g.temperature}°C` : '—'}
                      </span>
                      <FiChevronRight className="text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary dark:text-dark-muted" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
