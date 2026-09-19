# AI v18 — Image Payload Fix

## Root cause fixed
The browser media bridge correctly converted `cloud-media://...` into a `data:image/...;base64,...` URL, but v17 sent only the Base64 payload (`match[2]`) as `imageData`. The server parser expected a complete data URL, so it rejected the image and returned `AI_IMAGE_NOT_ATTACHED`, which the API surfaced as HTTP 502.

## Fix
- Tutor frontend now sends the complete `data:image/...;base64,...` string.
- Server additionally accepts raw Base64 when `imageMime` is supplied, making the bridge robust to either representation.
- Gemini Interactions API remains unchanged.

## Expected UAT
Ask on the visible Episode 1 panel: `Apa yang kamu lihat pada gambar panel ini?`
The model should recognize the visual content and dialogue in the panel.
