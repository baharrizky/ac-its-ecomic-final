import React from "react";
import { User, Mail, School, ShieldCheck, BookOpen } from "lucide-react";
export default function ProfilePage({session}){
  const name=session?.name||"Siswa", email=session?.email||"-", kelas=session?.kelas||"-", jenjang=session?.jenjang||"-", sekolah=session?.sekolah||"-";
  return <div><div className="page-kicker">Account</div><h1 className="page-title">Profil Siswa</h1><p className="page-desc">Informasi akun dan identitas pembelajaran.</p>
    <div className="profile-layout"><div className="profile-card"><div className="big-avatar">{name[0]}</div><h2>{name}</h2><span>Siswa · {kelas !== "-" ? `Kelas ${kelas}` : "Learning Space"}</span></div>
      <div className="card"><div className="field-row"><User/><div><small>Nama</small><strong>{name}</strong></div></div><div className="field-row"><Mail/><div><small>Email</small><strong>{email}</strong></div></div><div className="field-row"><School/><div><small>Asal Sekolah</small><strong>{sekolah}</strong></div></div><div className="field-row"><BookOpen/><div><small>Jenjang / Kelas</small><strong>{jenjang} · {kelas}</strong></div></div><div className="field-row"><ShieldCheck/><div><small>Status</small><strong>Akun aktif</strong></div></div></div></div>
  </div>
}
