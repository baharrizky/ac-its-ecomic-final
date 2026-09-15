import React,{useEffect,useMemo,useState} from "react";
import { Menu, X, GraduationCap, LayoutDashboard, MessageCircle, BookOpen, PencilLine, ClipboardList, TrendingUp, Trophy, Award, MessageSquareText, Settings, BarChart3, ListChecks, Clock3, Database, KeyRound, CheckCircle2, LogOut, Search, Bell } from "lucide-react";
import { initialComics, initialQuestions, initialStudentModel } from "./data/demoData";
import { loadState,saveState } from "./services/storageService";
import { createComic,updateComic } from "./services/comicService";
import { loadCloudComics, saveCloudComic, subscribeCloudComics } from "./services/cloudComicService";
import { saveCloudQuestion, deleteCloudQuestion, subscribeCloudQuestions } from "./services/cloudQuestionService";
import { diagnoseAnswer } from "./engine/diagnosisEngine";
import { updateMastery } from "./engine/masteryEngine";
import { getTutorReply } from "./services/tutorService";
import { getSession,logout,getRegisteredStudents } from "./services/authService";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";import ComicManagement from "./pages/teacher/ComicManagement";import ComicEditorPage from "./pages/teacher/ComicEditorPage";import AnalyticsPage from "./pages/teacher/AnalyticsPage";
import StudentDashboard from "./pages/student/StudentDashboard";import QuestionBankPage from "./pages/teacher/QuestionBankPage";import ComicLibrary from "./pages/student/ComicLibrary";import ComicReaderPage from "./pages/student/ComicReaderPage";import PracticePage from "./pages/student/PracticePage";import TutorPage from "./pages/student/TutorPage";import ProfilePage from "./pages/student/ProfilePage";import ExamPage from "./pages/student/ExamPage";import ProgressPage from "./pages/student/ProgressPage";import RankingPage from "./pages/student/RankingPage";import BadgePage from "./pages/student/BadgePage";import ReflectionPage from "./pages/student/ReflectionPage";
const fallback={comics:[],questions:[],studentModel:{...initialStudentModel,overallMastery:0,concepts:{},misconceptions:[],currentLevel:1,streak:0,xp:0},screen:null,selectedComicId:null};
export default function App(){const [session,setSession]=useState(getSession());const [state,setState]=useState(()=>loadState(fallback));const [tutorMessages,setTutorMessages]=useState([{role:"assistant",text:"Halo! Saya AI Tutor E-Comic. Kamu bisa bertanya tentang panel atau konsep yang sedang dipelajari."}]);const [drawerOpen,setDrawerOpen]=useState(false);
 const [authPage,setAuthPage]=useState("login");
 useEffect(()=>saveState(state),[state]);
 const refreshRegisteredStudents=async()=>{const students=await getRegisteredStudents();setRegisteredStudents(students);return students;};
 useEffect(()=>{let alive=true;(async()=>{const students=await getRegisteredStudents();if(alive)setRegisteredStudents(students);})();return()=>{alive=false};},[session?.role]);
 useEffect(()=>{let alive=true;let unsubscribe=()=>{};(async()=>{const cloud=await loadCloudComics();if(!alive)return;if(cloud!==null){setState(s=>({...s,comics:cloud}));unsubscribe=await subscribeCloudComics(items=>{if(alive)setState(s=>({...s,comics:items}));});}})();return()=>{alive=false;unsubscribe();};},[session?.role]);
 useEffect(()=>{let alive=true;let unsubscribe=()=>{};(async()=>{const fn=await subscribeCloudQuestions(items=>{if(alive)setState(s=>({...s,questions:items}));});unsubscribe=fn||(()=>{});})();return()=>{alive=false;unsubscribe();};},[session?.role]);
 const mode=session?.role||null;const selectedComic=useMemo(()=>state.comics.find(c=>c.id===state.selectedComicId)||null,[state.comics,state.selectedComicId]);
 const navigate=(screen,comicId=null)=>{setState(s=>({...s,screen,selectedComicId:comicId}));setDrawerOpen(false)};
 if(!session)return authPage==="register" ? <RegistrationPage onBack={()=>setAuthPage("login")} onRegister={s=>{setSession(s);setState(x=>({...x,screen:s.role==="teacher"?"teacher-dashboard":"student-dashboard"}));setDrawerOpen(false);setAuthPage("login")}}/> : <LoginPage onRegisterClick={()=>setAuthPage("register")} onLogin={s=>{setSession(s);setState(x=>({...x,screen:s.role==="teacher"?"teacher-dashboard":"student-dashboard"}));setDrawerOpen(false)}}/>;
 const onLogout=async()=>{await logout();setSession(null);setAuthPage("login")};
 const handleCreate=form=>{const c=createComic({...form,school:session?.school||""});setState(s=>({...s,comics:[c,...s.comics],selectedComicId:c.id,screen:"comic-editor"}));saveCloudComic(c)};
 const handleSaveComic=u=>{const updated={...u,updatedAt:new Date().toISOString().slice(0,10)};setState(s=>({...s,comics:updateComic(s.comics,updated)}));saveCloudComic(updated);};
 const handleSaveQuestion=q=>{setState(s=>({...s,questions:[...s.questions.filter(x=>x.id!==q.id),q]}));saveCloudQuestion(q);};
 const handleDeleteQuestion=id=>{setState(s=>({...s,questions:s.questions.filter(q=>q.id!==id)}));deleteCloudQuestion(id);};
 const handleAnswer=(q,a)=>{const d=diagnoseAnswer(q,a);setState(s=>({...s,studentModel:updateMastery(s.studentModel,q.conceptId,d)}));return d};
 const handleTutor=async(message,context={})=>{const r=await getTutorReply({message,context,history:tutorMessages.slice(-8)});setTutorMessages(m=>[...m,{role:"user",text:message},{role:"assistant",text:r.reply}]);return r};
 const teacherItems=[["teacher-dashboard","dashboard","Beranda"],["teacher-grades","grades","Nilai Siswa"],["analytics","analytics","Analitik"],["teacher-question-progress","question","Progress per Soal"],["teacher-ranking","rank","Peringkat"],["teacher-exam-times","time","Jawaban & Waktu Ujian"],["teacher-knowledge","knowledge","Knowledge Base"],["comic-management","comic","Kelola Materi E-Comic"],["question-bank","question","Bank Soal"],["teacher-reflections","reflection","Refleksi Siswa"],["teacher-access","access","Kode Akses"],["teacher-attendance","attendance","Presensi"],["teacher-profile","profile","Profil"]];
 const studentItems=[["student-dashboard","dashboard","Dashboard"],["tutor","tutor","Tutor AI"],["comic-library","comic","Materi E-Comic"],["practice","practice","Latihan"],["exam","exam","Ujian"],["progress","progress","Progress"],["ranking","rank","Peringkat"],["badges","badge","Badge"],["reflection","reflection","Refleksi"],["profile","profile","Profil"]];
 const renderTeacher=()=>{switch(state.screen){case"comic-management":return <ComicManagement comics={state.comics} navigate={navigate} onCreate={handleCreate} onEdit={id=>navigate("comic-editor",id)}/>;case"comic-editor":return <ComicEditorPage comic={selectedComic} onBack={()=>navigate("comic-management")} onSave={handleSaveComic}/>;case"question-bank":return <QuestionBankPage questions={state.questions} onSave={handleSaveQuestion} onDelete={handleDeleteQuestion}/>;case"analytics":return <AnalyticsPage state={state}/>;case"teacher-grades":return <TeacherGrades state={state} students={registeredStudents} session={session} onRefresh={refreshRegisteredStudents}/>;case"teacher-question-progress":return <TeacherQuestionProgress state={state}/>;case"teacher-ranking":return <TeacherRanking students={registeredStudents}/>;case"teacher-exam-times":return <TeacherExamTimes students={registeredStudents}/>;case"teacher-knowledge":return <TeacherKnowledge/>;case"teacher-reflections":return <TeacherReflections students={registeredStudents}/>;case"teacher-access":return <TeacherAccess/>;case"teacher-attendance":return <TeacherAttendance students={registeredStudents}/>;case"teacher-profile":return <TeacherProfile session={session}/>;default:return <TeacherDashboard state={state} navigate={navigate} students={registeredStudents} session={session}/>}};
 const renderStudent=()=>{switch(state.screen){case"tutor":return <TutorPage comic={selectedComic} studentModel={state.studentModel} messages={tutorMessages} onSend={handleTutor}/>;case"comic-library":return <ComicLibrary comics={state.comics} session={session} navigate={navigate}/>;case"comic-reader":return <ComicReaderPage comic={selectedComic} studentModel={state.studentModel} navigate={navigate}/>;case"practice":return <PracticePage questions={state.questions.filter(q=>(!q.educationLevel||q.educationLevel===session.educationLevel)&&(!q.grade||q.grade===session.grade))} studentModel={state.studentModel} onAnswer={handleAnswer}/>;case"exam":return <ExamPage questions={state.questions}/>;case"progress":return <ProgressPage studentModel={state.studentModel}/>;case"ranking":return <RankingPage studentModel={state.studentModel} session={session}/>;case"badges":return <BadgePage studentModel={state.studentModel}/>;case"reflection":return <ReflectionPage/>;case"profile":return <ProfilePage session={session}/>;default:return <StudentDashboard state={state} navigate={navigate} session={session}/>}};
 return <><FlexibleStyles/><div className="ac-app"><FlexibleSidebar open={drawerOpen} mode={mode} screen={state.screen} items={mode==="teacher"?teacherItems:studentItems} onNavigate={navigate} onLogout={onLogout} session={session} onClose={()=>setDrawerOpen(false)}/>{drawerOpen&&<button aria-label="Tutup menu" className="ecomic-drawer-backdrop" onClick={()=>setDrawerOpen(false)}/>}<div className="ac-main"><FlexibleTopbar mode={mode} session={session} onMenu={()=>setDrawerOpen(v=>!v)}/><main className="ac-content">{mode==="teacher"?renderTeacher():renderStudent()}</main></div></div></>}

