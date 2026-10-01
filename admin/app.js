import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  addDoc,
  deleteField,
  collection,
  getDocs,
  getFirestore,
  serverTimestamp,
  query,
  orderBy,
  where,
  updateDoc,
  doc,
  deleteDoc,
  writeBatch,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const app = initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const ADMIN_EMAIL = "cristiansolana1@gmail.com";

const PROVINCES_AR = [
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

const loginView = document.querySelector("#login-view");
const dashboardView = document.querySelector("#dashboard-view");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const dashboardMessage = document.querySelector("#dashboard-message");
const userCount = document.querySelector("#user-count");
const refreshButton = document.querySelector("#refresh-button");
const logoutButton = document.querySelector("#logout-button");
const surveyForm = document.querySelector("#survey-form");
const surveyOptions = document.querySelector("#survey-options");
const addOptionButton = document.querySelector("#add-option-button");
const surveyMessage = document.querySelector("#survey-message");
const surveyResults = document.querySelector("#survey-results");

// Survey datetime elements
const surveyStart = document.querySelector("#survey-start");
const surveyEnd = document.querySelector("#survey-end");

// Delete modal elements
const deleteModal = document.querySelector("#delete-modal");
const deleteModalCancel = document.querySelector("#delete-modal-cancel");
const deleteModalConfirm = document.querySelector("#delete-modal-confirm");
const deleteModalMessage = document.querySelector("#delete-modal-message");

// Main survey form datetime pickers
const surveyStartPicker = document.querySelector("#survey-start-picker");
const surveyEndPicker = document.querySelector("#survey-end-picker");

function initMainSurveyPickers() {
  if (!surveyStartPicker || !surveyEndPicker) return;
  
  const startInput = document.querySelector("#survey-start");
  const endInput = document.querySelector("#survey-end");
  const startTrigger = surveyStartPicker.querySelector(".datetime-picker-trigger");
  const endTrigger = surveyEndPicker.querySelector(".datetime-picker-trigger");
  
  if (startTrigger) {
    const newStartTrigger = startTrigger.cloneNode(true);
    startTrigger.parentNode.replaceChild(newStartTrigger, startTrigger);
    newStartTrigger.addEventListener("click", () => openDateTimePicker(startInput, newStartTrigger));
  }
  
  if (endTrigger) {
    const newEndTrigger = endTrigger.cloneNode(true);
    endTrigger.parentNode.replaceChild(newEndTrigger, endTrigger);
    newEndTrigger.addEventListener("click", () => openDateTimePicker(endInput, newEndTrigger));
  }
  
  updateTriggerDisplay(startInput);
  updateTriggerDisplay(endInput);
}

function authMessage(error) {
  switch (error.code) {
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
      return "La API key no autoriza este panel. Agrega localhost:8090 en las restricciones de la clave de Firebase.";
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "El correo o la contraseña no son válidos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
    case "auth/network-request-failed":
      return "Error de red. Revisa tu conexión.";
    default:
      return `No se pudo iniciar sesión (${error.code ?? "error desconocido"}).`;
  }
}

// ===== ERROR BOUNDARY UTILITIES =====
let errorBoundaryEnabled = true;

function showErrorBoundary(container, error, fallbackContent = null) {
  if (!errorBoundaryEnabled) throw error;
  
  const errorHtml = fallbackContent || `
    <div class="error-boundary">
      <div class="error-boundary-icon">⚠️</div>
      <h3>Error al cargar</h3>
      <p>${escapeHtml(error.message || "Error desconocido")}</p>
      <div class="error-boundary-actions">
        <button class="secondary-button" onclick="window.location.reload()">Recargar página</button>
        <button class="secondary-button" onclick="this.closest('.error-boundary').remove(); retryLoad()">Reintentar</button>
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

function wrapAsync(fn, errorContainer, fallbackContent) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`[ErrorBoundary] ${fn.name || "async fn"}:`, error);
      showErrorBoundary(errorContainer, error, fallbackContent);
      return null;
    }
  };
}

function withRetry(fn, retries = 3, delay = 1000) {
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

function setErrorBoundaryEnabled(enabled) {
  errorBoundaryEnabled = enabled;
}

// Retry function placeholder - will be set by individual loaders
let retryLoad = () => {};

function showSkeleton(container, rows = 5, type = "card") {
  if (typeof container === "string") {
    container = document.querySelector(container);
  }
  if (!container) return;
  
  if (type === "table") {
    container.innerHTML = Array(rows).fill(0).map(() => `
      <tr><td colspan="7"><div class="loading-skeleton skeleton-row long"></div></td></tr>
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

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "Sin aviso registrado";
  return timestamp.toDate().toLocaleString("es-ES");
}

function formatDateTime(timestamp) {
  if (!timestamp?.toDate) return "—";
  return timestamp.toDate().toLocaleString("es-ES");
}

function formatChartDate(date) {
  return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLocalDateTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatLocalDate(date)}T${hours}:${minutes}`;
}

// ===== DATETIME PICKER =====
let datetimePickerTarget = null;
let datetimePickerDate = new Date();

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const dayNames = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function openDateTimePicker(targetInput, triggerBtn) {
  datetimePickerTarget = targetInput;
  const dropdown = document.querySelector("#datetime-picker-dropdown");
  
  // Parse existing value if any
  const existingValue = targetInput.value;
  if (existingValue) {
    datetimePickerDate = new Date(existingValue);
  } else {
    datetimePickerDate = new Date();
  }
  
  renderDateTimePicker();
  positionDropdown(triggerBtn);
  dropdown.hidden = false;
  
  // Close on outside click
  setTimeout(() => {
    document.addEventListener("click", closeDateTimePickerOnOutsideClick);
  }, 0);
}

function closeDateTimePicker() {
  const dropdown = document.querySelector("#datetime-picker-dropdown");
  dropdown.hidden = true;
  datetimePickerTarget = null;
  document.removeEventListener("click", closeDateTimePickerOnOutsideClick);
}

function closeDateTimePickerOnOutsideClick(e) {
  const dropdown = document.querySelector("#datetime-picker-dropdown");
  const trigger = document.querySelector(".datetime-picker-trigger:focus, .datetime-picker-trigger:hover");
  if (!dropdown.contains(e.target) && !e.target.closest(".datetime-picker-trigger")) {
    closeDateTimePicker();
  }
}

function positionDropdown(triggerBtn) {
  const dropdown = document.querySelector("#datetime-picker-dropdown");
  const rect = triggerBtn.getBoundingClientRect();
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.top = `${rect.bottom + window.scrollY + 8}px`;
}

function renderDateTimePicker() {
  const year = datetimePickerDate.getFullYear();
  const month = datetimePickerDate.getMonth();
  
  document.querySelector(".datetime-picker-title").textContent = `${monthNames[month]} ${year}`;
  
  // Weekdays
  const weekdaysContainer = document.querySelector(".datetime-picker-weekdays");
  weekdaysContainer.innerHTML = dayNames.map(d => `<div class="datetime-picker-weekday">${d}</div>`).join("");
  
  // Days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDay.getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  
  const today = new Date();
  const todayStr = formatLocalDate(today);
  
  const selectedStr = datetimePickerTarget?.value ? formatLocalDate(new Date(datetimePickerTarget.value)) : "";
  
  let daysHtml = "";
  
  // Previous month days
  for (let i = startDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const dateStr = formatLocalDate(new Date(year, month - 1, day));
    daysHtml += `<button type="button" class="datetime-picker-day other-month" data-date="${dateStr}">${day}</button>`;
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatLocalDate(new Date(year, month, day));
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedStr;
    let classes = "datetime-picker-day";
    if (isToday) classes += " today";
    if (isSelected) classes += " selected";
    daysHtml += `<button type="button" class="${classes}" data-date="${dateStr}">${day}</button>`;
  }
  
  // Next month days to fill grid
  const totalCells = startDay + daysInMonth;
  const nextMonthDays = (7 - (totalCells % 7)) % 7;
  for (let day = 1; day <= nextMonthDays; day++) {
    const dateStr = formatLocalDate(new Date(year, month + 1, day));
    daysHtml += `<button type="button" class="datetime-picker-day other-month" data-date="${dateStr}">${day}</button>`;
  }
  
  document.querySelector(".datetime-picker-days").innerHTML = daysHtml;
  
  // Set time inputs
  document.querySelector("#datetime-picker-hour").value = datetimePickerDate.getHours();
  document.querySelector("#datetime-picker-minute").value = datetimePickerDate.getMinutes();
  
  // Attach day click handlers
  document.querySelectorAll(".datetime-picker-day:not(.disabled)").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".datetime-picker-day.selected").forEach(el => el.classList.remove("selected"));
      e.target.classList.add("selected");
      const dateStr = e.target.dataset.date;
      datetimePickerDate = new Date(dateStr + "T" + datetimePickerDate.toTimeString().slice(0, 5));
    });
  });
  
  // Navigation handlers
  document.querySelector('[data-nav="prev-month"]').onclick = () => {
    datetimePickerDate.setMonth(datetimePickerDate.getMonth() - 1);
    renderDateTimePicker();
  };
  document.querySelector('[data-nav="next-month"]').onclick = () => {
    datetimePickerDate.setMonth(datetimePickerDate.getMonth() + 1);
    renderDateTimePicker();
  };
  
  // Time input handlers
  document.querySelector("#datetime-picker-hour").onchange = (e) => {
    datetimePickerDate.setHours(parseInt(e.target.value) || 0);
  };
  document.querySelector("#datetime-picker-minute").onchange = (e) => {
    datetimePickerDate.setMinutes(parseInt(e.target.value) || 0);
  };
  
  // Clear button
  document.querySelector("#datetime-picker-clear").onclick = () => {
    datetimePickerTarget.value = "";
    updateTriggerDisplay(datetimePickerTarget);
    closeDateTimePicker();
  };
  
  // Confirm button
  document.querySelector("#datetime-picker-confirm").onclick = () => {
    datetimePickerTarget.value = formatLocalDateTime(datetimePickerDate);
    updateTriggerDisplay(datetimePickerTarget);
    closeDateTimePicker();
  };
}

function updateTriggerDisplay(input) {
  const picker = input.closest(".datetime-picker");
  const trigger = picker.querySelector(".datetime-picker-trigger");
  const display = trigger.querySelector(".datetime-picker-display");
  
  if (input.value) {
    const date = new Date(input.value);
    display.textContent = date.toLocaleString("es-ES", { 
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
    trigger.classList.add("has-value");
  } else {
    display.textContent = "Seleccionar";
    trigger.classList.remove("has-value");
  }
}

function formatDateTimeForInput(timestamp) {
  if (!timestamp?.toDate) return "";
  const date = timestamp.toDate();
  return formatLocalDateTime(date);
}

function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function aggregateResponsesByTime(responses, granularity = "day") {
  const buckets = new Map();
  
  responses.forEach((response) => {
    const answeredAt = response.data().answeredAt;
    if (!answeredAt) return;
    
    const date = new Date(answeredAt);
    if (isNaN(date.getTime())) return;
    
    let key;
    if (granularity === "week") {
      const weekStart = getWeekStart(date);
      key = weekStart.toISOString().split("T")[0];
    } else {
      key = date.toISOString().split("T")[0];
    }
    
    if (!buckets.has(key)) {
      buckets.set(key, { date: key, total: 0, byOption: new Map() });
    }
    const bucket = buckets.get(key);
    bucket.total++;
    const answer = response.data().answer;
    if (answer) {
      bucket.byOption.set(answer, (bucket.byOption.get(answer) || 0) + 1);
    }
  });
  
  return Array.from(buckets.values())
    .sort((a, b) => a.date.localeCompare(b.date));
}

function renderTimeSeriesChart(container, data, options, granularity = "day", responses = []) {
  if (data.length === 0) {
    container.innerHTML = '<p class="message">No hay datos de series temporales disponibles.</p>';
    return;
  }
  
  const chartHtml = `
    <div class="timeseries-chart">
      <div class="timeseries-controls">
        <label>
          <input type="radio" name="timeseries-granularity" value="day" ${granularity === "day" ? "checked" : ""}> Día
        </label>
        <label>
          <input type="radio" name="timeseries-granularity" value="week" ${granularity === "week" ? "checked" : ""}> Semana
        </label>
      </div>
      <div class="timeseries-bars">
        ${data.map(bucket => {
          const date = new Date(bucket.date + "T00:00:00");
          return `
            <div class="timeseries-bar-group">
              <div class="timeseries-bar-label">${formatChartDate(date)}</div>
              <div class="timeseries-bar-stack">
                ${options.map(opt => {
                  const count = bucket.byOption.get(opt) || 0;
                  const pct = bucket.total > 0 ? (count / bucket.total) * 100 : 0;
                  return `
                    <div class="timeseries-bar-segment" 
                         style="width: ${pct}%; background: var(--option-color-${opt.replace(/[^a-z0-9]/gi, '')}, #286052);"
                         title="${opt}: ${count} (${pct.toFixed(1)}%)">
                      ${pct > 10 ? `<span>${count}</span>` : ""}
                    </div>
                  `;
                }).join("")}
              </div>
              <div class="timeseries-bar-total">${bucket.total}</div>
            </div>
          `;
        }).join("")}
      </div>
      <div class="timeseries-legend">
        ${options.map((opt, i) => `
          <span class="timeseries-legend-item" style="--option-color-${opt.replace(/[^a-z0-9]/gi, '')}: hsl(${i * 60 + 120}, 60%, 35%)">
            <span class="timeseries-legend-color"></span>${opt}
          </span>
        `).join("")}
      </div>
    </div>
  `;
  
  container.innerHTML = chartHtml;
  
  container.querySelectorAll('input[name="timeseries-granularity"]').forEach(input => {
    input.addEventListener("change", (e) => {
      const newGranularity = e.target.value;
      const newData = aggregateResponsesByTime(responses, newGranularity);
      renderTimeSeriesChart(container, newData, options, newGranularity, responses);
    });
  });
}

function getSurveyStatus(survey) {
  const now = Date.now();
  const start = survey.startAt?.toMillis?.() ?? 0;
  const end = survey.endAt?.toMillis?.() ?? 0;
  
  if (!survey.active) return { text: "Desactivada", class: "status-inactive" };
  if (start && now < start) return { text: "Programada", class: "status-never" };
  if (end && now > end) return { text: "Finalizada", class: "status-inactive" };
  return { text: "Activa", class: "status-active" };
}

function countEligibleUsers(userDocs, survey) {
  return userDocs.filter((userDoc) => {
    const data = userDoc.data();
    const profile = data.publicProfile || data.profile;
    if (!profile) return false;
    if (survey.targetCountry && profile.country !== survey.targetCountry) return false;
    if (survey.targetProvince && profile.province !== survey.targetProvince) return false;
    return true;
  }).length;
}

async function mapWithConcurrency(items, concurrency, mapItem) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let hasError = false;
  let firstError;
  const workerCount = Math.min(items.length, concurrency);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (!hasError && nextIndex < items.length) {
      const index = nextIndex++;
      try {
        results[index] = await mapItem(items[index], index);
      } catch (error) {
        if (!hasError) {
          hasError = true;
          firstError = error;
        }
      }
    }
  }));

  if (hasError) throw firstError;
  return results;
}

async function loadSurveySummaries() {
  const snapshot = await getDocs(collection(db, "surveys"));
  const surveys = await mapWithConcurrency(snapshot.docs, 4, async (surveyDoc) => {
    const data = surveyDoc.data();
    const options = Array.isArray(data.options) ? data.options : [];
    const responsesSnapshot = await getDocs(collection(db, "surveys", surveyDoc.id, "responses"));
    const counts = new Map(options.map(option => [option, 0]));

    responsesSnapshot.docs.forEach(responseDoc => {
      const answer = responseDoc.data().answer;
      if (counts.has(answer)) counts.set(answer, counts.get(answer) + 1);
    });

    return {
      id: surveyDoc.id,
      question: data.question ?? "Encuesta sin pregunta",
      options,
      targetCountry: data.targetCountry,
      targetProvince: data.targetProvince,
      active: data.active ?? true,
      startAt: data.startAt,
      endAt: data.endAt,
      createdAt: data.createdAt,
      createdBy: data.createdBy,
      totalResponses: responsesSnapshot.size,
      counts: [...counts.entries()],
    };
  });

  return surveys.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}

async function loadSurveyResults() {
  try {
    showSkeleton(surveyResults, 3, "card");
    const surveys = await loadSurveySummaries();
    surveyResults.replaceChildren();

    if (surveys.length === 0) {
      surveyResults.innerHTML = '<p class="message">Todavía no hay encuestas publicadas.</p>';
      return;
    }

    surveys.forEach((survey) => {
    const status = getSurveyStatus(survey);
    const card = document.createElement("article");
    card.className = "survey-result-card";
    
    const heading = document.createElement("div");
    heading.className = "survey-result-heading";
    heading.innerHTML = `
      <div>
        <h3></h3>
        <small></small>
        <div class="survey-meta">
          <span class="survey-status-badge ${status.class}">${status.text}</span>
          ${survey.startAt ? `<span>Inicio: ${formatDateTime(survey.startAt)}</span>` : ""}
          ${survey.endAt ? `<span>Fin: ${formatDateTime(survey.endAt)}</span>` : ""}
        </div>
      </div>
      <strong>${survey.totalResponses} respuesta${survey.totalResponses === 1 ? "" : "s"}</strong>
    `;
    heading.querySelector("h3").textContent = survey.question;
    heading.querySelector("small").textContent = formatDate(survey.createdAt);
    card.append(heading);

    // Toggle active button
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "survey-actions-row";
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = survey.active ? "secondary-button" : "text-button";
    toggleBtn.textContent = survey.active ? "Desactivar" : "Activar";
    toggleBtn.addEventListener("click", async () => {
      try {
        await updateDoc(doc(db, "surveys", survey.id), { active: !survey.active });
        await loadSurveyResults();
      } catch (error) {
        console.error("Error toggling survey:", error);
        alert("Error al cambiar estado: " + error.message);
      }
    });
    actionsDiv.append(toggleBtn);

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "text-button danger";
    deleteBtn.textContent = "Eliminar";
    deleteBtn.style.marginLeft = "8px";
    deleteBtn.addEventListener("click", () => openDeleteModal(survey));
    actionsDiv.append(deleteBtn);

    // View results button
    const viewResultsBtn = document.createElement("button");
    viewResultsBtn.type = "button";
    viewResultsBtn.className = "text-button";
    viewResultsBtn.textContent = "Ver resultados";
    viewResultsBtn.style.marginLeft = "8px";
    viewResultsBtn.addEventListener("click", () => openResultsModal(survey));
    actionsDiv.append(viewResultsBtn);

    card.append(actionsDiv);

    const table = document.createElement("div");
    table.className = "results-table";
    survey.counts.forEach(([option, count]) => {
      const row = document.createElement("div");
      row.className = "result-row";
      row.innerHTML = "<span></span><strong></strong>";
      row.querySelector("span").textContent = option;
      row.querySelector("strong").textContent = count;
      table.append(row);
    });
    card.append(table);
    surveyResults.append(card);
  });
} catch (error) {
  console.error("[ErrorBoundary] loadSurveyResults:", error);
  showErrorBoundary(surveyResults, error, `
    <div class="error-boundary">
      <div class="error-boundary-icon">📊</div>
      <h3>Error al cargar encuestas</h3>
      <p>${escapeHtml(error.message)}</p>
      <button class="secondary-button" onclick="loadSurveyResults()">Reintentar</button>
    </div>
  `);
}
}

async function loadDashboard() {
  dashboardMessage.textContent = "Actualizando datos...";
  try {
    const snapshot = await getDocs(collection(db, "users"));
    
    // Contar solo usuarios con perfil (publicProfile o profile)
    const usersWithProfile = snapshot.docs.filter(doc => {
      const data = doc.data();
      return data.publicProfile || data.profile;
    });
    userCount.textContent = usersWithProfile.length;
    await loadSurveyResults();
    dashboardMessage.textContent = `Actualizado: ${new Date().toLocaleTimeString("es-ES")}`;
  } catch (error) {
    console.error("[Admin] Error loading dashboard:", error);
    if (error.code === "permission-denied") {
      dashboardMessage.textContent = "Sin permisos para leer usuarios. Revisa reglas de Firestore (necesita 'list' en collection users).";
      userCount.textContent = "—";
    } else {
      dashboardMessage.textContent = `Error: ${error.message}`;
    }
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    if (credential.user.email?.toLowerCase() === ADMIN_EMAIL && !credential.user.emailVerified) {
      try {
        await sendEmailVerification(credential.user);
        loginError.textContent = "Esta cuenta aún no está verificada. Enviamos un enlace a tu correo; ábrelo y vuelve a iniciar sesión.";
      } catch (error) {
        loginError.textContent = `No se pudo enviar el enlace de verificación (${error.code ?? "error desconocido"}).`;
      }
      await signOut(auth);
    }
  } catch (error) {
    loginError.textContent = authMessage(error);
  }
});

refreshButton.addEventListener("click", () => {
  void loadDashboard().catch(() => {
    dashboardMessage.textContent = "No se pudieron cargar los datos. Revisa los permisos de Firestore.";
  });
});

logoutButton.addEventListener("click", () => {
  void signOut(auth).catch((error) => {
    dashboardMessage.textContent = `No se pudo cerrar sesión: ${error.message}`;
  });
});

addOptionButton.addEventListener("click", () => {
  const optionCount = surveyOptions.querySelectorAll(".survey-option").length;
  if (optionCount >= 4) {
    surveyMessage.textContent = "Una encuesta puede tener como máximo 4 respuestas.";
    return;
  }

  const label = document.createElement("label");
  label.innerHTML = `Respuesta ${optionCount + 1}<input class="survey-option" type="text" required />`;
  surveyOptions.append(label);
});

surveyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  surveyMessage.textContent = "Publicando encuesta...";
  const question = document.querySelector("#survey-question").value.trim();
  const options = [...surveyOptions.querySelectorAll(".survey-option")]
    .map((input) => input.value.trim())
    .filter(Boolean);

  const startValue = surveyStart.value;
  const endValue = surveyEnd.value;

  if (options.length < 2 || options.length > 4) {
    surveyMessage.textContent = "Agrega entre 2 y 4 respuestas.";
    return;
  }

  const surveyData = {
    question,
    options,
    active: true,
    createdAt: serverTimestamp(),
    createdBy: ADMIN_EMAIL,
  };

  if (startValue) {
    surveyData.startAt = new Date(startValue);
  }
  if (endValue) {
    surveyData.endAt = new Date(endValue);
  }

  try {
    await addDoc(collection(db, "surveys"), surveyData);
    surveyForm.reset();
    updateTriggerDisplay(document.querySelector("#survey-start"));
    updateTriggerDisplay(document.querySelector("#survey-end"));
    surveyMessage.textContent = "Encuesta publicada correctamente.";
    await loadSurveyResults();
  } catch (error) {
    surveyMessage.textContent = error.code === "permission-denied"
      ? "Firestore rechazo la escritura. Publica la regla create de surveys para el administrador."
      : `No se pudo publicar (${error.code ?? "error desconocido"}).`;
  }
});

onAuthStateChanged(auth, async (user) => {
  const isVerifiedAdmin = Boolean(
    user?.emailVerified && user.email?.toLowerCase() === ADMIN_EMAIL
  );
  loginView.hidden = isVerifiedAdmin;
  dashboardView.hidden = true;
  logoutButton.hidden = !isVerifiedAdmin;
  if (!user) {
    return;
  }

  if (!user.emailVerified) return;

  try {
    const token = await user.getIdTokenResult();
    if (user.email?.toLowerCase() !== ADMIN_EMAIL || token.claims.email_verified !== true) {
      throw new Error("Usa la cuenta administradora con el correo verificado.");
    }

    loginView.hidden = true;
    dashboardView.hidden = false;
    await loadDashboard();
    initMainSurveyPickers();
    setupSidebarNavigation();
  } catch (error) {
    await signOut(auth);
    loginError.textContent = error instanceof Error
      ? error.message
      : "No se pudo verificar el acceso administrativo.";
  }
});

function setupSidebarNavigation() {
  const sidebarLinks = document.querySelectorAll(".sidebar-link[data-view]");
  const views = document.querySelectorAll(".view-content");
  const viewTitle = document.querySelector("#view-title");
  const viewSubtitle = document.querySelector("#view-subtitle");
  
  const viewLabels = {
    dashboard: { title: "Resumen de actividad", subtitle: "Panel de supervisión" },
    users: { title: "Gestión de Usuarios", subtitle: "Administra los usuarios registrados" },
    surveys: { title: "Gestión de Encuestas", subtitle: "Crea, edita y administra las encuestas" },
    results: { title: "Resultados Detallados", subtitle: "Analiza las respuestas de cada encuesta" }
  };
  
  function switchView(viewName) {
    views.forEach(v => v.hidden = true);
    const targetView = document.querySelector(`#view-${viewName}`);
    if (targetView) targetView.hidden = false;
    
    sidebarLinks.forEach(link => {
      link.classList.toggle("active", link.dataset.view === viewName);
    });
    
    const labels = viewLabels[viewName] || viewLabels.dashboard;
    viewTitle.textContent = labels.title;
    viewSubtitle.textContent = labels.subtitle;
    
    // Load data for specific views
    if (viewName === "surveys") {
      loadSurveysTable();
    } else if (viewName === "users") {
      loadUsersTable();
    } else if (viewName === "results") {
      loadResultsView();
    }
  }
  
  sidebarLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      switchView(link.dataset.view);
    });
  });
  
  // Mobile menu toggle
  const sidebar = document.querySelector("#sidebar");
  const mobileMenuBtn = document.createElement("button");
  mobileMenuBtn.className = "mobile-menu-btn";
  mobileMenuBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  mobileMenuBtn.style.display = "none";
  mobileMenuBtn.setAttribute("aria-label", "Abrir menú");
  document.querySelector(".topbar").prepend(mobileMenuBtn);
  
  const backdrop = document.createElement("div");
  backdrop.className = "sidebar-backdrop";
  document.body.appendChild(backdrop);
  
  mobileMenuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    backdrop.classList.toggle("open");
  });
  
  backdrop.addEventListener("click", () => {
    sidebar.classList.remove("open");
    backdrop.classList.remove("open");
  });
  
  // Close sidebar on link click (mobile)
  sidebarLinks.forEach(link => {
    link.addEventListener("click", () => {
      sidebar.classList.remove("open");
      backdrop.classList.remove("open");
    });
  });
}

