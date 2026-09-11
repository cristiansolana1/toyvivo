export const HEARTBEAT_LIMIT_MS = 24 * 60 * 60 * 1000;

export const PROVINCES_AR = [
  { label: "Buenos Aires", code: "BA" },
  { label: "CABA", code: "CABA" },
  { label: "Catamarca", code: "CT" },
  { label: "Chaco", code: "CH" },
  { label: "Chubut", code: "CU" },
  { label: "Córdoba", code: "CB" },
  { label: "Corrientes", code: "CR" },
  { label: "Entre Ríos", code: "ER" },
  { label: "Formosa", code: "FO" },
  { label: "Jujuy", code: "JY" },
  { label: "La Pampa", code: "LP" },
  { label: "La Rioja", code: "LR" },
  { label: "Mendoza", code: "MZ" },
  { label: "Misiones", code: "MI" },
  { label: "Neuquén", code: "NQ" },
  { label: "Río Negro", code: "RN" },
  { label: "Salta", code: "SA" },
  { label: "San Juan", code: "SJ" },
  { label: "San Luis", code: "SL" },
  { label: "Santa Cruz", code: "SC" },
  { label: "Santa Fe", code: "SF" },
  { label: "Santiago del Estero", code: "SE" },
  { label: "Tierra del Fuego", code: "TF" },
  { label: "Tucumán", code: "TM" },
];

export const FIXED_COUNTRY = "AR";
export const FIXED_COUNTRY_LABEL = "Argentina";

export function isHeartbeatOverdue(lastHeartbeat: string | null, now = Date.now()): boolean {
  return !lastHeartbeat || now - new Date(lastHeartbeat).getTime() >= HEARTBEAT_LIMIT_MS;
}

export function formatHeartbeatCountdown(lastHeartbeat: string | null, now = Date.now()): string {
  if (!lastHeartbeat) {
    return "Estoy bien";
  }

  const remainingMs = Math.max(0, HEARTBEAT_LIMIT_MS - (now - new Date(lastHeartbeat).getTime()));
  const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  return `Disponible en ${remainingHours}h ${remainingMinutes.toString().padStart(2, "0")}m`;
}