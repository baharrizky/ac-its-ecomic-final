# AI Setup — AC-ITS E-Comic (Gemini first)

Versi UAT ini menggunakan Gemini sebagai provider utama melalui endpoint serverless `/api/tutor`.

## 1. Environment Vercel

Di **Project Settings → Environment Variables**, tambahkan: 

```text
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.8-flash
GEMINI_TUTOR_THINKING=low
GEMINI_CORRECTION_THINKING=medium
AI_TIMEOUT_MS=15000
AI_MAX_RETRIES=2
```

`GEMINI_API_KEY` hanya berada di server-side environment variable. Jangan gunakan prefix `VITE_`.

Project Gemini yang digunakan untuk UAT ini: **ecomic-its**.

Gemini 3.8 Flash saat ini berstatus Stable/GA dengan model ID `gemini-3.8-flash`. Google mendokumentasikan thinking level `low`, `medium`, dan `high`; `minimal` tidak didukung pada model ini.

Referensi resmi:
https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash
https://ai.google.dev/gemini-api/docs/api/generate-content
https://ai.google.dev/gemini-api/docs/structured-output

## 2. API key

Gunakan API key Gemini yang dibuat pada project `ecomic-its` di Google AI Studio.

API key dikirim dari server menggunakan header `x-goog-api-key`. Jangan masukkan key ke source code atau frontend bundle.

## 3. Error handling

Server melakukan retry untuk 429, 500, 502, 503, dan 504 dengan exponential backoff serta timeout. Error 429 umumnya terkait rate limiting/quota; retry dilakukan dengan jeda.

Frontend juga memiliki satu retry tambahan. Jika semua percobaan gagal, AI hanya menampilkan fallback yang ramah; halaman E-Comic, navigasi, kuis, dan data non-AI tetap dapat digunakan.

## 4. Tutor context

Tutor menerima context yang ringkas:

- judul comic
- episode
- panel
- narasi
- dialog
- persamaan
- konsep
- mastery
- miskonsepsi
- jenjang, kelas, dan sekolah
- riwayat chat terakhir

Context tidak dikirim sebagai seluruh database agar latency dan penggunaan token tetap terkendali.

## 5. AI Correction

Correction menggunakan structured output JSON dengan field:

```text
correct
misconceptionTag
confidence
explanation
hint
nextStep
```

Schema dikirim ke Gemini sehingga backend dapat memvalidasi respons secara konsisten.

## 6. AI status check

Status operasional AI tidak ditampilkan di antarmuka siswa. Pemeriksaan konfigurasi dilakukan melalui environment server dan log deployment oleh pengelola. API key tetap hanya berada di server.

## 7. UAT minimum

1. Tutor: pertanyaan tentang panel.
2. Tutor: pertanyaan tentang persamaan.
3. Correction: jawaban benar.
4. Correction: jawaban salah.
5. Correction: kasus miskonsepsi.
6. Beberapa request berurutan.
7. Pastikan error AI tidak membuat halaman blank.
8. Cek latency dan `usageMetadata` pada respons.

## 8. Provider berikutnya

Arsitektur server tetap menggunakan `AI_PROVIDER`, sehingga provider kedua dapat ditambahkan tanpa mengubah interface Tutor/Correction di frontend.
