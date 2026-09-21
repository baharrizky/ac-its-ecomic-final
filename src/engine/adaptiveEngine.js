export function chooseNextActivity(studentModel={},questions=[]){
 const usable=questions.filter(q=>q?.status!=="Draft"&&Array.isArray(q?.options)&&q.options.length&&(q.assessmentType||"practice")==="practice");
 if(!usable.length)return{type:"practice",reason:"Belum ada soal latihan Published.",questionId:null,conceptId:null,targetLevel:1};
 const profiles=studentModel.concepts||{}; const misconceptions=studentModel.misconceptions||[]; const conceptIds=[...new Set(usable.map(q=>q.conceptId).filter(Boolean))];
 const attemptedConceptIds=conceptIds.filter(id=>Number(profiles[id]?.attempts||0)>0);
 // Untuk siswa baru, mulai dari konsep pertama pada bank soal. Setelah ada
 // attempt, sistem tidak boleh melompat ke konsep yang belum pernah dipelajari.
 const candidateConceptIds=attemptedConceptIds.length?attemptedConceptIds:conceptIds.slice(0,1);
 const ranked=candidateConceptIds.map(conceptId=>{const p=profiles[conceptId]||{mastery:0,attempts:0};const activeMis=misconceptions.filter(m=>m.conceptId===conceptId&&!m.resolved).length;const mastery=Number(p.mastery||0);const attempts=Number(p.attempts||0);const pressure=activeMis*0.12+(attempts===0?0.18:0);return{conceptId,mastery,attempts,activeMis,score:mastery-pressure};}).sort((a,b)=>a.score-b.score);
 const target=ranked[0]||{conceptId:usable[0].conceptId,mastery:0,attempts:0,activeMis:0}; const targetLevel=target.mastery<.35?1:target.mastery<.65?2:3;
 const candidates=usable.filter(q=>q.conceptId===target.conceptId).sort((a,b)=>Math.abs(Number(a.level??a.difficulty??1)-targetLevel)-Math.abs(Number(b.level??b.difficulty??1)-targetLevel)); const chosen=candidates[0]||usable[0];
 return{type:target.mastery<.5||target.activeMis?"remedial":target.mastery>=.8?"challenge":"practice",conceptId:target.conceptId,questionId:chosen?.id||null,targetLevel,reason:target.activeMis?`Ada ${target.activeMis} miskonsepsi aktif pada ${target.conceptId}; konsep ini diprioritaskan.`:target.attempts===0?`Mulai dari ${target.conceptId} karena ini adalah konsep awal yang tersedia.`:`Mastery ${Math.round(target.mastery*100)}% pada ${target.conceptId}; latihan dipilih bertahap.`};
}
