# AC-ITS E-Comic

Development build with cross-browser media sharing.

## Media storage tanpa Firebase Storage/Blaze
Untuk sementara upload cover/panel disimpan sebagai gambar terkompresi di Firestore (`ecomic_media`). Metadata E-Comic disimpan di `ecomic_comics`. Ini membuat upload dari browser Guru dapat dibaca browser Siswa tanpa Firebase Storage.

Firebase Storage/Blaze tetap menjadi target production karena lebih tepat untuk file gambar dalam jumlah besar.

### Satu pengaturan Firebase yang diperlukan
Aktifkan **Authentication → Sign-in method → Anonymous** pada Firebase Console. Firestore rules project harus mengizinkan user yang sudah terautentikasi membaca/menulis koleksi development E-Comic.

Koleksi:
- `ecomic_media`
- `ecomic_comics`

Gambar dikompresi otomatis agar dokumen Firestore tetap di bawah batas ukuran dokumen.
