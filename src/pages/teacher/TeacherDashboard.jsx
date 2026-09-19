import React,{useMemo,useState} from "react";
import { BookOpen, BarChart3, Users, Plus, ArrowRight, Sparkles } from "lucide-react";

export default function TeacherDashboard({state,navigate,students=[],models=[],attempts=[],events=[],session,onSeedPack,onAIRecommend}){
 const [selectedUid,setSelectedUid]=useState("");
 const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);
 const scopedStudents=students.filter(s=>!session?.school||s.school===session.school);
 const byUid=useMemo(()=>new Map(models.map(m=>[m.uid,m])),[models]);
 const published=state.comics.filter(c=>c.status==="Published").length;
 const episodes=state.comics.reduce((n,c)=>n+(c.episodes?.length||0),0);
 const selectedStudent=scopedStudents.find(s=>s.uid===selectedUid)||scopedStudents[0];
 async function recommend(){
   if(!selectedStudent||!onAIRecommend)return;
   setLoading(true);setResult(null);
   const model=byUid.get(selectedStudent.uid)||selectedStudent.model||{};
   const studentAttempts=attempts.filter(a=>a.uid===selectedStudent.uid).slice(0,25);
   const studentEvents=events.filter(e=>e.uid===selectedStudent.uid).slice(0,25);
   try{setResult(await onAIRecommend({student:selectedStudent,studentModel:model,attempts:studentAttempts,events:studentEvents}));}
   finally{setLoading(false)}
 }
 return <div>
   <div className="page-kicker">Teacher Workspace</div><h1 className="page-title">Dashboard Guru</h1><p className="page-desc">Kelola konten E-Comic, pantau perkembangan siswa, dan gunakan AI untuk rekomendasi pembelajaran individual.</p>
   <div className="stats-row">
     <div className="ac-stat"><div className="stat-icon purple"><BookOpen/></div><div><span>Total E-Comic</span><strong>{state.comics.length}</strong></div></div>
     <div className="ac-stat"><div className="stat-icon green"><BookOpen/></div><div><span>Published</span><strong>{published}</strong></div></div>
     <div className="ac-stat"><div className="stat-icon orange"><BarChart3/></div><div><span>Total Episode</span><strong>{episodes}</strong></div></div>
     <div className="ac-stat"><div className="stat-icon blue"><Users/></div><div><span>Siswa terdaftar</span><strong>{scopedStudents.length}</strong></div></div>
   </div>
   <div className="ac-hero"><div className="hero-copy"><span className="hero-label">TEACHER CONTENT STUDIO</span><h2>Buat dan perbarui E-Comic sesuai kebutuhan kelas.</h2><p>Guru tetap memegang kendali atas materi, episode, panel, konsep, dan bank soal. AI bekerja di atas data tersebut untuk evaluasi, adaptasi, dan rekomendasi.</p><div className="hero-buttons"><button className="primary-btn" onClick={()=>navigate("comic-management")}><Plus size={16}/> Kelola E-Comic</button><button className="ghost-btn" onClick={()=>navigate("analytics")}>Lihat Analitik <ArrowRight size={16}/></button></div></div><div className="hero-illustration"><div className="hero-book">📚</div></div></div>
   <div className="card" style={{marginTop:18}}>
    <div className="section-head"><div><h2>AI Teaching Assistant</h2><span>Rekomendasi individual berdasarkan hasil latihan, penguasaan konsep, dan aktivitas belajar siswa.</span></div><Sparkles size={20}/></div>
    {scopedStudents.length?<div className="register-grid"><div><label className="label">Pilih siswa</label><select value={selectedStudent?.uid||""} onChange={e=>{setSelectedUid(e.target.value);setResult(null)}}>{scopedStudents.map(s=><option value={s.uid} key={s.uid}>{s.name} · {s.grade||"-"} {s.rombel||""}</option>)}</select></div><div style={{display:"flex",alignItems:"end"}}><button className="btn-primary" onClick={recommend} disabled={loading||!selectedStudent}>{loading?"AI menganalisis…":"✨ Analisis & rekomendasikan"}</button></div></div>:<div className="empty-state"><strong>Belum ada siswa terdaftar.</strong><span>Rekomendasi AI akan tersedia setelah data siswa dan aktivitas pembelajaran masuk.</span></div>}
    {result&&<div className="ai-feedback" style={{marginTop:14}}><strong>{result.ai===false?"Rekomendasi pembelajaran":"Rekomendasi AI"}</strong><p>{result.summary}</p>{result.priorityConcepts?.length>0&&<div style={{marginTop:8}}><b>Prioritas konsep:</b> {result.priorityConcepts.join(", ")}</div>}{result.recommendations?.length>0&&<ul style={{margin:"8px 0 0 18px"}}>{result.recommendations.map((x,i)=><li key={i}>{x}</li>)}</ul>}{result.nextActivity&&<div style={{marginTop:8}}><b>Langkah berikutnya:</b> {result.nextActivity}</div>}{result.teacherNote&&<div style={{marginTop:8}}><b>Catatan guru:</b> {result.teacherNote}</div>}</div>}
   </div>
   <div className="dashboard-grid" style={{marginTop:18}}><section><div className="section-head"><div><h2>Konten Terbaru</h2><span>Comic yang sedang dikelola</span></div></div><div className="comic-mini-grid">{state.comics.slice(0,2).map(c=><div className="ac-comic-mini" key={c.id}><div className="mini-cover">📖</div><div className="mini-body"><span className="mini-tag">{c.status}</span><h3>{c.title}</h3><p>{c.description}</p><button className="primary-btn small" onClick={()=>navigate("comic-editor",c.id)}>Edit Content <ArrowRight size={14}/></button></div></div>)}</div></section><aside><div className="section-head"><div><h2>Quick Actions</h2><span>Akses cepat guru</span></div></div><div className="card" style={{display:"flex",flexDirection:"column",gap:8}}><button className="btn" onClick={()=>navigate("comic-management")}>+ Buat E-Comic baru</button><button className="btn" onClick={()=>navigate("question-bank")}>+ Kelola Bank Soal</button><button className="btn" onClick={()=>navigate("analytics")}>↗ Lihat mastery siswa</button></div></aside></div>
 </div>
}
