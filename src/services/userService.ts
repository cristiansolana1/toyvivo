import { doc, getDoc, setDoc, query, collection, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile } from "../types";
import { saveUserProfile as saveLocalProfile, loadUserProfile as loadLocalProfile } from "../storage";

export async function saveUserProfile(uid: string, profile: UserProfile): Promise<void> {
  await saveLocalProfile(uid, profile);
  await setDoc(
    doc(db, "users", uid),
    {
      publicProfile: {
        fullName: profile.fullName,
        dni: profile.dni,
        phone: profile.phone,
        country: profile.country,
        province: profile.province,
        birthDate: profile.birthDate,
      },
      profileUpdatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function loadUserProfile(uid: string): Promise<UserProfile | null> {
  return loadLocalProfile(uid);
}

export async function getUserByDni(dni: string): Promise<{ uid: string; profile: UserProfile } | null> {
  const [publicResult, legacyResult] = await Promise.all([
    getDocs(query(collection(db, "users"), where("publicProfile.dni", "==", dni))),
    getDocs(query(collection(db, "users"), where("profile.dni", "==", dni))),
  ]);
  const userDoc = [...publicResult.docs, ...legacyResult.docs][0];
  if (!userDoc) return null;

  const data = userDoc.data();
  const profile = data.publicProfile ?? data.profile;
  return { uid: userDoc.id, profile: profile as UserProfile };
}

export async function getUserById(uid: string): Promise<UserProfile | null> {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) return null;
  const data = userDoc.data();
  return (data.publicProfile ?? data.profile) as UserProfile;
}

export async function addWatchingUser(uid: string, targetUserId: string): Promise<void> {
  const userDoc = await getDoc(doc(db, "users", uid));
  const currentIds = (userDoc.data()?.watchingUserIds as string[]) ?? [];
  if (currentIds.includes(targetUserId)) return;

  const updatedIds = [...currentIds, targetUserId];
  await setDoc(doc(db, "users", uid), { watchingUserIds: updatedIds }, { merge: true });
}

export async function removeWatchingUser(uid: string, targetUserId: string): Promise<void> {
  const userDoc = await getDoc(doc(db, "users", uid));
  const currentIds = (userDoc.data()?.watchingUserIds as string[]) ?? [];
  const updatedIds = currentIds.filter((id) => id !== targetUserId);
  await setDoc(doc(db, "users", uid), { watchingUserIds: updatedIds }, { merge: true });
}

export async function getWatchingUserIds(uid: string): Promise<string[]> {
  const userDoc = await getDoc(doc(db, "users", uid));
  return (userDoc.data()?.watchingUserIds as string[]) ?? [];
}

export type WatchedUserStatus = {
  uid: string;
  fullName: string;
  phone: string;
  lastAliveAt: string | null;
};

export async function getWatchedUsersStatus(userIds: string[]): Promise<WatchedUserStatus[]> {
  if (userIds.length === 0) return [];

  const dniIds = userIds.filter((id) => id.startsWith("dni:"));
  const registeredIds = userIds.filter((id) => !id.startsWith("dni:"));

  const dniUsers = await Promise.all(
    dniIds.map(async (id) => {
      const dni = id.slice("dni:".length);
      const result = await getUserByDni(dni);
      if (!result) {
        return { uid: id, fullName: "Usuario sin Cuenta", phone: "", lastAliveAt: null } as WatchedUserStatus;
      }
      return {
        uid: id,
        fullName: result.profile.fullName,
        phone: result.profile.phone,
        lastAliveAt: null,
      } as WatchedUserStatus;
    })
  );

  // Batch read for registered users - get all docs in parallel (optimized from N individual calls)
  let registeredUsers: WatchedUserStatus[] = [];
  if (registeredIds.length > 0) {
    const userDocs = await Promise.all(
      registeredIds.map((uid) => getDoc(doc(db, "users", uid)))
    );
    const userData = userDocs.map((doc) => doc.data());
    const newUsers = await Promise.all(
      registeredIds.map((uid, index) => {
        const data = userData[index];
        if (!data) return null;
        const profile = (data.publicProfile ?? data.profile) as UserProfile | undefined;
        if (!profile) return null;
        return {
          uid,
          fullName: profile.fullName,
          phone: profile.phone,
          lastAliveAt: data.lastAliveAt?.toDate?.()?.toISOString?.() ?? null,
        } as WatchedUserStatus;
      })
    );
    registeredUsers = newUsers.filter((u): u is WatchedUserStatus => u !== null);
  }

  return [...dniUsers, ...registeredUsers];
}

export function subscribeToWatchedUsers(
  userIds: string[],
  onUpdate: (user: WatchedUserStatus) => void
): () => void {
  const registeredIds = userIds.filter((id) => !id.startsWith("dni:"));
  if (registeredIds.length === 0) return () => {};

  const unsubscribers = registeredIds.map((watchedUserId) =>
    onSnapshot(doc(db, "users", watchedUserId), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      const profile = data.publicProfile ?? data.profile;
      onUpdate({
        uid: watchedUserId,
        fullName: profile?.fullName ?? "Usuario sin Cuenta",
        phone: profile?.phone ?? "",
        lastAliveAt: data?.lastAliveAt?.toDate?.()?.toISOString?.() ?? null,
      });
    })
  );

  return () => unsubscribers.forEach((unsub) => unsub());
}