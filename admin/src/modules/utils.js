// ===== DATE FORMATTING (Local Time) =====

function toDateObj(timestamp) {
  if (!timestamp) return null;
  // Handle Firestore Timestamp, JavaScript Date, or ISO string
  if (typeof timestamp.toDate === "function") return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === "string") return new Date(timestamp);
  if (typeof timestamp === "number") return new Date(timestamp);
  return null;
}

export function formatDate(timestamp) {
  const date = toDateObj(timestamp);
  if (!date) return "Sin aviso registrado";
  return date.toLocaleString("es-ES");
}

export function formatDateTime(timestamp) {
  const date = toDateObj(timestamp);
  if (!date) return "—";
  return date.toLocaleString("es-ES");
}

export function formatDateTimeForInput(timestamp) {
  const date = toDateObj(timestamp);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function formatChartDate(date) {
  if (!date) return "";
  return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
}

// ===== ERROR BOUNDARY =====

let errorBoundaryEnabled = true;

export function setErrorBoundaryEnabled(enabled) {
  errorBoundaryEnabled = enabled;
}

export function showErrorBoundary(container, error, fallbackContent = null) {
  if (!errorBoundaryEnabled) throw error;
  
  const errorHtml = fallbackContent || `
    <div class="error-boundary">
      <div class="error-boundary-icon">⚠️</div>
      <h3>Error al cargar</h3>
      <p>${escapeHtml(error.message || "Error desconocido")}</p>
      <div class="error-boundary-actions">
        <button class="secondary-button" onclick="window.location.reload()">Recargar página</button>
        <button class="secondary-button" onclick="this.closest('.error-boundary').remove(); window.retryLoad?.()">Reintentar</button>
      </div>
      <details class="error-details">
        <summary>Detalles técnicos</summary>
        <pre>${escapeHtml(error.stack || error.toString())}</pre>
      </details>
    </div>
  `;
  
  if (typeof container === "string") {
    container = document.querySelector(container);
  }
  if (container) {
    container.innerHTML = errorHtml;
  }
}

export function withRetry(fn, retries = 3, delay = 1000) {
  return async (...args) => {
    let lastError;
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        if (i < retries) {
          await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
        }
      }
    }
    throw lastError;
  };
}

// ===== SKELETON LOADERS =====

export function showSkeleton(container, rows = 5, type = "card") {
  if (typeof container === "string") {
    container = document.querySelector(container);
  }
  if (!container) return;
  
  if (type === "table") {
    container.innerHTML = Array(rows).fill(0).map(() => `
      <tr><td colspan="8"><div class="loading-skeleton skeleton-row long"></div></td></tr>
    `).join("");
  } else if (type === "card") {
    container.innerHTML = Array(rows).fill(0).map(() => `
      <div class="skeleton-card">
        <div class="loading-skeleton skeleton-row medium"></div>
        <div class="loading-skeleton skeleton-row short"></div>
        <div class="loading-skeleton skeleton-row short"></div>
      </div>
    `).join("");
  } else {
    container.innerHTML = Array(rows).fill(0).map(() => `
      <div class="loading-skeleton skeleton-row"></div>
    `).join("");
  }
}

// ===== HTML ESCAPING =====

export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ===== SURVEY STATUS =====

export function getSurveyStatus(survey) {
  const now = Date.now();
  const start = survey.startAt?.toMillis?.() ?? 0;
  const end = survey.endAt?.toMillis?.() ?? 0;
  
  if (!survey.active) return { text: "Desactivada", class: "status-inactive" };
  if (start && now < start) return { text: "Programada", class: "status-never" };
  if (end && now > end) return { text: "Finalizada", class: "status-inactive" };
  return { text: "Activa", class: "status-active" };
}

// ===== PROVINCES DATA =====

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

export function getProvinceLabel(code) {
  const province = PROVINCES_AR.find(p => p.code === code);
  return province?.label || code;
}

// ===== TARGETING HELPERS =====

export function getTargetingDisplay(survey) {
  if (!survey.targetCountry && !survey.targetProvince) return "Todos";
  
  let text = survey.targetCountry === "AR" ? "Argentina" : survey.targetCountry;
  if (survey.targetProvince) {
    text += ` / ${getProvinceLabel(survey.targetProvince)}`;
  }
  return text;
}