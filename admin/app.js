import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAPIfQYG5mCdF1-4DFwWNyxQG2trHfFv24",
  authDomain: "toyvivo-213f7.firebaseapp.com",
  projectId: "toyvivo-213f7",
  storageBucket: "toyvivo-213f7.firebasestorage.app",
  messagingSenderId: "947221650406",
  appId: "1:947221650406:web:8f922ef2a525830f9d1427",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const ADMIN_EMAIL = "cristiansolana1@gmail.com";

const loginView = document.querySelector("#login-view");
const dashboardView = document.querySelector("#dashboard-view");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const dashboardMessage = document.querySelector("#dashboard-message");
const userCount = document.querySelector("#user-count");
const latestUser = document.querySelector("#latest-user");
const refreshButton = document.querySelector("#refresh-button");
const logoutButton = document.querySelector("#logout-button");
const surveyForm = document.querySelector("#survey-form");
const surveyOptions = document.querySelector("#survey-options");
const addOptionButton = document.querySelector("#add-option-button");
const surveyMessage = document.querySelector("#survey-message");
const surveyResults = document.querySelector("#survey-results");

function authMessage(error) {
  switch (error.code) {
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
      return "La API key no autoriza este panel. Agrega localhost:8090 en las restricciones de la clave de Firebase.";
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "El correo o la contraseña no son válidos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
    case "auth/network-request-failed":
      return "Error de red. Revisa tu conexión.";
    default:
      return `No se pudo iniciar sesión (${error.code ?? "error desconocido"}).`;
  }
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "Sin aviso registrado";
  return timestamp.toDate().toLocaleString("es-ES");
}

async function loadSurveyResults() {
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
      createdAt: data.createdAt,
      totalResponses: responsesSnapshot.size,
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
    const card = document.createElement("article");
    card.className = "survey-result-card";
    const heading = document.createElement("div");
    heading.className = "survey-result-heading";
    heading.innerHTML = `<div><h3></h3><small></small></div><strong>${survey.totalResponses} respuesta${survey.totalResponses === 1 ? "" : "s"}</strong>`;
    heading.querySelector("h3").textContent = survey.question;
    heading.querySelector("small").textContent = formatDate(survey.createdAt);
    card.append(heading);

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
}

async function loadDashboard() {
  dashboardMessage.textContent = "Actualizando datos...";
  const snapshot = await getDocs(collection(db, "users"));
  userCount.textContent = snapshot.size;

  const latest = snapshot.docs
    .map((userDoc) => ({ id: userDoc.id, ...userDoc.data() }))
    .filter((userData) => userData.lastAliveAt)
    .sort((a, b) => b.lastAliveAt.toMillis() - a.lastAliveAt.toMillis())[0];

  if (!latest) {
    latestUser.innerHTML = "Sin avisos registrados<small>Ningún usuario ha pulsado “Estoy bien” todavía.</small>";
  } else {
    const name = latest.publicProfile?.fullName ?? latest.profile?.fullName ?? "Usuario sin Cuenta";
    latestUser.innerHTML = `${name}<small>${formatDate(latest.lastAliveAt)}</small>`;
  }
  await loadSurveyResults();
  dashboardMessage.textContent = `Actualizado: ${new Date().toLocaleTimeString("es-ES")}`;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    if (credential.user.email?.toLowerCase() !== ADMIN_EMAIL) {
      await signOut(auth);
      loginError.textContent = "Esta cuenta no tiene acceso al panel.";
    }
  } catch (error) {
    loginError.textContent = authMessage(error);
  }
});

refreshButton.addEventListener("click", () => {
  void loadDashboard().catch(() => {
    dashboardMessage.textContent = "No se pudieron cargar los datos. Revisa los permisos de Firestore.";
  });
});

logoutButton.addEventListener("click", () => void signOut(auth));

addOptionButton.addEventListener("click", () => {
  const optionCount = surveyOptions.querySelectorAll(".survey-option").length;
  if (optionCount >= 4) {
    surveyMessage.textContent = "Una encuesta puede tener como máximo 4 respuestas.";
    return;
  }

  const label = document.createElement("label");
  label.innerHTML = `Respuesta ${optionCount + 1}<input class="survey-option" type="text" required />`;
  surveyOptions.append(label);
});

surveyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  surveyMessage.textContent = "Publicando encuesta...";
  const question = document.querySelector("#survey-question").value.trim();
  const options = [...surveyOptions.querySelectorAll(".survey-option")]
    .map((input) => input.value.trim())
    .filter(Boolean);

  if (options.length < 2 || options.length > 4) {
    surveyMessage.textContent = "Agrega entre 2 y 4 respuestas.";
    return;
  }

  try {
    await addDoc(collection(db, "surveys"), {
      question,
      options,
      active: true,
      createdAt: serverTimestamp(),
      createdBy: ADMIN_EMAIL,
    });
    surveyForm.reset();
    surveyMessage.textContent = "Encuesta publicada correctamente.";
    await loadSurveyResults();
  } catch (error) {
    surveyMessage.textContent = error.code === "permission-denied"
      ? "Firestore rechazo la escritura. Publica la regla create de surveys para el administrador."
      : `No se pudo publicar (${error.code ?? "error desconocido"}).`;
  }
});

onAuthStateChanged(auth, async (user) => {
  if (user && user.email?.toLowerCase() !== ADMIN_EMAIL) {
    await signOut(auth);
    loginError.textContent = "Esta cuenta no tiene acceso al panel.";
    return;
  }

  loginView.hidden = Boolean(user);
  dashboardView.hidden = !user;
  logoutButton.hidden = !user;
  if (user) {
    try {
      await loadDashboard();
    } catch {
      dashboardMessage.textContent = "No se pudieron cargar los datos. Revisa los permisos de Firestore.";
    }
  }
});
