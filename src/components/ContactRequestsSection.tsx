import React, { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ContactRequest } from "../services/userService";

interface RequestRowProps {
  request: ContactRequest;
  respondingUid: string | null;
  onRespond: (requesterUid: string, approved: boolean) => void;
}

const RequestRow = memo(function RequestRow({ request, respondingUid, onRespond }: RequestRowProps) {
  const handleReject = useCallback(() => {
    onRespond(request.requesterUid, false);
  }, [onRespond, request.requesterUid]);

  const handleApprove = useCallback(() => {
    onRespond(request.requesterUid, true);
  }, [onRespond, request.requesterUid]);

  const isResponding = respondingUid === request.requesterUid;

  return (
    <View style={styles.requestRow}>
      <Text style={styles.requestName}>{request.requesterName}</Text>
      <View style={styles.requestActions}>
        <Pressable
          style={[styles.requestButton, styles.rejectButton]}
          onPress={handleReject}
          disabled={isResponding}
          accessibilityLabel={`Rechazar solicitud de ${request.requesterName}`}
        >
          <Text style={styles.rejectButtonText}>Rechazar</Text>
        </Pressable>
        <Pressable
          style={[styles.requestButton, styles.approveButton]}
          onPress={handleApprove}
          disabled={isResponding}
          accessibilityLabel={`Aprobar solicitud de ${request.requesterName}`}
        >
          <Text style={styles.approveButtonText}>Aceptar</Text>
        </Pressable>
      </View>
    </View>
  );
});

interface ContactRequestsSectionProps {
  requests: ContactRequest[];
  error: string | null;
  respondingUid: string | null;
  onRespond: (requesterUid: string, approved: boolean) => void;
}

function ContactRequestsSectionComponent({
  requests,
  error,
  respondingUid,
  onRespond,
}: ContactRequestsSectionProps) {
  if (requests.length === 0) {
    return error ? <Text style={styles.requestError}>{error}</Text> : null;
  }

  return (
    <View style={styles.requestCard}>
      <Text style={styles.requestTitle}>Solicitudes de contacto</Text>
      <Text style={styles.requestDisclosure}>
        Al aceptar, compartirás tu nombre, teléfono y último aviso con esa persona. Puedes revocar el acceso quitándola de Seguridad de tus contactos.
      </Text>
      {error ? <Text style={styles.requestError}>{error}</Text> : null}
      {requests.map((request) => (
        <RequestRow
          key={request.requesterUid}
          request={request}
          respondingUid={respondingUid}
          onRespond={onRespond}
        />
      ))}
    </View>
  );
}

export const ContactRequestsSection = memo(ContactRequestsSectionComponent);

const styles = StyleSheet.create({
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
