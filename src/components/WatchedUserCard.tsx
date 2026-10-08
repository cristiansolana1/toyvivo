import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View, Alert } from "react-native";
import { WatchedUserStatus } from "../services/userService";
import { isHeartbeatOverdue } from "../constants";

interface WatchedUserCardProps {
  user: WatchedUserStatus;
  onCall: (phone: string) => void;
  onWhatsApp: (phone: string) => void;
  onRemove: (uid: string) => void;
  currentTime: number;
}

function WatchedUserCardComponent({ user, onCall, onWhatsApp, onRemove, currentTime }: WatchedUserCardProps) {
  const overdue = isHeartbeatOverdue(user.lastAliveAt, currentTime);

  const handleCall = () => onCall(user.phone);
  const handleWhatsAppMessage = () => onWhatsApp(user.phone);
  const handleRemove = () => {
    Alert.alert(
      "Quitar contacto",
      `¿Seguro que deseas quitar a ${user.fullName} de tus contactos de seguridad?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Quitar",
          style: "destructive",
          onPress: () => onRemove(user.uid),
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.nameWrap}>
          <Text style={styles.name}>{user.fullName}</Text>
          <Text style={[styles.badge, overdue ? styles.badgeWarning : styles.badgeOk]}>
            {overdue ? "Sin aviso" : "Activo"}
          </Text>
        </View>
      </View>
      <Text style={[styles.status, overdue && styles.overdue]}>
        Último aviso: {user.lastAliveAt ? new Date(user.lastAliveAt).toLocaleString() : "Sin aviso todavía"}
      </Text>
      <View style={styles.actions}>
        <View style={styles.primaryActions}>
          <Pressable onPress={handleCall} disabled={!user.phone} accessibilityLabel="Llamar">
            <Text style={[styles.callText, !user.phone && styles.callTextDisabled]}>Llamar</Text>
          </Pressable>
          <Pressable onPress={handleWhatsAppMessage} disabled={!user.phone} accessibilityLabel="Enviar WhatsApp">
            <Text style={[styles.whatsappText, !user.phone && styles.callTextDisabled]}>WhatsApp</Text>
          </Pressable>
        </View>
        <Pressable onPress={handleRemove} accessibilityLabel="Quitar usuario">
          <Text style={styles.removeText}>Quitar</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const WatchedUserCard = memo(WatchedUserCardComponent);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#d5dfd8",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  nameWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  badgeOk: {
    backgroundColor: "#d4f4dd",
    color: "#1a6e3a",
  },
  badgeWarning: {
    backgroundColor: "#ffe8e8",
    color: "#a83f32",
  },
  status: {
    fontSize: 14,
    color: "#334155",
    marginBottom: 10,
    lineHeight: 20,
  },
  overdue: {
    color: "#dc2626",
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  primaryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  callText: {
    color: "#2563eb",
    fontWeight: "700",
  },
  whatsappText: {
    color: "#1f9d55",
    fontWeight: "700",
  },
  callTextDisabled: {
    color: "#94a3b8",
  },
  removeText: {
    color: "#dc2626",
    fontWeight: "700",
  },
});
