import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBRms5EeqROmMZjlQ1WN9acCFQxrLKMX-E",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "scoutme-3e4b6.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "scoutme-3e4b6",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "scoutme-3e4b6.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "477910526721",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:477910526721:web:3c5964e4ac1d62db5ac900",
};

// Demo Mode only if API key is a placeholder — never as an error fallback
export const isDemoMode =
  !firebaseConfig.apiKey ||
  firebaseConfig.apiKey.includes("Mock") ||
  firebaseConfig.apiKey.includes("placeholder");

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
