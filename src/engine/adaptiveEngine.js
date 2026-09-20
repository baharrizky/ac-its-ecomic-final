export function chooseNextActivity(studentModel = {}, questions = []) {
  const usable = questions.filter(q => q?.status !== "Draft" && Array.isArray(q?.options) && q.options.length);
  if (!usable.length) return { type:"practice", reason:"Belum ada soal Published.", questionId:null, conceptId:null, targetLevel:1 };

  const profiles = studentModel.concepts || {};
  const misconceptions = studentModel.misconceptions || [];
  const conceptIds = [...new Set(usable.map(q => q.conceptId).filter(Boolean))];
  const attemptedConceptIds = conceptIds.filter(conceptId => Number(profiles[conceptId]?.attempts || 0) > 0);
  const candidateConceptIds = attemptedConceptIds.length ? attemptedConceptIds : conceptIds;
  const ranked = candidateConceptIds.map(conceptId => {
    const p = profiles[conceptId] || { mastery:0, attempts:0 };
    const activeMis = misconceptions.filter(m => m.conceptId===conceptId && !m.resolved).length;
    const mastery = Number(p.mastery||0);
    const attempts = Number(p.attempts||0);
    const pressure = activeMis * 0.12 + (attempts===0 ? 0.18 : 0);
    return { conceptId, mastery, attempts, activeMis, score: mastery - pressure };
  }).sort((a,b)=>a.score-b.score);

  const target = ranked[0] || { conceptId:usable[0].conceptId, mastery:0, attempts:0, activeMis:0 };
  const targetLevel = target.mastery < 0.35 ? 1 : target.mastery < 0.65 ? 2 : 3;
  const candidates = usable.filter(q=>q.conceptId===target.conceptId).sort((a,b)=>{
    const la=Number(a.level??a.difficulty??1), lb=Number(b.level??b.difficulty??1);
    return Math.abs(la-targetLevel)-Math.abs(lb-targetLevel);
  });
  const chosen = candidates[0] || usable.slice().sort((a,b)=>Math.abs(Number(a.level??1)-targetLevel)-Math.abs(Number(b.level??1)-targetLevel))[0];
  return {
    type: target.mastery < 0.5 || target.activeMis ? "remedial" : target.mastery >= 0.8 ? "challenge" : "practice",
    conceptId: target.conceptId,
    questionId: chosen?.id || null,
    targetLevel,
    reason: target.activeMis ? `Ada ${target.activeMis} miskonsepsi aktif pada ${target.conceptId}; AI/adaptive engine memprioritaskan penguatan.` : target.attempts===0 ? `Konsep ${target.conceptId} belum memiliki cukup data; mulai dari level dasar.` : `Mastery ${Math.round(target.mastery*100)}% pada ${target.conceptId}; latihan dipilih untuk menaikkan level secara bertahap.`
  };
}
