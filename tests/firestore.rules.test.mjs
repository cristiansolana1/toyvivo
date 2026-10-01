import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, beforeEach, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";

const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
let testEnvironment;

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: "demo-estoybien-rules",
    firestore: { rules },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
});

after(async () => {
  await testEnvironment.cleanup();
});

async function seedFirestore(seed) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await seed(context.firestore());
  });
}

test("users cannot read or list another user's profile or heartbeat history", async () => {
  await seedFirestore(async (db) => {
    await setDoc(doc(db, "users/alice"), { publicProfile: { fullName: "Alice" } });
    await setDoc(doc(db, "users/alice/private/profile"), { dni: "12345678" });
    await setDoc(doc(db, "users/alice/heartbeats/one"), { status: "alive" });
  });

  const bob = testEnvironment.authenticatedContext("bob").firestore();
  const alice = testEnvironment.authenticatedContext("alice").firestore();
  await assertFails(getDoc(doc(bob, "users/alice")));
  await assertFails(getDocs(collection(bob, "users")));
  await assertFails(getDoc(doc(bob, "users/alice/private/profile")));
  await assertFails(getDoc(doc(bob, "users/alice/heartbeats/one")));
  await assertSucceeds(getDoc(doc(alice, "users/alice/private/profile")));
});

test("only an approved contact can read a user's shared status", async () => {
  await seedFirestore(async (db) => {
    await setDoc(doc(db, "userStatus/alice"), {
      fullName: "Alice",
      phone: "+541100000000",
      lastAliveAt: null,
    });
    await setDoc(doc(db, "users/alice/trustedContacts/bob"), { uid: "bob" });
  });

  const bob = testEnvironment.authenticatedContext("bob").firestore();
  const mallory = testEnvironment.authenticatedContext("mallory").firestore();
  const alice = testEnvironment.authenticatedContext("alice").firestore();
  assert.equal((await assertSucceeds(getDoc(doc(bob, "userStatus/alice")))).data().fullName, "Alice");
  await assertFails(getDoc(doc(mallory, "userStatus/alice")));
  await assertFails(setDoc(doc(alice, "userStatus/alice"), {
    fullName: "Alice",
    phone: "+541100000000",
    dni: "12345678",
  }));
});

test("contact request records are readable by the owner and addressed requester only", async () => {
  await seedFirestore(async (db) => {
    await setDoc(doc(db, "users/alice/contactRequests/bob"), {
      requesterUid: "bob",
      status: "pending",
    });
  });

  const alice = testEnvironment.authenticatedContext("alice").firestore();
  const bob = testEnvironment.authenticatedContext("bob").firestore();
  const mallory = testEnvironment.authenticatedContext("mallory").firestore();
  await assertSucceeds(getDocs(collection(alice, "users/alice/contactRequests")));
  await assertSucceeds(getDoc(doc(bob, "users/alice/contactRequests/bob")));
  await assertFails(getDoc(doc(mallory, "users/alice/contactRequests/bob")));
  await assertFails(setDoc(doc(alice, "users/alice/contactRequests/mallory"), { status: "approved" }));
  await assertFails(setDoc(doc(alice, "users/alice/trustedContacts/mallory"), { uid: "mallory" }));
  await assertFails(setDoc(doc(bob, "users/bob/watching/alice"), { uid: "alice" }));
});

test("an exact DNI lookup returns only a UID and cannot be enumerated", async () => {
  await seedFirestore(async (db) => {
    await setDoc(doc(db, "dniLookups/12345678"), { uid: "alice" });
    await setDoc(doc(db, "users/alice/private/profile"), {
      fullName: "Alice",
      dni: "12345678",
      phone: "+541100000000",
      birthDate: "1990-01-01",
    });
  });

  const bob = testEnvironment.authenticatedContext("bob").firestore();
  const mallory = testEnvironment.authenticatedContext("mallory").firestore();
  const lookup = await assertSucceeds(getDoc(doc(bob, "dniLookups/12345678")));
  assert.deepEqual(lookup.data(), { uid: "alice" });
  await assertFails(getDoc(doc(bob, "users/alice/private/profile")));
  await assertFails(getDocs(collection(mallory, "dniLookups")));
});

test("DNI lookup records must match the owner's private profile and cannot be claimed by another user", async () => {
  const alice = testEnvironment.authenticatedContext("alice").firestore();
  const profileAndIndex = writeBatch(alice);
  profileAndIndex.set(doc(alice, "users/alice/private/profile"), { dni: "12345678" });
  profileAndIndex.set(doc(alice, "dniLookups/12345678"), { uid: "alice" });
  await assertSucceeds(profileAndIndex.commit());

  const bob = testEnvironment.authenticatedContext("bob").firestore();
  const claimExistingIndex = writeBatch(bob);
  claimExistingIndex.set(doc(bob, "users/bob/private/profile"), { dni: "12345678" });
  claimExistingIndex.set(doc(bob, "dniLookups/12345678"), { uid: "bob" });
  await assertFails(claimExistingIndex.commit());
  assert.equal((await getDoc(doc(alice, "dniLookups/12345678"))).data().uid, "alice");
});

test("a DNI request must resolve to its target UID", async () => {
  await seedFirestore(async (db) => {
    await setDoc(doc(db, "dniLookups/12345678"), { uid: "alice" });
    await setDoc(doc(db, "dniLookups/87654321"), { uid: "carol" });
  });

  const bob = testEnvironment.authenticatedContext("bob").firestore();
  await assertSucceeds(setDoc(doc(bob, "users/alice/contactRequests/bob"), {
    requesterUid: "bob",
    requesterName: "Bob",
    dni: "12345678",
    status: "pending",
    createdAt: serverTimestamp(),
  }));
  await assertFails(setDoc(doc(bob, "users/carol/contactRequests/bob"), {
    requesterUid: "bob",
    requesterName: "Bob",
    dni: "12345678",
    status: "pending",
    createdAt: serverTimestamp(),
  }));
});

