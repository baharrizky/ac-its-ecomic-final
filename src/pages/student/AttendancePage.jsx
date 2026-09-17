import React, { useMemo, useState } from "react";
import { CheckCircle2, Clock3, CalendarDays } from "lucide-react";

export default function AttendancePage({ session, records = [], onCheckIn }) {
  const [message, setMessage] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const mine = useMemo(() => records.filter(r => r.uid === session?.uid).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))), [records, session?.uid]);
  const already = mine.some(r => r.date === today && r.status === "Hadir");

  async function checkIn() {
    if (already) return;
    const ok = await onCheckIn({
      uid: session.uid, name: session.name, school: session.school || "", educationLevel: session.educationLevel || "", grade: session.grade || "", rombel: session.rombel || "", date: today,
      status: "Hadir", checkInAt: new Date().toISOString(),
    });
    setMessage(ok === false ? "Presensi tersimpan secara lokal." : "Presensi hari ini berhasil dicatat.");
  }

  return <div>
    <div className="page-kicker">Class Attendance</div>
    <h1 className="page-title">Presensi</h1>
    <p className="page-desc">Catat kehadiranmu dan lihat riwayat presensi belajar.</p>
    <div className="stats-row">
      <div className="ac-stat"><div className="stat-icon green"><CheckCircle2 size={20}/></div><div><span>Hari hadir</span><strong>{mine.filter(r=>r.status === "Hadir").length}</strong></div></div>
      <div className="ac-stat"><div className="stat-icon blue"><CalendarDays size={20}/></div><div><span>Hari ini</span><strong>{already ? "Hadir" : "Belum"}</strong></div></div>
      <div className="ac-stat"><div className="stat-icon orange"><Clock3 size={20}/></div><div><span>Rombel</span><strong>{session?.grade ? `${session.grade} ${session.rombel || ""}` : "-"}</strong></div></div>
    </div>
    <div className="card" style={{marginBottom:16}}>
      <div className="section-head"><div><h2>Presensi Hari Ini</h2><span>{today}</span></div><button className="btn-primary" disabled={already} onClick={checkIn}>{already ? "Sudah Hadir" : "✓ Presensi Sekarang"}</button></div>
      {message && <div className="success-note">{message}</div>}
    </div>
    <div className="card"><h2>Riwayat Presensi</h2>{mine.length ? <table className="table"><thead><tr><th>Tanggal</th><th>Status</th><th>Waktu</th></tr></thead><tbody>{mine.map(r=><tr key={r.id}><td>{r.date}</td><td><span className="badge badge-green">{r.status}</span></td><td>{r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}) : "-"}</td></tr>)}</tbody></table> : <div className="empty-state"><strong>Belum ada riwayat presensi.</strong><span>Presensi akan tercatat ketika kamu menekan tombol hadir.</span></div>}</div>
  </div>;
}
