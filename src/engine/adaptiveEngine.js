export function chooseNextActivity(studentModel, questions = []) {
  const entries = Object.entries(studentModel.concepts || {});
  const weak = entries.sort((a,b) => Number(a[1]?.mastery||0) - Number(b[1]?.mastery||0))[0];
  const usable = questions.filter(q => q?.status !== "Draft");
  if (!weak) return { type:"practice", reason:"Belum ada data kemampuan; mulai dari soal dasar.", questionId: usable[0]?.id || null };
  const [conceptId,profile] = weak;
  const mastery=Number(profile?.mastery||0);
  const targetLevel=mastery<.35?1:mastery<.65?2:3;
  const candidates=usable.filter(q=>q.conceptId===conceptId).sort((a,b)=>Math.abs(Number(a.level??a.difficulty??1)-targetLevel)-Math.abs(Number(b.level??b.difficulty??1)-targetLevel));
  const fallback=usable.slice().sort((a,b)=>Math.abs(Number(a.level??a.difficulty??1)-targetLevel)-Math.abs(Number(b.level??b.difficulty??1)-targetLevel))[0];
  return {type:mastery<.5?"remedial":"practice",conceptId,questionId:(candidates[0]||fallback)?.id||null,reason:mastery<.5?`Mastery ${Math.round(mastery*100)}%; mulai dari penguatan terarah.`:`Konsep ${conceptId} adalah konsep dengan mastery terendah saat ini.`};
}
