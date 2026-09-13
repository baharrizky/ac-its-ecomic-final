import React, { useState } from "react";
import { GraduationCap, ShieldCheck, Users, ArrowLeft, LogIn, UserPlus, Eye, EyeOff, Mail, Lock, School, BookOpen } from "lucide-react";
import { demoAccounts, login, registerStudent, registerTeacher } from "../services/authService";

const SCHOOL_OPTIONS = {
  SMP: [
    "SMP Negeri 001 Kota Jambi", "SMP Negeri 002 Kota Jambi", "SMP Negeri 003 Kota Jambi",
    "SMP Negeri 004 Kota Jambi", "SMP Negeri 005 Kota Jambi", "SMP Negeri 006 Kota Jambi",
    "SMP Negeri 007 Kota Jambi", "SMP Negeri 008 Kota Jambi", "SMP Negeri 009 Kota Jambi",
    "SMP Negeri 010 Kota Jambi", "SMP Negeri 011 Kota Jambi", "SMP Negeri 012 Kota Jambi",
    "SMP Negeri 013 Kota Jambi", "SMP Negeri 014 Kota Jambi", "SMP Negeri 015 Kota Jambi",
    "SMP Negeri 016 Kota Jambi", "SMP Negeri 017 Kota Jambi", "SMP Negeri 018 Kota Jambi",
    "SMP Negeri 019 Kota Jambi", "SMP Negeri 020 Kota Jambi", "SMP Negeri 021 Kota Jambi",
    "SMP Negeri 022 Kota Jambi", "SMP Negeri 023 Kota Jambi", "SMP Negeri 024 Kota Jambi",
    "SMP Negeri 025 Kota Jambi", "SMP Negeri 026 Kota Jambi"
  ],
  SMA: [
    "SMA Negeri 1 Kota Jambi", "SMA Negeri 2 Kota Jambi", "SMA Negeri 3 Kota Jambi",
    "SMA Negeri 4 Kota Jambi", "SMA Negeri 5 Kota Jambi", "SMA Negeri 6 Kota Jambi",
    "SMA Negeri 7 Kota Jambi", "SMA Negeri 8 Kota Jambi", "SMA Negeri 9 Kota Jambi",
    "SMA Negeri 10 Kota Jambi", "SMA Negeri 11 Kota Jambi", "SMA Negeri 12 Kota Jambi",
    "SMA Negeri 13 Kota Jambi"
  ]
};

const CLASS_OPTIONS = {
  SMP: ["7-1", "7-2", "7-3", "7-4", "7-5", "7-6", "7-7", "7-8", "7-9", "7-10", "8-1", "8-2", "8-3", "8-4", "8-5", "8-6", "8-7", "8-8", "8-9", "8-10", "9-1", "9-2", "9-3", "9-4", "9-5", "9-6", "9-7", "9-8", "9-9", "9-10"],
  SMA: ["10-1", "10-2", "10-3", "10-4", "10-5", "10-6", "10-7", "10-8", "10-9", "10-10", "11-1", "11-2", "11-3", "11-4", "11-5", "11-6", "11-7", "11-8", "11-9", "11-10", "12-1", "12-2", "12-3", "12-4", "12-5", "12-6", "12-7", "12-8", "12-9", "12-10"]
};

