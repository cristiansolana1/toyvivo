import { useState, useEffect, useCallback } from "react";
import {
  removeWatchingUser,
  subscribeToWatchedUsers,
  requestContactByDni,
  subscribeToWatchingUserIds,
} from "../services/userService";
import { FirebaseError } from "firebase/app";
import { WatchedUserStatus } from "../services/userService";

interface UseWatchedUsersReturn {
  watchingUserIds: string[];
  watchedUsers: WatchedUserStatus[];
  addingWatch: boolean;
  watchMessage: string | null;
  addWatchedUser: (dni: string) => Promise<boolean>;
  removeWatchedUser: (targetUserId: string) => Promise<void>;
  setWatchMessage: (message: string | null) => void;
}

export function useWatchedUsers(userId: string): UseWatchedUsersReturn {
  const [watchingUserIds, setWatchingUserIds] = useState<string[]>([]);
  const [watchedUsers, setWatchedUsers] = useState<WatchedUserStatus[]>([]);
  const [addingWatch, setAddingWatch] = useState(false);
  const [watchMessage, setWatchMessage] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToWatchingUserIds(
      userId,
      setWatchingUserIds,
      () => setWatchMessage("No se pudo sincronizar la lista de contactos aprobados.")
    );
  }, [userId]);

  useEffect(() => {
    setWatchedUsers((previous) => previous.filter((user) => watchingUserIds.includes(user.uid)));
    if (watchingUserIds.length === 0) return;
    return subscribeToWatchedUsers(
      watchingUserIds,
      (updatedUser) => setWatchedUsers((previous) => [
        ...previous.filter((user) => user.uid !== updatedUser.uid),
        updatedUser,
      ]),
      () => setWatchMessage("Se revocó el acceso a uno de tus contactos.")
    );
  }, [watchingUserIds]);

  const addWatchedUser = useCallback(async (dni: string): Promise<boolean> => {
    const normalizedDni = dni.trim().replace(/\D/g, "");
    setWatchMessage(null);
    if (!normalizedDni) {
      setWatchMessage("Ingresa el DNI de la persona que quieres agregar.");
      return false;
    }

    try {
      setAddingWatch(true);
      const result = await requestContactByDni(normalizedDni, userId);
      setWatchMessage(result === "restored"
        ? "Este contacto ya te había autorizado. Se restauró en tu lista persistente."
        : "Solicitud enviada. Cuando la aprueben, verás aquí el estado y teléfono compartidos.");
      return true;
    } catch (error) {
      const firebaseCode = error instanceof FirebaseError ? error.code : "unknown";
      const message = error instanceof Error && error.message === "INVALID_DNI"
        ? "El DNI debe tener 7 u 8 números."
        : error instanceof Error && error.message === "USER_NOT_FOUND"
          ? "No encontramos un usuario registrado con ese DNI."
          : error instanceof Error && error.message === "INVALID_TARGET"
            ? "No puedes agregarte a ti mismo."
            : error instanceof Error && error.message === "REQUEST_ALREADY_EXISTS"
              ? "Ya enviaste una solicitud a este usuario."
              : error instanceof Error && error.message === "CONTACT_ALREADY_EXISTS"
                ? "Este usuario ya está en tus contactos."
                : error instanceof Error && error.message === "REQUEST_REJECTED"
                  ? "La solicitud anterior fue rechazada. Pídele a esa persona que vuelva a aprobar el contacto."
                : firebaseCode === "permission-denied"
                  ? "Firestore no permitió consultar o crear la solicitud. Revisa las reglas publicadas."
                  : `No se pudo agregar al usuario (${firebaseCode}). Revisa tu conexión e inténtalo de nuevo.`;
      setWatchMessage(message);
      return false;
    } finally {
      setAddingWatch(false);
    }
  }, [userId]);

  const removeWatchedUser = useCallback(
    async (targetUserId: string) => {
      try {
        await removeWatchingUser(userId, targetUserId);
        setWatchingUserIds((prev) => prev.filter((uid) => uid !== targetUserId));
      } catch {
        setWatchMessage("No se pudo quitar al usuario.");
      }
    },
    [userId]
  );

  return {
    watchingUserIds,
    watchedUsers,
    addingWatch,
    watchMessage,
    addWatchedUser,
    removeWatchedUser,
    setWatchMessage,
  };
}
