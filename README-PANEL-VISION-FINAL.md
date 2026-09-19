# Panel Vision Final

Jalur AI Tutor pada Comic Reader sekarang dipisahkan dari Tutor umum.

Flow:

`panel yang sedang dibaca -> ambil bytes gambar -> kirim inline_data -> Gemini 2.5 Flash -> jawaban`

Endpoint khusus: `/api/panel-ai`

Tidak mengirim metadata konsep, history, atau prompt Tutor lama ke endpoint vision.

Environment tambahan opsional:

`GEMINI_VISION_MODEL=gemini-2.5-flash`

Jika tidak diisi, endpoint menggunakan `gemini-2.5-flash`.

UAT:
1. Buka Comic Reader.
2. Pastikan gambar panel tampil.
3. Di tab Tutor tekan `Minta AI menjelaskan panel ini`.
4. AI harus menjawab berdasarkan isi gambar yang terlihat.
5. Coba pertanyaan `Apa yang tertulis di balon percakapan pada gambar?`.

Jalur ini sengaja sederhana. Jika endpoint vision gagal, kode error dicatat di server log Vercel sebagai `PANEL_AI_ERROR`.
