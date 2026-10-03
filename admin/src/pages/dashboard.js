import { onAuthStateChange, signOutAdmin } from "../modules/auth.js";
import { loadDashboard } from "../modules/views/dashboard.js";

export function setupDashboardPage() {
  const loginView = document.querySelector("#login-view");
  const loginError = document.querySelector("#login-error");
  const dashboardView = document.querySelector("#dashboard-view");
  const dashboardMessage = document.querySelector("#dashboard-message");
  const refreshButton = document.querySelector("#refresh-button");
  const logoutButton = document.querySelector("#logout-button");

  refreshButton.addEventListener("click", () => {
    void loadDashboard().catch(() => {
      dashboardMessage.textContent = "No se pudieron cargar los datos. Revisa los permisos de Firestore.";
    });
  });

  logoutButton.addEventListener("click", () => {
    void signOutAdmin().catch((error) => {
      dashboardMessage.textContent = `No se pudo cerrar sesión: ${error.message}`;
    });
  });

  return onAuthStateChange(async (user, error) => {
    if (error) {
      loginView.hidden = false;
      dashboardView.hidden = true;
      loginError.textContent = error;
      return;
    }

    loginError.textContent = "";
    loginView.hidden = Boolean(user);
    dashboardView.hidden = !user;
    logoutButton.hidden = !user;
    if (!user) return;

    document.querySelectorAll(".view-content").forEach((view) => {
      view.hidden = view.id !== "view-dashboard";
    });
    document.querySelectorAll(".sidebar-link[data-view]").forEach((link) => {
      link.classList.toggle("active", link.dataset.view === "dashboard");
    });

    try {
      await loadDashboard();
    } catch (loadError) {
      console.error("[Admin] Error loading dashboard:", loadError);
      dashboardMessage.textContent = "No se pudieron cargar los datos. Revisa los permisos de Firestore.";
    }
  });
}