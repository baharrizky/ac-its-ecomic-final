import React from "react";
import { User, Mail, School, ShieldCheck, Users } from "lucide-react";
export default function ProfilePage({session}){
 return <div><div className="page-kicker">Account</div><h1 className="page-title">Profil Siswa</h1><p className="page-desc">Informasi akun dan kelas belajar yang terhubung.</p>
  <div className="profile-layout"><div className="profile-card"><div className="big-avatar">{(session?.name||"S")[0]}</div><h2>{session?.name||"Siswa"}</h2><span>{session?.educationLevel||"-"} · {session?.grade||"-"} {session?.rombel||""}</span></div>
  <div className="card"><div className="field-row"><User/><div><small>Nama</small><strong>{session?.name||"Siswa"}</strong></div></div><div className="field-row"><Mail/><div><small>Email</small><strong>{session?.email||"-"}</strong></div></div><div className="field-row"><School/><div><small>Sekolah</small><strong>{session?.school||"-"}</strong></div></div><div className="field-row"><Users/><div><small>Kelas</small><strong>{session?.grade||"-"} {session?.rombel||""}</strong></div></div><div className="field-row"><ShieldCheck/><div><small>Guru</small><strong>{session?.classTeacherName||"Belum terhubung"}</strong></div></div></div></div>
  {!session?.classId&&<div className="card" style={{marginTop:16}}><h2>Kelas belum terhubung</h2><p className="subtle">Kelas dipilih saat pendaftaran. Jika kelas tersebut belum dibuka oleh Guru, akun akan menunggu sampai kelas tersedia.</p></div>}
 </div>
}
