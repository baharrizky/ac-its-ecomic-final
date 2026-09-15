import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db, firebaseEnabled, ensureFirebaseAuth } from "./firebaseService";

const COLLECTION = "ecomic_comics";

export async function loadCloudComics() {
  if (!firebaseEnabled || !db || !(await ensureFirebaseAuth())) return null;
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    if (snap.empty) return [];
    return snap.docs.map(d => d.data());
  } catch (error) {
    console.warn("Cloud comic read failed:", error);
    return null;
  }
}

export async function saveCloudComic(comic) {
  if (!firebaseEnabled || !db || !comic?.id || !(await ensureFirebaseAuth())) return false;
  try {
    await setDoc(doc(db, COLLECTION, comic.id), comic, { merge: true });
    return true;
  } catch (error) {
    console.warn("Cloud comic write failed:", error);
    return false;
  }
}
