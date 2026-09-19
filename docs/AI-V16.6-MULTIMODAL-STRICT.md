# AI v16.6 — Strict Multimodal Tutor

- Panel image is sent to Gemini as REST `inline_data` before the tutor prompt.
- Tutor prompt explicitly treats the image as the primary visual source.
- Server records whether the image was actually attached (`imageAttached`, bytes, MIME type) in non-secret response metadata for diagnostics.
- If the image cannot be fetched, the tutor can still answer from text context; the failure is logged server-side.
- Gemini API key remains server-side.
