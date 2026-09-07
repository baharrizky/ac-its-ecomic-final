export const concepts = {
  E1: { id: "E1", name: "Definisi Eksponen", prerequisiteIds: [] },
  E2: { id: "E2", name: "Perkalian Eksponen", prerequisiteIds: ["E1"] },
  E3: { id: "E3", name: "Pembagian Eksponen", prerequisiteIds: ["E1"] },
  E10: { id: "E10", name: "Pertumbuhan & Peluruhan Eksponensial", prerequisiteIds: ["E2"] },
  L1: { id: "L1", name: "Konsep Dasar Logaritma", prerequisiteIds: [] },
  L2: { id: "L2", name: "Persamaan Logaritma", prerequisiteIds: ["L1"] },
};

export const initialComics = [
  {
    id: "comic-exponent",
    title: "Eksponen dalam Kehidupan Sehari-hari",
    description: "Mengenal konsep eksponen melalui cerita kontekstual dan permasalahan sederhana.",
    subject: "Eksponen",
    grade: "X",
    className: "X IPA 1",
    status: "Published",
    version: "1.0",
    coverUrl: "",
    createdBy: "demo-teacher",
    updatedAt: "2026-09-07",
    concepts: ["E1", "E2", "E10"],
    episodes: [
      {
        id: "ep-1",
        title: "Awal Sebuah Perjalanan",
        description: "Menemukan makna eksponen melalui pertumbuhan bakteri.",
        order: 1,
        concepts: ["E1"],
        panels: [
          { id: "p1", order: 1, title: "Menemukan Pola", narration: "Dalam praktikum, jumlah bakteri menjadi dua kali lipat setiap jam.", dialogue: "Kalau awalnya 2 bakteri, setelah 3 jam jadi berapa?", conceptIds: ["E1"] },
          { id: "p2", order: 2, title: "Bentuk Pangkat", narration: "Jumlah tersebut dapat ditulis sebagai perkalian berulang.", dialogue: "2 × 2 × 2 = 8, jadi kita tuliskan 2³ = 8.", conceptIds: ["E1"] },
          { id: "p3", order: 3, title: "Coba Pahami", narration: "Angka 3 menunjukkan berapa kali basis 2 dikalikan dengan dirinya sendiri.", dialogue: "Jadi 2³ bukan 2 × 3, ya!", conceptIds: ["E1"] }
        ]
      },
      {
        id: "ep-2",
        title: "Pola Perkalian",
        description: "Mengembangkan aturan perkalian eksponen.",
        order: 2,
        concepts: ["E2"],
        panels: [
          { id: "p4", order: 1, title: "Melanjutkan Pola", narration: "Sekarang kita membandingkan 2² × 2³.", dialogue: "Kalau basisnya sama, bagaimana pangkatnya?", conceptIds: ["E2"] },
          { id: "p5", order: 2, title: "Menemukan Aturan", narration: "Perkalian dapat digabung menjadi satu bentuk pangkat.", dialogue: "2² × 2³ = 2⁵.", conceptIds: ["E2"] }
        ]
      }
    ]
  },
  {
    id: "comic-log",
    title: "Logaritma di Sekitar Kita",
    description: "Draft awal komik kontekstual untuk konsep logaritma.",
    subject: "Logaritma",
    grade: "X",
    className: "X IPA 1",
    status: "Draft",
    version: "0.1",
    coverUrl: "",
    createdBy: "demo-teacher",
    updatedAt: "2026-09-05",
    concepts: ["L1", "L2"],
    episodes: []
  }
];

export const initialQuestions = [
  { id: "q1", conceptId: "E1", difficulty: 1, level: 1, question: "Bentuk perkalian berulang dari 2³ adalah ...", options: ["2 + 2 + 2", "2 × 2 × 2", "2 × 3", "3 × 3"], answer: 1, explanation: "Pangkat 3 berarti basis 2 dikalikan dengan dirinya sendiri sebanyak tiga kali.", misconceptionTags: ["EXPONENT_AS_MULTIPLICATION"] },
  { id: "q2", conceptId: "E1", difficulty: 2, level: 2, question: "Sebuah populasi menjadi dua kali lipat setiap jam. Jika awalnya 2, setelah 4 jam jumlahnya ...", options: ["8", "16", "32", "64"], answer: 2, explanation: "Modelnya 2 × 2⁴ = 32.", misconceptionTags: ["OFF_BY_ONE"] },
  { id: "q3", conceptId: "E2", difficulty: 2, level: 2, question: "Hasil dari 2² × 2³ adalah ...", options: ["2⁵", "2⁶", "4⁵", "4⁶"], answer: 0, explanation: "Untuk basis sama, pangkat dijumlahkan: 2² × 2³ = 2⁵.", misconceptionTags: ["EXPONENT_MULTIPLY_POWERS"] },
  { id: "q4", conceptId: "E3", difficulty: 3, level: 3, question: "Hasil dari 3⁵ / 3² adalah ...", options: ["3²", "3³", "3⁷", "9³"], answer: 1, explanation: "Untuk pembagian dengan basis sama, pangkat dikurangkan: 5 − 2 = 3.", misconceptionTags: ["EXPONENT_DIVISION"] }
];

export const initialStudentModel = {
  overallMastery: 0.68,
  concepts: {
    E1: { mastery: 0.87, confidence: 0.9, attempts: 8, correct: 7 },
    E2: { mastery: 0.74, confidence: 0.8, attempts: 5, correct: 4 },
    E3: { mastery: 0.43, confidence: 0.65, attempts: 5, correct: 2 },
    E10: { mastery: 0.61, confidence: 0.7, attempts: 3, correct: 2 },
    L1: { mastery: 0.3, confidence: 0.5, attempts: 2, correct: 1 },
    L2: { mastery: 0.1, confidence: 0.2, attempts: 0, correct: 0 }
  },
  misconceptions: [
    { conceptId: "E3", tag: "EXPONENT_DIVISION", confidence: 0.82, resolved: false }
  ],
  currentLevel: 2,
  streak: 3,
  xp: 420
};
