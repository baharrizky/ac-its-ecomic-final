export function chooseNextActivity(studentModel, questions) {
  const entries = Object.entries(studentModel.concepts || {});
  const weak = entries.sort((a,b) => a[1].mastery - b[1].mastery)[0];

  if (!weak) return { type: "practice", reason: "Belum ada data kemampuan." };

  const [conceptId, profile] = weak;
  const target = questions
    .filter((q) => q.conceptId === conceptId)
    .sort((a,b) => Math.abs(a.difficulty - (profile.mastery < .5 ? 1 : 2)) - Math.abs(b.difficulty - (profile.mastery < .5 ? 1 : 2)))[0];

  return {
    type: profile.mastery < 0.5 ? "remedial" : "practice",
    conceptId,
    questionId: target?.id || null,
    reason: profile.mastery < 0.5 ? "Mastery di bawah 50%; perlu penguatan." : "Konsep terlemah saat ini perlu latihan terarah."
  };
}
