export async function login(role, email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  // =========================================================
  // FIREBASE LOGIN — GURU & SISWA
  // Firebase harus menjadi sumber identitas utama.
  // Jangan fallback diam-diam ke localStorage untuk Guru/Siswa.
  // =========================================================
  if (firebaseEnabled && auth) {
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );

      const uid = credential.user.uid;

      console.log("[AUTH] Firebase login berhasil:", {
        uid,
        email: credential.user.email,
        requestedRole: role,
      });

      // Ambil profil dari Firestore
      if (!db) {
        return {
          ok: false,
          message: "Firebase Firestore belum tersedia.",
        };
      }

      const profileSnap = await getDoc(
        doc(db, "users", uid)
      );

      if (!profileSnap.exists()) {
        await signOut(auth);

        return {
          ok: false,
          message:
            "Akun Firebase berhasil login, tetapi profil pengguna belum ditemukan di Firestore.",
        };
      }

      let profile = profileSnap.data();

      console.log("[AUTH] Profil Firestore:", profile);

      // Pastikan role sesuai
      if (role && profile.role && profile.role !== role) {
        await signOut(auth);

        const roleLabel =
          profile.role === "teacher"
            ? "Guru"
            : profile.role === "admin"
            ? "Admin"
            : "Siswa";

        return {
          ok: false,
          message: `Akun ini terdaftar sebagai ${roleLabel}. Silakan pilih login yang sesuai.`,
        };
      }

      // =====================================================
      // SISWA
      // =====================================================
      if (profile.role === "student") {
        // Siswa yang tidak punya classId tidak boleh
        // dianggap sebagai siswa normal.
        if (!profile.classId) {
          const match = await findOpenClass({
            school: profile.school || "",
            educationLevel: profile.educationLevel,
            grade: profile.grade,
            rombel: canonicalRombel(
              profile.grade,
              profile.rombel || "1"
            ),
          });

          if (match) {
            const joinedAt = new Date().toISOString();

            profile = {
              ...profile,
              classId: match.id,
              classTeacherUid: match.teacherUid,
              classTeacherName: match.teacherName || "",
              classJoinedAt: joinedAt,
            };

            await setDoc(
              doc(db, "users", uid),
              {
                classId: match.id,
                classTeacherUid: match.teacherUid,
                classTeacherName: match.teacherName || "",
                classJoinedAt: joinedAt,
              },
              { merge: true }
            );
          }
        }
      }

      // =====================================================
      // GURU
      // Pastikan UID session berasal dari Firebase Auth.
      // =====================================================
      if (profile.role === "teacher") {
        console.log("[AUTH] Guru Firebase UID:", uid);

        // Pastikan profil Guru benar-benar menggunakan
        // akun Firebase yang sedang login.
        profile = {
          ...profile,
          uid,
        };
      }

      // =====================================================
      // BUAT SESSION
      // =====================================================
      const session = makeSession(profile, uid);

      localStorage.setItem(
        KEY,
        JSON.stringify(session)
      );

      console.log("[AUTH] Session dibuat:", session);

      return {
        ok: true,
        session,
      };
    } catch (error) {
      console.error(
        "[AUTH] FIREBASE LOGIN ERROR:",
        error
      );

      const code = error?.code || "";

      const messages = {
        "auth/invalid-credential":
          "Email atau password salah.",

        "auth/invalid-login-credentials":
          "Email atau password salah.",

        "auth/user-not-found":
          "Email belum terdaftar di Firebase Authentication.",

        "auth/wrong-password":
          "Email atau password salah.",

        "auth/too-many-requests":
          "Terlalu banyak percobaan login. Coba lagi beberapa saat.",

        "auth/network-request-failed":
          "Koneksi ke Firebase gagal. Periksa internet lalu coba lagi.",

        "auth/operation-not-allowed":
          "Firebase Authentication Email/Password belum diaktifkan.",

        "auth/invalid-api-key":
          "Firebase API Key tidak valid.",

        "permission-denied":
          "Login berhasil, tetapi akses Firestore ditolak oleh Rules.",

        "permission-denied":
          "Akses Firestore ditolak. Periksa Firestore Rules.",
      };

      return {
        ok: false,
        message:
          messages[code] ||
          `Login Firebase gagal${
            code ? ` (${code})` : ""
          }.`,
      };
    }
  }

  // =========================================================
  // LOCAL FALLBACK
  // HANYA untuk mode Firebase tidak aktif.
  // =========================================================
  const account =
    role === "teacher" || role === "student"
      ? accounts[role]
      : null;

  const local =
    account &&
    account.email === normalizedEmail &&
    account.password === password
      ? account
      : readRegisteredAccounts().find(
          (a) =>
            a.role === role &&
            a.email === normalizedEmail &&
            a.password === password
        );

  if (!local) {
    return {
      ok: false,
      message: "Email atau password tidak sesuai.",
    };
  }

  const session = makeSession(local);

  localStorage.setItem(
    KEY,
    JSON.stringify(session)
  );

  return {
    ok: true,
    session,
  };
}