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
  isOnline 
}: HeartbeatButtonProps) {
  const buttonDisabled = disabled || sending;

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.button, 
          !overdue && styles.disabled, 
          buttonDisabled && styles.disabled,
          !isOnline && styles.offline
        ]}
        onPress={onPress}
        disabled={buttonDisabled}
        accessibilityLabel={overdue ? "Enviar aviso de vida" : `Próximo aviso en ${countdownText}`}
        accessibilityRole="button"
      >
        <Text style={styles.text}>{sending ? "Enviando..." : countdownText}</Text>
      </Pressable>
      
      {!isOnline && (
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineText}>Sin conexión</Text>
        </View>
      )}

      {pendingCount > 0 && (
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  button: {
    marginVertical: 26,
    borderRadius: 999,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16a34a",
    paddingHorizontal: 20,
  },
  disabled: {
    backgroundColor: "#94a3b8",
  },
  offline: {
    backgroundColor: "#f59e0b",
  },
  text: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "800",
  },
  offlineBadge: {
    position: "absolute",
    top: -8,
    right: -8,
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
    right: -8,
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