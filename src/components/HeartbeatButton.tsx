import { Pressable, StyleSheet, Text, View } from "react-native";

interface HeartbeatButtonProps {
  onPress: () => void;
  disabled: boolean;
  sending: boolean;
  countdownText: string;
  overdue: boolean;
  pendingCount: number;
  isOnline: boolean;
}

export function HeartbeatButton({
  onPress,
  disabled,
  sending,
  countdownText,
  overdue,
  pendingCount,
  isOnline,
}: HeartbeatButtonProps) {
  const buttonDisabled = disabled || sending;
  const isPrimaryAction = overdue && isOnline && !buttonDisabled;
  const headline = sending ? "Enviando..." : overdue ? "Estoy bien" : countdownText;
  const helperText = sending
    ? "Sincronizando con tu seguridad."
    : overdue
      ? "Pulsa para avisar a tus contactos."
      : `Próximo aviso disponible en ${countdownText}`;

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.button,
          !isPrimaryAction && styles.disabled,
          !isOnline && styles.offline,
          buttonDisabled && styles.disabled,
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

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 18,
  },
  button: {
    width: "100%",
    borderRadius: 28,
    minHeight: 164,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16a34a",
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: "#166534",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  disabled: {
    backgroundColor: "#94a3b8",
    shadowOpacity: 0,
    elevation: 0,
  },
  offline: {
    backgroundColor: "#f59e0b",
  },
  text: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
  },
  helperText: {
    color: "rgba(255,255,255,0.9)",
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
    backgroundColor: "#3b82f6",
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
