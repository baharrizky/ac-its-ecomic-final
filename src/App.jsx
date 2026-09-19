import React,{useEffect,useMemo,useRef,useState} from "react";
import { Menu, X, GraduationCap, LayoutDashboard, MessageCircle, BookOpen, PencilLine, ClipboardList, TrendingUp, Trophy, Award, MessageSquareText, Settings, BarChart3, ListChecks, Clock3, Database, KeyRound, CheckCircle2, Activity, FileInput, LogOut, Search, Bell } from "lucide-react";
import { loadState,saveState } from "./services/storageService";
import { createComic,updateComic } from "./services/comicService";
import { loadCloudComics,saveCloudComic,subscribeCloudComics,mergeComicCollections } from "./services/cloudComicService";
import { saveCloudQuestion,deleteCloudQuestion,subscribeCloudQuestions } from "./services/cloudQuestionService";
import { getSession,logout,getRegisteredStudents,updateUserProfile } from "./services/authService";
import { listConcepts } from "./services/conceptService";
import { getTutorReply, correctAnswerWithAI, recommendNextQuestion, getTeacherRecommendation } from "./services/tutorService";
import { diagnoseAnswer } from "./engine/diagnosisEngine";
import { updateMastery } from "./engine/masteryEngine";
import { createEmptyStudentModel,getStudentModel,saveStudentModel,subscribeStudentModel,recordAttempt,recordLearningEvent,saveReflection,listReflections,saveAttendance,listAttendance,listAttempts,saveExamResult,listExamResults,listLearningEvents } from "./services/learningDataService";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import ComicManagement from "./pages/teacher/ComicManagement";
import ComicEditorPage from "./pages/teacher/ComicEditorPage";
import QuestionBankPage from "./pages/teacher/QuestionBankPage";
import AnalyticsPage from "./pages/teacher/AnalyticsPage";
import { TeacherQuestionProgress,TeacherRanking,TeacherExamTimes,TeacherKnowledge,TeacherAccess,TeacherAttendance,TeacherReflections } from "./pages/teacher/TeacherDataPages";
import TeacherActivityPage from "./pages/teacher/TeacherActivityPage";
import TeacherMigrationPage from "./pages/teacher/TeacherMigrationPage";
import StudentDashboard from "./pages/student/StudentDashboard";
import ComicLibrary from "./pages/student/ComicLibrary";
import ComicReaderPage from "./pages/student/ComicReaderPage";
import PracticePage from "./pages/student/PracticePage";
import TutorPage from "./pages/student/TutorPage";
import ProfilePage from "./pages/student/ProfilePage";
import ExamPage from "./pages/student/ExamPage";
import ProgressPage from "./pages/student/ProgressPage";
import RankingPage from "./pages/student/RankingPage";
import BadgePage from "./pages/student/BadgePage";
import ReflectionPage from "./pages/student/ReflectionPage";
import AttendancePage from "./pages/student/AttendancePage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { listClassesForTeacher } from "./services/accessControlService";

const emptyModel=(conceptList=[])=>createEmptyStudentModel(Object.fromEntries((conceptList||[]).map(c=>[c.id,c])));
const fallback={comics:[],questions:[],studentModel:emptyModel(),screen:null,selectedComicId:null,currentReaderContext:null};

