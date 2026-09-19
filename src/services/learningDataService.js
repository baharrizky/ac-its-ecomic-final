import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, where,
} from "firebase/firestore";
import { db, firebaseEnabled, ensureFirebaseAuth } from "./firebaseService";

const LOCAL_PREFIX = "ac-its-ecomic-data-v2:";

function localRead(key, fallback = []) {
  try {
    const raw = localStorage.getItem(LOCAL_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function localWrite(key, value) {
  try { localStorage.setItem(LOCAL_PREFIX + key, JSON.stringify(value)); } catch {}
}
function localUpsert(key, id, value) {
  const items = localRead(key, []);
  const next = [...items.filter(x => x.id !== id), { ...value, id }];
  localWrite(key, next);
  return value;
}
async function ready() {
  return Boolean(firebaseEnabled && db && await ensureFirebaseAuth());
}

export function createEmptyStudentModel(concepts = {}) {
  const entries = Object.fromEntries(Object.keys(concepts).map(id => [id, { mastery: 0, confidence: 0.25, attempts: 0, correct: 0 }]));
  return {
    overallMastery: 0,
    concepts: entries,
    misconceptions: [],
    currentLevel: 1,
    streak: 0,
    xp: 0,
    totalAttempts: 0,
    totalCorrect: 0,
    completedPanels: {},
    completedComics: [],
    lastActivityAt: null,
  };
}

export async function getStudentModel(uid, fallback) {
  if (!uid) return localRead(`studentModels/${uid || "anonymous"}`, fallback);
  if (await ready()) {
    try {
      const snap = await getDoc(doc(db, "studentModels_v2", uid));
      if (snap.exists()) return { ...fallback, ...snap.data() };
      await setDoc(doc(db, "studentModels_v2", uid), { ...fallback, uid, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) { console.warn("studentModel read failed", e); }
  }
  return localRead(`studentModels/${uid}`, fallback);
}

export async function saveStudentModel(uid, model) {
  const payload = { ...model, uid, updatedAt: new Date().toISOString() };
  localWrite(`studentModels/${uid || "anonymous"}`, payload);
  if (uid && await ready()) {
    try { await setDoc(doc(db, "studentModels_v2", uid), payload, { merge: true }); return true; }
    catch (e) { console.warn("studentModel write failed", e); }
  }
  return false;
}

export async function subscribeStudentModel(uid, onChange) {
  if (!(uid && await ready())) return () => {};
  return onSnapshot(doc(db, "studentModels_v2", uid), snap => { if (snap.exists()) onChange(snap.data()); }, error => console.warn("studentModel subscription failed", error));
}

export async function recordLearningEvent(event = {}) {
  const item = { ...event, createdAt: event.createdAt || new Date().toISOString() };
  const id = event.id || `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  localUpsert("learningEvents_v2", id, { ...item, id });
  if (await ready()) {
    try { await setDoc(doc(db, "learningEvents_v2", id), { ...item, id }, { merge: true }); return true; }
    catch (e) { console.warn("learning event write failed", e); }
  }
  return false;
}


export async function listLearningEvents(filters = {}) {
  if (await ready()) {
    try {
      const snap = await getDocs(collection(db, "learningEvents_v2"));
      let rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      Object.entries(filters).forEach(([key, value]) => {
        if (value != null && value !== "") rows = rows.filter(r => r[key] === value);
      });
      return rows.sort((a,b)=>String(b.createdAt||b.endedAt||b.startedAt||"").localeCompare(String(a.createdAt||a.endedAt||a.startedAt||"")));
    } catch (e) { console.warn("learning event list failed", e); }
  }
  let rows = localRead("learningEvents_v2", []);
  Object.entries(filters).forEach(([key, value]) => {
    if (value != null && value !== "") rows = rows.filter(r => r[key] === value);
  });
  return rows.sort((a,b)=>String(b.createdAt||b.endedAt||b.startedAt||"").localeCompare(String(a.createdAt||a.endedAt||a.startedAt||"")));
}

export async function recordAttempt(attempt = {}) {
  const item = { ...attempt, id: attempt.id || `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: attempt.createdAt || new Date().toISOString() };
  localUpsert("attempts_v2", item.id, item);
  if (await ready()) {
    try { await setDoc(doc(db, "attempts_v2", item.id), item, { merge: true }); return true; }
    catch (e) { console.warn("attempt write failed", e); }
  }
  return false;
}

export async function listAttempts(filters = {}) {
  if (await ready()) {
    try {
      const snap = await getDocs(collection(db, "attempts_v2"));
      let rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      Object.entries(filters).forEach(([key, value]) => { if (value != null && value !== "") rows = rows.filter(r => r[key] === value); });
      return rows.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    } catch (e) { console.warn("attempt list failed", e); }
  }
  let rows = localRead("attempts_v2", []);
  Object.entries(filters).forEach(([key, value]) => { if (value != null && value !== "") rows = rows.filter(r => r[key] === value); });
  return rows;
}

export async function listStudentModels() {
  if (await ready()) {
    try {
      const snap = await getDocs(collection(db, "studentModels_v2"));
      return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    } catch (e) { console.warn("student models list failed", e); }
  }
  const rows = localRead("studentModels_v2", []);
  return Array.isArray(rows) ? rows : [];
}

export async function saveReflection(reflection = {}) {
  const item = { ...reflection, id: reflection.id || `reflection-${Date.now()}`, createdAt: reflection.createdAt || new Date().toISOString() };
  localUpsert("reflections_v2", item.id, item);
  if (await ready()) {
    try { await setDoc(doc(db, "reflections_v2", item.id), item, { merge: true }); return true; }
    catch (e) { console.warn("reflection write failed", e); }
  }
  return false;
}

export async function listReflections() {
  if (await ready()) {
    try { const snap = await getDocs(collection(db, "reflections_v2")); return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||""))); }
    catch (e) { console.warn("reflection list failed", e); }
  }
  return localRead("reflections_v2", []);
}

export async function saveAttendance(item = {}) {
  const record = { ...item, id: item.id || `attendance-${item.uid || "u"}-${item.date || new Date().toISOString().slice(0,10)}` };
  localUpsert("attendance_v2", record.id, record);
  if (await ready()) {
    try { await setDoc(doc(db, "attendance_v2", record.id), record, { merge: true }); return true; }
    catch (e) { console.warn("attendance write failed", e); }
  }
  return false;
}

export async function listAttendance(filters = {}) {
  if (await ready()) {
    try {
      const snap = await getDocs(collection(db, "attendance_v2"));
      let rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      Object.entries(filters).forEach(([key, value]) => { if (value != null && value !== "") rows = rows.filter(r => r[key] === value); });
      return rows.sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
    } catch (e) { console.warn("attendance list failed", e); }
  }
  let rows = localRead("attendance_v2", []);
  Object.entries(filters).forEach(([key, value]) => { if (value != null && value !== "") rows = rows.filter(r => r[key] === value); });
  return rows;
}

export async function createClassAccessCode(data = {}) {
  const id = `class-${Date.now()}`;
  let code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const item = { ...data, id, code, active: true, createdAt: new Date().toISOString() };
  localUpsert("classAccessCodes_v2", id, item);
  if (await ready()) {
    try { await setDoc(doc(db, "classAccessCodes_v2", id), item, { merge: true }); return item; }
    catch (e) { console.warn("class code write failed", e); }
  }
  return item;
}

export async function listClassAccessCodes(teacherUid) {
  if (await ready()) {
    try {
      const snap = await getDocs(collection(db, "classAccessCodes_v2"));
      let rows = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      if (teacherUid) rows = rows.filter(r => !r.teacherUid || r.teacherUid === teacherUid);
      return rows.sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
    } catch (e) { console.warn("class code list failed", e); }
  }
  let rows = localRead("classAccessCodes_v2", []);
  if (teacherUid) rows = rows.filter(r => !r.teacherUid || r.teacherUid === teacherUid);
  return rows;
}

export async function deactivateClassAccessCode(id) {
  const rows = localRead("classAccessCodes_v2", []);
  localWrite("classAccessCodes_v2", rows.map(r => r.id === id ? { ...r, active:false } : r));
  if (await ready()) { try { await setDoc(doc(db, "classAccessCodes_v2", id), { active:false }, { merge:true }); return true; } catch {} }
  return false;
}

export async function saveKnowledgeItem(item = {}) {
  const record = { ...item, id: item.id || `kb-${Date.now()}`, updatedAt:new Date().toISOString() };
  localUpsert("knowledgeBase_v2", record.id, record);
  if (await ready()) { try { await setDoc(doc(db,"knowledgeBase_v2",record.id),record,{merge:true}); return true; } catch(e){ console.warn("knowledge write failed",e); } }
  return false;
}

export async function deleteKnowledgeItem(id) {
  localWrite("knowledgeBase_v2", localRead("knowledgeBase_v2", []).filter(r=>r.id!==id));
  if(await ready()){try{await deleteDoc(doc(db,"knowledgeBase_v2",id));return true;}catch{}}
  return false;
}

export async function listKnowledgeItems() {
  if(await ready()){try{const snap=await getDocs(collection(db,"knowledgeBase_v2"));return snap.docs.map(d=>({id:d.id,...d.data()}));}catch(e){console.warn("knowledge list failed",e);}}
  return localRead("knowledgeBase_v2",[]);
}

export async function saveExamResult(result = {}) {
  const item = { ...result, id: result.id || `exam-${Date.now()}`, createdAt:result.createdAt || new Date().toISOString() };
  localUpsert("examResults_v2", item.id, item);
  if(await ready()){try{await setDoc(doc(db,"examResults_v2",item.id),item,{merge:true});return true;}catch(e){console.warn("exam result failed",e);}}
  return false;
}

export async function listExamResults() {
  if(await ready()){try{const snap=await getDocs(collection(db,"examResults_v2"));return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));}catch(e){console.warn("exam list failed",e);}}
  return localRead("examResults_v2",[]);
}

export async function findClassAccessCode(code) {
  const normalized=String(code||"").trim().toUpperCase();
  if(!normalized)return null;
  const rows=await listClassAccessCodes();
  return rows.find(r=>r.code===normalized && r.active!==false)||null;
}
