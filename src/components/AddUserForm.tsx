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
          value={value}
          onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, ""))}
        />
        <Pressable style={[styles.primaryButton, styles.submitButton]} onPress={onSubmit} disabled={disabled}>
          <Text style={styles.primaryButtonText}>{disabled ? "Agregando..." : "Agregar usuario"}</Text>
        </Pressable>
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
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
  dniInput: {
    flex: 1,
  },
  submitButton: {
    flexShrink: 0,
    minWidth: 132,
    minHeight: 48,
    paddingHorizontal: 12,
    marginBottom: 12,
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
  message: {
    color: "#15803d",
    textAlign: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});