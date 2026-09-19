# AC-ITS E-Comic V22 — Stable Media + Gemini Vision

## What changed

- Media upload kembali ke jalur Firestore `ecomic_media` + IndexedDB fallback yang sudah digunakan sebelum perubahan Firebase Storage.
- Tidak ada lagi fallback diam-diam Storage → Firestore → IndexedDB dalam satu upload.
- `MediaImage` tidak melakukan retry berulang; media diselesaikan sekali dan memakai cache.
- Tutor tetap menggunakan Gemini `generateContent` dengan `inline_data` untuk gambar panel.
- Untuk Gemini 3.x, parameter sampling seperti `temperature` tidak dikirim; `thinkingConfig.thinkingLevel` tetap digunakan.
- API key dikirim melalui header `x-goog-api-key`.
- Jika panel memiliki gambar tetapi gambar gagal dipersiapkan, Tutor tidak pura-pura menjawab seolah-olah sudah melihat gambar.
- Error teknis tetap berada di response/log backend; UI siswa tetap ramah.

## Environment

Keep the existing Vercel Gemini variables. No new API key is required.

Recommended:
- `AI_PROVIDER=gemini`
- `GEMINI_MODEL=gemini-3.8-flash`
- `GEMINI_FALLBACK_MODEL=gemini-2.5-flash`
- `GEMINI_TUTOR_THINKING=low`

## UAT

1. Teacher uploads one panel image.
2. Save the E-Comic.
3. Open it as a student and verify the panel image appears.
4. Ask Tutor: `Apa yang kamu lihat pada gambar panel ini?`
5. For the Kata Pengantar panel, the response should recognize the visible heading/content rather than inventing an exponent lesson.
