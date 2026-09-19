# AC-ITS E-Comic — Clean Integrated Final

This build starts from a clean application data namespace. It keeps Firebase Authentication users but moves learning/content data to new v2 collections so old test/demo data is not loaded by the app.

## Clean start
- Local app state: `ac-its-ecomic-state-v5-clean`
- Tutor history: `acits-tutor-history-v2:*`
- Firestore content/data namespaces use `_v2` collections.
- Demo comics, demo questions, and hard-coded demo concepts are not seeded.
- Existing old `_v1`/legacy Firestore data is left untouched and is not read by this build.

## Integrated flows
1. Teacher registers/logs in with Firebase Authentication.
2. Teacher creates concepts in Knowledge Base with custom code, name, definition, and prerequisites.
3. Concept pickers in E-Comic and Question Bank read the live Knowledge Base.
4. Teacher creates a class access code for education level, grade, and rombel.
5. Student enters the code from Profile; the user profile stores `classTeacherUid` and `classAccessCodeId`.
6. Teacher views connected students, grades, analytics, attendance, activity, reflections, and exam results.
7. Student attendance is stored in the v2 attendance collection and appears in the connected teacher's attendance view.
8. Adaptive practice uses mastery and published questions; AI recommendation endpoints remain active.
9. AI Tutor runs in the Reader and standalone Tutor page; image is supporting context, not a gate for ordinary concept questions.
10. Forgot password uses Firebase `sendPasswordResetEmail`.

## Firebase requirements
- Authentication: Email/Password enabled.
- Authentication: Anonymous enabled for media fallback flows used by the app.
- Firestore: authenticated read/write rules currently used by this project.
- Vercel Firebase environment variables must point to the `ecomic-its` Firebase project.

## Important
The build does not delete legacy Firestore collections. They remain untouched for safety. The application simply starts from new `_v2` namespaces.
