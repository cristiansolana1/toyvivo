import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useHeartbeat } from "../hooks/useHeartbeat";
import { useWatchedUsers } from "../hooks/useWatchedUsers";
import { useSurvey } from "../hooks/useSurvey";
import { useProfile } from "../hooks/useProfile";
import { HeartbeatButton } from "../components/HeartbeatButton";
import { WatchedUserCard } from "../components/WatchedUserCard";
import { ProfileEditor } from "../components/ProfileEditor";
import { SurveyCard } from "../components/SurveyCard";
import { AddUserForm } from "../components/AddUserForm";
import { isHeartbeatOverdue, formatHeartbeatCountdown, FIXED_COUNTRY_LABEL, PROVINCES_AR } from "../constants";

export function HomeScreen({
  user,
  profile,
  onProfileUpdated,
  onSignOut,
}: {
  user: any;
  profile: any;
  onProfileUpdated: (profile: any) => void;
  onSignOut: () => Promise<void>;
}) {
  const {
    lastHeartbeat,
    sending,
    currentTime,
    formattedLastHeartbeat,
    overdue,
    countdownText,
    handleHeartbeat,
  } = useHeartbeat(user.uid);

  const {
    watchingUserIds,
    watchedUsers,
    addingWatch,
    watchMessage,
    addWatchedUser,
    removeWatchedUser,
    setWatchMessage,
  } = useWatchedUsers(user.uid);

  const {
    survey,
    surveyAnswer,
    setSurveyAnswer,
    surveySubmitted,
    surveyMessage,
    submittingSurvey,
    handleSurveySubmit,
  } = useSurvey(user.uid);

  const { profile: currentProfile, savingProfile, saveProfile } = useProfile(user.uid, profile);

  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [watchDni, setWatchDni] = useState("");

  const sortedWatchedUsers = useMemo(() => {
    return [...watchedUsers].sort((a, b) => {
      const aMs = a.lastAliveAt ? new Date(a.lastAliveAt).getTime() : 0;
      const bMs = b.lastAliveAt ? new Date(b.lastAliveAt).getTime() : 0;
      return bMs - aMs;
    });
  }, [watchedUsers]);

  const handleSaveProfile = async (updatedProfile: any) => {
    const success = await saveProfile(updatedProfile);
    if (success) {
      onProfileUpdated(updatedProfile);
      setShowProfileEditor(false);
    } else {
      Alert.alert("Error", "No se pudieron actualizar tus datos personales.");
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

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.topMenuRow}>
        <Pressable style={styles.profileMenuButton} onPress={() => setShowProfileEditor((previous) => !previous)}>
          <Text style={styles.profileMenuButtonText}>
            {showProfileEditor ? "Ocultar edición" : "Editar datos personales"}
          </Text>
        </Pressable>
      </View>
      {showProfileEditor && currentProfile ? (
        <ProfileEditor
          profile={currentProfile}
          onSave={handleSaveProfile}
          onCancel={() => setShowProfileEditor(false)}
          saving={savingProfile}
        />
      ) : null}

      <Text style={styles.title}>Hola, {currentProfile?.fullName ?? profile.fullName}</Text>
      <Text style={[styles.subtitle, overdue && styles.overdueText]}>
        Último aviso: {formattedLastHeartbeat}
      </Text>

      {survey ? (
        <SurveyCard
          survey={survey}
          answer={surveyAnswer}
          onAnswerSelect={setSurveyAnswer}
          onSubmit={handleSurveySubmit}
          submitting={submittingSurvey}
          submitted={surveySubmitted}
          message={surveyMessage}
        />
      ) : null}

      <HeartbeatButton
        onPress={handleHeartbeat}
        disabled={sending || !overdue}
        sending={sending}
        countdownText={countdownText}
        overdue={overdue}
      />

      <Text style={styles.sectionTitle}>Ver estado de otros usuarios</Text>
      <Text style={styles.counterText}>Agregados: {watchingUserIds.length}</Text>
      <AddUserForm
        value={watchDni}
        onChangeText={setWatchDni}
        onSubmit={() => addWatchedUser(watchDni)}
        disabled={addingWatch}
        message={watchMessage}
      />

      {sortedWatchedUsers.map((watchedUser) => (
        <WatchedUserCard
          key={watchedUser.uid}
          user={watchedUser}
          onCall={callWatchedUser}
          onRemove={removeWatchedUser}
          overdue={isHeartbeatOverdue(watchedUser.lastAliveAt, currentTime)}
        />
      ))}

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