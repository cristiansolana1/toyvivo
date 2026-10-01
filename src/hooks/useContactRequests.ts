import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import {
  respondToContactRequest,
} from "../services/userService";

export type ContactRequest = {
  requesterUid: string;
  requesterName: string;
};

export function useContactRequests(userId: string) {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [respondingUid, setRespondingUid] = useState<string | null>(null);

  useEffect(() => {
    const requestsQuery = query(
      collection(db, "users", userId, "contactRequests"),
      where("status", "==", "pending")
    );
    return onSnapshot(
      requestsQuery,
      (snapshot) => {
        setRequests(snapshot.docs.map((request) => ({
          requesterUid: request.id,
          requesterName: request.data().requesterName ?? "Usuario de Estoy Bien",
        })));
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