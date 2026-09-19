import React,{useEffect,useMemo,useRef,useState} from "react";
import { Menu, X, GraduationCap, LayoutDashboard, MessageCircle, BookOpen, PencilLine, ClipboardList, TrendingUp, Trophy, Award, MessageSquareText, Settings, BarChart3, ListChecks, Clock3, Database, KeyRound, CheckCircle2, Activity, FileInput, LogOut, Search, Bell } from "lucide-react";
import { concepts } from "./data/demoData";
import { loadState,saveState } from "./services/storageService";
import { createComic,updateComic } from "./services/comicService";
import { loadCloudComics,saveCloudComic,subscribeCloudComics,mergeComicCollections } from "./services/cloudComicService";
import { saveCloudQuestion,deleteCloudQuestion,subscribeCloudQuestions } from "./services/cloudQuestionService";
import { getSession,logout,getRegisteredStudents,updateUserProfile } from "./services/authService";
import { getTutorReply, correctAnswerWithAI, recommendNextQuestion, getTeacherRecommendation } from "./services/tutorService";
import { diagnoseAnswer } from "./engine/diagnosisEngine";
import { updateMastery } from "./engine/masteryEngine";
import { createEmptyStudentModel,getStudentModel,saveStudentModel,subscribeStudentModel,recordAttempt,recordLearningEvent,saveReflection,listReflections,saveAttendance,listAttendance,listStudentModels,listAttempts,saveExamResult,listExamResults,listLearningEvents,findClassAccessCode } from "./services/learningDataService";
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

const emptyModel=()=>createEmptyStudentModel(concepts);
const fallback={comics:[],questions:[],studentModel:emptyModel(),screen:null,selectedComicId:null,currentReaderContext:null};

