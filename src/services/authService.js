import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { auth, db, firebaseEnabled } from "./firebaseService";

const KEY = "ac-its-ecomic-session-v2";

export const demoAccounts = {
  teacher: { email: "guru@acits.id", role: "teacher", name: "Aulia Fadhilah Rinaldi", subtitle: "Guru" },
  student: { email: "siswa@acits.id", role: "student", name: "Ahmad", subtitle: "Siswa" },
};

export function getSession() {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
  catch { return null; }
}

function saveSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

function createSession(user, profile) {
  const nama = profile.nama || profile.name || user.displayName || (profile.role === "teacher" ? "Guru" : "Siswa");
  return {
    uid: user.uid,
    email: user.email || profile.email || "",
    role: profile.role,
    name: nama,
    nama,
    subtitle: profile.role === "teacher" ? "Guru" : "Siswa",
    jenjang: profile.jenjang || "",
    sekolah: profile.sekolah || "",
    kelas: profile.kelas || "",
    mapel: profile.mapel || "",
    kelasAjar: profile.kelasAjar || [],
    kodeAkses: profile.kodeAkses || "",
    loggedAt: new Date().toISOString(),
  };
}

function friendlyAuthError(error) {
  switch (error?.code) {
    case "auth/invalid-credential": return "Email atau password salah.";
    case "auth/user-not-found": return "Akun tidak ditemukan.";
    case "auth/wrong-password": return "Password salah.";
    case "auth/invalid-email": return "Format email tidak valid.";
    case "auth/email-already-in-use": return "Email ini sudah terdaftar. Silakan login.";
    case "auth/weak-password": return "Password minimal 6 karakter.";
    case "auth/too-many-requests": return "Terlalu banyak percobaan. Coba lagi beberapa saat.";
    case "auth/network-request-failed": return "Koneksi ke Firebase gagal. Periksa internetmu.";
    default: return error?.message || "Terjadi kesalahan.";
  }
}

export async function login(role, email, password) {
  if (!role) return { ok: false, message: "Silakan pilih jenis akun." };
  if (!email?.trim()) return { ok: false, message: "Email wajib diisi." };
  if (!password) return { ok: false, message: "Password wajib diisi." };
  if (!firebaseEnabled || !auth || !db) return { ok: false, message: "Firebase belum aktif. Periksa .env.local." };

  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const user = credential.user;
    const profileSnap = await getDoc(doc(db, "users", user.uid));
    if (!profileSnap.exists()) {
      await signOut(auth);
      return { ok: false, message: "Profil pengguna belum ditemukan di Firestore." };
    }
    const profile = profileSnap.data();
    if (!profile.role) {
      await signOut(auth);
      return { ok: false, message: "Field role belum ada pada profil pengguna." };
    }
    if (profile.role !== role) {
      await signOut(auth);
      return { ok: false, message: profile.role === "teacher" ? "Akun ini terdaftar sebagai Guru. Pilih Login Guru." : "Akun ini terdaftar sebagai Siswa. Pilih Login Siswa." };
    }
    const session = createSession(user, profile);
    saveSession(session);
    return { ok: true, session };
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return { ok: false, message: friendlyAuthError(error) };
  }
}

export async function registerStudent({ nama, jenjang, sekolah, kelas, email, password }) {
  if (!nama?.trim() || !jenjang || !sekolah?.trim() || !kelas || !email?.trim() || !password) {
    return { ok: false, message: "Lengkapi semua data pendaftaran." };
  }
  if (password.length < 6) return { ok: false, message: "Password minimal 6 karakter." };
  if (!firebaseEnabled || !auth || !db) return { ok: false, message: "Firebase belum aktif. Periksa .env.local." };

  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const user = credential.user;
    const profile = {
      uid: user.uid,
      nama: nama.trim(),
      email: user.email || email.trim().toLowerCase(),
      role: "student",
      jenjang,
      sekolah: sekolah.trim(),
      kelas,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "users", user.uid), profile);
    await setDoc(doc(db, "progress", user.uid), {
      uid: user.uid,
      attempts: {},
      misconceptions: [],
      poolIndex: {},
      streak: 0,
      xp: 0,
      createdAt: new Date().toISOString(),
    });
    const session = createSession(user, profile);
    saveSession(session);
    return { ok: true, session };
  } catch (error) {
    console.error("REGISTER STUDENT ERROR:", error);
    return { ok: false, message: friendlyAuthError(error) };
  }
}

export async function registerTeacher({ nama, kodeAkses, kelasAjar, email, password }) {
  if (!nama?.trim() || !kodeAkses?.trim() || !email?.trim() || !password) {
    return { ok: false, message: "Lengkapi semua data pendaftaran guru." };
  }
  if (password.length < 6) return { ok: false, message: "Password minimal 6 karakter." };
  if (!firebaseEnabled || !auth || !db) return { ok: false, message: "Firebase belum aktif. Periksa .env.local." };

  const normalizedCode = kodeAkses.trim().toUpperCase();
  try {
    const codeRef = doc(db, "accessCodes", normalizedCode);
    const codeSnap = await getDoc(codeRef);
    if (!codeSnap.exists()) return { ok: false, message: "Kode akses tidak ditemukan." };
    const codeData = codeSnap.data();
    if (codeData.active === false) return { ok: false, message: "Kode akses ini sudah tidak aktif." };

    const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const user = credential.user;
    const kelasList = Array.isArray(kelasAjar) ? kelasAjar : String(kelasAjar || "").split(",").map(v => v.trim()).filter(Boolean);
    const profile = {
      uid: user.uid,
      nama: nama.trim(),
      email: user.email || email.trim().toLowerCase(),
      role: "teacher",
      sekolah: codeData.sekolah || "",
      mapel: codeData.mapel || "",
      kodeAkses: normalizedCode,
      kelasAjar: kelasList,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "users", user.uid), profile);
    try {
      await updateDoc(codeRef, { usedBy: arrayUnion(user.uid) });
    } catch (e) {
      console.warn("Kode akses tidak dapat diperbarui, akun guru tetap dibuat:", e);
    }
    const session = createSession(user, profile);
    saveSession(session);
    return { ok: true, session };
  } catch (error) {
    console.error("REGISTER TEACHER ERROR:", error);
    try { if (auth.currentUser) await signOut(auth); } catch {}
    return { ok: false, message: friendlyAuthError(error) };
  }
}

export async function logout() {
  localStorage.removeItem(KEY);
  if (firebaseEnabled && auth) {
    try { await signOut(auth); } catch (error) { console.error("Firebase logout:", error); }
  }
}

export const isFirebaseEnabled = Boolean(firebaseEnabled);
