# AC-ITS E-Comic v16.8 — Tutor Image Bridge

## Why this version exists

The previous Tutor flow could turn a panel-media resolution problem into the same generic
"AI sedang mengalami gangguan" message. That made it impossible to distinguish:
- Firebase/Firestore media resolution failure;
- request payload failure;
- Gemini failure.

The v16.8 bridge separates the actual panel image from the app-specific `cloud-media://`
reference.

## Flow

```text
panel.imageUrl
  -> cloud-media://media-...
  -> browser getLocalMedia()
  -> data:image/...;base64,...
  -> body.imageData + body.imageMime
  -> /api/tutor
  -> Gemini inline_data
```

For ordinary HTTP image URLs, the backend still supports server-side image fetching.

## Important behavior

- A media-resolution failure no longer prevents the Tutor from answering text context.
- The media failure is logged in the browser console as:
  `Tutor panel image bridge failed; retrying text-only`
- Server logs distinguish:
  `AI_IMAGE_NOT_ATTACHED`
  and
  `AI_IMAGE_FETCH_ERROR`.
- Successful AI responses include internal `meta.imageAttached` so the integration can be
  verified without exposing technical diagnostics to students.
- Gemini authentication uses the same query-key style as the known working AC-ITS endpoint.

## UAT

1. Open the Kata Pengantar panel.
2. Ask: `Apa yang kamu lihat pada gambar panel ini?`
3. The expected behavior is that the Tutor responds normally and, when the image bridge is
   successful, identifies visible information such as `KATA PENGANTAR`.
4. Check the network response internally: `meta.imageAttached` should be `true`.
