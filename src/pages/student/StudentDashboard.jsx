import React from "react";
import { BookOpen, MessageCircle, PencilLine, Trophy, Flame, Star, ArrowRight, Play } from "lucide-react";
import Badge from "../../components/common/Badge";
import { concepts } from "../../data/demoData";

export default function StudentDashboard({state,navigate}) {
  const weakest = Object.entries(state.studentModel.concepts).sort((a,b)=>a[1].mastery-b[1].mastery)[0];
  const published = state.comics.filter(c=>c.status==="Published");
  return (
    <div className="dashboard-page">
      <div className="welcome-row">
        <div>
          <div className="page-kicker">Dashboard Siswa</div>
          <h1 className="page-title">Halo, Ahmad! 👋</h1>
          <p className="page-desc">Lanjutkan perjalanan belajarmu melalui E-Comic dan latihan adaptif.</p>
        </div>
        <div className="student-level">
          <div className="level-circle">{state.studentModel.currentLevel}</div>
          <div><strong>Level {state.studentModel.currentLevel}</strong><span>Learning Explorer</span></div>
        </div>
      </div>

      <div className="stats-row">
        <div className="ac-stat"><div className="stat-icon blue"><BookOpen size={20}/></div><div><span>Materi selesai</span><strong>4 / 8</strong></div></div>
        <div className="ac-stat"><div className="stat-icon orange"><Flame size={20}/></div><div><span>Streak</span><strong>{state.studentModel.streak} hari</strong></div></div>
        <div className="ac-stat"><div className="stat-icon purple"><Star size={20}/></div><div><span>Total XP</span><strong>{state.studentModel.xp}</strong></div></div>
        <div className="ac-stat"><div className="stat-icon green"><Trophy size={20}/></div><div><span>Mastery</span><strong>{Math.round(state.studentModel.overallMastery*100)}%</strong></div></div>
      </div>

      <div className="ac-hero">
        <div className="hero-copy">
          <span className="hero-label">E-COMIC LEARNING</span>
          <h2>Belajar matematika lewat cerita.</h2>
          <p>Baca komik, pahami konsep, tanyakan bagian yang membingungkan kepada AI Tutor, lalu kerjakan latihan yang menyesuaikan kemampuanmu.</p>
          <div className="hero-buttons">
            <button className="primary-btn" onClick={()=>navigate("comic-library")}>Mulai Membaca <ArrowRight size={16}/></button>
            <button className="ghost-btn" onClick={()=>navigate("tutor")}>Tanya AI Tutor <MessageCircle size={16}/></button>
          </div>
        </div>
        <div className="hero-illustration"><div className="hero-book">📖</div><div className="hero-spark">✦</div></div>
      </div>

      <div className="dashboard-grid">
        <section>
          <div className="section-head"><div><h2>Materi E-Comic</h2><span>Pilih materi untuk melanjutkan belajar</span></div><button className="text-btn" onClick={()=>navigate("comic-library")}>Lihat semua <ArrowRight size={15}/></button></div>
          <div className="comic-mini-grid">
            {published.slice(0,2).map(c=>(
              <div className="ac-comic-mini" key={c.id}>
                <div className="mini-cover">📖</div>
                <div className="mini-body"><span className="mini-tag">{c.subject}</span><h3>{c.title}</h3><p>{c.description}</p><button className="primary-btn small" onClick={()=>navigate("comic-reader",c.id)}><Play size={14}/> Lanjutkan</button></div>
              </div>
            ))}
          </div>
        </section>

        <aside>
          <div className="section-head"><div><h2>Rekomendasi</h2><span>Dari Student Model</span></div></div>
          <div className="recommend-card">
            <div className="recommend-icon"><PencilLine size={20}/></div>
            <span>Konsep yang perlu diperkuat</span>
            <strong>{weakest?.[0]} · {concepts[weakest?.[0]]?.name || weakest?.[0]}</strong>
            <div className="progress-label"><span>Mastery</span><b>{Math.round((weakest?.[1]?.mastery||0)*100)}%</b></div>
            <div className="progress"><span style={{width:`${(weakest?.[1]?.mastery||0)*100}%`}}/></div>
            <button className="primary-btn small full" onClick={()=>navigate("practice")}>Mulai Latihan</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
