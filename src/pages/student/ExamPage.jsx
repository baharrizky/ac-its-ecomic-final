import React, { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Clock3, CheckCircle2, LockKeyhole } from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";

const renderEquation=(value)=>{try{return katex.renderToString(value,{displayMode:true,throwOnError:false})}catch{return value}};
const MASTERY_GATE=0.70;

function buildExamQuestions(questions){
  const usable=questions.filter(q=>q.status!=="Draft" && (q.assessmentType||"practice")==="exam" && Array.isArray(q.options) && q.options.length);
  const groups=new Map();
  usable.forEach(q=>{const key=q.conceptId||"__general";if(!groups.has(key))groups.set(key,[]);groups.get(key).push(q)});
  const buckets=[...groups.values()].map(rows=>rows.slice().sort((a,b)=>Number(a.level??a.difficulty??1)-Number(b.level??b.difficulty??1)));
  const selected=[];let cursor=0;
  while(selected.length<20 && buckets.some(b=>b.length)){
    for(const bucket of buckets){
      if(bucket.length && selected.length<20) selected.push(bucket.shift());
    }
    cursor++; if(cursor>50)break;
  }
  return selected;
}

export default function ExamPage({ questions = [], session, studentModel = {}, examResults = [], onComplete, onGoPractice }) {
  const eligible=useMemo(()=>buildExamQuestions(questions.filter(q=>(!q.educationLevel||q.educationLevel===session?.educationLevel)&&(!q.grade||q.grade===session?.grade))),[questions,session?.educationLevel,session?.grade]);
  const examConcepts=useMemo(()=>[...new Set(eligible.map(q=>q.conceptId).filter(Boolean))],[eligible]);
  const masteryByConcept=examConcepts.map(id=>({id,mastery:Number(studentModel?.concepts?.[id]?.mastery||0)}));
  const examMastery=masteryByConcept.length?masteryByConcept.reduce((a,b)=>a+b.mastery,0)/masteryByConcept.length:Number(studentModel?.overallMastery||0);
  const weakConcepts=masteryByConcept.filter(x=>x.mastery<MASTERY_GATE).sort((a,b)=>a.mastery-b.mastery);
  const subject=eligible[0]?.subject||"general";
  const examKey=`${session?.educationLevel||""}:${session?.grade||""}:${subject}`;
  const alreadyTaken=examResults.some(r=>r.examKey===examKey || (!r.examKey && r.grade===session?.grade && (!r.educationLevel || r.educationLevel===session?.educationLevel)));
  const [started,setStarted]=useState(false); const [index,setIndex]=useState(0); const [answers,setAnswers]=useState({}); const [seconds,setSeconds]=useState(Math.max(300,eligible.length*90)); const [finished,setFinished]=useState(false); const [result,setResult]=useState(null);
  useEffect(()=>{if(!started||finished)return; const t=setInterval(()=>setSeconds(s=>{if(s<=1){clearInterval(t);finish();return 0;}return s-1;}),1000);return()=>clearInterval(t);},[started,finished,index]);
  const q=eligible[index];
  const fmt=`${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;
  async function finish(){
    if(finished)return;
    const correct=eligible.filter((x,i)=>Number(answers[i])===Number(x.answer)).length;
    const score=eligible.length?Math.round((correct/eligible.length)*100):0;
    const durationSeconds=(eligible.length*90)-seconds;
    const conceptResults={};
    eligible.forEach((x,i)=>{if(!x.conceptId)return;if(!conceptResults[x.conceptId])conceptResults[x.conceptId]={total:0,correct:0};conceptResults[x.conceptId].total++;if(Number(answers[i])===Number(x.answer))conceptResults[x.conceptId].correct++;});
    Object.values(conceptResults).forEach(v=>v.score=Math.round((v.correct/v.total)*100));
    const res={score,correct,total:eligible.length,durationSeconds,answers,conceptResults,examKey,educationLevel:session?.educationLevel,grade:session?.grade,subject};
    setFinished(true);setResult(res);await onComplete?.(res,eligible,answers);
  }
  if(!eligible.length)return <div><div className="page-kicker">Assessment</div><h1 className="page-title">Ujian</h1><div className="card empty-state"><strong>Belum ada soal ujian yang tersedia.</strong><span>Guru perlu menerbitkan soal untuk jenjang dan kelas akunmu.</span></div></div>;
  if(alreadyTaken&&!started&&!finished)return <div><div className="page-kicker">Assessment</div><h1 className="page-title">Ujian Selesai</h1><div className="card" style={{maxWidth:760}}><div style={{display:"flex",gap:12,alignItems:"center"}}><CheckCircle2 size={28}/><div><h2 style={{margin:0}}>Kamu sudah mengikuti ujian ini.</h2><p className="subtle">Ujian bersifat satu kali percobaan. Gunakan Progress atau Latihan untuk memperkuat konsep yang masih lemah.</p></div></div><button className="btn-primary" style={{marginTop:14}} onClick={onGoPractice}>Kembali ke Latihan</button></div></div>;
  if(finished)return <div><div className="page-kicker">Assessment Result</div><h1 className="page-title">Hasil Ujian</h1><div className="stats-row"><div className="ac-stat"><div className="stat-icon green"><CheckCircle2/></div><div><span>Nilai</span><strong>{result?.score||0}</strong></div></div><div className="ac-stat"><div className="stat-icon blue"><ClipboardCheck/></div><div><span>Benar</span><strong>{result?.correct||0}/{result?.total||0}</strong></div></div></div><div className="card"><h2>Ujian selesai</h2><p className="subtle">Hasil ujian sudah tersimpan. Tidak ada tombol mengulang agar hasil tetap merepresentasikan satu kali assessment.</p>{result?.conceptResults&&<div style={{marginTop:14}}><strong>Penguasaan per konsep</strong>{Object.entries(result.conceptResults).map(([id,v])=><div className="list-item" key={id}><span>{id}</span><strong>{v.score}%</strong></div>)}</div>}<button className="btn-primary" style={{marginTop:14}} onClick={onGoPractice}>Lanjut ke rekomendasi belajar</button></div></div>;
  if(!started){
    const gateOk=examMastery>=MASTERY_GATE;
    return <div><div className="page-kicker">Assessment</div><h1 className="page-title">Ujian</h1><p className="page-desc">Ujian sumatif mengukur penguasaan konsep setelah pembelajaran dan latihan.</p>
      <div className="exam-card"><div className="exam-icon"><ClipboardCheck/></div><h2>Ujian {session?.grade||""}</h2><p>{eligible.length} soal dengan distribusi berdasarkan konsep pembelajaran.</p><div className="exam-meta"><span><ClipboardCheck size={15}/> {eligible.length} soal</span><span><Clock3 size={15}/> {Math.floor(seconds/60)} menit</span></div>
      <div className={`feedback ${gateOk?"good":"bad"}`} style={{marginTop:16}}>{gateOk?<><strong>✓ Syarat ujian terpenuhi</strong><p>Mastery konsep ujian: {Math.round(examMastery*100)}%. Kamu dapat mengikuti assessment.</p></>:<><strong><LockKeyhole size={16} style={{verticalAlign:"middle"}}/> Ujian belum terbuka</strong><p>Mastery konsep yang diuji baru {Math.round(examMastery*100)}%. Target minimal {Math.round(MASTERY_GATE*100)}%.</p>{weakConcepts.length>0&&<p>Fokus remedial: {weakConcepts.slice(0,4).map(x=>`${x.id} (${Math.round(x.mastery*100)}%)`).join(", ")}</p>}<button className="btn-primary" onClick={onGoPractice}>Mulai Remedial / Latihan</button></>}</div>
      {gateOk&&<button className="primary-btn" style={{marginTop:14}} onClick={()=>setStarted(true)}>Mulai Ujian</button>}</div></div>;
  }
  return <div><div className="page-kicker">Assessment</div><h1 className="page-title">Ujian Berlangsung</h1><div className="card" style={{marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}><strong>Soal {index+1} / {eligible.length}</strong><span className="badge badge-blue">⏱ {fmt}</span></div><div className="card"><h2>{q.question}</h2>{q.equation&&<div className="equation-preview" dangerouslySetInnerHTML={{__html:renderEquation(q.equation)}}/>}<div style={{display:"grid",gap:10,marginTop:16}}>{q.options.map((o,i)=><button key={i} className={`option ${answers[index]===i?"selected":""}`} onClick={()=>setAnswers(a=>({...a,[index]:i}))}>{String.fromCharCode(65+i)}. {o}</button>)}</div><div className="actions" style={{marginTop:18}}><button className="btn" disabled={index===0} onClick={()=>setIndex(i=>i-1)}>← Sebelumnya</button>{index<eligible.length-1?<button className="btn-primary" onClick={()=>setIndex(i=>i+1)}>Berikutnya →</button>:<button className="btn-primary" onClick={finish}>Kumpulkan Ujian</button>}</div><div className="subtle" style={{marginTop:12}}>AI Tutor dan hint dinonaktifkan selama ujian.</div></div></div>;
}
