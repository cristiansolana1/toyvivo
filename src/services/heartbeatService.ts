import { collection, addDoc, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { HeartbeatEntry } from "../types";
import { saveHeartbeat as saveLocalHeartbeat, loadLastHeartbeat as loadLocalLastHeartbeat } from "../storage";

export async function sendHeartbeat(uid: string, heartbeat: HeartbeatEntry): Promise<void> {
  await saveLocalHeartbeat(uid, heartbeat);
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
}

export async function loadLastHeartbeat(uid: string): Promise<string | null> {
  return loadLocalLastHeartbeat(uid);
}