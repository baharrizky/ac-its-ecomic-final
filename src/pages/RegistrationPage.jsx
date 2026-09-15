import React,{useState} from "react";
import { ArrowLeft, CheckCircle2, GraduationCap, LogIn, ShieldCheck, UserPlus, Users } from "lucide-react";
import { registerAccount } from "../services/authService";

const SCHOOL_OPTIONS = {
  SMP: [
    "SMP Negeri 1 Kota Jambi", "SMP Negeri 2 Kota Jambi", "SMP Negeri 3 Kota Jambi", "SMP Negeri 4 Kota Jambi",
    "SMP Negeri 5 Kota Jambi", "SMP Negeri 6 Kota Jambi", "SMP Negeri 7 Kota Jambi", "SMP Negeri 8 Kota Jambi",
    "SMP Negeri 9 Kota Jambi", "SMP Negeri 10 Kota Jambi", "SMP Negeri 11 Kota Jambi", "SMP Negeri 12 Kota Jambi",
    "SMP Negeri 13 Kota Jambi", "SMP Negeri 14 Kota Jambi", "SMP Negeri 15 Kota Jambi", "SMP Negeri 16 Kota Jambi",
    "SMP Negeri 17 Kota Jambi", "SMP Negeri 18 Kota Jambi", "SMP Negeri 19 Kota Jambi", "SMP Negeri 20 Kota Jambi",
    "SMP Negeri 21 Kota Jambi", "SMP Negeri 22 Kota Jambi"
  ],
  SMA: [
    "SMA Negeri 1 Kota Jambi", "SMA Negeri 2 Kota Jambi", "SMA Negeri 3 Kota Jambi", "SMA Negeri 4 Kota Jambi",
    "SMA Negeri 5 Kota Jambi", "SMA Negeri 6 Kota Jambi", "SMA Negeri 7 Kota Jambi", "SMA Negeri 8 Kota Jambi",
    "SMA Negeri 9 Kota Jambi", "SMA Negeri 10 Kota Jambi", "SMA Negeri 11 Kota Jambi", "SMA Negeri 12 Kota Jambi",
    "SMA Negeri 13 Kota Jambi"
  ]
};
const GRADE_OPTIONS = { SMP:["VII","VIII","IX"], SMA:["X","XI","XII"] };
const ROMBEL_OPTIONS = Array.from({length:12},(_,i)=>String(i+1));

export default function RegistrationPage({onRegister,onBack}){
  const [role,setRole]=useState("student");
  const [form,setForm]=useState({name:"",email:"",password:"",confirmPassword:"",educationLevel:"SMA",grade:"X",rombel:"1",school:""});
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const set=(key,value)=>setForm(f=>({...f,[key]:value}));
  async function submit(e){
    e.preventDefault(); setError(""); setLoading(true);
    const res=await registerAccount({...form,role});
    setLoading(false);
    if(!res.ok){setError(res.message);return;}
    onRegister(res.session);
  }
  return <div className="login-page">
    <div className="login-brand"><div className="brand-symbol"><GraduationCap/></div><div><strong>AC-ITS</strong><span>E-Comic Learning Platform</span></div></div>
    <div className="login-shell">
      <div className="login-copy"><span className="page-kicker">CREATE YOUR LEARNING SPACE</span><h1>Buat akun.<br/><em>Mulai perjalanan belajarmu.</em></h1><p>Daftarkan akun siswa atau guru untuk mendapatkan ruang belajar yang sesuai dengan peran dan jenjang pendidikan.</p><div className="login-features"><span><ShieldCheck size={17}/> Akses berbasis peran</span><span><CheckCircle2 size={17}/> Profil belajar tersimpan</span><span><Users size={17}/> SMP & SMA terpisah</span></div></div>
      <div className="login-card">
        <button type="button" className="back-login" onClick={onBack}><ArrowLeft size={15}/> Kembali ke login</button>
        <div className="login-card-head"><h2>Daftar akun</h2><p>Pilih jenis akun yang akan digunakan.</p></div>
        <div className="register-roles">
          <button type="button" className={`register-role ${role==="student"?"active":""}`} onClick={()=>setRole("student")}><Users size={18}/><span><strong>Siswa</strong><small>Ruang belajar & latihan adaptif</small></span></button>
          <button type="button" className={`register-role ${role==="teacher"?"active":""}`} onClick={()=>setRole("teacher")}><GraduationCap size={18}/><span><strong>Guru</strong><small>Konten, soal & analitik</small></span></button>
        </div>
        <form onSubmit={submit}>
          <label className="label">Nama lengkap</label><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder={role==="teacher"?"Nama guru":"Nama siswa"} autoComplete="name"/>
          <label className="label">Email</label><input type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="nama@email.com" autoComplete="email"/>
          <div className="register-grid"><div><label className="label">Jenjang</label><select value={form.educationLevel} onChange={e=>{const level=e.target.value;setForm(f=>({...f,educationLevel:level,grade:GRADE_OPTIONS[level][0],school:"",rombel:"1"}))}}><option>SMP</option><option>SMA</option></select></div><div><label className="label">Tingkat kelas</label><select value={form.grade} onChange={e=>set("grade",e.target.value)}>{GRADE_OPTIONS[form.educationLevel].map(g=><option key={g}>{g}</option>)}</select></div></div>
          <label className="label">Sekolah</label><select value={form.school} onChange={e=>set("school",e.target.value)}><option value="">Pilih sekolah {form.educationLevel}</option>{SCHOOL_OPTIONS[form.educationLevel].map(school=><option key={school} value={school}>{school}</option>)}<option value="Sekolah lainnya">Sekolah lainnya</option></select>
          {role==="student" && <div className="register-grid"><div><label className="label">Rombel</label><select value={form.rombel} onChange={e=>set("rombel",e.target.value)}>{ROMBEL_OPTIONS.map(n=><option key={n} value={n}>{form.grade} {n}</option>)}</select></div><div><label className="label">Contoh kelas</label><div className="field-preview">{form.grade} {form.rombel}</div></div></div>}
          <label className="label">Password</label><input type="password" value={form.password} onChange={e=>set("password",e.target.value)} placeholder="Minimal 6 karakter" autoComplete="new-password"/>
          <label className="label">Konfirmasi password</label><input type="password" value={form.confirmPassword} onChange={e=>set("confirmPassword",e.target.value)} placeholder="Ulangi password" autoComplete="new-password"/>
          {error&&<div className="login-error">{error}</div>}
          <button className="btn-primary login-submit" disabled={loading}><UserPlus size={16}/> {loading?"Membuat akun...":"Buat Akun"}</button>
        </form>
        <div className="register-note">Dengan membuat akun, profil jenjang/kelas siswa akan digunakan untuk memfilter E-Comic yang tersedia.</div>
      </div>
    </div>
    <div className="login-footer">AC-ITS E-Comic · Secure role-based learning space</div>
  </div>
}
