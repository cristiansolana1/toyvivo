import { Pressable, StyleSheet, Text, View } from "react-native";
import { Linking, Alert } from "react-native";

interface WatchedUserCardProps {
  user: {
    uid: string;
    fullName: string;
    phone: string;
    lastAliveAt: string | null;
  };
  onCall: (phone: string) => void;
  onRemove: (uid: string) => void;
  overdue: boolean;
}

export function WatchedUserCard({ user, onCall, onRemove, overdue }: WatchedUserCardProps) {
  const handleCall = () => onCall(user.phone);
  const handleRemove = () => onRemove(user.uid);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{user.fullName}</Text>
      </View>
      <Text style={[styles.status, overdue && styles.overdue]}>
        Último aviso:{" "}
        {user.lastAliveAt ? new Date(user.lastAliveAt).toLocaleString() : "Sin aviso todavía"}
      </Text>
      <View style={styles.actions}>
        <Pressable onPress={handleCall} disabled={!user.phone}>
          <Text style={styles.callText}>Llamar</Text>
        </Pressable>
        <Pressable onPress={handleRemove}>
          <Text style={styles.removeText}>Quitar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  status: {
    fontSize: 14,
    color: "#334155",
    marginBottom: 8,
  },
  overdue: {
    color: "#dc2626",
    fontWeight: "700",
  },
  actions: {
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