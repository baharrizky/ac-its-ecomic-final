import React, { useMemo, useState } from "react";
import Badge from "../../components/common/Badge";
import { BarChartCard, LineChartCard } from "../../components/common/ChartCard";

const clsKey = c => `${c.school||""}|${c.educationLevel||""}|${c.grade||""}|${c.rombel||""}`;

export default function AnalyticsPage({ students = [], models = [], attempts = [], teacherClasses = [], onRefresh }) {
  const [school,setSchool]=useState("");
  const [grade,setGrade]=useState("");
  const [rombel,setRombel]=useState("");
  const byUid = useMemo(()=>new Map(models.map(m=>[m.uid,m])),[models]);
  const classes = teacherClasses || [];
  const schools=[...new Set(classes.map(c=>c.school).filter(Boolean))];
  const grades=[...new Set(classes.filter(c=>!school||c.school===school).map(c=>c.grade).filter(Boolean))];
  const classRows=classes.filter(c=>(!school||c.school===school)&&(!grade||c.grade===grade)&&(!rombel||String(c.rombel)===String(rombel)));
  const rombels=[...new Set(classes.filter(c=>(!school||c.school===school)&&(!grade||c.grade===grade)).map(c=>c.rombel).filter(Boolean))];
  const selectedIds=new Set(classRows.map(c=>c.id));
  const filteredStudents=students.filter(s=>selectedIds.has(s.classId) || ((!s.classId)&&(!school||s.school===school)&&(!grade||s.grade===grade)&&(!rombel||String(s.rombel)===String(rombel))));
  const rows=filteredStudents.map(s=>({...s,model:byUid.get(s.uid)||{}}));
  const scopedAttempts=attempts.filter(a=>!rombel && !grade && !school ? true : selectedIds.has(a.classId) || ((!a.classId)&&(!school||a.school===school)&&(!grade||a.grade===grade)&&(!rombel||String(a.rombel)===String(rombel))));
  const masteryValues=rows.map(r=>Number(r.model.overallMastery||0));
  const avgMastery=masteryValues.length?Math.round(masteryValues.reduce((a,b)=>a+b,0)/masteryValues.length*100):0;
  const conceptMap={}; rows.forEach(r=>Object.entries(r.model.concepts||{}).forEach(([id,p])=>{if(!conceptMap[id])conceptMap[id]=[];conceptMap[id].push(Number(p.mastery||0));}));
  const conceptRows=Object.entries(conceptMap).map(([id,v])=>({id,value:Math.round(v.reduce((a,b)=>a+b,0)/v.length*100)})).sort((a,b)=>a.value-b.value);
  const misconceptions=rows.reduce((n,r)=>n+(r.model.misconceptions||[]).filter(x=>!x.resolved).length,0);
  const buckets=[{label:"Perlu penguatan",value:rows.filter(r=>(r.model.overallMastery||0)<.5).length},{label:"Dalam proses",value:rows.filter(r=>(r.model.overallMastery||0)>=.5&&(r.model.overallMastery||0)<.8).length},{label:"Menguasai",value:rows.filter(r=>(r.model.overallMastery||0)>=.8).length}];
  const recentAttempts=scopedAttempts.slice(0,7).reverse();
  const trend=recentAttempts.map((a,i)=>({label:`${i+1}`,value:Number(a.score ?? (a.correct&&a.total?Math.round(a.correct/a.total*100):a.correct?100:0))}));
  const questionBars=scopedAttempts.length?[{label:"Benar",value:Math.round(scopedAttempts.filter(a=>a.correct).length/scopedAttempts.length*100)},{label:"Salah",value:Math.round(scopedAttempts.filter(a=>!a.correct).length/scopedAttempts.length*100)}]:[];
  return <div><div className="page-kicker">Learning Analytics</div><h1 className="page-title">Analitik Pembelajaran</h1><p className="page-desc">Pilih ruang kelas yang sedang dianalisis. Data mengikuti kelas yang dikelola guru.</p>
    <div className="card" style={{marginBottom:18}}><div className="section-head"><div><h2>Kontrol Kelas</h2><span>Sekolah, tingkat, dan rombel mengikuti kelas yang dibuat Guru.</span></div><button className="btn" onClick={onRefresh}>↻ Perbarui</button></div><div className="register-grid"><div><label className="label">Sekolah</label><select value={school} onChange={e=>{setSchool(e.target.value);setGrade("");setRombel("")}}><option value="">Semua sekolah</option>{schools.map(v=><option key={v}>{v}</option>)}</select></div><div><label className="label">Kelas</label><select value={grade} onChange={e=>{setGrade(e.target.value);setRombel("")}}><option value="">Semua kelas</option>{grades.map(v=><option key={v}>{v}</option>)}</select></div><div><label className="label">Rombel</label><select value={rombel} onChange={e=>setRombel(e.target.value)}><option value="">Semua rombel</option>{rombels.map(v=><option key={v}>{v}</option>)}</select></div></div></div>
    <div className="stats-row"><div className="ac-stat"><div className="stat-icon purple">◈</div><div><span>Rata-rata Penguasaan</span><strong>{avgMastery}%</strong></div></div><div className="ac-stat"><div className="stat-icon green">✓</div><div><span>Konsep Dikuasai</span><strong>{conceptRows.filter(x=>x.value>=80).length}</strong></div></div><div className="ac-stat"><div className="stat-icon orange">!</div><div><span>Miskonsepsi Aktif</span><strong>{misconceptions}</strong></div></div><div className="ac-stat"><div className="stat-icon blue">♙</div><div><span>Jumlah Siswa</span><strong>{rows.length}</strong></div></div></div>
    {rows.length ? <><div className="analytics-grid"><BarChartCard title="Distribusi Kemampuan" subtitle="Jumlah siswa per kelompok mastery" data={buckets}/>{trend.length?<LineChartCard title="Tren Attempt" subtitle="Skor aktivitas kelas terpilih" data={trend}/>:<div className="card empty-state"><strong>Belum ada tren.</strong><span>Data akan muncul setelah siswa mengerjakan soal.</span></div>}</div>{questionBars.length>0&&<div className="card" style={{marginTop:16}}><BarChartCard title="Efektivitas Respons" subtitle="Proporsi jawaban benar dan salah" data={questionBars}/></div>}<div className="card" style={{marginTop:16}}><div className="section-head"><div><h2>Konsep dengan mastery terendah</h2><span>Prioritas intervensi guru</span></div><Badge tone="blue">{conceptRows.length} konsep</Badge></div>{conceptRows.length?<table className="table"><thead><tr><th>Konsep</th><th>Rata-rata mastery</th><th>Status</th></tr></thead><tbody>{conceptRows.slice(0,8).map(r=><tr key={r.id}><td><strong>{r.id}</strong></td><td>{r.value}%</td><td><Badge tone={r.value<50?"amber":r.value<80?"blue":"green"}>{r.value<50?"Perlu penguatan":r.value<80?"Dalam proses":"Menguasai"}</Badge></td></tr>)}</tbody></table>:<div className="empty-state"><strong>Belum ada data konsep.</strong></div>}</div></> : <div className="card" style={{marginTop:18}}><div className="empty-state"><strong>{classes.length?"Belum ada siswa pada kelas ini.":"Belum ada kelas yang dikelola."}</strong><span>{classes.length?"Siswa yang terhubung ke kelas terpilih akan muncul di sini.":"Buat kelas terlebih dahulu di Kelas Saya."}</span></div></div>}
  </div>;
}
