import React, { useMemo, useState } from "react";
import Badge from "../../components/common/Badge";
import { BarChartCard, LineChartCard } from "../../components/common/ChartCard";

export default function AnalyticsPage({ students = [], models = [], attempts = [] }) {
  const [grade,setGrade]=useState("");
  const [rombel,setRombel]=useState("");
  const byUid = new Map(models.map(m=>[m.uid,m]));
  const grades=[...new Set(students.map(s=>s.grade).filter(Boolean))];
  const rombels=[...new Set(students.filter(s=>!grade||s.grade===grade).map(s=>s.rombel).filter(Boolean))].sort((a,b)=>Number(a)-Number(b));
  const filteredStudents=students.filter(s=>(!grade||s.grade===grade)&&(!rombel||s.rombel===rombel));
  const rows = filteredStudents.map(s=>({ ...s, model:byUid.get(s.uid)||{} }));
  const masteryValues = rows.map(r=>Number(r.model.overallMastery||0));
  const avgMastery = masteryValues.length ? Math.round(masteryValues.reduce((a,b)=>a+b,0)/masteryValues.length*100) : 0;
  const conceptMap={}; rows.forEach(r=>Object.entries(r.model.concepts||{}).forEach(([id,p])=>{if(!conceptMap[id])conceptMap[id]=[];conceptMap[id].push(Number(p.mastery||0));}));
  const conceptRows=Object.entries(conceptMap).map(([id,v])=>({id,value:Math.round(v.reduce((a,b)=>a+b,0)/v.length*100)})).sort((a,b)=>a.value-b.value);
  const misconceptions=rows.reduce((n,r)=>n+(r.model.misconceptions||[]).filter(x=>!x.resolved).length,0);
  const buckets=[
    {label:"Perlu penguatan",value:rows.filter(r=>(r.model.overallMastery||0)<.5).length},
    {label:"Dalam proses",value:rows.filter(r=>(r.model.overallMastery||0)>=.5&&(r.model.overallMastery||0)<.8).length},
    {label:"Menguasai",value:rows.filter(r=>(r.model.overallMastery||0)>=.8).length},
  ];
  const recentAttempts=attempts.slice(0,7).reverse();
  const trend=recentAttempts.map((a,i)=>({label:`${i+1}`,value:Number(a.score ?? (a.correct&&a.total?Math.round(a.correct/a.total*100):a.correct?100:0))}));
  const questionBars=attempts.length ? [{label:"Benar",value:Math.round(attempts.filter(a=>a.correct).length/attempts.length*100)},{label:"Salah",value:Math.round(attempts.filter(a=>!a.correct).length/attempts.length*100)}] : [];
  return <div><div className="page-kicker">Learning Analytics</div><h1 className="page-title">Analitik Pembelajaran</h1><p className="page-desc">Analitik dihitung dari hasil latihan, penguasaan konsep, ujian, dan aktivitas siswa yang terdaftar.</p>
    <div className="card" style={{marginBottom:18}}><div className="register-grid"><div><label className="label">Kelas</label><select value={grade} onChange={e=>{setGrade(e.target.value);setRombel("")}}><option value="">Semua kelas</option>{grades.map(g=><option key={g}>{g}</option>)}</select></div><div><label className="label">Rombel</label><select value={rombel} onChange={e=>setRombel(e.target.value)}><option value="">Semua rombel</option>{rombels.map(r=><option key={r}>{r}</option>)}</select></div></div></div><div className="stats-row"><div className="ac-stat"><div className="stat-icon purple">◈</div><div><span>Rata-rata Penguasaan</span><strong>{avgMastery}%</strong></div></div><div className="ac-stat"><div className="stat-icon green">✓</div><div><span>Konsep Dikuasai</span><strong>{conceptRows.filter(x=>x.value>=80).length}</strong></div></div><div className="ac-stat"><div className="stat-icon orange">!</div><div><span>Miskonsepsi Aktif</span><strong>{misconceptions}</strong></div></div><div className="ac-stat"><div className="stat-icon blue">♙</div><div><span>Jumlah Siswa</span><strong>{rows.length}</strong></div></div></div>
    {rows.length ? <>
      <div className="analytics-grid"><BarChartCard title="Distribusi Kemampuan" subtitle="Jumlah siswa per kelompok mastery" data={buckets}/>{trend.length?<LineChartCard title="Tren Attempt" subtitle="Skor beberapa aktivitas terakhir" data={trend}/>:<div className="card empty-state"><strong>Belum ada tren.</strong><span>Data akan muncul setelah siswa mengerjakan soal.</span></div>}</div>
      {questionBars.length&&<div className="card" style={{marginTop:16}}><BarChartCard title="Efektivitas Respons" subtitle="Proporsi jawaban benar dan salah" data={questionBars}/></div>}
      <div className="card" style={{marginTop:16}}><div className="section-head"><div><h2>Konsep dengan mastery terendah</h2><span>Prioritas intervensi guru</span></div><Badge tone="blue">{conceptRows.length} konsep</Badge></div>{conceptRows.length?<table className="table"><thead><tr><th>Konsep</th><th>Rata-rata mastery</th><th>Status</th></tr></thead><tbody>{conceptRows.slice(0,8).map(r=><tr key={r.id}><td><strong>{r.id}</strong></td><td>{r.value}%</td><td><Badge tone={r.value<50?"amber":r.value<80?"blue":"green"}>{r.value<50?"Perlu penguatan":r.value<80?"Dalam proses":"Menguasai"}</Badge></td></tr>)}</tbody></table>:<div className="empty-state"><strong>Belum ada data konsep.</strong></div>}</div>
    </> : <div className="card" style={{marginTop:18}}><div className="empty-state"><strong>Belum ada data analitik siswa.</strong><span>Setelah siswa terdaftar dan mulai belajar, grafik mastery, miskonsepsi, dan tren akan terisi otomatis.</span></div></div>}
  </div>;
}
