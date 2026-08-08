import { X } from 'lucide-react'
import type { Goat } from '../types'
import StatusBadge from './StatusBadge'
import BatteryBadge from './BatteryBadge'
import { formatClock, formatRelativeTime } from '../statusMeta'
import { totalDistanceKm } from '../data/mockData'

export default function GoatDetailPanel({
  goat,
  onClose,
}: {
  goat: Goat
  onClose: () => void
}) {
  const distance = totalDistanceKm(goat.trail)
  const start = goat.trail[0]
  const end = goat.trail[goat.trail.length - 1]

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-pasture-700 px-4 py-3">
        <div>
          <h2 className="font-display text-base font-semibold tracking-tight">{goat.name}</h2>
          <p className="font-mono text-[11px] text-bone-500">
            {goat.id} &middot; {goat.deviceId}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close goat detail"
          className="rounded-md p-1 text-bone-500 hover:bg-pasture-800 hover:text-bone-100"
        >
          <X size={16} />
        </button>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4 flex items-center gap-3">
          <StatusBadge mode={goat.mode} />
          <BatteryBadge percent={goat.batteryPercent} status={goat.batteryStatus} />
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-bone-500">Distance today</dt>
            <dd className="font-mono text-bone-100">{distance.toFixed(2)} km</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-bone-500">Fixes recorded</dt>
            <dd className="font-mono text-bone-100">{goat.trail.length}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-bone-500">Firmware</dt>
            <dd className="font-mono text-bone-100">{goat.firmwareVersion}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-bone-500">Last sync</dt>
            <dd className="font-mono text-bone-100">{formatRelativeTime(goat.lastSeen)}</dd>
          </div>
        </dl>

        <div className="mt-5">
          <h3 className="mb-2 text-xs uppercase tracking-wide text-bone-500">Start &rarr; End</h3>
          <div className="space-y-1.5 rounded-lg border border-pasture-700 bg-pasture-900 p-3 font-mono text-xs">
            <p className="text-bone-300">
              {formatClock(start.timestamp)} &middot; {start.lat.toFixed(5)}, {start.lng.toFixed(5)}
            </p>
            <p className="text-bone-500">&darr;</p>
            <p className="text-bone-300">
              {formatClock(end.timestamp)} &middot; {end.lat.toFixed(5)}, {end.lng.toFixed(5)}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <h3 className="mb-2 text-xs uppercase tracking-wide text-bone-500">
            Grazing timeline &middot; every 20 min
          </h3>
          <ol className="scrollbar-thin max-h-56 space-y-1 overflow-y-auto pr-1">
            {[...goat.trail].reverse().map((point, i) => (
              <li
                key={point.timestamp}
                className="flex items-center justify-between rounded-md px-2 py-1 font-mono text-[11px] text-bone-500 odd:bg-pasture-900/60"
              >
                <span>{formatClock(point.timestamp)}</span>
                <span>
                  {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                </span>
                <span>&plusmn;{point.accuracyM}m</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
