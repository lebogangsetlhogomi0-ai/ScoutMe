// ============================================
// FIREBASE SETUP — REQUIRED FOR LIVE AUTH
// ============================================
// 1. Go to console.firebase.google.com
// 2. Click "Add Project" → name it "ScoutMe"
// 3. Build → Authentication → Get Started
// 4. Sign-in method → Email/Password → Enable → Save
// 5. Gear icon → Project Settings → Your Apps → </> (web)
// 6. Register app "ScoutMe Web" → copy firebaseConfig
// 7. Replace placeholder values below with real values
// 8. Build → Firestore → Create database → Test mode
// 9. Build → Storage → Get started → Test mode
// ============================================
// DEMO MODE: If keys remain as placeholders,
// the app automatically runs in Demo Mode.
// Any email + password combination will work.
// All data is stored in memory for the session.
// ============================================

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBRms5EeqROmMZjlQ1WN9acCFQxrLKMX-E",
  authDomain: "scoutme-3e4b6.firebaseapp.com",
  projectId: "scoutme-3e4b6",
  storageBucket: "scoutme-3e4b6.firebasestorage.app",
  messagingSenderId: "477910526721",
  appId: "1:477910526721:web:3c5964e4ac1d62db5ac900",
  measurementId: "G-8NTYGHDQRY"
};

let app = null;
let auth: any = null;
let db: any = null;
let storage: any = null;
let isDemoMode = false;

try {
  // If the apiKey is a placeholder, we default to Demo Mode immediately to bypass real connection.
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "AIzaSyMockPlaceholderKey12345" || firebaseConfig.apiKey.includes("Mock")) {
    console.log("Firebase not configured — running in Demo Mode");
    isDemoMode = true;
  } else {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    isDemoMode = false;
  }
} catch (error) {
  console.log("Firebase not configured — running in Demo Mode", error);
  isDemoMode = true;
}

export { auth, db, storage, isDemoMode };
