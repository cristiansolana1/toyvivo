import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface HeartbeatButtonProps {
  onPress: () => void;
  disabled: boolean;
  sending: boolean;
  loading: boolean;
  countdownText: string;
  overdue: boolean;
  pendingCount: number;
  isOnline: boolean;
}

function HeartbeatButtonComponent({
  onPress,
  disabled,
  sending,
  loading,
  countdownText,
  overdue,
  pendingCount,
  isOnline,
}: HeartbeatButtonProps) {
  const buttonDisabled = disabled || sending || loading;
  const isPrimaryAction = overdue && isOnline && !buttonDisabled;
  const headline = loading ? "Cargando..." : sending ? "Enviando..." : overdue ? "Estoy bien" : countdownText;
  const helperText = loading
    ? "Verificando estado..."
    : sending
      ? "Sincronizando con tu seguridad."
      : overdue
        ? "Pulsa para avisar a tus contactos."
        : `Próximo aviso disponible en ${countdownText}`;

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          isPrimaryAction && styles.primaryActionActive,
          !isPrimaryAction && styles.disabled,
          !isOnline && styles.offline,
          buttonDisabled && styles.disabled,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
        disabled={buttonDisabled}
        accessibilityLabel={overdue ? "Enviar aviso de vida" : `Próximo aviso en ${countdownText}`}
        accessibilityRole="button"
      >
        <Text style={styles.text}>{headline}</Text>
        <Text style={styles.helperText}>{helperText}</Text>
      </Pressable>

      {!isOnline && (
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineText}>Sin conexión</Text>
        </View>
      )}

      {pendingCount > 0 && (
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>{pendingCount} pendiente{pendingCount > 1 ? "s" : ""}</Text>
        </View>
      )}
    </View>
  );
}

export const HeartbeatButton = memo(HeartbeatButtonComponent);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 18,
  },
  button: {
    width: "100%",
    borderRadius: 16,
    minHeight: 164,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#286052",
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: "#244438",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  primaryActionActive: {
    backgroundColor: "#1f4c40",
    shadowOpacity: 0.25,
    shadowRadius: 22,
    elevation: 8,
    borderWidth: 2,
    borderColor: "#a3c4b9",
  },
  disabled: {
    backgroundColor: "#94a3b8",
    shadowOpacity: 0,
    elevation: 0,
  },
  offline: {
    backgroundColor: "#d97706",
  },
  text: {
    color: "#fffdf8",
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
  },
  helperText: {
    color: "rgba(255,253,248,0.9)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  offlineBadge: {
    position: "absolute",
    top: -8,
    right: 18,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  offlineText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  pendingBadge: {
    position: "absolute",
    bottom: -8,
    right: 18,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pendingText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
