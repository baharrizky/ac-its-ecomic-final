# V10.1 — Teacher Student Query Fix

Replace only:
`src/services/authService.js`

Root cause: the previous teacher query used `where("classId", "in", classIds)`. The Firestore `/users` rule authorizes teacher reads using `classTeacherUid == request.auth.uid` (or a per-document class lookup), so the classId-only query can be rejected by Firestore. The student document provided by the user already has the correct `classTeacherUid`, so the authoritative query is `where("classTeacherUid", "==", teacherUid)`.

This patch also avoids silently falling back to localStorage when Firebase is enabled and the query fails; it logs the real Firebase error and returns an empty result instead of masking a permission problem as a real zero-student state.
