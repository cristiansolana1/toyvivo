import { deleteField, doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { auth, db } from "../firebase";
import { FIXED_COUNTRY } from "../constants";
import { UserProfile } from "../types";
import { normalizeDNI } from "../utils/validation";
import {
  loadUserProfile as loadLocalProfile,
  saveUserProfile as saveLocalProfile,
} from "../storage";

export async function saveUserProfile(
  uid: string,
  profile: UserProfile,
  email?: string | null
): Promise<void> {
  if (auth.currentUser?.uid !== uid) throw new Error("UNAUTHENTICATED");

  const previousProfile = await loadLocalProfile(uid);
  const normalizedProfile = { ...profile, dni: normalizeDNI(profile.dni) };
  if (!/^\d{7,8}$/.test(normalizedProfile.dni)) throw new Error("INVALID_DNI");

  const dniLookupRef = doc(db, "dniLookups", normalizedProfile.dni);
  const previousDni = previousProfile?.dni ? normalizeDNI(previousProfile.dni) : null;
  const previousDniLookupRef =
    previousDni && previousDni !== normalizedProfile.dni
      ? doc(db, "dniLookups", previousDni)
      : null;
  const [existingDniLookup, previousDniLookup] = await Promise.all([
    getDoc(dniLookupRef),
    previousDniLookupRef ? getDoc(previousDniLookupRef) : Promise.resolve(null),
  ]);
  if (existingDniLookup.exists() && existingDniLookup.data().uid !== uid) {
    throw new Error("DNI_ALREADY_REGISTERED");
  }

  const userRef = doc(db, "users", uid);
  const batch = writeBatch(db);
  batch.set(userRef, {
    publicProfile: {
      fullName: normalizedProfile.fullName,
      country: normalizedProfile.country,
      province: normalizedProfile.province,
      dni: deleteField(),
      phone: deleteField(),
      birthDate: deleteField(),
    },
    ...(email ? { emailNormalized: email.trim().toLowerCase() } : {}),
    profileUpdatedAt: serverTimestamp(),
  }, { merge: true });
  batch.set(doc(db, "users", uid, "private", "profile"), normalizedProfile);
  if (
    previousDniLookupRef &&
    previousDniLookup?.exists() &&
    previousDniLookup.data().uid === uid
  ) {
    batch.delete(previousDniLookupRef);
  }
  batch.set(dniLookupRef, { uid });
  batch.set(doc(db, "userStatus", uid), {
    fullName: normalizedProfile.fullName,
    phone: normalizedProfile.phone,
  }, { merge: true });
  await batch.commit();
  try {
    await saveLocalProfile(uid, normalizedProfile);
  } catch (error) {
    console.warn("Profile saved to Firestore but local cache failed:", error);
  }
}

export async function hydrateUserProfile(
  uid: string,
  email?: string | null
): Promise<UserProfile | null> {
  const localProfile = await loadLocalProfile(uid);
  if (localProfile) {
    try {
      await saveUserProfile(uid, localProfile, email);
    } catch {
      // Keep the cached profile usable and retry cloud migration on a later startup.
    }
    return localProfile;
  }

  const privateDoc = await getDoc(doc(db, "users", uid, "private", "profile"));
  const userDoc = privateDoc.exists()
    ? null
    : await getDoc(doc(db, "users", uid));
  const privateProfile = privateDoc.data() as UserProfile | undefined;
  const publicProfile = userDoc?.data()?.publicProfile as
    | Pick<UserProfile, "fullName" | "dni" | "phone" | "country" | "province" | "birthDate">
    | undefined;
  const legacyProfile = userDoc?.data()?.profile as UserProfile | undefined;
  const cloudProfile: UserProfile | null = privateProfile
    ? privateProfile
    : publicProfile
      ? {
          fullName: publicProfile.fullName,
          dni: publicProfile.dni,
          phone: publicProfile.phone,
          country: publicProfile.country ?? FIXED_COUNTRY,
          province: publicProfile.province ?? "BA",
          birthDate: publicProfile.birthDate ?? "",
        }
      : legacyProfile ?? null;

  if (cloudProfile) {
    try {
      await saveUserProfile(uid, cloudProfile, email);
    } catch {
      // Return the cloud profile even if secure-profile migration must be retried.
    }
  }

  return cloudProfile;
}