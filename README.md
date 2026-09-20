PATCH V9 — CLASS MANAGEMENT + ROMBEL DISPLAY FIX

Replace these files:
- src/services/accessControlService.js
- src/services/authService.js
- src/pages/teacher/TeacherDataPages.jsx
- src/pages/student/ProfilePage.jsx
- src/utils/classLabel.js

Changes:
1. Prevents legacy duplicate class labels such as "X X 1"; canonical display/storage is "X 1".
2. Fixes Student Profile so it does not render grade twice.
3. Class Management now supports Aktifkan/Nonaktifkan, Buka/Tutup pendaftaran, and Hapus.
4. Class status changes persist to Firestore.
5. Teacher student lookup uses a single Firestore equality query when scoped by teacher, avoiding unnecessary composite-index failures that can make Dashboard Guru show 0 students.
6. Existing legacy rombel values are canonicalized when the teacher class list is loaded.

The existing X 1 class should be kept for testing.
After deployment, hard-refresh the browser (Ctrl+Shift+R).
