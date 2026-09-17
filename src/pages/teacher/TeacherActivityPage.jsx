import React, { useMemo, useState } from "react";
import { Clock3, CalendarCheck2, BookOpen, ClipboardList, MessageCircle, RefreshCw } from "lucide-react";
import Badge from "../../components/common/Badge";

const minutes = s => Math.max(0, Math.round((Number(s)||0)/60));
const fmt = s => {
  const sec=Math.max(0,Number(s)||0); const h=Math.floor(sec/3600); const m=Math.floor((sec%3600)/60);
  return h ? `${h}j ${m}m` : `${m}m`;
};
const today = () => new Date().toISOString().slice(0,10);

function dayOf(ts){ return String(ts||"").slice(0,10); }
function eventDuration(e){ return Number(e.durationSeconds||0); }
function sumBy(events, fn){ return events.reduce((n,e)=>n+fn(e),0); }

export default function TeacherActivityPage({students=[],events=[],onRefresh}){
  const [date,setDate]=useState(today());
  const [studentUid,setStudentUid]=useState("");
  const visibleEvents=useMemo(()=>events.filter(e=>!date||dayOf(e.createdAt||e.startedAt||e.endedAt)===date).filter(e=>!studentUid||e.uid===studentUid),[events,date,studentUid]);
  const studentMap=new Map(students.map(s=>[s.uid,s]));
  const scopedStudents=studentUid?students.filter(s=>s.uid===studentUid):students;

  const totals=useMemo(()=>{
    const acc={access:0,comic:0,quiz:0,practice:0,tutor:0,exam:0,checkin:0};
    visibleEvents.forEach(e=>{
      const d=eventDuration(e); const type=e.type||"";
      if(type==="check_in") acc.checkin++;
      if(type==="app_session" || type==="screen_time") acc.access+=d;
      if(type.includes("comic") || type==="comic_panel_view") acc.comic+=d;
      if(type.includes("quiz") || type==="question_attempt" && e.mode==="reader-quiz") acc.quiz+=d;
      if(type.includes("practice") || (type==="question_attempt" && e.mode==="practice")) acc.practice+=d;
      if(type.includes("tutor")) acc.tutor+=d;
      if(type.includes("exam")) acc.exam+=d;
    });
    return acc;
  },[visibleEvents]);

  const studentRows=useMemo(()=>scopedStudents.map(s=>{
    const ev=events.filter(e=>e.uid===s.uid && dayOf(e.createdAt||e.startedAt||e.endedAt)===date);
    return {
      ...s,
      access:sumBy(ev,e=>e.type==="app_session"||e.type==="screen_time"?eventDuration(e):0),
      comic:sumBy(ev,e=>e.type?.includes("comic")?eventDuration(e):0),
      quiz:sumBy(ev,e=>e.type?.includes("quiz")||(e.type==="question_attempt"&&e.mode==="reader-quiz")?eventDuration(e):0),
      practice:sumBy(ev,e=>e.type?.includes("practice")||(e.type==="question_attempt"&&e.mode==="practice")?eventDuration(e):0),
      tutor:sumBy(ev,e=>e.type?.includes("tutor")?eventDuration(e):0),
      checkins:ev.filter(e=>e.type==="check_in").length,
      last:ev[0]?.createdAt||ev[0]?.endedAt||ev[0]?.startedAt||null,
    };
  }),[scopedStudents,events,date]);

  return <div>
    <div className="page-kicker">Learning Activity</div>
    <div className="section-head" style={{alignItems:"end"}}>
      <div><h1 className="page-title">Aktivitas & Durasi Belajar</h1><p className="page-desc">Pantau kapan siswa check-in, berapa lama mengakses platform, membaca E-Comic, mengerjakan kuis, latihan, dan menggunakan Tutor AI.</p></div>
      <button className="btn" onClick={onRefresh}><RefreshCw size={15}/> Perbarui</button>
    </div>
    <div className="card" style={{marginBottom:16}}><div className="register-grid"><div><label className="label">Tanggal</label><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div><div><label className="label">Siswa</label><select value={studentUid} onChange={e=>setStudentUid(e.target.value)}><option value="">Semua siswa</option>{students.map(s=><option key={s.uid} value={s.uid}>{s.name} · {s.grade||"-"} {s.rombel||""}</option>)}</select></div></div></div>
    <div className="stats-row">
      <div className="ac-stat"><div className="stat-icon blue"><CalendarCheck2 size={18}/></div><div><span>Check-in</span><strong>{totals.checkin}</strong></div></div>
      <div className="ac-stat"><div className="stat-icon purple"><Clock3 size={18}/></div><div><span>Waktu Akses</span><strong>{fmt(totals.access)}</strong></div></div>
      <div className="ac-stat"><div className="stat-icon green"><BookOpen size={18}/></div><div><span>Baca E-Comic</span><strong>{fmt(totals.comic)}</strong></div></div>
      <div className="ac-stat"><div className="stat-icon orange"><ClipboardList size={18}/></div><div><span>Kuis + Latihan</span><strong>{fmt(totals.quiz+totals.practice)}</strong></div></div>
    </div>
    <div className="card">
      <div className="section-head"><div><h2>Rekap Harian</h2><span>{studentRows.length} siswa pada filter aktif</span></div><Badge tone="blue">{new Date(date+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"})}</Badge></div>
      {studentRows.length?<div style={{overflowX:"auto"}}><table className="table"><thead><tr><th>Siswa</th><th>Check-in</th><th>Akses</th><th>Baca Comic</th><th>Kuis</th><th>Latihan</th><th>Tutor</th><th>Aktivitas terakhir</th></tr></thead><tbody>{studentRows.map(r=><tr key={r.uid}><td><strong>{r.name}</strong><div className="subtle">{r.school||"-"} · {r.grade||"-"} {r.rombel||""}</div></td><td>{r.checkins}</td><td>{fmt(r.access)}</td><td>{fmt(r.comic)}</td><td>{fmt(r.quiz)}</td><td>{fmt(r.practice)}</td><td>{fmt(r.tutor)}</td><td>{r.last?new Date(r.last).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}):"-"}</td></tr>)}</tbody></table></div>:<div className="empty-state"><strong>Belum ada siswa pada filter ini.</strong><span>Data aktivitas akan muncul setelah siswa mulai menggunakan platform.</span></div>}
    </div>
    <div className="card" style={{marginTop:16}}><div className="section-head"><div><h2>Timeline Aktivitas</h2><span>Event terbaru untuk siswa yang dipilih</span></div><MessageCircle size={18}/></div>{studentUid&&visibleEvents.length?<div className="list">{visibleEvents.slice(0,25).map(e=><div className="list-item" key={e.id}><div><strong>{e.type||"Aktivitas"}</strong><div className="subtle">{e.comicId?`Comic: ${e.comicId} · `:""}{e.mode?`Mode: ${e.mode} · `:""}{e.createdAt?new Date(e.createdAt).toLocaleString("id-ID"):"-"}</div></div><span>{eventDuration(e)>0?fmt(eventDuration(e)):"event"}</span></div>)}</div>:<div className="empty-state"><strong>{studentUid?"Belum ada aktivitas pada tanggal ini.":"Pilih siswa untuk melihat timeline detail."}</strong></div>}</div>
  </div>;
}
