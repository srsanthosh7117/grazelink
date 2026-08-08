import { MODE_META } from '../statusMeta'
import type { GoatMode } from '../types'

export default function StatusBadge({ mode }: { mode: GoatMode }) {
  const meta = MODE_META[mode]
  const pulsing = mode === 'syncing'

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-pasture-700 bg-pasture-900 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide">
      <span className="relative flex h-1.5 w-1.5">
        {pulsing && (
          <span
            className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full"
            style={{ backgroundColor: meta.hex }}
          />
        )}
        <span
          className="relative inline-flex h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: meta.hex }}
        />
      </span>
      <span className={meta.color}>{meta.label}</span>
    </span>
  )
}
