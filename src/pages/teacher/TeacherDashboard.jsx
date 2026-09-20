import React,{useEffect,useMemo,useState} from "react";
import { BookOpen, BarChart3, Users, Plus, ArrowRight, Sparkles } from "lucide-react";
import { classLabel } from "../../utils/classLabel";

export default function TeacherDashboard({
  state,
  navigate,
  students=[],
  models=[],
  attempts=[],
  events=[],
  session,
  teacherClasses=[],
  onRefresh,
  onSeedPack,
  onAIRecommend
}){
 const [selectedUid,setSelectedUid]=useState("");
 const [result,setResult]=useState(null);
 const [loading,setLoading]=useState(false);

 const studentList=Array.isArray(students)?students:[];
 const classList=Array.isArray(teacherClasses)?teacherClasses:[];
 const modelList=Array.isArray(models)?models:[];
 const attemptList=Array.isArray(attempts)?attempts:[];
 const eventList=Array.isArray(events)?events:[];
 const comics=Array.isArray(state?.comics)?state.comics:[];

 const scopedStudents=studentList.filter(
   s =>
     !session?.uid ||
     s.classTeacherUid===session.uid ||
     classList.some(c=>c.id===s.classId)
 );

 useEffect(()=>{
   if(onRefresh) onRefresh();
 },[session?.uid]);

 const byUid=useMemo(
   ()=>new Map(modelList.map(m=>[m.uid,m])),
   [modelList]
 );

 const published=comics.filter(
   c=>c.status==="Published"
 ).length;

 const episodes=comics.reduce(
   (n,c)=>n+(c.episodes?.length||0),
   0
 );

 const selectedStudent=
   scopedStudents.find(s=>s.uid===selectedUid)||
   scopedStudents[0];
 const topMastery=useMemo(()=>{
   const rows=[];
   modelList.forEach(m=>Object.entries(m.concepts||{}).forEach(([id,p])=>{
     if(scopedStudents.some(s=>s.uid===m.uid)) rows.push({id,value:Number(p?.mastery||0)});
   }));
   const grouped=new Map();
   rows.forEach(r=>grouped.set(r.id,[...(grouped.get(r.id)||[]),r.value]));
   return [...grouped.entries()].map(([id,v])=>({id,value:v.reduce((a,b)=>a+b,0)/v.length})).sort((a,b)=>b.value-a.value).slice(0,3);
 },[modelList,scopedStudents]);
 const lowestMastery=useMemo(()=>{
   const rows=[];
   modelList.forEach(m=>Object.entries(m.concepts||{}).forEach(([id,p])=>{
     if(scopedStudents.some(s=>s.uid===m.uid)) rows.push({id,value:Number(p?.mastery||0)});
   }));
   const grouped=new Map();
   rows.forEach(r=>grouped.set(r.id,[...(grouped.get(r.id)||[]),r.value]));
   return [...grouped.entries()].map(([id,v])=>({id,value:v.reduce((a,b)=>a+b,0)/v.length})).sort((a,b)=>a.value-b.value).slice(0,3);
 },[modelList,scopedStudents]);

 const topMisconceptions=useMemo(()=>{
   const counts=new Map();
   modelList.filter(m=>scopedStudents.some(s=>s.uid===m.uid)).forEach(m=>(m.misconceptions||[]).filter(x=>!x.resolved).forEach(x=>{
     const key=x.tag||x.conceptId||"UNCLASSIFIED"; counts.set(key,(counts.get(key)||0)+1);
   }));
   return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3);
 },[modelList,scopedStudents]);


 async function recommend(){
   if(!selectedStudent||!onAIRecommend)return;

   setLoading(true);
   setResult(null);

   const model=
     byUid.get(selectedStudent.uid)||
     selectedStudent.model||
     {};

   const studentAttempts=
     attemptList
       .filter(a=>a.uid===selectedStudent.uid)
       .slice(0,25);

   const studentEvents=
     eventList
       .filter(e=>e.uid===selectedStudent.uid)
       .slice(0,25);

   try{
     setResult(
       await onAIRecommend({
         student:selectedStudent,
         studentModel:model,
         attempts:studentAttempts,
         events:studentEvents
       })
     );
   }finally{
     setLoading(false);
   }
 }

 return (
   <div>
     <div className="page-kicker">
       Teacher Workspace
     </div>

     <h1 className="page-title">
       Dashboard Guru
     </h1>

     <p className="page-desc">
       Kelola konten E-Comic, pantau perkembangan siswa,
       dan gunakan AI untuk rekomendasi pembelajaran individual.
     </p>

     <div className="stats-row">

       <div
         style={{
           gridColumn:"1/-1",
           display:"flex",
           justifyContent:"flex-end",
           marginBottom:-4
         }}
       >
         <button
           className="btn"
           onClick={onRefresh}
         >
           ↻ Perbarui data kelas & siswa
         </button>
       </div>

       <div className="ac-stat">
         <div className="stat-icon purple">
           <BookOpen/>
         </div>
         <div>
           <span>Total E-Comic</span>
           <strong>{comics.length}</strong>
         </div>
       </div>

       <div className="ac-stat">
         <div className="stat-icon green">
           <BookOpen/>
         </div>
         <div>
           <span>Published</span>
           <strong>{published}</strong>
         </div>
       </div>

       <div className="ac-stat">
         <div className="stat-icon orange">
           <BarChart3/>
         </div>
         <div>
           <span>Total Episode</span>
           <strong>{episodes}</strong>
         </div>
       </div>

       <div className="ac-stat">
         <div className="stat-icon blue">
           <Users/>
         </div>
         <div>
           <span>Siswa terdaftar</span>
           <strong>{scopedStudents.length}</strong>
         </div>
       </div>

     </div>

     <div className="dashboard-grid" style={{marginTop:18}}>
       <div className="card">
         <div className="section-head"><div><h2>Top Mastery</h2><span>Konsep yang paling dikuasai siswa</span></div></div>
         {topMastery.length ? topMastery.map(x=><div className="list-item" key={x.id}><strong>{x.id}</strong><b>{Math.round(x.value*100)}%</b></div>) : <div className="empty-state"><span>Belum ada data mastery.</span></div>}
       </div>
       <div className="card">
         <div className="section-head"><div><h2>Lowest Mastery</h2><span>Konsep yang paling perlu diperkuat</span></div></div>
         {lowestMastery.length ? lowestMastery.map(x=><div className="list-item" key={x.id}><strong>{x.id}</strong><b>{Math.round(x.value*100)}%</b></div>) : <div className="empty-state"><span>Belum ada data mastery.</span></div>}
       </div>
       <div className="card">
         <div className="section-head"><div><h2>Miskonsepsi Utama</h2><span>Pola yang paling sering muncul</span></div></div>
         {topMisconceptions.length ? topMisconceptions.map(([tag,n])=><div className="list-item" key={tag}><strong>{tag}</strong><b>{n} siswa</b></div>) : <div className="empty-state"><span>Belum ada miskonsepsi aktif.</span></div>}
       </div>
     </div>

     <div className="ac-hero">
       <div className="hero-copy">

         <span className="hero-label">
           TEACHER CONTENT STUDIO
         </span>

         <h2>
           Buat dan perbarui E-Comic sesuai kebutuhan kelas.
         </h2>

         <p>
           Guru tetap memegang kendali atas materi, episode,
           panel, konsep, dan bank soal. AI bekerja di atas data
           tersebut untuk evaluasi, adaptasi, dan rekomendasi.
         </p>

         <div className="hero-buttons">

           <button
             className="primary-btn"
             onClick={()=>navigate("comic-management")}
           >
             <Plus size={16}/>
             Kelola E-Comic
           </button>

           <button
             className="ghost-btn"
             onClick={()=>navigate("analytics")}
           >
             Lihat Analitik
             <ArrowRight size={16}/>
           </button>

         </div>

       </div>

       <div className="hero-illustration">
         <div className="hero-book">
           📚
         </div>
       </div>
     </div>

     <div
       className="card"
       style={{marginTop:18}}
     >

       <div className="section-head">
         <div>
           <h2>AI Teaching Assistant</h2>

           <span>
             Rekomendasi individual berdasarkan hasil latihan,
             penguasaan konsep, dan aktivitas belajar siswa.
           </span>
         </div>

         <Sparkles size={20}/>
       </div>

       {scopedStudents.length ? (

         <div className="register-grid">

           <div>

             <label className="label">
               Pilih siswa
             </label>

             <select
               value={selectedStudent?.uid||""}
               onChange={e=>{
                 setSelectedUid(e.target.value);
                 setResult(null);
               }}
             >

               {scopedStudents.map(s=>(
                 <option
                   value={s.uid}
                   key={s.uid}
                 >
                   {s.name} · {classLabel(s.grade,s.rombel)}
                 </option>
               ))}

             </select>

           </div>

           <div
             style={{
               display:"flex",
               alignItems:"end"
             }}
           >

             <button
               className="btn-primary"
               onClick={recommend}
               disabled={loading||!selectedStudent}
             >
               {loading
                 ?"AI menganalisis…"
                 :"✨ Analisis & rekomendasikan"
               }
             </button>

           </div>

         </div>

       ) : (

         <div className="empty-state">
           <strong>
             Belum ada siswa terdaftar.
           </strong>

           <span>
             Rekomendasi AI akan tersedia setelah data siswa
             dan aktivitas pembelajaran masuk.
           </span>
         </div>

       )}

       {result && (
         <div
           className="ai-feedback"
           style={{marginTop:14}}
         >

           <strong>
             {result.ai===false
               ?"Rekomendasi pembelajaran"
               :"Rekomendasi AI"
             }
           </strong>

           <p>
             {result.summary}
           </p>

           {result.priorityConcepts?.length>0 && (
             <div style={{marginTop:8}}>
               <b>Prioritas konsep:</b>{" "}
               {result.priorityConcepts.join(", ")}
             </div>
           )}

           {result.recommendations?.length>0 && (
             <ul style={{margin:"8px 0 0 18px"}}>
               {result.recommendations.map((x,i)=>(
                 <li key={i}>{x}</li>
               ))}
             </ul>
           )}

           {result.nextActivity && (
             <div style={{marginTop:8}}>
               <b>Langkah berikutnya:</b>{" "}
               {result.nextActivity}
             </div>
           )}

           {result.teacherNote && (
             <div style={{marginTop:8}}>
               <b>Catatan guru:</b>{" "}
               {result.teacherNote}
             </div>
           )}

         </div>
       )}

     </div>

     <div
       className="dashboard-grid"
       style={{marginTop:18}}
     >

       <section>

         <div className="section-head">
           <div>
             <h2>Konten Terbaru</h2>
             <span>Comic yang sedang dikelola</span>
           </div>
         </div>

         <div className="comic-mini-grid">

           {comics.slice(0,2).map(c=>(
             <div
               className="ac-comic-mini"
               key={c.id}
             >

               <div className="mini-cover">
                 📖
               </div>

               <div className="mini-body">

                 <span className="mini-tag">
                   {c.status}
                 </span>

                 <h3>{c.title}</h3>

                 <p>{c.description}</p>

                 <button
                   className="primary-btn small"
                   onClick={()=>
                     navigate("comic-editor",c.id)
                   }
                 >
                   Edit Content
                   <ArrowRight size={14}/>
                 </button>

               </div>

             </div>
           ))}

         </div>

       </section>

       <aside>

         <div className="section-head">
           <div>
             <h2>Quick Actions</h2>
             <span>Akses cepat guru</span>
           </div>
         </div>

         <div
           className="card"
           style={{
             display:"flex",
             flexDirection:"column",
             gap:8
           }}
         >

           <button
             className="btn"
             onClick={()=>
               navigate("comic-management")
             }
           >
             + Buat E-Comic baru
           </button>

           <button
             className="btn"
             onClick={()=>
               navigate("question-bank")
             }
           >
             + Kelola Bank Soal
           </button>

           <button
             className="btn"
             onClick={()=>
               navigate("analytics")
             }
           >
             ↗ Lihat mastery siswa
           </button>

         </div>

       </aside>

     </div>

   </div>
 );
}