test("a stale approved request can be reopened when no persistent contact or permission exists", async () => {
  await seedFirestore(async (db) => {
    await setDoc(doc(db, "dniLookups/12345678"), { uid: "alice" });
    await setDoc(doc(db, "users/alice/contactRequests/bob"), {
      requesterUid: "bob",
      requesterName: "Bob",
      dni: "12345678",
      status: "approved",
      createdAt: Timestamp.fromMillis(Date.now() - 1000),
      respondedAt: Timestamp.fromMillis(Date.now() - 500),
    });
  });

  const bob = testEnvironment.authenticatedContext("bob").firestore();
  await assertSucceeds(setDoc(doc(bob, "users/alice/contactRequests/bob"), {
    requesterUid: "bob",
    requesterName: "Bob",
    dni: "12345678",
    status: "pending",
    createdAt: serverTimestamp(),
  }));
  assert.equal((await assertSucceeds(getDoc(doc(bob, "users/alice/contactRequests/bob")))).data().status, "pending");
});

test("a remaining trusted permission repairs a missing persistent watching entry", async () => {
  await seedFirestore(async (db) => {
    await setDoc(doc(db, "userStatus/alice"), {
      fullName: "Alice",
      phone: "+541100000000",
    });
    await setDoc(doc(db, "users/alice/trustedContacts/bob"), {
      uid: "bob",
      displayName: "Bob",
    });
    await setDoc(doc(db, "users/alice/contactRequests/bob"), {
      requesterUid: "bob",
      requesterName: "Bob",
      dni: "12345678",
      status: "approved",
      createdAt: Timestamp.fromMillis(Date.now()),
    });
  });

  const bob = testEnvironment.authenticatedContext("bob").firestore();
  await assertSucceeds(setDoc(doc(bob, "users/bob/watching/alice"), {
    uid: "alice",
    approvedAt: serverTimestamp(),
  }));
  await assertSucceeds(getDoc(doc(bob, "userStatus/alice")));
});

test("the owner can approve a DNI request atomically and grant status access", async () => {
  await seedFirestore(async (db) => {
    await setDoc(doc(db, "users/alice/contactRequests/bob"), {
      requesterUid: "bob",
      requesterName: "Bob",
      dni: "12345678",
      status: "pending",
      createdAt: Timestamp.fromMillis(Date.now()),
    });
    await setDoc(doc(db, "userStatus/alice"), {
      fullName: "Alice",
      phone: "+541100000000",
    });
  });

  const alice = testEnvironment.authenticatedContext("alice").firestore();
  const batch = writeBatch(alice);
  batch.update(doc(alice, "users/alice/contactRequests/bob"), {
    status: "approved",
    respondedAt: serverTimestamp(),
  });
  batch.set(doc(alice, "users/alice/trustedContacts/bob"), {
    uid: "bob",
    displayName: "Bob",
    approvedAt: serverTimestamp(),
  });
  batch.set(doc(alice, "users/bob/watching/alice"), {
    uid: "alice",
    approvedAt: serverTimestamp(),
  });
  await assertSucceeds(batch.commit());

  const bob = testEnvironment.authenticatedContext("bob").firestore();
  assert.equal((await assertSucceeds(getDoc(doc(bob, "userStatus/alice")))).data().phone, "+541100000000");
});

test("Quitar removes the persistent contact and revokes its status permission atomically", async () => {
  await seedFirestore(async (db) => {
    await setDoc(doc(db, "userStatus/alice"), {
      fullName: "Alice",
      phone: "+541100000000",
    });
    await setDoc(doc(db, "users/alice/trustedContacts/bob"), {
      uid: "bob",
      displayName: "Bob",
    });
    await setDoc(doc(db, "users/bob/watching/alice"), { uid: "alice" });
  });

  const bob = testEnvironment.authenticatedContext("bob").firestore();
  const leavePermissionActive = writeBatch(bob);
  leavePermissionActive.delete(doc(bob, "users/bob/watching/alice"));
  await assertFails(leavePermissionActive.commit());

  await assertSucceeds((async () => {
    const batch = writeBatch(bob);
    batch.delete(doc(bob, "users/bob/watching/alice"));
    batch.delete(doc(bob, "users/alice/trustedContacts/bob"));
    await batch.commit();
  })());
  await assertFails(getDoc(doc(bob, "userStatus/alice")));
});

test("the configured admin can list users for the admin panel", async () => {
  await seedFirestore(async (db) => {
    await setDoc(doc(db, "users/alice"), { publicProfile: { fullName: "Alice" } });
  });

  const admin = testEnvironment.authenticatedContext("admin", {
    email: "cristiansolana1@gmail.com",
    email_verified: true,
  }).firestore();
  await assertSucceeds(getDocs(collection(admin, "users")));
});

test("users can create one survey response but cannot edit or delete it", async () => {
  await seedFirestore(async (db) => {
    await setDoc(doc(db, "surveys/survey1"), { question: "Question?" });
  });

  const alice = testEnvironment.authenticatedContext("alice").firestore();
  const response = doc(alice, "surveys/survey1/responses/alice");
  await assertSucceeds(setDoc(response, { answer: "A" }));
  await assertFails(setDoc(response, { answer: "B" }));
  await assertFails(deleteDoc(response));

  const admin = testEnvironment.authenticatedContext("admin", {
    email: "cristiansolana1@gmail.com",
    email_verified: true,
  }).firestore();
  await assertSucceeds(deleteDoc(doc(admin, "surveys/survey1/responses/alice")));
});
