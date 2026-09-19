import { collection, doc, getDocs, onSnapshot, setDoc } from "firebase/firestore";
import { db, firebaseEnabled, ensureFirebaseAuth } from "./firebaseService";

const COLLECTION = "ecomic_comics_v2";

function normalizePanel(panel = {}, index = 0) {
  return {
    id: panel.id || `panel-${index + 1}`,
    order: panel.order ?? index + 1,
    title: panel.title || `Panel ${index + 1}`,
    imageUrl: panel.imageUrl || panel.image || panel.mediaUrl || "",
    narration: panel.narration ?? panel.description ?? panel.text ?? "",
    dialogue: panel.dialogue ?? panel.dialog ?? "",
    equation: panel.equation ?? panel.formula ?? "",
    conceptIds: Array.isArray(panel.conceptIds)
      ? panel.conceptIds
      : Array.isArray(panel.concepts)
        ? panel.concepts
        : panel.conceptId
          ? [panel.conceptId]
          : [],
  };
}

function normalizeEpisode(episode = {}, index = 0) {
  const panels = Array.isArray(episode.panels) ? episode.panels.map(normalizePanel) : [];
  return {
    id: episode.id || `ep-${index + 1}`,
    order: episode.order ?? index + 1,
    title: episode.title || `Episode ${index + 1}`,
    description: episode.description ?? episode.summary ?? "",
    concepts: Array.isArray(episode.concepts) ? episode.concepts : [],
    panels,
  };
}

export function normalizeComic(data = {}) {
  const rawEpisodes = Array.isArray(data.episodes) ? data.episodes : [];
  return {
    ...data,
    id: data.id,
    title: data.title || "Tanpa judul",
    description: data.description ?? "",
    subject: data.subject ?? data.material ?? "Matematika",
    educationLevel: data.educationLevel ?? data.level ?? "SMA",
    grade: data.grade ?? "X",
    school: data.school ?? "",
    status: data.status ?? "Draft",
    coverUrl: data.coverUrl ?? data.cover ?? "",
    concepts: Array.isArray(data.concepts) ? data.concepts : [],
    episodes: rawEpisodes.map(normalizeEpisode),
  };
}

function mergePanel(local = {}, cloud = {}) {
  return normalizePanel({ ...cloud, ...local }, local.order || cloud.order || 0);
}

function mergeEpisode(local = {}, cloud = {}) {
  const localPanels = Array.isArray(local.panels) ? local.panels : [];
  const cloudPanels = Array.isArray(cloud.panels) ? cloud.panels : [];
  const cloudById = new Map(cloudPanels.map(p => [p.id, p]));
  const localById = new Map(localPanels.map(p => [p.id, p]));
  const ids = [];
  [...localPanels, ...cloudPanels].forEach(p => { if (p?.id && !ids.includes(p.id)) ids.push(p.id); });
  const panels = ids.map(id => mergePanel(localById.get(id) || {}, cloudById.get(id) || {}));
  return normalizeEpisode({ ...cloud, ...local, panels }, local.order || cloud.order || 0);
}

export function mergeComic(local, cloud) {
  if (!local) return normalizeComic(cloud);
  if (!cloud) return normalizeComic(local);
  const localEpisodes = Array.isArray(local.episodes) ? local.episodes : [];
  const cloudEpisodes = Array.isArray(cloud.episodes) ? cloud.episodes : [];
  const cloudById = new Map(cloudEpisodes.map(ep => [ep.id, ep]));
  const localById = new Map(localEpisodes.map(ep => [ep.id, ep]));
  const ids = [];
  [...localEpisodes, ...cloudEpisodes].forEach(ep => { if (ep?.id && !ids.includes(ep.id)) ids.push(ep.id); });
  return normalizeComic({
    ...cloud,
    ...local,
    episodes: ids.map(id => mergeEpisode(localById.get(id) || {}, cloudById.get(id) || {})),
  });
}

export function mergeComicCollections(localComics = [], cloudComics = []) {
  const localById = new Map(localComics.map(c => [c.id, c]));
  const cloudById = new Map(cloudComics.map(c => [c.id, c]));
  const ids = [];
  [...localComics, ...cloudComics].forEach(c => { if (c?.id && !ids.includes(c.id)) ids.push(c.id); });
  return ids.map(id => mergeComic(localById.get(id), cloudById.get(id)));
}

export async function loadCloudComics() {
  if (!firebaseEnabled || !db || !(await ensureFirebaseAuth())) return null;
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    return snap.docs.map(d => normalizeComic({ id: d.id, ...d.data() }));
  } catch (error) {
    console.warn("Cloud comic read failed:", error);
    return null;
  }
}

export async function saveCloudComic(comic) {
  if (!firebaseEnabled || !db || !comic?.id || !(await ensureFirebaseAuth())) return false;
  try {
    const normalized = normalizeComic(comic);
    await setDoc(doc(db, COLLECTION, normalized.id), { ...normalized, syncedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (error) {
    console.warn("Cloud comic write failed:", error);
    return false;
  }
}

export async function subscribeCloudComics(onChange) {
  if (!firebaseEnabled || !db || !(await ensureFirebaseAuth())) return () => {};
  const unsubscribe = onSnapshot(
    collection(db, COLLECTION),
    snap => onChange(snap.docs.map(d => normalizeComic({ id: d.id, ...d.data() }))),
    error => console.warn("Cloud comic subscription failed:", error)
  );
  return unsubscribe;
}
