import React, { useEffect, useState } from "react";
import { createTeacherRegistrationCode, deactivateTeacherRegistrationCode, listTeacherRegistrationCodes, listAllClasses } from "../../services/accessControlService";
import { getRegisteredStudents } from "../../services/authService";

export default function AdminDashboard({ session }) {
  const [codes, setCodes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [message, setMessage] = useState("");
  const refresh = async () => {
    const [c, cl, st] = await Promise.all([listTeacherRegistrationCodes(), listAllClasses(), getRegisteredStudents()]);
    setCodes(c); setClasses(cl); setStudents(st);
  };
  useEffect(() => { refresh(); }, []);
  async function create() { const item = await createTeacherRegistrationCode(session?.uid, { label, maxUses }); setLabel(""); setMaxUses(1); setMessage(`Kode ${item.code} berhasil dibuat.`); await refresh(); }
  async function disable(id) { await deactivateTeacherRegistrationCode(id); await refresh(); }
  return <div>
    <div className="page-kicker">Platform Administration</div>
    <h1 className="page-title">Admin Control Center</h1>
    <p className="page-desc">Kelola akses pendaftaran Guru dan pantau struktur kelas. Admin tidak mengelola isi pembelajaran harian.</p>
    {message && <div className="success-note">{message}</div>}
    <div className="stats-row" style={{marginTop:16}}>
      <div className="ac-stat"><div className="stat-icon purple">G</div><div><span>Kode Guru</span><strong>{codes.filter(c=>c.active!==false).length}</strong></div></div>
      <div className="ac-stat"><div className="stat-icon blue">K</div><div><span>Kelas</span><strong>{classes.length}</strong></div></div>
      <div className="ac-stat"><div className="stat-icon green">S</div><div><span>Siswa</span><strong>{students.length}</strong></div></div>
    </div>
    <div className="card" style={{marginTop:18}}>
      <div className="section-head"><div><h2>Kode Akses Guru</h2><span>Guru wajib memasukkan kode aktif ini saat mendaftar.</span></div></div>
      <div className="register-grid">
        <div><label className="label">Label</label><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Contoh: Guru SMA Jambi"/></div>
        <div><label className="label">Maksimal penggunaan</label><input type="number" min="1" max="100" value={maxUses} onChange={e=>setMaxUses(Math.max(1, Number(e.target.value)||1))}/></div>
      </div>
      <button className="btn-primary" style={{marginTop:12}} onClick={create}>+ Buat Kode Registrasi Guru</button>
    </div>
    <div className="card" style={{marginTop:18}}>
      <h2>Daftar Kode</h2>
      {codes.length ? <div className="list">{codes.map(c=><div className="list-item" key={c.id}><div><strong style={{fontSize:18,letterSpacing:1}}>{c.code}</strong><div className="subtle">{c.label || "Registrasi Guru"} · {c.usedCount||0}/{c.maxUses||1} penggunaan</div></div><button className="btn" disabled={c.active===false} onClick={()=>disable(c.id)}>{c.active===false?"Nonaktif":"Nonaktifkan"}</button></div>)}</div> : <div className="empty-state"><strong>Belum ada kode registrasi.</strong><span>Buat kode pertama untuk membuka pendaftaran Guru.</span></div>}
    </div>
    <div className="card" style={{marginTop:18}}>
      <h2>Struktur Kelas</h2>
      {classes.length ? <table className="table"><thead><tr><th>Sekolah</th><th>Kelas</th><th>Guru</th><th>Status</th></tr></thead><tbody>{classes.map(c=><tr key={c.id}><td>{c.school||"-"}</td><td>{c.educationLevel} · {c.grade} {c.rombel}</td><td>{c.teacherName||c.teacherUid}</td><td>{c.active!==false?"Aktif":"Nonaktif"}</td></tr>)}</tbody></table> : <div className="empty-state"><strong>Belum ada kelas.</strong><span>Kelas akan muncul setelah Guru membuat ruang kelas.</span></div>}
    </div>
  </div>;
}