export default function App(){
 const [session,setSession]=useState(getSession());
 const [state,setState]=useState(()=>loadState(fallback));
 const [tutorMessages,setTutorMessages]=useState([{role:"assistant",text:"Halo! Saya AI Tutor E-Comic. Kamu bisa bertanya tentang panel, persamaan, atau konsep yang sedang dipelajari."}]);
 const [drawerOpen,setDrawerOpen]=useState(false);
 const [authPage,setAuthPage]=useState("login");
 const [registeredStudents,setRegisteredStudents]=useState([]);
 const [teacherData,setTeacherData]=useState({models:[],attempts:[],reflections:[],attendance:[],examResults:[],events:[]});
 const appSessionRef=useRef(null);
 const screenTimerRef=useRef({screen:null,startedAt:null});
 const [studentReflections,setStudentReflections]=useState([]);
 const [studentAttendance,setStudentAttendance]=useState([]);

 useEffect(()=>saveState(state),[state]);

 const refreshTeacherData=async()=>{
   const [rawStudents,models,attempts,reflections,attendance,examResults,events]=await Promise.all([getRegisteredStudents(),listStudentModels(),listAttempts(),listReflections(),listAttendance(),listExamResults(),listLearningEvents()]);
   const map=new Map(models.map(m=>[m.uid,m]));
   const students=rawStudents.map(s=>{const m=map.get(s.uid)||{};return {...s,mastery:Math.round((m.overallMastery||0)*100),xp:m.xp||0,practice:m.totalCorrect||0,exam:m.examScore||0,model:m};});
   setRegisteredStudents(students);setTeacherData({models,attempts,reflections,attendance,examResults,events});
   return students;
 };
 useEffect(()=>{if(!session)return; (async()=>{setRegisteredStudents(await getRegisteredStudents()); if(session.role==="teacher") await refreshTeacherData();})();},[session?.role]);

 useEffect(()=>{
   if(!session?.uid || session.role!=="student") return;
   const startedAt=new Date().toISOString();
   const id=`app-session-${session.uid}-${Date.now()}`;
   appSessionRef.current={id,startedMs:Date.now(),startedAt};
   recordLearningEvent({id,uid:session.uid,name:session.name,role:"student",type:"app_session",startedAt,createdAt:startedAt,durationSeconds:0,active:true,educationLevel:session.educationLevel,grade:session.grade,rombel:session.rombel,school:session.school});
   const heartbeat=setInterval(()=>{const ref=appSessionRef.current;if(!ref)return;recordLearningEvent({id:ref.id,uid:session.uid,type:"session_heartbeat",startedAt:ref.startedAt,createdAt:new Date().toISOString(),durationSeconds:Math.floor((Date.now()-ref.startedMs)/1000),active:true});},30000);
   return()=>{clearInterval(heartbeat);const ref=appSessionRef.current;if(ref){recordLearningEvent({id:ref.id,uid:session.uid,type:"app_session",startedAt:ref.startedAt,endedAt:new Date().toISOString(),createdAt:new Date().toISOString(),durationSeconds:Math.floor((Date.now()-ref.startedMs)/1000),active:false});appSessionRef.current=null;}};
 },[session?.uid,session?.role]);

 useEffect(()=>{
   if(!session?.uid || session.role!=="student") return;
   const now=Date.now();
   const prev=screenTimerRef.current;
   if(prev.screen && prev.startedAt && prev.screen!==state.screen){
     const duration=Math.floor((now-prev.startedAt)/1000);
     if(duration>1) recordLearningEvent({uid:session.uid,name:session.name,role:"student",type:"screen_time",screen:prev.screen,durationSeconds:duration,startedAt:new Date(prev.startedAt).toISOString(),endedAt:new Date(now).toISOString(),createdAt:new Date(now).toISOString(),educationLevel:session.educationLevel,grade:session.grade,rombel:session.rombel,school:session.school});
   }
   screenTimerRef.current={screen:state.screen,startedAt:now};
 },[state.screen,session?.uid,session?.role]);

 useEffect(()=>()=>{
   if(session?.uid && session.role==="student") {
     const prev=screenTimerRef.current; if(prev.screen&&prev.startedAt){const duration=Math.floor((Date.now()-prev.startedAt)/1000);if(duration>1)recordLearningEvent({uid:session.uid,name:session.name,role:"student",type:"screen_time",screen:prev.screen,durationSeconds:duration,startedAt:new Date(prev.startedAt).toISOString(),endedAt:new Date().toISOString(),createdAt:new Date().toISOString()});}
   }
 },[session?.uid,session?.role]);

 useEffect(()=>{
   if(!session?.uid) return;
   let alive=true;let unsubscribe=()=>{};
   (async()=>{
     const model=await getStudentModel(session.uid,emptyModel());
     if(alive)setState(s=>({...s,studentModel:{...s.studentModel,...model}}));
     unsubscribe=await subscribeStudentModel(session.uid,model2=>{if(alive)setState(s=>({...s,studentModel:{...s.studentModel,...model2}}));});
     const [refs,att]=await Promise.all([listReflections(),listAttendance()]);
     if(alive){setStudentReflections(refs);setStudentAttendance(att);}
   })();
   return()=>{alive=false;unsubscribe?.();};
 },[session?.uid]);

 useEffect(()=>{
   let alive=true;let unsubscribe=()=>{};
   (async()=>{const cloud=await loadCloudComics();if(!alive)return;if(cloud!==null){setState(s=>({...s,comics:mergeComicCollections(s.comics,cloud)}));unsubscribe=await subscribeCloudComics(items=>{if(alive)setState(s=>({...s,comics:mergeComicCollections(s.comics,items)}));});}})();
   return()=>{alive=false;unsubscribe?.();};
 },[session?.role]);
 useEffect(()=>{
   let alive=true;let unsubscribe=()=>{};
   (async()=>{unsubscribe=await subscribeCloudQuestions(items=>{if(alive)setState(s=>({...s,questions:items}));});})();
   return()=>{alive=false;unsubscribe?.();};
 },[session?.role]);

 const mode=session?.role||null;
 const selectedComic=useMemo(()=>state.comics.find(c=>c.id===state.selectedComicId)||null,[state.comics,state.selectedComicId]);
 const visibleStudentQuestions=useMemo(()=>state.questions.filter(q=>q.status!=="Draft" && (!q.educationLevel||q.educationLevel===session?.educationLevel) && (!q.grade||q.grade===session?.grade)),[state.questions,session?.educationLevel,session?.grade]);
 const leaderboard=useMemo(()=>registeredStudents.filter(s=>!session?.school||!s.school||s.school===session.school).filter(s=>!session?.grade||s.grade===session.grade).filter(s=>!session?.rombel||s.rombel===session.rombel),[registeredStudents,session?.school,session?.grade,session?.rombel]);
 const teacherVisibleStudents=useMemo(()=>registeredStudents.filter(s=>!session?.school||!s.school||s.school===session.school),[registeredStudents,session?.school]);
 const visibleStudentIds=useMemo(()=>new Set(teacherVisibleStudents.map(s=>s.uid)),[teacherVisibleStudents]);
 const teacherAttempts=useMemo(()=>teacherData.attempts.filter(a=>!visibleStudentIds.size||visibleStudentIds.has(a.uid)),[teacherData.attempts,visibleStudentIds]);
 const teacherReflections=useMemo(()=>teacherData.reflections.filter(r=>!visibleStudentIds.size||visibleStudentIds.has(r.uid)),[teacherData.reflections,visibleStudentIds]);
 const teacherAttendance=useMemo(()=>teacherData.attendance.filter(r=>!visibleStudentIds.size||visibleStudentIds.has(r.uid)),[teacherData.attendance,visibleStudentIds]);
 const teacherExamResults=useMemo(()=>teacherData.examResults.filter(r=>!visibleStudentIds.size||visibleStudentIds.has(r.uid)),[teacherData.examResults,visibleStudentIds]);
 const teacherLearningEvents=useMemo(()=>teacherData.events.filter(e=>!visibleStudentIds.size||visibleStudentIds.has(e.uid)),[teacherData.events,visibleStudentIds]);

 const navigate=(screen,comicId=null,readerContext=null)=>{setState(s=>({...s,screen,selectedComicId:typeof comicId==="string"?comicId:(screen==="tutor"?s.selectedComicId:comicId),currentReaderContext:readerContext||s.currentReaderContext}));setDrawerOpen(false)};
 if(!session)return authPage==="register"?<RegistrationPage onBack={()=>setAuthPage("login")} onRegister={s=>{setSession(s);setState(x=>({...x,screen:s.role==="teacher"?"teacher-dashboard":"student-dashboard"}));setAuthPage("login")}}/>:<LoginPage onRegisterClick={()=>setAuthPage("register")} onLogin={s=>{setSession(s);setState(x=>({...x,screen:s.role==="teacher"?"teacher-dashboard":"student-dashboard"}));}}/>;
 const onLogout=async()=>{await logout();setSession(null);setAuthPage("login");};
 const handleCreate=form=>{const c=createComic({...form,school:session?.school||"",createdBy:session?.uid||"current-teacher"});setState(s=>({...s,comics:[c,...s.comics],selectedComicId:c.id,screen:"comic-editor"}));saveCloudComic(c);};
 const handleSaveComic=async u=>{const updated={...u,school:u.school||session?.school||"",createdBy:u.createdBy||session?.uid||"current-teacher",updatedAt:new Date().toISOString().slice(0,10)};setState(s=>({...s,comics:updateComic(s.comics,updated)}));return saveCloudComic(updated);};
 const handleSaveQuestion=async q=>{const payload={...q,createdBy:session?.uid||"current-teacher",updatedAt:new Date().toISOString()};setState(s=>({...s,questions:[...s.questions.filter(x=>x.id!==q.id),payload]}));await saveCloudQuestion(payload);};
 const handleDeleteQuestion=async id=>{setState(s=>({...s,questions:s.questions.filter(q=>q.id!==id)}));await deleteCloudQuestion(id);};

 const touchActivity=(model,bonus=0)=>{const now=new Date();const today=now.toISOString().slice(0,10);const last=model.lastActivityAt?.slice?.(0,10);let streak=model.streak||0;if(last!==today){if(last){const prev=new Date(last);const diff=Math.round((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())-Date.UTC(prev.getFullYear(),prev.getMonth(),prev.getDate()))/86400000);streak=diff===1?Math.max(1,streak+1):1;}else streak=1;}return {...model,streak,xp:(model.xp||0)+bonus,lastActivityAt:now.toISOString()};};
 const handleAnswer=async(q,aIndex,modeName="practice",durationSeconds=0)=>{
   const baseline=diagnoseAnswer(q,aIndex);
   const ai=await correctAnswerWithAI({question:q,selectedAnswer:q.options?.[aIndex],correctAnswer:q.options?.[q.answer],baselineDiagnosis:baseline,context:{educationLevel:session?.educationLevel,grade:session?.grade,school:session?.school,studentMastery:state.studentModel?.concepts?.[q.conceptId]?.mastery||0,conceptId:q.conceptId,conceptName:concepts[q.conceptId]?.name||q.conceptId}});
   const d={...baseline,...ai,explanation:ai?.explanation||baseline.explanation,misconceptionTag:ai?.misconceptionTag??baseline.misconceptionTag,confidence:Number(ai?.confidence??baseline.confidence)};
   const next=touchActivity(updateMastery(state.studentModel,q.conceptId,d),d.correct?10:3);
   setState(s=>({...s,studentModel:next}));
   if(session?.uid){await Promise.all([saveStudentModel(session.uid,next),recordAttempt({uid:session.uid,name:session.name,questionId:q.id,conceptId:q.conceptId,selectedIndex:aIndex,correct:d.correct,score:d.correct?100:0,mode:modeName,educationLevel:session.educationLevel,grade:session.grade,school:session.school,misconceptionTag:d.misconceptionTag,aiCorrection:d}),recordLearningEvent({uid:session.uid,type:modeName==="reader-quiz"?"quiz_attempt":"question_attempt",mode:modeName,durationSeconds:Number(durationSeconds)||0,payload:{questionId:q.id,conceptId:q.conceptId,correct:d.correct,mode:modeName,aiCorrection:d}})]);}
   let recommendation=null;
   if(modeName!=="exam"){
     recommendation=await recommendNextQuestion({studentModel:next,questions:visibleStudentQuestions,recentAttempts:[{questionId:q.id,conceptId:q.conceptId,correct:d.correct}]});
     if(!recommendation?.questionId){recommendation={...recommendation,questionId:null,localFallback:true};}
   }
   return {...d,recommendation};
 };
 const handleTutor=async(message,context={})=>{const r=await getTutorReply({message,context,history:tutorMessages.slice(-8)});setTutorMessages(m=>[...m,{role:"user",text:message},{role:"assistant",text:r.reply}]);if(session?.uid)await recordLearningEvent({uid:session.uid,type:"tutor_message",payload:{message,context,ai:r.ai,unavailable:r.unavailable||false,provider:r.meta?.provider||null,model:r.meta?.model||null,latencyMs:r.meta?.latencyMs||null,usage:r.meta?.usage||null}});return r;};
 const handleReaderProgress=async({comic,episodeIndex,panelIndex,durationSeconds=0})=>{if(!session?.uid||!comic)return;const key=`${comic.id}:${episodeIndex}:${panelIndex}`;await recordLearningEvent({uid:session.uid,name:session.name,role:"student",type:"comic_panel_view",comicId:comic.id,episodeIndex,panelIndex,durationSeconds:Number(durationSeconds)||0,createdAt:new Date().toISOString()});if(state.studentModel.completedPanels?.[key]){setState(s=>({...s,currentReaderContext:{comicId:comic.id,episodeIndex,panelIndex}}));return;}const next=touchActivity({...state.studentModel,completedPanels:{...(state.studentModel.completedPanels||{}),[key]:1}},2);const allDone=(comic.episodes||[]).every(ep=>(ep.panels||[]).every((_,pi)=>next.completedPanels?.[`${comic.id}:${comic.episodes.indexOf(ep)}:${pi}`]));if(allDone&&!next.completedComics.includes(comic.id))next.completedComics=[...(next.completedComics||[]),comic.id];setState(s=>({...s,studentModel:next,currentReaderContext:{comicId:comic.id,episodeIndex,panelIndex}}));await saveStudentModel(session.uid,next);};
 const handleReflection=async r=>{await saveReflection({...r,uid:session.uid});setStudentReflections(await listReflections());if(session?.uid)await recordLearningEvent({uid:session.uid,type:"reflection_submitted"});};
 const handleAttendance=async r=>{await saveAttendance(r);setStudentAttendance(await listAttendance());if(session?.uid)await recordLearningEvent({uid:session.uid,type:"attendance"});return true;};
 const handleExamComplete=async(result,eligible,answers)=>{let next=touchActivity(state.studentModel, result.score>=80?30:10);for(let i=0;i<eligible.length;i++){const q=eligible[i];if(answers[i]==null)continue;const d=diagnoseAnswer(q,answers[i]);next=updateMastery(next,q.conceptId,d);await recordAttempt({uid:session.uid,name:session.name,questionId:q.id,conceptId:q.conceptId,selectedIndex:answers[i],correct:d.correct,score:d.correct?100:0,mode:"exam",educationLevel:session.educationLevel,grade:session.grade,school:session.school,examId:`exam-${Date.now()}`});}next.examScore=result.score;setState(s=>({...s,studentModel:next}));await saveStudentModel(session.uid,next);await saveExamResult({...result,uid:session.uid,name:session.name,school:session.school,grade:session.grade,rombel:session.rombel});await refreshTeacherData();};
 const handleAIExplain=({message,context})=>handleTutor(message,context);
 const handleJoinAccess=async(code)=>{const found=await findClassAccessCode(code);if(!found)return {ok:false,message:"Kode akses tidak ditemukan atau sudah nonaktif."};const patch={school:found.school||"",educationLevel:found.educationLevel||session.educationLevel,grade:found.grade||session.grade,rombel:found.rombel||session.rombel};await updateUserProfile(session.uid,patch);setSession(s=>({...s,...patch}));setState(s=>({...s,currentReaderContext:null}));return {ok:true,message:`Berhasil terhubung ke ${patch.school||"kelas"} · ${patch.grade||""} ${patch.rombel||""}.`};};
 const seedTestPack=async()=>{
   const comic=createComic({title:"Paket Uji Coba — Eksponen",description:"Konten uji coba untuk menguji E-Comic, persamaan, Tutor AI, kuis cepat, dan adaptive practice.",subject:"Eksponen",educationLevel:session.educationLevel||"SMA",grade:session.grade||"X",className:session.rombel?`${session.grade||"X"} ${session.rombel}`:"",school:session.school||"",status:"Published",concepts:["E1","E2"] ,createdBy:session.uid||"teacher"});
   comic.episodes=[{id:`ep-${Date.now()}-1`,title:"Mengenal Pola",description:"Memahami eksponen dari pola perkalian berulang.",order:1,concepts:["E1"],panels:[{id:`p-${Date.now()}-1`,order:1,title:"Pola Perkalian",narration:"Jumlah bakteri menjadi dua kali lipat setiap jam.",dialogue:"Jika awalnya 2 bakteri, berapa setelah 3 jam?",equation:"2^3=8",conceptIds:["E1"],characters:["Sari","Riko"],imageUrl:""},{id:`p-${Date.now()}-2`,order:2,title:"Menuliskan Bentuk Pangkat",narration:"Perkalian berulang dapat ditulis dengan bentuk pangkat.",dialogue:"2 × 2 × 2 dapat ditulis sebagai 2^3.",equation:"2\times2\times2=2^3=8",conceptIds:["E1"],characters:["Sari"]}]},{id:`ep-${Date.now()}-2`,title:"Perkalian Eksponen",description:"Mengenal aturan perkalian dengan basis sama.",order:2,concepts:["E2"],panels:[{id:`p-${Date.now()}-3`,order:1,title:"Aturan Perkalian",narration:"Jika basis sama, pangkat dapat dijumlahkan.",dialogue:"Bagaimana dengan 2^2 × 2^3?",equation:"2^2\times2^3=2^5",conceptIds:["E2"],characters:["Riko"]}]}];
   const qs=[{id:`q-${Date.now()}-1`,question:"Bentuk perkalian berulang dari 2^3 adalah ...",equation:"2^3",options:["2+2+2","2×2×2","2×3","3×3"],answer:1,explanation:"Pangkat 3 berarti basis 2 dikalikan dengan dirinya sendiri tiga kali.",conceptId:"E1",level:1,difficulty:1,educationLevel:session.educationLevel||"SMA",grade:session.grade||"X",status:"Published",misconceptionTags:["EXPONENT_AS_MULTIPLICATION"]},{id:`q-${Date.now()}-2`,question:"Hasil dari 2^2 × 2^3 adalah ...",equation:"2^2\times2^3",options:["2^5","2^6","4^5","4^6"],answer:0,explanation:"Untuk basis sama, pangkat dijumlahkan.",conceptId:"E2",level:2,difficulty:2,educationLevel:session.educationLevel||"SMA",grade:session.grade||"X",status:"Published",misconceptionTags:["EXPONENT_MULTIPLY_POWERS"]}];
   setState(s=>({...s,comics:[comic,...s.comics],questions:[...s.questions,...qs],selectedComicId:comic.id,screen:"comic-editor"}));await saveCloudComic(comic);for(const q of qs)await saveCloudQuestion(q);
 };
 const teacherItems=[["teacher-dashboard","dashboard","Beranda"],["teacher-grades","grades","Nilai Siswa"],["analytics","analytics","Analitik"],["teacher-question-progress","question","Progress per Soal"],["teacher-ranking","rank","Peringkat"],["teacher-exam-times","time","Jawaban & Waktu Ujian"],["teacher-knowledge","knowledge","Knowledge Base"],["comic-management","comic","Kelola Materi E-Comic"],["question-bank","question","Bank Soal"],["teacher-reflections","reflection","Refleksi Siswa"],["teacher-access","access","Kode Akses"],["teacher-attendance","attendance","Presensi"],["teacher-activity","activity","Aktivitas Siswa"],["teacher-migration","migration","Data ITS"],["teacher-profile","profile","Profil"]];
 const studentItems=[["student-dashboard","dashboard","Dashboard"],["tutor","tutor","Tutor AI"],["comic-library","comic","Materi E-Comic"],["practice","practice","Latihan"],["exam","exam","Ujian"],["progress","progress","Progress"],["ranking","rank","Peringkat"],["badges","badge","Badge"],["reflection","reflection","Refleksi"],["attendance","attendance","Presensi"],["profile","profile","Profil"]];
 const renderTeacher=()=>{switch(state.screen){case"comic-management":return <ComicManagement comics={state.comics.filter(c=>!session.school||!c.school||c.school===session.school)} navigate={navigate} onCreate={handleCreate} onEdit={id=>navigate("comic-editor",id)}/>;case"comic-editor":return <ComicEditorPage comic={selectedComic} onBack={()=>navigate("comic-management")} onSave={handleSaveComic}/>;case"comic-preview":return <ComicReaderPage comic={selectedComic} studentModel={emptyModel()} questions={state.questions} navigate={navigate} session={session}/>;case"question-bank":return <QuestionBankPage questions={state.questions} onSave={handleSaveQuestion} onDelete={handleDeleteQuestion}/>;case"analytics":return <AnalyticsPage students={teacherVisibleStudents} models={teacherData.models} attempts={teacherAttempts}/>;case"teacher-grades":return <TeacherGrades students={teacherVisibleStudents} session={session} questions={state.questions} onRefresh={refreshTeacherData}/>;case"teacher-question-progress":return <TeacherQuestionProgress questions={state.questions} attempts={teacherAttempts}/>;case"teacher-ranking":return <TeacherRanking students={teacherVisibleStudents}/>;case"teacher-exam-times":return <TeacherExamTimes examResults={teacherExamResults} students={teacherVisibleStudents}/>;case"teacher-knowledge":return <TeacherKnowledge/>;case"teacher-reflections":return <TeacherReflections reflections={teacherReflections} students={teacherVisibleStudents}/>;case"teacher-access":return <TeacherAccess session={session}/>;case"teacher-attendance":return <TeacherAttendance records={teacherAttendance} students={teacherVisibleStudents}/>;case"teacher-activity":return <TeacherActivityPage students={teacherVisibleStudents} events={teacherLearningEvents} onRefresh={refreshTeacherData}/>;case"teacher-migration":return <TeacherMigrationPage session={session}/>;case"teacher-profile":return <TeacherProfile session={session}/>;default:return <TeacherDashboard state={state} navigate={navigate} students={teacherVisibleStudents} models={teacherData.models} attempts={teacherAttempts} events={teacherLearningEvents} session={session} onRefresh={refreshTeacherData} onSeedPack={seedTestPack} onAIRecommend={getTeacherRecommendation}/>} };
 const renderStudent=()=>{switch(state.screen){case"tutor":return <TutorPage comic={selectedComic} studentModel={state.studentModel} messages={tutorMessages} onSend={handleTutor} readerContext={state.currentReaderContext} session={session}/>;case"comic-library":return <ComicLibrary comics={state.comics} session={session} navigate={navigate}/>;case"comic-reader":return <ComicReaderPage comic={selectedComic} studentModel={state.studentModel} questions={visibleStudentQuestions} navigate={navigate} onPanelViewed={handleReaderProgress} onAnswer={handleAnswer} onAIExplain={handleAIExplain} readerContext={state.currentReaderContext} session={session}/>;case"practice":return <PracticePage questions={visibleStudentQuestions} studentModel={state.studentModel} onAnswer={handleAnswer} onAIExplain={handleAIExplain}/>;case"exam":return <ExamPage questions={state.questions} session={session} onComplete={handleExamComplete}/>;case"progress":return <ProgressPage studentModel={state.studentModel}/>;case"ranking":return <RankingPage leaderboard={leaderboard} session={session}/>;case"badges":return <BadgePage studentModel={state.studentModel}/>;case"reflection":return <ReflectionPage session={session} reflections={studentReflections} onSave={handleReflection}/>;case"attendance":return <AttendancePage session={session} records={studentAttendance} onCheckIn={handleAttendance}/>;case"profile":return <ProfilePage session={session} onJoinAccess={handleJoinAccess}/>;default:return <StudentDashboard state={state} navigate={navigate} session={session}/>;} };
 return <><FlexibleStyles/><div className="ac-app"><FlexibleSidebar open={drawerOpen} mode={mode} screen={state.screen} items={mode==="teacher"?teacherItems:studentItems} onNavigate={navigate} onLogout={onLogout} session={session} onClose={()=>setDrawerOpen(false)}/>{drawerOpen&&<button aria-label="Tutup menu" className="ecomic-drawer-backdrop" onClick={()=>setDrawerOpen(false)}/>}<div className="ac-main"><FlexibleTopbar mode={mode} session={session} onMenu={()=>setDrawerOpen(v=>!v)}/><main className="ac-content">{mode==="teacher"?renderTeacher():renderStudent()}</main></div></div></>;
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
function FlexibleSidebar({open,mode,screen,items,onNavigate,onLogout,session,onClose}){const groups=mode==="teacher"?[{label:"UTAMA",ids:["teacher-dashboard","teacher-grades","analytics","teacher-question-progress","teacher-ranking","teacher-exam-times"]},{label:"KONTEN",ids:["teacher-knowledge","comic-management","question-bank"]},{label:"SISWA & KELAS",ids:["teacher-reflections","teacher-access","teacher-attendance","teacher-activity","teacher-migration"]},{label:"AKUN",ids:["teacher-profile"]}]:[{label:"BELAJAR",ids:["student-dashboard","tutor","comic-library","practice","exam"]},{label:"PERKEMBANGAN",ids:["progress","ranking","badges","reflection","attendance"]},{label:"AKUN",ids:["profile"]}];const byId=new Map(items.map(x=>[x[0],x]));return <aside className={`ecomic-sidebar ${open?"is-open":""}`}><div className="ecomic-sidebar-head"><div className="ac-brand"><div className="ac-brand-mark"><GraduationCap size={22}/></div><div><div className="ac-brand-name">AC-ITS</div><div className="ac-brand-sub">E-Comic Learning</div></div></div><button className="ecomic-close" aria-label="Tutup menu" onClick={onClose}><X size={19}/></button></div><div className="ecomic-profile"><div className="avatar">{session?.name?.[0]||"A"}</div><div className="profile-copy"><strong>{session?.name||"Pengguna"}</strong><span>{mode==="teacher"?"Guru":"Siswa"}</span></div></div><nav className="ecomic-nav">{groups.map(g=><div className="ecomic-nav-group" key={g.label}><div className="ecomic-nav-label">{g.label}</div>{g.ids.map(id=>{const item=byId.get(id);if(!item)return null;const [itemId,iconKey,label]=item;const Icon=menuIcons[iconKey]||BookOpen;return <button key={itemId} className={`ecomic-nav-item ${screen===itemId?"active":""}`} onClick={()=>onNavigate(itemId)}><Icon size={18}/><span>{label}</span></button>})}</div>)}</nav><div className="ecomic-sidebar-footer"><button className="ecomic-logout" onClick={onLogout}><LogOut size={17}/><span>Keluar</span></button></div></aside>}
function FlexibleTopbar({mode,session,onMenu}){return <header className="ecomic-topbar"><button className="ecomic-menu-button" aria-label="Buka menu" onClick={onMenu}><Menu size={22}/></button><div className="ecomic-top-title"><strong>AC-ITS</strong><span>{mode==="teacher"?"Teacher Content & Analytics Space":"Adaptive Learning Space"}</span></div><div className="ecomic-top-actions"><button className="icon-button"><Search size={18}/></button><button className="icon-button"><Bell size={18}/></button><div className="top-user"><div className="top-avatar">{session?.name?.[0]||"A"}</div></div></div></header>}
