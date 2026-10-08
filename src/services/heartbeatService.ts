import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { HeartbeatEntry } from "../types";
import { 
  saveHeartbeat as saveLocalHeartbeat, 
  loadLastHeartbeat as loadLocalLastHeartbeat,
  loadUserProfile,
  addPendingHeartbeat,
  getPendingHeartbeats,
  clearPendingHeartbeats,
  removePendingHeartbeat,
} from "../storage";

async function persistHeartbeat(uid: string, heartbeat: HeartbeatEntry): Promise<void> {
  const batch = writeBatch(db);
  const heartbeatRef = doc(db, "users", uid, "heartbeats", heartbeat.id);
  const userRef = doc(db, "users", uid);

  batch.set(heartbeatRef, {
    status: heartbeat.status,
    createdAt: serverTimestamp(),
    deviceCreatedAt: heartbeat.createdAt,
  });
  batch.set(userRef, { lastAliveAt: serverTimestamp() }, { merge: true });

  const profile = await loadUserProfile(uid);
  const statusData: Record<string, any> = {
    lastAliveAt: serverTimestamp(),
  };
  if (profile) {
    statusData.fullName = profile.fullName;
    statusData.phone = profile.phone;
  }
  batch.set(doc(db, "userStatus", uid), statusData, { merge: true });

  await batch.commit();
}

export async function sendHeartbeat(uid: string, heartbeat: HeartbeatEntry): Promise<{ success: boolean; queued: boolean }> {
  await saveLocalHeartbeat(uid, heartbeat);
  
  try {
    await persistHeartbeat(uid, heartbeat);
    return { success: true, queued: false };
  } catch (error) {
    console.error("sendHeartbeat error:", error);
    await addPendingHeartbeat(uid, heartbeat);
    return { success: false, queued: true };
  }
}

export async function syncPendingHeartbeats(uid: string): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingHeartbeats(uid);
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const heartbeat of pending) {
    try {
      await persistHeartbeat(uid, heartbeat);
      await removePendingHeartbeat(uid, heartbeat.id);
      synced++;
    } catch (error) {
      console.error("syncPendingHeartbeat failed:", error);
      failed++;
    }
  }

  return { synced, failed };
}

export async function loadLastHeartbeat(uid: string): Promise<string | null> {
  const localLast = await loadLocalLastHeartbeat(uid);
  if (localLast) {
    return localLast;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      const lastAliveAt = data.lastAliveAt;
      if (lastAliveAt) {
        const timestamp = typeof lastAliveAt.toDate === "function"
          ? lastAliveAt.toDate().toISOString()
          : new Date(lastAliveAt).toISOString();
        return timestamp;
      }
    }
  } catch (error) {
    console.error("Error loading last heartbeat from Firestore:", error);
  }

  return null;
}

export { getPendingHeartbeats } from "../storage";
