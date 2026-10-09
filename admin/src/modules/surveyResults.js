import { collection, getDocs, doc, updateDoc, query, orderBy, getCountFromServer } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getDbInstance } from "./firebase.js";
import { formatDate, formatDateTime, escapeHtml, getSurveyStatus, showSkeleton, showErrorBoundary } from "./utils.js";

export async function loadSurveyResults() {
  const db = getDbInstance();
  const surveyResults = document.querySelector("#survey-results");
  const dashboardMessage = document.querySelector("#dashboard-message");
  showSkeleton(surveyResults, 3, "card");
  
  try {
    const snapshot = await getDocs(collection(db, "surveys"));
    const surveys = await Promise.all(snapshot.docs.map(async (surveyDoc) => {
      const data = surveyDoc.data();
      const countSnapshot = await getCountFromServer(collection(db, "surveys", surveyDoc.id, "responses"));
      const totalResponses = countSnapshot.data().count;
      const counts = new Map((Array.isArray(data.options) ? data.options : []).map((option) => [option, 0]));

      if (totalResponses > 0) {
        const responsesSnapshot = await getDocs(collection(db, "surveys", surveyDoc.id, "responses"));
        responsesSnapshot.docs.forEach((responseDoc) => {
          const answer = responseDoc.data().answer;
          if (counts.has(answer)) {
            counts.set(answer, counts.get(answer) + 1);
          }
        });
      }

      return {
        id: surveyDoc.id,
        question: data.question ?? "Encuesta sin pregunta",
        options: data.options ?? [],
        active: data.active ?? true,
        startAt: data.startAt,
        endAt: data.endAt,
        createdAt: data.createdAt,
        totalResponses,
        counts: [...counts.entries()],
      };
    }));

    surveys.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
    surveyResults.replaceChildren();

    if (surveys.length === 0) {
      surveyResults.innerHTML = '<p class="message">Todavía no hay encuestas publicadas.</p>';
      return;
    }

    surveys.forEach((survey) => {
      const status = getSurveyStatus(survey);
      const card = document.createElement("article");
      card.className = "survey-result-card";
      
      const heading = document.createElement("div");
      heading.className = "survey-result-heading";
      heading.innerHTML = `
        <div>
          <h3></h3>
          <small></small>
          <div class="survey-meta">
            <span class="survey-status-badge ${status.class}">${status.text}</span>
            ${survey.startAt ? `<span>Inicio: ${formatDateTime(survey.startAt)}</span>` : ""}
            ${survey.endAt ? `<span>Fin: ${formatDateTime(survey.endAt)}</span>` : ""}
          </div>
        </div>
        <strong>${survey.totalResponses} respuesta${survey.totalResponses === 1 ? "" : "s"}</strong>
      `;
      heading.querySelector("h3").textContent = survey.question;
      heading.querySelector("small").textContent = formatDate(survey.createdAt);
      card.append(heading);

      // Toggle active button
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "survey-actions-row";
      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = survey.active ? "secondary-button" : "text-button";
      toggleBtn.textContent = survey.active ? "Desactivar" : "Activar";
      toggleBtn.addEventListener("click", async () => {
        try {
          await updateDoc(doc(db, "surveys", survey.id), { active: !survey.active });
          await loadSurveyResults();
        } catch (error) {
          console.error("Error toggling survey:", error);
          alert("Error al cambiar estado: " + error.message);
        }
      });
      actionsDiv.append(toggleBtn);

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "text-button danger";
      deleteBtn.textContent = "Eliminar";
      deleteBtn.style.marginLeft = "8px";
      deleteBtn.addEventListener("click", () => openDeleteModal(survey));
      actionsDiv.append(deleteBtn);

      // View results button
      const viewResultsBtn = document.createElement("button");
      viewResultsBtn.type = "button";
      viewResultsBtn.className = "text-button";
      viewResultsBtn.textContent = "Ver resultados";
      viewResultsBtn.style.marginLeft = "8px";
      viewResultsBtn.addEventListener("click", () => openResultsModal(survey));
      actionsDiv.append(viewResultsBtn);

      card.append(actionsDiv);

      const table = document.createElement("div");
      table.className = "results-table";
      survey.counts.forEach(([option, count]) => {
        const row = document.createElement("div");
        row.className = "result-row";
        row.innerHTML = "<span></span><strong></strong>";
        row.querySelector("span").textContent = option;
        row.querySelector("strong").textContent = count;
        table.append(row);
      });
      card.append(table);
      surveyResults.append(card);
    });
    
  } catch (error) {
    console.error("[ErrorBoundary] loadSurveyResults:", error);
    showErrorBoundary(surveyResults, error, `
      <div class="error-boundary">
        <div class="error-boundary-icon">📊</div>
        <h3>Error al cargar encuestas</h3>
        <p>${escapeHtml(error.message)}</p>
        <button class="secondary-button" onclick="window.loadDashboard?.()">Reintentar</button>
      </div>
    `);
  }
}