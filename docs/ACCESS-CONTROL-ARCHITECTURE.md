# AC-ITS Access Control Architecture

## Roles
- Admin: controls teacher registration codes and platform-level class visibility.
- Teacher: owns only their classes, content, questions, and student learning data.
- Student: sees only their own learning data and published content assigned to their class.

## Teacher registration
1. Admin creates a one-time/limited-use code in Admin Control Center.
2. Teacher registration requires that code.
3. The code is consumed after Firebase account creation and teacher profile creation.

## Student enrollment
Students do not enter a teacher code. They choose school, level, grade, and rombel during registration.
The system searches `classes_v3` for an active/open class with the same school + level + grade + rombel and writes:
- `classId`
- `classTeacherUid`
- `classTeacherName`
- `classJoinedAt`

If no class exists yet, the student account remains unassigned and can be connected when the class is available through a future enrollment workflow.

## Data ownership
Teacher-owned content stores `ownerTeacherUid` and `assignedClassIds`.
Student learning records store `teacherUid` and `classId`.
Firestore Security Rules enforce these boundaries; UI filtering is only an additional convenience.

## One-time admin bootstrap
Create the first Admin account manually in Firebase Authentication, then create `users/{UID}` in Firestore with:
```json
{
  "name": "Administrator",
  "email": "admin@example.com",
  "role": "admin",
  "subtitle": "Administrator",
  "createdAt": "2026-09-19T00:00:00.000Z"
}
```
Do not put a password in Firestore. The password remains managed by Firebase Authentication.
