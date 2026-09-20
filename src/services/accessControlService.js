import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db, firebaseEnabled, ensureFirebaseAuth } from "./firebaseService";

const CLASSES = "classes_v3";
const TEACHER_CODES = "teacherRegistrationCodes_v3";

// Normalisasi identitas sekolah/kelas agar data lama dan data baru tetap cocok.
export function normalizeSchoolName(value = "") {
  const s = String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
  if (!s) return "";
  const compact = s.replace(/[.,]/g, "").replace(/\s+/g, "");
  if (compact === "sman5kotajambi" || compact === "smanegeri5kotajambi") return "sman5kotajambi";
  if (compact === "smpn5kotajambi" || compact === "smpnegeri5kotajambi") return "smpn5kotajambi";
  return compact.replace(/^sma negeri /, "sman ").replace(/^smp negeri /, "smpn ");
}

export function normalizeGrade(value = "") {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeRombel(value = "") {
  const s = String(value || "").trim().toUpperCase();
  const m = s.match(/(?:X|XI|XII|VII|VIII|IX)?\s*[.\-]?\s*(\d+)$/);
  return m ? String(Number(m[1])) : s.replace(/[^0-9]/g, "") || s;
}

export function sameSchool(a, b) { return normalizeSchoolName(a) === normalizeSchoolName(b); }

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
  const school = String(data.school || teacher.school || "").trim();
  const educationLevel = String(data.educationLevel || "SMA").trim().toUpperCase();
  const grade = normalizeGrade(data.grade || "X");
  const rombel = normalizeRombel(data.rombel || "1");
  const existing = await listClassesForTeacher(teacher.uid);
  const duplicate = existing.find(x => sameSchool(x.school, school) && String(x.educationLevel || "").toUpperCase() === educationLevel && normalizeGrade(x.grade) === grade && normalizeRombel(x.rombel) === rombel && x.active !== false);
  if (duplicate) return duplicate;
  const id = `class-${teacher.uid}-${Date.now()}`;
  const item = { id, teacherUid: teacher.uid, teacherName: teacher.name || "Guru", school, educationLevel, grade, rombel, name: `${grade} ${rombel}`, active: true, enrollmentOpen: true, createdAt: new Date().toISOString() };
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
  const targetSchool = normalizeSchoolName(school);
  const targetLevel = String(educationLevel || "").trim().toUpperCase();
  const targetGrade = normalizeGrade(grade);
  const targetRombel = normalizeRombel(rombel || "1");
  const matches = rows => rows.find(x => x.active !== false && x.enrollmentOpen !== false && sameSchool(x.school, targetSchool) && String(x.educationLevel || "").toUpperCase() === targetLevel && normalizeGrade(x.grade) === targetGrade && normalizeRombel(x.rombel) === targetRombel);
  if (await ready()) {
    try {
      // Jangan query school secara exact karena data lama dapat memakai
      // "SMA Negeri 5 Kota Jambi" sementara data baru memakai "SMAN 5 Kota Jambi".
      // Query field yang stabil, lalu normalisasi nama sekolah di client.
      const q = query(collection(db, CLASSES), where("educationLevel", "==", targetLevel), where("grade", "==", targetGrade), where("rombel", "==", targetRombel));
      const snap = await getDocs(q);
      const rows = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      return matches(rows) || null;
    } catch (e) { console.warn("findOpenClass failed:", e); }
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
