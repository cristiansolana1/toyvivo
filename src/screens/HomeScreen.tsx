import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { FirebaseError } from "firebase/app";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { loadLastHeartbeat, loadUserProfile, saveHeartbeat, saveUserProfile } from "../storage";
import { HeartbeatEntry, Survey, UserProfile, WatchedUserStatus } from "../types";
import { PROVINCES_AR, FIXED_COUNTRY, FIXED_COUNTRY_LABEL, isHeartbeatOverdue, formatHeartbeatCountdown } from "../constants";

export function HomeScreen({
  user,
  profile,
  onProfileUpdated,
  onSignOut,
}: {
  user: any;
  profile: UserProfile;
  onProfileUpdated: (profile: UserProfile) => void;
  onSignOut: () => Promise<void>;
}) {
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [fullName, setFullName] = useState(profile.fullName);
  const [dni, setDni] = useState(profile.dni);
  const [phone, setPhone] = useState(profile.phone);
  const [province, setProvince] = useState(profile.province ?? "BA");
  const [birthDate, setBirthDate] = useState(profile.birthDate ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [watchDni, setWatchDni] = useState("");
  const [watchingUserIds, setWatchingUserIds] = useState<string[]>([]);
  const [watchedUsers, setWatchedUsers] = useState<WatchedUserStatus[]>([]);
  const [addingWatch, setAddingWatch] = useState(false);
  const [watchMessage, setWatchMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [surveyAnswer, setSurveyAnswer] = useState<string | null>(null);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [surveyMessage, setSurveyMessage] = useState<string | null>(null);
  const [submittingSurvey, setSubmittingSurvey] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setFullName(profile.fullName);
    setDni(profile.dni);
    setPhone(profile.phone);
    setProvince(profile.province ?? "BA");
    setBirthDate(profile.birthDate ?? "");
  }, [profile]);

  useEffect(() => {
    async function loadSurvey() {
      const snapshot = await getDocs(collection(db, "surveys"));
      const now = Date.now();
      const activeSurveys = snapshot.docs
        .map((surveyDoc) => {
          const data = surveyDoc.data();
          return {
            id: surveyDoc.id,
            active: data.active as boolean | undefined,
            question: data.question as string | undefined,
            options: data.options as unknown,
            createdAt: data.createdAt as { toMillis?: () => number } | undefined,
            startAt: data.startAt as { toMillis?: () => number } | undefined,
            endAt: data.endAt as { toMillis?: () => number } | undefined,
          };
        })
        .filter((item) => {
          if (item.active === false) return false;
          if (typeof item.question !== "string") return false;
          if (!Array.isArray(item.options)) return false;
          const start = item.startAt?.toMillis?.() ?? 0;
          const end = item.endAt?.toMillis?.() ?? 0;
          if (start && now < start) return false;
          if (end && now > end) return false;
          return true;
        })
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));

      let unansweredSurvey: (typeof activeSurveys)[number] | undefined;
      for (const candidate of activeSurveys) {
        const response = await getDoc(doc(db, "surveys", candidate.id, "responses", user.uid));
        if (!response.exists()) {
          unansweredSurvey = candidate;
          break;
        }
      }

      if (!unansweredSurvey) {
        setSurvey(null);
        return;
      }

      const currentSurvey: Survey = {
        id: unansweredSurvey.id,
        question: unansweredSurvey.question ?? "",
        options: (unansweredSurvey.options as unknown[])
          .filter((option): option is string => typeof option === "string")
          .slice(0, 4),
      };
      setSurvey(currentSurvey);
      setSurveySubmitted(false);
    }

    void loadSurvey().catch(() => setSurveyMessage("No se pudo cargar la encuesta."));
  }, [user.uid]);

  const hydrateWatchedUsers = async (ids: string[]) => {
    if (ids.length === 0) {
      setWatchedUsers([]);
      return;
    }

    const pendingUsers = await Promise.all(
      ids
        .filter((id) => id.startsWith("dni:"))
        .map(async (id) => {
          const dni = id.slice("dni:".length);
          const [publicResult, legacyResult] = await Promise.all([
            getDocs(query(collection(db, "users"), where("publicProfile.dni", "==", dni))),
            getDocs(query(collection(db, "users"), where("profile.dni", "==", dni))),
          ]);
          const userDoc = [...publicResult.docs, ...legacyResult.docs][0];
          if (!userDoc) {
            return { uid: id, fullName: "Usuario sin Cuenta", phone: "", lastAliveAt: null };
          }

          const data = userDoc.data();
          return {
            uid: id,
            fullName:
              (data?.publicProfile?.fullName as string | undefined) ??
              (data?.profile?.fullName as string | undefined) ??
              "Usuario sin Cuenta",
            phone:
              (data?.publicProfile?.phone as string | undefined) ??
              (data?.profile?.phone as string | undefined) ??
              "",
            lastAliveAt: data?.lastAliveAt?.toDate?.()?.toISOString?.() ?? null,
          };
        })
    );
    const registeredIds = ids.filter((id) => !id.startsWith("dni:"));
    const docs = await Promise.all(registeredIds.map((uid) => getDoc(doc(db, "users", uid))));
    const mapped = docs
      .filter((userDoc) => userDoc.exists())
      .map((userDoc) => {
        const data = userDoc.data();
        return {
          uid: userDoc.id,
          fullName:
            (data?.publicProfile?.fullName as string | undefined) ??
            (data?.profile?.fullName as string | undefined) ??
            "Usuario sin Cuenta",
          phone:
            (data?.publicProfile?.phone as string | undefined) ??
            (data?.profile?.phone as string | undefined) ??
            "",
          lastAliveAt: data?.lastAliveAt?.toDate?.()?.toISOString?.() ?? null,
        };
      });

    setWatchedUsers([...pendingUsers, ...mapped]);
  };

  useEffect(() => {
    async function loadData() {
      const last = await loadLastHeartbeat(user.uid);
      setLastHeartbeat(last);
    }
    void loadData();
  }, [user.uid]);

  const formattedLastHeartbeat = useMemo(() => {
    if (!lastHeartbeat) {
      return "Sin registro todavía.";
    }
    return new Date(lastHeartbeat).toLocaleString();
  }, [lastHeartbeat]);

  useEffect(() => {
    async function loadWatchingUsers() {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const ids = userDoc.data()?.watchingUserIds as string[] | undefined;
      setWatchingUserIds(ids ?? []);
    }
    void loadWatchingUsers();
  }, [user.uid]);

  useEffect(() => {
    void hydrateWatchedUsers(watchingUserIds);
  }, [watchingUserIds]);

  const sortedWatchedUsers = useMemo(() => {
    return [...watchedUsers].sort((a, b) => {
      const aMs = a.lastAliveAt ? new Date(a.lastAliveAt).getTime() : 0;
      const bMs = b.lastAliveAt ? new Date(b.lastAliveAt).getTime() : 0;
      return bMs - aMs;
    });
  }, [watchedUsers]);

  useEffect(() => {
    if (watchingUserIds.length === 0) {
      setWatchedUsers([]);
      return;
    }

    const unsubscribers = watchingUserIds.filter((watchedUserId) => !watchedUserId.startsWith("dni:")).map((watchedUserId) =>
      onSnapshot(doc(db, "users", watchedUserId), (snapshot) => {
        if (!snapshot.exists()) {
          setWatchedUsers((prev) => prev.filter((item) => item.uid !== watchedUserId));
          return;
        }

        const data = snapshot.data();
        const updatedUser: WatchedUserStatus = {
          uid: snapshot.id,
          fullName:
            (data?.publicProfile?.fullName as string | undefined) ??
            (data?.profile?.fullName as string | undefined) ??
            "Usuario sin Cuenta",
          phone:
            (data?.publicProfile?.phone as string | undefined) ??
            (data?.profile?.phone as string | undefined) ??
            "",
          lastAliveAt: data?.lastAliveAt?.toDate?.()?.toISOString?.() ?? null,
        };

        setWatchedUsers((prev) => {
          const withoutCurrent = prev.filter((item) => item.uid !== updatedUser.uid);
          return [...withoutCurrent, updatedUser];
        });
      })
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [watchingUserIds]);

  const addWatchedUser = async () => {
    const normalizedDni = watchDni.trim();
    setWatchMessage(null);
    if (!normalizedDni) {
      setWatchMessage("Ingresa el DNI del usuario a seguir.");
      return;
    }
    try {
      setAddingWatch(true);
      const [publicResult, legacyResult] = await Promise.all([
        getDocs(query(collection(db, "users"), where("publicProfile.dni", "==", normalizedDni))),
        getDocs(query(collection(db, "users"), where("profile.dni", "==", normalizedDni))),
      ]);
      const matchingDocuments = [...publicResult.docs, ...legacyResult.docs];
      const targetUserId = matchingDocuments.length > 0 ? matchingDocuments[0].id : `dni:${normalizedDni}`;
      if (targetUserId === user.uid) {
        setWatchMessage("No puedes agregarte a ti mismo.");
        return;
      }
      if (watchingUserIds.includes(targetUserId)) {
        setWatchMessage("Ese usuario ya está en tu lista.");
        return;
      }

      const updatedIds = [...watchingUserIds, targetUserId];
      await setDoc(doc(db, "users", user.uid), { watchingUserIds: updatedIds }, { merge: true });
      setWatchingUserIds(updatedIds);
      setWatchDni("");
      setWatchMessage(
        matchingDocuments.length > 0
          ? "Usuario agregado correctamente."
          : "Usuario sin Cuenta agregado correctamente."
      );
    } catch (error) {
      const message = error instanceof FirebaseError && error.code === "permission-denied"
        ? "Firebase no permite consultar usuarios. Revisa las reglas de Firestore."
        : "No se pudo agregar al usuario. Revisa tu conexión e inténtalo de nuevo.";
      setWatchMessage(message);
    } finally {
      setAddingWatch(false);
    }
  };

  const removeWatchedUser = async (targetUserId: string) => {
    const updatedIds = watchingUserIds.filter((uid) => uid !== targetUserId);
    try {
      await setDoc(doc(db, "users", user.uid), { watchingUserIds: updatedIds }, { merge: true });
      setWatchingUserIds(updatedIds);
    } catch (error) {
      Alert.alert("Error", "No se pudo quitar al usuario.");
    }
  };

  const callWatchedUser = async (phone: string) => {
    const sanitizedPhone = phone.replace(/[^0-9+]/g, "");
    if (!sanitizedPhone || sanitizedPhone.replace(/[^0-9]/g, "").length < 5) {
      Alert.alert("Sin teléfono", "Este usuario no tiene teléfono registrado.");
      return;
    }

    const telUrl = `tel:${sanitizedPhone}`;
    try {
      await Linking.openURL(telUrl);
    } catch {
      Alert.alert("No disponible", "No se pudo abrir la aplicación de llamadas en este dispositivo.");
    }
  };

  const handleHeartbeat = async () => {
    const heartbeat: HeartbeatEntry = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: "alive",
    };

    try {
      setSending(true);
      await saveHeartbeat(user.uid, heartbeat);
      setLastHeartbeat(heartbeat.createdAt);

      await addDoc(collection(db, "users", user.uid, "heartbeats"), {
        status: heartbeat.status,
        createdAt: serverTimestamp(),
        deviceCreatedAt: heartbeat.createdAt,
      });
      await setDoc(
        doc(db, "users", user.uid),
        {
          emailNormalized: user.email?.toLowerCase() ?? "",
          lastAliveAt: serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert("Aviso enviado", "Tu estado fue registrado localmente y en la nube.");
    } catch (error) {
      Alert.alert(
        "Guardado local",
        "Se guardó en el teléfono. Cuando tengas internet, vuelve a presionar para sincronizar en nube."
      );
    } finally {
      setSending(false);
    }
  };

  const handleSaveProfile = async () => {
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

    try {
      setSavingProfile(true);
      await saveUserProfile(user.uid, updatedProfile);
      await setDoc(
        doc(db, "users", user.uid),
        {
          publicProfile: updatedProfile,
          profileUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      onProfileUpdated(updatedProfile);
      setShowProfileEditor(false);
    } catch {
      Alert.alert("Error", "No se pudieron actualizar tus datos personales.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSurveySubmit = async () => {
    if (!survey || !surveyAnswer || surveySubmitted) {
      return;
    }

    try {
      setSubmittingSurvey(true);
      const responseRef = doc(db, "surveys", survey.id, "responses", user.uid);
      await runTransaction(db, async (transaction) => {
        const response = await transaction.get(responseRef);
        if (response.exists()) {
          throw new Error("SURVEY_ALREADY_ANSWERED");
        }
        transaction.set(responseRef, {
          answer: surveyAnswer,
          answeredAt: serverTimestamp(),
        });
      });
      setSurveySubmitted(true);
      setSurveyMessage("Respuesta registrada correctamente.");
      setSurvey(null);
    } catch (error) {
      setSurveyMessage(
        error instanceof Error && error.message === "SURVEY_ALREADY_ANSWERED"
          ? "Ya respondiste esta encuesta."
          : "No se pudo registrar la respuesta. Inténtalo nuevamente."
      );
    } finally {
      setSubmittingSurvey(false);
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: "Te invito a usar Aviso de vida para compartir avisos y cuidar a tus contactos.",
        title: "Invitar a Aviso de vida",
      });
    } catch {
      Alert.alert("No disponible", "No se pudo abrir el menú para compartir.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.topMenuRow}>
        <Pressable style={styles.profileMenuButton} onPress={() => setShowProfileEditor((previous) => !previous)}>
          <Text style={styles.profileMenuButtonText}>
            {showProfileEditor ? "Ocultar edición" : "Editar datos personales"}
          </Text>
        </Pressable>
      </View>
      {showProfileEditor ? (
        <View style={styles.profileEditor}>
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
          <Pressable style={styles.primaryButton} onPress={() => void handleSaveProfile()} disabled={savingProfile}>
            <Text style={styles.primaryButtonText}>{savingProfile ? "Guardando..." : "Guardar datos"}</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.title}>Hola, {profile.fullName}</Text>
      <Text style={[styles.subtitle, isHeartbeatOverdue(lastHeartbeat, currentTime) && styles.overdueText]}>
        Último aviso: {formattedLastHeartbeat}
      </Text>

      {survey ? (
        <View style={styles.surveyCard}>
          <Text style={styles.sectionTitle}>Encuesta</Text>
          <Text style={styles.surveyQuestion}>{survey.question}</Text>
          {survey.options.map((option) => (
            <Pressable
              key={option}
              style={[styles.surveyOption, surveyAnswer === option && styles.surveyOptionSelected]}
              onPress={() => setSurveyAnswer(option)}
              disabled={surveySubmitted}
            >
              <Text style={styles.surveyOptionText}>{option}</Text>
            </Pressable>
          ))}
          {!surveySubmitted ? (
            <Pressable style={styles.primaryButton} onPress={() => void handleSurveySubmit()} disabled={submittingSurvey}>
              <Text style={styles.primaryButtonText}>{submittingSurvey ? "Enviando..." : "Responder encuesta"}</Text>
            </Pressable>
          ) : null}
          {surveyMessage ? <Text style={styles.noticeText}>{surveyMessage}</Text> : null}
        </View>
      ) : null}

      <Pressable
        style={[styles.aliveButton, !isHeartbeatOverdue(lastHeartbeat, currentTime) && styles.aliveButtonDisabled]}
        onPress={handleHeartbeat}
        disabled={sending || !isHeartbeatOverdue(lastHeartbeat, currentTime)}
      >
        <Text style={styles.aliveButtonText}>
          {sending ? "Enviando..." : formatHeartbeatCountdown(lastHeartbeat, currentTime)}
        </Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Ver estado de otros usuarios</Text>
      <Text style={styles.counterText}>Agregados: {watchingUserIds.length}</Text>
      <View style={styles.addUserRow}>
        <TextInput
          style={[styles.input, styles.dniInput]}
          keyboardType="number-pad"
          placeholder="DNI del usuario"
          value={watchDni}
          onChangeText={(value) => {
            setWatchDni(value.replace(/[^0-9]/g, ""));
            setWatchMessage(null);
          }}
        />
        <Pressable style={[styles.primaryButton, styles.addUserButton]} onPress={addWatchedUser} disabled={addingWatch}>
          <Text style={styles.primaryButtonText}>{addingWatch ? "Agregando..." : "Agregar usuario"}</Text>
        </Pressable>
      </View>
      {watchMessage ? <Text style={styles.noticeText}>{watchMessage}</Text> : null}

      {sortedWatchedUsers.map((watchedUser) => {
        return (
          <View key={watchedUser.uid} style={styles.watchedCard}>
            <View style={styles.watchedHeader}>
              <Text style={styles.watchedName}>{watchedUser.fullName}</Text>
            </View>
            <Text style={[styles.watchedStatus, isHeartbeatOverdue(watchedUser.lastAliveAt, currentTime) && styles.overdueText]}>
              Último aviso:{" "}
              {watchedUser.lastAliveAt ? new Date(watchedUser.lastAliveAt).toLocaleString() : "Sin aviso todavía"}
            </Text>
            <View style={styles.cardActions}>
              <Pressable onPress={() => void callWatchedUser(watchedUser.phone)}>
                <Text style={styles.callText}>Llamar</Text>
              </Pressable>
              <Pressable onPress={() => removeWatchedUser(watchedUser.uid)}>
                <Text style={styles.removeText}>Quitar</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Pressable onPress={() => void onSignOut()}>
        <Text style={styles.linkText}>Cerrar sesión</Text>
      </Pressable>
      <View style={styles.bottomButtonsRow}>
        <Pressable style={styles.shareButton} onPress={() => void handleShareApp()}>
          <Text style={styles.shareButtonText}>Compartir aplicación</Text>
        </Pressable>
        <Pressable style={styles.instagramButton} onPress={() => void Linking.openURL("https://www.instagram.com/estoybien.arg")}>
          <Text style={styles.instagramButtonText}>📷 Instagram</Text>
        </Pressable>
      </View>
    </ScrollView>
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
  overdueText: {
    color: "#dc2626",
    fontWeight: "700",
  },
  noticeText: {
    color: "#15803d",
    textAlign: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
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
  addUserRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  dniInput: {
    flex: 1,
  },
  addUserButton: {
    flexShrink: 0,
    minWidth: 132,
    minHeight: 48,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  topMenuRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  profileMenuButton: {
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  profileMenuButtonText: {
    color: "#0f172a",
    fontWeight: "700",
  },
  profileEditor: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
    backgroundColor: "#f1f5f9",
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
  linkText: {
    textAlign: "center",
    color: "#2563eb",
    fontWeight: "600",
  },
  shareButton: {
    alignSelf: "center",
    marginTop: 28,
    marginBottom: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#2563eb",
  },
  shareButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  aliveButton: {
    marginVertical: 26,
    borderRadius: 999,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16a34a",
    paddingHorizontal: 20,
  },
  aliveButtonDisabled: {
    backgroundColor: "#94a3b8",
  },
  aliveButtonText: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "800",
  },
  surveyCard: {
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 10,
    backgroundColor: "#eff6ff",
  },
  surveyQuestion: {
    marginBottom: 14,
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
  },
  surveyOption: {
    padding: 13,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  surveyOptionSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#dbeafe",
  },
  surveyOptionText: {
    color: "#1e3a8a",
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },
  counterText: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 10,
  },
  watchedCard: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  watchedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  watchedName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  watchedStatus: {
    fontSize: 14,
    color: "#334155",
    marginBottom: 8,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  callText: {
    color: "#2563eb",
    fontWeight: "700",
  },
  removeText: {
    color: "#dc2626",
    fontWeight: "700",
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
  bottomButtonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 28,
    marginBottom: 12,
  },
  instagramButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#E1306C",
  },
  instagramButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});