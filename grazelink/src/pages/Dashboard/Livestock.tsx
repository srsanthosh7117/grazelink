import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiActivity, FiSearch, FiFilter, FiPlus, FiLayers } from 'react-icons/fi';
import LivestockCard from '@/components/Cards/LivestockCard';
import AddLivestockModal from '@/components/Dashboard/AddLivestockModal';
import BulkAddLivestockModal from '@/components/Dashboard/BulkAddLivestockModal';
import EmptyState from '@/components/Dashboard/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useLivestock } from '@/hooks/useLivestock';
import { deleteLivestock } from '@/services/livestock';
import type { Livestock } from '@/types/livestock';
import { useToast } from '@/context/ToastContext';

export default function Livestock() {
  const { user } = useAuth();
  const { livestock, loading } = useLivestock();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingLivestock, setEditingLivestock] = useState<Livestock | null>(null);

  // Search & Filtering State
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState('All');
  const [vaccineFilter, setVaccineFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'age' | 'weight' | 'battery'>('id');

  const openAdd = () => {
    setEditingLivestock(null);
    setModalOpen(true);
  };

  const openEdit = (livestock: Livestock) => {
    setEditingLivestock(livestock);
    setModalOpen(true);
  };

  const openAnalyze = (livestock: Livestock) => {
    navigate(`/dashboard/livestock/${livestock.id}?view=analytics`);
  };

  const openProfile = (livestock: Livestock) => {
    navigate(`/dashboard/livestock/${livestock.id}?view=profile`);
  };

  const handleDelete = async (livestock: Livestock) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to remove ${livestock.livestockId}?`)) return;
    try {
      await deleteLivestock(user.uid, livestock.id);
      showToast('success', `${livestock.livestockId} was deleted.`);
    } catch (err) {
      showToast('error', 'Could not delete livestock record.');
    }
  };

  // Filter & Sort Pipeline
  const filteredLivestock = useMemo(() => {
    return livestock
      .filter((g) => {
        const query = search.toLowerCase();
        const matchesSearch =
          g.livestockId.toLowerCase().includes(query) ||
          g.collarId.toLowerCase().includes(query) ||
          (g.name && g.name.toLowerCase().includes(query)) ||
          (g.breed && g.breed.toLowerCase().includes(query)) ||
          (g.shedName && g.shedName.toLowerCase().includes(query));

        const matchesHealth = healthFilter === 'All' || g.healthStatus === healthFilter;
        const matchesVaccine = vaccineFilter === 'All' || g.vaccinationStatus === vaccineFilter;

        return matchesSearch && matchesHealth && matchesVaccine;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return (a.name || a.livestockId).localeCompare(b.name || b.livestockId);
        if (sortBy === 'age') return b.age - a.age;
        if (sortBy === 'weight') return b.weight - a.weight;
        if (sortBy === 'battery') return (b.battery ?? 0) - (a.battery ?? 0);
        return a.livestockId.localeCompare(b.livestockId);
      });
  }, [livestock, search, healthFilter, vaccineFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Top Title & Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink dark:text-white md:text-3xl">
            Livestock Management
          </h1>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">
            Manage your registered herd, smart collars, health logs, and telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-2 rounded-full border border-primary/30 px-6 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary/10"
          >
            <FiLayers className="text-lg" /> Bulk Add
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition-all hover:scale-105 hover:bg-primary-dark"
          >
            <FiPlus className="text-lg" /> Add Livestock
          </button>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Sorting */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-soft dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <FiSearch className="absolute left-3.5 top-3 text-muted dark:text-dark-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name, collar, breed, or shed..."
            className="w-full rounded-xl border border-black/10 bg-surface-light pl-10 pr-4 py-2 text-sm text-ink outline-none transition-colors focus:border-primary dark:border-white/10 dark:bg-dark-surface dark:text-white"
          />
        </div>

        {/* Health Filter */}
        <div className="flex items-center gap-2">
          <FiFilter className="text-muted dark:text-dark-muted" />
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="rounded-xl border border-black/10 bg-surface-light px-3 py-2 text-sm font-medium text-ink outline-none focus:border-primary dark:border-white/10 dark:bg-dark-surface dark:text-white"
          >
            <option value="All">All Health Statuses</option>
            <option value="Healthy">Healthy</option>
            <option value="Under Observation">Under Observation</option>
            <option value="Sick">Sick</option>
            <option value="Injured">Injured</option>
          </select>
        </div>

        {/* Vaccine Filter */}
        <select
          value={vaccineFilter}
          onChange={(e) => setVaccineFilter(e.target.value)}
          className="rounded-xl border border-black/10 bg-surface-light px-3 py-2 text-sm font-medium text-ink outline-none focus:border-primary dark:border-white/10 dark:bg-dark-surface dark:text-white"
        >
          <option value="All">All Vaccination</option>
          <option value="Up to date">Up to date</option>
          <option value="Due">Due</option>
          <option value="Overdue">Overdue</option>
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'id' | 'name' | 'age' | 'weight' | 'battery')}
          className="rounded-xl border border-black/10 bg-surface-light px-3 py-2 text-sm font-medium text-ink outline-none focus:border-primary dark:border-white/10 dark:bg-dark-surface dark:text-white"
        >
          <option value="id">Sort by Livestock ID</option>
          <option value="name">Sort by Name</option>
          <option value="age">Sort by Age</option>
          <option value="weight">Sort by Weight</option>
          <option value="battery">Sort by Battery</option>
        </select>
      </div>

      {/* Main Grid Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      ) : livestock.length === 0 ? (
        <EmptyState
          icon={FiActivity}
          title="No Livestock Registered"
          description="Click below to add your first livestock and attach a smart collar to begin tracking."
          action={{ label: '+ Add Livestock', onClick: openAdd }}
        />
      ) : filteredLivestock.length === 0 ? (
        <div className="rounded-2xl border border-black/5 bg-white p-12 text-center shadow-soft dark:border-white/5 dark:bg-dark-card">
          <p className="text-muted dark:text-dark-muted">
            No livestock match your search or filters.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLivestock.map((livestock) => (
              <LivestockCard
                key={livestock.id}
                livestock={livestock}
                onView={openProfile}
                onAnalyze={openAnalyze}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Results Footer */}
          <div className="flex items-center justify-between border-t border-black/5 pt-4 dark:border-white/5">
            <span className="text-xs font-medium text-muted dark:text-dark-muted">
              {filteredLivestock.length === livestock.length
                ? `Showing all ${livestock.length} livestock`
                : `${filteredLivestock.length} of ${livestock.length} livestock match your search`}
            </span>
          </div>
        </>
      )}

      {/* Modal */}
      <AddLivestockModal open={modalOpen} onClose={() => setModalOpen(false)} livestock={editingLivestock} />
      <BulkAddLivestockModal open={bulkOpen} onClose={() => setBulkOpen(false)} />
    </div>
  );
}
