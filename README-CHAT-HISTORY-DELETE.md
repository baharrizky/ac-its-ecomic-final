# AI Tutor — Hapus Riwayat Chat

Ditambahkan tombol **Hapus riwayat** pada Tutor AI, baik di halaman Tutor maupun chat inline pada Comic Reader.

Perilaku:
- Menghapus riwayat chat yang tersimpan di localStorage untuk akun siswa.
- Menyisakan pesan pembuka Tutor.
- Menyimpan penanda waktu penghapusan agar riwayat Tutor lama yang direkonstruksi dari learning events tidak muncul kembali setelah refresh.
- Learning events/analytics tetap disimpan untuk kebutuhan analitik guru; fitur ini menghapus riwayat percakapan yang ditampilkan siswa, bukan menghapus catatan analitik backend.
