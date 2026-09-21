import React,{useMemo,useState} from "react";
import Badge from "../../components/common/Badge";
import { chooseNextActivity } from "../../engine/adaptiveEngine";
import katex from "katex";
import AIResponse from "../../components/common/AIResponse";
import "katex/dist/katex.min.css";

function renderEquation(value){if(!value)return null;try{return katex.renderToString(value,{displayMode:true,throwOnError:false})}catch{return value;}}

export default function PracticePage({questions=[],studentModel={},concepts=[],onAnswer,onAIExplain,onHint}){
 const published=useMemo(()=>questions.filter(q=>q.status!=="Draft"&&(q.assessmentType||"practice")==="practice"&&Array.isArray(q.options)&&q.options.length),[questions]);
 const recommendation=useMemo(()=>chooseNextActivity(studentModel,published),[studentModel,published]);
 const initial=recommendation.questionId?published.find(q=>q.id===recommendation.questionId):published[0];
 const startIndex=Math.max(0,published.findIndex(q=>q.id===initial?.id));
 const [generatedQuestions,setGeneratedQuestions]=useState([]);
 const allQuestions=useMemo(()=>[...published,...generatedQuestions],[published,generatedQuestions]);
 const [index,setIndex]=useState(startIndex); const [selected,setSelected]=useState(null); const [diagnosis,setDiagnosis]=useState(null); const [hintLevel,setHintLevel]=useState(0); const [hintsUsed,setHintsUsed]=useState(0); const [aiHint,setAiHint]=useState(""); const [aiReply,setAiReply]=useState(""); const [loadingHint,setLoadingHint]=useState(false); const [loadingAI,setLoadingAI]=useState(false);
 const q=allQuestions[index]; const conceptName=concepts.find(c=>c.id===q?.conceptId)?.name||q?.conceptId||"Konsep";
 if(!published.length)return <div><div className="page-kicker">Adaptive Practice</div><h1 className="page-title">Latihan Berjenjang</h1><div className="card empty-state"><strong>Belum ada soal Published.</strong><span>Guru perlu menerbitkan soal latihan pada Bank Soal.</span></div></div>;
 async function choose(i){if(diagnosis)return;setSelected(i);const d=await onAnswer?.(q,i,"practice",0,{hintsUsed});setDiagnosis(d||null);setAiHint("");setAiReply("");}
 async function useHint(){if(!diagnosis||diagnosis.correct||hintLevel>=3||loadingHint)return;const next=Math.min(3,hintLevel+1);setHintLevel(next);setHintsUsed(v=>v+1);setLoadingHint(true);try{const result=await onHint?.({question:q,hintIndex:next,conceptId:q.conceptId});setAiHint(result?.hint||"Fokus pada operasi yang digunakan pada soal dan tuliskan satu langkah antara.");}finally{setLoadingHint(false)}}
 function retry(){setSelected(null);setDiagnosis(null);setAiHint("");setAiReply("");}
 async function askAI(){if(!diagnosis?.correct||!onAIExplain)return;setLoadingAI(true);try{const r=await onAIExplain({message:`Jelaskan mengapa jawaban siswa benar dan hubungkan langkahnya dengan konsep ${conceptName}. Jangan membuat soal baru.`,context:{question:q.question,equation:q.equation,options:q.options,selectedAnswer:q.options[selected],correctAnswer:q.options[q.answer],conceptId:q.conceptId,conceptName}});setAiReply(r?.reply||"Belum ada penjelasan AI.");}finally{setLoadingAI(false)}}
 function next(){
   const generated=diagnosis?.generatedQuestion;
   if(generated?.id){
     const existing=allQuestions.findIndex(item=>item.id===generated.id);
     if(existing>=0){resetAndSet(existing);return;}
     setGeneratedQuestions(prev=>[...prev,generated]);
     setSelected(null);setDiagnosis(null);setAiHint("");setAiReply("");setHintLevel(0);setHintsUsed(0);setIndex(published.length+generatedQuestions.length);return;
   }
   const rec=diagnosis?.recommendation;
   if(rec?.questionId&&rec.questionId!==q.id){const ni=allQuestions.findIndex(item=>item.id===rec.questionId);if(ni>=0){resetAndSet(ni);return;}}
   if(index>=allQuestions.length-1){resetAndSet(0);return;}
   resetAndSet(index+1);
 }
 function resetAndSet(ni){setSelected(null);setDiagnosis(null);setAiHint("");setAiReply("");setHintLevel(0);setHintsUsed(0);setIndex(ni)}
 const progress=Math.round(((index+1)/Math.max(1,allQuestions.length))*100);
 const nextReason=diagnosis?.recommendation?.reason;
 return (
  <div>
   <div className="page-kicker">Adaptive Practice</div>
   <h1 className="page-title">Latihan Berjenjang</h1>
   <p className="page-desc">Soal berikut dipilih dari konsep yang sudah kamu coba. Setelah jawaban benar, AI membuat soal dan pilihan jawaban baru secara bertahap sesuai mastery dan penggunaan hint.</p>
   <div className="split" style={{marginTop:18}}>
    <section className="card">
     <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
      <Badge tone="blue">{q.conceptId} · {conceptName}</Badge>
      <Badge tone={Number(q.level||q.difficulty||1)<=1?"green":"amber"}>Level {q.level||q.difficulty||1}</Badge>
     </div>
     <div className="progress" style={{marginTop:14}}><span style={{width:`${progress}%`}}/></div>
     <div className="subtle" style={{marginTop:6}}>Soal {index+1} · {progress}% sesi {q.source==="ai-generated"?"· Dibuat AI":""}</div>
     <div className="question" style={{marginTop:18}}>{q.question}</div>
     {q.equation&&<div className="equation-preview" dangerouslySetInnerHTML={{__html:renderEquation(q.equation)}}/>}
     <div style={{marginTop:12}}>
      {q.options.map((o,i)=><button key={`${q.id}-${i}`} className="option" onClick={()=>choose(i)} disabled={!!diagnosis} style={selected===i?{borderColor:i===q.answer?"#10b981":"#ef4444",background:i===q.answer?"#ecfdf5":"#fff1f2"}:{}}>{String.fromCharCode(65+i)}. {o}</button>)}
     </div>
     {diagnosis&&(
      <div className={`feedback ${diagnosis.correct?"good":"bad"}`}>
       <strong>{diagnosis.correct?"Jawaban Benar!":"Jawaban Belum Tepat"}</strong>
       <div style={{marginTop:4}}><AIResponse text={diagnosis.explanation||"Perhatikan langkah penyelesaianmu."}/></div>
       {!diagnosis.correct&&(
        <div style={{marginTop:12}}>
         <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {hintLevel<3&&<button className="btn" onClick={useHint} disabled={loadingHint}>💡 {loadingHint?"AI menyiapkan hint…":`Hint ${hintLevel+1}`}</button>}
          <button className="btn" onClick={retry}>↻ Coba lagi</button>
         </div>
         {aiHint&&<div className="ai-feedback"><strong>AI Hint {hintLevel}</strong><p>{aiHint}</p></div>}
         {hintLevel>=3&&<button className="btn-primary" style={{marginTop:10}} onClick={next}>Lanjut ke soal berikutnya →</button>}
        </div>
       )}
       {diagnosis.correct&&(
        <div style={{marginTop:10}}>
         <div className="ai-feedback"><strong>AI menyiapkan soal berikutnya</strong><p>{diagnosis.generatedQuestion?"Soal dan pilihan jawaban baru sudah dibuat berdasarkan konsep, mastery, dan penggunaan hint.":(nextReason||"AI memilih soal berikutnya berdasarkan mastery, miskonsepsi, dan riwayat hint.")}</p></div>
         <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
          <button className="btn-primary" onClick={next}>Soal Berikutnya →</button>
          <button className="btn" onClick={askAI} disabled={loadingAI}>{loadingAI?"AI sedang menjelaskan…":"Tanya Tutor"}</button>
         </div>
         {aiReply&&<div className="ai-feedback"><strong>AI Tutor</strong><AIResponse text={aiReply}/></div>}
        </div>
       )}
      </div>
     )}
    </section>
    <aside className="side-stack">
     <div className="card"><div className="label">Penguasaan Materi</div><div style={{fontSize:28,fontWeight:900}}>{Math.round((studentModel.overallMastery||0)*100)}%</div><div className="subtle">perkembangan keseluruhan</div><div className="progress" style={{marginTop:8}}><span style={{width:`${(studentModel.overallMastery||0)*100}%`}}/></div></div>
     <div className="card"><div className="label">Rencana Belajar</div><p><strong>{recommendation.type==="remedial"?"Remedial":recommendation.type==="challenge"?"Challenge":"Practice"}</strong></p><p className="subtle">{recommendation.reason}</p><div className="list-item"><span>Fokus konsep</span><strong>{recommendation.conceptId||"-"}</strong></div><div className="list-item"><span>Tingkat latihan</span><strong>{recommendation.targetLevel||1}</strong></div></div>
     <div className="card"><div className="label">Hint Digunakan</div><strong>{hintsUsed}</strong><div className="subtle">Hint dibuat AI dan memengaruhi pemilihan tingkat soal berikutnya.</div></div>
    </aside>
   </div>
  </div>
 );
}
