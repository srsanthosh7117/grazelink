import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCopy, FiCheck, FiMapPin, FiLoader, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';
import { useDevices } from '@/hooks/useDevices';
import { useFarmProfile } from '@/hooks/useFarmProfile';
import { registerLivestock, generateLivestockId } from '@/services/livestock';
import { registerDevice, updateDevice, getDevice } from '@/services/devices';
import { Livestock, LivestockPayload } from '@/types/livestock';
import { DevicePayload } from '@/types/device';
import { useToast } from '@/context/ToastContext';

interface AddLivestockModalProps {
  open: boolean;
  onClose: () => void;
  livestock?: Livestock | null;
  /** Renders the form as an inline page card instead of a modal overlay. */
  embedded?: boolean;
}

const inputClass =
  'mt-1 w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary dark:border-white/10 dark:bg-dark-surface dark:text-white dark:focus:border-primary';
const labelClass = 'text-xs font-semibold text-muted dark:text-dark-muted';

const BREED_OPTIONS = ['Saanen', 'Alpine', 'Nubian', 'Boer', 'Toggenburg', 'Jamunapari', 'Malabari', 'Beetal'];
const SHED_OPTIONS = ['Shed A', 'Shed B', 'Shed C', 'Shed D'];

/** Default location used when a user simulates a GPS fix (no collar hardware). */
const SIMULATED_COORDS = { lat: 11.2163, lng: 78.1637 };