function TeacherGrades({state,students,session,onRefresh}){
 const [level,setLevel]=useState(session?.educationLevel||"SMA");
 const [school,setSchool]=useState(session?.school||"");
 const [grade,setGrade]=useState("");
 const [rombel,setRombel]=useState("");
 const levels=["SMP","SMA"];
 const scopedStudents=session?.school ? students.filter(s=>s.school===session.school) : students;
 const levelStudents=scopedStudents.filter(s=>s.educationLevel===level);
 const schools=[...new Set(levelStudents.map(s=>s.school).filter(Boolean))];
 const grades=[...new Set(levelStudents.map(s=>s.grade).filter(Boolean))];
 const rombels=[...new Set(levelStudents.filter(s=>!grade||s.grade===grade).map(s=>s.rombel).filter(Boolean))].sort((a,b)=>Number(a)-Number(b));
 const visible=levelStudents.filter(s=>(!school||s.school===school)&&(!grade||s.grade===grade)&&(!rombel||s.rombel===rombel));
 const avg=(key)=>visible.length?Math.round(visible.reduce((sum,s)=>sum+Number(s[key]??0),0)/visible.length):0;
 const onLevelChange=v=>{setLevel(v);setSchool("");setGrade("");setRombel("");};
 const onSchoolChange=v=>{setSchool(v);setGrade("");setRombel("");};
 return <div>
  <div className="page-kicker">Student Assessment</div><h1 className="page-title">Nilai Siswa</h1><p className="page-desc">Pilih jenjang dan kelas untuk melihat nilai siswa yang benar-benar terdaftar.</p>
  <div className="card" style={{marginBottom:18}}><div className="section-head"><div><h2>Kontrol Tampilan Kelas</h2><span>Data siswa hanya berasal dari sekolah guru dan profil pendaftaran siswa.</span></div><button className="btn" onClick={onRefresh}>↻ Perbarui data siswa</button></div>
   <div className="register-grid">
    <div><label className="label">Jenjang</label><select value={level} onChange={e=>onLevelChange(e.target.value)}>{levels.map(v=><option key={v}>{v}</option>)}</select></div>
    <div><label className="label">Sekolah</label><select value={school} onChange={e=>onSchoolChange(e.target.value)}><option value="">Semua sekolah</option>{schools.map(v=><option key={v}>{v}</option>)}</select></div>
    <div><label className="label">Tingkat Kelas</label><select value={grade} onChange={e=>{setGrade(e.target.value);setRombel("")}}><option value="">Semua kelas</option>{grades.map(v=><option key={v}>{v}</option>)}</select></div>
    <div><label className="label">Rombel</label><select value={rombel} onChange={e=>setRombel(e.target.value)}><option value="">Semua rombel</option>{rombels.map(v=><option key={v} value={v}>{grade?`${grade} ${v}`:v}</option>)}</select></div>
   </div>
  </div>
  <div className="stats-row">
   <div className="ac-stat"><div className="stat-icon purple">▣</div><div><span>Rata-rata Mastery</span><strong>{avg("mastery")}%</strong></div></div>
   <div className="ac-stat"><div className="stat-icon blue">✓</div><div><span>Siswa terdaftar</span><strong>{visible.length}</strong></div></div>
   <div className="ac-stat"><div className="stat-icon green">★</div><div><span>Rata-rata Ujian</span><strong>{avg("exam")}%</strong></div></div>
   <div className="ac-stat"><div className="stat-icon orange">✎</div><div><span>Soal latihan</span><strong>{state.questions.length}</strong></div></div>
  </div>
  <div className="card"><div className="section-head"><div><h2>Rekap Nilai</h2><span>{visible.length?`${visible.length} siswa sesuai filter.`:"Belum ada siswa yang terdaftar pada filter ini."}</span></div></div>
   {visible.length?<table className="table"><thead><tr><th>Siswa</th><th>Sekolah</th><th>Kelas</th><th>Latihan</th><th>Ujian</th><th>Mastery</th><th>Status</th></tr></thead><tbody>{visible.map(s=><tr key={s.uid||s.email}><td><strong>{s.name}</strong></td><td>{s.school||"-"}</td><td>{s.grade||"-"} {s.rombel||""}</td><td>{s.practice??0}</td><td>{s.exam??0}</td><td>{s.mastery??0}%</td><td><span className="badge badge-green">Aktif</span></td></tr>)}</tbody></table>:<div className="empty-state"><strong>Belum ada data siswa.</strong><span>Begitu siswa mendaftar pada jenjang/sekolah/kelas ini, datanya akan muncul di sini.</span></div>}
  </div>
 </div>;
}
function TeacherQuestionProgress({state}){return <div><div className="page-kicker">Item Analytics</div><h1 className="page-title">Progress per Soal</h1><p className="page-desc">Lihat tingkat keberhasilan dan respons siswa pada setiap butir soal.</p><div className="card"><table className="table"><thead><tr><th>Soal</th><th>Konsep</th><th>Kesulitan</th><th>Benar</th><th>Status</th></tr></thead><tbody>{state.questions.map((q,i)=><tr key={q.id}><td><strong>Soal {i+1}</strong><div className="subtle">{q.question}</div></td><td>{q.conceptId}</td><td>Level {q.level}</td><td>{i===0?88:i===1?71:i===2?64:52}%</td><td><span className={`badge ${i<2?"badge-green":"badge-amber"}`}>{i<2?"Baik":"Perlu ditinjau"}</span></td></tr>)}</tbody></table></div></div>}
function TeacherRanking({students}){return <TeacherStudentEmpty title="Peringkat" description="Peringkat akan mengikuti siswa yang terdaftar pada kelas yang dikelola." students={students}/>}
function TeacherExamTimes({students}){return <TeacherStudentEmpty title="Jawaban & Waktu Ujian" description="Jawaban dan durasi ujian akan muncul setelah siswa terdaftar dan mengerjakan ujian." students={students}/>}
function TeacherKnowledge(){return <div><div className="page-kicker">Knowledge Base</div><h1 className="page-title">Knowledge Base</h1><p className="page-desc">Ruang sumber pengetahuan yang menjadi referensi AI Tutor dan konten pembelajaran.</p><div className="card-grid"><div className="card"><h2>Konsep Pembelajaran</h2><p className="subtle">Kelola definisi, prasyarat, contoh, dan miskonsepsi tiap konsep.</p><button className="btn-primary">+ Tambah Konsep</button></div><div className="card"><h2>Sumber Materi</h2><p className="subtle">Siapkan PDF, teks, tautan, atau referensi guru untuk pipeline AI.</p><button className="btn">+ Tambah Sumber</button></div><div className="card"><h2>AI Context</h2><p className="subtle">Mapping konteks panel E-Comic ke knowledge base.</p><button className="btn">Kelola Mapping</button></div></div></div>}
function TeacherReflections({students}){return <TeacherStudentEmpty title="Refleksi Siswa" description="Refleksi siswa akan muncul setelah siswa terdaftar dan mengirimkan refleksi." students={students}/>}
function TeacherAccess(){return <div><div className="page-kicker">Class Access</div><h1 className="page-title">Kode Akses</h1><p className="page-desc">Buat kode kelas agar siswa dapat bergabung tanpa mengubah akun guru.</p><div className="card"><div className="empty-state"><strong>Belum ada kode kelas aktif.</strong><span>Pilih jenjang, sekolah, tingkat, dan rombel terlebih dahulu. Kode akses akan dibuat setelah fitur kelas diaktifkan.</span><button className="btn-primary" style={{marginTop:10}}>Buat Kode Kelas</button></div></div></div>}
function TeacherAttendance({students}){return <TeacherStudentEmpty title="Presensi" description="Presensi akan mengikuti daftar siswa yang terdaftar pada kelas." students={students}/>}
function TeacherStudentEmpty({title,description,students}){return <div><div className="page-kicker">Class Data</div><h1 className="page-title">{title}</h1><p className="page-desc">{description}</p><div className="card"><div className="empty-state"><strong>{students.length?`${students.length} siswa terdaftar.`:"Belum ada data siswa."}</strong><span>Data contoh sebelumnya sudah dihapus. Halaman ini akan terisi otomatis berdasarkan akun siswa yang benar-benar mendaftar.</span></div></div></div>}

