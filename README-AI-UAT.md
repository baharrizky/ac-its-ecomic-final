# AI UAT Quick Test — Gemini 3.8 Flash

## Setup

1. Tambahkan `GEMINI_API_KEY` pada Environment Variables Vercel.
2. Set `AI_PROVIDER=gemini`.
3. Set `GEMINI_MODEL=gemini-3.8-flash`.
4. Deploy.

## Test Tutor

1. Login sebagai siswa.
2. Buka E-Comic → Tutor AI.
3. Ajukan pertanyaan yang merujuk pada panel.
4. Ajukan pertanyaan yang merujuk pada persamaan.
5. Pastikan respons menyebut konteks panel secara relevan.

## Test AI Correction

1. Buka Latihan.
2. Jawab benar.
3. Jawab salah.
4. Periksa `explanation`, `hint`, `nextStep`, dan `misconceptionTag`.
5. Pastikan attempt dan student model tetap disimpan.

## Resilience test

- Lakukan beberapa request berurutan.
- Matikan/ubah sementara `GEMINI_API_KEY` untuk simulasi konfigurasi salah.
- Pastikan website tetap tampil.
- Simulasikan error 429/503 pada environment staging bila memungkinkan.
- Pastikan retry/backoff berjalan dan setelah retry gagal muncul fallback yang ramah.

## Expected result

AI boleh gagal sementara. Aplikasi E-Comic tidak boleh blank atau kehilangan navigasi karena AI failure.
