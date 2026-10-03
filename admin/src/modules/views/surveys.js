import { loadSurveysTable, setupSurveyFilters } from "../../modules/surveys.js";

export async function loadSurveysView() {
  setupSurveyFilters();
  await loadSurveysTable();
}