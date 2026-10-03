import { 
  collection, getDocs, doc, updateDoc, deleteDoc, addDoc, 
  query, orderBy, writeBatch, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getDbInstance } from "./firebase.js";
import { 
  formatDate, formatDateTime, escapeHtml, showErrorBoundary, 
  showSkeleton, getSurveyStatus, getTargetingDisplay, PROVINCES_AR 
} from "./utils.js";

const db = getDbInstance();
const ADMIN_EMAIL = "cristiansolana1@gmail.com";

let allSurveys = [];
let filteredSurveys = [];
let currentPage = 1;
const pageSize = 10;
let currentSort = "createdAt-desc";
let currentStatusFilter = "";
let currentSearch = "";

export async function loadSurveysTable() {
  const tbody = document.querySelector("#surveys-tbody");
  const tableContainer = document.querySelector(".table-container");
  showSkeleton(tbody, 5, "table");
  
  try {
    const snapshot = await getDocs(collection(db, "surveys"));
    allSurveys = await Promise.all(snapshot.docs.map(async (surveyDoc) => {
      const data = surveyDoc.data();
      const responsesSnapshot = await getDocs(collection(db, "surveys", surveyDoc.id, "responses"));
      const counts = new Map((Array.isArray(data.options) ? data.options : []).map((option) => [option, 0]));
      
      responsesSnapshot.docs.forEach((responseDoc) => {
        const answer = responseDoc.data().answer;
        if (counts.has(answer)) {
          counts.set(answer, counts.get(answer) + 1);
        }
      });
      
      return {
        id: surveyDoc.id,
        question: data.question ?? "Encuesta sin pregunta",
        options: data.options ?? [],
        active: data.active ?? true,
        startAt: data.startAt,
        endAt: data.endAt,
        createdAt: data.createdAt,
        createdBy: data.createdBy,
        targetCountry: data.targetCountry,
        targetProvince: data.targetProvince,
        totalResponses: responsesSnapshot.size,
        counts: [...counts.entries()],
      };
    }));
    
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
        <button class="secondary-button" onclick="window.loadSurveysTable?.()">Reintentar</button>
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
    const targetingText = getTargetingDisplay(survey);
    
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

export function setupSurveyFilters() {
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
}

export function updateSurveysBadge() {
  const badge = document.querySelector("#surveys-badge");
  if (badge) badge.textContent = allSurveys.length;
}

export function getAllSurveys() {
  return allSurveys;
}

export function getFilteredSurveys() {
  return filteredSurveys;
}

// ===== DELETE MODAL =====

let surveyToDelete = null;

export function openDeleteModal(survey) {
  surveyToDelete = survey;
  const message = document.querySelector("#delete-modal-message");
  message.textContent = `¿Eliminar "${survey.question}"? Se borrarán ${survey.totalResponses} respuesta${survey.totalResponses === 1 ? "" : "s"} y la encuesta. Esta acción no se puede deshacer.`;
  document.querySelector("#delete-modal").hidden = false;
  document.body.style.overflow = "hidden";
}

export function closeDeleteModal() {
  surveyToDelete = null;
  document.querySelector("#delete-modal").hidden = true;
  document.body.style.overflow = "";
}

export async function confirmDeleteSurvey() {
  if (!surveyToDelete) return;

  const confirmBtn = document.querySelector("#delete-modal-confirm");
  confirmBtn.disabled = true;
  confirmBtn.textContent = "Eliminando...";

  try {
    const responsesSnapshot = await getDocs(collection(db, "surveys", surveyToDelete.id, "responses"));
    const batch = writeBatch(db);

    responsesSnapshot.docs.forEach((responseDoc) => {
      batch.delete(responseDoc.ref);
    });

    batch.delete(doc(db, "surveys", surveyToDelete.id));
    await batch.commit();

    closeDeleteModal();
    await loadSurveysTable();
    await loadSurveyResults();
  } catch (error) {
    console.error("Error deleting survey:", error);
    alert("Error al eliminar: " + error.message);
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Eliminar";
  }
}

export function setupDeleteModal() {
  document.querySelector("#delete-modal-cancel").addEventListener("click", closeDeleteModal);
  document.querySelector("#delete-modal-confirm").addEventListener("click", confirmDeleteSurvey);
  document.querySelector("#delete-modal").querySelector(".modal-backdrop").addEventListener("click", closeDeleteModal);
}