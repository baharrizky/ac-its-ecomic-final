import React from "react";
import { User, Mail, School, ShieldCheck } from "lucide-react";
export default function ProfilePage({session}){
  return <div><div className="page-kicker">Account</div><h1 className="page-title">Profil Siswa</h1><p className="page-desc">Informasi akun dan identitas pembelajaran.</p>
    <div className="profile-layout">
      <div className="profile-card"><div className="big-avatar">{(session?.name||"S")[0]}</div><h2>{session?.name||"Siswa"}</h2><span>Siswa · Level 2</span></div>
      <div className="card"><div className="field-row"><User/><div><small>Nama</small><strong>{session?.name||"Siswa"}</strong></div></div><div className="field-row"><Mail/><div><small>Email</small><strong>{session?.email||"-"}</strong></div></div><div className="field-row"><School/><div><small>Kelas</small><strong>{session?.grade ? `${session.grade} ${session.rombel||""}` : "-"}</strong></div></div><div className="field-row"><ShieldCheck/><div><small>Status</small><strong>Akun aktif</strong></div></div></div>
    </div>
  </div>
}
