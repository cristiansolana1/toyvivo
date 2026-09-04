import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, setDoc, where } from "firebase/firestore";
import { auth, db } from "./src/firebase";
import { loadLastHeartbeat, loadUserProfile, saveHeartbeat, saveUserProfile } from "./src/storage";
import { HeartbeatEntry, Survey, UserProfile, WatchedUserStatus } from "./src/types";

function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return "No se pudo continuar. Revisa los datos e intenta otra vez.";
  }

  switch (error.code) {
    case "auth/invalid-email":
      return "El correo no es valido.";
    case "auth/missing-password":
      return "La contrasena es obligatoria.";
    case "auth/weak-password":
      return "La contrasena debe tener al menos 6 caracteres.";
    case "auth/email-already-in-use":
      return "Este correo ya esta registrado.";
    case "auth/user-not-found":
      return "No existe una cuenta con este correo.";
    case "auth/wrong-password":
      return "La contraseña es incorrecta.";
    case "auth/user-disabled":
      return "Esta cuenta esta deshabilitada en Firebase.";
    case "auth/operation-not-allowed":
      return "Email/Password no esta habilitado en Firebase Authentication.";
    case "auth/network-request-failed":
      return "Error de red. Revisa tu conexion a internet.";
    case "auth/invalid-api-key":
      return "La API key de Firebase es invalida.";
    case "auth/invalid-credential":
      return "El correo o la contraseña no son validos.";
    case "auth/invalid-login-credentials":
      return "El correo o la contraseña no son validos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
    default:
      return `Error de Firebase: ${error.code}`;
  }
}

const HEARTBEAT_LIMIT_MS = 24 * 60 * 60 * 1000;

function isHeartbeatOverdue(lastHeartbeat: string | null, now = Date.now()): boolean {
  return !lastHeartbeat || now - new Date(lastHeartbeat).getTime() >= HEARTBEAT_LIMIT_MS;
}

function formatHeartbeatCountdown(lastHeartbeat: string | null, now = Date.now()): string {
  if (!lastHeartbeat) {
    return "Estoy bien";
  }

  const remainingMs = Math.max(0, HEARTBEAT_LIMIT_MS - (now - new Date(lastHeartbeat).getTime()));
  const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  return `Disponible en ${remainingHours}h ${remainingMinutes.toString().padStart(2, "0")}m`;
}

