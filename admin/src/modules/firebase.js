import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

let app = null;
let auth = null;
let db = null;

export function initFirebase(config) {
  if (app) return { app, auth, db };
  
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  
  return { app, auth, db };
}

function ensureInitialized() {
  if (!app && window.FIREBASE_CONFIG) {
    initFirebase(window.FIREBASE_CONFIG);
  }
  if (!app) {
    throw new Error("Firebase not initialized. Call initFirebase() first or ensure window.FIREBASE_CONFIG is set.");
  }
}

export function getFirebase() {
  ensureInitialized();
  return { app, auth, db };
}

export function getAuthInstance() {
  ensureInitialized();
  return auth;
}

export function getDbInstance() {
  ensureInitialized();
  return db;
}