export default function App(){
 const [session,setSession]=useState(getSession());
 const [state,setState]=useState(()=>loadState(fallback));
 const tutorGreeting={role:"assistant",text:"Halo! Saya AI Tutor E-Comic. Kamu bisa bertanya tentang panel, persamaan, atau konsep yang sedang dipelajari."};
 const [tutorMessages,setTutorMessages]=useState([tutorGreeting]);
 const [drawerOpen,setDrawerOpen]=useState(false);
 const [authPage,setAuthPage]=useState("login");
 const [registeredStudents,setRegisteredStudents]=useState([]);
 const [teacherData,setTeacherData]=useState({models:[],attempts:[],reflections:[],attendance:[],examResults:[],events:[]});
 const appSessionRef=useRef(null);
 const screenTimerRef=useRef({screen:null,startedAt:null});
 const [studentReflections,setStudentReflections]=useState([]);
 const [studentAttendance,setStudentAttendance]=useState([]);
 const [availableConcepts,setAvailableConcepts]=useState([]);
 const [teacherClasses,setTeacherClasses]=useState([]);

 useEffect(()=>saveState(state),[state]);

 // Keep Tutor history available after refresh and when navigating between screens.
 useEffect(()=>{
   if(!session?.uid || session.role!=="student") return;
   try {
     const raw=localStorage.getItem(`acits-tutor-history-v2:${session.uid}`);
     const saved=raw?JSON.parse(raw):[];
     setTutorMessages(Array.isArray(saved)&&saved.length?saved.slice(-80):[tutorGreeting]);
   } catch { setTutorMessages([tutorGreeting]); }
 },[session?.uid,session?.role]);

 useEffect(()=>{
   if(!session?.uid || session.role!=="student") return;
   try { localStorage.setItem(`acits-tutor-history-v2:${session.uid}`,JSON.stringify(tutorMessages.slice(-80))); } catch {}
 },[tutorMessages,session?.uid,session?.role]);

 const handleClearTutorHistory=()=>{
   setTutorMessages([tutorGreeting]);
   if(session?.uid){
     try {
       localStorage.removeItem(`acits-tutor-history-v2:${session.uid}`);
       localStorage.setItem(`acits-tutor-history-cleared-v2:${session.uid}`,String(Date.now()));
     } catch {}
   }
 };

 const refreshTeacherData=async()=>{
   const rawStudents=await getRegisteredStudents(session?.uid);
   const teacherUid=session?.uid;
   const [models,attempts,reflections,attendance,examResults,events]=await Promise.all([Promise.all(rawStudents.map(s=>getStudentModel(s.uid,{}))),listAttempts({teacherUid}),listReflections({teacherUid}),listAttendance({teacherUid}),listExamResults({teacherUid}),listLearningEvents({teacherUid})]);
   const map=new Map(models.map(m=>[m.uid,m]));
   const students=rawStudents.map(s=>{const m=map.get(s.uid)||{};return {...s,mastery:Math.round((m.overallMastery||0)*100),xp:m.xp||0,practice:m.totalCorrect||0,exam:m.examScore||0,model:m};});
   setRegisteredStudents(students);setTeacherData({models,attempts,reflections,attendance,examResults,events});
   if (session?.role === "teacher") setTeacherClasses(await listClassesForTeacher(session.uid));
   return students;
 };
 useEffect(()=>{if(!session)return; (async()=>{
   if(session.role === "teacher") await refreshTeacherData();
   else if(session.role === "admin") setRegisteredStudents(await getRegisteredStudents());
   else setRegisteredStudents([]);
   const conceptsNow=await listConcepts();
   setAvailableConcepts(conceptsNow);
 })();},[session?.role,session?.uid]);
 useEffect(()=>{let alive=true;(async()=>{const items=await listConcepts();if(alive)setAvailableConcepts(items);})();return()=>{alive=false}},[state.screen]);

 useEffect(()=>{
   if(!session?.uid || session.role!=="student") return;
   const startedAt=new Date().toISOString();
   const id=`app-session-${session.uid}-${Date.now()}`;
   appSessionRef.current={id,startedMs:Date.now(),startedAt};
   recordLearningEvent({id,uid:session.uid,name:session.name,role:"student",teacherUid:session.classTeacherUid||null,classId:session.classId||null,type:"app_session",startedAt,createdAt:startedAt,durationSeconds:0,active:true,educationLevel:session.educationLevel,grade:session.grade,rombel:session.rombel,school:session.school});
   const heartbeat=setInterval(()=>{const ref=appSessionRef.current;if(!ref)return;recordLearningEvent({id:ref.id,uid:session.uid,type:"session_heartbeat",startedAt:ref.startedAt,createdAt:new Date().toISOString(),durationSeconds:Math.floor((Date.now()-ref.startedMs)/1000),active:true});},30000);
   return()=>{clearInterval(heartbeat);const ref=appSessionRef.current;if(ref){recordLearningEvent({id:ref.id,uid:session.uid,type:"app_session",startedAt:ref.startedAt,endedAt:new Date().toISOString(),createdAt:new Date().toISOString(),durationSeconds:Math.floor((Date.now()-ref.startedMs)/1000),active:false});appSessionRef.current=null;}};
 },[session?.uid,session?.role]);

 useEffect(()=>{
   if(!session?.uid || session.role!=="student") return;
   const now=Date.now();
   const prev=screenTimerRef.current;
   if(prev.screen && prev.startedAt && prev.screen!==state.screen){
     const duration=Math.floor((now-prev.startedAt)/1000);
     if(duration>1) recordLearningEvent({uid:session.uid,name:session.name,role:"student",teacherUid:session.classTeacherUid||null,classId:session.classId||null,type:"screen_time",screen:prev.screen,durationSeconds:duration,startedAt:new Date(prev.startedAt).toISOString(),endedAt:new Date(now).toISOString(),createdAt:new Date(now).toISOString(),educationLevel:session.educationLevel,grade:session.grade,rombel:session.rombel,school:session.school});
   }
   screenTimerRef.current={screen:state.screen,startedAt:now};
 },[state.screen,session?.uid,session?.role]);

 useEffect(()=>()=>{
   if(session?.uid && session.role==="student") {
     const prev=screenTimerRef.current; if(prev.screen&&prev.startedAt){const duration=Math.floor((Date.now()-prev.startedAt)/1000);if(duration>1)recordLearningEvent({uid:session.uid,name:session.name,role:"student",teacherUid:session.classTeacherUid||null,classId:session.classId||null,type:"screen_time",screen:prev.screen,durationSeconds:duration,startedAt:new Date(prev.startedAt).toISOString(),endedAt:new Date().toISOString(),createdAt:new Date().toISOString()});}
   }
 },[session?.uid,session?.role]);

 useEffect(()=>{
   if(!session?.uid) return;
   let alive=true;let unsubscribe=()=>{};
   (async()=>{
     const model=await getStudentModel(session.uid,emptyModel(availableConcepts));
     if(alive)setState(s=>({...s,studentModel:{...s.studentModel,...model}}));
     unsubscribe=await subscribeStudentModel(session.uid,model2=>{if(alive)setState(s=>({...s,studentModel:{...s.studentModel,...model2}}));});
     const [refs,att,events]=await Promise.all([listReflections({uid:session.uid}),listAttendance({uid:session.uid}),listLearningEvents({uid:session.uid})]);
     if(alive){
       setStudentReflections(refs);setStudentAttendance(att);
       let clearedAt=0;
       try { clearedAt=Number(localStorage.getItem(`acits-tutor-history-cleared-v2:${session.uid}`)||0); } catch {}
       const history=events.filter(e=>e.type==="tutor_message"&&e.payload?.message&&(!clearedAt||!e.createdAt||new Date(e.createdAt).getTime()>clearedAt)).sort((a,b)=>String(a.createdAt||"").localeCompare(String(b.createdAt||""))).flatMap(e=>[
         {role:"user",text:String(e.payload.message)},
         ...(e.payload.reply?[{role:"assistant",text:String(e.payload.reply)}]:[])
       ]).slice(-80);
       if(history.length)setTutorMessages(history);
     }
   })();
   return()=>{alive=false;unsubscribe?.();};
 },[session?.uid]);

 useEffect(()=>{
   let alive=true;let unsubscribe=()=>{};
   (async()=>{const cloud=await loadCloudComics(session);if(!alive)return;if(cloud!==null){setState(s=>({...s,comics:mergeComicCollections(s.comics,cloud)}));unsubscribe=await subscribeCloudComics(session, items=>{if(alive)setState(s=>({...s,comics:mergeComicCollections(s.comics,items)}));});}})();
   return()=>{alive=false;unsubscribe?.();};
 },[session?.role]);
 useEffect(()=>{
   let alive=true;let unsubscribe=()=>{};
   (async()=>{unsubscribe=await subscribeCloudQuestions(session, items=>{if(alive)setState(s=>({...s,questions:items}));});})();
   return()=>{alive=false;unsubscribe?.();};
 },[session?.role]);

 const mode=session?.role||null;
 const selectedComic=useMemo(()=>state.comics.find(c=>c.id===state.selectedComicId)||null,[state.comics,state.selectedComicId]);
 const visibleStudentQuestions=useMemo(()=>state.questions.filter(q=>q.status!=="Draft" && (!q.educationLevel||q.educationLevel===session?.educationLevel) && (!q.grade||q.grade===session?.grade)),[state.questions,session?.educationLevel,session?.grade]);
 const leaderboard=useMemo(()=>registeredStudents.filter(s=>!session?.school||!s.school||s.school===session.school).filter(s=>!session?.grade||s.grade===session.grade).filter(s=>!session?.rombel||s.rombel===session.rombel),[registeredStudents,session?.school,session?.grade,session?.rombel]);
 const teacherVisibleStudents=useMemo(()=>session?.role==="teacher"?registeredStudents.filter(s=>s.classTeacherUid===session.uid):[],[registeredStudents,session?.uid,session?.role]);
 const visibleStudentIds=useMemo(()=>new Set(teacherVisibleStudents.map(s=>s.uid)),[teacherVisibleStudents]);
 const teacherAttempts=useMemo(()=>teacherData.attempts.filter(a=>visibleStudentIds.has(a.uid)),[teacherData.attempts,visibleStudentIds]);
 const teacherReflections=useMemo(()=>teacherData.reflections.filter(r=>visibleStudentIds.has(r.uid)),[teacherData.reflections,visibleStudentIds]);
 const teacherAttendance=useMemo(()=>teacherData.attendance.filter(r=>visibleStudentIds.has(r.uid)),[teacherData.attendance,visibleStudentIds]);
 const teacherExamResults=useMemo(()=>teacherData.examResults.filter(r=>visibleStudentIds.has(r.uid)),[teacherData.examResults,visibleStudentIds]);
 const teacherLearningEvents=useMemo(()=>teacherData.events.filter(e=>visibleStudentIds.has(e.uid)),[teacherData.events,visibleStudentIds]);

 const navigate=(screen,comicId=null,readerContext=null)=>{setState(s=>({...s,screen,selectedComicId:typeof comicId==="string"?comicId:(screen==="tutor"?s.selectedComicId:comicId),currentReaderContext:readerContext||s.currentReaderContext}));setDrawerOpen(false)};
 if(!session)return authPage==="register"?<RegistrationPage onBack={()=>setAuthPage("login")} onRegister={s=>{setSession(s);setState(x=>({...x,screen:s.role==="admin"?"admin-dashboard":s.role==="teacher"?"teacher-dashboard":"student-dashboard"}));setAuthPage("login")}}/>:<LoginPage onRegisterClick={()=>setAuthPage("register")} onLogin={s=>{setSession(s);setState(x=>({...x,screen:s.role==="admin"?"admin-dashboard":s.role==="teacher"?"teacher-dashboard":"student-dashboard"}));}}/>;
 const onLogout=async()=>{await logout();setSession(null);setAuthPage("login");};
 const handleCreate=form=>{if(!teacherClasses.length){setState(x=>({...x,screen:"teacher-access"}));return;}const c=createComic({...form,school:session?.school||"",rombel:form.rombel||session?.rombel||"",classTeacherUid:session?.uid||"",ownerTeacherUid:session?.uid||"",assignedClassIds:teacherClasses.map(x=>x.id),createdBy:session?.uid||"current-teacher"});setState(s=>({...s,comics:[c,...s.comics],selectedComicId:c.id,screen:"comic-editor"}));saveCloudComic(c);};
 const handleSaveComic=async u=>{const updated={...u,school:u.school||session?.school||"",ownerTeacherUid:u.ownerTeacherUid||session?.uid||"",assignedClassIds:Array.isArray(u.assignedClassIds)&&u.assignedClassIds.length?u.assignedClassIds:teacherClasses.map(x=>x.id),createdBy:u.createdBy||session?.uid||"current-teacher",updatedAt:new Date().toISOString().slice(0,10)};setState(s=>({...s,comics:updateComic(s.comics,updated)}));return saveCloudComic(updated);};
 const handleSaveQuestion=async q=>{if(!teacherClasses.length){setState(x=>({...x,screen:"teacher-access"}));return;}const payload={...q,ownerTeacherUid:session?.uid||"",assignedClassIds:teacherClasses.map(x=>x.id),createdBy:session?.uid||"current-teacher",updatedAt:new Date().toISOString()};setState(s=>({...s,questions:[...s.questions.filter(x=>x.id!==q.id),payload]}));await saveCloudQuestion(payload);};
 const handleDeleteQuestion=async id=>{setState(s=>({...s,questions:s.questions.filter(q=>q.id!==id)}));await deleteCloudQuestion(id);};

 const touchActivity=(model,bonus=0)=>{const now=new Date();const today=now.toISOString().slice(0,10);const last=model.lastActivityAt?.slice?.(0,10);let streak=model.streak||0;if(last!==today){if(last){const prev=new Date(last);const diff=Math.round((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())-Date.UTC(prev.getFullYear(),prev.getMonth(),prev.getDate()))/86400000);streak=diff===1?Math.max(1,streak+1):1;}else streak=1;}return {...model,streak,xp:(model.xp||0)+bonus,lastActivityAt:now.toISOString()};};
 const handleAnswer=async(q,aIndex,modeName="practice",durationSeconds=0)=>{
   const baseline=diagnoseAnswer(q,aIndex);
   const ai=await correctAnswerWithAI({question:q,selectedAnswer:q.options?.[aIndex],correctAnswer:q.options?.[q.answer],baselineDiagnosis:baseline,context:{educationLevel:session?.educationLevel,grade:session?.grade,school:session?.school,studentMastery:state.studentModel?.concepts?.[q.conceptId]?.mastery||0,conceptId:q.conceptId,conceptName:availableConcepts.find(c=>c.id===q.conceptId)?.name||q.conceptId}});
   const d={...baseline,...ai,explanation:ai?.explanation||baseline.explanation,misconceptionTag:ai?.misconceptionTag??baseline.misconceptionTag,confidence:Number(ai?.confidence??baseline.confidence)};
   const next=touchActivity(updateMastery(state.studentModel,q.conceptId,d),d.correct?10:3);
   setState(s=>({...s,studentModel:next}));
   if(session?.uid){await Promise.all([saveStudentModel(session.uid,next),recordAttempt({uid:session.uid,name:session.name,questionId:q.id,conceptId:q.conceptId,selectedIndex:aIndex,correct:d.correct,score:d.correct?100:0,mode:modeName,educationLevel:session.educationLevel,grade:session.grade,school:session.school,teacherUid:session.classTeacherUid||null,classId:session.classId||null,misconceptionTag:d.misconceptionTag,aiCorrection:d}),recordLearningEvent({uid:session.uid,teacherUid:session.classTeacherUid||null,classId:session.classId||null,type:modeName==="reader-quiz"?"quiz_attempt":"question_attempt",mode:modeName,durationSeconds:Number(durationSeconds)||0,payload:{questionId:q.id,conceptId:q.conceptId,correct:d.correct,mode:modeName,aiCorrection:d}})]);}
   let recommendation=null;
   if(modeName!=="exam"){
     recommendation=await recommendNextQuestion({studentModel:next,questions:visibleStudentQuestions,recentAttempts:[{questionId:q.id,conceptId:q.conceptId,correct:d.correct}]});
     if(!recommendation?.questionId){recommendation={...recommendation,questionId:null,localFallback:true};}
   }
   return {...d,recommendation};
 };
 const handleTutor=async(message,context={})=>{
   const history=tutorMessages.slice(-12);
   let r;
   try {
     // One Tutor path for every question. When the student is reading a panel,
     // tutorService attaches that panel image when available. A failed image
     // attachment must NEVER block an ordinary concept question.
     r=await getTutorReply({message,context,history});
   } catch (error) {
     console.error("Tutor failed", error);
     r={reply:"Tutor sedang tidak tersedia sementara. Silakan kirim pertanyaan lagi.",ai:false,unavailable:true,code:error?.code||"AI_UNAVAILABLE"};
   }
   const userMessage={role:"user",text:message};
   const assistantMessage={role:"assistant",text:r.reply||"AI belum memberikan jawaban."};
   setTutorMessages(m=>[...m,userMessage,assistantMessage].slice(-80));
   if(session?.uid)await recordLearningEvent({uid:session.uid,teacherUid:session.classTeacherUid||null,classId:session.classId||null,type:"tutor_message",payload:{message,reply:r.reply||"",context,ai:r.ai,unavailable:r.unavailable||false,provider:r.meta?.provider||null,model:r.meta?.model||null,latencyMs:r.meta?.latencyMs||null,usage:r.meta?.usage||null,code:r.code||null}});
   return r;
 };
 const handleReaderProgress=async({comic,episodeIndex,panelIndex,durationSeconds=0})=>{if(!session?.uid||!comic)return;const key=`${comic.id}:${episodeIndex}:${panelIndex}`;await recordLearningEvent({uid:session.uid,name:session.name,role:"student",teacherUid:session.classTeacherUid||null,classId:session.classId||null,type:"comic_panel_view",comicId:comic.id,episodeIndex,panelIndex,durationSeconds:Number(durationSeconds)||0,createdAt:new Date().toISOString()});if(state.studentModel.completedPanels?.[key]){setState(s=>({...s,currentReaderContext:{comicId:comic.id,episodeIndex,panelIndex}}));return;}const next=touchActivity({...state.studentModel,completedPanels:{...(state.studentModel.completedPanels||{}),[key]:1}},2);const allDone=(comic.episodes||[]).every(ep=>(ep.panels||[]).every((_,pi)=>next.completedPanels?.[`${comic.id}:${comic.episodes.indexOf(ep)}:${pi}`]));if(allDone&&!next.completedComics.includes(comic.id))next.completedComics=[...(next.completedComics||[]),comic.id];setState(s=>({...s,studentModel:next,currentReaderContext:{comicId:comic.id,episodeIndex,panelIndex}}));await saveStudentModel(session.uid,next);};
 const handleReflection=async r=>{await saveReflection({...r,uid:session.uid,teacherUid:session.classTeacherUid||null,classId:session.classId||null});setStudentReflections(await listReflections({uid:session.uid}));if(session?.uid)await recordLearningEvent({uid:session.uid,teacherUid:session.classTeacherUid||null,classId:session.classId||null,type:"reflection_submitted"});};
 const handleAttendance=async r=>{await saveAttendance({...r,uid:session.uid,teacherUid:session.classTeacherUid||null,classId:session.classId||null});setStudentAttendance(await listAttendance({uid:session.uid}));if(session?.uid)await recordLearningEvent({uid:session.uid,teacherUid:session.classTeacherUid||null,classId:session.classId||null,type:"attendance"});return true;};
 const handleExamComplete=async(result,eligible,answers)=>{let next=touchActivity(state.studentModel, result.score>=80?30:10);for(let i=0;i<eligible.length;i++){const q=eligible[i];if(answers[i]==null)continue;const d=diagnoseAnswer(q,answers[i]);next=updateMastery(next,q.conceptId,d);await recordAttempt({uid:session.uid,name:session.name,teacherUid:session.classTeacherUid||null,classId:session.classId||null,questionId:q.id,conceptId:q.conceptId,selectedIndex:answers[i],correct:d.correct,score:d.correct?100:0,mode:"exam",educationLevel:session.educationLevel,grade:session.grade,school:session.school,examId:`exam-${Date.now()}`});}next.examScore=result.score;setState(s=>({...s,studentModel:next}));await saveStudentModel(session.uid,next);await saveExamResult({...result,uid:session.uid,name:session.name,school:session.school,grade:session.grade,rombel:session.rombel,teacherUid:session.classTeacherUid||null,classId:session.classId||null});await refreshTeacherData();};
 const handleAIExplain=({message,context})=>handleTutor(message,context);
 const adminItems=[["admin-dashboard","dashboard","Beranda Admin"]];
 const teacherItems=[["teacher-dashboard","dashboard","Beranda"],["teacher-grades","grades","Nilai Siswa"],["analytics","analytics","Analitik"],["teacher-question-progress","question","Progress per Soal"],["teacher-ranking","rank","Peringkat"],["teacher-exam-times","time","Jawaban & Waktu Ujian"],["teacher-knowledge","knowledge","Knowledge Base"],["comic-management","comic","Kelola Materi E-Comic"],["question-bank","question","Bank Soal"],["teacher-reflections","reflection","Refleksi Siswa"],["teacher-access","access","Kelas Saya"],["teacher-attendance","attendance","Presensi"],["teacher-activity","activity","Aktivitas Siswa"],["teacher-migration","migration","Data ITS"],["teacher-profile","profile","Profil"]];
 const studentItems=[["student-dashboard","dashboard","Dashboard"],["tutor","tutor","Tutor AI"],["comic-library","comic","Materi E-Comic"],["practice","practice","Latihan"],["exam","exam","Ujian"],["progress","progress","Progress"],["ranking","rank","Peringkat"],["badges","badge","Badge"],["reflection","reflection","Refleksi"],["attendance","attendance","Presensi"],["profile","profile","Profil"]];
 const renderAdmin=()=>{if(state.screen!=="admin-dashboard")return <AdminDashboard session={session}/>;return <AdminDashboard session={session}/>;};
 const renderTeacher=()=>{switch(state.screen){case"comic-management":return <ComicManagement comics={state.comics.filter(c=>!session.school||!c.school||c.school===session.school)} navigate={navigate} onCreate={handleCreate} onEdit={id=>navigate("comic-editor",id)}/>;case"comic-editor":return <ComicEditorPage comic={selectedComic} session={session} onBack={()=>navigate("comic-management")} onSave={handleSaveComic}/>;case"comic-preview":return <ComicReaderPage comic={selectedComic} studentModel={emptyModel(availableConcepts)} questions={state.questions} navigate={navigate} session={session}/>;case"question-bank":return <QuestionBankPage questions={state.questions} onSave={handleSaveQuestion} onDelete={handleDeleteQuestion}/>;case"analytics":return <AnalyticsPage students={teacherVisibleStudents} models={teacherData.models} attempts={teacherAttempts}/>;case"teacher-grades":return <TeacherGrades students={teacherVisibleStudents} session={session} questions={state.questions} onRefresh={refreshTeacherData}/>;case"teacher-question-progress":return <TeacherQuestionProgress questions={state.questions} attempts={teacherAttempts}/>;case"teacher-ranking":return <TeacherRanking students={teacherVisibleStudents}/>;case"teacher-exam-times":return <TeacherExamTimes examResults={teacherExamResults} students={teacherVisibleStudents}/>;case"teacher-knowledge":return <TeacherKnowledge/>;case"teacher-reflections":return <TeacherReflections reflections={teacherReflections} students={teacherVisibleStudents}/>;case"teacher-access":return <TeacherAccess session={session} onClassesChange={setTeacherClasses}/>;case"teacher-attendance":return <TeacherAttendance records={teacherAttendance} students={teacherVisibleStudents}/>;case"teacher-activity":return <TeacherActivityPage students={teacherVisibleStudents} events={teacherLearningEvents} onRefresh={refreshTeacherData}/>;case"teacher-migration":return <TeacherMigrationPage session={session}/>;case"teacher-profile":return <TeacherProfile session={session}/>;default:return <TeacherDashboard state={state} navigate={navigate} students={teacherVisibleStudents} models={teacherData.models} attempts={teacherAttempts} events={teacherLearningEvents} session={session} onRefresh={refreshTeacherData} onAIRecommend={getTeacherRecommendation}/>} };
 const renderStudent=()=>{switch(state.screen){case"tutor":return <TutorPage comic={selectedComic} studentModel={state.studentModel} messages={tutorMessages} onSend={handleTutor} onClearHistory={handleClearTutorHistory} readerContext={state.currentReaderContext} session={session}/>;case"comic-library":return <ComicLibrary comics={state.comics} session={session} navigate={navigate}/>;case"comic-reader":return <ComicReaderPage comic={selectedComic} studentModel={state.studentModel} questions={visibleStudentQuestions} navigate={navigate} onPanelViewed={handleReaderProgress} onAnswer={handleAnswer} onAIExplain={handleAIExplain} onTutorSend={handleTutor} onClearHistory={handleClearTutorHistory} tutorMessages={tutorMessages} readerContext={state.currentReaderContext} session={session}/>;case"practice":return <PracticePage questions={visibleStudentQuestions} studentModel={state.studentModel} concepts={availableConcepts} onAnswer={handleAnswer} onAIExplain={handleAIExplain}/>;case"exam":return <ExamPage questions={state.questions} session={session} onComplete={handleExamComplete}/>;case"progress":return <ProgressPage studentModel={state.studentModel} concepts={availableConcepts}/>;case"ranking":return <RankingPage leaderboard={leaderboard} session={session}/>;case"badges":return <BadgePage studentModel={state.studentModel}/>;case"reflection":return <ReflectionPage session={session} reflections={studentReflections} onSave={handleReflection}/>;case"attendance":return <AttendancePage session={session} records={studentAttendance} onCheckIn={handleAttendance}/>;case"profile":return <ProfilePage session={session}/>;default:return <StudentDashboard state={state} navigate={navigate} session={session} concepts={availableConcepts}/>;} };
 return <><FlexibleStyles/><div className="ac-app"><FlexibleSidebar open={drawerOpen} mode={mode} screen={state.screen} items={mode==="admin"?adminItems:mode==="teacher"?teacherItems:studentItems} onNavigate={(screen)=>navigate(screen)} onLogout={onLogout} session={session} onClose={()=>setDrawerOpen(false)}/>{drawerOpen&&<button aria-label="Tutup menu" className="ecomic-drawer-backdrop" onClick={()=>setDrawerOpen(false)}/>}<div className="ac-main"><FlexibleTopbar mode={mode} session={session} onMenu={()=>setDrawerOpen(v=>!v)}/><main className="ac-content">{mode==="admin"?renderAdmin():mode==="teacher"?renderTeacher():renderStudent()}</main></div></div></>;
}

