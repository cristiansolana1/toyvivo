// ===== DATETIME PICKER =====

let datetimePickerTarget = null;
let datetimePickerDate = new Date();

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const dayNames = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

export function openDateTimePicker(targetInput, triggerBtn) {
  datetimePickerTarget = targetInput;
  const dropdown = document.querySelector("#datetime-picker-dropdown");
  
  const existingValue = targetInput.value;
  if (existingValue) {
    datetimePickerDate = new Date(existingValue);
  } else {
    datetimePickerDate = new Date();
  }
  
  renderDateTimePicker();
  positionDropdown(triggerBtn);
  dropdown.hidden = false;
  
  setTimeout(() => {
    document.addEventListener("click", closeDateTimePickerOnOutsideClick);
  }, 0);
}

export function closeDateTimePicker() {
  const dropdown = document.querySelector("#datetime-picker-dropdown");
  dropdown.hidden = true;
  datetimePickerTarget = null;
  document.removeEventListener("click", closeDateTimePickerOnOutsideClick);
}

function closeDateTimePickerOnOutsideClick(e) {
  const dropdown = document.querySelector("#datetime-picker-dropdown");
  if (!dropdown.contains(e.target) && !e.target.closest(".datetime-picker-trigger")) {
    closeDateTimePicker();
  }
}

function positionDropdown(triggerBtn) {
  const dropdown = document.querySelector("#datetime-picker-dropdown");
  const rect = triggerBtn.getBoundingClientRect();
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.top = `${rect.bottom + window.scrollY + 8}px`;
}

function renderDateTimePicker() {
  const year = datetimePickerDate.getFullYear();
  const month = datetimePickerDate.getMonth();
  
  document.querySelector(".datetime-picker-title").textContent = `${monthNames[month]} ${year}`;
  
  const weekdaysContainer = document.querySelector(".datetime-picker-weekdays");
  weekdaysContainer.innerHTML = dayNames.map(d => `<div class="datetime-picker-weekday">${d}</div>`).join("");
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  
  const selectedStr = datetimePickerTarget?.value ? new Date(datetimePickerTarget.value).toISOString().split("T")[0] : "";
  
  let daysHtml = "";
  
  for (let i = startDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const dateStr = new Date(year, month - 1, day).toISOString().split("T")[0];
    daysHtml += `<button type="button" class="datetime-picker-day other-month" data-date="${dateStr}">${day}</button>`;
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = new Date(year, month, day).toISOString().split("T")[0];
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedStr;
    let classes = "datetime-picker-day";
    if (isToday) classes += " today";
    if (isSelected) classes += " selected";
    daysHtml += `<button type="button" class="${classes}" data-date="${dateStr}">${day}</button>`;
  }
  
  const totalCells = startDay + daysInMonth;
  const nextMonthDays = (7 - (totalCells % 7)) % 7;
  for (let day = 1; day <= nextMonthDays; day++) {
    const dateStr = new Date(year, month + 1, day).toISOString().split("T")[0];
    daysHtml += `<button type="button" class="datetime-picker-day other-month" data-date="${dateStr}">${day}</button>`;
  }
  
  document.querySelector(".datetime-picker-days").innerHTML = daysHtml;
  
  document.querySelector("#datetime-picker-hour").value = datetimePickerDate.getHours();
  document.querySelector("#datetime-picker-minute").value = datetimePickerDate.getMinutes();
  
  document.querySelectorAll(".datetime-picker-day:not(.disabled)").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".datetime-picker-day.selected").forEach(el => el.classList.remove("selected"));
      e.target.classList.add("selected");
      const dateStr = e.target.dataset.date;
      datetimePickerDate = new Date(dateStr + "T" + datetimePickerDate.toTimeString().slice(0, 5));
    });
  });
  
  document.querySelector('[data-nav="prev-month"]').onclick = () => {
    datetimePickerDate.setMonth(datetimePickerDate.getMonth() - 1);
    renderDateTimePicker();
  };
  document.querySelector('[data-nav="next-month"]').onclick = () => {
    datetimePickerDate.setMonth(datetimePickerDate.getMonth() + 1);
    renderDateTimePicker();
  };
  
  document.querySelector("#datetime-picker-hour").onchange = (e) => {
    datetimePickerDate.setHours(parseInt(e.target.value) || 0);
  };
  document.querySelector("#datetime-picker-minute").onchange = (e) => {
    datetimePickerDate.setMinutes(parseInt(e.target.value) || 0);
  };
  
  document.querySelector("#datetime-picker-clear").onclick = () => {
    datetimePickerTarget.value = "";
    updateTriggerDisplay(datetimePickerTarget);
    closeDateTimePicker();
  };
  
  document.querySelector("#datetime-picker-confirm").onclick = () => {
    const isoString = datetimePickerDate.toISOString().slice(0, 16);
    datetimePickerTarget.value = isoString;
    updateTriggerDisplay(datetimePickerTarget);
    closeDateTimePicker();
  };
}

export function updateTriggerDisplay(input) {
  const picker = input.closest(".datetime-picker");
  const trigger = picker.querySelector(".datetime-picker-trigger");
  const display = trigger.querySelector(".datetime-picker-display");
  
  if (input.value) {
    const date = new Date(input.value);
    display.textContent = date.toLocaleString("es-ES", { 
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
    trigger.classList.add("has-value");
  } else {
    display.textContent = "Seleccionar";
    trigger.classList.remove("has-value");
  }
}

export function initDateTimePicker(pickerId, inputId) {
  const picker = document.querySelector(pickerId);
  const input = document.querySelector(inputId);
  const trigger = picker.querySelector(".datetime-picker-trigger");
  
  if (!trigger) return;
  
  const newTrigger = trigger.cloneNode(true);
  trigger.parentNode.replaceChild(newTrigger, trigger);
  newTrigger.addEventListener("click", () => openDateTimePicker(input, newTrigger));
  
  updateTriggerDisplay(input);
}