import React,{useState} from "react";
import { GraduationCap, ShieldCheck, Users, ArrowLeft, LogIn } from "lucide-react";
import { demoAccounts, login } from "../services/authService";

export default function LoginPage({onLogin}){
  const [role,setRole]=useState(null);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  function choose(r){setRole(r);setError("");const a=demoAccounts[r];setEmail(a.email);setPassword("");}
  function submit(e){e.preventDefault();const res=login(role,email,password);if(!res.ok){setError(res.message);return}onLogin(res.session)}
  return <div className="login-page">
    <div className="login-brand"><div className="brand-symbol"><GraduationCap/></div><div><strong>AC-ITS</strong><span>E-Comic Learning Platform</span></div></div>
    <div className="login-shell">
      <div className="login-copy"><span className="page-kicker">ADAPTIVE E-COMIC LEARNING</span><h1>Belajar melalui cerita.<br/><em>Beradaptasi dengan kemampuanmu.</em></h1><p>Platform pembelajaran E-Comic dengan AI Tutor dan latihan adaptif. Siswa dan guru memiliki ruang kerja serta akses yang berbeda.</p><div className="login-features"><span><ShieldCheck size={17}/> Akses berbasis peran</span><span><Users size={17}/> Student & Teacher Space</span></div></div>
      <div className="login-card">
        {!role ? <><div className="login-card-head"><h2>Masuk ke AC-ITS</h2><p>Pilih jenis akun untuk melanjutkan.</p></div><button className="role-card" onClick={()=>choose("student")}><div className="role-icon student"><Users/></div><div><strong>Login Siswa</strong><span>Masuk ke ruang belajar, E-Comic, AI Tutor, dan latihan adaptif.</span></div><b>→</b></button><button className="role-card" onClick={()=>choose("teacher")}><div className="role-icon teacher"><GraduationCap/></div><div><strong>Login Guru</strong><span>Kelola E-Comic, materi, soal, analitik, dan kelas.</span></div><b>→</b></button></> : <form onSubmit={submit}><button type="button" className="back-login" onClick={()=>setRole(null)}><ArrowLeft size={15}/> Kembali</button><div className="login-card-head"><h2>Login {role === "teacher" ? "Guru" : "Siswa"}</h2><p>{role === "teacher" ? "Teacher Content & Analytics Space" : "Student Adaptive Learning Space"}</p></div><label className="label">Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)}/><label className="label">Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Masukkan password"/>{error&&<div className="login-error">{error}</div>}<button className="btn-primary login-submit"><LogIn size={16}/> Masuk</button><div className="demo-hint">Demo: <strong>{role === "teacher" ? "guru123" : "siswa123"}</strong></div></form>}
      </div>
    </div>
    <div className="login-footer">AC-ITS E-Comic · Secure role-based learning space</div>
  </div>
}