export default function LoginPage({ onLogin }) {
  const [role, setRole] = useState(null);
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nama, setNama] = useState("");
  const [jenjang, setJenjang] = useState("");
  const [sekolah, setSekolah] = useState("");
  const [kelas, setKelas] = useState("");
  const [password2, setPassword2] = useState("");
  const [kodeAkses, setKodeAkses] = useState("");
  const [kelasAjar, setKelasAjar] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function chooseRole(r) {
    setRole(r); setTab("login"); setError("");
    setEmail(demoAccounts?.[r]?.email || ""); setPassword("");
  }

  function reset() {
    setRole(null); setTab("login"); setError(""); setEmail(""); setPassword(""); setNama(""); setJenjang(""); setSekolah(""); setKelas(""); setPassword2(""); setKodeAkses(""); setKelasAjar("");
  }

  async function submitLogin(e) {
    e.preventDefault(); if (loading) return; setError(""); setLoading(true);
    try {
      const res = await login(role, email, password);
      if (!res.ok) setError(res.message); else onLogin(res.session);
    } catch (err) { setError(err?.message || "Login gagal."); }
    finally { setLoading(false); }
  }

  async function submitRegister(e) {
    e.preventDefault(); if (loading) return; setError("");
    if (!nama.trim() || !email.trim() || !password || !password2) return setError("Lengkapi semua data terlebih dahulu.");
    if (password.length < 6) return setError("Password minimal 6 karakter.");
    if (password !== password2) return setError("Konfirmasi password tidak cocok.");
    if (role === "student" && (!jenjang || !sekolah.trim() || !kelas)) return setError("Lengkapi jenjang sekolah, asal sekolah, dan kelas.");
    if (role === "teacher" && !kodeAkses.trim()) return setError("Kode akses guru wajib diisi.");
    setLoading(true);
    try {
      const res = role === "student"
        ? await registerStudent({ nama, jenjang, sekolah, kelas, email, password })
        : await registerTeacher({ nama, kodeAkses, kelasAjar, email, password });
      if (!res.ok) setError(res.message); else onLogin(res.session);
    } catch (err) { setError(err?.message || "Pendaftaran gagal."); }
    finally { setLoading(false); }
  }

  return <div className="login-page">
    <div className="login-brand"><div className="brand-symbol"><GraduationCap /></div><div><strong>AC-ITS</strong><span>E-Comic Learning Platform</span></div></div>
    <div className="login-shell">
      <div className="login-copy">
        <span className="page-kicker">ADAPTIVE E-COMIC LEARNING</span>
        <h1>Belajar melalui cerita.<br /><em>Beradaptasi dengan kemampuanmu.</em></h1>
        <p>Platform pembelajaran E-Comic dengan AI Tutor dan latihan adaptif. Siswa dan guru memiliki ruang kerja serta akses yang berbeda.</p>
        <div className="login-features"><span><ShieldCheck size={17}/> Akses berbasis peran</span><span><Users size={17}/> Student & Teacher Space</span></div>
      </div>
      <div className="login-card">
        {!role ? <>
          <div className="login-card-head"><h2>Masuk ke AC-ITS</h2><p>Pilih jenis akun untuk melanjutkan.</p></div>
          <button className="role-card" onClick={() => chooseRole("student")}><div className="role-icon student"><Users /></div><div><strong>Login Siswa</strong><span>Masuk ke ruang belajar, E-Comic, AI Tutor, dan latihan adaptif.</span></div><b>→</b></button>
          <button className="role-card" onClick={() => chooseRole("teacher")}><div className="role-icon teacher"><GraduationCap /></div><div><strong>Login Guru</strong><span>Kelola E-Comic, materi, soal, analitik, dan kelas.</span></div><b>→</b></button>
        </> : <>
          <button type="button" className="back-login" onClick={reset}><ArrowLeft size={15}/> Kembali</button>
          <div className="auth-tabs">
            <button type="button" className={tab === "register" ? "active" : ""} onClick={() => {setTab("register"); setError(""); setEmail(""); setPassword("");}}><UserPlus size={15}/> Daftar Baru</button>
            <button type="button" className={tab === "login" ? "active" : ""} onClick={() => {setTab("login"); setError("");}}><LogIn size={15}/> Sudah Terdaftar</button>
          </div>
          <div className="login-card-head"><h2>{tab === "register" ? (role === "student" ? "Daftar Siswa" : "Daftar Guru") : `Login ${role === "teacher" ? "Guru" : "Siswa"}`}</h2><p>{tab === "register" ? "Buat akun untuk mulai menggunakan E-Comic" : role === "teacher" ? "Teacher Content & Analytics Space" : "Student Adaptive Learning Space"}</p></div>
          {tab === "register" ? <form onSubmit={submitRegister}>
            <label className="label">Nama Lengkap</label><div className="inputwrap"><Users size={15}/><input value={nama} onChange={e => setNama(e.target.value)} placeholder="Masukkan nama lengkapmu" disabled={loading}/></div>
            {role === "student" ? <>
              <label className="label">Jenjang Sekolah</label><div className="inputwrap"><School size={15}/><select value={jenjang} onChange={e => {setJenjang(e.target.value);setSekolah("");setKelas("");}} disabled={loading}><option value="">Pilih jenjang sekolah</option><option value="SMP">SMP</option><option value="SMA">SMA</option></select></div>
              <label className="label">Asal Sekolah</label><div className="inputwrap"><School size={15}/><select value={sekolah} onChange={e => setSekolah(e.target.value)} disabled={loading || !jenjang}><option value="">{jenjang ? "Pilih sekolah negeri" : "Pilih jenjang terlebih dahulu"}</option>{(SCHOOL_OPTIONS[jenjang] || []).map(school => <option key={school} value={school}>{school}</option>)}</select></div>
              <label className="label">Kelas</label><div className="inputwrap"><BookOpen size={15}/><select value={kelas} onChange={e => setKelas(e.target.value)} disabled={loading || !jenjang}><option value="">{jenjang ? "Pilih kelas" : "Pilih jenjang terlebih dahulu"}</option>{(CLASS_OPTIONS[jenjang] || []).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            </> : <>
              <label className="label">Kode Akses Guru</label><div className="inputwrap"><ShieldCheck size={15}/><input value={kodeAkses} onChange={e => setKodeAkses(e.target.value.toUpperCase())} placeholder="Masukkan kode akses" disabled={loading}/></div>
              <div className="form-help">Kode akses menentukan sekolah dan mata pelajaran yang terdaftar.</div>
              <label className="label">Kelas yang Diajar</label><div className="inputwrap"><BookOpen size={15}/><input value={kelasAjar} onChange={e => setKelasAjar(e.target.value)} placeholder="Contoh: X-A, X-B, XI-A" disabled={loading}/></div>
            </>}
            <label className="label">Email</label><div className="inputwrap"><Mail size={15}/><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Masukkan email" autoComplete="email" disabled={loading}/></div>
            <label className="label">Password</label><div className="inputwrap"><Lock size={15}/><input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 karakter" autoComplete="new-password" disabled={loading}/><button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}</button></div>
            <label className="label">Konfirmasi Password</label><div className="inputwrap"><Lock size={15}/><input type={showPassword2 ? "text" : "password"} value={password2} onChange={e => setPassword2(e.target.value)} placeholder="Ulangi password" autoComplete="new-password" disabled={loading}/><button type="button" className="password-toggle" onClick={() => setShowPassword2(v => !v)}>{showPassword2 ? <EyeOff size={15}/> : <Eye size={15}/>}</button></div>
            {error && <div className="login-error">{error}</div>}
            <button type="submit" className="btn-primary login-submit" disabled={loading}>{loading ? "Mendaftarkan..." : role === "student" ? "Daftar & Mulai Membaca →" : "Daftar & Masuk →"}</button>
          </form> : <form onSubmit={submitLogin}>
            <label className="label">Email</label><div className="inputwrap"><Mail size={15}/><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" autoComplete="username" disabled={loading}/></div>
            <label className="label">Password</label><div className="inputwrap"><Lock size={15}/><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Masukkan password" autoComplete="current-password" disabled={loading}/></div>
            {error && <div className="login-error">{error}</div>}
            <button type="submit" className="btn-primary login-submit" disabled={loading}><LogIn size={16}/>{loading ? "Memeriksa..." : "Masuk"}</button>
            <div className="demo-hint">Firebase Authentication aktif</div>
          </form>}
        </>}
      </div>
    </div>
    <div className="login-footer">AC-ITS E-Comic · Secure role-based learning space</div>
  </div>;
}
