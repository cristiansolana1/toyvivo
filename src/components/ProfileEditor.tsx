import { useState } from "react";
import { useToast } from "../hooks/useToast";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { UserProfile } from "../types";
import { PROVINCES_AR, FIXED_COUNTRY_LABEL } from "../constants";
import { toDDMMYYYY } from "../utils/date";
import { validateProfile, getFirstValidationError } from "../utils/validation";

interface ProfileEditorProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => Promise<boolean>;
  onCancel: () => void;
  saving: boolean;
  onDelete?: () => Promise<void>;
}

export function ProfileEditor({ profile, onSave, onCancel, saving, onDelete }: ProfileEditorProps) {
  const [phone, setPhone] = useState(profile.phone);
  const [province, setProvince] = useState(profile.province ?? "BA");
  const [localSaving, setLocalSaving] = useState(false);
  const { showToast } = useToast();

  const handleSave = async () => {
    const updatedProfile: UserProfile = {
      fullName: profile.fullName,
      dni: profile.dni,
      phone: phone.trim(),
      country: profile.country,
      province,
      birthDate: profile.birthDate,
    };

    const validationResults = validateProfile(updatedProfile);
    const firstError = getFirstValidationError(validationResults);
    if (firstError) {
      Alert.alert("Faltan datos", firstError);
      return;
    }

    setLocalSaving(true);
    const success = await onSave(updatedProfile);
    setLocalSaving(false);
    if (success) {
      showToast({ text: "Tus datos se actualizaron correctamente.", type: "success" });
    } else {
      showToast({ text: "No se pudieron guardar los cambios.", type: "error" });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Eliminar cuenta",
      "¿Estás seguro de que deseas eliminar tu cuenta permanentemente? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            if (!onDelete) return;
            try {
              setLocalSaving(true);
              await onDelete();
            } catch (error) {
              setLocalSaving(false);
              Alert.alert(
                "Error",
                "No se pudo eliminar la cuenta. Es posible que debas iniciar sesión nuevamente antes de eliminarla por motivos de seguridad."
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.editor}>
      <Text style={styles.fieldLabel}>Nombre completo (No editable)</Text>
      <Text style={styles.readOnlyText}>{profile.fullName}</Text>

      <Text style={styles.fieldLabel}>DNI (No editable)</Text>
      <Text style={styles.readOnlyText}>{profile.dni}</Text>

      <Text style={styles.fieldLabel}>Teléfono (Editable)</Text>
      <TextInput
        style={styles.input}
        placeholder="Teléfono"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={(value) => setPhone(value.replace(/[^0-9]/g, ""))}
      />

      <Text style={styles.fieldLabel}>País</Text>
      <Text style={styles.readOnlyText}>{FIXED_COUNTRY_LABEL}</Text>

      <Text style={styles.fieldLabel}>Provincia (Editable)</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          style={styles.picker}
          selectedValue={province}
          onValueChange={setProvince}
          itemStyle={styles.pickerItem}
        >
          {PROVINCES_AR.map((p) => (
            <Picker.Item key={p.code} label={p.label} value={p.code} />
          ))}
        </Picker>
      </View>

      <Text style={styles.fieldLabel}>Fecha de nacimiento (No editable)</Text>
      <Text style={styles.readOnlyText}>{toDDMMYYYY(profile.birthDate)}</Text>

      <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving || localSaving}>
        <Text style={styles.primaryButtonText}>{(saving || localSaving) ? "Guardando..." : "Guardar datos"}</Text>
      </Pressable>
      <Pressable style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Cancelar</Text>
      </Pressable>
      <Pressable style={styles.deleteButton} onPress={handleDelete} disabled={saving || localSaving}>
        <Text style={styles.deleteButtonText}>Eliminar cuenta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
    backgroundColor: "#f1f5f9",
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
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginTop: 8,
    marginBottom: 4,
  },
  readOnlyText: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#e2e8f0",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    marginBottom: 12,
  },
  picker: {
    height: 50,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  pickerItem: {
    fontSize: 16,
    color: "#0f172a",
  },
  primaryButton: {
    backgroundColor: "#0f172a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: 4,
    marginBottom: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#e2e8f0",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginBottom: 8,
  },
  cancelButtonText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  deleteButtonText: {
    color: "#b91c1c",
    fontSize: 16,
    fontWeight: "700",
  },
  pickerWrapper: {
    marginBottom: 12,
  },
});
