import { useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import Header from './components/Header'
import StatsCards from './components/StatsCards'
import GoatList from './components/GoatList'
import GoatDetailPanel from './components/GoatDetailPanel'
import Globe3D from './components/Globe3D'
import { generateHerd } from './data/mockData'
import type { HerdSummary } from './types'

export default function App() {
  // In production this list comes from GET /api/goats (Phase 3 backend).
  // Swapping the mock for a real fetch only touches this one hook.
  const [goats] = useState(() => generateHerd(8))
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedGoat = goats.find((g) => g.id === selectedId) ?? null

  const summary: HerdSummary = useMemo(() => {
    const grazing = goats.filter((g) => g.mode === 'grazing').length
    const syncing = goats.filter((g) => g.mode === 'syncing').length
    const lowBattery = goats.filter((g) => g.batteryStatus !== 'healthy').length
    const lastSync = goats
      .filter((g) => g.mode === 'synced' || g.mode === 'syncing')
      .map((g) => g.lastSeen)
      .sort()
      .pop()
    return {
      totalGoats: goats.length,
      grazing,
      syncing,
      lowBattery,
      lastSyncAt: lastSync ?? null,
    }
  }, [goats])

  const wifiConnected = summary.syncing > 0

  return (
    <div className="flex h-screen flex-col">
      <Header wifiConnected={wifiConnected} />
      <StatsCards summary={summary} />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 px-6 pb-6 lg:grid-cols-[260px_1fr_300px]">
        <aside className="min-h-0 overflow-hidden rounded-xl border border-pasture-700 bg-pasture-800 shadow-panel">
          <GoatList goats={goats} selectedId={selectedId} onSelect={setSelectedId} />
        </aside>

        <main className="min-h-[420px] overflow-hidden rounded-xl border border-pasture-700 bg-pasture-900 shadow-panel">
          <Globe3D goats={goats} selectedGoat={selectedGoat} onSelect={setSelectedId} />
        </main>

        <aside className="min-h-0 overflow-hidden rounded-xl border border-pasture-700 bg-pasture-800 shadow-panel">
          {selectedGoat ? (
            <GoatDetailPanel goat={selectedGoat} onClose={() => setSelectedId(null)} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-bone-500">
              <MapPin size={20} />
              <p className="text-sm">Select a goat from the roster or globe to see its trail.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