function TeacherGrades({students,session,questions,onRefresh}){
 const [level,setLevel]=useState(session?.educationLevel||"SMA");const [school,setSchool]=useState(session?.school||"");const [grade,setGrade]=useState("");const [rombel,setRombel]=useState("");
 const scoped=session?.school?students.filter(s=>s.school===session.school):students;const levelStudents=scoped.filter(s=>s.educationLevel===level);const schools=[...new Set(levelStudents.map(s=>s.school).filter(Boolean))];const grades=[...new Set(levelStudents.map(s=>s.grade).filter(Boolean))];const rombels=[...new Set(levelStudents.filter(s=>!grade||s.grade===grade).map(s=>s.rombel).filter(Boolean))].sort((a,b)=>Number(a)-Number(b));const visible=levelStudents.filter(s=>(!school||s.school===school)&&(!grade||s.grade===grade)&&(!rombel||s.rombel===rombel));
 const avg=(key)=>visible.length?Math.round(visible.reduce((sum,s)=>sum+Number(s[key]||0),0)/visible.length):0;
 return <div><div className="page-kicker">Student Assessment</div><h1 className="page-title">Nilai Siswa</h1><p className="page-desc">Filter jenjang, sekolah, kelas, dan rombel. Data berasal dari akun siswa nyata dan student model.</p><div className="card" style={{marginBottom:18}}><div className="section-head"><div><h2>Kontrol Kelas</h2><span>Guru dapat menentukan ruang kelas yang sedang dilihat.</span></div><button className="btn" onClick={onRefresh}>↻ Perbarui</button></div><div className="register-grid"><div><label className="label">Jenjang</label><select value={level} onChange={e=>{setLevel(e.target.value);setSchool("");setGrade("");setRombel("")}}><option>SMP</option><option>SMA</option></select></div><div><label className="label">Sekolah</label><select value={school} onChange={e=>{setSchool(e.target.value);setGrade("");setRombel("")}}><option value="">Semua sekolah</option>{schools.map(v=><option key={v}>{v}</option>)}</select></div><div><label className="label">Tingkat</label><select value={grade} onChange={e=>{setGrade(e.target.value);setRombel("")}}><option value="">Semua kelas</option>{grades.map(v=><option key={v}>{v}</option>)}</select></div><div><label className="label">Rombel</label><select value={rombel} onChange={e=>setRombel(e.target.value)}><option value="">Semua rombel</option>{rombels.map(v=><option key={v}>{v}</option>)}</select></div></div></div><div className="stats-row"><div className="ac-stat"><div className="stat-icon purple">▣</div><div><span>Rata-rata Mastery</span><strong>{avg("mastery")}%</strong></div></div><div className="ac-stat"><div className="stat-icon blue">✓</div><div><span>Siswa</span><strong>{visible.length}</strong></div></div><div className="ac-stat"><div className="stat-icon green">★</div><div><span>Rata-rata Ujian</span><strong>{avg("exam")}</strong></div></div><div className="ac-stat"><div className="stat-icon orange">✎</div><div><span>Bank Soal</span><strong>{questions.length}</strong></div></div></div><div className="card"><h2>Rekap Nilai</h2>{visible.length?<table className="table"><thead><tr><th>Siswa</th><th>Sekolah</th><th>Kelas</th><th>Latihan</th><th>Ujian</th><th>Mastery</th><th>XP</th></tr></thead><tbody>{visible.map(s=><tr key={s.uid||s.email}><td><strong>{s.name}</strong></td><td>{s.school||"-"}</td><td>{s.grade||"-"} {s.rombel||""}</td><td>{s.practice||0}</td><td>{s.exam||0}</td><td>{s.mastery||0}%</td><td>{s.xp||0}</td></tr>)}</tbody></table>:<div className="empty-state"><strong>Belum ada siswa pada filter ini.</strong><span>Daftar akan terisi otomatis setelah siswa mendaftar.</span></div>}</div></div>
}
function TeacherProfile({session}){return <div><div className="page-kicker">Account</div><h1 className="page-title">Profil Guru</h1><p className="page-desc">Informasi akun pengelola konten dan kelas.</p><div className="profile-layout"><div className="profile-card"><div className="big-avatar">{session.name?.[0]||"G"}</div><h2>{session.name}</h2><span>Guru · {session.school||"Sekolah belum diatur"}</span></div><div className="card"><div className="field-row"><span>👤</span><div><small>Nama</small><strong>{session.name}</strong></div></div><div className="field-row"><span>✉</span><div><small>Email</small><strong>{session.email}</strong></div></div><div className="field-row"><span>🏫</span><div><small>Sekolah</small><strong>{session.school||"-"}</strong></div></div><div className="field-row"><span>🔐</span><div><small>Role</small><strong>Teacher</strong></div></div></div></div></div>}

