import clsx from 'clsx'
import type { Goat } from '../types'
import StatusBadge from './StatusBadge'
import BatteryBadge from './BatteryBadge'
import { formatRelativeTime } from '../statusMeta'

export default function GoatList({
  goats,
  selectedId,
  onSelect,
}: {
  goats: Goat[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-pasture-700 px-4 py-3">
        <h2 className="font-display text-sm font-semibold tracking-tight">Roster</h2>
        <p className="text-xs text-bone-500">Tap a goat to focus the globe</p>
      </div>
      <ul className="scrollbar-thin flex-1 overflow-y-auto">
        {goats.map((goat) => (
          <li key={goat.id}>
            <button
              onClick={() => onSelect(goat.id)}
              className={clsx(
                'flex w-full flex-col gap-1.5 border-b border-pasture-800 px-4 py-3 text-left transition-colors',
                selectedId === goat.id ? 'bg-pasture-800' : 'hover:bg-pasture-900',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-medium">{goat.name}</span>
                <BatteryBadge percent={goat.batteryPercent} status={goat.batteryStatus} />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-bone-500">{goat.deviceId}</span>
                <StatusBadge mode={goat.mode} />
              </div>
              <span className="font-mono text-[11px] text-bone-500">
                Last seen {formatRelativeTime(goat.lastSeen)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
