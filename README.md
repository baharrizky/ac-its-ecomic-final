V10.2 — Teacher student query fix

Replace:
src/services/authService.js

Root cause fixed:
- Firestore rules for users require a readable student document to satisfy role == student plus classTeacherUid == current teacher (or the classId branch).
- V10.1 queried only classTeacherUid. Firestore can reject that query because Security Rules are not filters.
- The UI caught permission-denied and returned [] so the dashboard displayed "Siswa terdaftar: 0" and AI Teaching Assistant displayed no students.

V10.2 queries both:
where("role", "==", "student")
where("classTeacherUid", "==", teacherUid)

It also logs TEACHER_AUTH_UID_MISMATCH if the persisted local session UID differs from the Firebase Auth UID, which is another important diagnostic case.
