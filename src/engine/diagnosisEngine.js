export function diagnoseAnswer(question, answerIndex) {
  const correct = Number(answerIndex) === Number(question.answer);
  return {
    correct,
    conceptId: question.conceptId,
    misconceptionTag: correct ? null : (question.misconceptionTags?.[0] || "UNCLASSIFIED"),
    confidence: correct ? 0.82 : 0.78,
    explanation: question.explanation
  };
}
