import React,{useEffect,useState} from "react";
import { Send } from "lucide-react";
export default function ReflectionPage({session, reflections=[], onSave}){
 const [text,setText]=useState("");const [saved,setSaved]=useState(false);
 const mine=reflections.filter(r=>r.uid===session?.uid).slice().sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
 useEffect(()=>{if(mine[0]?.text&&!text)setText(mine[0].text)},[]);
 async function save(){if(!text.trim())return;await onSave({uid:session.uid,name:session.name,text:text.trim(),school:session.school||"",grade:session.grade||"",rombel:session.rombel||""});setSaved(true);}
 return <div><div className="page-kicker">Reflection</div><h1 className="page-title">Refleksi Belajar</h1><p className="page-desc">Tuliskan apa yang kamu pahami dan bagian mana yang masih membingungkan.</p><div className="card reflection-card"><h2>Apa yang kamu pelajari hari ini?</h2><textarea rows="8" value={text} onChange={e=>{setText(e.target.value);setSaved(false)}} placeholder="Tuliskan refleksimu..."/><button className="primary-btn" onClick={save}><Send size={16}/> Simpan Refleksi</button>{saved&&<div className="success-note">Refleksi tersimpan.</div>}</div><div className="card" style={{marginTop:16}}><h2>Riwayat Refleksi</h2>{mine.length?mine.map(r=><div className="list-item" key={r.id}><div><strong>{new Date(r.createdAt).toLocaleDateString("id-ID")}</strong><div className="subtle">{r.text}</div></div></div>):<div className="empty-state"><strong>Belum ada refleksi.</strong><span>Refleksi yang dikirim akan tersimpan di sini.</span></div>}</div></div>
}
