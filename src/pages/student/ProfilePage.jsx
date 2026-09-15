import React from "react";
import { User, Mail, School, ShieldCheck } from "lucide-react";
export default function ProfilePage(){
  return <div><div className="page-kicker">Account</div><h1 className="page-title">Profil Siswa</h1><p className="page-desc">Informasi akun dan identitas pembelajaran.</p>
    <div className="profile-layout">
      <div className="profile-card"><div className="big-avatar">A</div><h2>Ahmad</h2><span>Siswa · Level 2</span></div>
      <div className="card"><div className="field-row"><User/><div><small>Nama</small><strong>Ahmad</strong></div></div><div className="field-row"><Mail/><div><small>Email</small><strong>demo@student.local</strong></div></div><div className="field-row"><School/><div><small>Kelas</small><strong>X IPA 1</strong></div></div><div className="field-row"><ShieldCheck/><div><small>Status</small><strong>Akun aktif</strong></div></div></div>
    </div>
  </div>
}
