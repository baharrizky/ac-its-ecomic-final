import React, {useState} from "react";
import { ClipboardCheck, Clock3 } from "lucide-react";
export default function ExamPage({questions}){
 const [started,setStarted]=useState(false);
 return <div><div className="page-kicker">Assessment</div><h1 className="page-title">Ujian</h1><p className="page-desc">Ujian sumatif untuk mengukur penguasaan konsep setelah pembelajaran.</p>
 {!started?<div className="exam-card"><div className="exam-icon"><ClipboardCheck/></div><h2>Ujian Eksponen</h2><p>Evaluasi {questions.length} soal dengan cakupan konsep yang telah dipelajari.</p><div className="exam-meta"><span><ClipboardCheck size={15}/> {questions.length} soal</span><span><Clock3 size={15}/> 30 menit</span></div><button className="primary-btn" onClick={()=>setStarted(true)}>Mulai Ujian</button></div>
 :<div className="card"><h2>Ujian sedang dipersiapkan</h2><p className="page-desc">Pada tahap berikutnya, halaman ini akan memakai exam engine dan bank soal Firebase.</p></div>}
 </div>
}
