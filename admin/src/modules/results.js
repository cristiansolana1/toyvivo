import { collection, getDocs, doc, getDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getDbInstance } from "./firebase.js";
import { formatDate, formatDateTime, escapeHtml, getSurveyStatus, showSkeleton } from "./utils.js";

let currentResultsSurvey = null;

function getDb() {
  return getDbInstance();
}

export async function openResultsModal(survey) {
  currentResultsSurvey = survey;
  const modal = document.querySelector("#results-modal");
  const title = document.querySelector("#results-modal-title");
  const content = document.querySelector("#results-modal-content");
  const exportBtn = document.querySelector("#export-csv-btn");
  
  title.textContent = `Resultados: ${survey.question}`;
  exportBtn.disabled = false;
  exportBtn.dataset.surveyId = survey.id;
  exportBtn.dataset.surveyQuestion = survey.question;
  
  showSkeleton(content, 3, "card");
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  
  try {
    let responsesSnapshot;
    try {
      responsesSnapshot = await getDocs(
        query(collection(db, "surveys", survey.id, "responses"), orderBy("answeredAt", "asc"))
      );
    } catch (indexError) {
      console.warn("Index missing for answeredAt, falling back to unordered query:", indexError);
      responsesSnapshot = await getDocs(collection(db, "surveys", survey.id, "responses"));
    }
    
    const responses = responsesSnapshot.docs;
    const totalResponses = responses.length;
    const options = survey.options ?? [];
    
    const counts = new Map(options.map(opt => [opt, 0]));
    responses.forEach(r => {
      const ans = r.data().answer;
      if (counts.has(ans)) counts.set(ans, counts.get(ans) + 1);
    });
    
    const usersSnapshot = await getDocs(collection(db, "users"));
    const eligibleUsers = usersSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.publicProfile || data.profile;
    }).length;
    const responseRate = eligibleUsers > 0 ? ((totalResponses / eligibleUsers) * 100).toFixed(1) : 0;
    
    const timeSeriesContainer = document.createElement("div");
    timeSeriesContainer.dataset.surveyId = survey.id;
    
    content.innerHTML = `
      <div class="results-summary">
        <div class="results-summary-item">
          <span class="results-summary-label">Total respuestas</span>
          <span class="results-summary-value">${totalResponses}</span>
        </div>
        <div class="results-summary-item">
          <span class="results-summary-label">Usuarios elegibles</span>
          <span class="results-summary-value">${eligibleUsers}</span>
        </div>
        <div class="results-summary-item">
          <span class="results-summary-label">Tasa de participación</span>
          <span class="results-summary-value">${responseRate}%</span>
        </div>
        <div class="results-summary-item">
          <span class="results-summary-label">Estado</span>
          <span class="results-summary-value">
            <span class="survey-status-badge ${getSurveyStatus(survey).class}">${getSurveyStatus(survey).text}</span>
          </span>
        </div>
      </div>
      <div class="results-chart" id="results-chart"></div>
      <div class="timeseries-section" id="timeseries-section"></div>
    `;
    
    const chartContainer = content.querySelector("#results-chart");
    const countsArray = Array.from(counts.values());
    const maxCount = countsArray.length > 0 ? Math.max(...countsArray) : 0;
    
    chartContainer.innerHTML = options.map(opt => {
      const count = counts.get(opt) || 0;
      const pct = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
      return `
        <div class="result-bar">
          <span class="result-bar-label">${escapeHtml(opt)}</span>
          <div class="result-bar-track">
            <div class="result-bar-fill" style="width: ${pct}%"></div>
          </div>
          <span class="result-bar-value">${count} (${pct.toFixed(1)}%)</span>
        </div>
      `;
    }).join("");
    
    const timeSeriesData = await loadSurveyTimeSeries(survey.id, "day");
    renderTimeSeriesChart(timeSeriesContainer, timeSeriesData, options, "day");
    content.querySelector("#timeseries-section").appendChild(timeSeriesContainer);
    
    exportBtn.onclick = () => exportSurveyCSV(survey, responses, options, counts);
    
    if (totalResponses === 0) {
      chartContainer.innerHTML = '<p class="message">Esta encuesta aún no tiene respuestas.</p>';
      timeSeriesContainer.innerHTML = '<p class="message">No hay datos de series temporales disponibles.</p>';
    }
    
  } catch (error) {
    console.error("Error loading results:", error);
    content.innerHTML = `<p class="message error">Error al cargar resultados: ${escapeHtml(error.message)}</p>`;
  }
}

export function closeResultsModal() {
  currentResultsSurvey = null;
  const modal = document.querySelector("#results-modal");
  modal.hidden = true;
  document.body.style.overflow = "";
}

