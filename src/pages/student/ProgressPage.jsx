import React from "react";
import { TrendingUp } from "lucide-react";
import { concepts } from "../../data/demoData";
export default function ProgressPage({studentModel}){
 return <div><div className="page-kicker">Learning Analytics</div><h1 className="page-title">Progress Belajar</h1><p className="page-desc">Pantau perkembangan mastery setiap konsep.</p>
 <div className="stats-row"><div className="ac-stat"><div className="stat-icon green"><TrendingUp size={20}/></div><div><span>Overall Mastery</span><strong>{Math.round(studentModel.overallMastery*100)}%</strong></div></div><div className="ac-stat"><div className="stat-icon orange">🔥</div><div><span>Streak</span><strong>{studentModel.streak} hari</strong></div></div></div>
 <div className="card"><h2>Mastery Konsep</h2><div className="mastery-list">{Object.entries(studentModel.concepts).map(([id,p])=><div className="mastery-row" key={id}><div className="mastery-name"><strong>{id}</strong><span>{concepts[id]?.name || id}</span></div><div className="progress"><span style={{width:`${p.mastery*100}%`}}/></div><b>{Math.round(p.mastery*100)}%</b></div>)}</div></div>
 </div>
}
