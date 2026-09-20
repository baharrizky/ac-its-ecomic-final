# AC-ITS E-Comic V11 — Integrated Teacher Data Core

This patch fixes the underlying Teacher integration instead of patching individual pages.

## Critical change
Firebase Authentication is now the source of truth. The app no longer silently signs a stale local Teacher session into an anonymous Firebase account.

Teacher data is loaded through one central bundle:
- classes_v3
- users (student + classTeacherUid)
- studentModels_v2
- attempts_v2
- learningEvents_v2
- reflections_v2
- attendance_v2
- examResults_v2

All Teacher pages consume the same class roster and student model data.

## Important
After deployment, log out of the current Teacher account and log in again once. This refreshes Firebase Auth so the browser session UID matches the Teacher document UID.
