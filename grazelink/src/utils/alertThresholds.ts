const BATTERY_KEY = 'gl_battery_threshold';
const TEMP_KEY = 'gl_temp_threshold';

export const DEFAULT_BATTERY_THRESHOLD = 20;
export const DEFAULT_TEMP_THRESHOLD = 40;

function readNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'number' || !Number.isFinite(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

/** Low-battery threshold (%) configured in Settings, default 20. */
export function getBatteryThreshold(): number {
  return readNumber(BATTERY_KEY, DEFAULT_BATTERY_THRESHOLD);
}

/** High-temperature threshold (°C) configured in Settings, default 40. */
export function getTempThreshold(): number {
  return readNumber(TEMP_KEY, DEFAULT_TEMP_THRESHOLD);
}
