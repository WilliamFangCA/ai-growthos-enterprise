import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDAi784Vs6u8-a6Stw7mmRJqVD8t9VeNCA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ai-growthos-enterprise.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-growthos-enterprise",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ai-growthos-enterprise.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "887937315039",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:887937315039:web:2d68fc5c4ac36ea6bdf96a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-8P3TVPQEFM"
};

const app = initializeApp(firebaseConfig);

let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  // Analytics may fail in non-browser or blocked environments
}

export const auth = getAuth(app);
export const firestoreDb = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export { analytics };

export function trackEvent(eventName, params = {}) {
  if (analytics) {
    try { logEvent(analytics, eventName, params); } catch (e) {}
  }
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export function signOutUser() {
  return signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export default app;
