PATCH V6 - Firestore class lookup

Replace:
src/services/accessControlService.js

Reason:
The classes_v3 Firestore rule only permits student reads when BOTH
active == true and enrollmentOpen == true. The previous query filtered
only enrollmentOpen == true, so Firestore could reject the query with
permission-denied even though the class itself was valid. The app then
converted that error into "Kelas tidak ditemukan di Firestore".

V6 adds both Firestore query constraints while keeping the existing
normalization for school, grade, and rombel (X 1 vs 1).
