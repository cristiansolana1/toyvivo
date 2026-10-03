import {
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getAuthInstance } from "./firebase.js";

const ADMIN_EMAIL = "cristiansolana1@gmail.com";

function authMessage(error) {
  if (error instanceof Error && !error.code) return error.message;

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

export async function signInAdmin(email, password) {
  const auth = getAuthInstance();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const token = await credential.user.getIdTokenResult();

  if (credential.user.email?.toLowerCase() !== ADMIN_EMAIL || token.claims.email_verified !== true) {
    await signOut(auth);
    throw new Error(credential.user.email?.toLowerCase() !== ADMIN_EMAIL
      ? "Esta cuenta no tiene acceso al panel."
      : "Verifica el correo de la cuenta administradora antes de entrar.");
  }
  
  return credential.user;
}

export function signOutAdmin() {
  const auth = getAuthInstance();
  return signOut(auth);
}

export function onAuthStateChange(callback) {
  const auth = getAuthInstance();
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const token = await user.getIdTokenResult();
      const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL;
      const isVerified = token.claims.email_verified === true;
      if (!isAdmin || !isVerified) {
        await signOut(auth);
        callback(null, isAdmin
          ? "Verifica el correo de la cuenta administradora antes de entrar."
          : "Esta cuenta no tiene acceso al panel.");
        return;
      }
    }
    callback(user, null);
  });
}

export function getAdminEmail() {
  return ADMIN_EMAIL;
}

export { authMessage };