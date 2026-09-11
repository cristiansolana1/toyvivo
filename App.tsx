import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./src/firebase";
import { loadUserProfile, saveUserProfile } from "./src/storage";
import { UserProfile } from "./src/types";
import { AuthScreen, ProfileSetupScreen, HomeScreen } from "./src/screens";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
    async function hydrateProfile(currentUser: User | null) {
      if (!currentUser) {
        setProfile(null);
        return;
      }

      const localProfile = await loadUserProfile(currentUser.uid);
      if (localProfile) {
        setProfile(localProfile);
        return;
      }

      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const publicProfile = userDoc.data()?.publicProfile as
        | Pick<UserProfile, "fullName" | "dni" | "phone" | "country" | "province">
        | undefined;
      const legacyProfile = userDoc.data()?.profile as UserProfile | undefined;
      const cloudProfile: UserProfile | null = publicProfile
        ? {
            fullName: publicProfile.fullName,
            dni: publicProfile.dni,
            phone: publicProfile.phone,
            country: publicProfile.country ?? "AR",
            province: publicProfile.province ?? "BA",
          }
        : legacyProfile
          ? legacyProfile
          : null;

      if (cloudProfile) {
        await saveUserProfile(currentUser.uid, cloudProfile);
        setProfile(cloudProfile);
        return;
      }

      setProfile(null);
    }

    void hydrateProfile(user);
  }, [user]);

  if (bootLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#0f172a" />
          <Text style={styles.subtitle}>Cargando aplicación...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {!user ? (
        <>
          {bootError ? <Text style={styles.errorText}>{bootError}</Text> : null}
          <AuthScreen
            onAccountCreated={(createdUser) => {
              setProfile(null);
              setUser(createdUser);
            }}
          />
        </>
      ) : !profile ? (
        <ProfileSetupScreen user={user} onSaved={setProfile} />
      ) : (
        <HomeScreen
          user={user}
          profile={profile}
          onProfileUpdated={setProfile}
          onSignOut={handleSignOut}
        />
      )}
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