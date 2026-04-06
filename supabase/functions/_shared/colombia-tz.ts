/**
 * Colombian Timezone Utilities for Edge Functions (Deno runs in UTC)
 * Colombia is UTC-5 (no DST changes)
 */

const COLOMBIA_OFFSET_MS = -5 * 60 * 60 * 1000; // -5 hours in ms

/**
 * Get current Date adjusted to Colombian timezone.
 * The returned Date object's UTC methods will return Colombia local values.
 */
export function nowColombia(): Date {
  const utcNow = Date.now();
  return new Date(utcNow + COLOMBIA_OFFSET_MS);
}

/**
 * Convert a UTC Date to Colombian local Date.
 * Use getUTCHours(), getUTCDay(), etc. on the result to get Colombia-local values.
 */
export function toColombiaTime(utcDate: Date): Date {
  return new Date(utcDate.getTime() + COLOMBIA_OFFSET_MS);
}

/**
 * Get today's date string (YYYY-MM-DD) in Colombian timezone.
 */
export function todayColombia(): string {
  const col = nowColombia();
  return col.toISOString().split('T')[0];
}

/**
 * Get the current year in Colombian timezone.
 */
export function currentYearColombia(): number {
  return nowColombia().getUTCFullYear();
}

/**
 * Get "start of today" in Colombian timezone as a UTC Date.
 * Useful for comparing against UTC timestamps in the database.
 */
export function startOfTodayColombia(): Date {
  const col = nowColombia();
  const dateStr = col.toISOString().split('T')[0]; // YYYY-MM-DD in Colombia
  // Start of that day in Colombia = that date at 00:00 Colombia = 05:00 UTC
  return new Date(dateStr + 'T05:00:00.000Z');
}

/**
 * Get the Colombian hour (0-23) from a UTC Date.
 */
export function getColombiaHour(utcDate: Date): number {
  return toColombiaTime(utcDate).getUTCHours();
}

/**
 * Get the Colombian day of week (0=Sun, 6=Sat) from a UTC Date.
 */
export function getColombiaDay(utcDate: Date): number {
  return toColombiaTime(utcDate).getUTCDay();
}

/**
 * Format a UTC Date to YYYY-MM-DD in Colombian timezone.
 */
export function formatDateColombia(utcDate: Date): string {
  return toColombiaTime(utcDate).toISOString().split('T')[0];
}
