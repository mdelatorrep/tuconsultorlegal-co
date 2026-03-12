/**
 * Date utilities for Colombian timezone (GMT-5) handling.
 * Prevents UTC midnight interpretation issues with YYYY-MM-DD strings.
 */

/**
 * Parse a YYYY-MM-DD string as a LOCAL date (not UTC).
 * new Date('2024-03-15') → UTC midnight → shows March 14 in GMT-5
 * parseDateLocal('2024-03-15') → local midnight → shows March 15 correctly
 */
export function parseDateLocal(dateString: string): Date {
  if (!dateString) return new Date();
  const parts = dateString.split('-');
  if (parts.length !== 3) return new Date(dateString);
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

/**
 * Format a Date to YYYY-MM-DD using local timezone.
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Compare two dates ignoring time, using local timezone.
 */
export function isSameDayLocal(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Compare a YYYY-MM-DD string with a Date object locally.
 */
export function isDateStringMatchingDay(dateString: string, date: Date): boolean {
  const parsed = parseDateLocal(dateString);
  return isSameDayLocal(parsed, date);
}
