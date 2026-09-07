import React, { useMemo, useState } from "react";
import { concepts } from "../../data/demoData";

export default function TutorPage({ comic, studentModel, messages, onSend }) {
  const [input,setInput]=useState("");
  const conceptId=comic?.concepts?.[0] || "E1";
  const context=useMemo(()=>({
    comicTitle: comic?.title || "Belum memilih comic",
    episodeTitle: comic?.episodes?.[0]?.title || "",
    conceptId,
    conceptName: concepts[conceptId]?.name || conceptId,
    studentMastery: studentModel.concepts[conceptId]?.mastery ?? null,
    misconceptions: studentModel.misconceptions.filter(m=>m.conceptId===conceptId)
  }),[comic,studentModel,conceptId]);

  async function send(e){e.preventDefault();if(!input.trim())return;const msg=input.trim();setInput("");await onSend(msg,context)}

  return <div>
    <div className="page-kicker">Contextual AI Tutor</div><h1 className="page-title">Tutor AI</h1><p className="page-desc">Tutor menerima konteks pembelajaran, bukan hanya pertanyaan mentah.</p>
    <div className="split" style={{marginTop:18}}>
      <div className="chat">
        <div className="chat-messages">{messages.map((m,i)=><div key={i} className={`bubble ${m.role}`}>{m.text}</div>)}</div>
        <form className="chat-input" onSubmit={send}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Tanyakan konsep yang sedang kamu baca..." /><button className="btn-primary">Kirim</button></form>
      </div>
      <aside className="side-stack">
        <div className="card"><div className="label">Current Context</div><p><strong>Comic</strong><br/>{context.comicTitle}</p><p><strong>Konsep</strong><br/>{context.conceptId} · {context.conceptName}</p><p><strong>Mastery</strong><br/>{context.studentMastery == null ? "-" : `${Math.round(context.studentMastery*100)}%`}</p></div>
        <div className="card"><div className="label">Miskonsepsi</div>{context.misconceptions.length ? context.misconceptions.map((m,i)=><div key={i} className="list-item"><strong>{m.tag}</strong></div>) : <div className="subtle">Tidak ada miskonsepsi aktif pada konsep ini.</div>}</div>
      </aside>
    </div>
  </div>;
}
