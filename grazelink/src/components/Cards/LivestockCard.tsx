import { FiEye, FiEdit2, FiTrash2, FiTrendingUp, FiBatteryCharging, FiThermometer, FiWifi } from 'react-icons/fi';
import { Livestock } from '@/types/livestock';
import { getBatteryThreshold, getTempThreshold } from '@/utils/alertThresholds';

interface LivestockCardProps {
  livestock: Livestock;
  onView?: (livestock: Livestock) => void;
  onAnalyze?: (livestock: Livestock) => void;
  onEdit?: (livestock: Livestock) => void;
  onDelete?: (livestock: Livestock) => void;
}

export default function LivestockCard({ livestock, onView, onAnalyze, onEdit, onDelete }: LivestockCardProps) {
  const status = livestock.status ?? 'Offline';
  const hasTelemetry = livestock.status !== undefined;

  const batteryColor =
    livestock.battery != null
      ? livestock.battery <= getBatteryThreshold()
        ? 'text-rose-500'
        : livestock.battery > 50
          ? 'text-emerald-500'
          : 'text-amber-500'
      : 'text-muted';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onAnalyze?.(livestock)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAnalyze?.(livestock);
        }
      }}
      className="group cursor-pointer rounded-2xl border border-black/5 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card dark:hover:border-primary/40"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-ink dark:text-white">{livestock.livestockId}</h3>
            {livestock.name && <span className="text-xs text-muted dark:text-dark-muted">({livestock.name})</span>}
          </div>
          <p className="text-xs font-medium text-muted dark:text-dark-muted">
            Collar: <span className="text-ink dark:text-gray-300">{livestock.collarId}</span>
          </p>
          <p className="text-xs font-medium text-muted dark:text-dark-muted">
            Device:{' '}
            <span className={livestock.deviceId ? 'text-ink dark:text-gray-300' : 'text-rose-500'}>
              {livestock.deviceId || 'Not linked'}
            </span>
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            hasTelemetry
              ? status === 'Online'
                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
              : 'bg-gray-100 text-muted dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              status === 'Online' ? 'animate-pulse bg-emerald-500' : 'bg-gray-400'
            }`}
          />
          {hasTelemetry ? status : 'Not synced'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-surface-light p-2.5 dark:bg-dark-surface/60">
          <span className="text-muted dark:text-dark-muted">Breed &amp; Gender</span>
          <p className="mt-0.5 font-semibold text-ink dark:text-gray-200">
            {livestock.breed || '—'} · {livestock.gender || '—'}
          </p>
        </div>
        <div className="rounded-xl bg-surface-light p-2.5 dark:bg-dark-surface/60">
          <span className="text-muted dark:text-dark-muted">Shed</span>
          <p className="mt-0.5 font-semibold text-ink dark:text-gray-200">{livestock.shedName || '—'}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3 text-xs text-muted dark:border-white/5 dark:text-dark-muted">
        <div className="flex items-center gap-1">
          <FiBatteryCharging className={batteryColor} />
          <span className="font-medium text-ink dark:text-gray-200">
            {livestock.battery != null ? `${livestock.battery}%` : '—'}
          </span>
        </div>

        {livestock.temperature != null && (
          <div className="flex items-center gap-1">
            <FiThermometer
              className={
                livestock.temperature > getTempThreshold() ? 'text-rose-500' : 'text-amber-500'
              }
            />
            <span className="font-medium text-ink dark:text-gray-200">{livestock.temperature}°C</span>
          </div>
        )}

        {livestock.signalStrength != null && (
          <div className="flex items-center gap-1">
            <FiWifi className="text-blue-500" />
            <span className="font-medium text-ink dark:text-gray-200">{livestock.signalStrength} dBm</span>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView?.(livestock);
          }}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-black/10 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary dark:border-white/10 dark:text-gray-200 dark:hover:border-primary dark:hover:text-primary"
        >
          <FiEye /> View Profile
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAnalyze?.(livestock);
          }}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-white dark:bg-primary/20 dark:text-primary-light dark:hover:bg-primary"
        >
          <FiTrendingUp /> Analyze
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.(livestock);
          }}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-black/10 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary dark:border-white/10 dark:text-gray-200 dark:hover:border-primary dark:hover:text-primary"
        >
          <FiEdit2 /> Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(livestock);
          }}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-black/10 py-2 text-xs font-semibold text-rose-500 transition-colors hover:border-rose-500 hover:bg-rose-500/5 dark:border-white/10 dark:hover:border-rose-500"
        >
          <FiTrash2 /> Delete
        </button>
      </div>
    </div>
  );
}
