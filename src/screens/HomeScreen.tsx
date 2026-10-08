import React from "react";
import { useCallback, useMemo, useState } from "react";
import { useToast } from "../hooks/useToast";
import { Alert, Linking, RefreshControl, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeartbeat } from "../hooks/useHeartbeat";
import { useWatchedUsers } from "../hooks/useWatchedUsers";
import { useContactRequests } from "../hooks/useContactRequests";
import { useSurvey } from "../hooks/useSurvey";
import { HeartbeatButton } from "../components/HeartbeatButton";
import { WatchedUserCard } from "../components/WatchedUserCard";
import { ProfileEditor } from "../components/ProfileEditor";
import { SurveyCard } from "../components/SurveyCard";
import { AddUserForm } from "../components/AddUserForm";
import { isHeartbeatOverdue, formatHeartbeatCountdown, FIXED_COUNTRY_LABEL, PROVINCES_AR } from "../constants";
import { User } from "firebase/auth";
import { UserProfile } from "../types";
import { deleteUserAccount } from "../services/authService";

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
    setWatchMessage,
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

  const handleSaveProfile = async (updatedProfile: UserProfile): Promise<boolean> => {
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

  return (
    <ScrollView
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
          } finally {
            setRefreshing(false);
          }
        }}
        />
      }
      contentContainerStyle={[styles.screen, { paddingBottom: Math.max(insets.bottom + 32, 56) }]}>
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

      {contactRequests.length > 0 ? (
        <View style={styles.requestCard}>
          <Text style={styles.requestTitle}>Solicitudes de contacto</Text>
          <Text style={styles.requestDisclosure}>
            Al aceptar, compartirás tu nombre, teléfono y último aviso con esa persona. Puedes revocar el acceso quitándola de Seguridad de tus contactos.
          </Text>
          {contactRequestError ? <Text style={styles.requestError}>{contactRequestError}</Text> : null}
          {contactRequests.map((request) => (
            <View key={request.requesterUid} style={styles.requestRow}>
              <Text style={styles.requestName}>{request.requesterName}</Text>
              <View style={styles.requestActions}>
                <Pressable
                  style={[styles.requestButton, styles.rejectButton]}
                  onPress={() => void respondToRequest(request.requesterUid, false)}
                  disabled={respondingUid === request.requesterUid}
                  accessibilityLabel={`Rechazar solicitud de ${request.requesterName}`}
                >
                  <Text style={styles.rejectButtonText}>Rechazar</Text>
                </Pressable>
                <Pressable
                  style={[styles.requestButton, styles.approveButton]}
                  onPress={() => void respondToRequest(request.requesterUid, true)}
                  disabled={respondingUid === request.requesterUid}
                  accessibilityLabel={`Aprobar solicitud de ${request.requesterName}`}
                >
                  <Text style={styles.approveButtonText}>Aceptar</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : contactRequestError ? (
        <Text style={styles.requestError}>{contactRequestError}</Text>
      ) : null}

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

      <Text style={styles.sectionTitle}>Seguridad de tus contactos</Text>
      <Text style={styles.counterText}>Contactos activos: {watchingUserIds.length}</Text>
      <AddUserForm
        value={watchDni}
        onChangeText={setWatchDni}
        onSubmit={async () => {
          const ok = await addWatchedUser(watchDni);
          if (ok) setWatchDni("");
        }}
        disabled={addingWatch}
        message={watchMessage}
      />

      {sortedWatchedUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Todavía no agregaste contactos</Text>
          <Text style={styles.emptyStateText}>Agrega el DNI de una persona. Recibirá una solicitud y deberá aprobarla antes de compartir su estado y teléfono.</Text>
        </View>
      ) : (
        sortedWatchedUsers.map((watchedUser) => (
          <WatchedUserCard
            key={watchedUser.uid}
            user={watchedUser}
            onCall={callWatchedUser}
            onWhatsApp={messageWatchedUser}
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
          <Text style={styles.shareButtonText}>📤 Invitar a compartir</Text>
        </Pressable>
        <Pressable style={styles.instagramButton} onPress={() => void Linking.openURL("https://www.instagram.com/estoybien.arg")}>
          <Text style={styles.instagramButtonText}>📷 Seguir en Instagram</Text>
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
    borderRadius: 12,
    backgroundColor: "#286052",
    borderWidth: 1,
    borderColor: "#1e4b40",
    minWidth: 150,
  },
  shareButtonText: {
    color: "#fffdf8",
    fontWeight: "700",
    textAlign: "center",
  },
  bottomButtonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 24,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  instagramButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#d5dfd8",
    minWidth: 150,
  },
  instagramButtonText: {
    color: "#9d4e30",
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
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
  requestCard: {
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#d5dfd8",
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },
  requestTitle: {
    color: "#15231f",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  requestDisclosure: {
    color: "#587068",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  requestRow: {
    borderTopWidth: 1,
    borderTopColor: "#e1e8e3",
    paddingTop: 12,
    marginTop: 8,
  },
  requestName: {
    color: "#15231f",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },
  requestActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  requestButton: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  rejectButton: {
    backgroundColor: "#f1f5f2",
    borderWidth: 1,
    borderColor: "#cbd8cf",
  },
  rejectButtonText: {
    color: "#38564b",
    fontWeight: "600",
  },
  approveButton: {
    backgroundColor: "#286052",
  },
  approveButtonText: {
    color: "#fffdf8",
    fontWeight: "700",
  },
  requestError: {
    color: "#b91c1c",
    fontSize: 13,
    marginBottom: 8,
  },
});