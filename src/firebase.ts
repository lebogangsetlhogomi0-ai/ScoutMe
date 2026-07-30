import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAdDUv8nApCkZgZJas-XgxqI5Cm20qr2vw",
  authDomain: "scoutme-10.firebaseapp.com",
  projectId: "scoutme-10",
  storageBucket: "scoutme-10.firebasestorage.app",
  messagingSenderId: "1000343432088",
  appId: "1:1000343432088:web:18cddf91845cc0718dd9ed",
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
