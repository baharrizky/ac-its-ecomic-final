import { collection, doc, onSnapshot, setDoc, deleteDoc, query, where } from "firebase/firestore";
import { db, firebaseEnabled, ensureFirebaseAuth } from "./firebaseService";

const COLLECTION = "ecomic_questions_v2";

export async function saveCloudQuestion(question) {
  if (!firebaseEnabled || !db || !question?.id || !(await ensureFirebaseAuth())) return false;
  try { await setDoc(doc(db, COLLECTION, question.id), { ...question, updatedAt: new Date().toISOString() }, { merge: true }); return true; }
  catch (e) { console.warn("Cloud question write failed:", e); return false; }
}

export async function deleteCloudQuestion(id) {
  if (!firebaseEnabled || !db || !id || !(await ensureFirebaseAuth())) return false;
  try { await deleteDoc(doc(db, COLLECTION, id)); return true; } catch (e) { console.warn("Cloud question delete failed:", e); return false; }
}

export async function subscribeCloudQuestions(session, onChange) {
  if (!firebaseEnabled || !db || !(await ensureFirebaseAuth())) return () => {};
  let source = collection(db, COLLECTION);
  if (session?.role === "teacher") source = query(collection(db, COLLECTION), where("ownerTeacherUid", "==", session.uid));
  else if (session?.role === "student") { if (!session.classId) return () => {}; source = query(collection(db, COLLECTION), where("status", "==", "Published"), where("assignedClassIds", "array-contains", session.classId)); }
  return onSnapshot(source, snap => onChange(snap.docs.map(d => ({ id:d.id, ...d.data() }))), error => console.warn("Cloud question subscription failed:", error));
}
