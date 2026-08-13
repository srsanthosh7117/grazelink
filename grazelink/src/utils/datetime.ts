/**
 * Timestamp display helpers.
 *
 * Everything is stored as ISO-8601 UTC — the collar stamps records from the
 * GNSS time solution or NTP, and the ingestion API writes ISO strings. Turning
 * those into wall-clock text is a *display* concern and must happen in the
 * browser, which is the only place that knows the farmer's timezone.
 *
 * This used to be done server-side with `new Date().toLocaleTimeString()`.
 * Render runs in UTC, so it baked UTC into a plain string that no longer
 * carried a timezone, and every "Last Sync" on the dashboard read 5.5 hours
 * behind for a farm in IST with no way to tell it was wrong.
 */

/** Values written before the fix: a bare locale time like "10:51:34 AM". */
function isLegacyLocaleString(value: string): boolean {
  return Number.isNaN(new Date(value).getTime());
}

/**
 * Local date + time, e.g. "13 Aug 2026, 4:21 pm".
 * Returns the fallback for null/empty values, and passes through legacy
 * strings unchanged rather than rendering "Invalid Date".
 */
export function formatLocalDateTime(value?: string | null, fallback = '—'): string {
  if (!value) return fallback;
  if (isLegacyLocaleString(value)) return value;
  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Local time only, e.g. "4:21 pm". Same legacy handling as above. */
export function formatLocalTime(value?: string | null, fallback = '—'): string {
  if (!value) return fallback;
  if (isLegacyLocaleString(value)) return value;
  return new Date(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Milliseconds since epoch, or 0 when unparseable. Safe for sorting/max. */
export function toEpochMs(value?: string | null): number {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}
