import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getDbInstance } from "./firebase.js";
import { formatDate, formatDateTime, escapeHtml, getSurveyStatus, getTargetingDisplay, showSkeleton } from "../modules/utils.js";
import { openResultsModal } from "../modules/results.js";

const db = getDbInstance();

export async function loadResultsView() {
  const container = document.querySelector("#results-content");
  showSkeleton(container, 3, "card");
  
  try {
    const snapshot = await getDocs(collection(db, "surveys"));
    const surveys = await Promise.all(snapshot.docs.map(async (surveyDoc) => {
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
        totalResponses: responsesSnapshot.size,
        counts: [...counts.entries()],
        targetCountry: data.targetCountry,
        targetProvince: data.targetProvince,
      };
    }));
    
    surveys.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
    
    if (surveys.length === 0) {
      container.innerHTML = '<p class="message">Todavía no hay encuestas publicadas.</p>';
      return;
    }
    
    const usersSnapshot = await getDocs(collection(db, "users"));
    const eligibleUsers = usersSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.publicProfile || data.profile;
    }).length;
    
    container.innerHTML = surveys.map(survey => {
      const status = getSurveyStatus(survey);
      const responseRate = eligibleUsers > 0 ? ((survey.totalResponses / eligibleUsers) * 100).toFixed(1) : 0;
      
      return `
        <article class="survey-result-card">
          <div class="survey-result-heading">
            <div>
              <h3>${escapeHtml(survey.question)}</h3>
              <small>${formatDate(survey.createdAt)}</small>
              <div class="survey-meta">
                <span class="survey-status-badge ${status.class}">${status.text}</span>
                ${survey.startAt ? `<span>Inicio: ${formatDateTime(survey.startAt)}</span>` : ""}
                ${survey.endAt ? `<span>Fin: ${formatDateTime(survey.endAt)}</span>` : ""}
              </div>
            </div>
            <div class="results-summary-mini">
              <span><strong>${survey.totalResponses}</strong> respuestas</span>
              <span><strong>${responseRate}%</strong> participación</span>
            </div>
          </div>
          
          <div class="results-chart">
            ${survey.options.map(opt => {
              const count = survey.counts.find(([k]) => k === opt)?.[1] || 0;
              const pct = survey.totalResponses > 0 ? (count / survey.totalResponses) * 100 : 0;
              return `
                <div class="result-bar">
                  <span class="result-bar-label">${escapeHtml(opt)}</span>
                  <div class="result-bar-track">
                    <div class="result-bar-fill" style="width: ${pct}%"></div>
                  </div>
                  <span class="result-bar-value">${count} (${pct.toFixed(1)}%)</span>
                </div>
              `;
            }).join("")}
          </div>
          
          <div class="survey-actions-row">
            <button class="secondary-button view-full-results-btn" data-survey-id="${survey.id}" type="button">
              Ver detalle completo
            </button>
          </div>
        </article>
      `;
    }).join("");
    
    container.querySelectorAll(".view-full-results-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const surveyId = e.target.dataset.surveyId;
        const survey = surveys.find(s => s.id === surveyId);
        if (survey) openResultsModal(survey);
      });
    });
    
  } catch (error) {
    console.error("[ErrorBoundary] loadResultsView:", error);
    container.innerHTML = `<p class="message error">Error al cargar: ${escapeHtml(error.message)}</p>`;
  }
}