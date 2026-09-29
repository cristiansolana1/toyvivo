import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { UserProfile } from "../types";
import { PROVINCES_AR, FIXED_COUNTRY, FIXED_COUNTRY_LABEL } from "../constants";
import { toDDMMYYYY, formatBirthDateInput, toISODate } from "../utils/date";
import { validateProfile, getFirstValidationError } from "../utils/validation";

interface ProfileEditorProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => Promise<boolean>;
  onCancel: () => void;
  saving: boolean;
}

export function ProfileEditor({ profile, onSave, onCancel, saving }: ProfileEditorProps) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [dni, setDni] = useState(profile.dni);
  const [phone, setPhone] = useState(profile.phone);
  const [province, setProvince] = useState(profile.province ?? "BA");
  const [birthDateISO, setBirthDateISO] = useState(profile.birthDate ?? "");
  const [birthDateDisplay, setBirthDateDisplay] = useState(toDDMMYYYY(profile.birthDate ?? ""));
  const [localSaving, setLocalSaving] = useState(false);

  const handleSave = async () => {
    const updatedProfile: UserProfile = {
      fullName: fullName.trim(),
      dni: dni.trim(),
      phone: phone.trim(),
      country: FIXED_COUNTRY,
      province,
      birthDate: birthDateISO,
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
      Alert.alert("Guardado", "Tus datos se actualizaron correctamente.");
    } else {
      Alert.alert("Error", "No se pudieron guardar los cambios.");
    }
  };

  return (
    <View style={styles.editor}>
      <TextInput
        style={styles.input}
        placeholder="Nombre completo"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="DNI"
        keyboardType="number-pad"
        value={dni}
        onChangeText={(value) => setDni(value.replace(/[^0-9]/g, ""))}
      />
      <TextInput
        style={styles.input}
        placeholder="Teléfono"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={(value) => setPhone(value.replace(/[^0-9]/g, ""))}
      />
      <Text style={styles.pickerLabel}>País</Text>
      <Text style={styles.fixedCountryText}>{FIXED_COUNTRY_LABEL}</Text>
      <Text style={styles.pickerLabel}>Provincia</Text>
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

      <Text style={styles.pickerLabel}>Fecha de nacimiento</Text>
      <TextInput
        style={styles.input}
        placeholder="DD/MM/AAAA"
        value={birthDateDisplay}
        onChangeText={(value) => {
          const formatted = formatBirthDateInput(value);
          setBirthDateDisplay(formatted);
          const iso = toISODate(formatted);
          if (iso) setBirthDateISO(iso);
        }}
        keyboardType="numeric"
        maxLength={10}
      />
      <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving || localSaving}>
        <Text style={styles.primaryButtonText}>{(saving || localSaving) ? "Guardando..." : "Guardar datos"}</Text>
      </Pressable>
      <Pressable style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Cancelar</Text>
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
  pickerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginTop: 12,
    marginBottom: 4,
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
  fixedCountryText: {
    fontSize: 16,
    color: "#0f172a",
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#0f172a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
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
  },
  cancelButtonText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "600",
  },
  pickerWrapper: {
    marginBottom: 12,
  },
});