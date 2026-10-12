import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getDbInstance } from "../modules/firebase.js";
import { showErrorBoundary, getProvinceLabel, PROVINCES_AR } from "../modules/utils.js";

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
      count: provinceCounts[p.code] || provinceCounts[p.label] || 0
    }))
    .sort((a, b) => b.count - a.count);

  container.innerHTML = `
    <div class="geo-heatmap-summary">
      <div class="geo-summary-item">
        <span class="geo-summary-value">${totalUsers}</span>
        <span class="geo-summary-label">Total usuarios registrados</span>
      </div>
      <div class="geo-summary-item">
        <span class="geo-summary-value">${provincesWithData}</span>
        <span class="geo-summary-label">Provincias representadas</span>
      </div>
      <div class="geo-summary-item">
        <span class="geo-summary-value">${totalUsers > 0 ? (totalUsers / Math.max(1, provincesWithData)).toFixed(1) : 0}</span>
        <span class="geo-summary-label">Promedio por provincia</span>
      </div>
    </div>
    
    <div class="geo-heatmap-grid">
      ${sortedProvinces.map(province => {
        const color = getColorForCount(province.count);
        const pct = totalUsers > 0 ? ((province.count / totalUsers) * 100).toFixed(1) : "0.0";
        return `
          <div class="geo-province-card clickable-province" data-province-code="${province.code}" data-province-label="${province.label}" style="--province-color: ${color}; cursor: pointer;" title="Ver usuarios de ${province.label}: ${province.count} usuario${province.count !== 1 ? 's' : ''} (${pct}%)">
            <div class="geo-province-name">${province.label}</div>
            <div class="geo-province-count">${province.count} <small style="font-size: 13px; color: #6e8279; font-weight: normal;">(${pct}%)</small></div>
            <div class="geo-province-bar" style="background: ${color}; width: ${Math.min((province.count / Math.max(1, ...Object.values(provinceCounts))) * 100, 100)}%"></div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  container.querySelectorAll(".clickable-province").forEach(card => {
    card.addEventListener("click", () => {
      const provinceLabel = card.dataset.provinceLabel;
      const provinceCode = card.dataset.provinceCode;

      const usersLink = document.querySelector('.sidebar-link[data-view="users"]');
      if (usersLink) {
        usersLink.click();
      }

      window.filterUsersByProvince?.(provinceLabel, provinceCode);
    });
  });
}

window.loadGeoHeatmap = loadGeoHeatmap;