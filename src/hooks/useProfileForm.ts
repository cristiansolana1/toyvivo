import { useState, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import { UserProfile } from "../types";
import { validateProfile, getFirstValidationError } from "../utils/validation";
import { saveUserProfile } from "../services/userService";
import { loadUserProfile } from "../services/userService";
import { PROVINCES_AR, FIXED_COUNTRY, FIXED_COUNTRY_LABEL } from "../constants";
import { toDDMMYYYY, formatBirthDateInput, toISODate } from "../utils/date";

interface UseProfileFormReturn {
  profile: UserProfile | null;
  loading: boolean;
  saving: boolean;
  saveProfile: (profile: UserProfile) => Promise<boolean>;
  setProfile: (profile: UserProfile | null) => void;
  resetForm: () => void;
}

export function useProfileForm(
  userId: string,
  initialProfile?: UserProfile
): UseProfileFormReturn {
  const [profile, setProfileState] = useState<UserProfile | null>(initialProfile ?? null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const local = await loadUserProfile(userId);
        if (mounted && local) {
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
      const validationResults = validateProfile(newProfile);
      const firstError = getFirstValidationError(validationResults);
      if (firstError) {
        Alert.alert("Faltan datos", firstError);
        return false;
      }

      try {
        setSaving(true);
        await saveUserProfile(userId, newProfile);
        setProfileState(newProfile);
        return true;
      } catch (error) {
        Alert.alert("Error", "No se pudieron guardar los cambios: " + (error instanceof Error ? error.message : String(error)));
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

  const resetForm = useCallback(() => {
    setProfileState(initialProfile ?? null);
    setLoading(true);
  }, [initialProfile]);

  return {
    profile,
    loading,
    saving,
    saveProfile,
    setProfile,
    resetForm,
  };
}