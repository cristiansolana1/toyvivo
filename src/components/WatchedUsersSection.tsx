import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WatchedUserStatus } from "../services/userService";
import { WatchedUserCard } from "./WatchedUserCard";
import { AddUserForm } from "./AddUserForm";

interface WatchedUsersSectionProps {
  watchingUserIds: string[];
  watchedUsers: WatchedUserStatus[];
  addingWatch: boolean;
  watchMessage: string | null;
  watchDni: string;
  onChangeWatchDni: (dni: string) => void;
  onAddWatch: () => Promise<void>;
  onCall: (phone: string) => void;
  onWhatsApp: (phone: string) => void;
  onRemove: (uid: string) => void;
  currentTime: number;
}

function WatchedUsersSectionComponent({
  watchingUserIds,
  watchedUsers,
  addingWatch,
  watchMessage,
  watchDni,
  onChangeWatchDni,
  onAddWatch,
  onCall,
  onWhatsApp,
  onRemove,
  currentTime,
}: WatchedUsersSectionProps) {
  const sortedWatchedUsers = useMemo(() => {
    return [...watchedUsers].sort((a, b) => {
      const aMs = a.lastAliveAt ? new Date(a.lastAliveAt).getTime() : 0;
      const bMs = b.lastAliveAt ? new Date(b.lastAliveAt).getTime() : 0;
      return bMs - aMs;
    });
  }, [watchedUsers]);

  return (
    <View>
      <Text style={styles.sectionTitle}>Seguridad de tus contactos</Text>
      <Text style={styles.counterText}>Contactos activos: {watchingUserIds.length}</Text>
      <AddUserForm
        value={watchDni}
        onChangeText={onChangeWatchDni}
        onSubmit={onAddWatch}
        disabled={addingWatch}
        message={watchMessage}
      />

      {sortedWatchedUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBadge}>
            <Text style={styles.emptyIconText}>🛡️</Text>
          </View>
          <Text style={styles.emptyStateTitle}>Protege a quienes te importan</Text>
          <Text style={styles.emptyStateText}>
            Agrega el DNI de un familiar o amigo. Recibirán una solicitud y, al aceptarla, podrás supervisar su estado de vida y comunicarte con facilidad.
          </Text>
        </View>
      ) : (
        sortedWatchedUsers.map((watchedUser) => (
          <WatchedUserCard
            key={watchedUser.uid}
            user={watchedUser}
            onCall={onCall}
            onWhatsApp={onWhatsApp}
            onRemove={onRemove}
            currentTime={currentTime}
          />
        ))
      )}
    </View>
  );
}

export const WatchedUsersSection = memo(WatchedUsersSectionComponent);

const styles = StyleSheet.create({
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
    padding: 20,
    marginTop: 8,
    marginBottom: 16,
    alignItems: "center",
    textAlign: "center",
  },
  emptyIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyIconText: {
    fontSize: 22,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#15231f",
    marginBottom: 6,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#587068",
    lineHeight: 20,
    textAlign: "center",
  },
});
