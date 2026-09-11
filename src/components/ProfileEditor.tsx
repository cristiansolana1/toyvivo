import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { UserProfile } from "../types";
import { PROVINCES_AR, FIXED_COUNTRY, FIXED_COUNTRY_LABEL } from "../constants";

interface ProfileEditorProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onCancel: () => void;
  saving: boolean;
}

export function ProfileEditor({ profile, onSave, onCancel, saving }: ProfileEditorProps) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [dni, setDni] = useState(profile.dni);
  const [phone, setPhone] = useState(profile.phone);
  const [province, setProvince] = useState(profile.province ?? "BA");
  const [birthDate, setBirthDate] = useState(profile.birthDate ?? "");

  const handleSave = () => {
    const updatedProfile: UserProfile = {
      fullName: fullName.trim(),
      dni: dni.trim(),
      phone: phone.trim(),
      country: FIXED_COUNTRY,
      province,
      birthDate,
    };

    if (!updatedProfile.fullName || !updatedProfile.dni || !updatedProfile.phone || !updatedProfile.province || !updatedProfile.birthDate) {
      Alert.alert("Faltan datos", "Completa nombre, DNI, teléfono, provincia y fecha de nacimiento.");
      return;
    }

    onSave(updatedProfile);
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
      <Text style={styles.pickerLabel}>Fecha de nacimiento</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={birthDate}
        onChangeText={(value) => {
          const cleaned = value.replace(/[^0-9-]/g, "").slice(0, 10);
          setBirthDate(cleaned);
        }}
        keyboardType="numeric"
      />
      <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
        <Text style={styles.primaryButtonText}>{saving ? "Guardando..." : "Guardar datos"}</Text>
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
});