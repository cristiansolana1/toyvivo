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
import { auth } from "./src/firebase";
import { useProfile } from "./src/hooks/useProfile";
import { AuthScreen } from "./src/screens/AuthScreen";
import { ProfileSetupScreen } from "./src/screens/ProfileSetupScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ErrorBoundary } from "./src/components/ErrorBoundary";

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