import React, { useMemo, useState } from "react";
import ComicCard from "../../components/comic/ComicCard";
import ConceptPicker from "../../components/common/ConceptPicker";

const EMPTY_FORM = { title:"", description:"", subject:"", educationLevel:"SMA", grade:"X", school:"", status:"Draft", concepts:[] };

export default function ComicManagement({ comics=[], teacherClasses=[], session, navigate, onCreate, onEdit }) {
  const [search,setSearch]=useState(""); const [statusFilter,setStatusFilter]=useState("Semua"); const [levelFilter,setLevelFilter]=useState("Semua"); const [gradeFilter,setGradeFilter]=useState(""); const [open,setOpen]=useState(false); const [form,setForm]=useState(EMPTY_FORM);
  const schools=[...new Set(teacherClasses.map(c=>c.school).filter(Boolean))];
  const grades=[...new Set(teacherClasses.filter(c=>!levelFilter||levelFilter==="Semua"||c.educationLevel===levelFilter).map(c=>c.grade).filter(Boolean))];
  const visible=comics.filter(c=>String(c.title||"").toLowerCase().includes(search.toLowerCase()) && (statusFilter==="Semua"||c.status===statusFilter) && (levelFilter==="Semua"||(c.educationLevel||"SMA")===levelFilter) && (!gradeFilter||String(c.grade)===String(gradeFilter)) && (!c.school||!session?.school||c.school===session.school));
  function openCreate(){
    const first=teacherClasses[0];
    setForm({...EMPTY_FORM,educationLevel:first?.educationLevel||session?.educationLevel||"SMA",grade:first?.grade||session?.grade||"X",school:first?.school||session?.school||""});
    setOpen(true);
  }
  function chooseLevel(level){const first=teacherClasses.find(c=>c.educationLevel===level);setForm(f=>({...f,educationLevel:level,grade:first?.grade||(level==="SMP"?"VII":"X"),school:first?.school||session?.school||""}));}
  function submit(e){e.preventDefault();if(!form.title.trim()||!form.grade)return;onCreate({...form});setOpen(false);}
  return <div>
    <div className="page-kicker">Content Management</div><h1 className="page-title">Kelola E-Comic</h1><p className="page-desc">Satu E-Comic digunakan bersama oleh rombel pada sekolah, jenjang, dan kelas yang sama. Rombel menjadi konteks akses serta tracking siswa.</p>
    <div className="toolbar"><div className="toolbar-left" style={{flexWrap:"wrap"}}><input className="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari E-Comic..."/><select value={levelFilter} onChange={e=>{setLevelFilter(e.target.value);setGradeFilter("")}} style={{width:140}}><option>Semua</option><option>SMP</option><option>SMA</option></select><select value={gradeFilter} onChange={e=>setGradeFilter(e.target.value)} style={{width:150}}><option value="">Semua kelas</option>{grades.map(g=><option key={g}>{g}</option>)}</select><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{width:140}}><option>Semua</option><option>Published</option><option>Draft</option></select></div><button className="btn-primary" onClick={openCreate} disabled={!teacherClasses.length}>+ Buat E-Comic</button></div>
    {!teacherClasses.length&&<div className="card empty-state" style={{marginBottom:16}}><strong>Belum ada kelas.</strong><span>Buat kelas terlebih dahulu di Kelas Saya.</span></div>}
    <div className="card-grid">{visible.map(comic=><ComicCard key={comic.id} comic={comic} teacher onOpen={id=>navigate("comic-preview",id)} onEdit={onEdit}/>)}{visible.length===0&&<div className="card empty" style={{gridColumn:"1/-1"}}>Belum ada E-Comic yang sesuai filter.</div>}</div>
    {open&&<div className="modal-wrap"><form className="modal" onSubmit={submit}><div className="modal-head"><div><div className="page-kicker">New Content</div><h2>Buat E-Comic</h2></div><button type="button" className="close" onClick={()=>setOpen(false)}>×</button></div>
      <div className="field"><label className="label">Judul</label><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div><div className="field"><label className="label">Deskripsi</label><textarea rows="3" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
      <div className="register-grid"><div className="field"><label className="label">Jenjang</label><select value={form.educationLevel} onChange={e=>chooseLevel(e.target.value)}><option>SMP</option><option>SMA</option></select></div><div className="field"><label className="label">Sekolah</label><input value={form.school||session?.school||""} readOnly /></div></div>
      <div className="register-grid"><div className="field"><label className="label">Kelas</label><select value={form.grade} onChange={e=>setForm(f=>({...f,grade:e.target.value}))}>{(form.educationLevel==="SMP"?["VII","VIII","IX"]:["X","XI","XII"]).map(g=><option key={g}>{g}</option>)}</select></div><div className="field"><label className="label">Cakupan</label><div className="card" style={{padding:10,background:"#f7f5fb"}}>Semua rombel {form.grade} yang dikelola guru.</div></div></div>
      <div className="field"><label className="label">Materi</label><input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></div><div className="field"><label className="label">Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Draft</option><option>Published</option></select></div><ConceptPicker value={form.concepts} onChange={concepts=>setForm({...form,concepts})} label="Konsep E-Comic"/>
      <div className="actions"><button type="button" className="btn" onClick={()=>setOpen(false)}>Batal</button><button className="btn-primary">Buat & Buka Editor</button></div>
    </form></div>}
  </div>;
}
