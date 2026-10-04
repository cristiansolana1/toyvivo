import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getDbInstance } from "../../modules/firebase.js";
import { formatDate, showSkeleton } from "../../modules/utils.js";
import { loadSurveyResults } from "../../modules/surveyResults.js";
import { loadGeoHeatmap } from "../../modules/geoHeatmap.js";

const db = getDbInstance();

export async function loadDashboard() {
  const dashboardMessage = document.querySelector("#dashboard-message");
  const userCount = document.querySelector("#user-count");
  const latestUser = document.querySelector("#latest-user");
  
  if (!dashboardMessage || !userCount || !latestUser) {
    console.warn("[Dashboard] Required DOM elements not found, retrying...");
    return;
  }
  
  dashboardMessage.textContent = "Actualizando datos...";
  
  try {
    const snapshot = await getDocs(collection(db, "users"));
    
    const usersWithProfile = snapshot.docs.filter(doc => {
      const data = doc.data();
      return data.publicProfile || data.profile;
    });
    userCount.textContent = usersWithProfile.length;

    const latest = snapshot.docs
      .map((userDoc) => ({ id: userDoc.id, ...userDoc.data() }))
      .filter((userData) => userData.lastAliveAt)
      .sort((a, b) => b.lastAliveAt.toMillis() - a.lastAliveAt.toMillis())[0];

    if (!latest) {
      latestUser.innerHTML = "Sin avisos registrados<small>Ningún usuario ha pulsado “Estoy bien” todavía.</small>";
    } else {
      const name = latest.publicProfile?.fullName ?? latest.profile?.fullName ?? "Usuario sin Cuenta";
      latestUser.innerHTML = `${name}<small>${formatDate(latest.lastAliveAt)}</small>`;
    }
    
    await Promise.all([
      loadSurveyResults(),
      loadGeoHeatmap()
    ]);
    
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