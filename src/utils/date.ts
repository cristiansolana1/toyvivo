/**
 * Date utility functions for parsing, validating, and formatting dates
 * into 24-hour format and standard date representations.
 */

/**
 * Converts a DDMMYYYY string into ISO format (YYYY-MM-DD).
 */
export function toISODate(ddmmyyyy: string): string {
  const cleaned = ddmmyyyy.replace(/[^0-9]/g, "");
  if (cleaned.length !== 8) return "";
  const day = cleaned.slice(0, 2);
  const month = cleaned.slice(2, 4);
  const year = cleaned.slice(4, 8);
  return `${year}-${month}-${day}`;
}

/**
 * Converts an ISO date (YYYY-MM-DD) into display format (DD/MM/YYYY).
 */
export function toDDMMYYYY(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return "";
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Formats user input as a birth date mask (DD/MM/YYYY).
 */
export function formatBirthDateInput(value: string): string {
  const cleaned = value.replace(/[^0-9]/g, "");
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
}

/**
 * Validates whether an ISO date string is a valid calendar date.
 */
export function isValidISODate(isoDate: string): boolean {
  if (!isoDate) return false;
  const date = new Date(isoDate);
  return !isNaN(date.getTime());
}

/**
 * Checks if a date is in the future.
 */
export function isFutureDate(isoDate: string): boolean {
  if (!isValidISODate(isoDate)) return false;
  return new Date(isoDate) > new Date();
}

/**
 * Calculates user age from an ISO birth date.
 */
export function getAgeFromISODate(isoDate: string): number | null {
  if (!isValidISODate(isoDate)) return null;
  const birth = new Date(isoDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Formats an ISO timestamp into a 24-hour localized date-time string.
 */
export function formatDateTime24(isoDate: string): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;
  return date.toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
