import React,{useState} from "react";
import { User, Mail, School, ShieldCheck, KeyRound } from "lucide-react";
export default function ProfilePage({session,onJoinAccess}){
 const [code,setCode]=useState("");const [msg,setMsg]=useState("");
 async function join(){if(!code.trim())return;const res=await onJoinAccess?.(code.trim());setMsg(res?.message||"Kode tidak ditemukan.");if(res?.ok)setCode("")}
 return <div><div className="page-kicker">Account</div><h1 className="page-title">Profil Siswa</h1><p className="page-desc">Informasi akun dan kelas belajar yang terhubung.</p>
  <div className="profile-layout"><div className="profile-card"><div className="big-avatar">{(session?.name||"S")[0]}</div><h2>{session?.name||"Siswa"}</h2><span>{session?.educationLevel||"-"} · {session?.grade||"-"} {session?.rombel||""}</span></div>
  <div className="card"><div className="field-row"><User/><div><small>Nama</small><strong>{session?.name||"Siswa"}</strong></div></div><div className="field-row"><Mail/><div><small>Email</small><strong>{session?.email||"-"}</strong></div></div><div className="field-row"><School/><div><small>Sekolah</small><strong>{session?.school||"-"}</strong></div></div><div className="field-row"><ShieldCheck/><div><small>Status</small><strong>Akun aktif</strong></div></div></div></div>
  <div className="card" style={{marginTop:16}}><div className="section-head"><div><h2>Gabung / Pindah Kelas</h2><span>Masukkan kode akses yang diberikan guru.</span></div><KeyRound size={22}/></div><div className="toolbar"><input className="search" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="Contoh: A7K2P9"/><button className="btn-primary" onClick={join}>Gunakan Kode</button></div>{msg&&<div className="success-note">{msg}</div>}</div>
 </div>
}
