import { addDoc, collection, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getDbInstance } from "./firebase.js";
import { formatDateTimeForInput, escapeHtml } from "./utils.js";
import { getAdminEmail } from "./auth.js";
import { initDateTimePicker, updateTriggerDisplay } from "./datetimePicker.js";

const db = getDbInstance();
const ADMIN_EMAIL = getAdminEmail();

export function openSurveyModal() {
  const modal = document.querySelector("#survey-modal");
  const title = document.querySelector("#survey-modal-title");
  const form = document.querySelector("#survey-modal-form");
  const startInput = document.querySelector("#survey-modal-start");
  const endInput = document.querySelector("#survey-modal-end");
  const targetCountrySelect = document.querySelector("#survey-modal-target-country");
  const targetProvinceSelect = document.querySelector("#survey-modal-target-province");
  const optionsContainer = document.querySelector("#survey-modal-options");
  const message = document.querySelector("#survey-modal-message");

  form.reset();
  optionsContainer.innerHTML = `
    <label>Respuesta 1<input class="survey-option" type="text" required /></label>
    <label>Respuesta 2<input class="survey-option" type="text" required /></label>
  `;
  message.textContent = "";
  
  title.textContent = "Nueva encuesta";
  targetCountrySelect.value = "";
  targetProvinceSelect.value = "";
  targetProvinceSelect.disabled = true;

  updateTriggerDisplay(startInput);
  updateTriggerDisplay(endInput);
  
  initDateTimePicker("#survey-modal-start-picker", "#survey-modal-start");
  initDateTimePicker("#survey-modal-end-picker", "#survey-modal-end");
  
  // Country/province change handler
  const newCountrySelect = targetCountrySelect.cloneNode(true);
  targetCountrySelect.parentNode.replaceChild(newCountrySelect, targetCountrySelect);
  newCountrySelect.addEventListener("change", (e) => {
    const provinceSelect = document.querySelector("#survey-modal-target-province");
    if (e.target.value) {
      provinceSelect.disabled = false;
    } else {
      provinceSelect.disabled = true;
      provinceSelect.value = "";
    }
    void updateReachIndicator();
  });

  const provinceSelect = document.querySelector("#survey-modal-target-province");
  const newProvinceSelect = provinceSelect.cloneNode(true);
  provinceSelect.parentNode.replaceChild(newProvinceSelect, provinceSelect);
  newProvinceSelect.addEventListener("change", () => {
    void updateReachIndicator();
  });

  void updateReachIndicator();

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

async function updateReachIndicator() {
  const reachEl = document.querySelector("#survey-modal-reach");
  if (!reachEl) return;
  reachEl.textContent = "🎯 Alcance estimado: Calculando...";
  try {
    const country = document.querySelector("#survey-modal-target-country")?.value;
    const province = document.querySelector("#survey-modal-target-province")?.value;
    const usersSnap = await getDocs(collection(db, "users"));
    const totalUsers = usersSnap.docs.filter(d => d.data().publicProfile || d.data().profile).length;

    let matched = totalUsers;
    if (country) {
      matched = usersSnap.docs.filter(d => {
        const p = d.data().publicProfile || d.data().profile;
        if (!p) return false;
        if (province && p.province !== province) return false;
        return true;
      }).length;
    }

    const pct = totalUsers > 0 ? ((matched / totalUsers) * 100).toFixed(1) : 0;
    reachEl.textContent = `🎯 Alcance estimado: ${matched} usuarios (${pct}% del total de ${totalUsers})`;
  } catch (err) {
    console.warn("Error calculating reach:", err);
    reachEl.textContent = "🎯 Alcance estimado: No disponible";
  }
}

export function closeSurveyModal() {
  const modal = document.querySelector("#survey-modal");
  const form = document.querySelector("#survey-modal-form");
  form.reset();
  updateTriggerDisplay(document.querySelector("#survey-modal-start"));
  updateTriggerDisplay(document.querySelector("#survey-modal-end"));
  modal.hidden = true;
  document.body.style.overflow = "";
}

export function setupSurveyModal() {
  document.querySelector("#new-survey-btn").addEventListener("click", () => {
    openSurveyModal();
  });

  document.querySelector("#survey-modal-add-option").addEventListener("click", () => {
    const optionsContainer = document.querySelector("#survey-modal-options");
    const optionCount = optionsContainer.querySelectorAll(".survey-option").length;
    if (optionCount >= 4) {
      document.querySelector("#survey-modal-message").textContent = "Una encuesta puede tener como máximo 4 respuestas.";
      return;
    }
    const label = document.createElement("label");
    label.innerHTML = `Respuesta ${optionCount + 1}<input class="survey-option" type="text" required />`;
    optionsContainer.append(label);
  });
  
  document.querySelector("#survey-modal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = document.querySelector("#survey-modal-message");
    message.textContent = "Guardando...";
    
    const question = document.querySelector("#survey-modal-question").value.trim();
    const options = [...document.querySelectorAll("#survey-modal-options .survey-option")]
      .map(input => input.value.trim())
      .filter(Boolean);
    const startValue = document.querySelector("#survey-modal-start").value;
    const endValue = document.querySelector("#survey-modal-end").value;
    const targetCountry = document.querySelector("#survey-modal-target-country").value;
    const targetProvince = document.querySelector("#survey-modal-target-province").value;
    
    if (options.length < 2 || options.length > 4) {
      message.textContent = "Agrega entre 2 y 4 respuestas.";
      return;
    }
    
    if (startValue && endValue && new Date(startValue) >= new Date(endValue)) {
      message.textContent = "La fecha de inicio debe ser anterior a la de fin.";
      return;
    }
    
    if (targetProvince && !targetCountry) {
      message.textContent = "Debe seleccionar un país antes de elegir una provincia.";
      return;
    }
    
    const surveyData = {
      question,
      options,
      active: false,
      createdBy: ADMIN_EMAIL,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (startValue) surveyData.startAt = new Date(startValue);
    if (endValue) surveyData.endAt = new Date(endValue);
    if (targetCountry) surveyData.targetCountry = targetCountry;
    if (targetProvince) surveyData.targetProvince = targetProvince;
    
    try {
      await addDoc(collection(db, "surveys"), surveyData);
      message.textContent = "Encuesta creada correctamente.";
      
      await window.loadSurveysTable?.();
      await window.loadSurveyResults?.();
      
      setTimeout(() => {
        closeSurveyModal();
      }, 1000);
    } catch (error) {
      console.error("Error saving survey:", error);
      message.textContent = error.code === "permission-denied"
        ? "Firestore rechazó la escritura. Revisa los permisos."
        : `Error: ${error.message}`;
    }
  });
  
  document.querySelector("#survey-modal").querySelector(".modal-backdrop").addEventListener("click", closeSurveyModal);
  document.querySelector("#survey-modal-cancel").addEventListener("click", closeSurveyModal);
}
