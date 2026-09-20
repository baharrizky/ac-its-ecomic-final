import React, { useMemo, useState } from "react";
import Badge from "../../components/common/Badge";
import { chooseNextActivity } from "../../engine/adaptiveEngine";
import katex from "katex";
import AIResponse from "../../components/common/AIResponse";
import "katex/dist/katex.min.css";

function renderEquation(value){
  if(!value) return null;
  try{return katex.renderToString(value,{displayMode:true,throwOnError:false});}catch{return value;}
}

function fallbackHints(q){
  const explanation = String(q?.explanation || "").trim();
  return [
    `Perhatikan kembali konsep ${q?.conceptId || "pada materi ini"}. Jangan langsung memilih hasil akhir.`,
    explanation ? `Gunakan langkah pada pembahasan, tetapi tentukan sendiri operasi yang harus dilakukan terlebih dahulu.` : "Uraikan informasi pada soal menjadi langkah-langkah kecil.",
    explanation ? "Coba cek kembali hubungan antara informasi pada soal dan konsep yang dipelajari di E-Comic." : "Coba kerjakan kembali dari awal dengan memperhatikan contoh pada panel E-Comic."
  ];
}

export default function PracticePage({ questions = [], studentModel = {}, concepts = [], onAnswer, onAIExplain, onHint }) {
  const published = useMemo(()=>questions.filter(q=>q.status !== "Draft" && (q.assessmentType||"practice")==="practice" && Array.isArray(q.options) && q.options.length),[questions]);
  const recommendation = useMemo(()=>chooseNextActivity(studentModel,published),[studentModel,published]);
  const initial = recommendation.questionId ? published.find(q=>q.id===recommendation.questionId) : published[0];
  const startIndex = Math.max(0,published.findIndex(q=>q.id===initial?.id));
  const [index,setIndex]=useState(startIndex);
  const [selected,setSelected]=useState(null);
  const [diagnosis,setDiagnosis]=useState(null);
  const [hintLevel,setHintLevel]=useState(0);
  const [hintsUsed,setHintsUsed]=useState(0);
  const [aiReply,setAiReply]=useState("");
  const [loadingAI,setLoadingAI]=useState(false);
  const q=published[index];
  const conceptName=concepts.find(c=>c.id===q?.conceptId)?.name||q?.conceptId||"Konsep";
  const hints=Array.isArray(q?.hints)&&q.hints.some(Boolean) ? q.hints.filter(Boolean).slice(0,3) : fallbackHints(q);

  if(!published.length) return <div><div className="page-kicker">Adaptive Practice</div><h1 className="page-title">Latihan Berjenjang</h1><div className="card empty-state"><strong>Belum ada soal Published.</strong><span>Guru perlu menerbitkan soal pada Bank Soal sebelum latihan dapat dimulai.</span></div></div>;

  async function choose(i){
    if(diagnosis?.correct) return;
    setSelected(i);
    const d=await onAnswer?.(q,i,"practice",0,hintsUsed);
    setDiagnosis(d||null);
    setAiReply("");
  }
  async function useHint(){
    if(!diagnosis || diagnosis.correct || hintLevel>=3) return;
    const next=Math.min(3,hintLevel+1);
    setHintLevel(next);
    setHintsUsed(v=>v+1);
    const result=await onHint?.({question:q,hintIndex:next,conceptId:q.conceptId,conceptName});
    if(result?.reply) {
      setAiReply(result.reply);
    }
  }
  function retry(){
    setSelected(null);
    setDiagnosis(null);
    setAiReply("");
  }
  async function askAI(){
    if(!diagnosis?.correct || !onAIExplain) return;
    setLoadingAI(true);
    try {
      const r=await onAIExplain({
        message:`Siswa sudah mencoba dan menjawab benar. Jelaskan mengapa jawabannya benar, hubungkan dengan konsep E-Comic, lalu berikan satu pertanyaan reflektif singkat tanpa membocorkan soal berikutnya.`,
        context:{question:q.question,equation:q.equation,options:q.options,selectedAnswer:q.options[selected],correctAnswer:q.options[q.answer],conceptId:q.conceptId,conceptName,hintsUsed}
      });
      setAiReply(r?.reply || "Belum ada penjelasan AI.");
    } finally { setLoadingAI(false); }
  }
  function next(){
    const rec=diagnosis?.recommendation;
    if(rec?.questionId && rec.questionId!==q.id){
      const nextIndex=published.findIndex(item=>item.id===rec.questionId);
      if(nextIndex>=0){setSelected(null);setDiagnosis(null);setAiReply("");setHintLevel(0);setHintsUsed(0);setIndex(nextIndex);return;}
    }
    const currentLevel=Number(q?.level??q?.difficulty??1);
    const targetLevel=Math.max(1,Math.min(5,currentLevel + (hintsUsed===0 ? 1 : hintsUsed<=2 ? 0 : -1)));
    const sameConcept=published.filter(item=>item.conceptId===q.conceptId && item.id!==q.id);
    const candidates=(sameConcept.length?sameConcept:published.filter(item=>item.id!==q.id)).slice().sort((a,b)=>Math.abs(Number(a.level??a.difficulty??1)-targetLevel)-Math.abs(Number(b.level??b.difficulty??1)-targetLevel));
    const fallback=candidates[0];
    setSelected(null);setDiagnosis(null);setAiReply("");setHintLevel(0);setHintsUsed(0);
    if(fallback){setIndex(published.findIndex(item=>item.id===fallback.id));}else if(index>=published.length-1){setIndex(0);}else{setIndex(v=>v+1);}
  }

  const progress=Math.round(((index+1)/published.length)*100);
  return <div>
    <div className="page-kicker">Adaptive Practice</div>
    <h1 className="page-title">Latihan Berjenjang</h1>
    <p className="page-desc">Latihan mengikuti konsep E-Comic dan menyesuaikan tingkat penguasaanmu. {recommendation.reason}</p>
    <div className="split" style={{marginTop:18}}>
      <section className="card">
        <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
          <Badge tone="blue">{q.conceptId} · {conceptName}</Badge>
          <Badge tone={q.level<=1?"green":"amber"}>Level {q.level||q.difficulty||1}</Badge>
        </div>
        <div className="progress" style={{marginTop:14}}><span style={{width:`${progress}%`}}/></div>
        <div className="subtle" style={{marginTop:6}}>Soal {index+1} · {progress}% sesi</div>
        <div className="question" style={{marginTop:18}}>{q.question}</div>
        {q.equation&&<div className="equation-preview" dangerouslySetInnerHTML={{__html:renderEquation(q.equation)}}/>}
        <div style={{marginTop:12}}>
          {q.options.map((o,i)=><button key={`${q.id}-${i}`} className="option" onClick={()=>choose(i)} disabled={!!diagnosis?.correct} style={selected===i?{borderColor:i===q.answer?"#10b981":"#ef4444",background:i===q.answer?"#ecfdf5":"#fff1f2"}:{}}>{String.fromCharCode(65+i)}. {o}</button>)}
        </div>
        {diagnosis&&<div className={`feedback ${diagnosis.correct?"good":"bad"}`}>
          <strong>{diagnosis.correct?"Jawaban Benar!":"Jawaban Belum Tepat"}</strong>
          <div style={{marginTop:4}}><AIResponse text={diagnosis.correct ? (diagnosis.explanation||"Bagus! Konsepnya sudah kamu pahami.") : (hintLevel>=3 ? (diagnosis.explanation||"Periksa kembali langkah penyelesaianmu.") : "Jangan langsung melihat jawaban. Gunakan hint bertahap untuk menemukan langkah berikutnya.")}/></div>
          {!diagnosis.correct&&<div style={{marginTop:12}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {hintLevel<3&&<button className="btn" onClick={useHint}>💡 Hint {hintLevel+1}</button>}
              <button className="btn" onClick={retry}>↻ Coba lagi</button>
              
              {hintLevel>=3&&<button className="btn-primary" onClick={next}>Lanjut →</button>}
            </div>
            {hintLevel>0&&<div className="ai-feedback"><strong>Hint {hintLevel}</strong><p>{aiReply || hints[Math.min(hintLevel-1,hints.length-1)]}</p></div>}
          </div>}
          {diagnosis.correct&&<div style={{marginTop:12}}><div className="ai-feedback"><strong>Rekomendasi berikutnya</strong><p>{diagnosis.recommendation?.reason || (hintsUsed===0 ? "Naik satu tingkat karena kamu menjawab tanpa hint." : hintsUsed<=2 ? "Tetap di tingkat yang sama untuk memastikan pemahaman." : "Turunkan sedikit tingkat kesulitan untuk memperkuat konsep sebelum naik lagi.")}</p><div className="subtle">Target level: {diagnosis.recommendation?.targetLevel || Math.max(1,Math.min(5,Number(q?.level??q?.difficulty??1)+(hintsUsed===0?1:hintsUsed<=2?0:-1)))}</div></div><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}><button className="btn-primary" onClick={next}>Soal Berikutnya →</button>{!aiReply&&<button className="btn" onClick={askAI} disabled={loadingAI}>{loadingAI?"AI sedang menjelaskan…":"Tanya Tutor"}</button>}</div></div>}
        </div>}
      </section>
      <aside className="side-stack">
        <div className="card"><div className="label">Penguasaan Materi</div><div style={{fontSize:28,fontWeight:900}}>{Math.round((studentModel.overallMastery||0)*100)}%</div><div className="subtle">perkembangan keseluruhan</div><div className="progress" style={{marginTop:8}}><span style={{width:`${(studentModel.overallMastery||0)*100}%`}}/></div></div>
        <div className="card"><div className="label">Rencana Belajar</div><p style={{fontSize:13}}><strong>{recommendation.type === "remedial" ? "Remedial" : recommendation.type === "challenge" ? "Challenge" : "Practice"}</strong></p><p className="subtle">{recommendation.reason}</p><div className="list-item"><span>Fokus konsep</span><strong>{recommendation.conceptId||"-"}</strong></div><div className="list-item"><span>Tingkat latihan</span><strong>{recommendation.targetLevel||1}</strong></div></div>
        <div className="card"><div className="label">Hint Digunakan</div><strong>{hintsUsed}</strong><div className="subtle">Hint digunakan hanya untuk pembelajaran, bukan nilai ujian.</div></div>
      </aside>
    </div>
  </div>;
}
