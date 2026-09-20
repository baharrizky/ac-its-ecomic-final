import React from "react";
import { TrendingUp } from "lucide-react";
export default function ProgressPage({studentModel={},concepts=[]}){
 const entries=Object.entries(studentModel?.concepts||{}).sort(([,a],[,b])=>Number(b?.mastery||0)-Number(a?.mastery||0));
 return <div><div className="page-kicker">Learning Analytics</div><h1 className="page-title">Progress Belajar</h1><p className="page-desc">Pantau perkembangan mastery berdasarkan aktivitas pembelajaran dan hasil latihan. Konsep diurutkan dari yang paling dikuasai hingga yang perlu diperkuat.</p>
 <div className="stats-row"><div className="ac-stat"><div className="stat-icon green"><TrendingUp size={20}/></div><div><span>Overall Mastery</span><strong>{Math.round(Number(studentModel.overallMastery||0)*100)}%</strong></div></div><div className="ac-stat"><div className="stat-icon orange">🔥</div><div><span>Streak</span><strong>{studentModel.streak||0} hari</strong></div></div></div>
 <div className="card"><h2>Mastery Konsep</h2>{entries.length?<div className="mastery-list">{entries.map(([id,p])=><div className="mastery-row" key={id}><div className="mastery-name"><strong>{concepts.find(c=>c.id===id)?.name || id}</strong><span>{Number(p?.attempts||0)} percobaan · {Number(p?.correct||0)} benar</span></div><div className="progress"><span style={{width:`${Math.max(0,Math.min(100,Number(p?.mastery||0)*100))}%`}}/></div><b>{Math.round(Number(p?.mastery||0)*100)}%</b></div>)}</div>:<div className="empty-state"><strong>Belum ada data mastery.</strong><span>Mastery akan terbentuk setelah kamu mempelajari materi dan mengerjakan latihan.</span></div>}</div>
 </div>
}
