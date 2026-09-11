import {
  User,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase";

export async function signIn(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signUp(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof Error && "code" in error)) {
    return "No se pudo continuar. Revisa los datos e intenta otra vez.";
  }

  const firebaseError = error as { code: string };

  switch (firebaseError.code) {
    case "auth/invalid-email":
      return "El correo no es valido.";
    case "auth/missing-password":
      return "La contrasena es obligatoria.";
    case "auth/weak-password":
      return "La contrasena debe tener al menos 6 caracteres.";
    case "auth/email-already-in-use":
      return "Este correo ya esta registrado.";
    case "auth/user-not-found":
      return "No existe una cuenta con este correo.";
    case "auth/wrong-password":
      return "La contraseña es incorrecta.";
    case "auth/user-disabled":
      return "Esta cuenta esta deshabilitada en Firebase Authentication.";
    case "auth/operation-not-allowed":
      return "Email/Password no esta habilitado en Firebase Authentication.";
    case "auth/network-request-failed":
      return "Error de red. Revisa tu conexion a internet.";
    case "auth/invalid-api-key":
      return "La API key de Firebase es invalida.";
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "El correo o la contraseña no son validos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
    default:
      return `Error de Firebase: ${firebaseError.code}`;
  }
}