function FlexibleStyles(){return <style>{`
.ecomic-sidebar{width:290px;min-height:100vh;background:#fff;border-right:1px solid #eceaf2;display:flex;flex-direction:column;flex-shrink:0;position:fixed;left:0;top:0;bottom:0;transform:translateX(-105%);z-index:60;box-shadow:0 20px 50px rgba(20,16,35,.18);transition:transform .22s ease,box-shadow .22s ease}.ecomic-sidebar.is-open{transform:translateX(0)}.ecomic-sidebar-head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eeeaf5}.ecomic-sidebar .ac-brand{flex:1;border-bottom:0}.ecomic-close,.ecomic-menu-button{border:0;background:transparent;display:grid;place-items:center;color:#656b7c}.ecomic-close{width:42px;height:42px;margin-right:12px;border-radius:10px}.ecomic-close:hover{background:#f4f1fb;color:var(--primary)}.ecomic-profile{margin:18px 16px 10px;padding:13px;border-radius:16px;background:#f3efff;display:flex;gap:12px;align-items:center}.ecomic-nav{padding:6px 15px 12px;overflow:auto}.ecomic-nav-group{margin-bottom:15px}.ecomic-nav-label{font-size:9px;font-weight:850;color:#9a9eab;letter-spacing:.08em;padding:6px 13px}.ecomic-nav-item{width:100%;border:0;background:transparent;color:#6c7284;border-radius:12px;padding:10px 13px;display:flex;align-items:center;gap:13px;text-align:left;font-size:13px;font-weight:650;min-height:40px}.ecomic-nav-item:hover{background:#f7f4ff;color:var(--primary)}.ecomic-nav-item.active{background:#eee8ff;color:var(--primary);font-weight:850}.ecomic-sidebar-footer{margin-top:auto;padding:15px;border-top:1px solid #eeeaf5}.ecomic-logout{width:100%;border:1px solid #e2deec;background:#fff;color:#697083;padding:10px 13px;border-radius:11px;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:750}.ecomic-logout:hover{background:#fff1f2;color:#b91c1c}.ecomic-topbar{height:76px;background:#fff;border-bottom:1px solid #e9e6ef;padding:0 30px;display:flex;align-items:center;gap:14px;justify-content:space-between;position:sticky;top:0;z-index:20}.ecomic-menu-button{width:40px;height:40px;border-radius:10px;background:#f7f5fa;flex-shrink:0}.ecomic-menu-button:hover{background:#eee8ff;color:var(--primary)}.ecomic-top-title{display:flex;flex-direction:column;gap:2px;margin-right:auto}.ecomic-top-title strong{color:var(--primary);font-size:16px}.ecomic-top-title span{font-size:11px;color:#8990a2}.ecomic-top-actions{display:flex;gap:9px;align-items:center}.ecomic-drawer-backdrop{display:block;position:fixed;inset:0;border:0;background:rgba(20,16,35,.38);z-index:55}.ecomic-sidebar .ac-profile{margin-top:18px}.ai-feedback{margin-top:10px;padding:12px 14px;border-radius:12px;background:#f4efff;border:1px solid #e4d9ff}.ai-feedback p{margin:6px 0 0;color:#5f6372;line-height:1.6}.success-note{margin-top:12px;padding:10px 12px;border-radius:10px;background:#ecfdf5;color:#047857}.primary-btn:disabled,.btn-primary:disabled{opacity:.55;cursor:not-allowed}
@media(max-width:1100px){.ecomic-sidebar{width:250px}.ecomic-nav-item{font-size:12px}.ecomic-topbar{padding:0 20px}}
@media(max-width:760px){.ecomic-sidebar{width:min(86vw,310px)}.ecomic-topbar{height:64px;padding:0 15px}.ecomic-top-title{display:none}.ecomic-top-actions{margin-left:auto}.ac-content{padding:20px 15px}}
`}</style>}

