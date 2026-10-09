import { collection, getDocs, doc, getDoc, query, orderBy, limit, getCountFromServer } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getDbInstance } from "./firebase.js";
import { formatDate, escapeHtml, showErrorBoundary, showSkeleton } from "./utils.js";

const db = getDbInstance();

let usersCache = [];
let filteredUsers = [];
let currentPage = 1;
const pageSize = 10;
let currentSearch = "";
let currentStatusFilter = "";
let listenersInitialized = false;

export async function loadUsersTable() {
  const tbody = document.querySelector("#users-tbody");
  const tableContainer = document.querySelector("#view-users .table-container");
  showSkeleton(tbody, 5, "table");
  
  setupUserSearchAndPagination();

  try {
    // Fast total user count using Firestore aggregation
    const countSnapshot = await getCountFromServer(collection(db, "users"));
    const totalCount = countSnapshot.data().count;
    updateUsersBadge(totalCount);

    // Fetch users with query limit to prevent loading entire database at once
    const usersQuery = query(collection(db, "users"), limit(100));
    const snapshot = await getDocs(usersQuery);
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    usersCache = users.filter(u => u.publicProfile || u.profile);
    applyUserFilters();
    renderUsersTable();
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

function applyUserFilters() {
  filteredUsers = usersCache.filter(user => {
    const profile = user.publicProfile || user.profile;
    const hasProfile = Boolean(profile);

    if (currentStatusFilter === "complete" && !hasProfile) return false;
    if (currentStatusFilter === "pending" && hasProfile) return false;

    if (currentStatusFilter === "recent") {
      const lastAliveMs = user.lastAliveAt ? (user.lastAliveAt.toMillis ? user.lastAliveAt.toMillis() : new Date(user.lastAliveAt).getTime()) : 0;
      const hoursDiff = (Date.now() - lastAliveMs) / (1000 * 60 * 60);
      if (lastAliveMs === 0 || hoursDiff > 24) return false;
    } else if (currentStatusFilter === "inactive") {
      const lastAliveMs = user.lastAliveAt ? (user.lastAliveAt.toMillis ? user.lastAliveAt.toMillis() : new Date(user.lastAliveAt).getTime()) : 0;
      const hoursDiff = (Date.now() - lastAliveMs) / (1000 * 60 * 60);
      if (lastAliveMs === 0 || hoursDiff <= 24 || hoursDiff > 48) return false;
    } else if (currentStatusFilter === "critical") {
      const lastAliveMs = user.lastAliveAt ? (user.lastAliveAt.toMillis ? user.lastAliveAt.toMillis() : new Date(user.lastAliveAt).getTime()) : 0;
      const hoursDiff = (Date.now() - lastAliveMs) / (1000 * 60 * 60);
      if (lastAliveMs > 0 && hoursDiff <= 48) return false;
    }

    if (!currentSearch) return true;
    const name = (profile?.fullName || "").toLowerCase();
    const email = (user.emailNormalized || user.email || profile?.email || "").toLowerCase();
    const search = currentSearch.toLowerCase();
    return name.includes(search) || email.includes(search);
  });
  currentPage = 1;
}

function renderUsersTable() {
  const tbody = document.querySelector("#users-tbody");
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageUsers = filteredUsers.slice(start, end);

  if (pageUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">No se encontraron usuarios.</td></tr>';
    updateUsersPagination(0);
    return;
  }
  
  tbody.innerHTML = pageUsers.map(user => {
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
      const user = filteredUsers.find(u => u.id === row.dataset.userId);
      if (user) openUserModal(user);
    });
  });

  updateUsersPagination(filteredUsers.length);
}

function updateUsersPagination(total) {
  const totalPages = Math.ceil(total / pageSize);
  const pagination = document.querySelector("#users-pagination");
  const pageInfo = document.querySelector("#users-page-info");
  const prevBtn = pagination?.querySelector('[data-page="prev"]');
  const nextBtn = pagination?.querySelector('[data-page="next"]');

  if (!pagination) return;

  if (totalPages > 1) {
    pagination.hidden = false;
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
  } else {
    pagination.hidden = true;
  }
}

function setupUserSearchAndPagination() {
  if (listenersInitialized) return;
  listenersInitialized = true;

  const statusSelect = document.querySelector("#user-status-filter");
  if (statusSelect) {
    statusSelect.addEventListener("change", (e) => {
      currentStatusFilter = e.target.value;
      applyUserFilters();
      renderUsersTable();
    });
  }

  const searchInput = document.querySelector("#user-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value.trim();
      applyUserFilters();
      renderUsersTable();
    });
  }

  const pagination = document.querySelector("#users-pagination");
  if (pagination) {
    const prevBtn = pagination.querySelector('[data-page="prev"]');
    const nextBtn = pagination.querySelector('[data-page="next"]');

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage--;
          renderUsersTable();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        const totalPages = Math.ceil(filteredUsers.length / pageSize);
        if (currentPage < totalPages) {
          currentPage++;
          renderUsersTable();
        }
      });
    }
  }
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
      // Check response count first before querying specific user document
      const countSnapshot = await getCountFromServer(collection(db, "surveys", surveyDoc.id, "responses"));
      if (countSnapshot.data().count === 0) return null;

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
