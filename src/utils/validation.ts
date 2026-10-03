export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function normalizeDNI(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

export function validateDNI(value: string): ValidationResult {
  const cleaned = normalizeDNI(value);
  
  if (cleaned.length < 7 || cleaned.length > 8) {
    return { isValid: false, error: "DNI debe tener 7 u 8 dígitos" };
  }
  
  const num = parseInt(cleaned, 10);
  
  if (num < 1000000 || num > 99999999) {
    return { isValid: false, error: "DNI fuera de rango válido" };
  }
  
  if (/^(\d)\1+$/.test(cleaned)) {
    return { isValid: false, error: "DNI inválido: dígitos repetidos" };
  }
  
  if (isSequential(cleaned)) {
    return { isValid: false, error: "DNI inválido: secuencia numérica" };
  }
  
  return { isValid: true };
}

function isSequential(dni: string): boolean {
  const digits = dni.split('').map(Number);
  
  let ascending = true;
  let descending = true;
  
  for (let i = 1; i < digits.length; i++) {
    if (digits[i] !== digits[i - 1] + 1) ascending = false;
    if (digits[i] !== digits[i - 1] - 1) descending = false;
  }
  
  return ascending || descending;
}

export function validatePhone(value: string): ValidationResult {
  const cleaned = value.replace(/[^0-9]/g, "");
  if (cleaned.length < 10) {
    return { isValid: false, error: "Teléfono debe tener al menos 10 dígitos" };
  }
  return { isValid: true };
}

export function validateBirthDate(isoDate: string): ValidationResult {
  if (!isoDate) {
    return { isValid: false, error: "Fecha de nacimiento es obligatoria" };
  }
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) {
    return { isValid: false, error: "Fecha inválida" };
  }
  const now = new Date();
  if (date > now) {
    return { isValid: false, error: "La fecha no puede ser futura" };
  }
  const age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  const dayDiff = now.getDate() - date.getDate();
  const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
  if (actualAge > 120) {
    return { isValid: false, error: "Edad inválida" };
  }
  if (actualAge < 13) {
    return { isValid: false, error: "Debes ser mayor de 13 años" };
  }
  return { isValid: true };
}

export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value || !value.trim()) {
    return { isValid: false, error: `${fieldName} es obligatorio` };
  }
  return { isValid: true };
}

export function validateProfile(profile: {
  fullName: string;
  dni: string;
  phone: string;
  province: string;
  birthDate: string;
}): ValidationResult[] {
  return [
    validateRequired(profile.fullName, "Nombre completo"),
    validateDNI(profile.dni),
    validatePhone(profile.phone),
    validateRequired(profile.province, "Provincia"),
    validateBirthDate(profile.birthDate),
  ];
}

export function getFirstValidationError(results: ValidationResult[]): string | null {
  for (const result of results) {
    if (!result.isValid) return result.error ?? null;
  }
  return null;
}