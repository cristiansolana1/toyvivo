import { useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  User,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase";

export function AuthScreen({ onAccountCreated }: { onAccountCreated: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const buttonLabel = isLoginMode ? "Iniciar sesión" : "Crear cuenta";

  function getAuthErrorMessage(error: unknown): string {
    if (!(error instanceof FirebaseError)) {
      return "No se pudo continuar. Revisa los datos e intenta otra vez.";
    }

    switch (error.code) {
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
        return "Esta cuenta esta deshabilitada en Firebase.";
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
        return `Error de Firebase: ${error.code}`;
    }
  }

  const handleSubmit = async () => {
    const normalizedEmail = email.trim();
    setAuthError(null);
    setAuthNotice(null);

    if (!normalizedEmail || !password) {
      setAuthError("Ingresa email y contraseña.");
      return;
    }

    if (!isLoginMode && password.length < 6) {
      setAuthError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setSubmitting(true);
      if (isLoginMode) {
        const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        onAccountCreated(credential.user);
      } else {
        const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        onAccountCreated(credential.user);
      }
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim();
    setAuthError(null);
    setAuthNotice(null);

    if (!normalizedEmail) {
      setAuthError("Escribe tu correo para recuperar la contraseña.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      setAuthNotice("Te enviamos un enlace para cambiar la contraseña.");
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.screen}>
        <Text style={styles.title}>Aviso de vida</Text>
        <Text style={styles.subtitle}>Accede una sola vez para dejar tu sesión guardada.</Text>

        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Correo electrónico"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
        />

        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
        {authNotice ? <Text style={styles.noticeText}>{authNotice}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Procesando..." : buttonLabel}</Text>
        </Pressable>

        <Pressable onPress={() => setIsLoginMode((prev) => !prev)}>
          <Text style={styles.linkText}>
            {isLoginMode ? "¿No tienes cuenta? Crear cuenta" : "¿Ya tienes cuenta? Iniciar sesión"}
          </Text>
        </Pressable>
        {isLoginMode ? (
          <Pressable onPress={() => void handlePasswordReset()}>
            <Text style={styles.resetText}>¿Olvidaste tu contraseña?</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  screen: {
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#334155",
    marginBottom: 18,
  },
  errorText: {
    color: "#b91c1c",
    textAlign: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  noticeText: {
    color: "#15803d",
    textAlign: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  resetText: {
    textAlign: "center",
    color: "#2563eb",
    marginTop: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: "#0f172a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 14,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  linkText: {
    textAlign: "center",
    color: "#2563eb",
    fontWeight: "600",
  },
});