/**
 * Heartbeat service responsible for managing local persistence, Firestore synchronization,
 * offline queueing, and authoritative server-timestamp reconciliation.
 */

import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { auth, db } from "../firebase";
import { HeartbeatEntry } from "../types";
import { 
  saveHeartbeat as saveLocalHeartbeat, 
  loadLastHeartbeat as loadLocalLastHeartbeat,
  updateLastHeartbeat,
  loadUserProfile,
  addPendingHeartbeat,
  getPendingHeartbeats,
  clearPendingHeartbeats,
  removePendingHeartbeat,
} from "../storage";
import { hydrateUserProfile } from "./profileService";

/**
 * Persists a heartbeat entry to Firestore (user subcollection, user document, and public status).
 */
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

  let fullName = "Usuario";
  let phone = "";
  try {
    let profile = await loadUserProfile(uid);
    if (!profile) {
      profile = await hydrateUserProfile(uid, auth.currentUser?.email);
    }
    if (profile) {
      fullName = profile.fullName ?? "Usuario";
      phone = profile.phone ?? "";
    }
  } catch (profileError) {
    console.warn("Could not load profile during persistHeartbeat, using defaults:", profileError);
  }

  const statusData: Record<string, any> = {
    lastAliveAt: serverTimestamp(),
    fullName,
    phone,
  };
  batch.set(doc(db, "userStatus", uid), statusData, { merge: true });

  await batch.commit();
}

/**
 * Sends a heartbeat: saves locally first, then attempts syncing to Firestore.
 * Queues the heartbeat locally if offline or if the network request fails.
 */
export async function sendHeartbeat(uid: string, heartbeat: HeartbeatEntry): Promise<{ success: boolean; queued: boolean }> {
  await saveLocalHeartbeat(uid, heartbeat);
  
  try {
    await persistHeartbeat(uid, heartbeat);
    // Fetch authoritative server timestamp from Firestore and sync to local storage
    await loadLastHeartbeat(uid);
    return { success: true, queued: false };
  } catch (error) {
    console.error("sendHeartbeat error:", error);
    await addPendingHeartbeat(uid, heartbeat);
    return { success: false, queued: true };
  }
}

/**
 * Synchronizes any pending offline heartbeats when network connectivity is restored.
 */
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

  if (synced > 0) {
    // Reconcile local last heartbeat with Firestore server timestamp
    await loadLastHeartbeat(uid);
  }

  return { synced, failed };
}

/**
 * Loads the last heartbeat timestamp, prioritizing Firestore server timestamps
 * and reconciling local cache for consistency.
 */
export async function loadLastHeartbeat(uid: string): Promise<string | null> {
  let firestoreTimestamp: string | null = null;

  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      const lastAliveAt = data.lastAliveAt;
      if (lastAliveAt) {
        firestoreTimestamp = typeof lastAliveAt.toDate === "function"
          ? lastAliveAt.toDate().toISOString()
          : new Date(lastAliveAt).toISOString();
      }
    }

    if (!firestoreTimestamp) {
      const statusDoc = await getDoc(doc(db, "userStatus", uid));
      if (statusDoc.exists()) {
        const data = statusDoc.data();
        const lastAliveAt = data.lastAliveAt;
        if (lastAliveAt) {
          firestoreTimestamp = typeof lastAliveAt.toDate === "function"
            ? lastAliveAt.toDate().toISOString()
            : new Date(lastAliveAt).toISOString();
        }
      }
    }
  } catch (error) {
    console.warn("Could not fetch last heartbeat from Firestore, falling back to local:", error);
  }

  const localLast = await loadLocalLastHeartbeat(uid);

  if (firestoreTimestamp) {
    // Reconcile local storage with Firestore server timestamp if different
    if (!localLast || firestoreTimestamp !== localLast) {
      await updateLastHeartbeat(uid, firestoreTimestamp).catch(() => {});
    }
    return firestoreTimestamp;
  }

  return localLast;
}

export { getPendingHeartbeats } from "../storage";
