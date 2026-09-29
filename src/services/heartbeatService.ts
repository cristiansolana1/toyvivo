import { collection, addDoc, setDoc, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { HeartbeatEntry } from "../types";
import { 
  saveHeartbeat as saveLocalHeartbeat, 
  loadLastHeartbeat as loadLocalLastHeartbeat,
  addPendingHeartbeat,
  getPendingHeartbeats,
  clearPendingHeartbeats,
  removePendingHeartbeat,
} from "../storage";

export async function sendHeartbeat(uid: string, heartbeat: HeartbeatEntry): Promise<{ success: boolean; queued: boolean }> {
  await saveLocalHeartbeat(uid, heartbeat);
  
  try {
    await addDoc(collection(db, "users", uid, "heartbeats"), {
      status: heartbeat.status,
      createdAt: serverTimestamp(),
      deviceCreatedAt: heartbeat.createdAt,
    });
    await setDoc(
      doc(db, "users", uid),
      {
        emailNormalized: "",
        lastAliveAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { success: true, queued: false };
  } catch (error) {
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
      await addDoc(collection(db, "users", uid, "heartbeats"), {
        status: heartbeat.status,
        createdAt: serverTimestamp(),
        deviceCreatedAt: heartbeat.createdAt,
      });
      await setDoc(
        doc(db, "users", uid),
        {
          emailNormalized: "",
          lastAliveAt: serverTimestamp(),
        },
        { merge: true }
      );
      await removePendingHeartbeat(uid, heartbeat.id);
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

export async function loadLastHeartbeat(uid: string): Promise<string | null> {
  return loadLocalLastHeartbeat(uid);
}

export { getPendingHeartbeats } from "../storage";