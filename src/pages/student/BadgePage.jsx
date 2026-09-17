import React from "react";
import { Award, Flame, BookOpen, Brain, Star, Trophy } from "lucide-react";
export default function BadgePage({studentModel}){
 const m=studentModel||{}; const conceptEntries=Object.values(m.concepts||{}); const conceptsMastered=conceptEntries.filter(x=>x.mastery>=.8).length; const correct=m.totalCorrect||0; const panels=Object.values(m.completedPanels||{}).reduce((a,b)=>a+Number(b||0),0);
 const badges=[
  ["First Reader","Baca E-Comic pertama",BookOpen,panels>=1],["Streak 3","Belajar 3 hari berturut-turut",Flame,(m.streak||0)>=3],["Concept Master","Kuasai satu konsep",Brain,conceptsMastered>=1],["Quiz Star","Jawab 10 soal benar",Star,correct>=10],["Explorer","Selesaikan 5 episode",Award,panels>=5],["Mastery 80","Overall mastery mencapai 80%",Trophy,(m.overallMastery||0)>=.8]
 ];
 return <div><div className="page-kicker">Achievement</div><h1 className="page-title">Badge</h1><p className="page-desc">Kumpulkan pencapaian dari aktivitas belajarmu.</p><div className="badge-grid">{badges.map(([n,d,I,got])=><div className={`achievement-card ${got?"earned":""}`} key={n}><div className="achievement-icon"><I/></div><strong>{n}</strong><span>{d}</span><small>{got?"✓ Diperoleh":"Belum diperoleh"}</small></div>)}</div></div>
}
