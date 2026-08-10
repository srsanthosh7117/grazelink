import { useState } from 'react';
import { FiCpu, FiPlus, FiWifi, FiBatteryCharging, FiThermometer, FiTrash2, FiEdit2, FiX, FiKey, FiCopy, FiRefreshCw, FiEye, FiEyeOff } from 'react-icons/fi';
import { useDevices } from '@/hooks/useDevices';
import { useAuth } from '@/hooks/useAuth';
import { registerDevice, deleteDevice, updateDevice, regenerateDeviceApiKey } from '@/services/devices';
import EmptyState from '@/components/Dashboard/EmptyState';
import { useToast } from '@/context/ToastContext';
import { Device, DevicePayload } from '@/types/device';
import { useForm } from 'react-hook-form';

export default function Devices() {
  const { user } = useAuth();
  const { devices, loading, onlineDevices, offlineDevices } = useDevices();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [saving, setSaving] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [rotating, setRotating] = useState<string | null>(null);

  const toggleReveal = (id: string) => setRevealedKeys((prev) => ({ ...prev, [id]: !prev[id] }));

  const copyKey = async (key: string, deviceId: string) => {
    try {
      await navigator.clipboard.writeText(key);
      showToast('success', `API key for ${deviceId} copied. Paste it into the collar's firmware config.`);
    } catch {
      showToast('error', 'Could not copy to clipboard. Reveal the key and copy it manually.');
    }
  };

  const handleRegenerate = async (d: Device) => {
    if (!confirm(`Rotate the API key for ${d.deviceId}? The old key will stop working immediately — you'll need to reflash the collar.`)) return;
    setRotating(d.id);
    try {
      const newKey = await regenerateDeviceApiKey(d.id);
      setRevealedKeys((prev) => ({ ...prev, [d.id]: true }));
      showToast('success', `New API key issued for ${d.deviceId}.`);
      await copyKey(newKey, d.deviceId);
    } catch {
      showToast('error', 'Could not rotate the API key. Please try again.');
    } finally {
      setRotating(null);
    }
  };

  const { register, handleSubmit, reset } = useForm<DevicePayload>();

  const openAdd = () => {
    setEditingDevice(null);
    reset({
      deviceId: `GZL-${String(devices.length + 1).padStart(3, '0')}`,
      collarId: `CL-${Math.floor(1000 + Math.random() * 9000)}`,
      firmwareVersion: 'v2.1.0',
      battery: 100,
      wifiSignal: -55,
      temperature: 37.5,
      status: 'Online',
      lastSync: new Date().toLocaleTimeString(),
    });
    setModalOpen(true);
  };

  const openEdit = (d: Device) => {
    setEditingDevice(d);
    reset(d);
    setModalOpen(true);
  };

  const handleDelete = async (d: Device) => {
    if (!confirm(`Remove device ${d.deviceId}?`)) return;
    try {
      await deleteDevice(d.id);
      showToast('success', `Device ${d.deviceId} removed.`);
    } catch {
      showToast('error', 'Could not remove device.');
    }
  };

  const onSubmit = async (data: DevicePayload) => {
    if (!user) return;
    setSaving(true);
    try {
      const payload: DevicePayload = {
        ...data,
        battery: Number(data.battery),
        wifiSignal: Number(data.wifiSignal),
        temperature: Number(data.temperature),
        farmUid: user.uid,
      };

      if (editingDevice) {
        await updateDevice(editingDevice.id, payload);
        showToast('success', `Device ${data.deviceId} updated.`);
      } else {
        await registerDevice(user.uid, payload);
        showToast('success', `Device ${data.deviceId} registered. Copy its API key from the card below before flashing the collar.`);
      }
      setModalOpen(false);
    } catch {
      showToast('error', 'Could not save device details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink dark:text-white md:text-3xl">
            Smart Collar Registry
          </h1>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">
            Manage your hardware collars, firmware builds, and wireless sync status.
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition-all hover:scale-105 hover:bg-primary-dark"
        >
          <FiPlus className="text-lg" /> Register Collar Device
        </button>
      </div>

      {/* Connectivity Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs font-semibold">
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-soft dark:border-white/5 dark:bg-dark-card flex items-center justify-between">
          <span className="text-muted dark:text-dark-muted">Registered Collars</span>
          <span className="text-lg font-bold text-ink dark:text-white">{devices.length}</span>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-soft text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
          <span>Active Online Collars</span>
          <span className="text-lg font-bold">{onlineDevices}</span>
        </div>
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 shadow-soft text-rose-600 dark:text-rose-400 flex items-center justify-between">
          <span>Offline / Out of Range</span>
          <span className="text-lg font-bold">{offlineDevices}</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-3xl bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <EmptyState
          icon={FiCpu}
          title="No Collars Registered"
          description="Register hardware collars to pair with your livestock and receive automatic HTTPS telemetry."
          action={{ label: '+ Register Collar Device', onClick: openAdd }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((d) => (
            <div
              key={d.id}
              className="rounded-3xl border border-black/5 bg-white p-6 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-card dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-ink dark:text-white flex items-center gap-2">
                    <FiCpu className="text-primary" /> {d.deviceId}
                  </h3>
                  <p className="text-xs text-muted dark:text-dark-muted">Collar: {d.collarId}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    d.status === 'Online'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                      : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                  }`}
                >
                  {d.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-surface-light p-2.5 dark:bg-dark-surface">
                  <span className="text-muted dark:text-dark-muted flex items-center gap-1">
                    <FiBatteryCharging className="text-emerald-500" /> Battery
                  </span>
                  <p className="mt-0.5 font-bold text-ink dark:text-white">{d.battery}%</p>
                </div>
                <div className="rounded-xl bg-surface-light p-2.5 dark:bg-dark-surface">
                  <span className="text-muted dark:text-dark-muted flex items-center gap-1">
                    <FiWifi className="text-blue-500" /> WiFi Signal
                  </span>
                  <p className="mt-0.5 font-bold text-ink dark:text-white">{d.wifiSignal} dBm</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3 text-xs text-muted dark:border-white/5 dark:text-dark-muted">
                <span>Firmware: {d.firmwareVersion}</span>
                <span className="flex items-center gap-1">
                  <FiThermometer className="text-amber-500" /> {d.temperature}°C
                </span>
              </div>

              <div className="mt-3 rounded-xl bg-surface-light p-2.5 dark:bg-dark-surface">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 font-semibold text-muted dark:text-dark-muted">
                    <FiKey className="text-primary" /> API Key
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleReveal(d.id)}
                      aria-label={revealedKeys[d.id] ? 'Hide API key' : 'Reveal API key'}
                      className="text-muted hover:text-primary dark:text-dark-muted"
                    >
                      {revealedKeys[d.id] ? <FiEyeOff /> : <FiEye />}
                    </button>
                    <button
                      onClick={() => copyKey(d.apiKey, d.deviceId)}
                      aria-label="Copy API key"
                      className="text-muted hover:text-primary dark:text-dark-muted"
                    >
                      <FiCopy />
                    </button>
                    <button
                      onClick={() => handleRegenerate(d)}
                      disabled={rotating === d.id}
                      aria-label="Regenerate API key"
                      className="text-muted hover:text-primary disabled:opacity-50 dark:text-dark-muted"
                    >
                      <FiRefreshCw className={rotating === d.id ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 break-all font-mono text-[11px] text-ink dark:text-white">
                  {revealedKeys[d.id] ? d.apiKey : '•'.repeat(24)}
                </p>
                <p className="mt-1 text-[10px] text-muted dark:text-dark-muted">
                  Flash this into the collar's firmware config as the <code>x-api-key</code> header.
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => openEdit(d)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-black/10 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-gray-200"
                >
                  <FiEdit2 /> Edit
                </button>
                <button
                  onClick={() => handleDelete(d)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-black/10 py-2 text-xs font-semibold text-rose-500 transition-colors hover:border-rose-500 dark:border-white/10"
                >
                  <FiTrash2 /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Device Registration Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-card dark:bg-dark-card dark:text-white">
            <div className="flex items-center justify-between border-b border-black/5 pb-3 dark:border-white/5">
              <h3 className="font-bold text-ink dark:text-white">
                {editingDevice ? 'Edit Device' : 'Register Collar Device'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-muted hover:text-ink">
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-muted dark:text-dark-muted">Device ID</label>
                <input
                  {...register('deviceId', { required: true })}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-surface-light px-3 py-2 text-sm text-ink outline-none focus:border-primary dark:border-white/10 dark:bg-dark-surface dark:text-white"
                />
              </div>
              <div>
                <label className="font-semibold text-muted dark:text-dark-muted">Collar ID</label>
                <input
                  {...register('collarId', { required: true })}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-surface-light px-3 py-2 text-sm text-ink outline-none focus:border-primary dark:border-white/10 dark:bg-dark-surface dark:text-white"
                />
              </div>
              <div>
                <label className="font-semibold text-muted dark:text-dark-muted">Firmware Version</label>
                <input
                  {...register('firmwareVersion', { required: true })}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-surface-light px-3 py-2 text-sm text-ink outline-none focus:border-primary dark:border-white/10 dark:bg-dark-surface dark:text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-muted dark:text-dark-muted">Battery %</label>
                  <input
                    type="number"
                    {...register('battery')}
                    className="mt-1 w-full rounded-xl border border-black/10 bg-surface-light px-3 py-2 text-sm text-ink outline-none focus:border-primary dark:border-white/10 dark:bg-dark-surface dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted dark:text-dark-muted">WiFi dBm</label>
                  <input
                    type="number"
                    {...register('wifiSignal')}
                    className="mt-1 w-full rounded-xl border border-black/10 bg-surface-light px-3 py-2 text-sm text-ink outline-none focus:border-primary dark:border-white/10 dark:bg-dark-surface dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted dark:text-dark-muted">Temp °C</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('temperature')}
                    className="mt-1 w-full rounded-xl border border-black/10 bg-surface-light px-3 py-2 text-sm text-ink outline-none focus:border-primary dark:border-white/10 dark:bg-dark-surface dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold text-white shadow-card hover:bg-primary-dark"
                >
                  {saving ? 'Saving...' : 'Save Hardware Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