const menuIcons={dashboard:LayoutDashboard,tutor:MessageCircle,comic:BookOpen,practice:PencilLine,exam:ClipboardList,progress:TrendingUp,rank:Trophy,badge:Award,reflection:MessageSquareText,profile:Settings,grades:ClipboardList,analytics:BarChart3,question:ListChecks,time:Clock3,knowledge:Database,access:KeyRound,attendance:CheckCircle2,activity:Activity,migration:FileInput};
function FlexibleSidebar({open,mode,screen,items,onNavigate,onLogout,session,onClose}){const groups=mode==="admin"?[{label:"ADMIN",ids:["admin-dashboard"]}]:mode==="teacher"?[{label:"UTAMA",ids:["teacher-dashboard","teacher-grades","analytics","teacher-question-progress","teacher-ranking","teacher-exam-times"]},{label:"KONTEN",ids:["teacher-knowledge","comic-management","question-bank"]},{label:"SISWA & KELAS",ids:["teacher-reflections","teacher-access","teacher-attendance","teacher-activity","teacher-migration"]},{label:"AKUN",ids:["teacher-profile"]}]:[{label:"BELAJAR",ids:["student-dashboard","tutor","comic-library","practice","exam"]},{label:"PERKEMBANGAN",ids:["progress","ranking","badges","reflection","attendance"]},{label:"AKUN",ids:["profile"]}];const byId=new Map(items.map(x=>[x[0],x]));return <aside className={`ecomic-sidebar ${open?"is-open":""}`}><div className="ecomic-sidebar-head"><div className="ac-brand"><div className="ac-brand-mark"><GraduationCap size={22}/></div><div><div className="ac-brand-name">AC-ITS</div><div className="ac-brand-sub">E-Comic Learning</div></div></div><button className="ecomic-close" aria-label="Tutup menu" onClick={onClose}><X size={19}/></button></div><div className="ecomic-profile"><div className="avatar">{session?.name?.[0]||"A"}</div><div className="profile-copy"><strong>{session?.name||"Pengguna"}</strong><span>{mode==="admin"?"Admin":mode==="teacher"?"Guru":"Siswa"}</span></div></div><nav className="ecomic-nav">{groups.map(g=><div className="ecomic-nav-group" key={g.label}><div className="ecomic-nav-label">{g.label}</div>{g.ids.map(id=>{const item=byId.get(id);if(!item)return null;const [itemId,iconKey,label]=item;const Icon=menuIcons[iconKey]||BookOpen;return <button key={itemId} className={`ecomic-nav-item ${screen===itemId?"active":""}`} onClick={()=>onNavigate(itemId)}><Icon size={18}/><span>{label}</span></button>})}</div>)}</nav><div className="ecomic-sidebar-footer"><button className="ecomic-logout" onClick={onLogout}><LogOut size={17}/><span>Keluar</span></button></div></aside>}
function FlexibleTopbar({mode,session,onMenu}){return <header className="ecomic-topbar"><button className="ecomic-menu-button" aria-label="Buka menu" onClick={onMenu}><Menu size={22}/></button><div className="ecomic-top-title"><strong>AC-ITS</strong><span>{mode==="admin"?"Platform Administration Space":mode==="teacher"?"Teacher Content & Analytics Space":"Adaptive Learning Space"}</span></div><div className="ecomic-top-actions"><button className="icon-button"><Search size={18}/></button><button className="icon-button"><Bell size={18}/></button><div className="top-user"><div className="top-avatar">{session?.name?.[0]||"A"}</div></div></div></header>}
