import React, { useMemo, useState } from "react";
import EquationEditor from "../../components/common/EquationEditor";
import katex from "katex";
import "katex/dist/katex.min.css";
import { listConcepts } from "../../services/conceptService";
import ConceptPicker from "../../components/common/ConceptPicker";

const emptyQuestion = { id:"", question:"", equation:"", options:["","","",""], answer:0, explanation:"", conceptId:"", level:1, educationLevel:"SMA", grade:"X", school:"", status:"Published", comicId:"", episodeId:"", panelId:"", hints:["","",""] };

export default function QuestionBankPage({ questions=[], comics=[], teacherClasses=[], session, onSave, onDelete }) {
  const [editing,setEditing]=useState(null);
  const [misconceptionInput,setMisconceptionInput]=useState("");
  const [concepts,setConcepts]=useState([]);
  React.useEffect(()=>{let alive=true;listConcepts().then(items=>alive&&setConcepts(items));return()=>{alive=false}},[]);
  const conceptMap=useMemo(()=>Object.fromEntries(concepts.map(c=>[c.id,c])),[concepts]);
  const [filter,setFilter]=useState("Semua");
  const visible=useMemo(()=>questions.filter(q=>filter==="Semua"||q.educationLevel===filter),[questions,filter]);
  const teacherComics=useMemo(()=>comics.filter(c=>c.ownerTeacherUid===session?.uid||c.createdBy===session?.uid||c.school===session?.school),[comics,session?.uid,session?.school]);
  function openNew(){const c=teacherClasses.find(x=>x.school===session?.school)||teacherClasses[0];setMisconceptionInput("");setEditing({...emptyQuestion,id:`q-${Date.now()}`,school:c?.school||session?.school||"",educationLevel:c?.educationLevel||"SMA",grade:c?.grade||"X"});}
  function save(){
    if(!editing.question.trim() || editing.options.some(o=>!o.trim()) || !editing.conceptId || !editing.comicId || !editing.panelId) return;
    onSave({...editing,question:editing.question.trim(),options:editing.options.map(o=>o.trim()),difficulty:Number(editing.level||1),misconceptionTags:editing.misconceptionTags||["UNCLASSIFIED"],assignedClassIds:[]});
    setEditing(null);
  }
  const selectedComic=teacherComics.find(c=>c.id===editing?.comicId);
  const panels=selectedComic?.episodes?.flatMap((ep,ei)=>(ep.panels||[]).map((p,pi)=>({episodeId:ep.id,panelId:p.id,label:`Episode ${ei+1} · Panel ${pi+1} · ${p.title||"Panel"}`,conceptIds:p.conceptIds||[]})))||[];
  return <div>
    <div className="page-kicker">Content Management</div><h1 className="page-title">Bank Soal</h1><p className="page-desc">Soal terhubung ke E-Comic dan dibagikan ke seluruh rombel pada sekolah, jenjang, dan kelas yang sama.</p>
    <div className="toolbar"><select value={filter} onChange={e=>setFilter(e.target.value)} style={{width:160}}><option>Semua</option><option>SMP</option><option>SMA</option></select><span className="subtle">Rombel mengikuti cakupan kelas dari Guru.</span><button className="btn-primary" onClick={openNew}>+ Tambah Soal</button></div>
    <div className="card-grid">{visible.map((q,i)=><div className="card" key={q.id}><div style={{display:"flex",justifyContent:"space-between",gap:10}}><span className="badge badge-blue">{q.educationLevel} · {q.grade}</span><span className="badge badge-amber">Level {q.level}</span></div><h3 style={{marginTop:12}}>Soal {i+1}</h3><p>{q.question}</p>{q.equation&&<div className="equation-preview" dangerouslySetInnerHTML={{__html:renderEquation(q.equation)}}/>}<div className="subtle" style={{marginTop:8}}>{q.comicId?`E-Comic: ${teacherComics.find(c=>c.id===q.comicId)?.title||q.comicId}`:"Belum dipetakan ke E-Comic"} · {q.conceptId||"Belum dipetakan"} · {conceptMap[q.conceptId]?.name||q.conceptId||"-"}</div><div className="actions"><button className="btn" onClick={()=>{setMisconceptionInput((q.misconceptionTags||[]).join(", "));setEditing({...q,hints:Array.isArray(q.hints)?q.hints:["","",""]})}}>Edit</button><button className="btn" onClick={()=>onDelete(q.id)}>Hapus</button></div></div>)}{visible.length===0&&<div className="card empty" style={{gridColumn:"1/-1"}}>Belum ada soal. Tambahkan soal pertama.</div>}</div>
    {editing&&<div className="modal-wrap"><div className="modal" style={{maxWidth:820}}><div className="modal-head"><div><div className="page-kicker">Question Authoring</div><h2>{editing.id?.startsWith("q-")?"Tambah Soal":"Edit Soal"}</h2></div><button className="close" onClick={()=>{setEditing(null);setMisconceptionInput("");}}>×</button></div>
      <div className="register-grid"><div className="field"><label className="label">Jenjang</label><select value={editing.educationLevel} onChange={e=>setEditing({...editing,educationLevel:e.target.value,grade:e.target.value==="SMP"?"VII":"X",comicId:"",episodeId:"",panelId:""})}><option>SMP</option><option>SMA</option></select></div><div className="field"><label className="label">Kelas</label><select value={editing.grade} onChange={e=>setEditing({...editing,grade:e.target.value})}>{(editing.educationLevel==="SMP"?["VII","VIII","IX"]:["X","XI","XII"]).map(g=><option key={g}>{g}</option>)}</select></div></div>
      <div className="register-grid"><div className="field"><label className="label">Sekolah</label><input value={editing.school||session?.school||""} readOnly /></div><div className="field"><label className="label">Cakupan</label><div className="card" style={{padding:10,background:"#f7f5fb"}}>Semua rombel {editing.grade} di sekolah ini.</div></div></div>
      <div className="field"><label className="label">E-Comic sumber</label><select value={editing.comicId||""} onChange={e=>setEditing({...editing,comicId:e.target.value,episodeId:"",panelId:""})}><option value="">Pilih E-Comic</option>{teacherComics.filter(c=>(c.educationLevel||"SMA")===editing.educationLevel&&String(c.grade)===String(editing.grade)).map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
      <div className="field"><label className="label">Panel sumber</label><select value={editing.panelId||""} onChange={e=>{const p=panels.find(x=>x.panelId===e.target.value);setEditing({...editing,panelId:p?.panelId||"",episodeId:p?.episodeId||"",conceptId:p?.conceptIds?.[0]||editing.conceptId||""})}} disabled={!editing.comicId}><option value="">Pilih panel yang menjadi dasar soal</option>{panels.map(p=><option key={p.panelId} value={p.panelId}>{p.label}</option>)}</select></div>
      <div className="field"><label className="label">Pertanyaan</label><textarea rows="3" value={editing.question} onChange={e=>setEditing({...editing,question:e.target.value})} placeholder="Soal harus dapat dijawab berdasarkan konsep/panel E-Comic."/></div>
      <EquationEditor value={editing.equation} onChange={v=>setEditing({...editing,equation:v})} label="Persamaan soal (opsional)"/>
      <div className="field"><label className="label">Pilihan jawaban</label>{editing.options.map((o,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:8}}><button type="button" className={`equation-chip ${editing.answer===i?"selected":""}`} onClick={()=>setEditing({...editing,answer:i})}>{String.fromCharCode(65+i)}</button><input value={o} onChange={e=>setEditing({...editing,options:editing.options.map((x,j)=>j===i?e.target.value:x)})} placeholder={`Pilihan ${String.fromCharCode(65+i)}`}/></div>)}</div>
      <div className="register-grid"><div><ConceptPicker value={editing.conceptId?[editing.conceptId]:[]} onChange={ids=>setEditing({...editing,conceptId:ids[0]||""})} label="Konsep" required /></div><div className="field"><label className="label">Level kesulitan</label><select value={editing.level} onChange={e=>setEditing({...editing,level:Number(e.target.value)})}><option value={1}>Level 1 · Dasar</option><option value={2}>Level 2 · Menengah</option><option value={3}>Level 3 · Lanjutan</option></select></div></div>
      <div className="field"><label className="label">Hint 1</label><textarea rows="2" value={editing.hints?.[0]||""} onChange={e=>setEditing({...editing,hints:[e.target.value,editing.hints?.[1]||"",editing.hints?.[2]||""]})} placeholder="Arahkan siswa ke langkah pertama tanpa memberi jawaban."/></div>
      <div className="field"><label className="label">Hint 2</label><textarea rows="2" value={editing.hints?.[1]||""} onChange={e=>setEditing({...editing,hints:[editing.hints?.[0]||"",e.target.value,editing.hints?.[2]||""]})}/></div>
      <div className="field"><label className="label">Hint 3</label><textarea rows="2" value={editing.hints?.[2]||""} onChange={e=>setEditing({...editing,hints:[editing.hints?.[0]||"",editing.hints?.[1]||"",e.target.value]})}/></div>
      <div className="register-grid"><div className="field"><label className="label">Status</label><select value={editing.status||"Published"} onChange={e=>setEditing({...editing,status:e.target.value})}><option>Draft</option><option>Published</option></select></div><div className="field"><label className="label">Tag miskonsepsi</label><input
  value={misconceptionInput}
  onChange={e=>{
    const raw=e.target.value;
    setMisconceptionInput(raw);
    setEditing({...editing,misconceptionTags:raw.split(",").map(x=>x.trim()).filter(Boolean)});
  }}
  placeholder="basis salah, operasi pangkat, konsep perkalian"
/></div></div><div className="field"><label className="label">Pembahasan</label><textarea rows="3" value={editing.explanation} onChange={e=>setEditing({...editing,explanation:e.target.value})}/></div>
      <div className="actions"><button className="btn" onClick={()=>{setEditing(null);setMisconceptionInput("");}}>Batal</button><button className="btn-primary" onClick={save}>Simpan Soal</button></div>
    </div></div>}
  </div>;
}
function renderEquation(value){try{return katex.renderToString(value,{displayMode:true,throwOnError:false})}catch{return value}}
