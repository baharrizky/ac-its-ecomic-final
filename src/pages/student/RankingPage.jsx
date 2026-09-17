import React from "react";
import { Medal } from "lucide-react";
export default function RankingPage({leaderboard=[],session}){
 const rows=leaderboard.slice().sort((a,b)=>(b.xp||0)-(a.xp||0));
 return <div><div className="page-kicker">Gamification</div><h1 className="page-title">Peringkat</h1><p className="page-desc">Peringkat berdasarkan XP siswa pada sekolah dan kelas yang sama.</p><div className="card">{rows.length?<table className="table"><thead><tr><th>#</th><th>Siswa</th><th>Kelas</th><th>Mastery</th><th>XP</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.uid||i}><td><strong>{i+1}</strong></td><td>{r.name}{r.uid===session?.uid?<span className="badge badge-blue" style={{marginLeft:7}}>Kamu</span>:null}</td><td>{r.grade||"-"} {r.rombel||""}</td><td>{Math.round((r.mastery||0)*100)}%</td><td><Medal size={15} style={{verticalAlign:"middle"}}/> {r.xp||0}</td></tr>)}</tbody></table>:<div className="empty-state"><strong>Belum ada data peringkat.</strong><span>Akan muncul setelah ada siswa lain pada kelas yang sama.</span></div>}</div></div>
}
