import { collection, doc, onSnapshot, setDoc, deleteDoc, query, where } from "firebase/firestore";
import { db, firebaseEnabled, ensureFirebaseAuth } from "./firebaseService";

const COLLECTION = "ecomic_questions_v2";

export async function saveCloudQuestion(question) {
  if (!firebaseEnabled || !db || !question?.id || !(await ensureFirebaseAuth())) return false;
  try { await setDoc(doc(db, COLLECTION, question.id), { ...question, updatedAt: new Date().toISOString() }, { merge: true }); return true; }
  catch (e) { console.error("Cloud question write failed:", e); throw new Error(`Soal gagal disimpan ke Firebase: ${e?.code || e?.message || "unknown error"}`); }
}

export async function deleteCloudQuestion(id) {
  if (!firebaseEnabled || !db || !id || !(await ensureFirebaseAuth())) return false;
  try { await deleteDoc(doc(db, COLLECTION, id)); return true; } catch (e) { console.error("Cloud question delete failed:", e); throw new Error(`Soal gagal dihapus dari Firebase: ${e?.code || e?.message || "unknown error"}`); }
}

export async function subscribeCloudQuestions(session, onChange) {
  if (!firebaseEnabled || !db || !(await ensureFirebaseAuth())) return () => {};
  let source = collection(db, COLLECTION);
  if (session?.role === "teacher") source = query(collection(db, COLLECTION), where("ownerTeacherUid", "==", session.uid));
  else if (session?.role === "student") { if (!session.classTeacherUid) return () => {}; source = query(collection(db, COLLECTION), where("ownerTeacherUid", "==", session.classTeacherUid)); }
  return onSnapshot(source, snap => onChange(snap.docs.map(d => ({ id:d.id, ...d.data() })).filter(q => q.status === "Published")), error => console.warn("Cloud question subscription failed:", error));
}
