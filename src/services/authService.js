import { createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut, updateProfile, deleteUser } from "firebase/auth";
import { collection, doc, getDocs, getDoc, query, setDoc, where, deleteDoc } from "firebase/firestore";
import { auth, db, firebaseEnabled } from "./firebaseService";
import { getTeacherRegistrationCode, consumeTeacherRegistrationCode, findOpenClass } from "./accessControlService";

const KEY = "ac-its-ecomic-session-v5-access-control";
const ACCOUNTS_KEY = "ac-its-ecomic-registered-accounts-v3-access";

const accounts = {};

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
    rombel: profile.rombel || null,
    school: profile.school || "",
    teacherUid: profile.teacherUid || profile.classTeacherUid || null,
    classId: profile.classId || null,
    classTeacherUid: profile.classTeacherUid || profile.teacherUid || null,
    classTeacherName: profile.classTeacherName || "",
    classAccessCodeId: profile.classAccessCodeId || "",
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
      if (role && profile.role && profile.role !== role) {
        const roleLabel = profile.role === "teacher" ? "Guru" : profile.role === "admin" ? "Admin" : "Siswa";
        return { ok:false, message:`Akun ini terdaftar sebagai ${roleLabel}. Silakan pilih login yang sesuai.` };
      }
      if (profile.role === "student" && !profile.classId) {
        const match = await findOpenClass({ school: profile.school || "", educationLevel: profile.educationLevel, grade: profile.grade, rombel: profile.rombel || "1" });
        if (match) {
          profile = { ...profile, classId: match.id, classTeacherUid: match.teacherUid, classTeacherName: match.teacherName || "", classJoinedAt: new Date().toISOString() };
          if (db) await setDoc(doc(db, "users", credential.user.uid), { classId: match.id, classTeacherUid: match.teacherUid, classTeacherName: match.teacherName || "", classJoinedAt: profile.classJoinedAt }, { merge: true });
        }
      }
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
  if (role === "teacher" && !String(form.teacherInviteCode || "").trim()) return { ok:false, message:"Kode akses Admin wajib diisi untuk pendaftaran Guru." };
  if (!form.school?.trim()) return { ok:false, message:"Sekolah wajib dipilih." };
  if (role === "student" && (!form.educationLevel || !form.grade)) return { ok:false, message:"Jenjang dan kelas siswa wajib dipilih." };

  if (firebaseEnabled && auth) {
    let credential = null;

    try {
      if (auth.currentUser?.isAnonymous) { try { await signOut(auth); } catch {} }

      // Buat akun Auth terlebih dahulu. Setelah Auth berhasil, Firestore
      // mengizinkan akun baru membaca kelas yang masih terbuka sehingga
      // kita dapat menemukan classId + teacherUid yang tepat.
      credential = await createUserWithEmailAndPassword(auth, email, form.password);
      if (credential.user) await updateProfile(credential.user, { displayName: name });

      if (role === "student") {
        const classMatch = await findOpenClass({
          school: form.school.trim(),
          educationLevel: form.educationLevel,
          grade: form.grade,
          rombel: form.rombel || "1",
        });

        // Rules users/{uid} memang mewajibkan classId dan classTeacherUid.
        // Jangan membuat akun siswa yatim jika kelas belum tersedia.
        if (!classMatch) {
          try { await deleteUser(credential.user); } catch {}
          return {
            ok:false,
            message:"Kelas yang dipilih belum dibuka oleh Guru. Pilih kelas lain atau hubungi Guru/Admin."
          };
        }

        const now = new Date().toISOString();
        const profile = {
          name,
          email,
          role:"student",
          subtitle:"Siswa",
          educationLevel: form.educationLevel,
          grade: form.grade,
          rombel: form.rombel || "1",
          school: form.school.trim(),
          classId: classMatch.id,
          classTeacherUid: classMatch.teacherUid,
          classTeacherName: classMatch.teacherName || "",
          classJoinedAt: now,
          createdAt: now,
        };

        await setDoc(doc(db, "users", credential.user.uid), profile, { merge:true });

        // Inisialisasi Student Model agar akun langsung siap dipakai
        // oleh alur ITS/adaptive learning.
        await setDoc(doc(db, "studentModels_v2", credential.user.uid), {
          uid: credential.user.uid,
          teacherUid: classMatch.teacherUid,
          classId: classMatch.id,
          mastery: {},
          misconceptions: [],
          totalAttempts: 0,
          createdAt: now,
          updatedAt: now,
        }, { merge:true });

        const session = makeSession(profile, credential.user.uid);
        localStorage.setItem(KEY, JSON.stringify(session));
        return { ok:true, session };
      }

      // Registrasi Guru tetap menggunakan kode akses Admin.
      const invite = await getTeacherRegistrationCode(form.teacherInviteCode);
      if (!invite || invite.active === false || Number(invite.usedCount || 0) >= Number(invite.maxUses || 1)) {
        try { await deleteUser(credential.user); } catch {}
        return { ok:false, message:"Kode akses Admin tidak valid atau sudah digunakan." };
      }

      const now = new Date().toISOString();
      const profile = {
        name,
        email,
        role:"teacher",
        subtitle:"Guru",
        educationLevel:null,
        grade:null,
        rombel:null,
        school:form.school.trim(),
        classId:null,
        classTeacherUid:null,
        classTeacherName:"",
        classJoinedAt:null,
        createdAt:now,
      };

      await setDoc(doc(db, "users", credential.user.uid), {
        ...profile,
        teacherInviteCodeId:invite.id,
      }, { merge:true });

      const consumed = await consumeTeacherRegistrationCode(form.teacherInviteCode, credential.user.uid);
      if (!consumed.ok) {
        try { if (db) await deleteDoc(doc(db, "users", credential.user.uid)); } catch {}
        try { await deleteUser(credential.user); } catch {}
        return consumed;
      }

      const session = makeSession(profile, credential.user.uid);
      localStorage.setItem(KEY, JSON.stringify(session));
      return { ok:true, session };

    } catch (error) {
      console.error("Firebase registration error:", error);
      if (credential?.user && error?.code !== "auth/email-already-in-use") {
        // Hapus akun Auth yang terlanjur dibuat hanya jika profil belum
        // berhasil disimpan. Gagal cleanup tidak mengubah pesan utama.
        try {
          const snap = db ? await getDoc(doc(db, "users", credential.user.uid)) : null;
          if (!snap?.exists()) await deleteUser(credential.user);
        } catch {}
      }
      if (error?.code !== "auth/operation-not-allowed") {
        return { ok:false, message: firebaseMessage(error) };
      }
    }
  }

  // Fallback lokal/demo.
  let classMatch = null;
  if (role === "student") {
    classMatch = await findOpenClass({
      school: form.school?.trim() || "",
      educationLevel: form.educationLevel,
      grade: form.grade,
      rombel: form.rombel || "1"
    });
    if (!classMatch) return { ok:false, message:"Kelas yang dipilih belum dibuka oleh Guru. Pilih kelas lain atau hubungi Guru/Admin." };
  }

  const profile = {
    name,
    email,
    role,
    subtitle: role === "teacher" ? "Guru" : "Siswa",
    educationLevel: role === "student" ? form.educationLevel : null,
    grade: role === "student" ? form.grade : null,
    rombel: role === "student" ? (form.rombel || "1") : null,
    school: form.school?.trim() || "",
    classId: classMatch?.id || null,
    classTeacherUid: classMatch?.teacherUid || null,
    classTeacherName: classMatch?.teacherName || "",
    classJoinedAt: classMatch ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(),
  };

  if (role === "teacher") {
    const invite = await getTeacherRegistrationCode(form.teacherInviteCode);
    if (!invite || invite.active === false || Number(invite.usedCount || 0) >= Number(invite.maxUses || 1)) return { ok:false, message:"Kode akses Admin tidak valid atau sudah digunakan." };
  }

  const existing = readRegisteredAccounts();
  if ([...Object.values(accounts), ...existing].some(a => a.email === email)) {
    return { ok:false, message:"Email sudah terdaftar. Silakan login." };
  }
  const localUid = `local-${Date.now()}`;
  if (role === "teacher") await consumeTeacherRegistrationCode(form.teacherInviteCode, localUid);
  writeRegisteredAccounts([...existing, { ...profile, uid: localUid, password: form.password }]);
  const session = makeSession(profile, localUid);
  localStorage.setItem(KEY, JSON.stringify(session));
  return { ok:true, session };
}

