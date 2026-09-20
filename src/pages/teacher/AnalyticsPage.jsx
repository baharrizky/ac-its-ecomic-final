import React, { useMemo, useState } from "react";
import Badge from "../../components/common/Badge";
import { BarChartCard, LineChartCard } from "../../components/common/ChartCard";

const clsKey = c => `${c.school||""}|${c.educationLevel||""}|${c.grade||""}|${c.rombel||""}`;

export default function AnalyticsPage({ students = [], models = [], attempts = [], events = [], examResults = [], reflections = [], teacherClasses = [], onRefresh }) {
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
  const scopedStudentIds=new Set(rows.map(r=>r.uid));
  const scopedEvents=events.filter(e=>scopedStudentIds.has(e.uid));
  const activeSeconds=scopedEvents.reduce((n,e)=>n+(e.type==="app_session"||e.type==="screen_time"?Number(e.durationSeconds||0):0),0);
  const tutorInteractions=scopedEvents.filter(e=>e.type==="tutor_message").length;
  const comicViews=scopedEvents.filter(e=>e.type==="comic_panel_view").length;
  const evaluationEvents=scopedAttempts.length + examResults.filter(r=>scopedStudentIds.has(r.uid)).length;
  const questionBars=scopedAttempts.length?[{label:"Benar",value:Math.round(scopedAttempts.filter(a=>a.correct).length/scopedAttempts.length*100)},{label:"Salah",value:Math.round(scopedAttempts.filter(a=>!a.correct).length/scopedAttempts.length*100)}]:[];
  const topMastery=conceptRows.slice().sort((a,b)=>b.value-a.value).slice(0,5);
  const lowestMastery=conceptRows.slice().sort((a,b)=>a.value-b.value).slice(0,5);
  const misconceptionMap={}; rows.forEach(r=>(r.model.misconceptions||[]).filter(m=>!m.resolved).forEach(m=>{const key=m.tag||"UNCLASSIFIED";misconceptionMap[key]=(misconceptionMap[key]||0)+1;}));
  const misconceptionRows=Object.entries(misconceptionMap).map(([tag,count])=>({tag,count})).sort((a,b)=>b.count-a.count);
  const recommendations=lowestMastery.slice(0,3).map(x=>`Prioritaskan penguatan ${x.id} karena rata-rata mastery kelas ${x.value}%.`);
  function exportCsv(){
    const header=["Siswa","UID","Sekolah","Kelas","Rombel","Mastery","Attempt","Benar","Ujian","Waktu Belajar (detik)"];
    const data=rows.map(r=>{const ats=scopedAttempts.filter(a=>a.uid===r.uid);const ev=scopedEvents.filter(e=>e.uid===r.uid);const seconds=ev.reduce((n,e)=>n+Number(e.durationSeconds||0),0);return [r.name||"",r.uid||"",r.school||"",r.grade||"",r.rombel||"",Math.round(Number(r.model.overallMastery||0)*100),ats.length,ats.filter(a=>a.correct).length,examResults.find(x=>x.uid===r.uid)?.score??"",seconds];});
    const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    const html=`<html><head><meta charset="utf-8"></head><body><table><thead><tr>${header.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${data.map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const blob=new Blob(["\ufeff"+html],{type:"application/vnd.ms-excel;charset=utf-8;"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`analytics-${grade||"all"}-${rombel||"all"}.xls`;a.click();URL.revokeObjectURL(url);
  }
  return <div><div className="page-kicker">Learning Analytics</div><h1 className="page-title">Analitik Pembelajaran</h1><p className="page-desc">Pilih ruang kelas yang sedang dianalisis. Data mengikuti kelas yang dikelola guru.</p>
    <div className="card" style={{marginBottom:18}}><div className="section-head"><div><h2>Kontrol Kelas</h2><span>Sekolah, tingkat, dan rombel mengikuti kelas yang dibuat Guru.</span></div><div className="actions"><button className="btn" onClick={onRefresh}>↻ Perbarui</button><button className="btn-primary" onClick={exportCsv} disabled={!rows.length}>↓ Unduh Data</button></div></div><div className="register-grid"><div><label className="label">Sekolah</label><select value={school} onChange={e=>{setSchool(e.target.value);setGrade("");setRombel("")}}><option value="">Semua sekolah</option>{schools.map(v=><option key={v}>{v}</option>)}</select></div><div><label className="label">Kelas</label><select value={grade} onChange={e=>{setGrade(e.target.value);setRombel("")}}><option value="">Semua kelas</option>{grades.map(v=><option key={v}>{v}</option>)}</select></div><div><label className="label">Rombel</label><select value={rombel} onChange={e=>setRombel(e.target.value)}><option value="">Semua rombel</option>{rombels.map(v=><option key={v}>{v}</option>)}</select></div></div></div>
    <div className="stats-row"><div className="ac-stat"><div className="stat-icon purple">◈</div><div><span>Rata-rata Penguasaan</span><strong>{avgMastery}%</strong></div></div><div className="ac-stat"><div className="stat-icon green">✓</div><div><span>Konsep Dikuasai</span><strong>{conceptRows.filter(x=>x.value>=80).length}</strong></div></div><div className="ac-stat"><div className="stat-icon orange">!</div><div><span>Miskonsepsi Aktif</span><strong>{misconceptions}</strong></div></div><div className="ac-stat"><div className="stat-icon blue">♙</div><div><span>Jumlah Siswa</span><strong>{rows.length}</strong></div></div></div><div className="stats-row" style={{marginTop:12}}><div className="ac-stat"><div className="stat-icon purple">◷</div><div><span>Waktu Belajar</span><strong>{Math.round(activeSeconds/60)} mnt</strong></div></div><div className="ac-stat"><div className="stat-icon blue">💬</div><div><span>Interaksi Tutor</span><strong>{tutorInteractions}</strong></div></div><div className="ac-stat"><div className="stat-icon green">▣</div><div><span>Panel Dibaca</span><strong>{comicViews}</strong></div></div><div className="ac-stat"><div className="stat-icon orange">✓</div><div><span>Aktivitas Evaluasi</span><strong>{evaluationEvents}</strong></div></div></div>
    {rows.length ? <><div className="analytics-grid"><BarChartCard title="Distribusi Kemampuan" subtitle="Jumlah siswa per kelompok mastery" data={buckets}/>{trend.length?<LineChartCard title="Tren Attempt" subtitle="Skor aktivitas kelas terpilih" data={trend}/>:<div className="card empty-state"><strong>Belum ada tren.</strong><span>Data akan muncul setelah siswa mengerjakan soal.</span></div>}</div>{questionBars.length>0&&<div className="card" style={{marginTop:16}}><BarChartCard title="Efektivitas Respons" subtitle="Proporsi jawaban benar dan salah" data={questionBars}/></div>}<div className="dashboard-grid" style={{marginTop:16}}><div className="card"><div className="section-head"><div><h2>Top Mastery</h2><span>Konsep yang paling dikuasai kelas</span></div></div>{topMastery.length?<div className="list">{topMastery.map(r=><div className="list-item" key={r.id}><span><strong>{r.id}</strong></span><b>{r.value}%</b></div>)}</div>:<div className="empty-state"><strong>Belum ada data mastery.</strong></div>}</div><div className="card"><div className="section-head"><div><h2>Prioritas Penguatan</h2><span>Konsep dengan mastery terendah</span></div></div>{lowestMastery.length?<div className="list">{lowestMastery.map(r=><div className="list-item" key={r.id}><span><strong>{r.id}</strong></span><Badge tone={r.value<50?"amber": "blue"}>{r.value}%</Badge></div>)}</div>:<div className="empty-state"><strong>Belum ada data.</strong></div>}</div></div><div className="dashboard-grid" style={{marginTop:16}}><div className="card"><h2>Top Miskonsepsi</h2>{misconceptionRows.length?<div className="list">{misconceptionRows.slice(0,5).map(r=><div className="list-item" key={r.tag}><span>{r.tag}</span><strong>{r.count} siswa/kejadian</strong></div>)}</div>:<div className="empty-state"><strong>Belum ada miskonsepsi aktif.</strong></div>}</div><div className="card"><h2>Rekomendasi Pembelajaran</h2>{recommendations.length?<ul style={{margin:"8px 0 0 18px"}}>{recommendations.map((x,i)=><li key={i}>{x}</li>)}</ul>:<div className="empty-state"><strong>Belum cukup data untuk rekomendasi.</strong></div>}</div></div></> : <div className="card" style={{marginTop:18}}><div className="empty-state"><strong>{classes.length?"Belum ada siswa pada kelas ini.":"Belum ada kelas yang dikelola."}</strong><span>{classes.length?"Siswa yang terhubung ke kelas terpilih akan muncul di sini.":"Buat kelas terlebih dahulu di Kelas Saya."}</span></div></div>}
  </div>;
}
