import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db, firebaseEnabled, ensureFirebaseAuth } from "./firebaseService";
import { getStudentModel, listAttempts, listReflections, listAttendance, listExamResults, listLearningEvents } from "./learningDataService";

export async function loadTeacherDataBundle(teacherUid) {
  if (!teacherUid) return { ok:false, code:"TEACHER_UID_MISSING", message:"UID Guru tidak tersedia." };
  if (!firebaseEnabled || !db || !auth) return { ok:false, code:"FIREBASE_DISABLED", message:"Firebase belum aktif." };
  const ready = await ensureFirebaseAuth();
  const current = auth.currentUser;
  if (!ready || !current || current.isAnonymous || current.uid !== teacherUid) {
    return {
      ok:false,
      code:"AUTH_SESSION_MISMATCH",
      message:"Sesi Firebase Guru tidak cocok dengan akun Guru yang sedang dibuka.",
      expectedUid:teacherUid,
      firebaseUid:current?.uid || null,
      anonymous:Boolean(current?.isAnonymous),
    };
  }
  try {
    const classSnap = await getDocs(query(collection(db,"classes_v3"), where("teacherUid","==",teacherUid)));
    const classes = classSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(`${a.grade||""}${a.rombel||""}`).localeCompare(String(`${b.grade||""}${b.rombel||""}`)));
    const studentSnap = await getDocs(query(collection(db,"users"), where("classTeacherUid","==",teacherUid)));
    const students = studentSnap.docs.map(d=>({uid:d.id,...d.data()})).filter(s=>s.role==="student" && s.classTeacherUid===teacherUid);
    const models = await Promise.all(students.map(s=>getStudentModel(s.uid,{})));
    const [attempts, reflections, attendance, examResults, events] = await Promise.all([
      listAttempts({teacherUid}),
      listReflections({teacherUid}),
      listAttendance({teacherUid}),
      listExamResults({teacherUid}),
      listLearningEvents({teacherUid}),
    ]);
    const classIds = new Set(classes.map(c=>c.id));
    const visible = students.filter(s=>classIds.size ? classIds.has(s.classId) : true);
    const modelMap = new Map(models.map(m=>[m.uid,m]));
    const enriched = visible.map(s=>{
      const model=modelMap.get(s.uid)||{};
      return {...s,model,mastery:Math.round(Number(model.overallMastery||0)*100),xp:Number(model.xp||0),practice:Number(model.totalCorrect||0),exam:Number(model.examScore||0)};
    });
    const filterClass = row => !row.classId || classIds.has(row.classId) || visible.some(s=>s.uid===row.uid);
    return {
      ok:true, classes, students:enriched, models, attempts:attempts.filter(filterClass), reflections:reflections.filter(filterClass), attendance:attendance.filter(filterClass), examResults:examResults.filter(filterClass), events:events.filter(filterClass),
    };
  } catch (error) {
    console.error("TEACHER_DATA_BUNDLE_ERROR",error);
    return {ok:false,code:error?.code||"TEACHER_DATA_ERROR",message:error?.message||"Gagal mengambil data Guru."};
  }
}
