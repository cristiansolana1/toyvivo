import { Pressable, StyleSheet, Text, View } from "react-native";

interface HeartbeatButtonProps {
  onPress: () => void;
  disabled: boolean;
  sending: boolean;
  countdownText: string;
  overdue: boolean;
}

export function HeartbeatButton({ onPress, disabled, sending, countdownText, overdue }: HeartbeatButtonProps) {
  return (
    <Pressable
      style={[styles.button, !overdue && styles.disabled, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.text}>{sending ? "Enviando..." : countdownText}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  text: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "800",
  },
});