export async function getRegisteredStudents(teacherUid = null){
  if (firebaseEnabled && db) {
    await ensureFirebaseAuth();
    try {
      const constraints = [where("role", "==", "student")];
      if (teacherUid) constraints.push(where("classTeacherUid", "==", teacherUid));
      const snap = await getDocs(query(collection(db, "users"), ...constraints));
      return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    } catch (error) {
      console.warn("Gagal mengambil daftar siswa dari Firebase:", error);
    }
  }
  return readRegisteredAccounts()
    .filter(a => a.role === "student" && (!teacherUid || a.classTeacherUid === teacherUid))
    .map(({ password, ...profile }) => profile);
}

export function updateSessionProfile(patch){
  const current=getSession();
  if(!current)return null;
  const next={...current,...patch};
  localStorage.setItem(KEY,JSON.stringify(next));
  return next;
}

export async function updateUserProfile(uid,patch){
  if(firebaseEnabled && db && uid){try{await setDoc(doc(db,"users",uid),patch,{merge:true});}catch(error){console.warn("profile update failed",error);}}
  return updateSessionProfile(patch);
}

export async function logout(){
  localStorage.removeItem(KEY);
  if (firebaseEnabled && auth) { try { await signOut(auth); } catch {} }
}
export async function resetPassword(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return { ok:false, message:"Masukkan email terlebih dahulu." };
  if (!(firebaseEnabled && auth)) {
    return { ok:false, message:"Fitur lupa sandi memerlukan koneksi Firebase Authentication." };
  }
  try {
    await sendPasswordResetEmail(auth, normalizedEmail);
    return { ok:true, message:"Link reset password sudah dikirim ke email tersebut. Periksa inbox atau folder spam." };
  } catch (error) {
    const code = error?.code || "";
    const map = {
      "auth/user-not-found":"Email belum terdaftar.",
      "auth/invalid-email":"Format email tidak valid.",
      "auth/too-many-requests":"Terlalu banyak permintaan. Coba lagi beberapa saat lagi."
    };
    return { ok:false, message:map[code] || `Gagal mengirim link reset (${code || "unknown"}).` };
  }
}

export const demoAccounts = accounts;
