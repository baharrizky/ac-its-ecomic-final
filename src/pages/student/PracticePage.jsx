import React, { useMemo, useState } from "react";
import Badge from "../../components/common/Badge";
import { chooseNextActivity } from "../../engine/adaptiveEngine";
import { concepts } from "../../data/demoData";

export default function PracticePage({ questions, studentModel, onAnswer }) {
  const recommendation = useMemo(()=>chooseNextActivity(studentModel,questions),[studentModel,questions]);
  const initial = recommendation.questionId ? questions.find(q=>q.id===recommendation.questionId) : questions[0];
  const [index,setIndex]=useState(Math.max(0,questions.findIndex(q=>q.id===initial?.id)));
  const [selected,setSelected]=useState(null);
  const [diagnosis,setDiagnosis]=useState(null);
  const q=questions[index];

  if(!q)return <div className="empty">Belum ada soal.</div>;

  function choose(i){if(diagnosis)return;setSelected(i);setDiagnosis(onAnswer(q,i));}
  function next(){setSelected(null);setDiagnosis(null);setIndex((index+1)%questions.length)}

  return <div>
    <div className="page-kicker">Adaptive Practice</div><h1 className="page-title">Latihan Berjenjang</h1><p className="page-desc">Soal dipilih berdasarkan student model. Rekomendasi saat ini: {recommendation.reason}</p>
    <div className="split" style={{marginTop:18}}>
      <section className="card">
        <div style={{display:"flex",justifyContent:"space-between"}}><Badge tone="blue">{q.conceptId} · {concepts[q.conceptId]?.name}</Badge><Badge tone={q.level<=1?"green":"amber"}>Level {q.level}</Badge></div>
        <div className="question" style={{marginTop:18}}>{q.question}</div>
        <div style={{marginTop:12}}>{q.options.map((o,i)=><button key={o} className="option" onClick={()=>choose(i)} style={selected===i?{borderColor:i===q.answer?"#10b981":"#ef4444",background:i===q.answer?"#ecfdf5":"#fff1f2"}:{}}>{String.fromCharCode(65+i)}. {o}</button>)}</div>
        {diagnosis&&<div className={`feedback ${diagnosis.correct?"good":"bad"}`}><strong>{diagnosis.correct?"Benar!":"Belum tepat."}</strong><div style={{marginTop:4}}>{diagnosis.explanation}</div>{!diagnosis.correct&&<div style={{marginTop:5}}>Diagnosis: <b>{diagnosis.misconceptionTag}</b></div>}<button className="btn-primary" style={{marginTop:10}} onClick={next}>Soal Berikutnya →</button></div>}
      </section>
      <aside className="side-stack">
        <div className="card"><div className="label">Student Model</div><div style={{fontSize:28,fontWeight:900}}>{Math.round(studentModel.overallMastery*100)}%</div><div className="subtle">overall mastery</div></div>
        <div className="card"><div className="label">Adaptive Decision</div><p style={{fontSize:13}}><strong>{recommendation.type === "remedial" ? "Remedial" : "Practice"}</strong></p><p className="subtle">{recommendation.reason}</p></div>
      </aside>
    </div>
  </div>;
}
