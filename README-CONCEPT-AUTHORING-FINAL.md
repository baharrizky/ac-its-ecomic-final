# Concept Authoring Final

Perubahan utama:
- Daftar konsep bawaan E1/E2/E3/E10/L1/L2 dihapus dari runtime UI. Knowledge Base dimulai kosong.
- Guru dapat membuat konsep sendiri dengan kode, nama, deskripsi/definisi, dan kode prasyarat.
- Konsep disimpan sebagai item `type: concept` di Firestore collection `knowledgeBase`; ID dokumen sama dengan kode konsep.
- ConceptPicker pada pembuatan E-Comic, Comic Editor/panel, dan Bank Soal membaca daftar konsep dari Knowledge Base sehingga otomatis mengikuti konsep yang dibuat guru.
- Penghapusan konsep menghapus konsep dari katalog; mapping lama pada konten yang sudah tersimpan tidak otomatis dihapus, sehingga guru dapat memperbaikinya dari editor.
- AI Tutor diberi aturan untuk mengarahkan siswa membaca bagian/panel materi yang memang tersedia di konteks, tanpa mengarang bagian yang tidak ada.

## UAT
1. Buka Knowledge Base: harus tampil `Belum ada konsep.` bila belum ada konsep tersimpan.
2. Tambah konsep, misalnya `E1` / `Definisi Eksponen`, simpan.
3. Buka Buat E-Comic: konsep E1 harus muncul otomatis.
4. Buka Comic Editor: picker konsep panel harus menampilkan E1.
5. Buka Bank Soal: konsep E1 harus tersedia.
6. Hapus E1 dari Knowledge Base: picker baru tidak lagi menampilkan E1.
