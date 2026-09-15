import { collection, doc, getDocs, onSnapshot, setDoc } from "firebase/firestore";
import { db, firebaseEnabled, ensureFirebaseAuth } from "./firebaseService";

const COLLECTION = "ecomic_comics";

function normalizeComic(data) {
  return {
    ...data,
    episodes: Array.isArray(data.episodes) ? data.episodes : [],
    concepts: Array.isArray(data.concepts) ? data.concepts : [],
  };
}

export async function loadCloudComics() {
  if (!firebaseEnabled || !db || !(await ensureFirebaseAuth())) return null;
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    return snap.docs.map(d => normalizeComic({ id: d.id, ...d.data() }));
  } catch (error) {
    console.warn("Cloud comic read failed:", error);
    return null;
  }
}

export async function saveCloudComic(comic) {
  if (!firebaseEnabled || !db || !comic?.id || !(await ensureFirebaseAuth())) return false;
  try {
    await setDoc(doc(db, COLLECTION, comic.id), { ...comic, syncedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (error) {
    console.warn("Cloud comic write failed:", error);
    return false;
  }
}

export async function subscribeCloudComics(onChange) {
  if (!firebaseEnabled || !db || !(await ensureFirebaseAuth())) return () => {};
  const unsubscribe = onSnapshot(
    collection(db, COLLECTION),
    snap => onChange(snap.docs.map(d => normalizeComic({ id: d.id, ...d.data() }))),
    error => console.warn("Cloud comic subscription failed:", error)
  );
  return unsubscribe;
}
