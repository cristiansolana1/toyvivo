import { SafeAreaView, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import { useAuth } from "../hooks/useAuth";

export function AuthScreen({ onAccountCreated }: { onAccountCreated: (user: any) => void }) {
  const {
    email,
    setEmail,
    password,
    setPassword,
    isLoginMode,
    submitting,
    authError,
    authNotice,
    buttonLabel,
    handleSubmit,
    handlePasswordReset,
    toggleMode,
  } = useAuth();

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

        <Pressable style={styles.primaryButton} onPress={() => handleSubmit(onAccountCreated)} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Procesando..." : buttonLabel}</Text>
        </Pressable>

        <Pressable onPress={toggleMode}>
          <Text style={styles.linkText}>
            {isLoginMode ? "¿No tienes cuenta? Crear cuenta" : "¿Ya tienes cuenta? Iniciar sesión"}
          </Text>
        </Pressable>
        {isLoginMode ? (
          <Pressable onPress={handlePasswordReset}>
            <Text style={styles.resetText}>¿Olvidaste tu contraseña?</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

import { TextInput } from "react-native";

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