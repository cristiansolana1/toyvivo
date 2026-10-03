import { useState, useEffect, useCallback } from "react";
import { UserProfile } from "../types";
import { hydrateUserProfile, saveUserProfile } from "../services/profileService";

interface UseProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  saveProfile: (profile: UserProfile) => Promise<void>;
}

export function useProfile(userId: string | null, email?: string | null): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    setProfile(null);
    setLoading(true);
    setError(null);
    void hydrateUserProfile(userId, email)
      .then((loadedProfile) => {
        if (active) setProfile(loadedProfile);
      })
      .catch((loadError) => {
        if (!active) return;
        console.error("Failed to load user profile:", loadError);
        setProfile(null);
        setError("No se pudo cargar tu perfil. Revisa tu conexión e inténtalo de nuevo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [userId, email]);

  const saveProfile = useCallback(
    async (newProfile: UserProfile): Promise<void> => {
      if (!userId) throw new Error("UNAUTHENTICATED");
      try {
        setSaving(true);
        setError(null);
        await saveUserProfile(userId, newProfile, email);
        setProfile(newProfile);
      } finally {
        setSaving(false);
      }
    },
    [email, userId]
  );

  return {
    profile,
    loading,
    saving,
    error,
    saveProfile,
  };
}