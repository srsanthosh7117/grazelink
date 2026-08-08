// Mirrors the record fields defined in the collar firmware's local storage
// requirements (Device ID, Goat ID, Timestamp, Lat/Lng, Accuracy, Battery, Status).

export type GoatMode = 'grazing' | 'syncing' | 'synced' | 'offline'
export type BatteryStatus = 'healthy' | 'low' | 'critical'

export interface TrailPoint {
  lat: number
  lng: number
  timestamp: string // ISO 8601
  accuracyM: number
}

export interface Goat {
  id: string // Goat ID
  name: string
  deviceId: string // Device ID (collar)
  mode: GoatMode
  batteryPercent: number
  batteryStatus: BatteryStatus
  firmwareVersion: string
  lastSeen: string // ISO 8601
  lat: number
  lng: number
  trail: TrailPoint[] // today's grazing-mode fixes, oldest -> newest
}

export interface HerdSummary {
  totalGoats: number
  grazing: number
  syncing: number
  lowBattery: number
  lastSyncAt: string | null
}
