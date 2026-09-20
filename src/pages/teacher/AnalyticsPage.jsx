import React, { useMemo, useState } from "react";
import Badge from "../../components/common/Badge";
import { BarChartCard, LineChartCard } from "../../components/common/ChartCard";
import { classLabel } from "../../utils/classLabel";

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
  const misconceptionRows=rows.flatMap(r=>(r.model.misconceptions||[]).filter(m=>!m.resolved).map(m=>({tag:m.tag||"UNCLASSIFIED",conceptId:m.conceptId||"-"})));
  const misconceptionMap={}; misconceptionRows.forEach(m=>{const k=m.tag;misconceptionMap[k]=(misconceptionMap[k]||0)+1;});
  const topMisconceptions=Object.entries(misconceptionMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  function exportExcel(){
    const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const rowsHtml=[
      ["Siswa","Kelas","Mastery","Nilai Latihan","Nilai Ujian","Attempt","Benar","Waktu Belajar (menit)"],
      ...rows.map(r=>[r.name,classLabel(r.grade,r.rombel),Math.round(Number(r.model.overallMastery||0)*100),Math.round(scopedAttempts.filter(a=>a.uid===r.uid && a.mode==="practice").reduce((n,a)=>n+Number(a.score||0),0)/Math.max(1,scopedAttempts.filter(a=>a.uid===r.uid && a.mode==="practice").length)),Math.round(Number(examResults.find(x=>x.uid===r.uid)?.score||0)),scopedAttempts.filter(a=>a.uid===r.uid).length,scopedAttempts.filter(a=>a.uid===r.uid&&a.correct).length,Math.round(scopedEvents.filter(e=>e.uid===r.uid).reduce((n,e)=>n+(Number(e.durationSeconds||0)),0)/60)])
    ];
    const table="<table border='1'><tbody>"+rowsHtml.map((row,i)=>"<tr>"+row.map(v=>`<${i===0?"th":"td"}>${esc(v)}</${i===0?"th":"td"}>`).join("")+"</tr>").join("")+"</tbody></table>";
    const blob=new Blob([`<html><head><meta charset="utf-8"></head><body><h2>AC-ITS E-Comic - Analitik Siswa</h2>${table}</body></html>`],{type:"application/vnd.ms-excel"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`AC-ITS-Analitik-${new Date().toISOString().slice(0,10)}.xls`;a.click();URL.revokeObjectURL(a.href);
  }
  return <div><div className="page-kicker">Learning Analytics</div><h1 className="page-title">Analitik Pembelajaran</h1><p className="page-desc">Pilih ruang kelas yang sedang dianalisis. Data mengikuti kelas yang dikelola guru.</p>
    <div className="card" style={{marginBottom:18}}><div className="section-head"><div><h2>Kontrol Kelas</h2><span>Sekolah, tingkat, dan rombel mengikuti kelas yang dibuat Guru.</span></div><button className="btn" onClick={onRefresh}>↻ Perbarui</button></div><div className="register-grid"><div><label className="label">Sekolah</label><select value={school} onChange={e=>{setSchool(e.target.value);setGrade("");setRombel("")}}><option value="">Semua sekolah</option>{schools.map(v=><option key={v}>{v}</option>)}</select></div><div><label className="label">Kelas</label><select value={grade} onChange={e=>{setGrade(e.target.value);setRombel("")}}><option value="">Semua kelas</option>{grades.map(v=><option key={v}>{v}</option>)}</select></div><div><label className="label">Rombel</label><select value={rombel} onChange={e=>setRombel(e.target.value)}><option value="">Semua rombel</option>{rombels.map(v=><option key={v}>{v}</option>)}</select></div></div></div>
    <div className="stats-row"><div className="ac-stat"><div className="stat-icon purple">◈</div><div><span>Rata-rata Penguasaan</span><strong>{avgMastery}%</strong></div></div><div className="ac-stat"><div className="stat-icon green">✓</div><div><span>Konsep Dikuasai</span><strong>{conceptRows.filter(x=>x.value>=80).length}</strong></div></div><div className="ac-stat"><div className="stat-icon orange">!</div><div><span>Miskonsepsi Aktif</span><strong>{misconceptions}</strong></div></div><div className="ac-stat"><div className="stat-icon blue">♙</div><div><span>Jumlah Siswa</span><strong>{rows.length}</strong></div></div></div><div className="stats-row" style={{marginTop:12}}><div className="ac-stat"><div className="stat-icon purple">◷</div><div><span>Waktu Belajar</span><strong>{Math.round(activeSeconds/60)} mnt</strong></div></div><div className="ac-stat"><div className="stat-icon blue">💬</div><div><span>Interaksi Tutor</span><strong>{tutorInteractions}</strong></div></div><div className="ac-stat"><div className="stat-icon green">▣</div><div><span>Panel Dibaca</span><strong>{comicViews}</strong></div></div><div className="ac-stat"><div className="stat-icon orange">✓</div><div><span>Aktivitas Evaluasi</span><strong>{evaluationEvents}</strong></div></div></div>
    {rows.length ? <><div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><button className="btn-primary" onClick={exportExcel}>⬇ Unduh Analitik Excel</button></div><div className="analytics-grid"><BarChartCard title="Distribusi Kemampuan" subtitle="Jumlah siswa per kelompok mastery" data={buckets}/>{trend.length?<LineChartCard title="Tren Attempt" subtitle="Skor aktivitas kelas terpilih" data={trend}/>:<div className="card empty-state"><strong>Belum ada tren.</strong><span>Data akan muncul setelah siswa mengerjakan soal.</span></div>}</div>{questionBars.length>0&&<div className="card" style={{marginTop:16}}><BarChartCard title="Efektivitas Respons" subtitle="Proporsi jawaban benar dan salah" data={questionBars}/></div>}<div className="analytics-grid" style={{marginTop:16}}><div className="card"><div className="section-head"><div><h2>Top Mastery</h2><span>Konsep paling dikuasai</span></div></div>{topMastery.length?topMastery.map(r=><div className="list-item" key={r.id}><strong>{r.id}</strong><b>{r.value}%</b></div>):<div className="empty-state"><span>Belum ada data.</span></div>}</div><div className="card"><div className="section-head"><div><h2>Lowest Mastery</h2><span>Konsep yang perlu ditingkatkan</span></div></div>{lowestMastery.length?lowestMastery.map(r=><div className="list-item" key={r.id}><strong>{r.id}</strong><b>{r.value}%</b></div>):<div className="empty-state"><span>Belum ada data.</span></div>}</div></div><div className="card" style={{marginTop:16}}><div className="section-head"><div><h2>Miskonsepsi Teratas</h2><span>Pola yang paling sering muncul di kelas</span></div></div>{topMisconceptions.length?<table className="table"><thead><tr><th>Miskonsepsi</th><th>Jumlah Siswa</th></tr></thead><tbody>{topMisconceptions.map(([tag,n])=><tr key={tag}><td><strong>{tag}</strong></td><td>{n}</td></tr>)}</tbody></table>:<div className="empty-state"><span>Belum ada miskonsepsi aktif.</span></div>}</div></> : <div className="card" style={{marginTop:18}}><div className="empty-state"><strong>{classes.length?"Belum ada siswa pada kelas ini.":"Belum ada kelas yang dikelola."}</strong><span>{classes.length?"Siswa yang terhubung ke kelas terpilih akan muncul di sini.":"Buat kelas terlebih dahulu di Kelas Saya."}</span></div></div>}
  </div>;
}
