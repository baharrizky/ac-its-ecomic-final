import React from "react";
import { BookOpen, BarChart3, Users, Plus, ArrowRight } from "lucide-react";
export default function TeacherDashboard({state,navigate}){
 const published=state.comics.filter(c=>c.status==="Published").length;
 const episodes=state.comics.reduce((n,c)=>n+c.episodes.length,0);
 return <div>
   <div className="page-kicker">Teacher Workspace</div><h1 className="page-title">Dashboard Guru</h1><p className="page-desc">Kelola konten E-Comic dan pantau perkembangan pembelajaran siswa.</p>
   <div className="stats-row">
     <div className="ac-stat"><div className="stat-icon purple"><BookOpen/></div><div><span>Total E-Comic</span><strong>{state.comics.length}</strong></div></div>
     <div className="ac-stat"><div className="stat-icon green"><BookOpen/></div><div><span>Published</span><strong>{published}</strong></div></div>
     <div className="ac-stat"><div className="stat-icon orange"><BarChart3/></div><div><span>Total Episode</span><strong>{episodes}</strong></div></div>
     <div className="ac-stat"><div className="stat-icon blue"><Users/></div><div><span>Siswa aktif</span><strong>1</strong></div></div>
   </div>
   <div className="ac-hero"><div className="hero-copy"><span className="hero-label">TEACHER CONTENT STUDIO</span><h2>Buat dan perbarui E-Comic sesuai kebutuhan kelas.</h2><p>Guru tetap memegang kendali atas materi, episode, panel, konsep, dan status publikasi. Sistem adaptive learning bekerja di atas konten tersebut.</p><div className="hero-buttons"><button className="primary-btn" onClick={()=>navigate("comic-management")}><Plus size={16}/> Kelola E-Comic</button><button className="ghost-btn" onClick={()=>navigate("analytics")}>Lihat Analitik <ArrowRight size={16}/></button></div></div><div className="hero-illustration"><div className="hero-book">📚</div></div></div>
   <div className="dashboard-grid"><section><div className="section-head"><div><h2>Konten Terbaru</h2><span>Comic yang sedang dikelola</span></div></div><div className="comic-mini-grid">{state.comics.slice(0,2).map(c=><div className="ac-comic-mini" key={c.id}><div className="mini-cover">📖</div><div className="mini-body"><span className="mini-tag">{c.status}</span><h3>{c.title}</h3><p>{c.description}</p><button className="primary-btn small" onClick={()=>navigate("comic-editor",c.id)}>Edit Content <ArrowRight size={14}/></button></div></div>)}</div></section><aside><div className="section-head"><div><h2>Quick Actions</h2><span>Akses cepat guru</span></div></div><div className="card" style={{display:"flex",flexDirection:"column",gap:8}}><button className="btn" onClick={()=>navigate("comic-management")}>+ Buat E-Comic baru</button><button className="btn" onClick={()=>navigate("analytics")}>↗ Lihat mastery siswa</button></div></aside></div>
 </div>
}