// Load users table
let allUsers = [];
let filteredUsers = [];
let currentUserPage = 1;
const userPageSize = 25;

function updateUsersPagination() {
  const pagination = document.querySelector("#users-pagination");
  const pageInfo = document.querySelector("#users-page-info");
  const prevButton = pagination.querySelector('[data-page="prev"]');
  const nextButton = pagination.querySelector('[data-page="next"]');
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / userPageSize));

  pagination.hidden = totalPages === 1;
  pageInfo.textContent = `Página ${currentUserPage} de ${totalPages}`;
  prevButton.disabled = currentUserPage === 1;
  nextButton.disabled = currentUserPage === totalPages;
}

function renderUsersTable() {
  const tbody = document.querySelector("#users-tbody");
  const start = (currentUserPage - 1) * userPageSize;
  const pageUsers = filteredUsers.slice(start, start + userPageSize);

  if (pageUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">No se encontraron usuarios.</td></tr>';
    updateUsersPagination();
    return;
  }

  tbody.innerHTML = pageUsers.map(user => {
    const profile = user.publicProfile || user.profile;
    const name = profile?.fullName || "Sin nombre";
    const email = user.emailNormalized || user.email || profile?.email || "Sin email";
    const lastAlive = user.lastAliveAt ? formatDate(user.lastAliveAt) : "Nunca";
    const hasProfile = profile ? "Completo" : "Pendiente";

    return `
      <tr data-user-id="${escapeHtml(user.id)}">
        <td>
          <div class="user-cell">
            <span class="user-name">${escapeHtml(name)}</span>
            <span class="user-email">${escapeHtml(email)}</span>
          </div>
        </td>
        <td>${escapeHtml(email)}</td>
        <td>${lastAlive}</td>
        <td><span class="status-badge ${hasProfile === "Completo" ? "active" : "pending"}">${hasProfile}</span></td>
        <td>
          <div class="action-btns">
            <button class="action-btn secondary-btn view-user-btn" title="Ver detalle">👁️</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll(".view-user-btn").forEach(button => {
    button.addEventListener("click", (event) => {
      const userId = event.currentTarget.closest("tr")?.dataset.userId;
      const user = allUsers.find(candidate => candidate.id === userId);
      if (user) openUserModal(user);
    });
  });

  updateUsersPagination();
}

function applyUserSearch() {
  const search = document.querySelector("#user-search").value.trim().toLocaleLowerCase("es");
  filteredUsers = allUsers.filter(user => {
    const profile = user.publicProfile || user.profile || {};
    const email = user.emailNormalized || user.email || profile.email || "";
    return `${profile.fullName || ""} ${email}`.toLocaleLowerCase("es").includes(search);
  });
  currentUserPage = 1;
  renderUsersTable();
}

document.querySelector("#user-search").addEventListener("input", applyUserSearch);
document.querySelector("#users-pagination").querySelector('[data-page="prev"]').addEventListener("click", () => {
  if (currentUserPage > 1) {
    currentUserPage--;
    renderUsersTable();
  }
});
document.querySelector("#users-pagination").querySelector('[data-page="next"]').addEventListener("click", () => {
  const totalPages = Math.ceil(filteredUsers.length / userPageSize);
  if (currentUserPage < totalPages) {
    currentUserPage++;
    renderUsersTable();
  }
});

async function loadUsersTable() {
  const tbody = document.querySelector("#users-tbody");
  const tableContainer = document.querySelector("#view-users .table-container");
  showSkeleton(tbody, 5, "table");

  try {
    const snapshot = await getDocs(collection(db, "users"));
    allUsers = snapshot.docs
      .map(userDoc => ({ id: userDoc.id, ...userDoc.data() }))
      .filter(user => user.publicProfile || user.profile);

    const badge = document.querySelector("#users-badge");
    if (badge) badge.textContent = allUsers.length;
    applyUserSearch();
  } catch (error) {
    console.error("[ErrorBoundary] loadUsersTable:", error);
    showErrorBoundary(tableContainer || tbody, error, `
      <div class="error-boundary">
        <div class="error-boundary-icon">👥</div>
        <h3>Error al cargar usuarios</h3>
        <p>${escapeHtml(error.message)}</p>
        <button class="secondary-button" onclick="loadUsersTable()">Reintentar</button>
      </div>
    `);
  }
}
 
// Load results view
async function loadResultsView() {
  const container = document.querySelector("#results-content");
  showSkeleton(container, 3, "card");
  
  try {
    const surveys = await loadSurveySummaries();
    
    if (surveys.length === 0) {
      container.innerHTML = '<p class="message">Todavía no hay encuestas publicadas.</p>';
      return;
    }
    
    const usersSnapshot = await getDocs(collection(db, "users"));
    container.innerHTML = surveys.map(survey => {
      const status = getSurveyStatus(survey);
      const eligibleUsers = countEligibleUsers(usersSnapshot.docs, survey);
      const responseRate = eligibleUsers > 0 ? ((survey.totalResponses / eligibleUsers) * 100).toFixed(1) : 0;
      
      return `
        <article class="survey-result-card">
          <div class="survey-result-heading">
            <div>
              <h3>${escapeHtml(survey.question)}</h3>
              <small>${formatDate(survey.createdAt)}</small>
              <div class="survey-meta">
                <span class="survey-status-badge ${status.class}">${status.text}</span>
                ${survey.startAt ? `<span>Inicio: ${formatDateTime(survey.startAt)}</span>` : ""}
                ${survey.endAt ? `<span>Fin: ${formatDateTime(survey.endAt)}</span>` : ""}
              </div>
            </div>
            <div class="results-summary-mini">
              <span><strong>${survey.totalResponses}</strong> respuestas</span>
              <span><strong>${responseRate}%</strong> participación</span>
            </div>
          </div>
          
          <div class="results-chart">
            ${survey.options.map(opt => {
              const count = survey.counts.find(([k]) => k === opt)?.[1] || 0;
              const pct = survey.totalResponses > 0 ? (count / survey.totalResponses) * 100 : 0;
              return `
                <div class="result-bar">
                  <span class="result-bar-label">${escapeHtml(opt)}</span>
                  <div class="result-bar-track">
                    <div class="result-bar-fill" style="width: ${pct}%"></div>
                  </div>
                  <span class="result-bar-value">${count} (${pct.toFixed(1)}%)</span>
                </div>
              `;
            }).join("")}
          </div>
          
          <div class="survey-actions-row">
            <button class="secondary-button view-full-results-btn" data-survey-id="${survey.id}" type="button">
              Ver detalle completo
            </button>
          </div>
        </article>
      `;
    }).join("");
    
    // Attach click handlers for "Ver detalle completo"
    container.querySelectorAll(".view-full-results-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const surveyId = e.target.dataset.surveyId;
        const survey = surveys.find(s => s.id === surveyId);
        if (survey) openResultsModal(survey);
      });
    });
    
  } catch (error) {
    console.error("[ErrorBoundary] loadResultsView:", error);
    showErrorBoundary(container, error, `
      <div class="error-boundary">
        <div class="error-boundary-icon">📈</div>
        <h3>Error al cargar resultados</h3>
        <p>${escapeHtml(error.message)}</p>
        <button class="secondary-button" onclick="loadResultsView()">Reintentar</button>
      </div>
    `);
  }
}
 
// Open user detail modal
async function openUserModal(user) {
  const modal = document.querySelector("#user-modal");
  const title = document.querySelector("#user-modal-title");
  const content = document.querySelector("#user-modal-content");
  
  const profile = user.publicProfile || user.profile || {};
  
  showSkeleton(content, 3, "card");
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  
  try {
    // Load user's survey responses
    const surveysSnapshot = await getDocs(collection(db, "surveys"));
    const userResponses = [];
    
    for (const surveyDoc of surveysSnapshot.docs) {
      const responseDoc = await getDoc(doc(db, "surveys", surveyDoc.id, "responses", user.id));
      if (responseDoc.exists()) {
        const data = surveyDoc.data();
        const response = responseDoc.data();
        userResponses.push({
          question: data.question,
          answer: response.answer,
          answeredAt: response.answeredAt
        });
      }
    }
    
    title.textContent = `${profile.fullName || "Usuario"} - Detalle`;
    
    content.innerHTML = `
      <div class="user-detail-grid">
        <div class="user-detail-item">
          <div class="user-detail-label">Nombre completo</div>
          <div class="user-detail-value">${escapeHtml(profile.fullName || "—")}</div>
        </div>
        <div class="user-detail-item">
          <div class="user-detail-label">Email</div>
          <div class="user-detail-value">${escapeHtml(user.emailNormalized || user.email || profile.email || "—")}</div>
        </div>
        <div class="user-detail-item">
          <div class="user-detail-label">Teléfono</div>
          <div class="user-detail-value">${escapeHtml(profile.phone || "—")}</div>
        </div>
        <div class="user-detail-item">
          <div class="user-detail-label">Último aviso</div>
          <div class="user-detail-value">${user.lastAliveAt ? formatDate(user.lastAliveAt) : "Nunca"}</div>
        </div>
        <div class="user-detail-item">
          <div class="user-detail-label">Fecha registro</div>
          <div class="user-detail-value">${user.createdAt ? formatDate(user.createdAt) : "—"}</div>
        </div>
        <div class="user-detail-item">
          <div class="user-detail-label">Encuestas respondidas</div>
          <div class="user-detail-value">${userResponses.length}</div>
        </div>
      </div>
      
      ${userResponses.length > 0 ? `
        <div class="user-surveys-list">
          <h4>Respuestas a encuestas</h4>
          ${userResponses.map(r => `
            <div class="user-survey-item">
              <span class="user-survey-question">${escapeHtml(r.question)}</span>
              <span class="user-survey-answer">${escapeHtml(r.answer)}</span>
            </div>
          `).join("")}
        </div>
      ` : '<p class="message">Este usuario no ha respondido ninguna encuesta.</p>'}
    `;
  } catch (error) {
    console.error("Error loading user detail:", error);
    content.innerHTML = `<p class="message error">Error: ${error.message}</p>`;
  }
}

function closeUserModal() {
  const modal = document.querySelector("#user-modal");
  modal.hidden = true;
  document.body.style.overflow = "";
}

document.querySelector("#user-modal-close").addEventListener("click", closeUserModal);
document.querySelector("#user-modal").querySelector(".modal-backdrop").addEventListener("click", closeUserModal);

// ===== RESULTS MODAL =====
let resultsModalRequestId = 0;

async function openResultsModal(survey) {
  const requestId = ++resultsModalRequestId;
  const modal = document.querySelector("#results-modal");
  const title = document.querySelector("#results-modal-title");
  const content = document.querySelector("#results-modal-content");
  const exportPdfButton = document.querySelector("#export-pdf-btn");
  const exportBtn = document.querySelector("#export-csv-btn");
  
  title.textContent = `Resultados: ${survey.question}`;
  exportPdfButton.disabled = true;
  exportPdfButton.onclick = null;
  exportBtn.disabled = true;
  exportBtn.onclick = null;
  exportBtn.dataset.surveyId = survey.id;
  exportBtn.dataset.surveyQuestion = survey.question;
  
  showSkeleton(content, 3, "card");
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  
  try {
    const responsesRequest = getDocs(
      query(collection(db, "surveys", survey.id, "responses"), orderBy("answeredAt", "asc"))
    ).catch((queryError) => {
      console.warn("Could not order responses; retrying without orderBy:", queryError);
      return getDocs(collection(db, "surveys", survey.id, "responses"));
    });
    const [responsesSnapshot, usersSnapshot] = await Promise.all([
      responsesRequest,
      getDocs(collection(db, "users")),
    ]);
    if (requestId !== resultsModalRequestId) return;
    
    const responses = responsesSnapshot.docs;
    const totalResponses = responses.length;
    const options = survey.options ?? [];
    
    const counts = new Map(options.map(opt => [opt, 0]));
    responses.forEach(r => {
      const ans = r.data().answer;
      if (counts.has(ans)) counts.set(ans, counts.get(ans) + 1);
    });
    
    const eligibleUsers = countEligibleUsers(usersSnapshot.docs, survey);
    const responseRate = eligibleUsers > 0 ? ((totalResponses / eligibleUsers) * 100).toFixed(1) : 0;
    
    const timeSeriesContainer = document.createElement("div");
    timeSeriesContainer.dataset.surveyId = survey.id;
    
    const targetCountry = survey.targetCountry === "AR" ? "Argentina" : survey.targetCountry;
    const targetProvince = PROVINCES_AR.find(province => province.code === survey.targetProvince)?.label || survey.targetProvince;
    const targetLabel = targetCountry
      ? `${targetCountry}${targetProvince ? ` / ${targetProvince}` : ""}`
      : "Todos los países";
    const periodLabel = [
      survey.startAt ? `Desde ${formatDateTime(survey.startAt)}` : "Sin fecha de inicio",
      survey.endAt ? `hasta ${formatDateTime(survey.endAt)}` : "sin fecha de fin",
    ].join(" ");
    const generatedAt = new Intl.DateTimeFormat("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date());
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    content.innerHTML = `
      <section class="report-meta" aria-label="Datos de la encuesta">
        <h2>${escapeHtml(survey.question)}</h2>
        <dl>
          <div><dt>Estado</dt><dd>${escapeHtml(getSurveyStatus(survey).text)}</dd></div>
          <div><dt>Creada</dt><dd>${survey.createdAt ? escapeHtml(formatDate(survey.createdAt)) : "—"}</dd></div>
          <div><dt>Periodo</dt><dd>${escapeHtml(periodLabel)}</dd></div>
          <div><dt>Destino</dt><dd>${escapeHtml(targetLabel)}</dd></div>
          <div><dt>Informe generado</dt><dd>${escapeHtml(generatedAt)} (${escapeHtml(timeZone)})</dd></div>
        </dl>
      </section>
      <div class="results-summary">
        <div class="results-summary-item">
          <span class="results-summary-label">Total respuestas</span>
          <span class="results-summary-value">${totalResponses}</span>
        </div>
        <div class="results-summary-item">
          <span class="results-summary-label">Usuarios elegibles</span>
          <span class="results-summary-value">${eligibleUsers}</span>
        </div>
        <div class="results-summary-item">
          <span class="results-summary-label">Tasa de participación</span>
          <span class="results-summary-value">${responseRate}%</span>
        </div>
        <div class="results-summary-item">
          <span class="results-summary-label">Estado</span>
          <span class="results-summary-value">
            <span class="survey-status-badge ${getSurveyStatus(survey).class}">${getSurveyStatus(survey).text}</span>
          </span>
        </div>
      </div>
      <div class="results-chart" id="results-chart"></div>
      <table class="report-breakdown">
        <thead><tr><th>Respuesta</th><th>Cantidad</th><th>Porcentaje</th></tr></thead>
        <tbody id="results-breakdown"></tbody>
      </table>
      <div class="timeseries-section" id="timeseries-section"></div>
    `;
    
    const chartContainer = content.querySelector("#results-chart");
    chartContainer.innerHTML = options.map(opt => {
      const count = counts.get(opt) || 0;
      const pct = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
      return `
        <div class="result-bar">
          <span class="result-bar-label">${escapeHtml(opt)}</span>
          <div class="result-bar-track">
            <div class="result-bar-fill" style="width: ${pct}%"></div>
          </div>
          <span class="result-bar-value">${count} (${pct.toFixed(1)}%)</span>
        </div>
      `;
    }).join("");

    content.querySelector("#results-breakdown").innerHTML = options.map(option => {
      const count = counts.get(option) || 0;
      const pct = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
      return `<tr><td>${escapeHtml(option)}</td><td>${count}</td><td>${pct.toFixed(1)}%</td></tr>`;
    }).join("");
    
    const timeSeriesData = aggregateResponsesByTime(responses, "day");
    renderTimeSeriesChart(timeSeriesContainer, timeSeriesData, options, "day", responses);
    content.querySelector("#timeseries-section").appendChild(timeSeriesContainer);
    
    exportPdfButton.disabled = false;
    exportPdfButton.onclick = () => printSurveyReport(survey);
    exportBtn.disabled = false;
    exportBtn.onclick = () => exportSurveyCSV(survey, responses, options, counts);
    
    // Show a message if no responses yet
    if (totalResponses === 0) {
      chartContainer.innerHTML = '<p class="message">Esta encuesta aún no tiene respuestas.</p>';
      timeSeriesContainer.innerHTML = '<p class="message">No hay datos de series temporales disponibles.</p>';
    }
    
  } catch (error) {
    if (requestId !== resultsModalRequestId) return;
    console.error("Error loading results:", error);
    content.innerHTML = `<p class="message error">Error al cargar resultados: ${error.message}</p>`;
  }
}

function printSurveyReport(survey) {
  const previousTitle = document.title;
  document.title = `Resultados - ${survey.question}`.replace(/[\\/:*?"<>|]/g, "-");
  window.addEventListener("afterprint", () => {
    document.title = previousTitle;
  }, { once: true });
  window.print();
}

function closeResultsModal() {
  resultsModalRequestId++;
  const modal = document.querySelector("#results-modal");
  document.querySelector("#export-pdf-btn").onclick = null;
  document.querySelector("#export-pdf-btn").disabled = true;
  document.querySelector("#export-csv-btn").onclick = null;
  document.querySelector("#export-csv-btn").disabled = true;
  document.querySelector("#results-modal-content").replaceChildren();
  modal.hidden = true;
  document.body.style.overflow = "";
}

async function exportSurveyCSV(survey, responses, options, counts) {
  const headers = ["Fecha respuesta", "Usuario ID", "Respuesta"];
  const rows = responses.map(r => {
    const data = r.data();
    return [
      data.answeredAt ? new Date(data.answeredAt).toLocaleString("es-ES") : "",
      r.id,
      data.answer || ""
    ];
  });
  
  const summaryRows = [
    [],
    ["Resumen"],
    ["Pregunta", survey.question],
    ["Total respuestas", responses.length],
    ...options.map(opt => [opt, counts.get(opt) || 0])
  ];
  
  const csv = [headers, ...rows, ...summaryRows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `encuesta-${survey.id}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ===== DELETE SURVEY MODAL =====
let surveyToDelete = null;

function openDeleteModal(survey) {
  surveyToDelete = survey;
  deleteModalMessage.textContent = `¿Eliminar "${survey.question}"? Se borrarán ${survey.totalResponses} respuesta${survey.totalResponses === 1 ? "" : "s"} y la encuesta. Esta acción no se puede deshacer.`;
  deleteModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeDeleteModal() {
  surveyToDelete = null;
  deleteModal.hidden = true;
  document.body.style.overflow = "";
}

async function confirmDeleteSurvey() {
  if (!surveyToDelete) return;

  deleteModalConfirm.disabled = true;
  deleteModalConfirm.textContent = "Eliminando...";

  try {
    // Firestore batches are limited to 500 writes.
    const responsesSnapshot = await getDocs(collection(db, "surveys", surveyToDelete.id, "responses"));
    for (let offset = 0; offset < responsesSnapshot.docs.length; offset += 500) {
      const batch = writeBatch(db);
      responsesSnapshot.docs.slice(offset, offset + 500).forEach((responseDoc) => {
        batch.delete(responseDoc.ref);
      });
      await batch.commit();
    }

    await deleteDoc(doc(db, "surveys", surveyToDelete.id));

    closeDeleteModal();
    await loadSurveyResults();
  } catch (error) {
    console.error("Error deleting survey:", error);
    alert("Error al eliminar: " + error.message);
  } finally {
    deleteModalConfirm.disabled = false;
    deleteModalConfirm.textContent = "Eliminar";
  }
}

deleteModalConfirm.addEventListener("click", confirmDeleteSurvey);

// Close modal on backdrop click
deleteModal.querySelector(".modal-backdrop").addEventListener("click", closeDeleteModal);

// Close modal on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!deleteModal.hidden) closeDeleteModal();
    if (!document.querySelector("#results-modal").hidden) closeResultsModal();
    if (!document.querySelector("#survey-modal").hidden) closeSurveyModal();
    if (!document.querySelector("#user-modal").hidden) closeUserModal();
  }
});

// Results modal close
document.querySelector("#results-modal-close").addEventListener("click", closeResultsModal);
document.querySelector("#results-modal").querySelector(".modal-backdrop").addEventListener("click", closeResultsModal);

// ===== SURVEYS TABLE =====
let allSurveys = [];
let filteredSurveys = [];
let currentPage = 1;
const pageSize = 10;
let currentSort = "createdAt-desc";
let currentStatusFilter = "";
let currentSearch = "";

async function loadSurveysTable() {
  const tbody = document.querySelector("#surveys-tbody");
  const tableContainer = document.querySelector(".table-container");
  showSkeleton(tbody, 5, "table");
  
  try {
    allSurveys = await loadSurveySummaries();
    
    applyFiltersAndSort();
    renderSurveysTable();
    updateSurveysBadge();
  } catch (error) {
    console.error("[ErrorBoundary] loadSurveysTable:", error);
    showErrorBoundary(tableContainer || tbody, error, `
      <div class="error-boundary">
        <div class="error-boundary-icon">📋</div>
        <h3>Error al cargar encuestas</h3>
        <p>${escapeHtml(error.message)}</p>
        <button class="secondary-button" onclick="loadSurveysTable()">Reintentar</button>
      </div>
    `);
  }
}

function applyFiltersAndSort() {
  filteredSurveys = allSurveys.filter(survey => {
    if (currentStatusFilter) {
      const status = getSurveyStatus(survey);
      if (currentStatusFilter === "active" && status.text !== "Activa") return false;
      if (currentStatusFilter === "inactive" && status.text !== "Desactivada") return false;
      if (currentStatusFilter === "scheduled" && status.text !== "Programada") return false;
      if (currentStatusFilter === "ended" && status.text !== "Finalizada") return false;
    }
    if (currentSearch) {
      const searchLower = currentSearch.toLowerCase();
      if (!survey.question.toLowerCase().includes(searchLower)) return false;
    }
    return true;
  });
  
  const [field, direction] = currentSort.split("-");
  filteredSurveys.sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];
    
    if (field === "createdAt") {
      aVal = aVal?.toMillis?.() ?? 0;
      bVal = bVal?.toMillis?.() ?? 0;
    } else if (field === "responses") {
      aVal = a.totalResponses;
      bVal = b.totalResponses;
    } else if (field === "question") {
      aVal = a.question.toLowerCase();
      bVal = b.question.toLowerCase();
    }
    
    if (aVal < bVal) return direction === "asc" ? -1 : 1;
    if (aVal > bVal) return direction === "asc" ? 1 : -1;
    return 0;
  });
  
  currentPage = 1;
}

