import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAPIfQYG5mCdF1-4DFwWNyxQG2trHfFv24",
  authDomain: "toyvivo-213f7.firebaseapp.com",
  projectId: "toyvivo-213f7",
  storageBucket: "toyvivo-213f7.firebasestorage.app",
  messagingSenderId: "947221650406",
  appId: "1:947221650406:web:8f922ef2a525830f9d1427",
  measurementId: "G-SHWNQ3XDEY",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);