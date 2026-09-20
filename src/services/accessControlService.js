import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db, firebaseEnabled, ensureFirebaseAuth } from "./firebaseService";

const CLASSES = "classes_v3";
const TEACHER_CODES = "teacherRegistrationCodes_v3";

function localRead(key, fallback = []) { try { const raw = localStorage.getItem(`acits-access:${key}`); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function localWrite(key, value) { try { localStorage.setItem(`acits-access:${key}`, JSON.stringify(value)); } catch {} }
function localUpsert(key, item) { const rows = localRead(key, []); localWrite(key, [...rows.filter(x => x.id !== item.id), item]); }
async function ready() { return Boolean(firebaseEnabled && db && await ensureFirebaseAuth()); }

// Semua pembandingan kelas harus memakai nilai kanonik agar variasi tampilan
// seperti "X 1", "X-1", atau "1" tidak membuat kelas yang sama dianggap berbeda.
export function normalizeGrade(value) {
  const s = String(value ?? "").trim().toUpperCase();
  if (["7", "VII"].includes(s)) return "VII";
  if (["8", "VIII"].includes(s)) return "VIII";
  if (["9", "IX"].includes(s)) return "IX";
  if (["10", "X"].includes(s)) return "X";
  if (["11", "XI"].includes(s)) return "XI";
  if (["12", "XII"].includes(s)) return "XII";
  return s;
}

export function normalizeRombel(value, grade = "") {
  const raw = String(value ?? "").trim().toUpperCase().replace(/[._-]+/g, " ").replace(/\s+/g, " ");
  const normalizedGrade = normalizeGrade(grade);
  const withoutGrade = normalizedGrade ? raw.replace(new RegExp(`^${normalizedGrade}\\s*`, "i"), "") : raw;
  const match = withoutGrade.match(/\d+/);
  return match ? String(Number(match[0])) : withoutGrade.trim();
}

export function normalizeSchool(value) {
  let s = String(value ?? "").trim().toUpperCase().replace(/[._-]+/g, " ").replace(/\s+/g, " ");
  // Samakan singkatan umum sekolah negeri: SMAN 5 -> SMA NEGERI 5,
  // SMPN 5 -> SMP NEGERI 5.
  s = s.replace(/^SMAN\s+(\d+)/, "SMA NEGERI $1");
  s = s.replace(/^SMPN\s+(\d+)/, "SMP NEGERI $1");
  return s;
}

function sameClass(a, b) {
  return normalizeSchool(a.school) === normalizeSchool(b.school)
    && normalizeGrade(a.grade) === normalizeGrade(b.grade)
    && normalizeRombel(a.rombel, a.grade) === normalizeRombel(b.rombel, b.grade)
    && String(a.educationLevel || "").trim().toUpperCase() === String(b.educationLevel || "").trim().toUpperCase();
}

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
  if (await ready()) {
    try {
      await updateDoc(doc(db, TEACHER_CODES, item.id), { usedCount: next.usedCount, usedBy: next.usedBy });
      localUpsert("teacher-codes", next);
    } catch (e) { return { ok:false, message:"Kode valid tetapi gagal dikunci. Coba lagi." }; }
  } else {
    localUpsert("teacher-codes", next);
  }
  return { ok:true, item:next };
}

export async function createTeacherClass(teacher, data = {}) {
  const desired = {
    school: data.school || teacher.school || "",
    educationLevel: String(data.educationLevel || "SMA").trim().toUpperCase(),
    grade: normalizeGrade(data.grade || "X"),
    rombel: normalizeRombel(data.rombel || "1", data.grade || "X"),
  };
  const existing = await listClassesForTeacher(teacher.uid);
  const duplicate = existing.find(x => x.active !== false && sameClass(x, desired));
  if (duplicate) return duplicate;

  const id = `class-${teacher.uid}-${Date.now()}`;
  const item = {
    id,
    teacherUid: teacher.uid,
    teacherName: teacher.name || "Guru",
    school: desired.school,
    educationLevel: desired.educationLevel,
    grade: desired.grade,
    rombel: desired.rombel,
    name: `${desired.grade} ${desired.rombel}`,
    active: true,
    enrollmentOpen: true,
    createdAt: new Date().toISOString()
  };

  // Firestore adalah sumber kebenaran untuk data lintas akun.
  if (await ready()) {
    await setDoc(doc(db, CLASSES, id), item, { merge: true });
    localUpsert("classes", item);
  } else {
    localUpsert("classes", item);
  }
  return item;
}

export async function listClassesForTeacher(teacherUid) {
  if (!teacherUid) return [];
  if (await ready()) {
    try {
      const snap = await getDocs(query(collection(db, CLASSES), where("teacherUid", "==", teacherUid)));
      return snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b)=>String(a.grade+a.rombel).localeCompare(String(b.grade+b.rombel)));
    } catch (e) { console.warn("Gagal membaca kelas Guru dari Firestore:", e); return []; }
  }
  return localRead("classes", []).filter(x => x.teacherUid === teacherUid);
}

export async function findOpenClass({ school, educationLevel, grade, rombel }) {
  const requested = {
    school: String(school || "").trim(),
    educationLevel: String(educationLevel || "").trim().toUpperCase(),
    grade: normalizeGrade(grade),
    rombel: normalizeRombel(rombel, grade),
  };

  const matches = rows => rows.find(x =>
    x.active !== false &&
    x.enrollmentOpen !== false &&
    sameClass(x, requested)
  ) || null;

  if (await ready()) {
    try {
      // Hanya query kelas yang pendaftarannya terbuka. Setelah itu sekolah,
      // jenjang, tingkat, dan rombel dicocokkan di client dengan normalisasi.
      // Ini menghindari mismatch "SMAN 5" vs "SMA Negeri 5" dan "X 1" vs "1".
      const snap = await getDocs(query(
        collection(db, CLASSES),
        where("active", "==", true),
        where("enrollmentOpen", "==", true)
      ));
      const rows = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      const match = matches(rows);
      if (match) return match;
      console.warn("Kelas terbuka tidak cocok dengan pilihan siswa", { requested, available: rows.map(x => ({ id:x.id, school:x.school, educationLevel:x.educationLevel, grade:x.grade, rombel:x.rombel, active:x.active, enrollmentOpen:x.enrollmentOpen })) });
      return null;
    } catch (e) {
      console.error("findOpenClass Firestore error:", e);
      // Jangan fallback ke localStorage saat Firebase aktif. Local-only class
      // tidak bisa dipakai untuk menghubungkan akun Guru dan Siswa yang berbeda.
      return null;
    }
  }
  return matches(localRead("classes", []));
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
