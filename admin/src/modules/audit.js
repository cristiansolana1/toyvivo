import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getDbInstance } from "./firebase.js";
import { getAdminEmail } from "./auth.js";

const db = getDbInstance();

export async function logAdminAction(action, targetId = null, details = {}) {
  try {
    await addDoc(collection(db, "adminLogs"), {
      adminEmail: getAdminEmail(),
      action,
      targetId,
      details,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.warn("[AuditLog] Failed to record action:", err);
  }
}
