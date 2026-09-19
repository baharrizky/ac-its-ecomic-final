# AC-ITS E-Comic — V23 AI Tutor Patch

Patch ini fokus pada dua masalah yang dilaporkan pada deployment terakhir:

1. Tutor AI pada reader masih sering masuk ke fallback meskipun koneksi Gemini dasar aktif.
2. Tutor terpisah dari halaman baca.

## Perubahan AI

- Tutor sekarang memakai jalur `callAI()` sehingga dapat otomatis mencoba model fallback `gemini-2.5-flash` jika model utama gagal pada status provider yang dapat dipulihkan.
- Parameter sampling `temperature` dihapus dari request Tutor agar kompatibel dengan kontrak Gemini 3.x.
- Timeout AI dinaikkan hingga default 30 detik.
- Request gambar dari browser diperkecil hingga sekitar 1.9M karakter data URL sebelum dikirim ke API, sehingga lebih aman terhadap batas request serverless.
- Referensi gambar panel yang tidak dikenali tidak lagi dikirim diam-diam sebagai teks.
- Gambar panel tetap dikirim sebagai `inline_data` ke Gemini, sehingga Tutor benar-benar menerima visual panel.

## Perubahan UI

- Chat Tutor sekarang langsung berada di tab **Tutor** pada halaman Comic Reader.
- Siswa dapat mengetik pertanyaan tanpa pindah ke halaman Tutor terpisah.
- Tombol **Minta AI menjelaskan panel ini** otomatis mengirim pertanyaan berbasis panel.
- Riwayat Tutor yang sudah tersimpan tetap digunakan.
- Konteks yang dikirim ke AI tetap mencakup comic, episode, panel, narasi, dialog, persamaan, konsep, mastery, dan gambar panel.

## Deployment

1. Ganti source project dengan isi ZIP V23.
2. Pastikan environment Vercel tetap:

```text
AI_PROVIDER=gemini
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash
GEMINI_TUTOR_THINKING=low
GEMINI_CORRECTION_THINKING=medium
AI_TIMEOUT_MS=30000
AI_MAX_RETRIES=2
```

3. Deploy ke Vercel.
4. Login sebagai siswa.
5. Buka E-Comic → panel bergambar.
6. Pada tab **Tutor**, ketik:

> Apa yang kamu lihat pada gambar panel ini?

7. Tutor harus menjawab berdasarkan visual panel, bukan hanya metadata konsep.

Tidak perlu menampilkan endpoint `/api/ai-test` kepada siswa/guru.
