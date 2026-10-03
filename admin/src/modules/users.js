import { collection, getDocs, doc, getDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getDbInstance } from "./firebase.js";
import { formatDate, escapeHtml, showErrorBoundary, showSkeleton } from "./utils.js";

const db = getDbInstance();

let usersCache = [];

export async function loadUsersTable() {
  const tbody = document.querySelector("#users-tbody");
  const tableContainer = document.querySelector("#view-users .table-container");
  showSkeleton(tbody, 5, "table");
  
  try {
    const snapshot = await getDocs(collection(db, "users"));
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    usersCache = users.filter(u => u.publicProfile || u.profile);
    
    renderUsersTable(usersCache);
    updateUsersBadge(usersCache.length);
  } catch (error) {
    console.error("[ErrorBoundary] loadUsersTable:", error);
    showErrorBoundary(tableContainer || tbody, error, `
      <div class="error-boundary">
        <div class="error-boundary-icon">👥</div>
        <h3>Error al cargar usuarios</h3>
        <p>${escapeHtml(error.message)}</p>
        <button class="secondary-button" onclick="window.loadUsersTable?.()">Reintentar</button>
      </div>
    `);
  }
}

function renderUsersTable(users) {
  const tbody = document.querySelector("#users-tbody");
  
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">No hay usuarios registrados.</td></tr>';
    return;
  }
  
  tbody.innerHTML = users.map(user => {
    const profile = user.publicProfile || user.profile;
    const name = profile?.fullName || "Sin nombre";
    const email = user.emailNormalized || user.email || profile?.email || "Sin email";
    const lastAlive = user.lastAliveAt ? formatDate(user.lastAliveAt) : "Nunca";
    const hasProfile = profile ? "Completo" : "Pendiente";
    
    return `
      <tr data-user-id="${user.id}">
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
  
  tbody.querySelectorAll(".view-user-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      const user = users.find(u => u.id === row.dataset.userId);
      if (user) openUserModal(user);
    });
  });
}

function updateUsersBadge(count) {
  const badge = document.querySelector("#users-badge");
  if (badge) badge.textContent = count;
}

export async function openUserModal(user) {
  const modal = document.querySelector("#user-modal");
  const title = document.querySelector("#user-modal-title");
  const content = document.querySelector("#user-modal-content");
  
  const profile = user.publicProfile || user.profile || {};
  
  showSkeleton(content, 3, "card");
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  
  try {
    const surveysSnapshot = await getDocs(collection(db, "surveys"));
    const userResponses = (await Promise.all(surveysSnapshot.docs.map(async (surveyDoc) => {
      const responseDoc = await getDoc(doc(db, "surveys", surveyDoc.id, "responses", user.id));
      if (!responseDoc.exists()) return null;

      const data = surveyDoc.data();
      const response = responseDoc.data();
      return {
        question: data.question,
        answer: response.answer,
        answeredAt: response.answeredAt
      };
    }))).filter(Boolean);
    
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
    content.innerHTML = `<p class="message error">Error: ${escapeHtml(error.message)}</p>`;
  }
}

export function closeUserModal() {
  const modal = document.querySelector("#user-modal");
  modal.hidden = true;
  document.body.style.overflow = "";
}