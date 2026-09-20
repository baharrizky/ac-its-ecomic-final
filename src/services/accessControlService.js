import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db, firebaseEnabled, ensureFirebaseAuth } from "./firebaseService";

const CLASSES = "classes_v3";
const TEACHER_CODES = "teacherRegistrationCodes_v3";

function localRead(key, fallback = []) { try { const raw = localStorage.getItem(`acits-access:${key}`); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function localWrite(key, value) { try { localStorage.setItem(`acits-access:${key}`, JSON.stringify(value)); } catch {} }
function localUpsert(key, item) { const rows = localRead(key, []); localWrite(key, [...rows.filter(x => x.id !== item.id), item]); }
async function ready() { return Boolean(firebaseEnabled && db && await ensureFirebaseAuth()); }

export async function createTeacherRegistrationCode(adminUid, meta = {}) {
  const code = `GURU-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const id = code;
  const item = { id, code, active: true, createdBy: adminUid, createdAt: new Date().toISOString(), maxUses: Number(meta.maxUses || 1), usedCount: 0, label: meta.label || "Registrasi Guru" };
  localUpsert("teacher-codes", item);
  if (await ready()) { await setDoc(doc(db, TEACHER_CODES, id), item, { merge: true }); }
  return item;
}

export async function listTeacherRegistrationCodes() {
  if (await ready()) {
    try { const snap = await getDocs(collection(db, TEACHER_CODES)); return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => String(b.createdAt||"").localeCompare(String(a.createdAt||""))); } catch (e) { console.warn(e); }
  }
  return localRead("teacher-codes", []);
}

export async function deactivateTeacherRegistrationCode(id) {
  localWrite("teacher-codes", localRead("teacher-codes", []).map(x => x.id === id ? { ...x, active: false } : x));
  if (await ready()) { try { await updateDoc(doc(db, TEACHER_CODES, id), { active: false }); return true; } catch (e) { console.warn(e); } }
  return true;
}

export async function getTeacherRegistrationCode(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return null;
  if (await ready()) {
    try { const snap = await getDoc(doc(db, TEACHER_CODES, normalized)); if (!snap.exists()) return null; return { id: snap.id, ...snap.data() }; } catch (e) { console.warn(e); }
  }
  return localRead("teacher-codes", []).find(x => x.code === normalized) || null;
}

export async function consumeTeacherRegistrationCode(code, teacherUid) {
  const item = await getTeacherRegistrationCode(code);
  if (!item || item.active === false || (item.maxUses && Number(item.usedCount || 0) >= Number(item.maxUses))) return { ok: false, message: "Kode registrasi guru tidak valid, sudah digunakan, atau tidak aktif." };
  const next = { ...item, usedCount: Number(item.usedCount || 0) + 1, usedBy: [...(item.usedBy || []), teacherUid] };
  localUpsert("teacher-codes", next);
  if (await ready()) {
    try { await updateDoc(doc(db, TEACHER_CODES, item.id), { usedCount: next.usedCount, usedBy: next.usedBy }); } catch (e) { return { ok:false, message:"Kode valid tetapi gagal dikunci. Coba lagi." }; }
  }
  return { ok:true, item:next };
}

export async function createTeacherClass(teacher, data = {}) {
  const existing = await listClassesForTeacher(teacher.uid);
  const duplicate = existing.find(x => x.school === (data.school || teacher.school || "") && x.educationLevel === (data.educationLevel || "SMA") && x.grade === (data.grade || "X") && String(x.rombel) === String(data.rombel || "1") && x.active !== false);
  if (duplicate) return duplicate;
  const id = `class-${teacher.uid}-${Date.now()}`;
  const item = { id, teacherUid: teacher.uid, teacherName: teacher.name || "Guru", school: data.school || teacher.school || "", educationLevel: data.educationLevel || "SMA", grade: data.grade || "X", rombel: data.rombel || "1", name: `${data.grade || "X"} ${data.rombel || "1"}`, active: true, enrollmentOpen: true, createdAt: new Date().toISOString() };
  localUpsert("classes", item);
  if (await ready()) { await setDoc(doc(db, CLASSES, id), item, { merge: true }); }
  return item;
}

export async function listClassesForTeacher(teacherUid) {
  if (!teacherUid) return [];
  if (await ready()) {
    try { const snap = await getDocs(query(collection(db, CLASSES), where("teacherUid", "==", teacherUid))); return snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b)=>String(a.grade+a.rombel).localeCompare(String(b.grade+b.rombel))); } catch (e) { console.warn(e); }
  }
  return localRead("classes", []).filter(x => x.teacherUid === teacherUid);
}

export async function findOpenClass({ school, educationLevel, grade, rombel }) {
  const matches = rows => rows.find(x => x.active !== false && x.enrollmentOpen !== false && x.school === school && x.educationLevel === educationLevel && x.grade === grade && String(x.rombel) === String(rombel));
  if (await ready()) {
    try {
      const q = query(collection(db, CLASSES), where("school", "==", school), where("educationLevel", "==", educationLevel), where("grade", "==", grade), where("rombel", "==", String(rombel)));
      const snap = await getDocs(q); return snap.docs.map(d => ({ id:d.id, ...d.data() })).find(x => x.active !== false && x.enrollmentOpen !== false) || null;
    } catch (e) { console.warn(e); }
  }
  return matches(localRead("classes", [])) || null;
}

export async function listAllClasses() {
  if (await ready()) { try { const snap = await getDocs(collection(db, CLASSES)); return snap.docs.map(d => ({ id:d.id, ...d.data() })); } catch (e) { console.warn(e); } }
  return localRead("classes", []);
}

export async function listAllTeachers() {
  if (await ready()) {
    try {
      const snap = await getDocs(query(collection(db, "users"), where("role", "==", "teacher")));
      return snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() }));
    } catch (e) { console.warn(e); }
  }
  return localRead("teachers", []);
}

export async function listAllStudents() {
  if (await ready()) {
    try {
      const snap = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
      return snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() }));
    } catch (e) { console.warn(e); }
  }
  return localRead("students", []);
}
