import { SkeletonLoader } from "./src/components/SkeletonLoader";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, Text, View } from "react-native";
import {
  User,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { auth, db } from "./src/firebase";
import { loadUserProfile } from "./src/storage";
import { saveUserProfile } from "./src/services/userService";
import { UserProfile } from "./src/types";
import { FIXED_COUNTRY } from "./src/constants";
import { AuthScreen } from "./src/screens/AuthScreen";
import { ProfileSetupScreen } from "./src/screens/ProfileSetupScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ErrorBoundary } from "./src/components/ErrorBoundary";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    let resolved = false;
    const finishBoot = (currentUser: User | null, error?: unknown) => {
      if (resolved) {
        return;
      }

      resolved = true;
      setUser(currentUser);
      setBootError(error ? "No se pudo conectar con Firebase. Puedes intentar iniciar sesión." : null);
      setBootLoading(false);
    };

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => finishBoot(currentUser),
      (error) => finishBoot(null, error)
    );
    const timeout = setTimeout(() => finishBoot(null, new Error("Auth initialization timeout")), 8000);

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function hydrateProfile(currentUser: User | null) {
      if (!currentUser) {
        if (active) {
          setProfile(null);
          setProfileError(null);
          setProfileLoading(false);
        }
        return;
      }

      setProfileLoading(true);
      setProfileError(null);
      try {
        const localProfile = await loadUserProfile(currentUser.uid);
        if (!active) return;
        if (localProfile) {
          setProfile(localProfile);
          try {
            await saveUserProfile(currentUser.uid, localProfile, currentUser.email);
          } catch {
            // Keep the cached profile usable; a later startup can retry cloud migration.
          }
          return;
        }

        const privateDoc = await getDoc(doc(db, "users", currentUser.uid, "private", "profile"));
        const userDoc = privateDoc.exists()
          ? null
          : await getDoc(doc(db, "users", currentUser.uid));
        if (!active) return;

        const privateProfile = privateDoc.data() as UserProfile | undefined;
        const publicProfile = userDoc?.data()?.publicProfile as
          | Pick<UserProfile, "fullName" | "dni" | "phone" | "country" | "province" | "birthDate">
          | undefined;
        const legacyProfile = userDoc?.data()?.profile as UserProfile | undefined;
        const cloudProfile: UserProfile | null = privateProfile
          ? privateProfile
          : publicProfile
            ? {
                fullName: publicProfile.fullName,
                dni: publicProfile.dni,
                phone: publicProfile.phone,
                country: publicProfile.country ?? FIXED_COUNTRY,
                province: publicProfile.province ?? "BA",
                birthDate: publicProfile.birthDate ?? "",
              }
            : legacyProfile ?? null;

        if (cloudProfile) {
          setProfile(cloudProfile);
          try {
            await saveUserProfile(currentUser.uid, cloudProfile, currentUser.email);
          } catch {
            if (active) setProfileError("No se pudo actualizar el perfil seguro. Revisa tu conexión.");
          }
        } else {
          setProfile(null);
        }
      } catch {
        if (active) {
          setProfile(null);
          setProfileError("No se pudo cargar tu perfil. Revisa tu conexión e inténtalo de nuevo.");
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    }

    void hydrateProfile(user);
    return () => {
      active = false;
    };
  }, [user]);

if (bootLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderWrap}>
          <SkeletonLoader variant="card" width={150} height={100} animated={true} />
          <Text style={styles.subtitle}>Cargando aplicación...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ErrorBoundary>
        {!user ? (
          <>
            {bootError ? <Text style={styles.errorText}>{bootError}</Text> : null}
            <AuthScreen
              onAccountCreated={(createdUser) => {
                setProfile(null);
                setProfileError(null);
                setUser(createdUser);
              }}
            />
          </>
        ) : profileLoading ? (
          <View style={styles.loaderWrap}>
            <SkeletonLoader variant="card" width={150} height={100} animated={true} />
            <Text style={styles.subtitle}>Cargando tu perfil...</Text>
          </View>
        ) : !profile ? (
          <>
            {profileError ? <Text style={styles.errorText}>{profileError}</Text> : null}
          <ProfileSetupScreen user={user} onSaved={setProfile} />
          </>
        ) : (
          <HomeScreen
            user={user}
            profile={profile}
            onProfileUpdated={setProfile}
            onSignOut={handleSignOut}
          />
        )}
      </ErrorBoundary>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#334155",
    marginTop: 12,
  },
  errorText: {
    color: "#b91c1c",
    textAlign: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});