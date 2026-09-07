import React, { useMemo, useState } from "react";
import ComicCard from "../../components/comic/ComicCard";

export default function ComicLibrary({ comics, navigate }) {
  const [q,setQ]=useState("");
  const visible=useMemo(()=>comics.filter(c=>c.status==="Published"&&c.title.toLowerCase().includes(q.toLowerCase())),[comics,q]);
  return <div><div className="page-kicker">Learning Content</div><h1 className="page-title">E-Comic Library</h1><p className="page-desc">Semua komik yang diterbitkan guru tersedia di sini.</p><div className="toolbar"><input className="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari komik..." /></div><div className="card-grid">{visible.map(c=><ComicCard key={c.id} comic={c} onOpen={id=>navigate("comic-reader",id)} />)}</div></div>;
}
