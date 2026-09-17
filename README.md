# AC-ITS E-Comic — UAT v12

Versi ini disiapkan untuk **uji coba seluruh lini utama** platform E-Comic adaptive learning.

## Fitur yang sudah dibuat fungsional

### Siswa
- Registrasi: nama, email, jenjang, sekolah, kelas, rombel.
- Login dan sapaan menggunakan nama akun pendaftar.
- Library E-Comic berdasarkan status Published + jenjang + kelas + sekolah.
- Comic Reader: panel, gambar, narasi, dialog, persamaan KaTeX, tokoh, materi, Tutor, kuis cepat, progress, episode, mode baca.
- Aktivitas membaca disimpan ke student model dan memberi XP.
- Latihan adaptif berbasis mastery.
- Diagnosis jawaban + AI explanation.
- Ujian bertimer + hasil + pencatatan attempt.
- Progress mastery konsep.
- Ranking kelas.
- Badge dinamis.
- Refleksi tersimpan.
- Presensi tersimpan.
- Profil + bergabung/pindah kelas dengan Kode Akses.

### Guru
- Dashboard konten dan jumlah siswa nyata.
- Kelola E-Comic: metadata, cover, episode, panel, gambar, narasi, dialog, persamaan, tokoh, concept mapping, Publish.
- Preview E-Comic dari workspace guru.
- Bank Soal: CRUD, jenjang/kelas, persamaan, konsep, level, status, tag miskonsepsi.
- Knowledge Base CRUD untuk konteks AI.
- Nilai Siswa dengan filter jenjang/sekolah/kelas/rombel.
- Progress per Soal dari attempt siswa.
- Analitik mastery, distribusi kemampuan, tren attempt, miskonsepsi aktif, konsep prioritas.
- Peringkat kelas.
- Jawaban & waktu ujian.
- Refleksi siswa.
- Kode Akses kelas.
- Presensi siswa.

## Data & sinkronisasi

- Firestore dipakai sebagai sumber data utama saat Firebase aktif.
- Local storage dipakai sebagai fallback development.
- Student model disimpan pada `studentModels/{uid}`.
- Attempt pada `attempts`.
- Learning event pada `learningEvents`.
- Refleksi pada `reflections`.
- Presensi pada `attendance`.
- Hasil ujian pada `examResults`.
- Kode kelas pada `classAccessCodes`.
- Knowledge base pada `knowledgeBase`.
- Media development disimpan melalui `ecomic_media` dengan fallback IndexedDB; struktur media dapat dipindahkan ke Firebase Storage tanpa mengubah struktur E-Comic.

## Paket Uji Coba

Dashboard Guru memiliki tombol **Buat Paket Uji Coba**. Tombol tersebut membuat contoh E-Comic Published + episode/panel + persamaan + tokoh + bank soal sehingga seluruh alur dapat diuji tanpa menunggu konten final.

## Firebase

Pastikan:
- Authentication → Email/Password aktif.
- Firestore aktif.
- Environment variables Firebase sudah benar pada `.env` / Vercel.
- Firestore Rules yang sekarang masih ditujukan untuk **UAT authenticated users**, bukan production hardening.

Firebase Storage/Blaze belum menjadi syarat untuk UAT media versi ini.

## Menjalankan lokal

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Checklist

Lihat `docs/UAT-CHECKLIST.md` untuk skenario pengujian end-to-end.
