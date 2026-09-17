import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db, firebaseEnabled, ensureFirebaseAuth } from "./firebaseService";

const normalize = (v) => String(v ?? "").trim();

async function ready(){ return Boolean(firebaseEnabled && db && await ensureFirebaseAuth()); }

export async function readLegacyCollection(collectionName, limit = 200){
  const name = normalize(collectionName);
  if (!name) return { ok:false, rows:[], message:"Nama collection belum diisi." };
  if (!(await ready())) return { ok:false, rows:[], message:"Firebase belum siap atau belum terhubung." };
  try {
    const snap = await getDocs(collection(db, name));
    return { ok:true, rows:snap.docs.slice(0, Math.max(1, Math.min(limit, 500))).map(d=>({id:d.id,...d.data()})), total:snap.size, collection:name };
  } catch (error) {
    return { ok:false, rows:[], message:`Gagal membaca collection ${name}: ${error?.message || "unknown error"}` };
  }
}

async function resolveCurrentUser({uid,email}){
  if (uid) return uid;
  const normalized = normalize(email).toLowerCase();
  if (!normalized || !db) return null;
  try {
    const snap = await getDocs(query(collection(db,"users"), where("email","==",normalized)));
    return snap.empty ? null : snap.docs[0].id;
  } catch { return null; }
}

function field(obj, names, fallback=""){
  for(const name of names){ if(obj?.[name] != null && obj[name] !== "") return obj[name]; }
  return fallback;
}

function toProfile(row, uid){
  const role = field(row,["role","userRole","type"],"student");
  return {
    name: field(row,["name","fullName","fullname","nama","studentName"],"Siswa ITS"),
    email: normalize(field(row,["email","mail","emailAddress"],"" )).toLowerCase(),
    role,
    subtitle: role === "teacher" ? "Guru" : "Siswa",
    educationLevel: field(row,["educationLevel","jenjang","level","schoolLevel"],null),
    grade: field(row,["grade","kelas","class","classLevel"],null),
    rombel: field(row,["rombel","className","classRoom","group"],null),
    school: field(row,["school","sekolah","schoolName"],""),
    legacySource: "ITS",
    legacySourceId: row.id,
    migratedAt: new Date().toISOString(),
    ...(uid ? {uid} : {})
  };
}

export async function previewLegacyData(config={}){
  const collections = {
    users: config.users || "users",
    studentModels: config.studentModels || "studentModels",
    attempts: config.attempts || "attempts",
    learningEvents: config.learningEvents || "learningEvents",
  };
  const [users,models,attempts,events] = await Promise.all([
    readLegacyCollection(collections.users,500),
    readLegacyCollection(collections.studentModels,500),
    readLegacyCollection(collections.attempts,500),
    readLegacyCollection(collections.learningEvents,500),
  ]);
  return {collections,users,models,attempts,events};
}


export async function migrateLegacyJson(json={}, {overwriteProfiles=false}={}){
  if (!(await ready())) return {ok:false,message:"Firebase belum siap atau belum terhubung.",counts:{users:0,studentModels:0,attempts:0,learningEvents:0}};
  const users=Array.isArray(json.users)?json.users:[];
  const models=Array.isArray(json.studentModels)?json.studentModels:[];
  const attempts=Array.isArray(json.attempts)?json.attempts:[];
  const events=Array.isArray(json.learningEvents)?json.learningEvents:[];
  const counts={users:0,studentModels:0,attempts:0,learningEvents:0};
  const resolve=async row=>resolveCurrentUser({uid:row.uid||row.userId||row.studentUid,email:row.email||row.studentEmail});
  for(const row of users){
    if(String(row.role||"student")!=="student") continue;
    const uid=await resolve(row); if(!uid) continue;
    await setDoc(doc(db,"users",uid),toProfile(row,uid),{merge:overwriteProfiles});
    await setDoc(doc(db,"migrationSnapshots",`json-user-${row.id||uid}`),{kind:"user",sourceCollection:"json",sourceId:row.id||uid,targetUid:uid,sourceData:row,migratedAt:new Date().toISOString()},{merge:true});
    counts.users++;
  }
  for(const row of models){
    const uid=await resolve(row); if(!uid) continue; const {id,...data}=row;
    await setDoc(doc(db,"studentModels",uid),{...data,uid,legacyImported:true,legacySourceId:row.id||uid,updatedAt:new Date().toISOString()},{merge:true}); counts.studentModels++;
  }
  for(const row of attempts){
    const uid=await resolve(row); if(!uid) continue; const targetId=`legacy-json-attempt-${row.id||Date.now()}-${Math.random().toString(36).slice(2,7)}`; const {id,...data}=row;
    await setDoc(doc(db,"attempts",targetId),{...data,id:targetId,uid,legacyImported:true,legacySourceId:id||targetId,sourceSystem:"ITS",createdAt:row.createdAt||row.timestamp||new Date().toISOString()},{merge:true}); counts.attempts++;
  }
  for(const row of events){
    const uid=await resolve(row); if(!uid) continue; const targetId=`legacy-json-event-${row.id||Date.now()}-${Math.random().toString(36).slice(2,7)}`; const {id,...data}=row;
    await setDoc(doc(db,"learningEvents",targetId),{...data,id:targetId,uid,legacyImported:true,legacySourceId:id||targetId,sourceSystem:"ITS",createdAt:row.createdAt||row.timestamp||new Date().toISOString()},{merge:true}); counts.learningEvents++;
  }
  return {ok:true,counts};
}

