import React,{useEffect,useMemo,useRef,useState} from "react";
import { listConcepts } from "../../services/conceptService";
import AIResponse from "../../components/common/AIResponse";

export default function TutorPage({comic,studentModel,messages,onSend,readerContext,session}){
 const [input,setInput]=useState("");const [busy,setBusy]=useState(false);
 const messagesRef=useRef(null);
 const ei=Number.isInteger(readerContext?.episodeIndex)?readerContext.episodeIndex:0,pi=Number.isInteger(readerContext?.panelIndex)?readerContext.panelIndex:0;
 const episode=comic?.episodes?.[ei];const panel=episode?.panels?.[pi];
 const [concepts,setConcepts]=useState({});
 const conceptId=panel?.conceptIds?.[0]||comic?.concepts?.[0]||"";
 useEffect(()=>{let alive=true;listConcepts().then(items=>alive&&setConcepts(Object.fromEntries(items.map(c=>[c.id,c])))).catch(()=>{});return()=>{alive=false}},[]);
 useEffect(()=>{
   const el=messagesRef.current;
   if(el) requestAnimationFrame(()=>{el.scrollTop=el.scrollHeight;});
 },[messages?.length]);
 const context=useMemo(()=>({comicTitle:comic?.title||"Belum memilih E-Comic",episodeTitle:episode?.title||"",panelTitle:panel?.title||"",narration:panel?.narration||"",dialogue:panel?.dialogue||"",equation:panel?.equation||"",imageUrl:panel?.imageUrl||"",conceptId,conceptName:concepts[conceptId]?.name||conceptId,studentMastery:studentModel?.concepts?.[conceptId]?.mastery??0,misconceptions:(studentModel?.misconceptions||[]).filter(m=>m.conceptId===conceptId&&!m.resolved),educationLevel:session?.educationLevel,grade:session?.grade,school:session?.school,currentLevel:studentModel?.currentLevel||1}),[comic,episode,panel,conceptId,studentModel,session]);
 async function send(e){e.preventDefault();if(!input.trim()||busy)return;const msg=input.trim();setInput("");setBusy(true);try{await onSend(msg,context)}finally{setBusy(false)}}
 return <div className="tutor-page"><div className="page-kicker">Contextual AI Tutor</div><h1 className="page-title">Tutor AI</h1><p className="page-desc">Tutor memahami materi yang sedang kamu pelajari. Jika kamu meminta jawaban terus-menerus, tutor akan mengajakmu kembali memahami materi, memberi petunjuk, dan mengajukan pertanyaan penuntun.</p>
 <div className="card tutor-ready-banner" style={{marginTop:14}}><strong>AI Tutor siap membantu</strong><div className="subtle">Tanyakan panel yang sedang kamu baca, konsep yang belum kamu pahami, atau minta petunjuk untuk menyelesaikan soal.</div></div>
 <div className="split" style={{marginTop:18}}><div className="chat"><div className="chat-messages" ref={messagesRef}>{messages.map((m,i)=><div key={i} className={`bubble ${m.role}`}><AIResponse text={m.text}/></div>)}</div><form className="chat-input" onSubmit={send}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Tanyakan konsep yang sedang kamu baca..."/><button className="btn-primary" disabled={busy}>{busy?"AI…":"Kirim"}</button></form></div><aside className="side-stack"><div className="card"><div className="label">Current Context</div><p><strong>Materi</strong><br/>{context.comicTitle}</p><p><strong>Episode</strong><br/>{context.episodeTitle||"-"}</p><p><strong>Panel</strong><br/>{context.panelTitle||"-"}</p><p><strong>Fokus belajar</strong><br/>{context.conceptName}</p><p><strong>Penguasaan materi</strong><br/>{Math.round(Number(context.studentMastery||0)*100)}%</p>{context.equation&&<p><strong>Persamaan pada panel</strong><br/>{context.equation}</p>}</div></aside></div></div>;
}
