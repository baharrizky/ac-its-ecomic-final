import React, { useEffect, useMemo, useState } from "react";
import { classLabel } from "../../utils/classLabel";
import {
  createTeacherRegistrationCode,
  deactivateTeacherRegistrationCode,
  listTeacherRegistrationCodes,
  listAllClasses,
  listAllTeachers,
  listAllStudents
} from "../../services/accessControlService";

const TABS = [
  ["schools", "Sekolah"],
  ["teachers", "Guru"],
  ["classes", "Kelas"],
  ["students", "Siswa"],
  ["codes", "Kode Registrasi"]
];

export default function AdminDashboard({ session }) {
  const [tab, setTab] = useState("schools");
  const [codes, setCodes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [message, setMessage] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("Semua");
  const [teacherFilter, setTeacherFilter] = useState("Semua");

  const refresh = async () => {
    const [c, cl, t, s] = await Promise.all([
      listTeacherRegistrationCodes(),
      listAllClasses(),
      listAllTeachers(),
      listAllStudents()
    ]);
    setCodes(c || []);
    setClasses(cl || []);
    setTeachers(t || []);
    setStudents(s || []);
  };

  useEffect(() => { refresh(); }, []);

  async function create() {
    const item = await createTeacherRegistrationCode(session?.uid, {
      label: label.trim() || "Registrasi Guru",
      maxUses
    });
    setLabel("");
    setMaxUses(1);
    setMessage(`Kode ${item.code} berhasil dibuat.`);
    setTab("codes");
    await refresh();
  }

  async function disable(id) {
    await deactivateTeacherRegistrationCode(id);
    await refresh();
  }

  const schools = useMemo(() => {
    const names = new Set();
    classes.forEach(c => {
      const name = String(c.school || "").trim();
      if (name) names.add(name);
    });
    teachers.forEach(t => {
      const name = String(t.school || t.sekolah || "").trim();
      if (name) names.add(name);
    });
    students.forEach(s => {
      const name = String(s.school || s.sekolah || "").trim();
      if (name) names.add(name);
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [classes, teachers, students]);

  const teacherByUid = useMemo(
    () => new Map(teachers.map(t => [t.uid || t.id, t])),
    [teachers]
  );

  const visibleClasses = useMemo(
    () => schoolFilter === "Semua"
      ? classes
      : classes.filter(c => (c.school || "") === schoolFilter),
    [classes, schoolFilter]
  );

  const visibleStudents = useMemo(() => {
    let rows = students;
    if (schoolFilter !== "Semua") {
      rows = rows.filter(s => (s.school || s.sekolah || "") === schoolFilter);
    }
    if (teacherFilter !== "Semua") {
      rows = rows.filter(
        s => (s.classTeacherUid || s.teacherUid || "") === teacherFilter
      );
    }
    return rows;
  }, [students, schoolFilter, teacherFilter]);

  const activeCodes = codes.filter(c => c.active !== false).length;

  return (
    <div>
      <div className="page-kicker">Platform Administration</div>
      <h1 className="page-title">Admin Control Center</h1>
      <p className="page-desc">
        Kelola struktur Sekolah, Guru, Kelas, Siswa, dan akses registrasi Guru.
      </p>

      {message && <div className="success-note">{message}</div>}

      <div className="stats-row" style={{ marginTop: 16 }}>
        <div className="ac-stat"><div className="stat-icon purple">S</div><div><span>Sekolah</span><strong>{schools.length}</strong></div></div>
        <div className="ac-stat"><div className="stat-icon blue">G</div><div><span>Guru</span><strong>{teachers.length}</strong></div></div>
        <div className="ac-stat"><div className="stat-icon green">K</div><div><span>Kelas</span><strong>{classes.length}</strong></div></div>
        <div className="ac-stat"><div className="stat-icon orange">S</div><div><span>Siswa</span><strong>{students.length}</strong></div></div>
      </div>

      <div className="card" style={{ marginTop: 18, padding: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TABS.map(([id, title]) => (
            <button key={id} className={tab === id ? "btn-primary" : "btn"} onClick={() => setTab(id)}>
              {title}
            </button>
          ))}
        </div>
      </div>

      {tab === "schools" && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="section-head"><div>
            <h2>Sekolah</h2>
            <span>Sekolah yang sudah terhubung dengan struktur Guru, Kelas, atau Siswa.</span>
          </div></div>
          {schools.length ? <div className="list">
            {schools.map(school => {
              const schoolClasses = classes.filter(c => c.school === school);
              const schoolTeachers = teachers.filter(t => (t.school || t.sekolah || "") === school);
              const schoolStudents = students.filter(s => (s.school || s.sekolah || "") === school);
              return <div className="list-item" key={school}>
                <div>
                  <strong>{school}</strong>
                  <div className="subtle">{schoolTeachers.length} Guru · {schoolClasses.length} Kelas · {schoolStudents.length} Siswa</div>
                </div>
                <button className="btn" onClick={() => { setSchoolFilter(school); setTab("classes"); }}>
                  Lihat kelas
                </button>
              </div>;
            })}
          </div> : <div className="empty-state"><strong>Belum ada sekolah.</strong><span>Sekolah akan muncul setelah ada Guru, Kelas, atau Siswa yang terhubung.</span></div>}
        </div>
      )}

      {tab === "teachers" && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="section-head"><div>
            <h2>Daftar Guru</h2>
            <span>Guru yang terdaftar pada platform.</span>
          </div></div>
          {teachers.length ? <div className="overflow-x-auto"><table className="table">
            <thead><tr><th>Nama</th><th>Email</th><th>Sekolah</th><th>Kelas</th></tr></thead>
            <tbody>{teachers.map(t => {
              const uid = t.uid || t.id;
              const teacherClasses = classes.filter(c => c.teacherUid === uid);
              return <tr key={uid}>
                <td><strong>{t.name || t.displayName || "Guru"}</strong></td>
                <td>{t.email || "-"}</td>
                <td>{t.school || t.sekolah || "-"}</td>
                <td>{teacherClasses.length ? teacherClasses.map(c => `${classLabel(c.grade, c.rombel)}`).join(", ") : "-"}</td>
              </tr>;
            })}</tbody>
          </table></div> : <div className="empty-state"><strong>Belum ada Guru.</strong></div>}
        </div>
      )}

      {tab === "classes" && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="section-head">
            <div><h2>Daftar Kelas</h2><span>Seluruh kelas yang dibuat Guru.</span></div>
            <select value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)}>
              <option>Semua</option>{schools.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          {visibleClasses.length ? <div className="overflow-x-auto"><table className="table">
            <thead><tr><th>Sekolah</th><th>Jenjang</th><th>Kelas</th><th>Guru</th><th>Status</th></tr></thead>
            <tbody>{visibleClasses.map(c => <tr key={c.id}>
              <td>{c.school || "-"}</td>
              <td>{c.educationLevel || "-"}</td>
              <td><strong>{classLabel(c.grade, c.rombel)}</strong></td>
              <td>{c.teacherName || teacherByUid.get(c.teacherUid)?.name || c.teacherUid || "-"}</td>
              <td>{c.active !== false ? "Aktif" : "Nonaktif"}</td>
            </tr>)}</tbody>
          </table></div> : <div className="empty-state"><strong>Belum ada kelas.</strong></div>}
        </div>
      )}

      {tab === "students" && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="section-head">
            <div><h2>Daftar Siswa</h2><span>Siswa dan hubungan sekolah, kelas, serta Guru.</span></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)}>
                <option>Semua</option>{schools.map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)}>
                <option value="Semua">Semua Guru</option>
                {teachers.map(t => <option key={t.uid || t.id} value={t.uid || t.id}>{t.name || t.displayName || "Guru"}</option>)}
              </select>
            </div>
          </div>
          {visibleStudents.length ? <div className="overflow-x-auto"><table className="table">
            <thead><tr><th>Nama</th><th>Email</th><th>Sekolah</th><th>Kelas</th><th>Guru</th></tr></thead>
            <tbody>{visibleStudents.map(s => {
              const teacherUid = s.classTeacherUid || s.teacherUid;
              const teacher = teacherByUid.get(teacherUid);
              return <tr key={s.uid || s.id}>
                <td><strong>{s.name || s.displayName || "Siswa"}</strong></td>
                <td>{s.email || "-"}</td>
                <td>{s.school || s.sekolah || "-"}</td>
                <td>{s.grade && s.rombel ? `${classLabel(s.grade, s.rombel)}` : s.kelas || "-"}</td>
                <td>{teacher?.name || s.teacherName || teacherUid || "-"}</td>
              </tr>;
            })}</tbody>
          </table></div> : <div className="empty-state"><strong>Belum ada siswa.</strong></div>}
        </div>
      )}

      {tab === "codes" && <>
        <div className="card" style={{ marginTop: 18 }}>
          <div className="section-head">
            <div><h2>Kode Akses Guru</h2><span>Guru wajib memasukkan kode aktif saat mendaftar.</span></div>
            <strong>{activeCodes} kode aktif</strong>
          </div>
          <div className="register-grid">
            <div><label className="label">Label</label><input value={label} onChange={e => setLabel(e.target.value)} placeholder="Contoh: Guru SMA Jambi" /></div>
            <div><label className="label">Maksimal penggunaan</label><input type="number" min="1" max="100" value={maxUses} onChange={e => setMaxUses(Math.max(1, Number(e.target.value) || 1))} /></div>
          </div>
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={create}>+ Buat Kode Registrasi Guru</button>
        </div>
        <div className="card" style={{ marginTop: 18 }}>
          <h2>Daftar Kode</h2>
          {codes.length ? <div className="list">{codes.map(c => <div className="list-item" key={c.id}>
            <div><strong style={{ fontSize: 18, letterSpacing: 1 }}>{c.code}</strong><div className="subtle">{c.label || "Registrasi Guru"} · {c.usedCount || 0}/{c.maxUses || 1} penggunaan</div></div>
            <button className="btn" disabled={c.active === false} onClick={() => disable(c.id)}>{c.active === false ? "Nonaktif" : "Nonaktifkan"}</button>
          </div>)}</div> : <div className="empty-state"><strong>Belum ada kode registrasi.</strong><span>Buat kode pertama untuk membuka pendaftaran Guru.</span></div>}
        </div>
      </>}
    </div>
  );
}