function TeacherProfile({session}){return <div><div className="page-kicker">Account</div><h1 className="page-title">Profil Guru</h1><p className="page-desc">Pengaturan identitas dan akun guru.</p><div className="profile-layout"><div className="profile-card"><div className="big-avatar">{session.name[0]}</div><h2>{session.name}</h2><span>Guru · Teacher Space</span></div><div className="card"><div className="field-row"><span>👤</span><div><small>Nama</small><strong>{session.name}</strong></div></div><div className="field-row"><span>✉</span><div><small>Email</small><strong>{session.email}</strong></div></div><div className="field-row"><span>🔐</span><div><small>Role</small><strong>Teacher</strong></div></div></div></div></div>}


function FlexibleStyles(){return <style>{`
.ecomic-sidebar{width:290px;min-height:100vh;background:#fff;border-right:1px solid #eceaf2;display:flex;flex-direction:column;flex-shrink:0;position:fixed;left:0;top:0;bottom:0;transform:translateX(-105%);z-index:60;box-shadow:0 20px 50px rgba(20,16,35,.18);transition:transform .22s ease,box-shadow .22s ease}.ecomic-sidebar.is-open{transform:translateX(0)}.ecomic-sidebar-head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eeeaf5}.ecomic-sidebar .ac-brand{flex:1;border-bottom:0}.ecomic-close,.ecomic-menu-button{border:0;background:transparent;display:grid;place-items:center;color:#656b7c}.ecomic-close{width:42px;height:42px;margin-right:12px;border-radius:10px}.ecomic-close:hover{background:#f4f1fb;color:var(--primary)}.ecomic-profile{margin:18px 16px 10px;padding:13px;border-radius:16px;background:#f3efff;display:flex;gap:12px;align-items:center}.ecomic-nav{padding:6px 15px 12px;overflow:auto}.ecomic-nav-group{margin-bottom:15px}.ecomic-nav-label{font-size:9px;font-weight:850;color:#9a9eab;letter-spacing:.08em;padding:6px 13px}.ecomic-nav-item{width:100%;border:0;background:transparent;color:#6c7284;border-radius:12px;padding:10px 13px;display:flex;align-items:center;gap:13px;text-align:left;font-size:13px;font-weight:650;min-height:40px}.ecomic-nav-item:hover{background:#f7f4ff;color:var(--primary)}.ecomic-nav-item.active{background:#eee8ff;color:var(--primary);font-weight:850}.ecomic-sidebar-footer{margin-top:auto;padding:15px;border-top:1px solid #eeeaf5}.ecomic-logout{width:100%;border:1px solid #e2deec;background:#fff;color:#697083;padding:10px 13px;border-radius:11px;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:750}.ecomic-logout:hover{background:#fff1f2;color:#b91c1c}.ecomic-topbar{height:76px;background:#fff;border-bottom:1px solid #e9e6ef;padding:0 30px;display:flex;align-items:center;gap:14px;justify-content:space-between;position:sticky;top:0;z-index:20}.ecomic-menu-button{width:40px;height:40px;border-radius:10px;background:#f7f5fa;flex-shrink:0}.ecomic-menu-button:hover{background:#eee8ff;color:var(--primary)}.ecomic-top-title{display:flex;flex-direction:column;gap:2px;margin-right:auto}.ecomic-top-title strong{color:var(--primary);font-size:16px}.ecomic-top-title span{font-size:11px;color:#8990a2}.ecomic-top-actions{display:flex;gap:9px;align-items:center}.ecomic-drawer-backdrop{display:block;position:fixed;inset:0;border:0;background:rgba(20,16,35,.38);z-index:55}.ecomic-sidebar .ac-profile{margin-top:18px}
@media(max-width:1100px){.ecomic-sidebar{width:250px}.ecomic-nav-item{font-size:12px}.ecomic-topbar{padding:0 20px}}
@media(max-width:760px){.ecomic-sidebar{width:min(86vw,310px)}.ecomic-close{display:grid}.ecomic-topbar{height:64px;padding:0 15px}.ecomic-top-title{display:none}.ecomic-top-actions{margin-left:auto}.ac-content{padding:20px 15px}}
`}</style>}

