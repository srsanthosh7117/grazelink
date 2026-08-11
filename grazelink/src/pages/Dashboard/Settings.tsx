import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBell,
  FiClock,
  FiDownload,
  FiKey,
  FiMapPin,
  FiMoon,
  FiSave,
  FiShield,
  FiSun,
  FiThermometer,
  FiTrash2,
  FiX,
  FiHome,
  FiUser,
  FiSmartphone,
} from 'react-icons/fi';
import { updatePassword, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { farmCenterOf } from '@/hooks/useGeofence';
import { useFarmGeofence } from '@/hooks/useFarmGeofence';
import { useFarmProfile } from '@/hooks/useFarmProfile';
import { useAllLivestock } from '@/hooks/useAllLivestock';
import { updateFarmProfile } from '@/services/auth';
import { auth } from '@/services/firebase';
import { deleteFarmAccount } from '@/services/deleteAccount';
import { getAuthErrorMessage } from '@/utils/authErrors';
import { withTimeout } from '@/utils/withTimeout';

function usePreference<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}

const inputCls =
  'w-full rounded-xl border border-black/10 bg-surface-light px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary dark:border-white/10 dark:bg-dark-surface dark:text-white';

const sectionCard =
  'rounded-2xl border border-black/5 bg-white p-6 shadow-soft dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { profile, loading: profileLoading } = useFarmProfile();
  const { livestock, loading: livestockLoading } = useAllLivestock();

  // Geofence — server-backed settings (cloud copy + live sync)
  const {
    enabled: geofenceEnabled,
    radiusM: geofenceRadiusM,
    center: geofenceCenter,
    loading: geofenceLoading,
    saveFarmGeofence,
  } = useFarmGeofence();
  const [geofenceDraft, setGeofenceDraft] = useState<{
    enabled: boolean;
    radiusM: number;
    centerLat: string;
    centerLng: string;
  }>({ enabled: false, radiusM: 500, centerLat: '', centerLng: '' });
  const [geofenceSaving, setGeofenceSaving] = useState(false);
  const [geofenceDirty, setGeofenceDirty] = useState(false);

  useEffect(() => {
    if (geofenceLoading) return;
    setGeofenceDraft({
      enabled: geofenceEnabled,
      radiusM: geofenceRadiusM,
      centerLat: geofenceCenter ? String(geofenceCenter.lat) : '',
      centerLng: geofenceCenter ? String(geofenceCenter.lng) : '',
    });
  }, [geofenceLoading, geofenceEnabled, geofenceRadiusM, geofenceCenter]);

  const handleSaveGeofence = async () => {
    if (!user) return;
    setGeofenceSaving(true);
    try {
      const centerLat = Number(geofenceDraft.centerLat);
      const centerLng = Number(geofenceDraft.centerLng);
      const hasCenter =
        Number.isFinite(centerLat) && Number.isFinite(centerLng) && (centerLat !== 0 || centerLng !== 0);
      await saveFarmGeofence({
        enabled: geofenceDraft.enabled,
        radiusM: geofenceDraft.radiusM,
        center: hasCenter ? { lat: centerLat, lng: centerLng } : null,
      });
      setGeofenceDirty(false);
      showToast('success', 'Geofence saved — the server now enforces this safe zone.');
    } catch {
      showToast('error', 'Could not save geofence settings. Please try again.');
    } finally {
      setGeofenceSaving(false);
    }
  };

  const [batteryThreshold, setBatteryThreshold] = usePreference('gl_battery_threshold', 20);
  const [temperatureThreshold, setTemperatureThreshold] = usePreference('gl_temp_threshold', 40);

  // Farm profile form
  const [profileFields, setProfileFields] = useState({
    fullName: '',
    farmName: '',
    farmAddress: '',
    numberOfSheds: 0,
    phoneNumber: '',
    country: '',
    state: '',
    district: '',
    village: '',
    pincode: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');

  // Delete account
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const isDark = theme === 'dark';

  useEffect(() => {
    if (profile) {
      setProfileFields({
        fullName: profile.fullName,
        farmName: profile.farmName,
        farmAddress: profile.farmAddress,
        numberOfSheds: profile.numberOfSheds,
        phoneNumber: profile.phoneNumber,
        country: profile.country,
        state: profile.state,
        district: profile.district,
        village: profile.village,
        pincode: profile.pincode ?? '',
      });
    }
  }, [profile]);

  const setField = (key: keyof typeof profileFields) => (value: string | number) =>
    setProfileFields((prev) => ({ ...prev, [key]: value }));

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    setProfileError('');
    try {
      await updateFarmProfile(user.uid, {
        fullName: profileFields.fullName,
        farmName: profileFields.farmName,
        farmAddress: profileFields.farmAddress,
        numberOfSheds: Number(profileFields.numberOfSheds) || 0,
        phoneNumber: profileFields.phoneNumber,
        country: profileFields.country,
        state: profileFields.state,
        district: profileFields.district,
        village: profileFields.village,
        pincode: profileFields.pincode,
      });
      if (profileFields.fullName !== user.displayName) {
        await updateProfile(user, { displayName: profileFields.fullName });
      }
      showToast('success', 'Farm profile saved successfully.');
    } catch {
      setProfileError('Could not save your farm profile. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const current = auth.currentUser;
    if (!current || !current.email) {
      setPwdError('You are not signed in.');
      return;
    }
    if (!currentPassword) {
      setPwdError('Enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }
    setPwdSaving(true);
    setPwdError('');
    try {
      await withTimeout(
        reauthenticateWithCredential(
          current,
          EmailAuthProvider.credential(current.email, currentPassword),
        ),
        15000,
        'Could not verify your current password.',
      );
      await withTimeout(updatePassword(current, newPassword), 15000, 'Could not update your password.');
      showToast('success', 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwdError(getAuthErrorMessage(err));
    } finally {
      setPwdSaving(false);
    }
  };

  const handleExport = () => {
    if (livestock.length === 0) {
      showToast('error', 'No livestock to export yet.');
      return;
    }
    const headers = [
      'Livestock ID', 'Name', 'Breed', 'Gender', 'Age', 'Weight (kg)', 'Health',
      'Vaccination', 'Shed', 'Device Status', 'Battery (%)', 'Temperature (°C)', 'Last Seen',
    ];
    const rows = livestock.map((g) => [
      g.livestockId, g.name, g.breed, g.gender, g.age, g.weight, g.healthStatus,
      g.vaccinationStatus, g.shedName, g.status ?? '', g.battery ?? '', g.temperature ?? '', g.lastSeen ?? '',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grazelink-herd-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', `Exported ${livestock.length} livestock as CSV.`);
  };

  const handleDeleteAccount = async () => {
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Type DELETE to confirm you want to permanently remove your account.');
      return;
    }
    if (!password) {
      setDeleteError('Enter your account password to continue.');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteFarmAccount(password);
      showToast('success', 'Your account and all farm data have been permanently deleted.');
      navigate('/');
    } catch (err) {
      setDeleteError(getAuthErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ===== Header ===== */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink dark:text-white md:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          Manage your farm profile, alert thresholds, security, and data.
        </p>
      </div>

      {/* ===== Appearance ===== */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted dark:text-dark-muted">
          <FiMoon className="text-base text-primary" /> Appearance
        </h2>
        <div className={sectionCard}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-xl text-primary dark:bg-primary/20 dark:text-primary-light">
                {isDark ? <FiMoon /> : <FiSun />}
              </div>
              <div>
                <p className="font-bold text-ink dark:text-white">Dark Mode</p>
                <p className="text-xs text-muted dark:text-dark-muted">
                  {isDark ? 'Dark mode is enabled' : 'Light mode is enabled'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              aria-pressed={isDark}
              className={`relative h-8 w-16 shrink-0 rounded-full transition-colors ${
                isDark ? 'bg-primary' : 'bg-black/10 dark:bg-white/10'
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
                  isDark ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ===== Alert Thresholds ===== */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted dark:text-dark-muted">
          <FiBell className="text-base text-primary" /> Alert Thresholds
        </h2>
        <div className={`${sectionCard} space-y-6`}>
          <p className="text-xs text-muted dark:text-dark-muted">
            These thresholds are applied live across the dashboard — the low-battery and
            high-temperature counts, badges, and GPS map markers all respect them.
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted dark:text-dark-muted">
                  <FiClock className="h-3.5 w-3.5" /> Low Battery Threshold
                </span>
                <span className="font-mono text-sm font-bold text-ink dark:text-white">
                  {batteryThreshold}%
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={batteryThreshold}
                onChange={(e) => setBatteryThreshold(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="mt-1 flex justify-between text-[10px] font-medium text-muted dark:text-dark-muted">
                <span>5%</span>
                <span>50%</span>
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted dark:text-dark-muted">
                  <FiThermometer className="h-3.5 w-3.5" /> High Temperature Threshold
                </span>
                <span className="font-mono text-sm font-bold text-ink dark:text-white">
                  {temperatureThreshold}°C
                </span>
              </div>
              <input
                type="range"
                min="38"
                max="45"
                step="0.5"
                value={temperatureThreshold}
                onChange={(e) => setTemperatureThreshold(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="mt-1 flex justify-between text-[10px] font-medium text-muted dark:text-dark-muted">
                <span>38°C</span>
                <span>45°C</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Geofence ===== */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted dark:text-dark-muted">
          <FiShield className="text-base text-primary" /> Geofencing
        </h2>
        <div className={sectionCard}>
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-xl text-blue-500">
              <FiMapPin />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink dark:text-white">Safe Zone &amp; Breach Alerts</p>
              <p className="text-xs text-muted dark:text-dark-muted">
                Saved to the cloud so the ingestion server raises breach alerts on every collar report —
                even when no dashboard is open.
              </p>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={geofenceDraft.enabled}
              onChange={(e) => {
                setGeofenceDraft((d) => ({ ...d, enabled: e.target.checked }));
                setGeofenceDirty(true);
              }}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-sm font-semibold text-ink dark:text-white">Enable geofence enforcement</span>
          </label>

          <div className="mt-4 flex items-center gap-4">
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={geofenceDraft.radiusM}
              onChange={(e) => {
                setGeofenceDraft((d) => ({ ...d, radiusM: Number(e.target.value) }));
                setGeofenceDirty(true);
              }}
              className="w-full accent-primary"
            />
            <span className="shrink-0 font-mono text-sm font-bold text-ink dark:text-white">
              {geofenceDraft.radiusM} m
            </span>
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-medium text-muted dark:text-dark-muted">
            <span>100 m</span>
            <span>2000 m</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted dark:text-dark-muted">
                Zone Centre Latitude
              </label>
              <input
                value={geofenceDraft.centerLat}
                onChange={(e) => {
                  setGeofenceDraft((d) => ({ ...d, centerLat: e.target.value }));
                  setGeofenceDirty(true);
                }}
                placeholder="e.g. -25.7461"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted dark:text-dark-muted">
                Zone Centre Longitude
              </label>
              <input
                value={geofenceDraft.centerLng}
                onChange={(e) => {
                  setGeofenceDraft((d) => ({ ...d, centerLng: e.target.value }));
                  setGeofenceDirty(true);
                }}
                placeholder="e.g. 28.1881"
                className={inputCls}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const herdCenter = farmCenterOf(livestock);
              if (herdCenter) {
                setGeofenceDraft((d) => ({
                  ...d,
                  centerLat: String(herdCenter.lat),
                  centerLng: String(herdCenter.lng),
                }));
                setGeofenceDirty(true);
              }
            }}
            disabled={livestockLoading || livestock.length === 0}
            className="mt-3 text-xs font-semibold text-primary transition-colors hover:text-primary-dark disabled:opacity-50 dark:text-primary-light"
          >
            Use current herd centre
          </button>

          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-xs text-muted dark:text-dark-muted">
              {geofenceDirty
                ? 'You have unsaved geofence changes.'
                : geofenceEnabled
                  ? 'Geofence is active — the server monitors every collar report.'
                  : 'Geofence is off. Enable it to raise breach alerts from the server.'}
            </p>
            <button
              onClick={handleSaveGeofence}
              disabled={geofenceSaving || !geofenceDirty}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-card transition-all hover:bg-primary-dark disabled:opacity-50"
            >
              <FiSave className="text-sm" />
              {geofenceSaving ? 'Saving...' : 'Save Geofence'}
            </button>
          </div>
        </div>
      </div>

      {/* ===== Farm Profile ===== */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted dark:text-dark-muted">
          <FiHome className="text-base text-primary" /> Farm Profile
        </h2>
        <div className={sectionCard}>
          {profileLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-11 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-muted dark:text-dark-muted">
                    <FiUser className="h-3 w-3" /> Full Name
                  </label>
                  <input
                    value={profileFields.fullName}
                    onChange={(e) => setField('fullName')(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-muted dark:text-dark-muted">
                    <FiHome className="h-3 w-3" /> Farm Name
                  </label>
                  <input
                    value={profileFields.farmName}
                    onChange={(e) => setField('farmName')(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-muted dark:text-dark-muted">
                    <FiSmartphone className="h-3 w-3" /> Phone Number
                  </label>
                  <input
                    value={profileFields.phoneNumber}
                    onChange={(e) => setField('phoneNumber')(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 text-xs font-semibold text-muted dark:text-dark-muted">
                    Number of Sheds
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={profileFields.numberOfSheds}
                    onChange={(e) => setField('numberOfSheds')(Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 text-xs font-semibold text-muted dark:text-dark-muted">
                    Farm Address
                  </label>
                  <input
                    value={profileFields.farmAddress}
                    onChange={(e) => setField('farmAddress')(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 text-xs font-semibold text-muted dark:text-dark-muted">
                    Country
                  </label>
                  <input
                    value={profileFields.country}
                    onChange={(e) => setField('country')(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 text-xs font-semibold text-muted dark:text-dark-muted">
                    State
                  </label>
                  <input
                    value={profileFields.state}
                    onChange={(e) => setField('state')(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 text-xs font-semibold text-muted dark:text-dark-muted">
                    District
                  </label>
                  <input
                    value={profileFields.district}
                    onChange={(e) => setField('district')(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 text-xs font-semibold text-muted dark:text-dark-muted">
                    City / Village
                  </label>
                  <input
                    value={profileFields.village}
                    onChange={(e) => setField('village')(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 text-xs font-semibold text-muted dark:text-dark-muted">
                    Pincode
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={6}
                    value={profileFields.pincode}
                    onChange={(e) => setField('pincode')(e.target.value.replace(/\D/g, ''))}
                    className={inputCls}
                    placeholder="6-digit pincode"
                  />
                </div>
              </div>

              {profileError && (
                <p className="mt-4 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-500">
                  {profileError}
                </p>
              )}

              <div className="mt-5 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  <FiSave className="text-base" />
                  {profileSaving ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== Security ===== */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted dark:text-dark-muted">
          <FiKey className="text-base text-primary" /> Security
        </h2>
        <div className={sectionCard}>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-xl text-emerald-500">
              <FiKey />
            </div>
            <div>
              <p className="font-bold text-ink dark:text-white">Change Account Password</p>
              <p className="text-xs text-muted dark:text-dark-muted">
                You'll be asked for your current password to verify identity
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputCls}
            />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputCls}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputCls}
            />
          </div>

          {pwdError && (
            <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-500">
              {pwdError}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleChangePassword}
              disabled={pwdSaving}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              <FiKey className="text-base" />
              {pwdSaving ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>

      {/* ===== Data ===== */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted dark:text-dark-muted">
          <FiDownload className="text-base text-primary" /> Data &amp; Privacy
        </h2>
        <div className={sectionCard}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-xl text-sky-500">
                <FiDownload />
              </div>
              <div>
                <p className="font-bold text-ink dark:text-white">Export Herd Data</p>
                <p className="text-xs text-muted dark:text-dark-muted">
                  {livestockLoading ? 'Loading herd…' : `Download ${livestock.length} livestock as a CSV file`}
                </p>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={livestockLoading || livestock.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-black/10 px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-white dark:hover:border-primary dark:hover:text-primary-light disabled:opacity-60"
            >
              <FiDownload className="text-base" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* ===== Danger Zone ===== */}
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 dark:border-rose-500/30">
        <div className="flex items-center gap-3">
          <FiTrash2 className="text-xl text-rose-500" />
          <p className="font-bold text-rose-600 dark:text-rose-400">Danger Zone — Delete Account</p>
        </div>
        <p className="mt-1 text-xs text-rose-500/80">
          Permanently delete your farm profile, registered livestock, and collar telemetry history.
        </p>
        <button
          onClick={() => {
            setDeleteModalOpen(true);
            setConfirmText('');
            setPassword('');
            setDeleteError('');
          }}
          className="mt-4 rounded-full border border-rose-500/30 bg-white px-6 py-2.5 text-sm font-semibold text-rose-600 shadow-sm transition-colors hover:bg-rose-50 dark:bg-dark-card dark:text-rose-400 dark:hover:bg-rose-500/10"
        >
          Delete My Account
        </button>
      </div>

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-card dark:bg-dark-card dark:text-white">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
              <h3 className="font-bold text-rose-600 dark:text-rose-400">Delete Account</h3>
              <button onClick={() => setDeleteModalOpen(false)} className="text-muted hover:text-ink">
                <FiX />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <p className="text-xs leading-relaxed text-muted dark:text-dark-muted">
                This will permanently delete your farm profile, all registered livestock, collar devices,
                GPS history, and alerts. This action cannot be undone.
              </p>

              <div>
                <label className="font-semibold text-muted dark:text-dark-muted">
                  Type <span className="font-mono text-rose-500">DELETE</span> to confirm
                </label>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="mt-1 w-full rounded-xl border border-black/10 bg-surface-light px-3 py-2 text-sm text-ink outline-none focus:border-rose-500 dark:border-white/10 dark:bg-dark-surface dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-muted dark:text-dark-muted">Account Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="mt-1 w-full rounded-xl border border-black/10 bg-surface-light px-3 py-2 text-sm text-ink outline-none focus:border-rose-500 dark:border-white/10 dark:bg-dark-surface dark:text-white"
                />
              </div>

              {deleteError && (
                <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-500">
                  {deleteError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={deleting}
                  className="flex-1 rounded-full border border-black/10 py-2.5 text-xs font-semibold text-ink transition-colors hover:border-rose-500 hover:text-rose-500 dark:border-white/10 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 rounded-full bg-rose-600 py-2.5 text-xs font-semibold text-white shadow-card transition-colors hover:bg-rose-700 disabled:opacity-60"
                >
                  {deleting ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