export async function migrateLegacyData(config={}, {overwriteProfiles=false}={}){
  if (!(await ready())) return {ok:false,message:"Firebase belum siap atau belum terhubung.", counts:{users:0,studentModels:0,attempts:0,learningEvents:0}};
  const collections = {
    users: config.users || "users",
    studentModels: config.studentModels || "studentModels",
    attempts: config.attempts || "attempts",
    learningEvents: config.learningEvents || "learningEvents",
  };
  const preview = await previewLegacyData(collections);
  const counts={users:0,studentModels:0,attempts:0,learningEvents:0};

  // If the source collection is already an E-Comic collection, skip it rather than duplicating records.
  const sourceIsCurrent = (name,current) => normalize(name)===current;

  if(!sourceIsCurrent(collections.users,"users")){
    for(const row of preview.users.rows){
      if(String(row.role||"student") !== "student") continue;
      const email=normalize(field(row,["email","mail","emailAddress"],"")).toLowerCase();
      const uid=await resolveCurrentUser({uid:row.uid||row.userId,email});
      if(!uid) continue;
      await setDoc(doc(db,"users",uid),toProfile(row,uid),{merge:overwriteProfiles});
      await setDoc(doc(db,"migrationSnapshots",`user-${collections.users}-${row.id}`),{kind:"user",sourceCollection:collections.users,sourceId:row.id,targetUid:uid,sourceData:row,migratedAt:new Date().toISOString()},{merge:true});
      counts.users++;
    }
  }

  if(!sourceIsCurrent(collections.studentModels,"studentModels")){
    for(const row of preview.models.rows){
      const uid=await resolveCurrentUser({uid:row.uid||row.userId||row.studentUid,email:row.email});
      if(!uid) continue;
      const {id,...data}=row;
      await setDoc(doc(db,"studentModels",uid),{...data,uid,legacyImported:true,legacySourceId:row.id,updatedAt:new Date().toISOString()},{merge:true});
      await setDoc(doc(db,"migrationSnapshots",`model-${collections.studentModels}-${row.id}`),{kind:"studentModel",sourceCollection:collections.studentModels,sourceId:row.id,targetUid:uid,migratedAt:new Date().toISOString()},{merge:true});
      counts.studentModels++;
    }
  }

  if(!sourceIsCurrent(collections.attempts,"attempts")){
    for(const row of preview.attempts.rows){
      const uid=await resolveCurrentUser({uid:row.uid||row.userId||row.studentUid,email:row.email||row.studentEmail});
      if(!uid) continue;
      const targetId=`legacy-attempt-${collections.attempts}-${row.id}`;
      const {id,...data}=row;
      await setDoc(doc(db,"attempts",targetId),{...data,id:targetId,uid,legacyImported:true,legacySourceId:row.id,sourceSystem:"ITS",createdAt:row.createdAt||row.timestamp||new Date().toISOString()},{merge:true});
      counts.attempts++;
    }
  }

  if(!sourceIsCurrent(collections.learningEvents,"learningEvents")){
    for(const row of preview.events.rows){
      const uid=await resolveCurrentUser({uid:row.uid||row.userId||row.studentUid,email:row.email||row.studentEmail});
      if(!uid) continue;
      const targetId=`legacy-event-${collections.learningEvents}-${row.id}`;
      const {id,...data}=row;
      await setDoc(doc(db,"learningEvents",targetId),{...data,id:targetId,uid,legacyImported:true,legacySourceId:row.id,sourceSystem:"ITS",createdAt:row.createdAt||row.timestamp||new Date().toISOString()},{merge:true});
      counts.learningEvents++;
    }
  }

  return {ok:true,counts,collections};
}
