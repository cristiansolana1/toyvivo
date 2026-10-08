import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, Pressable, View, Image, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { User } from "firebase/auth";
import { useAuth } from "../hooks/useAuth";

export function AuthScreen({ onAccountCreated }: { onAccountCreated: (user: User) => void }) {
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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.screen, { paddingBottom: Math.max(insets.bottom + 40, 60) }]}
      >
        <View style={styles.brandWrap}>
          <Image source={require('../../assets/icon.png')} style={styles.appIcon} />
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

          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              secureTextEntry={!isPasswordVisible}
              placeholder="Contraseña"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              accessibilityLabel="Contraseña"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              accessibilityLabel={isPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <Text style={styles.eyeText}>{isPasswordVisible ? "🙈" : "👁"}</Text>
            </TouchableOpacity>
          </View>

          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
          {authNotice ? <Text style={styles.noticeText}>{authNotice}</Text> : null}

          <Pressable style={styles.primaryButton} onPress={() => handleSubmit(onAccountCreated)} disabled={submitting}>
            <Text style={styles.primaryButtonText}>{submitting ? "Procesando..." : buttonLabel}</Text>
          </Pressable>

          <Pressable onPress={toggleMode} style={styles.linkButton}>
            <Text style={styles.linkText}>
              {isLoginMode ? "¿No tienes cuenta? Crear cuenta" : "¿Ya tienes cuenta? Iniciar sesión"}
            </Text>
          </Pressable>
          {isLoginMode ? (
            <Pressable onPress={handlePasswordReset} style={styles.linkButton}>
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
  appIcon: {
    width: 64,
    height: 64,
    resizeMode: "contain",
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
    marginTop: 14,
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
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#c8d8cf",
    backgroundColor: "#f4f8f5",
    borderRadius: 12,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: "#15231f",
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  eyeText: {
    fontSize: 18,
  },
  primaryButton: {
    backgroundColor: "#286052",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 14,
    minHeight: 48,
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fffdf8",
    fontSize: 16,
    fontWeight: "700",
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkText: {
    textAlign: "center",
    color: "#286052",
    fontWeight: "700",
  },
});
