import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getDbInstance } from "../modules/firebase.js";
import { showErrorBoundary } from "../modules/utils.js";

const db = getDbInstance();

// Province codes and labels for Argentina
const PROVINCES_AR = [
  { code: "BA", label: "Buenos Aires", lat: -34.6037, lng: -58.3816 },
  { code: "CABA", label: "CABA", lat: -34.6037, lng: -58.3816 },
  { code: "CT", label: "Catamarca", lat: -28.4696, lng: -65.7852 },
  { code: "CH", label: "Chaco", lat: -27.4514, lng: -58.9867 },
  { code: "CU", label: "Chubut", lat: -43.2944, lng: -65.3057 },
  { code: "CB", label: "Córdoba", lat: -31.4201, lng: -64.1888 },
  { code: "CR", label: "Corrientes", lat: -27.4692, lng: -58.8306 },
  { code: "ER", label: "Entre Ríos", lat: -31.7353, lng: -60.5227 },
  { code: "FO", label: "Formosa", lat: -26.1775, lng: -58.1781 },
  { code: "JY", label: "Jujuy", lat: -24.1858, lng: -65.2995 },
  { code: "LP", label: "La Pampa", lat: -36.6168, lng: -64.2833 },
  { code: "LR", label: "La Rioja", lat: -29.4111, lng: -66.8507 },
  { code: "MZ", label: "Mendoza", lat: -32.8895, lng: -68.8458 },
  { code: "MI", label: "Misiones", lat: -27.3671, lng: -55.8967 },
  { code: "NQ", label: "Neuquén", lat: -38.9516, lng: -68.0591 },
  { code: "RN", label: "Río Negro", lat: -40.8135, lng: -63.0000 },
  { code: "SA", label: "Salta", lat: -24.7859, lng: -65.4117 },
  { code: "SJ", label: "San Juan", lat: -31.5375, lng: -68.5364 },
  { code: "SL", label: "San Luis", lat: -33.2993, lng: -66.3350 },
  { code: "SC", label: "Santa Cruz", lat: -50.0165, lng: -68.5245 },
  { code: "SF", label: "Santa Fe", lat: -31.6333, lng: -60.7000 },
  { code: "SE", label: "Santiago del Estero", lat: -27.7951, lng: -64.2615 },
  { code: "TF", label: "Tierra del Fuego", lat: -54.8019, lng: -68.3030 },
  { code: "TM", label: "Tucumán", lat: -26.8241, lng: -65.2226 },
];

// Color scale for heatmap
const HEATMAP_COLORS = [
  { min: 0, max: 0, color: "#e8f4ef", label: "0 usuarios" },
  { min: 1, max: 10, color: "#a8d5ba", label: "1–10" },
  { min: 11, max: 50, color: "#5bb87a", label: "11–50" },
  { min: 51, max: 100, color: "#2d8a4e", label: "51–100" },
  { min: 101, max: Infinity, color: "#1a5c2e", label: "100+" },
];

function getColorForCount(count) {
  const range = HEATMAP_COLORS.find(r => count >= r.min && count <= r.max);
  return range ? range.color : HEATMAP_COLORS[0].color;
}

export async function loadGeoHeatmap() {
  const container = document.querySelector("#geo-heatmap");
  if (!container) return;

  try {
    const snapshot = await getDocs(collection(db, "users"));
    
    // Count users by province
    const provinceCounts = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const profile = data.publicProfile || data.profile;
      if (profile?.province) {
        const province = profile.province;
        provinceCounts[province] = (provinceCounts[province] || 0) + 1;
      }
    });

    renderGeoHeatmap(container, provinceCounts);
    
  } catch (error) {
    console.error("[GeoHeatmap] Error loading:", error);
    showErrorBoundary(container, error, `
      <div class="error-boundary">
        <div class="error-boundary-icon">🗺️</div>
        <h3>Error al cargar mapa</h3>
        <p>${error.message}</p>
        <button class="secondary-button" onclick="window.loadGeoHeatmap?.()">Reintentar</button>
      </div>
    `);
  }
}

function renderGeoHeatmap(container, provinceCounts) {
  const totalUsers = Object.values(provinceCounts).reduce((a, b) => a + b, 0);
  const provincesWithData = Object.keys(provinceCounts).length;

  // Sort provinces by count (descending)
  const sortedProvinces = PROVINCES_AR
    .map(p => ({
      ...p,
      count: provinceCounts[p.code] || 0
    }))
    .sort((a, b) => b.count - a.count);

  container.innerHTML = `
    <div class="geo-heatmap-summary">
      <div class="geo-summary-item">
        <span class="geo-summary-value">${totalUsers}</span>
        <span class="geo-summary-label">Total usuarios</span>
      </div>
      <div class="geo-summary-item">
        <span class="geo-summary-value">${provincesWithData}</span>
        <span class="geo-summary-label">Provincias con usuarios</span>
      </div>
      <div class="geo-summary-item">
        <span class="geo-summary-value">${totalUsers > 0 ? Math.round(totalUsers / provincesWithData) : 0}</span>
        <span class="geo-summary-label">Promedio por provincia</span>
      </div>
    </div>
    
    <div class="geo-heatmap-grid">
      ${sortedProvinces.map(province => {
        const color = getColorForCount(province.count);
        return `
          <div class="geo-province-card" style="--province-color: ${color};" title="${province.label}: ${province.count} usuario${province.count !== 1 ? 's' : ''}">
            <div class="geo-province-name">${province.label}</div>
            <div class="geo-province-count">${province.count}</div>
            <div class="geo-province-bar" style="background: ${color}; width: ${Math.min((province.count / Math.max(1, ...Object.values(provinceCounts))) * 100, 100)}%"></div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

window.loadGeoHeatmap = loadGeoHeatmap;