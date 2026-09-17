# AC-ITS E-Comic — UAT Checklist

## Guru
- Login / daftar akun guru.
- Kelola E-Comic: buat, edit, upload cover, episode, panel, narasi, dialog, persamaan, tokoh, konsep, publish.
- Preview E-Comic dari laman guru.
- Bank Soal: buat/edit/hapus, jenjang, kelas, konsep, level, persamaan, status, tag miskonsepsi.
- Knowledge Base: tambah/edit/hapus item konteks AI.
- Nilai Siswa: filter jenjang, sekolah, kelas, rombel.
- Progress per Soal: statistik attempt dan tingkat keberhasilan.
- Analitik: distribusi mastery, tren attempt, miskonsepsi, konsep prioritas.
- Peringkat kelas: XP dan mastery.
- Jawaban & Waktu Ujian: hasil dan durasi.
- Refleksi Siswa: membaca refleksi.
- Kode Akses: buat/nonaktifkan kode kelas.
- Presensi: melihat catatan kehadiran.

## Siswa
- Daftar akun: nama, jenjang, sekolah, kelas, rombel.
- Login dengan akun sendiri; sapaan mengikuti nama pendaftar.
- Library hanya menampilkan E-Comic Published yang sesuai profil.
- Reader: gambar, narasi, dialog, persamaan, tokoh, Tutor, Kuis, Materi, Progres, episode, mode baca.
- Perpindahan panel menyimpan aktivitas baca dan XP.
- Kuis cepat memakai bank soal berdasarkan konsep panel.
- Latihan adaptif memilih soal berdasarkan mastery.
- AI Correction / penjelasan setelah menjawab.
- Ujian dengan timer, nilai, dan penyimpanan hasil.
- Progress konsep dan overall mastery.
- Peringkat siswa pada kelas.
- Badge dinamis.
- Refleksi tersimpan.
- Presensi tersimpan.
- Profil dan gabung kelas melalui kode akses.

## Firebase
- Authentication Email/Password aktif.
- Firestore aktif.
- Firestore rules sementara mendukung authenticated users untuk pengujian.
- Anonymous Authentication tidak wajib untuk akun email/password yang sudah login, tetapi masih digunakan sebagai fallback media/dev.
- Firebase Storage belum wajib untuk UAT ini karena media development memakai Firestore/IndexedDB fallback.

## Alur uji minimal
1. Guru buat E-Comic Published untuk SMA X.
2. Guru tambah minimal 1 episode + 2 panel; isi narasi, dialog, persamaan, tokoh, konsep.
3. Guru buat minimal 2 soal Published untuk konsep panel.
4. Buat akun siswa SMA X pada sekolah yang sama.
5. Siswa buka Library dan pastikan komik muncul tanpa refresh manual.
6. Buka Reader: komik, narasi, dialog, persamaan, tokoh, kuis cepat, Tutor, progres.
7. Kerjakan kuis cepat dan latihan adaptive.
8. Jalankan ujian dan kirim jawaban.
9. Kirim refleksi dan presensi.
10. Kembali ke guru: cek Nilai, Progress per Soal, Analitik, Peringkat, Ujian, Refleksi, Presensi.
