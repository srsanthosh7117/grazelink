import { useState } from 'react';
import { FiBell, FiCheckCircle, FiTrash2, FiAlertTriangle, FiFilter } from 'react-icons/fi';
import { useAlerts } from '@/hooks/useAlerts';
import { markAlertRead, dismissAlert } from '@/services/alerts';
import EmptyState from '@/components/Dashboard/EmptyState';
import { ALERT_LABELS, AlertType } from '@/types/alert';
import { useToast } from '@/context/ToastContext';

export default function Alerts() {
  const { alerts, loading } = useAlerts();
  const { showToast } = useToast();
  const [filterType, setFilterType] = useState<string>('all');

  const handleMarkRead = async (id: string) => {
    try {
      await markAlertRead(id);
      showToast('success', 'Alert marked as read.');
    } catch {
      showToast('error', 'Could not update alert status.');
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissAlert(id);
      showToast('success', 'Alert dismissed.');
    } catch {
      showToast('error', 'Could not dismiss alert.');
    }
  };

  const filteredAlerts =
    filterType === 'all'
      ? alerts
      : alerts.filter((a) => a.type === filterType);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink dark:text-white md:text-3xl">
            Alert Center &amp; Notifications
          </h1>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">
            Automated security, health, and device notifications.
          </p>
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2">
          <FiFilter className="text-muted dark:text-dark-muted" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink outline-none shadow-soft transition-colors focus:border-primary dark:border-white/10 dark:bg-dark-card dark:text-white"
          >
            <option value="all">All Alert Types ({alerts.length})</option>
            {Object.entries(ALERT_LABELS).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          icon={FiBell}
          title="No Alerts Found"
          description="Your livestock and smart collars are operating within normal parameters."
        />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-3xl border p-5 shadow-soft transition-all ${
                alert.read
                  ? 'border-black/5 bg-white opacity-80 dark:border-white/5 dark:bg-dark-card'
                  : 'border-amber-500/30 bg-amber-500/5 dark:border-amber-500/30 dark:bg-amber-500/10'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ${
                    alert.severity === 'critical'
                      ? 'bg-rose-500/20 text-rose-500'
                      : alert.severity === 'warning'
                      ? 'bg-amber-500/20 text-amber-500'
                      : 'bg-blue-500/20 text-blue-500'
                  }`}
                >
                  <FiAlertTriangle />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink dark:text-white text-sm">
                      {ALERT_LABELS[alert.type as AlertType] || alert.type}
                    </span>
                    {!alert.read && (
                      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted dark:text-dark-muted">{alert.message}</p>
                  <span className="mt-1 block text-[10px] text-muted/70 dark:text-dark-muted/60">
                    Goat: {alert.goatId || 'N/A'} · Device: {alert.deviceId || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                {!alert.read && (
                  <button
                    onClick={() => handleMarkRead(alert.id)}
                    className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:bg-dark-surface dark:text-white"
                  >
                    <FiCheckCircle /> Mark Read
                  </button>
                )}
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-rose-500 transition-colors hover:border-rose-500 dark:border-white/10 dark:bg-dark-surface"
                >
                  <FiTrash2 /> Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
