export function chooseNextActivity(studentModel = {}, questions = []) {
  const usable = (Array.isArray(questions)?questions:[]).filter(q => q?.status !== "Draft" && (q?.assessmentType || "practice") === "practice" && Array.isArray(q?.options) && q.options.length);
  if (!usable.length) return { type:"practice", reason:"Belum ada soal latihan Published.", questionId:null, conceptId:null, targetLevel:1 };
  const profiles = studentModel?.concepts || {};
  const misconceptions = Array.isArray(studentModel?.misconceptions) ? studentModel.misconceptions : [];
  const conceptIds = [...new Set(usable.map(q => q.conceptId).filter(Boolean))];
  const learned = conceptIds.filter(id => Number(profiles[id]?.attempts || 0) > 0 || Number(profiles[id]?.exposureCount || 0) > 0);
  if (!learned.length) return { type:"practice", reason:"Belum ada konsep yang sudah dilalui. Mulai dari soal latihan pertama.", questionId:usable[0]?.id||null, conceptId:usable[0]?.conceptId||null, targetLevel:1 };
  const ranked = learned.map(conceptId => {
    const p = profiles[conceptId] || { mastery:0, attempts:0 };
    const activeMis = misconceptions.filter(m => m.conceptId===conceptId && !m.resolved).length;
    const mastery = Number(p.mastery||0);
    const attempts = Number(p.attempts||0);
    const pressure = activeMis * 0.12 + (attempts===0 ? 0.18 : 0);
    return { conceptId, mastery, attempts, activeMis, score: mastery - pressure };
  }).sort((a,b)=>a.score-b.score);
  const target = ranked[0];
  const targetLevel = target.mastery < 0.35 ? 1 : target.mastery < 0.65 ? 2 : 3;
  const candidates = usable.filter(q=>q.conceptId===target.conceptId).sort((a,b)=>{
    const la=Number(a.level??a.difficulty??1), lb=Number(b.level??b.difficulty??1);
    return Math.abs(la-targetLevel)-Math.abs(lb-targetLevel);
  });
  const chosen = candidates[0] || usable[0];
  return {
    type: target.mastery < 0.5 || target.activeMis ? "remedial" : target.mastery >= 0.8 ? "challenge" : "practice",
    conceptId: target.conceptId, questionId: chosen?.id || null, targetLevel,
    reason: target.activeMis ? `Ada ${target.activeMis} miskonsepsi aktif pada ${target.conceptId}; konsep yang sudah dipelajari diprioritaskan.` : `Mastery ${Math.round(target.mastery*100)}% pada ${target.conceptId}; latihan dipilih bertahap.`
  };
}
