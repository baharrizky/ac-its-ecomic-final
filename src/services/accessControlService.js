import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db, firebaseEnabled, ensureFirebaseAuth } from "./firebaseService";

const CLASSES = "classes_v3";
const TEACHER_CODES = "teacherRegistrationCodes_v3";

function localRead(key, fallback = []) { try { const raw = localStorage.getItem(`acits-access:${key}`); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function localWrite(key, value) { try { localStorage.setItem(`acits-access:${key}`, JSON.stringify(value)); } catch {} }
function localUpsert(key, item) { const rows = localRead(key, []); localWrite(key, [...rows.filter(x => x.id !== item.id), item]); }
async function ready() { return Boolean(firebaseEnabled && db && await ensureFirebaseAuth()); }
function normalizeSchool(value = "") {
  return String(value || "")
    .trim().toLowerCase()
    .replace(/\bsma\s+negeri\b/g, "sman")
    .replace(/\bsma\s+n\b/g, "sman")
    .replace(/\bsmp\s+negeri\b/g, "smpn")
    .replace(/\bsmp\s+n\b/g, "smpn")
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeLevel(value = "") {
  const v = String(value || "").trim().toUpperCase();
  return v === "SENIOR HIGH SCHOOL" ? "SMA" : v === "JUNIOR HIGH SCHOOL" ? "SMP" : v;
}

function normalizeGradeRombel(grade = "", rombel = "") {
  let g = String(grade || "").trim().toUpperCase();
  let r = String(rombel || "").trim();
  const combined = g || r;
  const m = combined.match(/^(VII|VIII|IX|X|XI|XII)[\s._-]*(\d+)$/i);
  if (m) { g = m[1].toUpperCase(); r = m[2]; }
  return { grade: g, rombel: r || "1" };
}

function localClasses() { return localRead("classes", []); }


export async function createTeacherRegistrationCode(adminUid, meta = {}) {
  const code = `GURU-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const id = code;
  const item = { id, code, active: true, createdBy: adminUid, createdAt: new Date().toISOString(), maxUses: Number(meta.maxUses || 1), usedCount: 0, label: meta.label || "Registrasi Guru" };
  localUpsert("teacher-codes", item);
  if (await ready()) { try { await setDoc(doc(db, TEACHER_CODES, id), item, { merge: true }); } catch(e) { throw new Error(`Kode registrasi gagal disimpan ke Firebase: ${e?.code || e?.message || "unknown error"}`); } }
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
  if (!teacher?.uid) throw new Error("Akun Guru belum siap.");
  const normalized = normalizeGradeRombel(data.grade || teacher.grade || "X", data.rombel || teacher.rombel || "1");
  const school = String(data.school || teacher.school || "").trim();
  const level = normalizeLevel(data.educationLevel || teacher.educationLevel || "SMA");
  const existing = await listClassesForTeacher(teacher.uid);
  const duplicate = existing.find(x => normalizeSchool(x.school) === normalizeSchool(school) && normalizeLevel(x.educationLevel) === level && normalizeGradeRombel(x.grade, x.rombel).grade === normalized.grade && normalizeGradeRombel(x.grade, x.rombel).rombel === normalized.rombel && x.active !== false);
  if (duplicate) return duplicate;
  const id = `class-${teacher.uid}-${Date.now()}`;
  const item = { id, teacherUid: teacher.uid, teacherName: teacher.name || "Guru", school, educationLevel: level, grade: normalized.grade, rombel: normalized.rombel, name: `${normalized.grade} ${normalized.rombel}`, active: true, enrollmentOpen: true, createdAt: new Date().toISOString() };
  localUpsert("classes", item);
  if (await ready()) {
    try { await setDoc(doc(db, CLASSES, id), item, { merge: true }); }
    catch (e) { throw new Error(`Kelas gagal disimpan ke Firebase: ${e?.code || e?.message || "permission/network error"}`); }
  }
  return item;
}

export async function listClassesForTeacher(teacherUid) {
  if (!teacherUid) return [];
  const local = localClasses().filter(x => x.teacherUid === teacherUid);
  if (await ready()) {
    try {
      const snap = await getDocs(query(collection(db, CLASSES), where("teacherUid", "==", teacherUid)));
      const cloud = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      const byId = new Map(cloud.map(x => [x.id, x]));
      local.forEach(x => { if (!byId.has(x.id)) byId.set(x.id, x); });
      return [...byId.values()].sort((a,b)=>String(a.grade+a.rombel).localeCompare(String(b.grade+b.rombel)));
    } catch (e) { console.warn("class list failed", e); }
  }
  return local.sort((a,b)=>String(a.grade+a.rombel).localeCompare(String(b.grade+b.rombel)));
}

export async function findOpenClass({ school, educationLevel, grade, rombel }) {
  const level = normalizeLevel(educationLevel);
  const normalized = normalizeGradeRombel(grade, rombel);
  const schoolKey = normalizeSchool(school);
  const matches = rows => rows.find(x => {
    const xr = normalizeGradeRombel(x.grade, x.rombel);
    return x.active !== false && x.enrollmentOpen !== false && normalizeSchool(x.school) === schoolKey && normalizeLevel(x.educationLevel) === level && xr.grade === normalized.grade && xr.rombel === normalized.rombel;
  }) || null;
  if (await ready()) {
    try {
      // Query exact school first so Firestore security rules can prove that
      // every returned class is eligible for student registration.
      const q = query(collection(db, CLASSES), where("school", "==", String(school || "").trim()), where("educationLevel", "==", level), where("grade", "==", normalized.grade), where("rombel", "==", normalized.rombel));
      const snap = await getDocs(q);
      const exact = matches(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      if (exact) return exact;
      // Support the common alias "SMA Negeri" vs "SMAN" without opening a
      // broad class query that would violate Firestore security constraints.
      const aliases = [];
      if (/^sman\b/i.test(String(school || ""))) aliases.push(String(school).replace(/^SMAN/i, "SMA Negeri"));
      if (/^sma\s+negeri\b/i.test(String(school || ""))) aliases.push(String(school).replace(/^SMA\s+Negeri/i, "SMAN"));
      for (const alias of aliases) {
        if (alias.trim() === String(school || "").trim()) continue;
        const q2 = query(collection(db, CLASSES), where("school", "==", alias.trim()), where("educationLevel", "==", level), where("grade", "==", normalized.grade), where("rombel", "==", normalized.rombel));
        const snap2 = await getDocs(q2);
        const found = matches(snap2.docs.map(d => ({ id:d.id, ...d.data() })));
        if (found) return found;
      }
    } catch (e) { console.warn("open class lookup failed", e); }
  }
  return matches(localClasses());
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
