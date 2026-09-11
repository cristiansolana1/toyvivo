import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { saveUserProfile } from "../storage";
import { UserProfile } from "../types";
import { PROVINCES_AR, FIXED_COUNTRY, FIXED_COUNTRY_LABEL } from "../constants";

export function ProfileSetupScreen({
  user,
  onSaved,
}: {
  user: any;
  onSaved: (profile: UserProfile) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [dni, setDni] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("BA");
  const [birthDate, setBirthDate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName || !dni || !phone || !province || !birthDate) {
      Alert.alert("Faltan datos", "Completa todos los campos.");
      return;
    }

    const profile: UserProfile = {
      fullName: fullName.trim(),
      dni: dni.trim(),
      phone: phone.trim(),
      country: FIXED_COUNTRY,
      province,
      birthDate,
    };

    try {
      setSaving(true);
      await saveUserProfile(user.uid, profile);
      await setDoc(
        doc(db, "users", user.uid),
        {
          publicProfile: {
            fullName: profile.fullName,
            dni: profile.dni,
            phone: profile.phone,
            country: profile.country,
            province: profile.province,
            birthDate: profile.birthDate,
          },
          emailNormalized: user.email?.toLowerCase() ?? "",
          profileUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      onSaved(profile);
    } catch (error) {
      Alert.alert("Error", "No se pudieron guardar tus datos.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Tus datos personales</Text>
      <Text style={styles.subtitle}>Solo se solicita una vez.</Text>

      <TextInput style={styles.input} placeholder="Nombre completo" value={fullName} onChangeText={setFullName} />
      <TextInput
        style={styles.input}
        placeholder="DNI"
        keyboardType="number-pad"
        value={dni}
        onChangeText={setDni}
      />
      <TextInput
        style={styles.input}
        placeholder="Teléfono"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
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
          // Solo permitir números y guiones, máximo 10 caracteres (YYYY-MM-DD)
          const cleaned = value.replace(/[^0-9-]/g, "").slice(0, 10);
          setBirthDate(cleaned);
        }}
        keyboardType="numeric"
      />
      <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
        <Text style={styles.primaryButtonText}>{saving ? "Guardando..." : "Guardar datos"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#334155",
    marginBottom: 18,
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
    marginBottom: 14,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});