export default function AddLivestockModal({ open, onClose, livestock, embedded = false }: AddLivestockModalProps) {
  const { user } = useAuth();
  const { devices } = useDevices();
  const { profile } = useFarmProfile();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [manualDeviceId, setManualDeviceId] = useState('');
  const [pendingDevice, setPendingDevice] = useState<{ id: string; deviceId: string; apiKey: string } | null>(null);
  const [gpsState, setGpsState] = useState<'idle' | 'waiting' | 'confirmed'>('idle');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const isEdit = Boolean(livestock);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<LivestockPayload>({
    defaultValues: livestock ?? {
      gender: 'Male',
      healthStatus: 'Healthy',
      vaccinationStatus: 'Up to date',
    },
  });

  useEffect(() => {
    if (open) {
      setPendingDevice(null);
      setGpsState('idle');
      setGpsCoords(null);
      setCopied(false);
      setError('');
      if (livestock) {
        reset(livestock);
        const linked = devices.find((d) => d.deviceId === livestock.deviceId);
        if (linked) {
          setSelectedDeviceId(linked.id);
          setManualDeviceId('');
        } else {
          setSelectedDeviceId('');
          setManualDeviceId(livestock.deviceId ?? '');
        }
      } else {
        reset({
          gender: 'Male',
          healthStatus: 'Healthy',
          vaccinationStatus: 'Up to date',
          farmName: profile?.farmName || (user?.displayName ? `${user.displayName}'s Farm` : 'Main Farm'),
          owner: user?.displayName || user?.email || '',
        });
        setSelectedDeviceId('');
        setManualDeviceId('');
        if (user) {
          generateLivestockId(user.uid).then((id) => setValue('livestockId', id));
        }
      }
    }
  }, [open, livestock, reset, setValue, user, profile, devices]);

  // Poll the freshly registered collar until its first GPS fix arrives.
  useEffect(() => {
    if (!pendingDevice || gpsState !== 'waiting') return;
    let cancelled = false;

    const poll = async () => {
      try {
        const dev = await getDevice(pendingDevice.id);
        if (cancelled) return;
        if (dev?.registrationStatus === 'gps_confirmed') {
          setGpsState('confirmed');
          if (dev.initialLatitude != null && dev.initialLongitude != null) {
            setGpsCoords({ lat: dev.initialLatitude, lng: dev.initialLongitude });
          }
          setSelectedDeviceId(pendingDevice.id);
          clearInterval(timer);
        }
      } catch {
        // transient read error — keep polling
      }
    };

    const timer = setInterval(poll, 3000);
    poll();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pendingDevice, gpsState]);

  const close = () => {
    reset();
    setError('');
    setPendingDevice(null);
    setGpsState('idle');
    setGpsCoords(null);
    onClose();
  };

  const handleDeviceChange = (value: string) => {
    setSelectedDeviceId(value);
    if (value && value !== 'new') {
      const device = devices.find((d) => d.id === value);
      if (device?.collarId) setValue('collarId', device.collarId);
    }
  };

  const registerCollar = async () => {
    if (!user) return;
    const deviceId = manualDeviceId.trim();
    if (!deviceId) {
      setError('Enter the new collar\'s device ID (e.g. GZL-001).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { docRef, apiKey } = await registerDevice(user.uid, {
        deviceId,
        farmUid: user.uid,
        farmName: profile?.farmName || (user.displayName ? `${user.displayName}'s Farm` : 'Red valley Farm'),
        shedName: '',
        firmwareVersion: '',
        battery: 0,
        wifiSignal: 0,
        temperature: 0,
        status: 'Offline',
        lastSync: '',
      });
      setPendingDevice({ id: docRef.id, deviceId, apiKey });
      setGpsState('waiting');
      showToast('success', `${deviceId} registered. Waiting for its first GPS fix...`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not register collar.';
      setError(message);
      showToast('error', message);
    } finally {
      setSaving(false);
    }
  };

  const cancelRegistration = () => {
    setPendingDevice(null);
    setGpsState('idle');
    setGpsCoords(null);
    setSelectedDeviceId('');
    setManualDeviceId('');
  };

  const simulateGpsFix = async () => {
    if (!pendingDevice) return;
    setSaving(true);
    setError('');
    try {
      await updateDevice(pendingDevice.id, {
        registrationStatus: 'gps_confirmed',
        initialLatitude: SIMULATED_COORDS.lat,
        initialLongitude: SIMULATED_COORDS.lng,
        status: 'Online',
        lastSync: new Date().toISOString(),
      });
      setGpsCoords(SIMULATED_COORDS);
      setGpsState('confirmed');
      setSelectedDeviceId(pendingDevice.id);
      showToast('success', `${pendingDevice.deviceId} GPS fix confirmed (simulated).`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not simulate the GPS fix.';
      setError(message);
      showToast('error', message);
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async (data: LivestockPayload) => {
    if (!user) return;

    if (pendingDevice && gpsState !== 'confirmed') {
      setError('Wait for the collar\'s GPS fix to be confirmed before saving.');
      return;
    }
    if (!pendingDevice && selectedDeviceId === 'new') {
      setError('Enter a device ID and click "Register Collar & Confirm GPS" first.');
      return;
    }

    setSaving(true);
    setError('');

    let linkedDeviceId: string | undefined;
    let linkedDeviceDocId: string | undefined;
    let gpsFromDevice: { lat: number; lng: number } | null = null;

    if (pendingDevice && gpsState === 'confirmed') {
      linkedDeviceId = pendingDevice.deviceId;
      linkedDeviceDocId = pendingDevice.id;
      gpsFromDevice = gpsCoords;
    } else if (selectedDeviceId) {
      const dev = devices.find((d) => d.id === selectedDeviceId);
      linkedDeviceId = dev?.deviceId;
      linkedDeviceDocId = selectedDeviceId;
      if (dev?.initialLatitude != null && dev?.initialLongitude != null) {
        gpsFromDevice = { lat: dev.initialLatitude, lng: dev.initialLongitude };
      }
    }

    const payload: LivestockPayload = {
      ...data,
      age: Number(data.age),
      weight: Number(data.weight),
      farmUid: user.uid,
      farmName: profile?.farmName || (user.displayName ? `${user.displayName}'s Farm` : 'Red valley Farm'),
      owner: user.displayName || user.email || 'Farm Owner',
    };
    if (!payload.collarId) payload.collarId = `CL-${String(data.livestockId).replace(/^GT-/i, '')}`;
    if (!payload.dateOfBirth && payload.age > 0) {
      const d = new Date();
      d.setMonth(d.getMonth() - Number(payload.age));
      payload.dateOfBirth = d.toISOString().slice(0, 10);
    }
    delete payload.battery;
    delete payload.gpsStatus;
    // Coordinates always come from the collar — never typed in by hand.
    if (gpsFromDevice) {
      payload.lat = gpsFromDevice.lat;
      payload.lng = gpsFromDevice.lng;
    } else {
      delete payload.lat;
      delete payload.lng;
    }
    if (linkedDeviceId) payload.deviceId = linkedDeviceId;
    else delete payload.deviceId;

    try {
      const livestockDocId = isEdit && livestock ? livestock.id : (await registerLivestock(user.uid, payload)).id;

      if (isEdit && livestock?.deviceId && livestock.deviceId !== linkedDeviceId) {
        const oldDevice = devices.find((d) => d.deviceId === livestock.deviceId);
        if (oldDevice) {
          await updateDevice(oldDevice.id, {
            livestockId: null,
            livestockDocId: null,
            collarId: null,
            farmName: null,
            shedName: null,
          } as unknown as Partial<DevicePayload>);
        }
      }

      if (linkedDeviceId && linkedDeviceDocId) {
        await updateDevice(linkedDeviceDocId, {
          livestockId: data.livestockId,
          livestockDocId,
          collarId: payload.collarId,
          farmName: payload.farmName,
          shedName: payload.shedName,
        });
      }

      showToast('success', `${data.livestockId} saved successfully.`);
      close();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save livestock record.';
      setError(message);
      showToast('error', message);
    } finally {
      setSaving(false);
    }
  };

  const copyApiKey = async () => {
    if (!pendingDevice) return;
    await navigator.clipboard.writeText(pendingDevice.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const cardContent = (
    <>
      <div className="flex items-center justify-between border-b border-black/5 pb-4 dark:border-white/5">
              <div>
                <h2 className="text-xl font-bold text-ink dark:text-white">
                  {isEdit ? 'Edit Livestock Record' : 'Register New Livestock'}
                </h2>
                <p className="text-xs text-muted dark:text-dark-muted">
                  Fill in the essentials — telemetry (incl. GPS) is reported by the collar itself.
                </p>
              </div>
              <button
                onClick={close}
                aria-label="Close"
                className="rounded-xl p-2 text-muted hover:bg-surface-light dark:text-dark-muted dark:hover:bg-dark-surface"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Livestock ID</label>
                <input className={inputClass} {...register('livestockId', { required: true })} placeholder="GT-0001" />
                {errors.livestockId && <p className="mt-1 text-xs text-rose-500">Required</p>}
              </div>

              <div>
                <label className={labelClass}>Breed</label>
                <select className={inputClass} {...register('breed', { required: true })}>
                  {(livestock && !BREED_OPTIONS.includes(livestock.breed) ? [livestock.breed, ...BREED_OPTIONS] : BREED_OPTIONS).map(
                    (b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ),
                  )}
                </select>
                {errors.breed && <p className="mt-1 text-xs text-rose-500">Required</p>}
              </div>

              <div>
                <label className={labelClass}>Gender</label>
                <select className={inputClass} {...register('gender', { required: true })}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Age (months)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className={inputClass}
                  {...register('age', { required: true, min: 0 })}
                />
              </div>

              <div>
                <label className={labelClass}>Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className={inputClass}
                  {...register('weight', { required: true, min: 0 })}
                />
              </div>

              <div>
                <label className={labelClass}>Health Status</label>
                <select className={inputClass} {...register('healthStatus')}>
                  <option value="Healthy">Healthy</option>
                  <option value="Under Observation">Under Observation</option>
                  <option value="Sick">Sick</option>
                  <option value="Injured">Injured</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Vaccination Status</label>
                <select className={inputClass} {...register('vaccinationStatus')}>
                  <option value="Up to date">Up to date</option>
                  <option value="Due">Due</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Shed Name</label>
                <select className={inputClass} {...register('shedName')}>
                  {(livestock && !SHED_OPTIONS.includes(livestock.shedName) ? [livestock.shedName, ...SHED_OPTIONS] : SHED_OPTIONS).map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className={labelClass}>Link Smart Collar (Module)</label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => handleDeviceChange(e.target.value)}
                  disabled={saving}
                  className={inputClass}
                >
                  <option value="">None — no collar linked</option>
                  {pendingDevice && (
                    <option value={pendingDevice.id} disabled={gpsState !== 'confirmed'}>
                      {pendingDevice.deviceId} · {gpsState === 'confirmed' ? 'GPS confirmed' : 'waiting for GPS...'}
                    </option>
                  )}
                  {devices
                    .filter((d) => !d.livestockId || (isEdit && livestock && d.livestockId === livestock.livestockId))
                    .map((d) => (
                      <option key={d.id} value={d.id} disabled={d.registrationStatus === 'pending'}>
                        {d.deviceId} · Collar {d.collarId} ({d.status})
                        {d.registrationStatus === 'pending' ? ' — waiting for GPS' : ''}
                      </option>
                    ))}
                  {devices
                    .filter((d) => d.livestockId && !(isEdit && livestock && d.livestockId === livestock.livestockId))
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.deviceId} · Collar {d.collarId} (linked to {d.livestockId})
                      </option>
                    ))}
                  <option value="new">＋ Register a new collar...</option>
                </select>

                {selectedDeviceId === 'new' && !pendingDevice && (
                  <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <label className={labelClass}>New Collar Device ID</label>
                    <input
                      value={manualDeviceId}
                      onChange={(e) => setManualDeviceId(e.target.value)}
                      disabled={saving}
                      placeholder="GZL-001"
                      className={inputClass}
                    />
                    <p className="mt-2 text-xs text-muted dark:text-dark-muted">
                      The collar is registered, then waits to report its <b>first GPS fix</b>.
                      Only then can it be linked to this livestock — the coordinates come from the collar itself.
                    </p>
                    <button
                      type="button"
                      onClick={registerCollar}
                      disabled={saving}
                      className="mt-3 flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-card transition-all hover:scale-[1.02] hover:bg-primary-dark disabled:opacity-60"
                    >
                      <FiRefreshCw /> Register Collar &amp; Confirm GPS
                    </button>
                  </div>
                )}

                {pendingDevice && (
                  <div className="mt-3 rounded-2xl border border-black/10 bg-surface-light p-4 dark:border-white/10 dark:bg-dark-surface">
                    <div className="flex items-center justify-between">
                      <p className={labelClass}>
                        Device ID:{' '}
                        <span className="font-mono text-xs font-bold text-ink dark:text-white">
                          {pendingDevice.deviceId}
                        </span>
                      </p>
                      {gpsState !== 'confirmed' && (
                        <button
                          type="button"
                          onClick={cancelRegistration}
                          className="text-xs font-semibold text-muted hover:text-rose-500 dark:text-dark-muted"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    {gpsState === 'waiting' && (
                      <>
                        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                          <FiLoader className="animate-spin" /> Waiting for the collar's first GPS fix...
                        </p>
                        <p className="mt-2 text-xs text-muted dark:text-dark-muted">
                          Flash the firmware with this device ID + API key, then power the collar. It will
                          connect, grab a satellite fix, and report its location — this modal updates
                          automatically. API key:
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-xl border border-black/10 bg-white px-3 py-2 font-mono text-xs text-ink dark:border-white/10 dark:bg-dark-surface dark:text-white">
                            {pendingDevice.apiKey}
                          </code>
                          <button
                            type="button"
                            onClick={copyApiKey}
                            className="flex items-center gap-1 rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-gray-200"
                          >
                            {copied ? <FiCheck /> : <FiCopy />} {copied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <p className="mt-2 rounded-xl bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-400">
                          Saving the livestock is blocked until the GPS fix is confirmed.
                        </p>
                        <button
                          type="button"
                          onClick={simulateGpsFix}
                          disabled={saving}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-6 py-2.5 text-sm font-semibold text-primary transition-all hover:scale-[1.02] hover:bg-primary/20 disabled:opacity-60"
                        >
                          <FiMapPin /> Simulate GPS fix (demo — no collar needed)
                        </button>
                      </>
                    )}

                    {gpsState === 'confirmed' && (
                      <div className="mt-3 rounded-xl bg-emerald-500/10 p-3">
                        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                          <FiMapPin /> GPS confirmed from collar
                        </p>
                        {gpsCoords ? (
                          <p className="mt-1 font-mono text-xs text-ink dark:text-white">
                            {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-muted dark:text-dark-muted">
                            Fix confirmed — coordinates will stream in with telemetry.
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                          This collar is now linkable. Save the livestock to attach it.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && <p className="sm:col-span-3 text-sm text-rose-500">{error}</p>}

              <p className="sm:col-span-3 text-xs text-muted dark:text-dark-muted">
                Farm, owner, collar ID, and date of birth are filled in automatically. Battery, GPS, and
                temperature are reported by the collar itself.
              </p>

              <div className="sm:col-span-3 mt-2 flex gap-3 border-t border-black/5 pt-4 dark:border-white/5">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white shadow-card transition-all hover:scale-[1.02] hover:bg-primary-dark disabled:opacity-60"
                >
                  {saving ? 'Saving...' : isEdit ? 'Update Livestock' : 'Save Livestock'}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-full border border-black/10 px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
    </>
  );

  return (
    <>
      <AnimatePresence>
        {open && !embedded && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          >
            <motion.div
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-card dark:bg-dark-card dark:text-white dark:shadow-dark-card md:p-8"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              {cardContent}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {embedded && open && (
        <div className="w-full max-w-3xl rounded-3xl border border-black/5 bg-white p-6 shadow-soft dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card md:p-8">
          {cardContent}
        </div>
      )}
    </>
  );
}