function AuthScreen({ onAccountCreated }: { onAccountCreated: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const buttonLabel = isLoginMode ? "Iniciar sesión" : "Crear cuenta";

  const handleSubmit = async () => {
    const normalizedEmail = email.trim();
    setAuthError(null);
    setAuthNotice(null);

    if (!normalizedEmail || !password) {
      setAuthError("Ingresa email y contraseña.");
      return;
    }

    if (!isLoginMode && password.length < 6) {
      setAuthError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setSubmitting(true);
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, normalizedEmail, password);
      } else {
        const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        onAccountCreated(credential.user);
      }
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim();
    setAuthError(null);
    setAuthNotice(null);

    if (!normalizedEmail) {
      setAuthError("Escribe tu correo para recuperar la contraseña.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      setAuthNotice("Te enviamos un enlace para cambiar la contraseña.");
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Aviso de vida</Text>
      <Text style={styles.subtitle}>Accede una sola vez para dejar tu sesión guardada.</Text>

      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        secureTextEntry
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
      />

      {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
      {authNotice ? <Text style={styles.noticeText}>{authNotice}</Text> : null}

      <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.primaryButtonText}>{submitting ? "Procesando..." : buttonLabel}</Text>
      </Pressable>

      <Pressable onPress={() => setIsLoginMode((prev) => !prev)}>
        <Text style={styles.linkText}>
          {isLoginMode ? "¿No tienes cuenta? Crear cuenta" : "¿Ya tienes cuenta? Iniciar sesión"}
        </Text>
      </Pressable>
      {isLoginMode ? (
        <Pressable onPress={() => void handlePasswordReset()}>
          <Text style={styles.resetText}>¿Olvidaste tu contraseña?</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ProfileSetupScreen({
  user,
  onSaved,
}: {
  user: User;
  onSaved: (profile: UserProfile) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [dni, setDni] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName || !dni || !phone) {
      Alert.alert("Faltan datos", "Completa todos los campos.");
      return;
    }

    const profile: UserProfile = {
      fullName: fullName.trim(),
      dni: dni.trim(),
      phone: phone.trim(),
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
      <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
        <Text style={styles.primaryButtonText}>{saving ? "Guardando..." : "Guardar datos"}</Text>
      </Pressable>
    </View>
  );
}

function HomeScreen({
  user,
  profile,
  onProfileUpdated,
  onSignOut,
}: {
  user: User;
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
  }, [profile]);

  useEffect(() => {
    async function loadSurvey() {
      const snapshot = await getDocs(collection(db, "surveys"));
      const activeSurveys = snapshot.docs
        .map((surveyDoc) => {
          const data = surveyDoc.data();
          return {
            id: surveyDoc.id,
            active: data.active as boolean | undefined,
            question: data.question as string | undefined,
            options: data.options as unknown,
            createdAt: data.createdAt as { toMillis?: () => number } | undefined,
          };
        })
        .filter((item) => item.active !== false && typeof item.question === "string" && Array.isArray(item.options))
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

    // Mantiene la lista sincronizada en tiempo real con Firestore.
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
    };

    if (!updatedProfile.fullName || !updatedProfile.dni || !updatedProfile.phone) {
      Alert.alert("Faltan datos", "Completa nombre, DNI y teléfono.");
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

  const handleSupport = async () => {
    const mailUrl = "mailto:cristiansolana1@gmail.com";
    const canOpenMail = await Linking.canOpenURL(mailUrl);
    if (!canOpenMail) {
      Alert.alert("Correo no disponible", "No se encontró una aplicación de correo en este dispositivo.");
      return;
    }

    await Linking.openURL(mailUrl);
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.topMenuRow}>
        <Pressable style={styles.profileMenuButton} onPress={() => setShowProfileEditor((previous) => !previous)}>
          <Text style={styles.profileMenuButtonText}>
            {showProfileEditor ? "Ocultar edición" : "Editar datos personales"}
          </Text>
        </Pressable>
        <Pressable style={styles.supportButton} onPress={() => void handleSupport()}>
          <Text style={styles.supportButtonText}>Soporte</Text>
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
      <Pressable style={styles.shareButton} onPress={() => void handleShareApp()}>
        <Text style={styles.shareButtonText}>Compartir aplicación</Text>
      </Pressable>
    </ScrollView>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    let resolved = false;
    const finishBoot = (currentUser: User | null, error?: unknown) => {
      if (resolved) {
        return;
      }

      resolved = true;
      setUser(currentUser);
      setBootError(error ? "No se pudo conectar con Firebase. Puedes intentar iniciar sesión." : null);
      setBootLoading(false);
    };

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => finishBoot(currentUser),
      (error) => finishBoot(null, error)
    );
    const timeout = setTimeout(() => finishBoot(null, new Error("Auth initialization timeout")), 8000);

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function hydrateProfile(currentUser: User | null) {
      if (!currentUser) {
        setProfile(null);
        return;
      }

      const localProfile = await loadUserProfile(currentUser.uid);
      if (localProfile) {
        setProfile(localProfile);
        return;
      }

      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const publicProfile = userDoc.data()?.publicProfile as
        | Pick<UserProfile, "fullName" | "dni" | "phone">
        | undefined;
      const legacyProfile = userDoc.data()?.profile as UserProfile | undefined;
      const cloudProfile: UserProfile | null = publicProfile
        ? {
            fullName: publicProfile.fullName,
            dni: publicProfile.dni,
            phone: publicProfile.phone,
          }
        : legacyProfile
          ? legacyProfile
          : null;

      if (cloudProfile) {
        await saveUserProfile(currentUser.uid, cloudProfile);
        setProfile(cloudProfile);
        return;
      }

      setProfile(null);
    }

    void hydrateProfile(user);
  }, [user]);

  if (bootLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#0f172a" />
          <Text style={styles.subtitle}>Cargando aplicación...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {!user ? (
        <>
          {bootError ? <Text style={styles.errorText}>{bootError}</Text> : null}
          <AuthScreen
            onAccountCreated={(createdUser) => {
              setProfile(null);
              setUser(createdUser);
            }}
          />
        </>
      ) : !profile ? (
        <ProfileSetupScreen user={user} onSaved={setProfile} />
      ) : (
        <HomeScreen
          user={user}
          profile={profile}
          onProfileUpdated={setProfile}
          onSignOut={handleSignOut}
        />
      )}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  errorText: {
    color: "#b91c1c",
    textAlign: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  noticeText: {
    color: "#15803d",
    textAlign: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  resetText: {
    textAlign: "center",
    color: "#2563eb",
    marginTop: 18,
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
  supportButton: {
    backgroundColor: "#dbeafe",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  supportButtonText: {
    color: "#1d4ed8",
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
});
