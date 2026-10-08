import { SkeletonLoader } from "./src/components/SkeletonLoader";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  User,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { auth } from "./src/firebase";
import { useProfile } from "./src/hooks/useProfile";
import { AuthScreen } from "./src/screens/AuthScreen";
import { VerifyEmailScreen } from "./src/screens/VerifyEmailScreen";
import { ProfileSetupScreen } from "./src/screens/ProfileSetupScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { clearUserData } from "./src/storage";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const {
    profile,
    loading: profileLoading,
    saving: profileSaving,
    error: profileError,
    saveProfile,
  } = useProfile(user?.uid ?? null, user?.email);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
  };

  useEffect(() => {
    let active = true;
    let initialStateReceived = false;
    const timeout = setTimeout(() => {
      if (!active || initialStateReceived) return;
      console.warn("Firebase Auth did not restore the initial session within 8 seconds.");
      setBootError(
        "Firebase está tardando en restaurar tu sesión. Puedes intentar iniciar sesión; la sesión se actualizará cuando responda."
      );
      setBootLoading(false);
    }, 8000);
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (!active) return;
        initialStateReceived = true;
        clearTimeout(timeout);
        setUser(currentUser);
        setBootError(null);
        setBootLoading(false);
      },
      (error) => {
        if (!active) return;
        clearTimeout(timeout);
        console.error("Firebase Auth state listener failed:", error);
        const errorCode =
          typeof error === "object" && error !== null && "code" in error
            ? String(error.code)
            : "error desconocido";
        setUser(null);
        setBootError(
          `No se pudo conectar con Firebase (${errorCode}). Puedes intentar iniciar sesión.`
        );
        setBootLoading(false);
      }
    );

    return () => {
      active = false;
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  if (bootLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <View style={styles.loaderWrap}>
            <SkeletonLoader variant="card" width={150} height={100} animated={true} />
            <Text style={styles.subtitle}>Cargando aplicación...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <ErrorBoundary>
          {!user ? (
            <>
              {bootError ? <Text style={styles.errorText}>{bootError}</Text> : null}
              <AuthScreen
                onAccountCreated={(createdUser) => {
                  setUser(createdUser);
                }}
              />
            </>
          ) : !user.emailVerified ? (
            <VerifyEmailScreen
              user={user}
              onSignOut={handleSignOut}
              onVerified={() => {
                setUser({ ...user });
              }}
            />
          ) : profileLoading ? (
            <View style={styles.loaderWrap}>
              <SkeletonLoader variant="card" width={150} height={100} animated={true} />
              <Text style={styles.subtitle}>Cargando tu perfil...</Text>
            </View>
          ) : !profile ? (
            <>
              {profileError ? <Text style={styles.errorText}>{profileError}</Text> : null}
            <ProfileSetupScreen
              onSaveProfile={saveProfile}
              saving={profileSaving}
            />
            </>
          ) : (
            <HomeScreen
              user={user}
              profile={profile}
              onSaveProfile={saveProfile}
              saving={profileSaving}
              onSignOut={handleSignOut}
            />
          )}
        </ErrorBoundary>
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
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
