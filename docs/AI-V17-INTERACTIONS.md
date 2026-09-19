# AI v17 — Gemini Interactions API

## Why
Tutor multimodal no longer uses the legacy `generateContent` route. The Tutor now calls Gemini Interactions API (`/v1/interactions`) directly, with the panel image as a native `type: image` input and the tutor prompt as `type: text`.

## Flow
`cloud-media://` / image URL → browser resolves media → `imageData` base64 → `/api/tutor` → Gemini Interactions API → Tutor reply.

## Important
- `generateContent` remains available for correction/recommendation paths.
- Tutor uses Interactions API only, so multimodal failures are isolated from other AI features.
- `store:false` is used for tutor calls.
- The server returns internal `meta.imageAttached` for diagnostics but the student UI does not need to show it.
- If an expected image cannot be attached, the request fails explicitly as `AI_IMAGE_NOT_ATTACHED` instead of silently pretending the image was read.

## UAT
On a panel containing visible text, ask:
`Apa yang kamu lihat pada gambar panel ini?`

For the current Kata Pengantar panel, the expected answer should recognize the visible title `KATA PENGANTAR` and introductory content.
