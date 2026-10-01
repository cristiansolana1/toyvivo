import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

interface AddUserFormProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  message: string | null;
}

export function AddUserForm({ value, onChangeText, onSubmit, disabled, message }: AddUserFormProps) {
  return (
    <View>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.dniInput]}
          keyboardType="number-pad"
          placeholder="DNI del usuario"
          placeholderTextColor="#64748b"
          value={value}
          onChangeText={(text) => onChangeText(text.replace(/\D/g, ""))}
          accessibilityLabel="DNI del usuario a agregar"
        />
        <Pressable style={[styles.primaryButton, styles.submitButton]} onPress={onSubmit} disabled={disabled} accessibilityLabel="Agregar usuario por DNI">
          <Text style={styles.primaryButtonText}>{disabled ? "Agregando..." : "Agregar"}</Text>
        </Pressable>
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#c8d8cf",
    backgroundColor: "#f4f8f5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#15231f",
  },
  dniInput: {
    flex: 1,
  },
  submitButton: {
    flexShrink: 0,
    minWidth: 116,
    minHeight: 48,
    paddingHorizontal: 12,
    marginBottom: 0,
  },
  primaryButton: {
    backgroundColor: "#286052",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fffdf8",
    fontSize: 15,
    fontWeight: "700",
  },
  message: {
    color: "#1a6e3a",
    textAlign: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    fontWeight: "600",
  },
});