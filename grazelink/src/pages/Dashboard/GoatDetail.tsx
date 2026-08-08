import { useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiBatteryCharging,
  FiWifi,
  FiWifiOff,
  FiMapPin,
  FiEdit2,
  FiTrash2,
  FiThermometer,
  FiActivity,
  FiHeart,
  FiCalendar,
  FiCpu,
  FiTrendingUp,
  FiUser,
} from 'react-icons/fi';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { useGoatById } from '@/hooks/useGoatById';
import { useDevices } from '@/hooks/useDevices';
import { useAuth } from '@/hooks/useAuth';
import { deleteGoat } from '@/services/goats';
import AddGoatModal from '@/components/Dashboard/AddGoatModal';
import GoatAnalytics from '@/components/Dashboard/GoatAnalytics';
import { useToast } from '@/context/ToastContext';

function formatRegistrationTime(value: unknown): string {
  if (!value) return '—';
  const date =
    value instanceof Date
      ? value
      : typeof value === 'object' &&
          value != null &&
          'toDate' in value &&
          typeof (value as { toDate: unknown }).toDate === 'function'
        ? ((value as { toDate: () => Date }).toDate())
        : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export default function GoatDetail() {
  const { goatId } = useParams<{ goatId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { goat, loading } = useGoatById(goatId);
  const { devices } = useDevices();
  const { showToast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [view, setView] = useState<'analytics' | 'profile'>(
    searchParams.get('view') === 'profile' ? 'profile' : 'analytics',
  );

  const device = goat ? devices.find((d) => d.deviceId === goat.deviceId) : undefined;

  if (loading) {
    return <div className="h-96 animate-pulse rounded-3xl bg-black/5 dark:bg-white/5" />;
  }

  if (!goat) {
    return (
      <div className="space-y-6">
        <Link to="/dashboard/goats" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <FiArrowLeft /> Back to Goat Management
        </Link>
        <div className="rounded-3xl border border-black/5 bg-white p-12 text-center shadow-soft dark:border-white/5 dark:bg-dark-card">
          <p className="text-muted dark:text-dark-muted">Goat record could not be found. It may have been removed.</p>
        </div>
      </div>
    );
  }

  const battery = goat.battery ?? 0;
  const batteryColor = battery >= 60 ? '#22C55E' : battery >= 30 ? '#F59E0B' : '#EF4444';

  const handleDelete = async () => {
    if (!user) return;
    if (!confirm(`Are you sure you want to remove ${goat.goatId}?`)) return;
    await deleteGoat(user.uid, goat.id);
    showToast('success', `${goat.goatId} was deleted.`);
    navigate('/dashboard/goats');
  };

  const profileRows: [string, string][] = [
    ['Goat Name', goat.name || '—'],
    ['Breed', goat.breed || '—'],
    ['Gender', goat.gender || '—'],
    ['Age', `${goat.age} months`],
    ['Weight', `${goat.weight} kg`],
    ['Colour', goat.colour || '—'],
    ['Date of Birth', goat.dateOfBirth || '—'],
    ['Purchase Date', goat.purchaseDate || '—'],
    ['Owner', goat.owner || '—'],
    ['Farm Name', goat.farmName || '—'],
    ['Shed Name', goat.shedName || '—'],
    ['Device ID', goat.deviceId || 'Collar Unassigned'],
    ['Collar ID', goat.collarId || '—'],
    ['GPS Status', goat.gpsStatus || 'Active'],
  ];

  const cardClass =
    'rounded-3xl border border-black/5 bg-white p-6 shadow-soft dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card';

  const tabs: { id: 'analytics' | 'profile'; label: string; icon: typeof FiTrendingUp }[] = [
    { id: 'analytics', label: 'Analytics', icon: FiTrendingUp },
    { id: 'profile', label: 'Profile', icon: FiUser },
  ];

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <Link to="/dashboard/goats" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <FiArrowLeft /> Back to Goat Management
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink dark:text-white md:text-3xl">
              {goat.goatId} {goat.name ? `— ${goat.name}` : ''}
            </h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                goat.status === 'Online'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
              }`}
            >
              {goat.status ?? 'Offline'}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">
            Smart Collar {goat.collarId} · Managed in {goat.shedName}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-white"
          >
            <FiEdit2 /> Edit Record
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold text-rose-500 transition-colors hover:border-rose-500 dark:border-white/10"
          >
            <FiTrash2 /> Delete
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex w-fit items-center gap-1 rounded-full border border-black/5 bg-white p-1 shadow-soft dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
              view === tab.id
                ? 'bg-primary text-white shadow-card'
                : 'text-muted hover:text-primary dark:text-dark-muted'
            }`}
          >
            <tab.icon className="text-sm" /> {tab.label}
          </button>
        ))}
      </div>

      {view === 'analytics' ? (
        <GoatAnalytics goatId={goat.goatId} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6">
            {/* Battery & Telemetry Card */}
            <div className={cardClass}>
              <h2 className="font-bold text-ink dark:text-white flex items-center gap-2">
                <FiBatteryCharging className="text-primary" /> Battery &amp; Signal Telemetry
              </h2>

              {goat.battery != null ? (
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart
                    innerRadius="70%"
                    outerRadius="100%"
                    data={[{ name: 'battery', value: battery, fill: batteryColor }]}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background dataKey="value" cornerRadius={12} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-ink text-2xl font-extrabold dark:fill-white">
                      {battery}%
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-12 text-center text-xs text-muted dark:text-dark-muted">
                  No telemetry battery data reported yet from the collar.
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-surface-light p-3 dark:bg-dark-surface">
                  <span className="text-muted dark:text-dark-muted flex items-center gap-1">
                    <FiThermometer className="text-amber-500" /> Temperature
                  </span>
                  <p className="mt-1 text-sm font-bold text-ink dark:text-white">
                    {goat.temperature != null ? `${goat.temperature}°C` : 'N/A'}
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-light p-3 dark:bg-dark-surface">
                  <span className="text-muted dark:text-dark-muted flex items-center gap-1">
                    <FiWifi className="text-blue-500" /> Signal
                  </span>
                  <p className="mt-1 text-sm font-bold text-ink dark:text-white">
                    {goat.signalStrength != null ? `${goat.signalStrength} dBm` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Linked Collar Module */}
            <div className={cardClass}>
              <h2 className="font-bold text-ink dark:text-white flex items-center gap-2">
                <FiCpu className="text-primary" /> Linked Collar Module
              </h2>

              {device ? (
                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between rounded-2xl bg-surface-light p-3 dark:bg-dark-surface">
                    <span className="text-muted dark:text-dark-muted">Device ID</span>
                    <span className="font-mono font-bold text-ink dark:text-white">{device.deviceId}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-surface-light p-3 dark:bg-dark-surface">
                    <span className="text-muted dark:text-dark-muted">Status</span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${
                        device.status === 'Online'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          device.status === 'Online' ? 'animate-pulse bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      {device.status === 'Online' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-surface-light p-3 dark:bg-dark-surface">
                      <span className="text-muted dark:text-dark-muted flex items-center gap-1">
                        <FiBatteryCharging className="text-emerald-500" /> Battery
                      </span>
                      <p className="mt-1 text-sm font-bold text-ink dark:text-white">{device.battery ?? 0}%</p>
                    </div>
                    <div className="rounded-2xl bg-surface-light p-3 dark:bg-dark-surface">
                      <span className="text-muted dark:text-dark-muted flex items-center gap-1">
                        <FiThermometer className="text-amber-500" /> Temp
                      </span>
                      <p className="mt-1 text-sm font-bold text-ink dark:text-white">
                        {device.temperature != null ? `${device.temperature}°C` : 'N/A'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface-light p-3 dark:bg-dark-surface">
                      <span className="text-muted dark:text-dark-muted flex items-center gap-1">
                        {device.status === 'Online' ? (
                          <FiWifi className="text-blue-500" />
                        ) : (
                          <FiWifiOff className="text-rose-500" />
                        )}{' '}
                        Signal
                      </span>
                      <p className="mt-1 text-sm font-bold text-ink dark:text-white">
                        {device.wifiSignal != null ? `${device.wifiSignal} dBm` : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-surface-light p-3 dark:bg-dark-surface">
                    <span className="text-muted dark:text-dark-muted">Last Sync</span>
                    <span className="font-semibold text-ink dark:text-gray-200">{device.lastSync || 'Never'}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-surface-light p-3 dark:bg-dark-surface">
                    <span className="text-muted dark:text-dark-muted">GPS Registration</span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${
                        device.registrationStatus === 'gps_confirmed'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                          : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                      }`}
                    >
                      <FiMapPin
                        className={
                          device.registrationStatus === 'gps_confirmed' ? 'text-emerald-500' : 'text-amber-500'
                        }
                      />
                      {device.registrationStatus === 'gps_confirmed'
                        ? 'GPS Confirmed'
                        : device.registrationStatus === 'pending'
                          ? 'Awaiting First GPS Fix'
                          : 'Pending'}
                    </span>
                  </div>
                  {device.registrationStatus === 'gps_confirmed' &&
                    device.initialLatitude != null &&
                    device.initialLongitude != null && (
                      <div className="flex items-center justify-between rounded-2xl bg-surface-light p-3 dark:bg-dark-surface">
                        <span className="text-muted dark:text-dark-muted">Registration Coordinates</span>
                        <span className="font-mono font-semibold text-ink dark:text-gray-200">
                          {device.initialLatitude.toFixed(5)}, {device.initialLongitude.toFixed(5)}
                        </span>
                      </div>
                    )}
                  {device.registrationStatus === 'gps_confirmed' && device.registeredAt != null && (
                    <div className="flex items-center justify-between rounded-2xl bg-surface-light p-3 dark:bg-dark-surface">
                      <span className="text-muted dark:text-dark-muted">Registered At</span>
                      <span className="font-semibold text-ink dark:text-gray-200">
                        {formatRegistrationTime(device.registeredAt)}
                      </span>
                    </div>
                  )}
                  <p className="text-[11px] text-muted dark:text-dark-muted">
                    This collar reports GPS, battery, and temperature for {goat.goatId}. To change the
                    module, use Edit Record.
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-surface-light p-4 text-center dark:bg-dark-surface">
                  <p className="text-xs text-muted dark:text-dark-muted">
                    {goat.deviceId
                      ? `Linked device "${goat.deviceId}" is not registered in this farm's device list.`
                      : 'No collar is linked to this goat yet. Use Edit Record to assign a module.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Profile */}
          <div className={`${cardClass} lg:col-span-2`}>
            <h2 className="font-bold text-ink dark:text-white flex items-center gap-2">
              <FiActivity className="text-primary" /> Full Livestock Profile
            </h2>

            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 text-xs">
              {profileRows.map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-black/5 pb-2 dark:border-white/5">
                  <dt className="text-muted dark:text-dark-muted">{label}</dt>
                  <dd className="font-semibold text-ink dark:text-gray-200">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl bg-surface-light p-4 dark:bg-dark-surface">
                <span className="font-semibold text-ink dark:text-white flex items-center gap-1.5">
                  <FiHeart className="text-rose-500" /> Health Status: <span className="text-primary">{goat.healthStatus}</span>
                </span>
                <p className="mt-2 text-muted dark:text-dark-muted">
                  Vaccination: <span className="font-semibold text-ink dark:text-gray-200">{goat.vaccinationStatus}</span>
                </p>
                {goat.medicalNotes && <p className="mt-2 text-ink dark:text-gray-300">Notes: {goat.medicalNotes}</p>}
              </div>

              <div className="rounded-2xl bg-surface-light p-4 dark:bg-dark-surface">
                <span className="font-semibold text-ink dark:text-white flex items-center gap-1.5">
                  <FiCalendar className="text-blue-500" /> General Remarks
                </span>
                <p className="mt-2 text-muted dark:text-dark-muted">
                  {goat.remarks || 'No specific remarks recorded for this goat.'}
                </p>
              </div>
            </div>
          </div>

          {/* GPS Coordinates & Map Link */}
          <div className={`${cardClass} lg:col-span-3`}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-ink dark:text-white flex items-center gap-2">
                <FiMapPin className="text-primary" /> Last Reported GPS Coordinates
              </h2>
              <Link to="/dashboard/gps" className="text-xs font-semibold text-primary hover:underline">
                Open Full GPS Map →
              </Link>
            </div>

            {goat.lat != null && goat.lng != null ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface-light p-4 dark:bg-dark-surface">
                <div>
                  <p className="text-sm font-bold text-ink dark:text-white">
                    Latitude: {goat.lat.toFixed(5)}, Longitude: {goat.lng.toFixed(5)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted dark:text-dark-muted">
                    Last synchronized: {goat.lastSeen || 'Unknown'}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  GPS Active
                </span>
              </div>
            ) : (
              <p className="mt-4 text-xs text-muted dark:text-dark-muted">
                Collar has not transmitted GPS coordinates to the cloud backend yet.
              </p>
            )}
          </div>
        </div>
      )}

      <AddGoatModal open={editOpen} onClose={() => setEditOpen(false)} goat={goat} />
    </div>
  );
}
