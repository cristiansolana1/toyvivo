import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface StatusHeaderProps {
  fullName?: string;
  email?: string | null;
  showProfileEditor: boolean;
  onToggleProfileEditor: () => void;
}

function StatusHeaderComponent({
  fullName,
  email,
  showProfileEditor,
  onToggleProfileEditor,
}: StatusHeaderProps) {
  const displayName = fullName ?? email?.split("@")[0] ?? "Invitado";

  return (
    <View style={styles.statusCard}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={styles.statusLabel}>Estado actual</Text>
        <Text style={styles.title}>Hola, {displayName}</Text>
      </View>
      <Pressable style={styles.profileMenuButton} onPress={onToggleProfileEditor} accessibilityLabel="Editar perfil">
        <Text style={styles.profileMenuButtonText}>
          {showProfileEditor ? "Ocultar" : "Editar"}
        </Text>
      </Pressable>
    </View>
  );
}

export const StatusHeader = memo(StatusHeaderComponent);

const styles = StyleSheet.create({
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
});
