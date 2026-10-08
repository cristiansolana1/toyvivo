import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { HeartbeatEntry, UserProfile } from "./types";

// Use safe key characters (alphanumeric, ".", "-", "_") - replace ":" with "-"
const safeProfileKey = (uid: string) => `profile-${uid}`;
const safeHeartbeatHistoryKey = (uid: string) => `heartbeats-${uid}`;
const safeLastHeartbeatKey = (uid: string) => `lastheartbeat-${uid}`;
const safePendingHeartbeatsKey = (uid: string) => `pendingheartbeats-${uid}`;
const safeNotifiedSurveyKey = (uid: string) => `notifiedsurvey-${uid}`;

export async function saveUserProfile(uid: string, profile: UserProfile) {
  const key = safeProfileKey(uid);
  const serializedProfile = JSON.stringify(profile);
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, serializedProfile);
    return;
  }

  await SecureStore.setItemAsync(key, serializedProfile);
  await AsyncStorage.removeItem(key);
}

export async function loadUserProfile(uid: string): Promise<UserProfile | null> {
  const key = safeProfileKey(uid);
  let rawProfile: string | null;
  if (Platform.OS === "web") {
    rawProfile = await AsyncStorage.getItem(key);
  } else {
    rawProfile = await SecureStore.getItemAsync(key);
    if (!rawProfile) {
      rawProfile = await AsyncStorage.getItem(key);
      if (rawProfile) {
        await SecureStore.setItemAsync(key, rawProfile);
        await AsyncStorage.removeItem(key);
      }
    }
  }
  if (!rawProfile) {
    return null;
  }

  return JSON.parse(rawProfile) as UserProfile;
}

export async function saveHeartbeat(uid: string, heartbeat: HeartbeatEntry) {
  const rawHistory = await AsyncStorage.getItem(safeHeartbeatHistoryKey(uid));
  const history = rawHistory ? (JSON.parse(rawHistory) as HeartbeatEntry[]) : [];
  const updatedHistory = [heartbeat, ...history].slice(0, 50);

  await AsyncStorage.setItem(safeHeartbeatHistoryKey(uid), JSON.stringify(updatedHistory));
  await AsyncStorage.setItem(safeLastHeartbeatKey(uid), heartbeat.createdAt);
}

export async function loadLastHeartbeat(uid: string): Promise<string | null> {
  return AsyncStorage.getItem(safeLastHeartbeatKey(uid));
}

export async function addPendingHeartbeat(uid: string, heartbeat: HeartbeatEntry): Promise<void> {
  const raw = await AsyncStorage.getItem(safePendingHeartbeatsKey(uid));
  const pending = raw ? (JSON.parse(raw) as HeartbeatEntry[]) : [];
  pending.push(heartbeat);
  await AsyncStorage.setItem(safePendingHeartbeatsKey(uid), JSON.stringify(pending));
}

export async function getPendingHeartbeats(uid: string): Promise<HeartbeatEntry[]> {
  const raw = await AsyncStorage.getItem(safePendingHeartbeatsKey(uid));
  return raw ? (JSON.parse(raw) as HeartbeatEntry[]) : [];
}

export async function clearPendingHeartbeats(uid: string): Promise<void> {
  await AsyncStorage.removeItem(safePendingHeartbeatsKey(uid));
}

export async function removePendingHeartbeat(uid: string, heartbeatId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(safePendingHeartbeatsKey(uid));
  const pending = raw ? (JSON.parse(raw) as HeartbeatEntry[]) : [];
  const filtered = pending.filter((h) => h.id !== heartbeatId);
  await AsyncStorage.setItem(safePendingHeartbeatsKey(uid), JSON.stringify(filtered));
}

export async function saveNotifiedSurveyId(uid: string, surveyId: string): Promise<void> {
  await AsyncStorage.setItem(safeNotifiedSurveyKey(uid), surveyId);
}

export async function loadNotifiedSurveyId(uid: string): Promise<string | null> {
  return AsyncStorage.getItem(safeNotifiedSurveyKey(uid));
}

export async function clearUserData(uid: string): Promise<void> {
  const key = safeProfileKey(uid);
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key).catch(() => {});
    await AsyncStorage.removeItem(key);
  }
  await AsyncStorage.removeItem(safeHeartbeatHistoryKey(uid));
  await AsyncStorage.removeItem(safeLastHeartbeatKey(uid));
  await AsyncStorage.removeItem(safePendingHeartbeatsKey(uid));
}