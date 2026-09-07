export function updateMastery(studentModel, conceptId, diagnosis) {
  const old = studentModel.concepts[conceptId] || { mastery: 0.2, confidence: 0.3, attempts: 0, correct: 0 };
  const attempts = old.attempts + 1;
  const correct = old.correct + (diagnosis.correct ? 1 : 0);
  const observed = correct / attempts;

  // Prototype estimator: blends previous mastery with observed performance.
  const mastery = Math.max(0, Math.min(1, old.mastery * 0.7 + observed * 0.3));
  const confidence = Math.max(0, Math.min(1, old.confidence * 0.8 + 0.2));

  const concepts = {
    ...studentModel.concepts,
    [conceptId]: { ...old, mastery, confidence, attempts, correct }
  };

  const values = Object.values(concepts).map((x) => x.mastery);
  const overallMastery = values.length ? values.reduce((a,b) => a+b, 0) / values.length : 0;

  const misconceptions = [...(studentModel.misconceptions || [])];
  if (!diagnosis.correct && diagnosis.misconceptionTag) {
    misconceptions.unshift({
      conceptId,
      tag: diagnosis.misconceptionTag,
      confidence: diagnosis.confidence,
      resolved: false,
      detectedAt: new Date().toISOString()
    });
  }

  return {
    ...studentModel,
    concepts,
    overallMastery,
    misconceptions: misconceptions.slice(0, 20),
    xp: (studentModel.xp || 0) + (diagnosis.correct ? 10 : 3)
  };
}
