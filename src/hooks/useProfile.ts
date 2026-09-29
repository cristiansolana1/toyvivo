import { useState, useEffect, useCallback } from "react";
import { UserProfile } from "../types";
import { saveUserProfile, loadUserProfile } from "../services/userService";

interface UseProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  saving: boolean;
  saveProfile: (profile: UserProfile) => Promise<boolean>;
  setProfile: (profile: UserProfile | null) => void;
}

export function useProfile(userId: string, initialProfile?: UserProfile): UseProfileReturn {
  const [profile, setProfileState] = useState<UserProfile | null>(initialProfile ?? null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const local = await loadUserProfile(userId);
        if (mounted && local) {
          // Solo usar localStorage si no tenemos initialProfile o si difiere
          if (!initialProfile || JSON.stringify(local) !== JSON.stringify(initialProfile)) {
            setProfileState(local);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => { mounted = false; };
  }, [userId, initialProfile]);

  const saveProfile = useCallback(
    async (newProfile: UserProfile): Promise<boolean> => {
      try {
        setSaving(true);
        await saveUserProfile(userId, newProfile);
        setProfileState(newProfile);
        return true;
      } catch {
        return false;
      } finally {
        setSaving(false);
      }
    },
    [userId]
  );

  const setProfile = useCallback((newProfile: UserProfile | null) => {
    setProfileState(newProfile);
  }, []);

  return {
    profile,
    loading,
    saving,
    saveProfile,
    setProfile,
  };
}