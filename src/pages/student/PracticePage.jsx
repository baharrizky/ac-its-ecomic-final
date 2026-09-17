import React, { useMemo, useState } from "react";
import Badge from "../../components/common/Badge";
import { chooseNextActivity } from "../../engine/adaptiveEngine";
import { concepts } from "../../data/demoData";
import katex from "katex";
import "katex/dist/katex.min.css";

function renderEquation(value){ if(!value) return null; try{return katex.renderToString(value,{displayMode:true,throwOnError:false});}catch{return value;} }

export default function PracticePage({ questions = [], studentModel, onAnswer, onAIExplain, onFinish }) {
  const published = questions.filter(q=>q.status !== "Draft");
  const recommendation = useMemo(()=>chooseNextActivity(studentModel,published),[studentModel,published]);
  const initial = recommendation.questionId ? published.find(q=>q.id===recommendation.questionId) : published[0];
  const startIndex = Math.max(0,published.findIndex(q=>q.id===initial?.id));
  const [index,setIndex]=useState(startIndex);
  const [selected,setSelected]=useState(null);
  const [diagnosis,setDiagnosis]=useState(null);
  const [aiReply,setAiReply]=useState("");
  const [loadingAI,setLoadingAI]=useState(false);
  const [done,setDone]=useState(false);
  const q=published[index];

  if(!published.length) return <div><div className="page-kicker">Adaptive Practice</div><h1 className="page-title">Latihan Berjenjang</h1><div className="card empty-state"><strong>Belum ada soal Published.</strong><span>Guru perlu menerbitkan soal pada Bank Soal sebelum latihan dapat dimulai.</span></div></div>;
  if(done) return <div><div className="page-kicker">Adaptive Practice</div><h1 className="page-title">Latihan selesai</h1><div className="card success-note"><strong>Bagus, sesi latihan selesai.</strong><span>Kamu sudah menyelesaikan {published.length ? Math.min(index+1,published.length) : 0} soal pada sesi ini.</span><button className="primary-btn small" style={{marginTop:12}} onClick={()=>{setDone(false);setIndex(0);setSelected(null);setDiagnosis(null);}}>Ulangi Latihan</button></div></div>;

  async function choose(i){ if(diagnosis) return; setSelected(i); const d=await onAnswer(q,i,"practice"); setDiagnosis(d); setAiReply(""); }
  async function askAI(){ if(!diagnosis || !onAIExplain) return; setLoadingAI(true); try { const r=await onAIExplain({message:`Jelaskan mengapa jawaban ${String.fromCharCode(65+selected)} pada soal berikut ${diagnosis.correct?"benar":"belum tepat"}. Berikan langkah singkat dan tunjukkan konsep yang perlu diperhatikan.`, context:{question:q.question,equation:q.equation,options:q.options,selectedAnswer:q.options[selected],correctAnswer:q.options[q.answer],conceptId:q.conceptId,conceptName:concepts[q.conceptId]?.name}}); setAiReply(r?.reply || "Belum ada penjelasan AI."); } finally { setLoadingAI(false); } }
  async function next(){ if(index>=published.length-1){setDone(true);await onFinish?.();return;} setSelected(null);setDiagnosis(null);setAiReply("");setIndex(v=>v+1); }

  return <div>
    <div className="page-kicker">Adaptive Practice</div><h1 className="page-title">Latihan Berjenjang</h1><p className="page-desc">Soal dipilih berdasarkan student model. {recommendation.reason}</p>
    <div className="split" style={{marginTop:18}}>
      <section className="card">
        <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><Badge tone="blue">{q.conceptId} · {concepts[q.conceptId]?.name||q.conceptId}</Badge><Badge tone={q.level<=1?"green":"amber"}>Level {q.level||q.difficulty||1}</Badge></div>
        <div className="question" style={{marginTop:18}}>{q.question}</div>
        {q.equation&&<div className="equation-preview" dangerouslySetInnerHTML={{__html:renderEquation(q.equation)}}/>}
        <div style={{marginTop:12}}>{q.options.map((o,i)=><button key={`${q.id}-${i}`} className="option" onClick={()=>choose(i)} disabled={!!diagnosis} style={selected===i?{borderColor:i===q.answer?"#10b981":"#ef4444",background:i===q.answer?"#ecfdf5":"#fff1f2"}:{}}>{String.fromCharCode(65+i)}. {o}</button>)}</div>
        {diagnosis&&<div className={`feedback ${diagnosis.correct?"good":"bad"}`}>
          <strong>{diagnosis.correct?"Benar!":"Belum tepat."}</strong><div style={{marginTop:4}}>{diagnosis.explanation}</div>
          {!diagnosis.correct&&<div style={{marginTop:5}}>Diagnosis: <b>{diagnosis.misconceptionTag}</b></div>}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}><button className="btn" onClick={askAI} disabled={loadingAI}>{loadingAI?"AI sedang menjelaskan…":"Minta AI jelaskan"}</button><button className="btn-primary" onClick={next}>{index>=published.length-1?"Selesai":"Soal Berikutnya →"}</button></div>
          {aiReply&&<div className="ai-feedback"><strong>AI Tutor</strong><p>{aiReply}</p></div>}
        </div>}
      </section>
      <aside className="side-stack">
        <div className="card"><div className="label">Student Model</div><div style={{fontSize:28,fontWeight:900}}>{Math.round((studentModel.overallMastery||0)*100)}%</div><div className="subtle">overall mastery</div><div className="progress" style={{marginTop:8}}><span style={{width:`${(studentModel.overallMastery||0)*100}%`}}/></div></div>
        <div className="card"><div className="label">Adaptive Decision</div><p style={{fontSize:13}}><strong>{recommendation.type === "remedial" ? "Remedial" : "Practice"}</strong></p><p className="subtle">{recommendation.reason}</p><div className="list-item"><span>Konsep terlemah</span><strong>{recommendation.conceptId||"-"}</strong></div></div>
        <div className="card"><div className="label">Progress Sesi</div><strong>{index+1} / {published.length}</strong><div className="progress" style={{marginTop:8}}><span style={{width:`${((index+1)/published.length)*100}%`}}/></div></div>
      </aside>
    </div>
  </div>;
}
