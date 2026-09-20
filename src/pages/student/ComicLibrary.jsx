import React, { useMemo, useState } from "react";
import ComicCard from "../../components/comic/ComicCard";

export default function ComicLibrary({ comics, session, navigate }) {
  const [q,setQ]=useState("");
  const visible=useMemo(()=>comics.filter(c=>{
    const levelOk=!session?.educationLevel || (c.educationLevel || "SMA")===session.educationLevel;
    const gradeOk=!session?.grade || String(c.grade)===String(session.grade);
    const schoolOk=!session?.school || !c.school || c.school===session.school;
    return c.status==="Published" && levelOk && gradeOk && schoolOk && c.title.toLowerCase().includes(q.toLowerCase());
  }),[comics,q,session?.educationLevel,session?.grade,session?.school]);
  return <div><div className="page-kicker">Learning Content</div><h1 className="page-title">E-Comic Library</h1><p className="page-desc">Komik yang diterbitkan guru untuk sekolah, jenjang, dan kelas akun siswa akan ditampilkan bersama seluruh rombel yang terhubung.</p><div className="access-scope"><strong>{session?.educationLevel || "SMA"} · Kelas {session?.grade || "X"}</strong><span>Filter akses siswa aktif</span></div><div className="toolbar"><input className="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari komik..." /></div><div className="card-grid">{visible.map(c=><ComicCard key={c.id} comic={c} onOpen={id=>navigate("comic-reader",id)} />)}{visible.length===0&&<div className="card empty" style={{gridColumn:"1/-1"}}>Belum ada komik Published untuk jenjang dan kelas akun ini.</div>}</div></div>;
}
