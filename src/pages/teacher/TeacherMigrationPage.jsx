import React,{useState} from "react";
import { ArrowDownToLine, Database, FileJson, RefreshCw, ShieldCheck } from "lucide-react";
import { migrateLegacyData, migrateLegacyJson, previewLegacyData } from "../../services/legacyMigrationService";

const defaults={users:"users",studentModels:"studentModels",attempts:"attempts",learningEvents:"learningEvents"};
function Count({label,data}){return <div className="ac-stat"><div className="stat-icon blue"><Database size={18}/></div><div><span>{label}</span><strong>{data?.ok?data.total:0}</strong></div></div>}
export default function TeacherMigrationPage({session}){
 const [cfg,setCfg]=useState(defaults);const [preview,setPreview]=useState(null);const [result,setResult]=useState(null);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 async function previewNow(){setBusy(true);setMessage("");setResult(null);const p=await previewLegacyData(cfg);setPreview(p);setBusy(false);}
 async function migrate(){setBusy(true);setMessage("");const r=await migrateLegacyData(cfg,{overwriteProfiles:false});setResult(r);setMessage(r.ok?"Migrasi selesai. Data asal tidak dihapus; snapshot migrasi disimpan.":r.message||"Migrasi gagal.");setBusy(false);}
 async function importJson(file){
  if(!file)return; setBusy(true);setMessage("");
  try{
   const text=await file.text();const json=JSON.parse(text);const {users=[],studentModels=[],attempts=[],learningEvents=[]}=json;
   // JSON import is intentionally preview-only in this client UAT to avoid accidental writes from arbitrary files.
   setPreview({users:{ok:true,total:users.length,rows:users.slice(0,10)},models:{ok:true,total:studentModels.length,rows:studentModels.slice(0,10)},attempts:{ok:true,total:attempts.length,rows:attempts.slice(0,10)},events:{ok:true,total:learningEvents.length,rows:learningEvents.slice(0,10)},jsonImport:true,json});
   setMessage("JSON berhasil dibaca. Setelah preview, kamu bisa import JSON ke Firestore dengan mapping berdasarkan UID atau email.");
  }catch(e){setMessage(`JSON tidak valid: ${e.message}`)}
  setBusy(false);
 }
 const inputs=[[
   "users","Data akun siswa ITS","users"],["studentModels","Student Model ITS","studentModels"],["attempts","Riwayat soal / latihan ITS","attempts"],["learningEvents","Riwayat aktivitas ITS","learningEvents"]];
 return <div>
  <div className="page-kicker">Data Integration</div><h1 className="page-title">Migrasi Data ITS</h1><p className="page-desc">Tarik/copy data dari collection ITS ke struktur E-Comic tanpa menghapus data asal. Gunakan snapshot untuk audit.</p>
  <div className="card" style={{marginBottom:16}}><div className="section-head"><div><h2>Sumber Data Firestore</h2><span>Masukkan nama collection ITS yang ingin dipakai sebagai sumber.</span></div><ShieldCheck size={18}/></div>{inputs.map(([key,label,def])=><div className="field" key={key}><label className="label">{label}</label><input value={cfg[key]} onChange={e=>setCfg({...cfg,[key]:e.target.value})}/><div className="subtle">Default: {def}. Jika collection ini sebenarnya milik E-Comic saat ini, sistem akan melewati copy untuk mencegah duplikasi.</div></div>)}<div className="actions"><button className="btn" onClick={previewNow} disabled={busy}><RefreshCw size={15}/> Preview</button><button className="btn-primary" onClick={migrate} disabled={busy}><ArrowDownToLine size={15}/> Import ke E-Comic</button><label className="btn" style={{cursor:"pointer"}}><FileJson size={15}/> Baca JSON<input type="file" accept="application/json" hidden onChange={e=>importJson(e.target.files?.[0])}/></label>{preview?.jsonImport&&<button className="btn-primary" onClick={async()=>{setBusy(true);const r=await migrateLegacyJson(preview.json,{overwriteProfiles:false});setResult(r);setMessage(r.ok?"JSON ITS berhasil diimport tanpa menghapus data asal.":r.message||"Import JSON gagal.");setBusy(false);}} disabled={busy}><ArrowDownToLine size={15}/> Import JSON ITS</button>}</div>{message&&<div className="success-note">{message}</div>}</div>
  {preview&&<><div className="stats-row"><Count label="Akun" data={preview.users}/><Count label="Student Model" data={preview.models}/><Count label="Attempts" data={preview.attempts}/><Count label="Learning Events" data={preview.events}/></div><div className="card" style={{marginTop:16}}><div className="section-head"><div><h2>Preview</h2><span>{preview.jsonImport?"JSON lokal":"Collection Firestore"}</span></div></div><p className="subtle">Maksimal 10 dokumen pertama ditampilkan di preview.</p>{Object.entries({users:preview.users,models:preview.models,attempts:preview.attempts,events:preview.events}).map(([key,data])=><div className="card" style={{marginTop:10}} key={key}><strong>{key}</strong><div className="subtle">Total {data?.total||0}</div><pre style={{whiteSpace:"pre-wrap",fontSize:12,marginTop:8}}>{JSON.stringify(data?.rows||[],null,2)}</pre></div>)}</div></>}
  {result?.counts&&<div className="card" style={{marginTop:16}}><h2>Hasil Migrasi</h2><div className="stats-row"><div><strong>{result.counts.users}</strong><div className="subtle">profil</div></div><div><strong>{result.counts.studentModels}</strong><div className="subtle">model</div></div><div><strong>{result.counts.attempts}</strong><div className="subtle">attempt</div></div><div><strong>{result.counts.learningEvents}</strong><div className="subtle">event</div></div></div></div>}
 </div>
}
