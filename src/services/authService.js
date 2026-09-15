import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, firebaseEnabled } from "./firebaseService";

const KEY = "ac-its-ecomic-session-v2";
const ACCOUNTS_KEY = "ac-its-ecomic-registered-accounts-v1";

const accounts = {
  teacher: { email: "guru@acits.id", password: "guru123", role: "teacher", name: "Aulia Fadhilah Rinaldi", subtitle: "Guru" },
  student: { email: "siswa@acits.id", password: "siswa123", role: "student", name: "Ahmad", subtitle: "Siswa", educationLevel: "SMA", grade: "X" },
};

function readRegisteredAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]"); } catch { return []; }
}
function writeRegisteredAccounts(items) { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(items)); }

function makeSession(profile, uid = null) {
  return {
    uid,
    role: profile.role,
    name: profile.name,
    subtitle: profile.subtitle || (profile.role === "teacher" ? "Guru" : "Siswa"),
    email: profile.email,
    educationLevel: profile.educationLevel || null,
    grade: profile.grade || null,
    loggedAt: new Date().toISOString(),
  };
}

export function getSession(){
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}

export async function login(role, email, password){
  const normalizedEmail = email.trim().toLowerCase();

  if (firebaseEnabled && auth) {
    try {
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      let profile = null;
      if (db) {
        const snap = await getDoc(doc(db, "users", credential.user.uid));
        if (snap.exists()) profile = snap.data();
      }
      if (!profile) {
        const registered = readRegisteredAccounts().find(a => a.email === normalizedEmail);
        profile = registered || { email: normalizedEmail, name: credential.user.displayName || "Pengguna", role: role || "student", subtitle: role === "teacher" ? "Guru" : "Siswa" };
      }
      if (role && profile.role && profile.role !== role) return { ok:false, message:`Akun ini terdaftar sebagai ${profile.role === "teacher" ? "Guru" : "Siswa"}. Silakan pilih login yang sesuai.` };
      const session = makeSession(profile, credential.user.uid);
      localStorage.setItem(KEY, JSON.stringify(session));
      return { ok:true, session };
    } catch (error) {
      const code = error?.code || "";
      if (!["auth/invalid-credential", "auth/invalid-login-credentials", "auth/user-not-found", "auth/wrong-password", "auth/operation-not-allowed"].includes(code)) {
        return { ok:false, message: firebaseMessage(error) };
      }
      // For the development/demo account, continue to the local fallback below.
    }
  }

  const account = role === "teacher" || role === "student" ? accounts[role] : null;
  const local = account && account.email === normalizedEmail && account.password === password
    ? account
    : readRegisteredAccounts().find(a => a.role === role && a.email === normalizedEmail && a.password === password);

  if (!local) return { ok:false, message:"Email atau password tidak sesuai." };
  const session = makeSession(local);
  localStorage.setItem(KEY, JSON.stringify(session));
  return { ok:true, session };
}

export async function registerAccount(form){
  const role = form.role;
  const email = form.email.trim().toLowerCase();
  const name = form.name.trim();

  if (!name || !email || !form.password) return { ok:false, message:"Nama, email, dan password wajib diisi." };
  if (form.password.length < 6) return { ok:false, message:"Password minimal 6 karakter." };
  if (form.password !== form.confirmPassword) return { ok:false, message:"Konfirmasi password tidak sama." };
  if (!role) return { ok:false, message:"Pilih jenis akun terlebih dahulu." };
  if (role === "student" && (!form.educationLevel || !form.grade)) return { ok:false, message:"Jenjang dan kelas siswa wajib dipilih." };

  const profile = {
    name,
    email,
    role,
    subtitle: role === "teacher" ? "Guru" : "Siswa",
    educationLevel: role === "student" ? form.educationLevel : null,
    grade: role === "student" ? form.grade : null,
    school: form.school?.trim() || "",
    createdAt: new Date().toISOString(),
  };

  if (firebaseEnabled && auth) {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, form.password);
      if (credential.user) await updateProfile(credential.user, { displayName: name });
      if (db) await setDoc(doc(db, "users", credential.user.uid), profile, { merge: true });
      const session = makeSession(profile, credential.user.uid);
      localStorage.setItem(KEY, JSON.stringify(session));
      return { ok:true, session };
    } catch (error) {
      if (error?.code !== "auth/operation-not-allowed") return { ok:false, message: firebaseMessage(error) };
    }
  }

  const existing = readRegisteredAccounts();
  if ([...Object.values(accounts), ...existing].some(a => a.email === email)) {
    return { ok:false, message:"Email sudah terdaftar. Silakan login." };
  }
  writeRegisteredAccounts([...existing, { ...profile, password: form.password }]);
  const session = makeSession(profile);
  localStorage.setItem(KEY, JSON.stringify(session));
  return { ok:true, session };
}

function firebaseMessage(error){
  const code = error?.code || "";
  const map = {
    "auth/email-already-in-use": "Email sudah terdaftar. Silakan login.",
    "auth/invalid-email": "Format email tidak valid.",
    "auth/weak-password": "Password terlalu lemah. Gunakan minimal 6 karakter.",
    "auth/operation-not-allowed": "Email/Password Authentication belum diaktifkan di Firebase.",
    "auth/invalid-credential": "Email atau password tidak sesuai.",
    "auth/user-not-found": "Akun belum terdaftar.",
    "auth/wrong-password": "Password tidak sesuai.",
  };
  return map[code] || `Autentikasi gagal (${code || "unknown"}).`;
}

export async function logout(){
  localStorage.removeItem(KEY);
  if (firebaseEnabled && auth) { try { await signOut(auth); } catch {} }
}
export const demoAccounts = accounts;
