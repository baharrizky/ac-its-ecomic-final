import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage, auth, firebaseEnabled, ensureFirebaseAuth } from "./firebaseService";

const DB_NAME = "ac-its-ecomic-media-v2";
const STORE_NAME = "media";
const DB_VERSION = 1;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_CLOUD_DATA_URL_BYTES = 700 * 1024;

function openDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error("Browser tidak mendukung IndexedDB.")); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Gagal membuka media database."));
  });
}

function fileToDataUrl(file, maxWidth = 1800, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca gambar."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("File gambar tidak valid."));
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        let dataUrl = canvas.toDataURL("image/webp", quality);
        if (dataUrl.length > MAX_CLOUD_DATA_URL_BYTES) dataUrl = canvas.toDataURL("image/jpeg", 0.72);
        resolve(dataUrl);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function saveBrowserMedia(file, meta, dataUrl) {
  const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const dbLocal = await openDb();
  await new Promise((resolve, reject) => {
    const tx = dbLocal.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ id, blob: file, dataUrl, name: file.name, type: file.type, size: file.size, createdAt: new Date().toISOString(), ...meta });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error("Gagal menyimpan gambar."));
  });
  dbLocal.close();
  return `local-media://${id}`;
}

export async function saveLocalMedia(file, meta = {}) {
  if (!file) throw new Error("File tidak ditemukan.");
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Ukuran gambar maksimal 8 MB.");

  // PRIMARY: Firebase Storage.
  // Gambar disimpan sebagai file, bukan Base64 di Firestore. Ini membuat preview,
  // sinkronisasi lintas perangkat, dan AI image input jauh lebih stabil.
  if (firebaseEnabled && storage && await ensureFirebaseAuth()) {
    try {
      const dataUrl = await fileToDataUrl(file);
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const uid = auth?.currentUser?.uid || "anonymous";
      const comicId = String(meta.comicId || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_");
      const kind = String(meta.kind || "image").replace(/[^a-zA-Z0-9_-]/g, "_");
      const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/jpeg" ? "jpg" : "png";
      const objectRef = storageRef(storage, `ecomic-media/${uid}/${comicId}/${kind}/${id}.${ext}`);
      const uploaded = await uploadBytes(objectRef, blob, { contentType: blob.type, cacheControl: "public,max-age=31536000,immutable" });
      const url = await getDownloadURL(uploaded.ref);
      return url;
    } catch (error) {
      console.warn("Firebase Storage upload failed; trying legacy media fallback:", error);
    }
  }

  // LEGACY fallback: keep the existing Firestore/IndexedDB mechanism so the
  // editor still works when Storage rules/configuration are not ready.
  if (firebaseEnabled && db && await ensureFirebaseAuth()) {
    try {
      const dataUrl = await fileToDataUrl(file);
      if (dataUrl.length > MAX_CLOUD_DATA_URL_BYTES) throw new Error("Gambar terlalu besar setelah kompresi. Gunakan gambar di bawah ~4 MB atau turunkan resolusi.");
      const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await setDoc(doc(db, "ecomic_media", id), {
        id, dataUrl, name: file.name, type: file.type, size: file.size,
        createdAt: new Date().toISOString(), ...meta
      });
      return `cloud-media://${id}`;
    } catch (error) {
      console.warn("Legacy cloud media unavailable, using browser fallback:", error);
    }
  }

  const dataUrl = await fileToDataUrl(file);
  return saveBrowserMedia(file, meta, dataUrl);
}

export async function getLocalMedia(ref) {
  if (!ref) return null;
  if (ref.startsWith("cloud-media://")) {
    if (!db || !(await ensureFirebaseAuth())) return null;
    const id = ref.replace("cloud-media://", "");
    const snap = await getDoc(doc(db, "ecomic_media", id));
    return snap.exists() ? snap.data().dataUrl : null;
  }
  if (!ref.startsWith("local-media://")) return null;
  const id = ref.replace("local-media://", "");
  const dbLocal = await openDb();
  const item = await new Promise((resolve, reject) => {
    const req = dbLocal.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  dbLocal.close();
  return item?.blob || item?.dataUrl || null;
}

export async function deleteLocalMedia(ref) {
  if (!ref) return;
  if (ref.startsWith("cloud-media://")) {
    if (!db || !(await ensureFirebaseAuth())) return;
    const id = ref.replace("cloud-media://", "");
    try { await deleteDoc(doc(db, "ecomic_media", id)); } catch {}
    return;
  }
  if (!ref.startsWith("local-media://")) return;
  const id = ref.replace("local-media://", "");
  const dbLocal = await openDb();
  await new Promise((resolve, reject) => {
    const tx = dbLocal.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  dbLocal.close();
}

export function isLocalMedia(ref) { return typeof ref === "string" && (ref.startsWith("local-media://") || ref.startsWith("cloud-media://")); }
