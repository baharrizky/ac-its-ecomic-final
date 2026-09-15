import React, { useState } from "react";
import ComicCard from "../../components/comic/ComicCard";

const EMPTY_FORM = { title:"", description:"", subject:"Eksponen", educationLevel:"SMA", grade:"X", className:"X IPA 1", status:"Draft", concepts:["E1"] };

export default function ComicManagement({ comics, navigate, onCreate, onEdit }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [levelFilter, setLevelFilter] = useState("Semua");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const visible = comics.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) &&
    (filter === "Semua" || c.status === filter) &&
    (levelFilter === "Semua" || (c.educationLevel || "SMA") === levelFilter)
  );

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onCreate(form);
    setOpen(false);
    setForm(EMPTY_FORM);
  }

  return (
    <div>
      <div className="page-kicker">Content Management</div>
      <h1 className="page-title">Kelola E-Comic</h1>
      <p className="page-desc">Guru dapat membuat, mengubah, mengunggah panel, dan menerbitkan konten sesuai jenjang SMP/SMA.</p>

      <div className="toolbar">
        <div className="toolbar-left" style={{flexWrap:"wrap"}}>
          <input className="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari E-Comic..." />
          <select value={levelFilter} onChange={e=>setLevelFilter(e.target.value)} style={{width:150}}>
            <option>Semua</option><option>SMP</option><option>SMA</option>
          </select>
          <select value={filter} onChange={e=>setFilter(e.target.value)} style={{width:150}}>
            <option>Semua</option><option>Published</option><option>Draft</option>
          </select>
        </div>
        <button className="btn-primary" onClick={()=>setOpen(true)}>+ Buat E-Comic</button>
      </div>

      <div className="card-grid">
        {visible.map(comic => <ComicCard key={comic.id} comic={comic} teacher onOpen={(id)=>navigate("comic-reader",id)} onEdit={onEdit} />)}
        {visible.length === 0 && <div className="card empty" style={{gridColumn:"1/-1"}}>Belum ada E-Comic yang sesuai filter.</div>}
      </div>

      {open && (
        <div className="modal-wrap">
          <form className="modal" onSubmit={submit}>
            <div className="modal-head"><div><div className="page-kicker">New Content</div><h2>Buat E-Comic</h2></div><button type="button" className="close" onClick={()=>setOpen(false)}>×</button></div>
            <div className="field"><label className="label">Judul</label><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Contoh: Eksponen dalam Kehidupan" /></div>
            <div className="field"><label className="label">Deskripsi</label><textarea rows="3" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div className="field"><label className="label">Jenjang</label><select value={form.educationLevel} onChange={e=>setForm({...form,educationLevel:e.target.value,grade:e.target.value==="SMP"?"7":"X",className:e.target.value==="SMP"?"VII":"X IPA 1"})}><option>SMP</option><option>SMA</option></select></div>
              <div className="field"><label className="label">Kelas</label><select value={form.grade} onChange={e=>setForm({...form,grade:e.target.value})}>{(form.educationLevel==="SMP"?["7","8","9"]:["X","XI","XII"]).map(g=><option key={g}>{g}</option>)}</select></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div className="field"><label className="label">Materi</label><input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></div>
              <div className="field"><label className="label">Kelas/Rombel</label><input value={form.className} onChange={e=>setForm({...form,className:e.target.value})}/></div>
            </div>
            <div className="field"><label className="label">Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Draft</option><option>Published</option></select></div>
            <div className="field"><label className="label">Konsep</label><div className="concept-picker">{["E1","E2","E3","E10","L1","L2"].map(id=><button type="button" className={`concept-chip ${form.concepts.includes(id)?"selected":""}`} key={id} onClick={()=>setForm({...form,concepts:form.concepts.includes(id)?form.concepts.filter(x=>x!==id):[...form.concepts,id]})}>{id}</button>)}</div></div>
            <div className="actions"><button type="button" className="btn" onClick={()=>setOpen(false)}>Batal</button><button className="btn-primary">Buat & Buka Editor</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