const menuIcons={dashboard:LayoutDashboard,tutor:MessageCircle,comic:BookOpen,practice:PencilLine,exam:ClipboardList,progress:TrendingUp,rank:Trophy,badge:Award,reflection:MessageSquareText,profile:Settings,grades:ClipboardList,analytics:BarChart3,question:ListChecks,time:Clock3,knowledge:Database,access:KeyRound,attendance:CheckCircle2};

function FlexibleSidebar({open,mode,screen,items,onNavigate,onLogout,session,onClose}){
  const groups=mode==="teacher"
    ?[
      {label:"UTAMA",ids:["teacher-dashboard","teacher-grades","analytics","teacher-question-progress","teacher-ranking","teacher-exam-times"]},
      {label:"KONTEN",ids:["teacher-knowledge","comic-management"]},
      {label:"SISWA & KELAS",ids:["teacher-reflections","teacher-access","teacher-attendance"]},
      {label:"AKUN",ids:["teacher-profile"]}
    ]
    :[
      {label:"BELAJAR",ids:["student-dashboard","tutor","comic-library","practice","exam"]},
      {label:"PERKEMBANGAN",ids:["progress","ranking","badges","reflection"]},
      {label:"AKUN",ids:["profile"]}
    ];
  const byId=new Map(items.map(x=>[x[0],x]));
  return <aside className={`ecomic-sidebar ${open?"is-open":""}`}>
    <div className="ecomic-sidebar-head">
      <div className="ac-brand">
        <div className="ac-brand-mark"><GraduationCap size={22}/></div>
        <div><div className="ac-brand-name">AC-ITS</div><div className="ac-brand-sub">E-Comic Learning</div></div>
      </div>
      <button className="ecomic-close" aria-label="Tutup menu" onClick={onClose}><X size={19}/></button>
    </div>
    <div className="ecomic-profile">
      <div className="avatar">{session?.name?.[0]||"A"}</div>
      <div className="profile-copy"><strong>{session?.name||"Pengguna"}</strong><span>{mode==="teacher"?"Guru":"Siswa"}</span></div>
    </div>
    <nav className="ecomic-nav">
      {groups.map(group=><div className="ecomic-nav-group" key={group.label}>
        <div className="ecomic-nav-label">{group.label}</div>
        {group.ids.map(id=>{
          const item=byId.get(id); if(!item)return null; const [itemId,iconKey,label]=item; const Icon=menuIcons[iconKey]||BookOpen;
          return <button key={itemId} className={`ecomic-nav-item ${screen===itemId?"active":""}`} onClick={()=>onNavigate(itemId)}><Icon size={18}/><span>{label}</span></button>
        })}
      </div>)}
    </nav>
    <div className="ecomic-sidebar-footer"><button className="ecomic-logout" onClick={onLogout}><LogOut size={17}/><span>Keluar</span></button></div>
  </aside>;
}

function FlexibleTopbar({mode,session,onMenu}){
  return <header className="ecomic-topbar">
    <button className="ecomic-menu-button" aria-label="Buka menu" onClick={onMenu}><Menu size={22}/></button>
    <div className="ecomic-top-title"><strong>AC-ITS</strong><span>{mode==="teacher"?"Teacher Content & Analytics Space":"Adaptive Learning Space"}</span></div>
    <div className="ecomic-top-actions"><button className="icon-button"><Search size={18}/></button><button className="icon-button"><Bell size={18}/></button><div className="top-user"><div className="top-avatar">{session?.name?.[0]||"A"}</div></div></div>
  </header>;
}

// Navigasi fleksibel dibuat di App.jsx agar tidak perlu mengubah komponen Sidebar/Topbar lama.
// CSS lokal ini menjaga drawer tetap responsive tanpa perubahan pada global.css.
