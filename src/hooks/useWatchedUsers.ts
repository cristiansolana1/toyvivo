import { useState, useEffect, useCallback } from "react";
import {
  getWatchingUserIds,
  getWatchedUsersStatus,
  addWatchingUser,
  removeWatchingUser,
  subscribeToWatchedUsers,
  getUserByDni,
} from "../services/userService";
import { FirebaseError } from "firebase/app";

export function useWatchedUsers(userId: string) {
  const [watchingUserIds, setWatchingUserIds] = useState<string[]>([]);
  const [watchedUsers, setWatchedUsers] = useState<Array<{
    uid: string;
    fullName: string;
    phone: string;
    lastAliveAt: string | null;
  }>>([]);
  const [addingWatch, setAddingWatch] = useState(false);
  const [watchMessage, setWatchMessage] = useState<string | null>(null);

  useEffect(() => {
    getWatchingUserIds(userId).then(setWatchingUserIds);
  }, [userId]);

  useEffect(() => {
    getWatchedUsersStatus(watchingUserIds).then(setWatchedUsers);
  }, [watchingUserIds]);

  useEffect(() => {
    if (watchingUserIds.length === 0) return;
    const unsubscribe = subscribeToWatchedUsers(watchingUserIds, (updatedUser) =>
      setWatchedUsers((prev) => [
        ...prev.filter((u) => u.uid !== updatedUser.uid),
        updatedUser,
      ])
    );
    return unsubscribe;
  }, [watchingUserIds]);

  const addWatchedUser = useCallback(
    async (dni: string) => {
      const normalizedDni = dni.trim();
      setWatchMessage(null);
      if (!normalizedDni) {
        setWatchMessage("Ingresa el DNI del usuario a seguir.");
        return;
      }
      try {
        setAddingWatch(true);
        const result = await getUserByDni(normalizedDni);
        const targetUserId = result ? result.uid : `dni:${normalizedDni}`;
        if (targetUserId === userId) {
          setWatchMessage("No puedes agregarte a ti mismo.");
          return;
        }
        if (watchingUserIds.includes(targetUserId)) {
          setWatchMessage("Ese usuario ya está en tu lista.");
          return;
        }
        await addWatchingUser(userId, targetUserId);
        setWatchingUserIds((prev) => [...prev, targetUserId]);
        setWatchMessage(result ? "Usuario agregado correctamente." : "Usuario sin Cuenta agregado correctamente.");
      } catch (error) {
        const message =
          error instanceof FirebaseError && error.code === "permission-denied"
            ? "Firebase no permite consultar usuarios. Revisa las reglas de Firestore."
            : "No se pudo agregar al usuario. Revisa tu conexión e inténtalo de nuevo.";
        setWatchMessage(message);
      } finally {
        setAddingWatch(false);
      }
    },
    [userId, watchingUserIds]
  );

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