import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
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
let authReadyPromise = null;

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

async function waitForFirebaseAuthReady() {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve) => {
      let settled = false;
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (settled) return;
        settled = true;
        unsubscribe();
        resolve(user || null);
      });
    });
  }
  return authReadyPromise;
}

export async function ensureFirebaseAuth() {
  if (!firebaseEnabled || !auth) return false;
  const restoredUser = await waitForFirebaseAuthReady();
  // Firebase is the source of truth. Do NOT silently create an anonymous
  // session because that makes a persisted local Teacher session look valid
  // while Firestore correctly denies Teacher-only queries.
  return Boolean(restoredUser || auth.currentUser);
}

export { app, auth, db, storage };

export async function getFirebaseIdToken() {
  if (!(await ensureFirebaseAuth()) || !auth?.currentUser) return null;
  return auth.currentUser.getIdToken();
}
