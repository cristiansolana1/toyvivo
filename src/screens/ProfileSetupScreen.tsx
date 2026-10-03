import { useState } from "react";
import { useToast } from "../hooks/useToast";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { UserProfile } from "../types";
import { PROVINCES_AR, FIXED_COUNTRY, FIXED_COUNTRY_LABEL } from "../constants";
import { formatBirthDateInput, toISODate } from "../utils/date";
import { validateProfile, getFirstValidationError, normalizeDNI } from "../utils/validation";

export function ProfileSetupScreen({
  onSaveProfile,
  saving,
}: {
  onSaveProfile: (profile: UserProfile) => Promise<void>;
  saving: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [dni, setDni] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("BA");
  const [birthDateISO, setBirthDateISO] = useState("");
  const [birthDateDisplay, setBirthDateDisplay] = useState("");
  const { showToast } = useToast();

  const handleSave = async () => {
    const profile: UserProfile = {
      fullName: fullName.trim(),
      dni: normalizeDNI(dni),
      phone: phone.trim(),
      country: FIXED_COUNTRY,
      province,
      birthDate: birthDateISO,
    };

    const validationResults = validateProfile(profile);
    const firstError = getFirstValidationError(validationResults);
    if (firstError) {
      Alert.alert("Faltan datos", firstError);
      return;
    }

    try {
      await onSaveProfile(profile);
      showToast({ text: "Tus datos se guardaron correctamente.", type: "success" });
    } catch (error) {
      const errorCode =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : null;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Failed to save user profile:", error);
      const visibleMessage =
        errorMessage === "DNI_ALREADY_REGISTERED"
          ? "Ese DNI ya está asociado a otra cuenta."
          : errorMessage === "UNAUTHENTICATED"
            ? "La sesión venció. Inicia sesión y vuelve a intentarlo."
            : errorMessage;
      Alert.alert(
        "No se pudieron guardar tus datos",
        errorCode ? `${errorCode}: ${visibleMessage}` : visibleMessage
      );
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Tus datos personales</Text>
      <Text style={styles.subtitle}>Solo se solicita una vez para activar tus avisos de seguridad.</Text>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Información personal</Text>
        <TextInput style={styles.input} placeholder="Nombre completo" placeholderTextColor="#64748b" value={fullName} onChangeText={setFullName} />
        <TextInput
          style={styles.input}
          placeholder="DNI"
          placeholderTextColor="#64748b"
          keyboardType="number-pad"
          value={dni}
          onChangeText={setDni}
        />
        <TextInput
          style={styles.input}
          placeholder="Fecha de nacimiento"
          placeholderTextColor="#64748b"
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
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Contacto de emergencia</Text>
        <TextInput
          style={styles.input}
          placeholder="Teléfono de contacto"
          placeholderTextColor="#64748b"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
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
      </View>

      <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
        <Text style={styles.primaryButtonText}>{saving ? "Guardando..." : "Guardar datos"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#edf3ef",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#15231f",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#587068",
    marginBottom: 18,
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#d5dfd8",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#244438",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#15231f",
    fontWeight: "700",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#c8d8cf",
    backgroundColor: "#f4f8f5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
    color: "#15231f",
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#38564b",
    marginTop: 6,
    marginBottom: 6,
  },
  picker: {
    height: 52,
    backgroundColor: "#f4f8f5",
    borderWidth: 1,
    borderColor: "#c8d8cf",
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  pickerWrapper: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  pickerItem: {
    fontSize: 16,
    color: "#0f172a",
  },
  fixedCountryText: {
    fontSize: 16,
    color: "#15231f",
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: "#286052",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 14,
  },
  primaryButtonText: {
    color: "#fffdf8",
    fontSize: 16,
    fontWeight: "700",
  },
});