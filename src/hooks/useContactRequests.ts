import { useEffect, useState, useRef } from "react";
import {
  ContactRequest,
  respondToContactRequest,
  subscribeToContactRequests,
} from "../services/userService";
import { sendContactRequestNotification } from "../services/notificationService";

export function useContactRequests(userId: string) {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [respondingUid, setRespondingUid] = useState<string | null>(null);
  const initialLoadRef = useRef(true);
  const knownRequestIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return subscribeToContactRequests(
      userId,
      (updatedRequests) => {
        if (initialLoadRef.current) {
          initialLoadRef.current = false;
          knownRequestIdsRef.current = new Set(updatedRequests.map((r) => r.requesterUid));
          setRequests(updatedRequests);
          return;
        }

        // Check for new requests
        for (const req of updatedRequests) {
          if (!knownRequestIdsRef.current.has(req.requesterUid)) {
            knownRequestIdsRef.current.add(req.requesterUid);
            void sendContactRequestNotification(req.requesterName);
          }
        }

        setRequests(updatedRequests);
        setError(null);
      },
      () => setError("No se pudieron cargar las solicitudes de contacto.")
    );
  }, [userId]);

  const respond = async (requesterUid: string, approved: boolean) => {
    setRespondingUid(requesterUid);
    setError(null);
    try {
      await respondToContactRequest(requesterUid, approved);
      setRequests((current) => current.filter((request) => request.requesterUid !== requesterUid));
    } catch (requestError) {
      setError(requestError instanceof Error && requestError.message === "PROFILE_PHONE_MISSING"
        ? "Completa tu teléfono en el perfil antes de autorizar contactos."
        : "No se pudo actualizar la solicitud. Inténtalo de nuevo.");
    } finally {
      setRespondingUid(null);
    }
  };

  return { requests, error, respondingUid, respond };
}
