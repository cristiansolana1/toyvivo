import { useState, useEffect, useCallback } from "react";
import { UserProfile } from "../types";
import { saveUserProfile, loadUserProfile } from "../services/userService";

export function useProfile(userId: string, initialProfile?: UserProfile) {
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile ?? null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!profile && initialProfile) {
      setProfile(initialProfile);
    }
    loadUserProfile(userId).then((p) => {
      if (p) setProfile(p);
    });
  }, [userId, initialProfile]);

  const saveProfile = useCallback(
    async (newProfile: UserProfile): Promise<boolean> => {
      try {
        setSavingProfile(true);
        await saveUserProfile(userId, newProfile);
        setProfile(newProfile);
        return true;
      } catch {
        return false;
      } finally {
        setSavingProfile(false);
      }
    },
    [userId]
  );

  return {
    profile,
    savingProfile,
    saveProfile,
    setProfile,
  };
}