import type { BatteryStatus, GoatMode } from './types'

// LED priority per the collar spec: Red > Blue > Yellow > Green.
// The dashboard reuses this exact hierarchy so a glance at a pin or badge
// means the same thing here as it does on the physical collar.
export const MODE_META: Record<GoatMode, { label: string; color: string; hex: string }> = {
  syncing: { label: 'Syncing', color: 'text-signal-blue', hex: '#5FA8D3' },
  synced: { label: 'Synced', color: 'text-signal-blue', hex: '#5FA8D3' },
  grazing: { label: 'Grazing', color: 'text-signal-yellow', hex: '#E8B23C' },
  offline: { label: 'Offline', color: 'text-bone-500', hex: '#5C6152' },
}

export const BATTERY_META: Record<BatteryStatus, { label: string; hex: string; color: string }> = {
  healthy: { label: 'Healthy', hex: '#6FA65A', color: 'text-signal-green' },
  low: { label: 'Low', hex: '#E8B23C', color: 'text-signal-yellow' },
  critical: { label: 'Critical', hex: '#D1553D', color: 'text-signal-red' },
}

/** Pin color follows the collar's LED priority: a critical battery always
 * outranks connectivity state, exactly as spec'd for the physical LEDs. */
export function pinColorFor(mode: GoatMode, batteryStatus: BatteryStatus): string {
  if (batteryStatus === 'critical') return BATTERY_META.critical.hex
  if (mode === 'syncing' || mode === 'synced') return MODE_META[mode].hex
  if (mode === 'grazing') return MODE_META.grazing.hex
  return MODE_META.offline.hex
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.round(diffHr / 24)}d ago`
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}
