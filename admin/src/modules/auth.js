import {
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getAuthInstance, getDbInstance } from "./firebase.js";

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

export async function verifyAdminRole(user) {
  if (!user) return { isAdmin: false, error: "No hay usuario autenticado." };

  const token = await user.getIdTokenResult(true);
  const isEmailVerified = token.claims.email_verified === true;
  const isSuperAdmin = user.email?.toLowerCase() === ADMIN_EMAIL && isEmailVerified;
  const hasCustomClaim = token.claims.admin === true && isEmailVerified;

  if (isSuperAdmin || hasCustomClaim) {
    return { isAdmin: true, role: isSuperAdmin ? "superadmin" : "admin" };
  }

  // Check Firestore `admins/{uid}` collection as third authorization tier
  try {
    const db = getDbInstance();
    const adminDoc = await getDoc(doc(db, "admins", user.uid));
    if (adminDoc.exists() && isEmailVerified) {
      return { isAdmin: true, role: adminDoc.data().role || "admin" };
    }
  } catch (err) {
    console.warn("[Auth] Error verifying admins collection:", err);
  }

  if (!isEmailVerified) {
    return { isAdmin: false, error: "Verifica el correo de la cuenta administradora antes de entrar." };
  }

  return { isAdmin: false, error: "Esta cuenta no tiene acceso al panel de administración." };
}

export async function signInAdmin(email, password) {
  const auth = getAuthInstance();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const verification = await verifyAdminRole(credential.user);

  if (!verification.isAdmin) {
    await signOut(auth);
    throw new Error(verification.error);
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
      const verification = await verifyAdminRole(user);
      if (!verification.isAdmin) {
        await signOut(auth);
        callback(null, verification.error);
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