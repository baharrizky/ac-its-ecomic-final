import React, { useRef, useState } from "react";
import Badge from "../../components/common/Badge";
import { concepts } from "../../data/demoData";
import { uploadComicImage, removeComicImage } from "../../services/uploadService";

function UploadButton({ label, onChange, disabled, accept = "image/*" }) {
  const inputRef = useRef(null);
  return (
    <>
      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }} onChange={onChange} />
      <button type="button" className="btn" disabled={disabled} onClick={() => inputRef.current?.click()}>
        {disabled ? "Mengunggah..." : label}
      </button>
    </>
  );
}

export default function ComicEditorPage({ comic, onBack, onSave }) {
  const [draft, setDraft] = useState(() => comic ? JSON.parse(JSON.stringify(comic)) : null);
  const [episodeIndex, setEpisodeIndex] = useState(0);
  const [uploading, setUploading] = useState("");
  const [uploadError, setUploadError] = useState("");

  if (!draft) return <div className="empty">E-Comic tidak ditemukan.</div>;

  function patchEpisode(index, patch) {
    setDraft(d => ({ ...d, episodes: d.episodes.map((ep, i) => i === index ? { ...ep, ...patch } : ep) }));
  }

  function addEpisode() {
    const next = { id:`ep-${Date.now()}`, title:`Episode ${draft.episodes.length+1}`, description:"", order:draft.episodes.length+1, concepts:[], panels:[] };
    setDraft(d=>({...d,episodes:[...d.episodes,next]}));
    setEpisodeIndex(draft.episodes.length);
  }

  function addPanel() {
    const ep = draft.episodes[episodeIndex];
    if (!ep) return;
    const panel = { id:`panel-${Date.now()}`, order:ep.panels.length+1, title:`Panel ${ep.panels.length+1}`, narration:"", dialogue:"", conceptIds:[], imageUrl:"", imagePath:null };
    patchEpisode(episodeIndex,{panels:[...ep.panels,panel]});
  }

  function patchPanel(pi, patch) {
    const ep = draft.episodes[episodeIndex];
    patchEpisode(episodeIndex,{panels:ep.panels.map((p,i)=>i===pi?{...p,...patch}:p)});
  }

  async function handleCover(file) {
    setUploadError("");
    if (!file) return;
    setUploading("cover");
    try {
      const result = await uploadComicImage(file, { comicId:draft.id, episodeId:"cover", panelId:"cover" });
      setDraft(d=>({...d,coverUrl:result.url,coverPath:result.path}));
    } catch (e) {
      setUploadError(e.message || "Upload cover gagal.");
    } finally { setUploading(""); }
  }

  async function handlePanelImage(pi, file) {
    setUploadError("");
    if (!file) return;
    const panel = draft.episodes[episodeIndex]?.panels[pi];
    if (!panel) return;
    setUploading(`panel-${panel.id}`);
    try {
      const result = await uploadComicImage(file, { comicId:draft.id, episodeId:draft.episodes[episodeIndex].id, panelId:panel.id });
      setDraft(d=>({...d,episodes:d.episodes.map((ep,ei)=>ei===episodeIndex?{...ep,panels:ep.panels.map((p,i)=>i===pi?{...p,imageUrl:result.url,imagePath:result.path}:p)}:ep)}));
    } catch (e) {
      setUploadError(e.message || "Upload gambar panel gagal.");
    } finally { setUploading(""); }
  }

  async function clearImage(pi) {
    const panel = draft.episodes[episodeIndex]?.panels[pi];
    if (!panel?.imageUrl) return;
    try { await removeComicImage(panel.imagePath); } catch {}
    patchPanel(pi,{imageUrl:"",imagePath:null});
  }

  async function clearCover() {
    if (!draft.coverUrl) return;
    try { await removeComicImage(draft.coverPath); } catch {}
    setDraft(d=>({...d,coverUrl:"",coverPath:null}));
  }

  function save() { onSave(draft); alert("Perubahan E-Comic tersimpan."); }

  return (
    <div>
      <div className="toolbar">
        <div><button className="btn" onClick={onBack}>← Kembali</button></div>
        <div className="toolbar-right"><Badge tone={draft.status==="Published"?"green":"amber"}>{draft.status}</Badge><button className="btn-primary" onClick={save}>Simpan Perubahan</button></div>
      </div>
      <div className="page-kicker">Comic Editor</div>
      <h1 className="page-title">{draft.title}</h1>
      <p className="page-desc">Editor konten guru. Struktur panel, gambar, dan mapping konsep disimpan sebagai data.</p>

      {uploadError && <div className="upload-error">{uploadError}</div>}

      <div className="editor-grid" style={{marginTop:18}}>
        <div>
          <div className="card">
            <div className="field"><label className="label">Judul E-Comic</label><input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></div>
            <div className="field"><label className="label">Deskripsi</label><textarea rows="3" value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div className="field"><label className="label">Materi</label><input value={draft.subject} onChange={e=>setDraft({...draft,subject:e.target.value})}/></div>
              <div className="field"><label className="label">Status</label><select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}><option>Draft</option><option>Published</option></select></div>
            </div>

            <div className="field">
              <label className="label">Cover E-Comic</label>
              <div className="cover-upload">
                <div className="cover-preview">
                  {draft.coverUrl ? <img src={draft.coverUrl} alt="Cover E-Comic" /> : <div className="cover-placeholder">📖</div>}
                </div>
                <div className="upload-actions">
                  <UploadButton label={uploading==="cover"?"Mengunggah...":"📤 Upload Cover"} disabled={uploading!==""} onChange={e=>handleCover(e.target.files?.[0])}/>
                  {draft.coverUrl && <button type="button" className="btn" onClick={clearCover}>Hapus</button>}
                  <span className="subtle">JPG, PNG, WEBP · maks. 10 MB</span>
                </div>
              </div>
            </div>
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
                      <div>
                        <div className="panel-thumb panel-thumb-image">
                          {p.imageUrl ? <img src={p.imageUrl} alt={`Panel ${pi+1}`} /> : <span>🖼️</span>}
                        </div>
                        <div className="panel-upload-actions">
                          <UploadButton label="📤 Upload" disabled={uploading!==""} onChange={e=>handlePanelImage(pi,e.target.files?.[0])}/>
                          {p.imageUrl && <button type="button" className="btn btn-small" onClick={()=>clearImage(pi)}>Hapus</button>}
                        </div>
                      </div>
                      <div>
                        <div className="field"><label className="label">Judul Panel</label><input value={p.title} onChange={e=>patchPanel(pi,{title:e.target.value})}/></div>
                        <div className="field"><label className="label">Narasi</label><textarea rows="2" value={p.narration} onChange={e=>patchPanel(pi,{narration:e.target.value})}/></div>
                        <div className="field"><label className="label">Dialog</label><textarea rows="2" value={p.dialogue} onChange={e=>patchPanel(pi,{dialogue:e.target.value})}/></div>
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
              {["Metadata","Cover","Episode","Panel + Gambar","Concept Mapping","Preview","Publish"].map((x,i)=><div className="list-item" key={x}><span><strong>{i+1}. {x}</strong></span><Badge tone={i<4?"green":"slate"}>{i<4?"Siap":"Berikutnya"}</Badge></div>)}
            </div>
          </div>
          <div className="card">
            <div className="label">Penyimpanan Gambar</div>
            <p className="subtle">{draft.coverUrl || draft.episodes.some(e=>e.panels.some(p=>p.imageUrl)) ? "Gambar sudah tersedia pada draft." : "Belum ada gambar."}</p>
            <p className="subtle" style={{marginTop:8}}>Jika Firebase Storage aktif, file disimpan permanen di Firebase. Tanpa Firebase, mode demo menyimpan gambar terkompresi di browser.</p>
          </div>
          <div className="card">
            <div className="label">AI Context</div>
            <p className="subtle">Setiap panel yang memiliki gambar, narration, dialogue, dan conceptIds dapat menjadi konteks AI Tutor.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