function renderSurveysTable() {
  const tbody = document.querySelector("#surveys-tbody");
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageSurveys = filteredSurveys.slice(start, end);
  
  if (pageSurveys.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No hay encuestas que coincidan.</td></tr>';
    updatePagination(0);
    return;
  }
  
  tbody.innerHTML = pageSurveys.map(survey => {
    const status = getSurveyStatus(survey);
    const optionsText = survey.options?.slice(0, 3).join(", ") + (survey.options?.length > 3 ? "..." : "") || "—";
    const period = [];
    if (survey.startAt) period.push(`Inicio: ${formatDateTime(survey.startAt)}`);
    if (survey.endAt) period.push(`Fin: ${formatDateTime(survey.endAt)}`);
    const periodText = period.join(" · ") || "Sin fechas";
    
    // Targeting display
    let targetingText = "Todos";
    if (survey.targetCountry) {
      const countryLabel = survey.targetCountry === "AR" ? "Argentina" : survey.targetCountry;
      targetingText = countryLabel;
      if (survey.targetProvince) {
        const province = PROVINCES_AR.find(p => p.code === survey.targetProvince);
        targetingText += ` / ${province?.label || survey.targetProvince}`;
      }
    }
    
    return `
      <tr data-survey-id="${survey.id}">
        <td><strong>${escapeHtml(survey.question)}</strong></td>
        <td>${escapeHtml(optionsText)}</td>
        <td><span class="status-badge ${status.class.replace("status-", "")}">${status.text}</span></td>
        <td>${escapeHtml(periodText)}</td>
        <td>${escapeHtml(targetingText)}</td>
        <td>${survey.totalResponses}</td>
        <td>${survey.createdAt ? formatDate(survey.createdAt) : "—"}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn secondary-btn view-results-btn" title="Ver resultados">📊</button>
            <button class="action-btn secondary-btn edit-survey-btn" title="Editar">✏️</button>
            <button class="action-btn danger-btn delete-survey-btn" title="Eliminar">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
  
  updatePagination(filteredSurveys.length);
  
  // Attach event listeners
  tbody.querySelectorAll(".view-results-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      const survey = filteredSurveys.find(s => s.id === row.dataset.surveyId);
      if (survey) openResultsModal(survey);
    });
  });
  
  tbody.querySelectorAll(".edit-survey-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      const survey = filteredSurveys.find(s => s.id === row.dataset.surveyId);
      if (survey) openSurveyModal(survey);
    });
  });
  
  tbody.querySelectorAll(".delete-survey-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      const survey = filteredSurveys.find(s => s.id === row.dataset.surveyId);
      if (survey) openDeleteModal(survey);
    });
  });
}

function updatePagination(total) {
  const totalPages = Math.ceil(total / pageSize);
  const pagination = document.querySelector("#surveys-pagination");
  const pageInfo = document.querySelector("#surveys-page-info");
  const prevBtn = pagination.querySelector('[data-page="prev"]');
  const nextBtn = pagination.querySelector('[data-page="next"]');
  
  if (totalPages > 1) {
    pagination.hidden = false;
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
  } else {
    pagination.hidden = true;
  }
}
 
function updateSurveysBadge() {
  const badge = document.querySelector("#surveys-badge");
  if (badge) badge.textContent = allSurveys.length;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ===== SURVEY MODAL (Create/Edit) =====
let editingSurveyId = null;
let editingSurveyActive = true;

function openSurveyModal(survey) {
  const modal = document.querySelector("#survey-modal");
  const title = document.querySelector("#survey-modal-title");
  const form = document.querySelector("#survey-modal-form");
  const questionInput = document.querySelector("#survey-modal-question");
  const startInput = document.querySelector("#survey-modal-start");
  const endInput = document.querySelector("#survey-modal-end");
  const startPicker = document.querySelector("#survey-modal-start-picker");
  const endPicker = document.querySelector("#survey-modal-end-picker");
  const targetCountrySelect = document.querySelector("#survey-modal-target-country");
  const targetProvinceSelect = document.querySelector("#survey-modal-target-province");
  const optionsContainer = document.querySelector("#survey-modal-options");
  const message = document.querySelector("#survey-modal-message");
  const hiddenId = document.querySelector("#survey-modal-id");
  
  form.reset();
  optionsContainer.innerHTML = `
    <label>Respuesta 1<input class="survey-option" type="text" required /></label>
    <label>Respuesta 2<input class="survey-option" type="text" required /></label>
  `;
  message.textContent = "";
  
  // Reset targeting selectors
  targetCountrySelect.value = "";
  targetProvinceSelect.value = "";
  targetProvinceSelect.disabled = true;
  
  if (survey) {
    editingSurveyId = survey.id;
    editingSurveyActive = survey.active ?? true;
    title.textContent = "Editar encuesta";
    hiddenId.value = survey.id;
    questionInput.value = survey.question;
    startInput.value = survey.startAt ? formatDateTimeForInput(survey.startAt) : "";
    endInput.value = survey.endAt ? formatDateTimeForInput(survey.endAt) : "";
    
    // Set targeting values
    if (survey.targetCountry) {
      targetCountrySelect.value = survey.targetCountry;
      targetProvinceSelect.disabled = false;
      if (survey.targetProvince) {
        targetProvinceSelect.value = survey.targetProvince;
      }
    }
    
    optionsContainer.innerHTML = survey.options.map((opt, i) => 
      `<label>Respuesta ${i + 1}<input class="survey-option" type="text" required value="${escapeHtml(opt)}" /></label>`
    ).join("");
  } else {
    editingSurveyId = null;
    editingSurveyActive = true;
    title.textContent = "Nueva encuesta";
    hiddenId.value = "";
  }
  
  // Update trigger displays
  updateTriggerDisplay(startInput);
  updateTriggerDisplay(endInput);
  
  // Init datetime pickers (remove old listeners first)
  const startTrigger = startPicker.querySelector(".datetime-picker-trigger");
  const endTrigger = endPicker.querySelector(".datetime-picker-trigger");
  const newStartTrigger = startTrigger.cloneNode(true);
  const newEndTrigger = endTrigger.cloneNode(true);
  startTrigger.parentNode.replaceChild(newStartTrigger, startTrigger);
  endTrigger.parentNode.replaceChild(newEndTrigger, endTrigger);
  
  newStartTrigger.addEventListener("click", () => openDateTimePicker(startInput, newStartTrigger));
  newEndTrigger.addEventListener("click", () => openDateTimePicker(endInput, newEndTrigger));
  
  // Country/province change handler
  const newCountrySelect = targetCountrySelect.cloneNode(true);
  targetCountrySelect.parentNode.replaceChild(newCountrySelect, targetCountrySelect);
  newCountrySelect.addEventListener("change", (e) => {
    const provinceSelect = document.querySelector("#survey-modal-target-province");
    if (e.target.value) {
      provinceSelect.disabled = false;
    } else {
      provinceSelect.disabled = true;
      provinceSelect.value = "";
    }
  });
  
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeSurveyModal() {
  editingSurveyId = null;
  const modal = document.querySelector("#survey-modal");
  const form = document.querySelector("#survey-modal-form");
  form.reset();
  updateTriggerDisplay(document.querySelector("#survey-modal-start"));
  updateTriggerDisplay(document.querySelector("#survey-modal-end"));
  modal.hidden = true;
  document.body.style.overflow = "";
}

document.querySelector("#survey-modal-add-option").addEventListener("click", () => {
  const optionsContainer = document.querySelector("#survey-modal-options");
  const optionCount = optionsContainer.querySelectorAll(".survey-option").length;
  if (optionCount >= 4) {
    document.querySelector("#survey-modal-message").textContent = "Una encuesta puede tener como máximo 4 respuestas.";
    return;
  }
  const label = document.createElement("label");
  label.innerHTML = `Respuesta ${optionCount + 1}<input class="survey-option" type="text" required />`;
  optionsContainer.append(label);
});

document.querySelector("#survey-modal-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = document.querySelector("#survey-modal-message");
  message.textContent = "Guardando...";
  
  const question = document.querySelector("#survey-modal-question").value.trim();
  const options = [...document.querySelectorAll("#survey-modal-options .survey-option")]
    .map(input => input.value.trim())
    .filter(Boolean);
  const startValue = document.querySelector("#survey-modal-start").value;
  const endValue = document.querySelector("#survey-modal-end").value;
  const targetCountry = document.querySelector("#survey-modal-target-country").value;
  const targetProvince = document.querySelector("#survey-modal-target-province").value;
  
  if (options.length < 2 || options.length > 4) {
    message.textContent = "Agrega entre 2 y 4 respuestas.";
    return;
  }
  
  if (startValue && endValue && new Date(startValue) >= new Date(endValue)) {
    message.textContent = "La fecha de inicio debe ser anterior a la de fin.";
    return;
  }
  
  // Validate province requires country
  if (targetProvince && !targetCountry) {
    message.textContent = "Debe seleccionar un país antes de elegir una provincia.";
    return;
  }
  
const surveyData = {
    question,
    options,
    active: editingSurveyActive,
    createdBy: ADMIN_EMAIL,
    updatedAt: serverTimestamp(),
  };
  
  if (editingSurveyId) {
    surveyData.targetCountry = targetCountry || deleteField();
    surveyData.targetProvince = targetProvince || deleteField();
  } else {
    if (targetCountry) surveyData.targetCountry = targetCountry;
    if (targetProvince) surveyData.targetProvince = targetProvince;
  }

  if (!editingSurveyId) {
    surveyData.createdAt = serverTimestamp();
  }

  if (startValue) surveyData.startAt = new Date(startValue);
  if (endValue) surveyData.endAt = new Date(endValue);
  
  try {
    if (editingSurveyId) {
      await updateDoc(doc(db, "surveys", editingSurveyId), surveyData);
      message.textContent = "Encuesta actualizada correctamente.";
    } else {
      await addDoc(collection(db, "surveys"), surveyData);
      message.textContent = "Encuesta creada correctamente.";
    }
    
    await loadSurveysTable();
    await loadSurveyResults();
    
    setTimeout(() => {
      closeSurveyModal();
    }, 1000);
  } catch (error) {
    console.error("Error saving survey:", error);
    message.textContent = error.code === "permission-denied"
      ? "Firestore rechazó la escritura. Revisa los permisos."
      : `Error: ${error.message}`;
  }
});

document.querySelector("#survey-modal").querySelector(".modal-backdrop").addEventListener("click", closeSurveyModal);
document.querySelector("#survey-modal-cancel").addEventListener("click", closeSurveyModal);

// Survey filters and sort
document.querySelector("#survey-status-filter").addEventListener("change", (e) => {
  currentStatusFilter = e.target.value;
  applyFiltersAndSort();
  renderSurveysTable();
});

document.querySelector("#survey-search").addEventListener("input", (e) => {
  currentSearch = e.target.value.trim();
  applyFiltersAndSort();
  renderSurveysTable();
});

document.querySelector("#survey-sort").addEventListener("change", (e) => {
  currentSort = e.target.value;
  applyFiltersAndSort();
  renderSurveysTable();
});

document.querySelector("#surveys-pagination").querySelector('[data-page="prev"]').addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderSurveysTable();
  }
});

document.querySelector("#surveys-pagination").querySelector('[data-page="next"]').addEventListener("click", () => {
  const totalPages = Math.ceil(filteredSurveys.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    renderSurveysTable();
  }
});

// New survey button
document.querySelector("#new-survey-btn").addEventListener("click", () => openSurveyModal(null));
