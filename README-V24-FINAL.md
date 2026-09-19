# AC-ITS E-Comic V24 — FINAL AI Tutor

V24 freezes the Tutor architecture so development can move on.

## Tutor path
- Inline chat inside Comic Reader.
- Browser resolves `cloud-media://` / `local-media://` to the actual panel image.
- Image is sent as Gemini `inline_data`.
- Tutor uses a compact multimodal prompt and only the last 4 chat turns.
- Dedicated stable model: `GEMINI_TUTOR_MODEL`, defaulting to `GEMINI_FALLBACK_MODEL` (`gemini-2.5-flash`).
- One deterministic fallback to `GEMINI_MODEL`.
- No Gemini 3 thinking requirement on the primary Tutor path.
- Technical diagnostics remain in server logs/browser console, while students see a friendly message.

## Environment
Existing AI variables remain valid. Optional:
`GEMINI_TUTOR_MODEL=gemini-2.5-flash`

## Acceptance test
1. Open an E-Comic panel with a real image.
2. Open the Tutor tab in the reader.
3. Ask: `Apa yang kamu lihat pada gambar panel ini? Jelaskan isi utamanya.`
4. The answer must describe the visible panel, not merely repeat concept metadata.
5. Ask a second question in the same chat; history should be retained.

Do not add another AI architecture unless this acceptance test fails with a concrete provider error in Vercel logs.
