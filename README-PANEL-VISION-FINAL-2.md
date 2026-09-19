# Panel Vision Final 2

This version changes the image path for the Reader AI.

## New flow

Student Reader → current panel `cloud-media://...` → Firebase ID token + media reference → `/api/panel-ai` → Firestore REST retrieves the exact panel image → Gemini 2.5 Flash receives `inline_data` → answer.

The browser no longer sends the large base64 panel image to the Vercel function when the panel is stored as `cloud-media://`.

## Required Vercel environment

- `GEMINI_API_KEY`
- `GEMINI_VISION_MODEL=gemini-2.5-flash` (optional; this is the default)
- `VITE_FIREBASE_PROJECT_ID`
- existing Firebase VITE variables

Firebase Anonymous Authentication must remain enabled because the Reader obtains an ID token even when the app's own session is local/demo-based.

## Why this is different

The previous implementation transported the entire image as a JSON base64 payload from the browser to Vercel. This version sends only the media reference and Firebase ID token, then retrieves the exact stored image server-side before calling Gemini. This removes the most fragile part of the previous image pipeline.
