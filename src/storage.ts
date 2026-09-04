import AsyncStorage from "@react-native-async-storage/async-storage";
import { HeartbeatEntry, UserProfile } from "./types";

const profileKey = (uid: string) => `profile:${uid}`;
const heartbeatHistoryKey = (uid: string) => `heartbeats:${uid}`;
const lastHeartbeatKey = (uid: string) => `lastHeartbeat:${uid}`;

export async function saveUserProfile(uid: string, profile: UserProfile) {
  await AsyncStorage.setItem(profileKey(uid), JSON.stringify(profile));
}

export async function loadUserProfile(uid: string): Promise<UserProfile | null> {
  const rawProfile = await AsyncStorage.getItem(profileKey(uid));
  if (!rawProfile) {
    return null;
  }

  return JSON.parse(rawProfile) as UserProfile;
}

export async function saveHeartbeat(uid: string, heartbeat: HeartbeatEntry) {
  const rawHistory = await AsyncStorage.getItem(heartbeatHistoryKey(uid));
  const history = rawHistory ? (JSON.parse(rawHistory) as HeartbeatEntry[]) : [];
  const updatedHistory = [heartbeat, ...history].slice(0, 50);

  await AsyncStorage.setItem(heartbeatHistoryKey(uid), JSON.stringify(updatedHistory));
  await AsyncStorage.setItem(lastHeartbeatKey(uid), heartbeat.createdAt);
}

export async function loadLastHeartbeat(uid: string): Promise<string | null> {
  return AsyncStorage.getItem(lastHeartbeatKey(uid));
}
