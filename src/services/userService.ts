import {
  collection,
  doc,
  documentId,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { loadUserProfile as loadLocalProfile } from "../storage";

export async function requestContactByDni(
  dni: string,
  requesterUid: string
): Promise<"pending" | "restored"> {
  const normalizedDni = dni.replace(/\D/g, "");
  if (!/^\d{7,8}$/.test(normalizedDni)) throw new Error("INVALID_DNI");
  const lookup = await getDoc(doc(db, "dniLookups", normalizedDni));
  if (!lookup.exists()) throw new Error("USER_NOT_FOUND");

  const targetUid = String(lookup.data().uid ?? "");
  if (!targetUid || targetUid === requesterUid) throw new Error("INVALID_TARGET");
  const watchingRef = doc(db, "users", requesterUid, "watching", targetUid);
  const trustedRef = doc(db, "users", targetUid, "trustedContacts", requesterUid);
  const [persistentContact, trustedContact] = await Promise.all([getDoc(watchingRef), getDoc(trustedRef)]);
  if (persistentContact.exists()) throw new Error("CONTACT_ALREADY_EXISTS");
  if (trustedContact.exists()) {
    await setDoc(watchingRef, { uid: targetUid, approvedAt: serverTimestamp() });
    return "restored";
  }

  const profile = await loadLocalProfile(requesterUid);
  const requestRef = doc(db, "users", targetUid, "contactRequests", requesterUid);
  const existingRequest = await getDoc(requestRef);
  if (existingRequest.exists()) {
    const status = existingRequest.data().status;
    if (status === "pending") throw new Error("REQUEST_ALREADY_EXISTS");
    if (status === "rejected") throw new Error("REQUEST_REJECTED");
  }
  await setDoc(requestRef, {
    requesterUid,
    requesterName: profile?.fullName ?? "Usuario de Estoy Bien",
    dni: normalizedDni,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return "pending";
}

export function subscribeToWatchingUserIds(
  uid: string,
  onUpdate: (ids: string[]) => void,
  onError?: () => void
): () => void {
  return onSnapshot(collection(db, "users", uid, "watching"), (snapshot) => {
    onUpdate(snapshot.docs.map((contact) => contact.id));
  }, onError);
}

export type ContactRequest = {
  requesterUid: string;
  requesterName: string;
};

export function subscribeToContactRequests(
  uid: string,
  onUpdate: (requests: ContactRequest[]) => void,
  onError?: () => void
): () => void {
  const requestsQuery = query(
    collection(db, "users", uid, "contactRequests"),
    where("status", "==", "pending")
  );

  return onSnapshot(
    requestsQuery,
    (snapshot) => onUpdate(snapshot.docs.map((request) => ({
      requesterUid: request.id,
      requesterName: request.data().requesterName ?? "Usuario de Estoy Bien",
    }))),
    onError
  );
}

export async function respondToContactRequest(requesterUid: string, approved: boolean): Promise<void> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) throw new Error("UNAUTHENTICATED");
  const ownerProfile = await getDoc(doc(db, "users", currentUid, "private", "profile"));
  if (approved && !ownerProfile.data()?.phone) throw new Error("PROFILE_PHONE_MISSING");

  const requestRef = doc(db, "users", currentUid, "contactRequests", requesterUid);
  const requestSnapshot = await getDoc(requestRef);
  if (!requestSnapshot.exists() || requestSnapshot.data().status !== "pending") {
    throw new Error("REQUEST_NOT_PENDING");
  }

  const batch = writeBatch(db);
  batch.update(requestRef, {
    status: approved ? "approved" : "rejected",
    respondedAt: serverTimestamp(),
  });
  if (approved) {
    batch.set(doc(db, "users", currentUid, "trustedContacts", requesterUid), {
      uid: requesterUid,
      displayName: requestSnapshot.data().requesterName ?? "Usuario de Estoy Bien",
      approvedAt: serverTimestamp(),
    });
    batch.set(doc(db, "users", requesterUid, "watching", currentUid), {
      uid: currentUid,
      approvedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function removeWatchingUser(uid: string, targetUserId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "users", uid, "watching", targetUserId));
  batch.delete(doc(db, "users", targetUserId, "trustedContacts", uid));
  await batch.commit();
}

export type WatchedUserStatus = {
  uid: string;
  fullName: string;
  phone: string;
  lastAliveAt: string | null;
};

export function subscribeToWatchedUsers(
  userIds: string[],
  onUpdate: (user: WatchedUserStatus) => void,
  onError?: () => void
): () => void {
  if (userIds.length === 0) return () => {};

  const unsubscribers = userIds.map((uid) => {
    return onSnapshot(
      doc(db, "userStatus", uid),
      (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        onUpdate({
          uid: docSnap.id,
          fullName: data.fullName ?? "Usuario",
          phone: data.phone ?? "",
          lastAliveAt: data.lastAliveAt?.toDate?.()?.toISOString?.() ?? null,
        });
      },
      onError
    );
  });

  return () => unsubscribers.forEach((unsub) => unsub());
}