import React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../hooks/useToast";
import { Alert, Linking, RefreshControl, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SkeletonLoader } from "../components/SkeletonLoader";
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
import { getWatchedUsersStatus, getWatchingUserIds } from "../services/userService";
import { User } from "firebase/auth";
import { UserProfile } from "../types";

export function HomeScreen({
  user,
  profile,
  onProfileUpdated,
  onSignOut,
}: {
  user: User | null;
  profile: UserProfile | null;
  onProfileUpdated: (profile: UserProfile) => void;
  onSignOut: () => Promise<void>;
}) {
  if (!user) return null;

  const { profile: currentProfile, loading, saving, saveProfile } = useProfile(user.uid, profile ?? undefined) as {
    profile: UserProfile | null;
    loading: boolean;
    saving: boolean;
    saveProfile: (profile: UserProfile) => Promise<boolean>;
    setProfile: (profile: UserProfile | null) => void;
  };

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
  } = useSurvey(user.uid, currentProfile ?? undefined);

  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [watchDni, setWatchDni] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Clear error when starting new operation
  const clearEntryError = useCallback(() => setEntryError(null), []);

  const sortedWatchedUsers = useMemo(() => {
    return [...watchedUsers].sort((a, b) => {
      const aMs = a.lastAliveAt ? new Date(a.lastAliveAt).getTime() : 0;
      const bMs = b.lastAliveAt ? new Date(b.lastAliveAt).getTime() : 0;
      return bMs - aMs;
    });
  }, [watchedUsers]);

  const handleSaveProfile = async (updatedProfile: any): Promise<boolean> => {
    try {
      clearEntryError();
      const success = await saveProfile(updatedProfile);
      if (success) {
        onProfileUpdated(updatedProfile);
        setShowProfileEditor(false);
        return true;
      }
      setEntryError("No se pudieron guardar los cambios. Inténtalo de nuevo.");
      return false;
    } catch (error) {
      clearEntryError();
      setEntryError("Error al guardar: " + (error instanceof Error ? error.message : "Error desconocido"));
      return false;
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
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <SkeletonLoader variant="text" width={200} height={30} animated={true} />
        <Text style={styles.subtitle}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
          setRefreshing(true);
          try {
            await syncPending();
            // The useWatchedUsers hook already subscribes to real-time updates,
            // so watched users will update automatically.
          } finally {
            setRefreshing(false);
          }
        }}
        />
      }
      contentContainerStyle={styles.screen}>
      <View style={styles.statusCard}>
        <View>
          <Text style={styles.statusLabel}>Estado actual</Text>
          <Text style={styles.title}>Hola, {profile?.fullName ?? user?.email?.split("@")[0] ?? "Invitado"}</Text>
        </View>
        <Pressable style={styles.profileMenuButton} onPress={() => setShowProfileEditor((previous) => !previous)}>
          <Text style={styles.profileMenuButtonText}>
            {showProfileEditor ? "Ocultar" : "Editar"}
          </Text>
        </Pressable>
      </View>
      {entryError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{entryError}</Text>
        </View>
      )}

      {showProfileEditor && currentProfile?.fullName ? (
        <ProfileEditor
          profile={currentProfile}
          onSave={handleSaveProfile}
          onCancel={() => setShowProfileEditor(false)}
          saving={saving}
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

      <Text style={styles.sectionTitle}>Seguridad de tus contactos</Text>
      <Text style={styles.counterText}>Contactos activos: {watchingUserIds.length}</Text>
      <AddUserForm
        value={watchDni}
        onChangeText={setWatchDni}
        onSubmit={() => addWatchedUser(watchDni)}
        disabled={addingWatch}
        message={watchMessage}
      />

      {sortedWatchedUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Todavía no agregaste contactos</Text>
          <Text style={styles.emptyStateText}>Agrega el DNI de una persona para recibir su estado y avisarte si hay una alerta.</Text>
        </View>
      ) : (
        sortedWatchedUsers.map((watchedUser) => (
          <WatchedUserCard
            key={watchedUser.uid}
            user={watchedUser}
            onCall={callWatchedUser}
            onRemove={removeWatchedUser}
            currentTime={currentTime}
          />
        ))
      )}

      <Pressable style={styles.logoutButton} onPress={() => void onSignOut()}>
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
    backgroundColor: "#edf3ef",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  statusLabel: {
    color: "#6e8279",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#15231f",
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
  emptyState: {
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#d5dfd8",
    borderRadius: 14,
    padding: 18,
    marginTop: 8,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#15231f",
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#587068",
    lineHeight: 20,
  },
  profileMenuButton: {
    backgroundColor: "#286052",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  profileMenuButtonText: {
    color: "#fffdf8",
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
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  errorBanner: {
    backgroundColor: "#f8d7da",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f5c6cb",
    padding: 12,
    marginBottom: 16,
    color: "#842029",
    fontSize: 14,
  },
  errorBannerText: {
    color: "#842029",
    fontWeight: "500",
  },
});