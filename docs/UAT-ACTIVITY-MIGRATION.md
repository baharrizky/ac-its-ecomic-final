# UAT — Aktivitas Siswa & Migrasi Data ITS

## Aktivitas siswa
1. Login sebagai siswa.
2. Biarkan dashboard terbuka selama >10 detik.
3. Buka E-Comic dan baca satu panel selama >10 detik.
4. Pindah panel.
5. Buka Kuis dan jawab satu soal.
6. Buka Latihan beberapa menit.
7. Buka Tutor AI.
8. Logout.
9. Login sebagai guru → Aktivitas Siswa → pilih tanggal hari ini.
10. Pastikan muncul check-in, waktu akses, waktu baca comic, kuis/latihan, tutor, dan timeline.

## Migrasi dari ITS lama
### Opsi Firestore collection
- Masukkan nama collection sumber.
- Klik Preview.
- Pastikan field siswa dapat dipetakan lewat `uid` atau `email`.
- Klik Import ke E-Comic.
- Data asal tidak dihapus; snapshot audit ditulis ke `migrationSnapshots`.

### Opsi JSON
Gunakan struktur `docs/ITS-MIGRATION-SAMPLE.json`.
- Klik Baca JSON.
- Periksa preview.
- Klik Import JSON ITS.
- Sistem hanya menggabungkan data ke akun E-Comic yang dapat ditemukan melalui UID/email.

## Catatan keamanan
Import profil menggunakan merge dan tidak menghapus data asal. Untuk UAT jangan gunakan overwrite profile sampai mapping sumber sudah tervalidasi.
