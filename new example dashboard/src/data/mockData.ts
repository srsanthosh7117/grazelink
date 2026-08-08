import type { BatteryStatus, Goat, GoatMode, TrailPoint } from '../types'

// Pilot shed location: rural farmland outside Tiruppur, Tamil Nadu.
// Swap this for the real shed GPS fix once the backend + device sync exists.
export const SHED = {
  lat: 11.0855,
  lng: 77.302,
  name: 'Veerapandi Shed · Pilot Farm',
}

const GOAT_NAMES = [
  'Kali', 'Ponni', 'Mutthu', 'Selvi', 'Karuppan', 'Chinnu', 'Rani', 'Vēlan',
]

const LOW_BATTERY_THRESHOLD = 35
const CRITICAL_BATTERY_THRESHOLD = 15

// Deterministic PRNG so the demo data is stable across reloads (mulberry32).
function seeded(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function batteryStatusFor(percent: number): BatteryStatus {
  if (percent <= CRITICAL_BATTERY_THRESHOLD) return 'critical'
  if (percent <= LOW_BATTERY_THRESHOLD) return 'low'
  return 'healthy'
}

/** Builds one goat's grazing-mode trail: a 20-minute-interval random walk
 * that wanders out from the shed through the morning and drifts back by dusk,
 * matching the firmware's "wake every 20 minutes, record, sleep" behavior. */
function buildTrail(rng: () => number, startHour: number, pointCount: number): TrailPoint[] {
  const points: TrailPoint[] = []
  let lat = SHED.lat + (rng() - 0.5) * 0.001
  let lng = SHED.lng + (rng() - 0.5) * 0.001

  const today = new Date()
  today.setHours(startHour, 0, 0, 0)

  for (let i = 0; i < pointCount; i++) {
    // Drift outward for the first ~60% of the day, then trend home.
    const homing = i / pointCount > 0.6
    const pull = homing ? 0.35 : 0.05
    const towardShedLat = (SHED.lat - lat) * pull
    const towardShedLng = (SHED.lng - lng) * pull

    lat += (rng() - 0.5) * 0.0009 + towardShedLat * 0.02
    lng += (rng() - 0.5) * 0.0009 + towardShedLng * 0.02

    const timestamp = new Date(today.getTime() + i * 20 * 60 * 1000).toISOString()
    points.push({
      lat,
      lng,
      timestamp,
      accuracyM: Math.round(3 + rng() * 6),
    })
  }
  return points
}

function pickMode(rng: () => number, batteryStatus: BatteryStatus, index: number): GoatMode {
  if (index === 0) return 'syncing'
  if (index === 1) return 'synced'
  if (batteryStatus === 'critical') return 'grazing'
  return rng() > 0.8 ? 'offline' : 'grazing'
}

export function generateHerd(count = 8): Goat[] {
  return Array.from({ length: count }, (_, i) => {
    const rng = seeded(1000 + i * 97)
    const batteryPercent = Math.round(12 + rng() * 88)
    const batteryStatus = batteryStatusFor(batteryPercent)
    const trail = buildTrail(rng, 5 + Math.floor(rng() * 2), 16 + Math.floor(rng() * 10))
    const last = trail[trail.length - 1]
    const mode = pickMode(rng, batteryStatus, i)

    return {
      id: `GT-${String(i + 1).padStart(3, '0')}`,
      name: GOAT_NAMES[i % GOAT_NAMES.length],
      deviceId: `COLLAR-${(0xA100 + i * 17).toString(16).toUpperCase()}`,
      mode,
      batteryPercent,
      batteryStatus,
      firmwareVersion: '0.4.2-pilot',
      lastSeen: mode === 'offline'
        ? new Date(Date.now() - (2 + rng() * 5) * 60 * 60 * 1000).toISOString()
        : last.timestamp,
      lat: last.lat,
      lng: last.lng,
      trail,
    }
  })
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

/** Haversine distance in kilometers between two trail points. */
export function distanceKm(a: TrailPoint, b: TrailPoint): number {
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(h))
}

export function totalDistanceKm(trail: TrailPoint[]): number {
  let sum = 0
  for (let i = 1; i < trail.length; i++) sum += distanceKm(trail[i - 1], trail[i])
  return sum
}
