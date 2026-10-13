import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Animated, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
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

  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

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
        <View style={styles.splashContainer}>
          <Animated.View style={[styles.loaderWrap, { opacity: fadeAnim }]}>
            <Image
              source={require("./assets/splash-icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>Estoy bien</Text>
            <Text style={styles.tagline}>Cuidando de quienes te importan</Text>
            <ActivityIndicator size="large" color="#fffdf8" style={styles.spinner} />
            <Text style={styles.loadingText}>Cargando aplicación...</Text>
          </Animated.View>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
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
            <SafeAreaProvider>
              <View style={styles.splashContainer}>
                <Animated.View style={[styles.loaderWrap, { opacity: fadeAnim }]}>
                  <Image
                    source={require("./assets/splash-icon.png")}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                  <Text style={styles.brandTitle}>Estoy bien</Text>
                  <ActivityIndicator size="large" color="#fffdf8" style={styles.spinner} />
                  <Text style={styles.loadingText}>Cargando tu perfil...</Text>
                </Animated.View>
              </View>
            </SafeAreaProvider>
          ) : !profile ? (
            <>
              {profileError ? <Text style={styles.errorText}>{profileError}</Text> : null}
            <ProfileSetupScreen
              onSaveProfile={saveProfile}
              saving={profileSaving}
              email={user?.email}
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
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  splashContainer: {
    flex: 1,
    backgroundColor: "#286052",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fffdf8",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    color: "#a3c4b9",
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
  },
  spinner: {
    marginVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,253,248,0.8)",
    marginTop: 6,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
    marginTop: 8,
  },
  errorText: {
    color: "#b91c1c",
    textAlign: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
