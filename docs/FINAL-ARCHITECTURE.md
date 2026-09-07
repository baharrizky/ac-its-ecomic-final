
# AC-ITS E-Comic — Final Architecture

Project ini berdiri sendiri dari `ac-its-app`. Jangan menggabungkan source code kedua aplikasi.

## 1. Role

### Siswa
Dashboard → Materi E-Comic → Reader → AI Tutor / Quick Check → Student Model → Latihan Adaptif → Progress / Ujian / Refleksi / Gamifikasi.

### Guru
Dashboard → E-Comic Management → Comic Editor → Episode → Panel → Concept Mapping → Preview → Publish → Analytics.

## 2. Content pipeline

Guru mengontrol seluruh konten. Sistem tidak mengunci materi pada source code.

```text
Guru
  ↓
E-Comic metadata
  ↓
Episode
  ↓
Panel
  ├─ gambar (slot siap)
  ├─ narasi
  ├─ dialog
  ├─ konsep
  ├─ learning objective
  └─ AI context
  ↓
Preview
  ↓
Draft / Published
  ↓
Siswa
```

## 3. Adaptive learning

```text
Reading activity
      ↓
Quick Check / Latihan
      ↓
Diagnosis Engine
      ↓
Student Model
 ┌────┼─────────────┐
 ↓    ↓             ↓
Mastery Confidence Misconception
 └────┼─────────────┘
      ↓
Adaptive Engine
      ↓
Rekomendasi aktivitas berikutnya
```

## 4. Data layer

Prototype saat ini memakai localStorage sehingga dapat dijalankan tanpa backend.

Struktur sudah dipisahkan agar dapat dipindahkan ke Firebase:

- `users`
- `comics`
- `comics/{comicId}/episodes`
- `comics/{comicId}/episodes/{episodeId}/panels`
- `concepts`
- `questions`
- `studentModels`
- `learningEvents`
- `attempts`
- `reflections`

File gambar nantinya dapat ditempatkan di Firebase Storage:

```text
comics/{comicId}/cover.webp
comics/{comicId}/{episodeId}/{panelId}.webp
```

## 5. AI Tutor

AI menerima konteks, bukan hanya pertanyaan:

```json
{
  "message": "...",
  "comic": {},
  "episode": {},
  "panel": {},
  "concepts": [],
  "studentModel": {},
  "history": []
}
```

Tanpa endpoint AI, aplikasi menggunakan fallback demo sehingga UI tetap dapat diuji.

## 6. Status pengembangan

Sudah disiapkan:
- UI siswa bergaya AC-ITS
- UI guru / Content Studio
- navigasi role
- comic library
- comic reader
- editor comic
- episode dan panel
- concept mapping
- AI Tutor shell
- diagnosis engine
- mastery engine
- adaptive engine
- latihan
- ujian
- progress
- ranking
- badge
- refleksi
- Firebase configuration foundation
- Firestore rules/indexes foundation
- serverless tutor endpoint example

Menunggu konten:
- komik final Aulia
- materi/episode final dari guru
- bank soal final
- rubric/parameter penelitian final

Konten tersebut dapat ditambahkan kemudian tanpa mengubah arsitektur utama.
