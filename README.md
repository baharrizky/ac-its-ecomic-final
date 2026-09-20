# AC-ITS V10 — Class-scoped Teacher Workspace

Replace these files:
- src/App.jsx
- src/services/authService.js
- src/services/accessControlService.js
- src/pages/teacher/TeacherDashboard.jsx
- src/pages/teacher/AnalyticsPage.jsx
- src/pages/teacher/ComicManagement.jsx
- src/pages/teacher/TeacherDataPages.jsx
- firestore.rules

Main changes:
- Teacher dashboard refreshes class/student data on mount and has a manual refresh button.
- Student lookup for a teacher can use the teacher's classId list, not only classTeacherUid.
- Teacher Grades has School / Kelas / Rombel filters sourced from teacher classes.
- Analytics has School / Kelas / Rombel filters sourced from teacher classes.
- E-Comic management has School / Kelas / Rombel filters and creation is attached to one selected class.
- Teacher attendance is filtered per School / Kelas / Rombel.
- Firestore users read rule allows a teacher to read a student when the student's classId belongs to a class owned by that teacher.
- Existing class format remains canonical (e.g. X 1), no X X 1 display.

IMPORTANT: deploy firestore.rules to Firebase, not only the React files to Vercel.
