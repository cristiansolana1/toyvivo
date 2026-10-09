import { initFirebase } from "./modules/firebase.js";
import { loadDashboard } from "./modules/views/dashboard.js";
import { loadUsersView } from "./modules/views/users.js";
import { loadSurveysView } from "./modules/views/surveys.js";
import { loadResultsView } from "./modules/resultsView.js";
import { setupSurveyModal, closeSurveyModal } from "./modules/surveyModal.js";
import { setupDeleteModal, openDeleteModal, closeDeleteModal, loadSurveysTable } from "./modules/surveys.js";
import { setupResultsModal, openResultsModal, closeResultsModal } from "./modules/results.js";
import { closeUserModal, loadUsersTable } from "./modules/users.js";
import { initDateTimePicker, updateTriggerDisplay } from "./modules/datetimePicker.js";
import { formatDate, escapeHtml, showErrorBoundary } from "./modules/utils.js";
import { setupLoginPage } from "./pages/login.js";
import { setupDashboardPage } from "./pages/dashboard.js";

// Initialize Firebase when config is available
function initApp() {
  if (window.FIREBASE_CONFIG) {
    initFirebase(window.FIREBASE_CONFIG);
    setupSidebarNavigation();
    setupModals();
    setupLoginPage();
    setupDashboardPage();
  } else {
    // Wait for firebase-config.js to load
    setTimeout(initApp, 50);
  }
}

let sidebarInitialized = false;

function setupSidebarNavigation() {
  if (sidebarInitialized) return;
  sidebarInitialized = true;

  const sidebarLinks = document.querySelectorAll(".sidebar-link[data-view]");
  const views = document.querySelectorAll(".view-content");
  const viewTitle = document.querySelector("#view-title");
  const viewSubtitle = document.querySelector("#view-subtitle");
  
  const viewLabels = {
    dashboard: { title: "Resumen de actividad", subtitle: "Panel de supervisión" },
    users: { title: "Gestión de Usuarios", subtitle: "Administra los usuarios registrados" },
    surveys: { title: "Gestión de Encuestas", subtitle: "Crea y administra las encuestas" },
    results: { title: "Resultados Detallados", subtitle: "Analiza las respuestas de cada encuesta" }
  };
  
  async function switchView(viewName) {
    views.forEach(v => v.hidden = true);
    const targetView = document.querySelector(`#view-${viewName}`);
    if (targetView) targetView.hidden = false;
    
    sidebarLinks.forEach(link => {
      link.classList.toggle("active", link.dataset.view === viewName);
    });
    
    const labels = viewLabels[viewName] || viewLabels.dashboard;
    if (viewTitle) viewTitle.textContent = labels.title;
    if (viewSubtitle) viewSubtitle.textContent = labels.subtitle;
    
    // Load data for specific views with error safety
    try {
      if (viewName === "surveys") {
        await loadSurveysView();
      } else if (viewName === "users") {
        await loadUsersView();
      } else if (viewName === "results") {
        await loadResultsView();
      } else if (viewName === "dashboard") {
        await loadDashboard();
      }
    } catch (err) {
      console.error(`[Navigation] Error loading view ${viewName}:`, err);
    }
  }
  
  sidebarLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const viewName = link.dataset.view;
      if (viewName) {
        void switchView(viewName);
      }
    });
  });
  
  // Mobile menu toggle
  const sidebar = document.querySelector("#sidebar");
  const topbar = document.querySelector(".topbar");
  if (sidebar && topbar && !document.querySelector(".mobile-menu-btn")) {
    const mobileMenuBtn = document.createElement("button");
    mobileMenuBtn.className = "mobile-menu-btn";
    mobileMenuBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    mobileMenuBtn.style.display = "none";
    mobileMenuBtn.setAttribute("aria-label", "Abrir menú");
    topbar.prepend(mobileMenuBtn);

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

// Initialize app
initApp();

// Export functions for inline onclick handlers
window.loadDashboard = loadDashboard;
window.loadSurveysTable = loadSurveysTable;
window.loadUsersTable = loadUsersTable;
window.loadResultsView = loadResultsView;
window.openResultsModal = openResultsModal;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.closeResultsModal = closeResultsModal;
window.closeSurveyModal = closeSurveyModal;
window.closeUserModal = closeUserModal;
window.retryLoad = () => loadDashboard();