import { collection, doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { db, firebaseEnabled, ensureFirebaseAuth } from "./firebaseService";

const COLLECTION = "ecomic_questions";

export async function saveCloudQuestion(question) {
  if (!firebaseEnabled || !db || !question?.id || !(await ensureFirebaseAuth())) return false;
  try { await setDoc(doc(db, COLLECTION, question.id), { ...question, updatedAt: new Date().toISOString() }, { merge: true }); return true; }
  catch (e) { console.warn("Cloud question write failed:", e); return false; }
}

export async function deleteCloudQuestion(id) {
  if (!firebaseEnabled || !db || !id || !(await ensureFirebaseAuth())) return false;
  try { await deleteDoc(doc(db, COLLECTION, id)); return true; } catch (e) { console.warn("Cloud question delete failed:", e); return false; }
}

export async function subscribeCloudQuestions(onChange) {
  if (!firebaseEnabled || !db || !(await ensureFirebaseAuth())) return () => {};
  return onSnapshot(collection(db, COLLECTION), snap => onChange(snap.docs.map(d => ({ id:d.id, ...d.data() }))), error => console.warn("Cloud question subscription failed:", error));
}
