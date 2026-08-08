import { BatteryWarning, RadioTower, Satellite, Users } from 'lucide-react'
import type { HerdSummary } from '../types'
import { formatRelativeTime } from '../statusMeta'

interface StatCardDef {
  label: string
  value: string
  icon: typeof Users
  accent: string
}

export default function StatsCards({ summary }: { summary: HerdSummary }) {
  const cards: StatCardDef[] = [
    { label: 'Herd size', value: String(summary.totalGoats), icon: Users, accent: 'text-bone-100' },
    { label: 'Grazing now', value: String(summary.grazing), icon: Satellite, accent: 'text-signal-yellow' },
    { label: 'Syncing', value: String(summary.syncing), icon: RadioTower, accent: 'text-signal-blue' },
    { label: 'Low battery', value: String(summary.lowBattery), icon: BatteryWarning, accent: 'text-signal-red' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 px-6 py-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-pasture-700 bg-pasture-800 px-4 py-3 shadow-panel"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-bone-500">{card.label}</span>
            <card.icon size={14} className={card.accent} strokeWidth={2.2} />
          </div>
          <p className={`mt-2 font-mono text-2xl font-medium ${card.accent}`}>{card.value}</p>
        </div>
      ))}
      <div className="col-span-2 flex items-center justify-between rounded-xl border border-pasture-700 bg-pasture-800 px-4 py-3 shadow-panel sm:col-span-4">
        <span className="text-xs uppercase tracking-wide text-bone-500">Last shed sync</span>
        <span className="font-mono text-sm text-bone-300">
          {summary.lastSyncAt ? formatRelativeTime(summary.lastSyncAt) : 'No records synced yet'}
        </span>
      </div>
    </div>
  )
}
