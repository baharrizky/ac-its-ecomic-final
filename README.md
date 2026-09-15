# AC-ITS E-Comic — Cloud Integrated v6

## Perubahan utama
- E-Comic guru tersimpan di Firestore `ecomic_comics`.
- Siswa menerima update materi secara realtime melalui Firestore `onSnapshot`.
- Materi Published difilter berdasarkan jenjang, kelas, dan sekolah siswa.
- Data demo comic/soal lokal dibersihkan dari baseline baru.
- Bank Soal guru tersedia di menu `Bank Soal`.
- Soal dapat diberi persamaan matematika menggunakan LaTeX + KaTeX.
- Panel E-Comic juga dapat diberi persamaan dan akan dirender saat dibaca siswa.
- Soal disimpan di Firestore `ecomic_questions` dan disinkronkan realtime.
- Media gambar tetap menggunakan adapter media yang ada; saat Firebase Storage tersedia, adapter dapat dipindahkan ke Storage tanpa mengubah model comic.

## Firebase yang diperlukan
1. Firebase Authentication: Email/Password aktif untuk akun nyata.
2. Firestore aktif.
3. Firestore rules sementara harus mengizinkan pengguna terautentikasi membaca/menulis collection yang dipakai.
4. Firebase Storage tidak diperlukan untuk fitur cloud-content/equation pada versi ini.

## Tes integrasi
1. Buat/login akun guru yang mempunyai `school`.
2. Guru buat E-Comic, isi episode/panel, lalu `Published` dan simpan.
3. Login akun siswa yang mempunyai `educationLevel`, `grade`, dan `school` yang sama.
4. Buka `Materi E-Comic`. Materi yang baru dipublish seharusnya muncul tanpa perlu memasukkan data manual ke siswa.
5. Di `Bank Soal`, buat soal dan masukkan persamaan seperti `2^3 = 8` atau `\\frac{x+1}{2}`.
6. Buka `Latihan` sebagai siswa pada jenjang/kelas yang sesuai.
