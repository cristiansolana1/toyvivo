export function toISODate(ddmmyyyy: string): string {
  const cleaned = ddmmyyyy.replace(/[^0-9]/g, "");
  if (cleaned.length !== 8) return "";
  const day = cleaned.slice(0, 2);
  const month = cleaned.slice(2, 4);
  const year = cleaned.slice(4, 8);
  return `${year}-${month}-${day}`;
}

export function toDDMMYYYY(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return "";
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatBirthDateInput(value: string): string {
  const cleaned = value.replace(/[^0-9]/g, "");
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
}

export function isValidISODate(isoDate: string): boolean {
  if (!isoDate) return false;
  const date = new Date(isoDate);
  return !isNaN(date.getTime());
}

export function isFutureDate(isoDate: string): boolean {
  if (!isValidISODate(isoDate)) return false;
  return new Date(isoDate) > new Date();
}

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