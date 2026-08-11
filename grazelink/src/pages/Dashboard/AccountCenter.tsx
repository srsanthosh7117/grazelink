import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiLogOut,
  FiHome,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCpu,
  FiActivity,
  FiUser,
  FiEdit2,
  FiCheck,
  FiX,
} from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';
import { useFarmProfile } from '@/hooks/useFarmProfile';
import { useLivestockCounts } from '@/hooks/useLivestockCounts';
import { useDevices } from '@/hooks/useDevices';
import { logoutUser, updateFarmProfile } from '@/services/auth';
import { useToast } from '@/context/ToastContext';
import { IconType } from 'react-icons';

type EditableKey = 'farmName' | 'username' | 'phoneNumber' | 'address';

interface FieldCardProps {
  icon: IconType;
  iconClass: string;
  label: string;
  value: string;
  editing: boolean;
  editingValue: string;
  onStartEdit: () => void;
  onEditingValue: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  disabled?: boolean;
  note?: string;
}

function FieldCard({
  icon: Icon,
  iconClass,
  label,
  value,
  editing,
  editingValue,
  onStartEdit,
  onEditingValue,
  onSave,
  onCancel,
  saving,
  disabled,
  note,
}: FieldCardProps) {
  return (
    <div className="rounded-2xl bg-surface-light p-4 dark:bg-dark-surface">
      <div className="flex items-center justify-between">
        <dt className="text-muted dark:text-dark-muted flex items-center gap-1.5 font-semibold">
          <Icon className={iconClass} /> {label}
        </dt>
        {!disabled && !editing && (
          <button
            onClick={onStartEdit}
            aria-label={`Edit ${label}`}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary dark:text-dark-muted"
          >
            <FiEdit2 className="text-sm" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-2">
          <input
            autoFocus
            value={editingValue}
            onChange={(e) => onEditingValue(e.target.value)}
            className="w-full rounded-xl border border-primary/40 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none dark:border-primary/50 dark:bg-dark-card dark:text-white"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white shadow-card transition-all hover:bg-primary-dark disabled:opacity-60"
            >
              <FiCheck /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1 rounded-full border border-black/10 px-4 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-rose-500 hover:text-rose-500 dark:border-white/10 dark:text-gray-200"
            >
              <FiX /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <dd className="mt-1 text-sm font-extrabold text-ink dark:text-white">{value}</dd>
      )}
      {note && !editing && <p className="mt-1 text-[11px] text-muted dark:text-dark-muted">{note}</p>}
    </div>
  );
}

