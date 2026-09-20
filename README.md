PATCH V9.1 — BUILD FIX + CLASS MANAGEMENT + ROMBEL DISPLAY

This is a corrected V9 patch. It fixes the V9 build error in ProfilePage.jsx caused by a duplicate classLabel import.

Replace these files:
- src/services/accessControlService.js
- src/services/authService.js
- src/pages/teacher/TeacherDataPages.jsx
- src/pages/student/ProfilePage.jsx
- src/utils/classLabel.js

V9 features retained:
1. Canonical class labels such as X 1; prevents X X 1 display.
2. Class Management: Aktifkan/Nonaktifkan, Buka/Tutup pendaftaran, Hapus.
3. Class status changes persist to Firestore.
4. Teacher student lookup uses a single equality query scoped by teacher.
5. Existing legacy rombel values are canonicalized when the teacher class list is loaded.

V9.1 build fix:
- ProfilePage.jsx contains exactly one classLabel import.

After deployment, hard-refresh the browser (Ctrl+Shift+R).
