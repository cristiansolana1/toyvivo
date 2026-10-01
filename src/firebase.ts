import { initializeApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as FirebaseAuth from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
type ReactNativeAuthModule = typeof FirebaseAuth & {
  getReactNativePersistence(storage: typeof AsyncStorage): FirebaseAuth.Persistence;
};

export const auth =
  Platform.OS === "web"
    ? FirebaseAuth.getAuth(app)
    : FirebaseAuth.initializeAuth(app, {
        persistence: (FirebaseAuth as ReactNativeAuthModule).getReactNativePersistence(AsyncStorage),
      });
export const db = getFirestore(app);

if (typeof window !== "undefined") {
  FirebaseAuth.setPersistence(auth, FirebaseAuth.browserLocalPersistence).catch(() => {});
}