export default function AccountCenter() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useFarmProfile();
  const { total: totalLivestock } = useLivestockCounts();
  const { devices } = useDevices();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [editing, setEditing] = useState<EditableKey | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [addressDraft, setAddressDraft] = useState({
    farmAddress: '',
    village: '',
    district: '',
    state: '',
    country: '',
    pincode: '',
  });

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const startEdit = (key: EditableKey) => {
    if (!profile) return;
    setEditing(key);
    if (key === 'address') {
      setAddressDraft({
        farmAddress: profile.farmAddress ?? '',
        village: profile.village ?? '',
        district: profile.district ?? '',
        state: profile.state ?? '',
        country: profile.country ?? '',
        pincode: profile.pincode ?? '',
      });
    } else {
      setDraft(profile[key] ?? '');
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft('');
  };

  const saveSingle = async (key: 'farmName' | 'username' | 'phoneNumber', draftValue: string) => {
    if (!user || !profile) return;
    if (draftValue.trim() === (profile[key] ?? '')) {
      cancelEdit();
      return;
    }
    setSaving(true);
    try {
      await updateFarmProfile(user.uid, { [key]: draftValue.trim() });
      showToast('success', `${key === 'phoneNumber' ? 'Phone number' : key === 'username' ? 'Username' : 'Farm name'} updated.`);
      cancelEdit();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update.';
      showToast('error', message);
    } finally {
      setSaving(false);
    }
  };

  const saveAddress = async () => {
    if (!user || !profile) return;
    const changes: Record<string, string> = {};
    (Object.keys(addressDraft) as (keyof typeof addressDraft)[]).forEach((key) => {
      const next = addressDraft[key].trim();
      if (next !== (profile[key] ?? '')) changes[key] = next;
    });
    if (Object.keys(changes).length === 0) {
      cancelEdit();
      return;
    }
    setSaving(true);
    try {
      await updateFarmProfile(user.uid, changes);
      showToast('success', 'Farm address updated.');
      cancelEdit();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update address.';
      showToast('error', message);
    } finally {
      setSaving(false);
    }
  };

  const addressValue = [
    profile?.farmAddress,
    profile?.village,
    profile?.district,
    profile?.state,
    profile?.country,
    profile?.pincode,
  ]
    .filter(Boolean)
    .join(', ') || 'No address details configured.';

  const addressInputClass =
    'mt-1 w-full rounded-xl border border-primary/40 bg-white px-3 py-2 text-sm text-ink outline-none dark:border-primary/50 dark:bg-dark-card dark:text-white';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink dark:text-white md:text-3xl">
          Account &amp; Farm Profile
        </h1>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          Click the edit icon on any detail to change just that field.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* User Card */}
        <div className="rounded-3xl border border-black/5 bg-white p-8 text-center shadow-soft dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card lg:col-span-1">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-primary text-3xl font-extrabold text-white shadow-card">
            {(user?.displayName || user?.email || 'F').charAt(0).toUpperCase()}
          </div>
          <h3 className="mt-4 text-lg font-bold text-ink dark:text-white">
            {profile?.fullName || user?.displayName || 'Farm Owner'}
          </h3>
          <p className="text-xs text-muted dark:text-dark-muted">{user?.email}</p>
          <span className="mt-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
            Pro Subscription Active
          </span>

          <div className="mt-8 border-t border-black/5 pt-6 dark:border-white/5">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20"
            >
              <FiLogOut /> Log Out of Account
            </button>
          </div>
        </div>

        {/* Real Farm Details */}
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-soft dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card lg:col-span-2">
          <h3 className="text-lg font-bold text-ink dark:text-white flex items-center gap-2 mb-4">
            <FiHome className="text-primary" /> Registered Farm Infrastructure
          </h3>

          {profileLoading ? (
            <div className="h-40 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
          ) : (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <FieldCard
                icon={FiHome}
                iconClass="text-primary"
                label="Farm Name"
                value={profile?.farmName || 'Green Valley Farm'}
                editing={editing === 'farmName'}
                editingValue={draft}
                onStartEdit={() => startEdit('farmName')}
                onEditingValue={setDraft}
                onSave={() => saveSingle('farmName', draft)}
                onCancel={cancelEdit}
                saving={saving}
              />

              <FieldCard
                icon={FiUser}
                iconClass="text-blue-500"
                label="Account Username"
                value={profile?.username || 'farmowner'}
                editing={editing === 'username'}
                editingValue={draft}
                onStartEdit={() => startEdit('username')}
                onEditingValue={setDraft}
                onSave={() => saveSingle('username', draft)}
                onCancel={cancelEdit}
                saving={saving}
              />

              <FieldCard
                icon={FiMail}
                iconClass="text-amber-500"
                label="Contact Email"
                value={profile?.email || user?.email || '—'}
                editing={false}
                editingValue=""
                onStartEdit={() => {}}
                onEditingValue={() => {}}
                onSave={() => {}}
                onCancel={() => {}}
                saving={false}
                disabled
                note="Tied to your sign-in — use Settings → Security to change it."
              />

              <FieldCard
                icon={FiPhone}
                iconClass="text-emerald-500"
                label="Phone Number"
                value={profile?.phoneNumber || '—'}
                editing={editing === 'phoneNumber'}
                editingValue={draft}
                onStartEdit={() => startEdit('phoneNumber')}
                onEditingValue={setDraft}
                onSave={() => saveSingle('phoneNumber', draft)}
                onCancel={cancelEdit}
                saving={saving}
              />

              <div className="rounded-2xl bg-surface-light p-4 dark:bg-dark-surface">
                <dt className="text-muted dark:text-dark-muted flex items-center gap-1.5 font-semibold">
                  <FiActivity className="text-rose-500" /> Managed Livestock
                </dt>
                <dd className="mt-1 text-sm font-extrabold text-ink dark:text-white">
                  {totalLivestock ?? '…'} Livestock Enrolled
                </dd>
              </div>

              <div className="rounded-2xl bg-surface-light p-4 dark:bg-dark-surface">
                <dt className="text-muted dark:text-dark-muted flex items-center gap-1.5 font-semibold">
                  <FiCpu className="text-purple-500" /> Smart Collar Fleet
                </dt>
                <dd className="mt-1 text-sm font-extrabold text-ink dark:text-white">
                  {devices.length} Registered Collars
                </dd>
              </div>

              <div className="sm:col-span-2 rounded-2xl bg-surface-light p-4 dark:bg-dark-surface">
                <div className="flex items-center justify-between">
                  <dt className="text-muted dark:text-dark-muted flex items-center gap-1.5 font-semibold">
                    <FiMapPin className="text-rose-500" /> Farm Address &amp; Location
                  </dt>
                  {editing !== 'address' && (
                    <button
                      onClick={() => startEdit('address')}
                      aria-label="Edit address"
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary dark:text-dark-muted"
                    >
                      <FiEdit2 className="text-sm" />
                    </button>
                  )}
                </div>

                {editing === 'address' ? (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-muted dark:text-dark-muted">Farm Address</label>
                      <input
                        value={addressDraft.farmAddress}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, farmAddress: e.target.value }))}
                        className={addressInputClass}
                      />
                    </div>
                    <div>
                      <label className="text-muted dark:text-dark-muted">City / Village</label>
                      <input
                        value={addressDraft.village}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, village: e.target.value }))}
                        className={addressInputClass}
                      />
                    </div>
                    <div>
                      <label className="text-muted dark:text-dark-muted">District</label>
                      <input
                        value={addressDraft.district}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, district: e.target.value }))}
                        className={addressInputClass}
                      />
                    </div>
                    <div>
                      <label className="text-muted dark:text-dark-muted">State</label>
                      <input
                        value={addressDraft.state}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, state: e.target.value }))}
                        className={addressInputClass}
                      />
                    </div>
                    <div>
                      <label className="text-muted dark:text-dark-muted">Country</label>
                      <input
                        value={addressDraft.country}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, country: e.target.value }))}
                        className={addressInputClass}
                      />
                    </div>
                    <div>
                      <label className="text-muted dark:text-dark-muted">Pincode</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={6}
                        value={addressDraft.pincode}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, pincode: e.target.value.replace(/\D/g, '') }))}
                        className={addressInputClass}
                        placeholder="6-digit pincode"
                      />
                    </div>
                    <div className="sm:col-span-2 mt-1 flex gap-2">
                      <button
                        onClick={saveAddress}
                        disabled={saving}
                        className="flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white shadow-card transition-all hover:bg-primary-dark disabled:opacity-60"
                      >
                        <FiCheck /> {saving ? 'Saving...' : 'Save Address'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1 rounded-full border border-black/10 px-5 py-2 text-xs font-semibold text-ink transition-colors hover:border-rose-500 hover:text-rose-500 dark:border-white/10 dark:text-gray-200"
                      >
                        <FiX /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <dd className="mt-1 text-sm font-bold text-ink dark:text-white">{addressValue}</dd>
                )}
              </div>
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
