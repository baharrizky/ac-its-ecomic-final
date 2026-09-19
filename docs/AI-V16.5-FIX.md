# AI v16.5 — Multimodal REST Fix

## Root cause fixed
The Tutor endpoint uses Gemini's REST `generateContent` API. REST multimodal parts require the JSON fields `inline_data`, `mime_type`, and `data`. The previous build used JavaScript SDK-style camelCase (`inlineData`, `mimeType`) inside a raw REST payload, which could make Tutor requests fail when a panel image was present.

## Changes
- Fixed Gemini REST multimodal payload to use `inline_data` / `mime_type`.
- Kept image input optional: if the panel image cannot be fetched, the Tutor still sends the text/context request instead of failing.
- Kept server-side API key and existing retry/fallback behavior.
- No user-facing AI diagnostics or connection test is exposed.
