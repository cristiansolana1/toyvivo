import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, Pressable, View } from "react-native";
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
        <View style={styles.brandWrap}>
          <Text style={styles.brandBadge}>AV</Text>
        </View>

        <Text style={styles.eyebrow}>Seguridad para tu familia</Text>
        <Text style={styles.title}>Aviso de vida</Text>
        <Text style={styles.subtitle}>Accede una sola vez para dejar tu sesión guardada y cuidar a tus contactos.</Text>

        <View style={styles.formCard}>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Correo electrónico"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            accessibilityLabel="Correo electrónico"
          />
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="Contraseña"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            accessibilityLabel="Contraseña"
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#edf3ef",
  },
  screen: {
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  brandWrap: {
    alignItems: "center",
    marginBottom: 18,
  },
  brandBadge: {
    width: 64,
    height: 64,
    lineHeight: 64,
    textAlign: "center",
    borderRadius: 20,
    backgroundColor: "#286052",
    color: "#fffdf8",
    fontSize: 24,
    fontWeight: "800",
  },
  eyebrow: {
    color: "#b05b36",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#15231f",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#587068",
    lineHeight: 22,
    marginBottom: 20,
  },
  formCard: {
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#d5dfd8",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#244438",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  errorText: {
    color: "#a83f32",
    textAlign: "center",
    paddingHorizontal: 8,
    paddingTop: 8,
    fontWeight: "600",
  },
  noticeText: {
    color: "#1a6e3a",
    textAlign: "center",
    paddingHorizontal: 8,
    paddingTop: 8,
    fontWeight: "600",
  },
  resetText: {
    textAlign: "center",
    color: "#9d4e30",
    marginTop: 18,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#c8d8cf",
    backgroundColor: "#f4f8f5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    fontSize: 16,
    color: "#15231f",
  },
  primaryButton: {
    backgroundColor: "#286052",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 14,
  },
  primaryButtonText: {
    color: "#fffdf8",
    fontSize: 16,
    fontWeight: "700",
  },
  linkText: {
    textAlign: "center",
    color: "#286052",
    fontWeight: "700",
  },
});