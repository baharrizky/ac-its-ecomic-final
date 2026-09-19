import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const env = import.meta.env;
export const firebaseEnabled = Boolean(
  env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_AUTH_DOMAIN && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_APP_ID
);

let app = null;
let auth = null;
let db = null;
let storage = null;
let authPromise = null;

if (firebaseEnabled) {
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
  app = getApps().length ? getApps()[0] : initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export async function ensureFirebaseAuth() {
  if (!firebaseEnabled || !auth) return false;
  if (auth.currentUser) return true;
  if (!authPromise) {
    authPromise = signInAnonymously(auth).then(() => true).catch((error) => {
      authPromise = null;
      console.warn("Firebase anonymous auth belum aktif:", error);
      return false;
    });
  }
  return authPromise;
}

export { app, auth, db, storage };
export async function getFirebaseIdToken() {
  if (!(await ensureFirebaseAuth()) || !auth?.currentUser) return null;
  return auth.currentUser.getIdToken();
}
