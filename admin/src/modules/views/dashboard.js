import { collection, getDocs, getCountFromServer, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
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
    // Fast count using Firestore aggregation
    const countSnapshot = await getCountFromServer(collection(db, "users"));
    userCount.textContent = countSnapshot.data().count;

    // Fast single-doc fetch for the latest heartbeat
    const latestQuery = query(collection(db, "users"), orderBy("lastAliveAt", "desc"), limit(1));
    const latestSnapshot = await getDocs(latestQuery);
    const latestDoc = latestSnapshot.docs[0];

    if (!latestDoc || !latestDoc.data().lastAliveAt) {
      latestUser.innerHTML = "Sin avisos registrados<small>Ningún usuario ha pulsado “Estoy bien” todavía.</small>";
    } else {
      const latestData = latestDoc.data();
      const name = latestData.publicProfile?.fullName ?? latestData.profile?.fullName ?? "Usuario sin Cuenta";
      latestUser.innerHTML = `${name}<small>${formatDate(latestData.lastAliveAt)}</small>`;
    }

    // Inactivity warning thresholds calculation
    const allUsersSnapshot = await getDocs(collection(db, "users"));
    const now = Date.now();
    let inactive24h = 0;
    let critical48h = 0;

    allUsersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const lastAlive = data.lastAliveAt;
      if (!lastAlive) {
        critical48h++;
        return;
      }
      const millis = lastAlive.toMillis ? lastAlive.toMillis() : new Date(lastAlive).getTime();
      const hoursDiff = (now - millis) / (1000 * 60 * 60);
      if (hoursDiff > 48) {
        critical48h++;
      } else if (hoursDiff > 24) {
        inactive24h++;
      }
    });

    const criticalCountEl = document.querySelector("#critical-count");
    const inactive24hEl = document.querySelector("#inactive-24h-count");
    if (criticalCountEl) criticalCountEl.textContent = critical48h;
    if (inactive24hEl) inactive24hEl.textContent = `${inactive24h} usuarios sin actividad en 24h–48h`;

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