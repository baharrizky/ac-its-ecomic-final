export function diagnoseAnswer(question, answerIndex) {
  const correct = Number(answerIndex) === Number(question.answer);
  return {
    correct,
    conceptId: question.conceptId,
    // Miskonsepsi berasal dari pola jawaban + AI evaluator, bukan input guru.
    misconceptionTag: correct ? null : "UNCLASSIFIED",
    confidence: correct ? 0.82 : 0.55,
    explanation: question.explanation || (correct ? "Jawabanmu sesuai dengan konsep yang diuji." : "Jawaban belum tepat. Sistem akan menganalisis pola kesalahanmu.")
  };
}
