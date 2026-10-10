import React, { useCallback, useEffect, useState } from "react";
import { useToast } from "../hooks/useToast";
import { Linking, RefreshControl, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeartbeat } from "../hooks/useHeartbeat";
import { useWatchedUsers } from "../hooks/useWatchedUsers";
import { useContactRequests } from "../hooks/useContactRequests";
import { useSurvey } from "../hooks/useSurvey";
import { HeartbeatButton } from "../components/HeartbeatButton";
import { ProfileEditor } from "../components/ProfileEditor";
import { SurveyCard } from "../components/SurveyCard";
import { StatusHeader } from "../components/StatusHeader";
import { ContactRequestsSection } from "../components/ContactRequestsSection";
import { WatchedUsersSection } from "../components/WatchedUsersSection";
import { User } from "firebase/auth";
import { UserProfile } from "../types";
import { deleteUserAccount } from "../services/authService";
import { requestNotificationPermissions } from "../services/notificationService";

export function HomeScreen({
  user,
  profile,
  onSaveProfile,
  saving,
  onSignOut,
}: {
  user: User | null;
  profile: UserProfile | null;
  onSaveProfile: (profile: UserProfile) => Promise<void>;
  saving: boolean;
  onSignOut: () => Promise<void>;
}) {
  if (!user) return null;
  const currentProfile = profile;
  const insets = useSafeAreaInsets();

  const {
    lastHeartbeat,
    sending,
    currentTime,
    formattedLastHeartbeat,
    overdue,
    countdownText,
    handleHeartbeat,
    syncPending,
    pendingCount,
    isOnline,
  } = useHeartbeat(user.uid);

  const {
    watchingUserIds,
    watchedUsers,
    addingWatch,
    watchMessage,
    addWatchedUser,
    removeWatchedUser,
  } = useWatchedUsers(user.uid);

  const {
    requests: contactRequests,
    error: contactRequestError,
    respondingUid,
    respond: respondToRequest,
  } = useContactRequests(user.uid);

  const {
    survey,
    surveyAnswer,
    setSurveyAnswer,
    surveySubmitted,
    surveyMessage,
    submittingSurvey,
    handleSurveySubmit,
    loadSurvey,
  } = useSurvey(user.uid, currentProfile ?? undefined);

  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [watchDni, setWatchDni] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      requestNotificationPermissions(user.uid);
    }
  }, [user?.uid]);

  const [entryError, setEntryError] = useState<string | null>(null);
  const { showToast } = useToast();

  const clearEntryError = useCallback(() => setEntryError(null), []);

  const handleSaveProfile = useCallback(async (updatedProfile: UserProfile): Promise<boolean> => {
    try {
      clearEntryError();
      await onSaveProfile(updatedProfile);
      setShowProfileEditor(false);
      return true;
    } catch (error) {
      clearEntryError();
      setEntryError("Error al guardar: " + (error instanceof Error ? error.message : "Error desconocido"));
      return false;
    }
  }, [clearEntryError, onSaveProfile]);

  const callWatchedUser = useCallback(async (phone: string) => {
    const sanitizedPhone = phone.replace(/[^0-9+]/g, "");
    if (!sanitizedPhone || sanitizedPhone.replace(/[^0-9]/g, "").length < 5) {
      showToast({ text: "Este usuario no tiene teléfono registrado.", type: "error" });
      return;
    }
    const telUrl = `tel:${sanitizedPhone}`;
    try {
      await Linking.openURL(telUrl);
      showToast({ text: "Llamada iniciada.", type: "info" });
    } catch {
      showToast({ text: "No se pudo abrir la aplicación de llamadas.", type: "error" });
    }
  }, [showToast]);

  const messageWatchedUser = useCallback(async (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (!digits || digits.length < 8) {
      showToast({ text: "Este usuario no tiene teléfono registrado.", type: "error" });
      return;
    }

    const whatsappNumber = digits.startsWith("54") ? digits : `54${digits.replace(/^0+/, "")}`;
    const message = encodeURIComponent("Hola, te escribo desde la app de Aviso de vida.");
    const appUrl = `whatsapp://send?phone=${whatsappNumber}&text=${message}`;
    const webUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

    try {
      const canOpenApp = await Linking.canOpenURL(appUrl);
      await Linking.openURL(canOpenApp ? appUrl : webUrl);
      showToast({ text: "Se abrió WhatsApp.", type: "info" });
    } catch {
      showToast({ text: "No se pudo abrir WhatsApp.", type: "error" });
    }
  }, [showToast]);

  const handleToggleProfileEditor = useCallback(() => {
    setShowProfileEditor((prev) => !prev);
  }, []);

  const handleAddWatch = useCallback(async () => {
    const ok = await addWatchedUser(watchDni);
    if (ok) setWatchDni("");
  }, [addWatchedUser, watchDni]);

  const handleSignOut = useCallback(() => {
    void onSignOut();
  }, [onSignOut]);

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            try {
              await Promise.all([
                syncPending(),
                loadSurvey(),
              ]);
              showToast({ text: "Datos actualizados correctamente.", type: "success" });
            } catch {
              showToast({ text: "Error al actualizar los datos.", type: "error" });
            } finally {
              setRefreshing(false);
            }
          }}
        />
      }
      contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom + 32, 56) }]}>

      <StatusHeader
        fullName={profile?.fullName}
        email={user?.email}
        showProfileEditor={showProfileEditor}
        onToggleProfileEditor={handleToggleProfileEditor}
      />

      {entryError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{entryError}</Text>
        </View>
      )}

      <ContactRequestsSection
        requests={contactRequests}
        error={contactRequestError}
        respondingUid={respondingUid}
        onRespond={respondToRequest}
      />

      {showProfileEditor && currentProfile?.fullName ? (
        <ProfileEditor
          profile={currentProfile}
          onSave={handleSaveProfile}
          onCancel={() => setShowProfileEditor(false)}
          saving={saving}
          onDelete={async () => {
            await deleteUserAccount(user.uid);
            await onSignOut();
          }}
        />
      ) : null}

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
        pendingCount={pendingCount}
        isOnline={isOnline}
      />

      <WatchedUsersSection
        watchingUserIds={watchingUserIds}
        watchedUsers={watchedUsers}
        addingWatch={addingWatch}
        watchMessage={watchMessage}
        watchDni={watchDni}
        onChangeWatchDni={setWatchDni}
        onAddWatch={handleAddWatch}
        onCall={callWatchedUser}
        onWhatsApp={messageWatchedUser}
        onRemove={removeWatchedUser}
        currentTime={currentTime}
      />

      <Pressable style={styles.logoutButton} onPress={handleSignOut}>
        <Text style={styles.linkText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#edf3ef",
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 28,
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
  logoutButton: {
    alignSelf: "center",
    width: "100%",
    marginTop: 18,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#d5dfd8",
  },
  linkText: {
    textAlign: "center",
    color: "#9d4e30",
    fontWeight: "700",
  },
  errorBanner: {
    backgroundColor: "#f8d7da",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f5c6cb",
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: "#842029",
    fontWeight: "500",
  },
});
