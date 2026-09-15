
# AC-ITS E-Comic — Final Starter

Platform E-Comic pembelajaran yang berdiri **terpisah** dari project `ac-its-app`.

## Prinsip utama

Konten tidak dikunci oleh sistem. Guru dapat membuat, mengubah, menyusun, dan menerbitkan E-Comic sesuai kebutuhan pembelajaran.

Komik final belum dimasukkan karena ruang konten sengaja disiapkan terlebih dahulu. Setelah komik Aulia dan materi guru tersedia, konten dapat dimasukkan melalui Teacher Content Studio.

## Fitur yang tersedia

### Siswa
- Dashboard pembelajaran
- Materi E-Comic / Library
- Comic Reader
- AI Tutor
- Latihan adaptif
- Ujian
- Progress dan mastery
- Peringkat
- Badge
- Refleksi
- Profil

### Guru
- Dashboard
- E-Comic Management
- Membuat E-Comic
- Draft / Published
- Episode
- Panel
- Narasi dan dialog
- Concept Mapping
- Preview / Reader
- Analitik
- Struktur AI Context

### Learning engine
- Student Model
- Mastery
- Confidence
- Misconception
- Diagnosis
- Adaptive recommendation

## Jalankan di Windows

```powershell
cd C:\Users\ahmad\ac-its-ecomic
npm install
npm run dev
```

atau double-click:

```text
RUN-WINDOWS.bat
```

Lalu buka URL Vite, biasanya:

```text
http://localhost:5173
```

## Catatan

Project dapat berjalan dalam mode demo/localStorage tanpa Firebase dan tanpa API AI.

Untuk deployment produksi, backend dapat diaktifkan kemudian:
1. Firebase Auth
2. Firestore
3. Firebase Storage
4. AI Tutor API
5. logging learning events
6. bank soal dan assessment production

Dokumen arsitektur dan template konten tersedia di folder `docs/`.

## Development media upload (before Firebase Storage billing)

The Teacher Comic Editor now supports cover and panel image uploads using browser IndexedDB. This is intentionally an adapter layer for development while Firebase Storage billing is being prepared.

- Image limit: 8 MB per file
- Supported input: browser image types (PNG/JPG/WebP/etc.)
- Metadata stores a `local-media://...` reference in the comic state
- Student reader resolves the local media reference and displays the panel image
- Later, `mediaService.js` can be swapped to Firebase Storage without changing the comic editor data model

The student demo account is scoped to **SMA · Kelas X**, and the Comic Library filters Published content to that scope. Teacher-created comics now include an explicit SMP/SMA level and grade.
