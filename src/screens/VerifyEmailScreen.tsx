import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { User, sendEmailVerification } from "firebase/auth";
import { useToast } from "../hooks/useToast";

interface VerifyEmailScreenProps {
  user: User;
  onSignOut: () => Promise<void> | void;
  onVerified: () => void;
}

export function VerifyEmailScreen({ user, onSignOut, onVerified }: VerifyEmailScreenProps) {
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleCheckVerification = async () => {
    try {
      setChecking(true);
      setMessage(null);
      await user.reload();
      if (user.emailVerified) {
        showToast({ text: "Correo verificado correctamente.", type: "success" });
        onVerified();
      } else {
        setMessage("Tu correo aún no ha sido verificado. Por favor, revisa tu bandeja de entrada o spam.");
      }
    } catch {
      setMessage("No se pudo comprobar el estado. Inténtalo nuevamente.");
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      setMessage(null);
      await sendEmailVerification(user);
      showToast({ text: "Correo de verificación reenviado.", type: "info" });
      setMessage("Se ha reenviado el correo de verificación.");
    } catch {
      setMessage("No se pudo reenviar el correo. Espera unos minutos antes de intentar de nuevo.");
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verifica tu correo electrónico</Text>
      <Text style={styles.subtitle}>
        Hemos enviado un enlace de confirmación a <Text style={styles.bold}>{user.email}</Text>.
        Por favor, abre tu correo y haz clic en el enlace para confirmar tus datos antes de continuar.
      </Text>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Pressable style={styles.button} onPress={handleCheckVerification} disabled={checking}>
        <Text style={styles.buttonText}>{checking ? "Comprobando..." : "Ya verifiqué mi correo"}</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={handleResend} disabled={resending}>
        <Text style={styles.secondaryButtonText}>{resending ? "Enviando..." : "Reenviar correo"}</Text>
      </Pressable>

      <Pressable style={styles.linkButton} onPress={onSignOut}>
        <Text style={styles.linkButtonText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#334155",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  bold: {
    fontWeight: "600",
    color: "#0f172a",
  },
  message: {
    fontSize: 14,
    color: "#b91c1c",
    marginBottom: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#0f172a",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    minHeight: 48,
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#e2e8f0",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    minHeight: 48,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    padding: 12,
    marginTop: 8,
  },
  linkButtonText: {
    color: "#2563eb",
    fontSize: 15,
    fontWeight: "600",
  },
});
