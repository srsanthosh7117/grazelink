import { Battery, BatteryLow, BatteryWarning } from 'lucide-react'
import { BATTERY_META } from '../statusMeta'
import type { BatteryStatus } from '../types'

const ICONS: Record<BatteryStatus, typeof Battery> = {
  healthy: Battery,
  low: BatteryLow,
  critical: BatteryWarning,
}

export default function BatteryBadge({
  percent,
  status,
}: {
  percent: number
  status: BatteryStatus
}) {
  const meta = BATTERY_META[status]
  const Icon = ICONS[status]

  return (
    <span className={`inline-flex items-center gap-1 font-mono text-xs ${meta.color}`}>
      <Icon size={14} strokeWidth={2} />
      {percent}%
    </span>
  )
}