export function setupResultsModal() {
  document.querySelector("#results-modal-close").addEventListener("click", closeResultsModal);
  document.querySelector("#results-modal").querySelector(".modal-backdrop").addEventListener("click", closeResultsModal);
}

async function loadSurveyTimeSeries(surveyId, granularity = "day") {
  let responsesSnapshot;
  try {
    responsesSnapshot = await getDocs(
      query(collection(db, "surveys", surveyId, "responses"), orderBy("answeredAt", "asc"))
    );
  } catch (indexError) {
    console.warn("Index missing for answeredAt in time series, falling back:", indexError);
    responsesSnapshot = await getDocs(collection(db, "surveys", surveyId, "responses"));
  }
  
  const responses = responsesSnapshot.docs;
  const aggregated = aggregateResponsesByTime(responses, granularity);
  
  return aggregated;
}

function aggregateResponsesByTime(responses, granularity = "day") {
  const buckets = new Map();
  
  responses.forEach((response) => {
    const answeredAt = response.data().answeredAt;
    if (!answeredAt) return;
    
    const date = new Date(answeredAt);
    if (isNaN(date.getTime())) return;
    
    let key;
    if (granularity === "week") {
      const weekStart = getWeekStart(date);
      key = weekStart.toISOString().split("T")[0];
    } else {
      key = date.toISOString().split("T")[0];
    }
    
    if (!buckets.has(key)) {
      buckets.set(key, { date: key, total: 0, byOption: new Map() });
    }
    const bucket = buckets.get(key);
    bucket.total++;
    const answer = response.data().answer;
    if (answer) {
      bucket.byOption.set(answer, (bucket.byOption.get(answer) || 0) + 1);
    }
  });
  
  return Array.from(buckets.values())
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function renderTimeSeriesChart(container, data, options, granularity = "day") {
  if (data.length === 0) {
    container.innerHTML = '<p class="message">No hay datos de series temporales disponibles.</p>';
    return;
  }
  
  const chartHtml = `
    <div class="timeseries-chart">
      <div class="timeseries-controls">
        <label>
          <input type="radio" name="timeseries-granularity" value="day" ${granularity === "day" ? "checked" : ""}> Día
        </label>
        <label>
          <input type="radio" name="timeseries-granularity" value="week" ${granularity === "week" ? "checked" : ""}> Semana
        </label>
      </div>
      <div class="timeseries-bars">
        ${data.map(bucket => {
          const date = new Date(bucket.date + "T00:00:00");
          return `
            <div class="timeseries-bar-group">
              <div class="timeseries-bar-label">${formatChartDate(date)}</div>
              <div class="timeseries-bar-stack">
                ${options.map(opt => {
                  const count = bucket.byOption.get(opt) || 0;
                  const pct = bucket.total > 0 ? (count / bucket.total) * 100 : 0;
                  return `
                    <div class="timeseries-bar-segment" 
                         style="width: ${pct}%; background: var(--option-color-${opt.replace(/[^a-z0-9]/gi, '')}, #286052);"
                         title="${opt}: ${count} (${pct.toFixed(1)}%)">
                      ${pct > 10 ? `<span>${count}</span>` : ""}
                    </div>
                  `;
                }).join("")}
              </div>
              <div class="timeseries-bar-total">${bucket.total}</div>
            </div>
          `;
        }).join("")}
      </div>
      <div class="timeseries-legend">
        ${options.map((opt, i) => `
          <span class="timeseries-legend-item" style="--option-color-${opt.replace(/[^a-z0-9]/gi, '')}: hsl(${i * 60 + 120}, 60%, 35%)">
            <span class="timeseries-legend-color"></span>${escapeHtml(opt)}
          </span>
        `).join("")}
      </div>
    </div>
  `;
  
  container.innerHTML = chartHtml;
  
  container.querySelectorAll('input[name="timeseries-granularity"]').forEach(input => {
    input.addEventListener("change", async (e) => {
      const newGranularity = e.target.value;
      const newData = await loadSurveyTimeSeries(container.dataset.surveyId, newGranularity);
      renderTimeSeriesChart(container, newData, options, newGranularity);
    });
  });
}

function formatChartDate(date) {
  return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
}

async function exportSurveyCSV(survey, responses, options, counts) {
  const headers = ["Fecha respuesta", "Usuario ID", "Respuesta"];
  const rows = responses.map(r => {
    const data = r.data();
    return [
      data.answeredAt ? new Date(data.answeredAt).toLocaleString("es-ES") : "",
      r.id,
      data.answer || ""
    ];
  });
  
  const summaryRows = [
    [],
    ["Resumen"],
    ["Pregunta", survey.question],
    ["Total respuestas", responses.length],
    ...options.map(opt => [opt, counts.get(opt) || 0])
  ];
  
  const csv = [headers, ...rows, ...summaryRows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `encuesta-${survey.id}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}