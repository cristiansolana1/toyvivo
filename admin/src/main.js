import { initFirebase } from "./modules/firebase.js";
import { loadDashboard } from "./modules/views/dashboard.js";
import { loadUsersView } from "./modules/views/users.js";
import { loadSurveysView } from "./modules/views/surveys.js";
import { loadResultsView } from "./modules/resultsView.js";
import { setupSurveyModal, closeSurveyModal } from "./modules/surveyModal.js";
import { setupDeleteModal, openDeleteModal, closeDeleteModal } from "./modules/surveys.js";
import { setupResultsModal, openResultsModal, closeResultsModal } from "./modules/results.js";
import { closeUserModal } from "./modules/users.js";
import { initDateTimePicker, updateTriggerDisplay } from "./modules/datetimePicker.js";
import { formatDate, escapeHtml, showErrorBoundary } from "./modules/utils.js";
import { setupLoginPage } from "./pages/login.js";
import { setupDashboardPage } from "./pages/dashboard.js";

const dashboardMessage = document.querySelector("#dashboard-message");

// Main survey form elements
const surveyForm = document.querySelector("#survey-form");
const surveyOptions = document.querySelector("#survey-options");
const addOptionButton = document.querySelector("#add-option-button");
const surveyMessage = document.querySelector("#survey-message");
const surveyResults = document.querySelector("#survey-results");
const surveyStart = document.querySelector("#survey-start");
const surveyEnd = document.querySelector("#survey-end");

// Initialize Firebase when config is available
function initApp() {
  if (window.FIREBASE_CONFIG) {
    initFirebase(window.FIREBASE_CONFIG);
    setupEventListeners();
    setupSidebarNavigation();
    setupModals();
    setupMainSurveyForm();
    setupLoginPage();
    setupDashboardPage();
  } else {
    // Wait for firebase-config.js to load
    setTimeout(initApp, 50);
  }
}

function setupEventListeners() {
  // Add option button (main form)
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
  
  // Main survey form submit
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
      createdBy: "cristiansolana1@gmail.com",
    };

    if (startValue) surveyData.startAt = new Date(startValue);
    if (endValue) surveyData.endAt = new Date(endValue);

    try {
      const { addDoc, collection, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js");
      const { getDbInstance } = await import("./modules/firebase.js");
      const db = getDbInstance();
      
      await addDoc(collection(db, "surveys"), surveyData);
      surveyForm.reset();
      updateTriggerDisplay(surveyStart);
      updateTriggerDisplay(surveyEnd);
      surveyMessage.textContent = "Encuesta publicada correctamente.";
      await loadDashboard();
    } catch (error) {
      surveyMessage.textContent = error.code === "permission-denied"
        ? "Firestore rechazó la escritura. Publica la regla create de surveys para el administrador."
        : `No se pudo publicar (${error.code ?? "error desconocido"}).`;
    }
  });
}

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
      loadSurveysView();
    } else if (viewName === "users") {
      loadUsersView();
    } else if (viewName === "results") {
      loadResultsView();
    } else if (viewName === "dashboard") {
      loadDashboard();
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
  
  sidebarLinks.forEach(link => {
    link.addEventListener("click", () => {
      sidebar.classList.remove("open");
      backdrop.classList.remove("open");
    });
  });
}

function setupModals() {
  setupSurveyModal();
  setupDeleteModal();
  setupResultsModal();
  
  // Close modals on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!document.querySelector("#delete-modal").hidden) closeDeleteModal();
      if (!document.querySelector("#results-modal").hidden) closeResultsModal();
      if (!document.querySelector("#survey-modal").hidden) closeSurveyModal();
      if (!document.querySelector("#user-modal").hidden) closeUserModal();
    }
  });
  
  // User modal close
  document.querySelector("#user-modal-close").addEventListener("click", closeUserModal);
  document.querySelector("#user-modal").querySelector(".modal-backdrop").addEventListener("click", closeUserModal);
}

function setupMainSurveyForm() {
  initDateTimePicker("#survey-start-picker", "#survey-start");
  initDateTimePicker("#survey-end-picker", "#survey-end");
  updateTriggerDisplay(surveyStart);
  updateTriggerDisplay(surveyEnd);
}

// Initialize app
initApp();

// Export functions for inline onclick handlers
window.loadDashboard = loadDashboard;
window.loadSurveysTable = async () => (await import("./modules/surveys.js")).loadSurveysTable();
window.loadUsersTable = async () => (await import("./modules/users.js")).loadUsersTable();
window.loadResultsView = loadResultsView;
window.openResultsModal = openResultsModal;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.closeResultsModal = closeResultsModal;
window.closeSurveyModal = async () => (await import("./modules/surveyModal.js")).closeSurveyModal();
window.closeUserModal = closeUserModal;
window.retryLoad = () => loadDashboard();