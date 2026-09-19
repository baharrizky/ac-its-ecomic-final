# AI UAT v15.1

- Target Gemini dikunci default ke `gemini-3.8-flash`.
- Environment variable server-side dipisahkan dari frontend.
- Thinking level divalidasi ke `low|medium|high`.
- AI Correction sekarang memakai JSON Schema eksplisit.
- Respons Gemini kosong/terblokir ditangani sebagai error terkontrol.
- Retry untuk 429/5xx dan timeout dipertahankan.
- Status operasional AI dipindahkan ke sisi server dan tidak ditampilkan kepada pengguna akhir.
- Package version: 0.4.1.
