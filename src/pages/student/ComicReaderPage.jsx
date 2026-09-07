import React, { useMemo, useState } from "react";
import Badge from "../../components/common/Badge";
import { concepts } from "../../data/demoData";

export default function ComicReaderPage({ comic, studentModel, navigate }) {
  const [ei,setEi]=useState(0),[pi,setPi]=useState(0);
  if (!comic) return <div className="empty">Comic tidak ditemukan.</div>;
  const episode=comic.episodes[ei];
  const panel=episode?.panels[pi];
  const progress=episode?.panels.length ? Math.round(((pi+1)/episode.panels.length)*100) : 0;
  const conceptId=panel?.conceptIds?.[0];
  const conceptName=concepts[conceptId]?.name || conceptId;
  const mastery=studentModel.concepts[conceptId]?.mastery;

  if (!episode || !panel) return <div><button className="btn" onClick={()=>navigate("comic-library")}>← Kembali</button><div className="card empty" style={{marginTop:14}}>Belum ada episode yang diterbitkan.</div></div>;

  function next(){if(pi<episode.panels.length-1)setPi(pi+1);else if(ei<comic.episodes.length-1){setEi(ei+1);setPi(0)}}
  function prev(){if(pi>0)setPi(pi-1);else if(ei>0){setEi(ei-1);setPi(comic.episodes[ei-1].panels.length-1)}}

  return <div>
    <div className="toolbar"><button className="btn" onClick={()=>navigate("comic-library")}>← Koleksi</button><Badge tone="blue">{progress}% episode</Badge></div>
    <div className="reader">
      <section className="comic-stage">
        <div className="subtle">{comic.subject} · Episode {ei+1}</div><h2>{episode.title}</h2>
        <div className="panel-art">{panel.imageUrl ? <img src={panel.imageUrl} alt={panel.title} style={{width:"100%",height:"100%",objectFit:"contain",borderRadius:13}} /> : "🏞️ 👩‍🎓"}</div>
        <div className="panel-text"><div className="page-kicker">{panel.title}</div><p style={{marginTop:7}}>{panel.narration}</p><div className="dialogue">“{panel.dialogue}”</div></div>
        <div className="reader-nav"><button className="btn" disabled={ei===0&&pi===0} onClick={prev}>← Sebelumnya</button><span className="subtle">{pi+1} / {episode.panels.length}</span><button className="btn-primary" onClick={next}>Selanjutnya →</button></div>
      </section>
      <aside className="side-stack">
        <div className="card"><div className="label">Konsep Panel</div><Badge tone="blue">{conceptId}</Badge><h3 style={{margin:"9px 0 4px"}}>{conceptName}</h3>{mastery!=null&&<><div className="subtle">Mastery siswa: {Math.round(mastery*100)}%</div><div className="progress" style={{marginTop:7}}><span style={{width:`${mastery*100}%`}}/></div></>}</div>
        <div className="card"><div className="label">Episode</div>{comic.episodes.map((e,i)=><button key={e.id} className={`btn ${i===ei?"btn-primary":""}`} style={{width:"100%",marginBottom:6,textAlign:"left"}} onClick={()=>{setEi(i);setPi(0)}}>Episode {i+1} · {e.title}</button>)}</div>
        <div className="card" style={{background:"#f5f3ff",borderColor:"#ddd6fe"}}><div className="page-kicker" style={{color:"#7c3aed"}}>AI Tutor</div><strong>Tanyakan panel ini</strong><p className="subtle" style={{marginTop:4}}>AI akan menerima konteks comic, episode, panel, konsep, dan student model.</p><button className="btn-primary" onClick={()=>navigate("tutor",comic.id)}>Tanya AI →</button></div>
      </aside>
    </div>
  </div>;
}
