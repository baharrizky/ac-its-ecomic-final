import React from "react";
import { Trophy, Medal } from "lucide-react";
export default function RankingPage({studentModel}){
 const rows=[["Siti","980"],["Ahmad",String(studentModel.xp)],["Budi","390"],["Dina","320"]];
 rows.sort((a,b)=>Number(b[1])-Number(a[1]));
 return <div><div className="page-kicker">Gamification</div><h1 className="page-title">Peringkat</h1><p className="page-desc">Papan peringkat berdasarkan XP pembelajaran.</p><div className="card"><div className="rank-list">{rows.map((r,i)=><div className={`rank-row ${r[0]==="Ahmad"?"me":""}`} key={r[0]}><span className="rank-number">{i+1}</span><div className="rank-avatar">{r[0][0]}</div><strong>{r[0]}</strong><span className="rank-xp">{r[1]} XP</span>{i<3&&<Medal size={18}/>}</div>)}</div></div></div>
}
