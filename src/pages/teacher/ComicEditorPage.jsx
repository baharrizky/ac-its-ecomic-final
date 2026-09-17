import React, { useRef, useState } from "react";
import Badge from "../../components/common/Badge";
import MediaImage from "../../components/media/MediaImage";
import { concepts } from "../../data/demoData";
import { saveLocalMedia } from "../../services/mediaService";
import EquationEditor from "../../components/common/EquationEditor";

export default function ComicEditorPage({ comic, onBack, onSave }) {
  const [draft, setDraft] = useState(() => comic ? JSON.parse(JSON.stringify(comic)) : null);
  const [episodeIndex, setEpisodeIndex] = useState(0);
  const [uploading, setUploading] = useState("");
  const [message, setMessage] = useState("");
  const coverInputRef = useRef(null);

  if (!draft) return <div className="empty">E-Comic tidak ditemukan.</div>;

  function patchEpisode(index, patch) {
    setDraft(d => ({...d, episodes:d.episodes.map((ep,i)=>i===index?{...ep,...patch}:ep)}));
  }

  function addEpisode() {
    const next = { id:`ep-${Date.now()}`, title:`Episode ${draft.episodes.length+1}`, description:"", order:draft.episodes.length+1, concepts:[], panels:[] };
    setDraft(d=>({...d,episodes:[...d.episodes,next]}));
    setEpisodeIndex(draft.episodes.length);
  }

  function addPanel() {
    const ep = draft.episodes[episodeIndex];
    if (!ep) return;
    const panel = { id:`panel-${Date.now()}`, order:ep.panels.length+1, title:`Panel ${ep.panels.length+1}`, narration:"", dialogue:"", equation:"", conceptIds:[], characters:[], imageUrl:"" };
    patchEpisode(episodeIndex,{panels:[...ep.panels,panel]});
  }

  function patchPanel(pi, patch) {
    const ep = draft.episodes[episodeIndex];
    patchEpisode(episodeIndex,{panels:ep.panels.map((p,i)=>i===pi?{...p,...patch}:p)});
  }

  async function handleCoverUpload(file) {
    if (!file) return;
    setUploading("cover"); setMessage("");
    try {
      const ref = await saveLocalMedia(file, { kind:"cover", comicId:draft.id });
      setDraft(d=>({...d,coverUrl:ref}));
      setMessage("Cover berhasil diunggah.");
    } catch (err) { setMessage(err.message || "Gagal mengunggah cover."); }
    finally { setUploading(""); if (coverInputRef.current) coverInputRef.current.value=""; }
  }

  async function handlePanelUpload(pi, file) {
    if (!file) return;
    const ep = draft.episodes[episodeIndex];
    const panel = ep?.panels?.[pi];
    if (!panel) return;
    setUploading(panel.id); setMessage("");
    try {
      const ref = await saveLocalMedia(file, { kind:"panel", comicId:draft.id, episodeId:ep.id, panelId:panel.id });
      patchPanel(pi,{imageUrl:ref});
      setMessage(`Gambar ${panel.title} berhasil diunggah.`);
    } catch (err) { setMessage(err.message || "Gagal mengunggah gambar panel."); }
    finally { setUploading(""); }
  }

  async function save() {
    try {
      const ok = await onSave(draft);
      setMessage(ok === false ? "Perubahan disimpan di perangkat, tetapi sinkronisasi Firebase belum berhasil." : "Perubahan E-Comic tersimpan dan disinkronkan.");
    } catch (err) {
      setMessage(err?.message || "Gagal menyimpan perubahan E-Comic.");
    }
  }

  return (
    <div>
      <div className="toolbar">
        <div><button className="btn" onClick={onBack}>← Kembali</button></div>
        <div className="toolbar-right"><Badge tone={draft.status==="Published"?"green":"amber"}>{draft.status}</Badge><button className="btn-primary" onClick={save}>Simpan Perubahan</button></div>
      </div>
      <div className="page-kicker">Comic Editor</div>
      <h1 className="page-title">{draft.title}</h1>
      <p className="page-desc">Editor konten guru. Gambar dikompresi dan disimpan melalui media service; Firebase Storage dapat diaktifkan kemudian tanpa mengubah struktur konten.</p>

      {message && <div className={`upload-note ${message.includes("berhasil")||message.includes("tersimpan")?"success":"error"}`}>{message}</div>}

      <div className="editor-grid" style={{marginTop:18}}>
        <div>
          <div className="card">
            <div className="field"><label className="label">Judul E-Comic</label><input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></div>
            <div className="field"><label className="label">Deskripsi</label><textarea rows="3" value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div className="field"><label className="label">Jenjang</label><select value={draft.educationLevel||"SMA"} onChange={e=>setDraft({...draft,educationLevel:e.target.value})}><option>SMP</option><option>SMA</option></select></div>
              <div className="field"><label className="label">Kelas</label><select value={draft.grade} onChange={e=>setDraft({...draft,grade:e.target.value})}>{(draft.educationLevel==="SMP"?["VII","VIII","IX"]:["X","XI","XII"]).map(g=><option key={g}>{g}</option>)}</select></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div className="field"><label className="label">Materi</label><input value={draft.subject} onChange={e=>setDraft({...draft,subject:e.target.value})}/></div>
              <div className="field"><label className="label">Status</label><select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}><option>Draft</option><option>Published</option></select></div>
            </div>
            <div className="field"><label className="label">Cover E-Comic</label><div className="cover-upload-row">
              <div className="cover-upload-preview">{draft.coverUrl ? <MediaImage src={draft.coverUrl} alt="Cover" style={{width:"100%",height:"100%",objectFit:"cover"}} fallback={<span>📖</span>} /> : <span>📖</span>}</div>
              <div><input ref={coverInputRef} type="file" accept="image/*" onChange={e=>handleCoverUpload(e.target.files?.[0])} /><div className="subtle" style={{marginTop:5}}>PNG/JPG/WebP · maksimal 8 MB</div>{uploading==="cover"&&<div className="subtle">Mengunggah...</div>}</div>
            </div></div>
          </div>

          <h2 className="section-title">Episode & Panel</h2>
          <div className="toolbar"><div className="toolbar-left"><select value={episodeIndex} onChange={e=>setEpisodeIndex(Number(e.target.value))}>{draft.episodes.map((e,i)=><option key={e.id} value={i}>Episode {i+1} · {e.title}</option>)}</select></div><button className="btn-primary" onClick={addEpisode}>+ Episode</button></div>

          {draft.episodes.length === 0 ? <div className="card empty">Belum ada episode. Klik <b>+ Episode</b> untuk mulai.</div> : (
            <div className="episode-editor">
              {(() => {
                const ep=draft.episodes[episodeIndex];
                return <>
                  <div className="field"><label className="label">Judul Episode</label><input value={ep.title} onChange={e=>patchEpisode(episodeIndex,{title:e.target.value})}/></div>
                  <div className="field"><label className="label">Deskripsi</label><textarea value={ep.description} onChange={e=>patchEpisode(episodeIndex,{description:e.target.value})}/></div>
                  <div className="toolbar"><strong>{ep.panels.length} panel</strong><button className="btn" onClick={addPanel}>+ Tambah Panel</button></div>
                  {ep.panels.map((p,pi)=><div className="panel-editor" key={p.id}>
                    <div className="panel-row">
                      <div className="panel-thumb panel-upload-thumb">{p.imageUrl ? <MediaImage src={p.imageUrl} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover"}} fallback={<span>🖼️</span>} /> : <span>🖼️</span>}</div>
                      <div style={{minWidth:0}}>
                        <div className="field"><label className="label">Gambar Panel</label><input type="file" accept="image/*" onChange={e=>handlePanelUpload(pi,e.target.files?.[0])}/>{uploading===p.id&&<div className="subtle">Mengunggah...</div>}</div>
                        <div className="field"><label className="label">Judul Panel</label><input value={p.title} onChange={e=>patchPanel(pi,{title:e.target.value})}/></div>
                        <div className="field"><label className="label">Narasi</label><textarea rows="2" value={p.narration} onChange={e=>patchPanel(pi,{narration:e.target.value})}/></div>
                        <div className="field"><label className="label">Dialog</label><textarea rows="2" value={p.dialogue} onChange={e=>patchPanel(pi,{dialogue:e.target.value})}/></div>
                        <div className="field"><label className="label">Tokoh pada panel (pisahkan dengan koma)</label><input value={(p.characters||[]).join(", ")} onChange={e=>patchPanel(pi,{characters:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})} placeholder="Sari, Riko, Nenek Sari"/></div>
                        <EquationEditor value={p.equation||""} onChange={value=>patchPanel(pi,{equation:value})} label="Persamaan panel (opsional)" />
                        <div className="field"><label className="label">Konsep terkait</label><div className="concept-picker">{Object.values(concepts).map(c=><button type="button" key={c.id} className={`concept-chip ${p.conceptIds.includes(c.id)?"selected":""}`} onClick={()=>patchPanel(pi,{conceptIds:p.conceptIds.includes(c.id)?p.conceptIds.filter(x=>x!==c.id):[...p.conceptIds,c.id]})}>{c.id} · {c.name}</button>)}</div></div>
                      </div>
                    </div>
                  </div>)}
                </>;
              })()}
            </div>
          )}
        </div>

        <aside className="side-stack">
          <div className="card">
            <div className="label">Content Pipeline</div>
            <div className="list">
              {["Metadata","Episode","Panel","Concept Mapping","Preview","Publish"].map((x,i)=><div className="list-item" key={x}><span><strong>{i+1}. {x}</strong></span><Badge tone={i<4?"green":"slate"}>{i<4?"Siap":"Berikutnya"}</Badge></div>)}
            </div>
          </div>
          <div className="card"><div className="label">Adaptive Learning</div><p className="subtle">Jenjang dan kelas menjadi metadata akses. Siswa hanya akan menerima E-Comic yang sesuai profilnya setelah filter akses diaktifkan.</p></div>
          <div className="card"><div className="label">AI Context</div><p className="subtle">Setiap panel yang memiliki conceptIds dapat menjadi konteks AI Tutor dan titik pengukuran pembelajaran.</p></div>
        </aside>
      </div>
    </div>
  );
}
