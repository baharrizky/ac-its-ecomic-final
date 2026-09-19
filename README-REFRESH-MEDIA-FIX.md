# Refresh Media Fix

Fixes the hard-refresh race where Firebase Auth has not restored yet when MediaImage tries to read cloud-media from Firestore. The reader previously resolved to the permanent fallback once and never retried.

Changes:
- firebaseService waits for Firebase Auth initialization via onAuthStateChanged before deciding whether anonymous auth is needed.
- MediaImage retries cloud/local media resolution up to 4 times with short backoff.
- No changes to Gemini/AI behavior.

UAT:
1. Deploy.
2. Open the E-Comic from the collection and verify image.
3. Hard refresh (Ctrl+F5) while directly on the reader URL.
4. Image should load without needing to return to collection first.
5. Repeat twice in a new/incognito tab if desired.
