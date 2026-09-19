import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db, firebaseEnabled, ensureFirebaseAuth } from "./firebaseService";

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
        const scale = Math.min(1, maxWidth / Math.max(1, image.width));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Browser tidak dapat memproses gambar."));
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        // Keep the Firestore document comfortably below its 1 MiB document limit.
        let q = quality;
        let dataUrl = canvas.toDataURL("image/webp", q);
        while (dataUrl.length > MAX_CLOUD_DATA_URL_BYTES && q > 0.42) {
          q -= 0.08;
          dataUrl = canvas.toDataURL("image/webp", q);
        }
        if (dataUrl.length > MAX_CLOUD_DATA_URL_BYTES) {
          q = 0.70;
          dataUrl = canvas.toDataURL("image/jpeg", q);
          while (dataUrl.length > MAX_CLOUD_DATA_URL_BYTES && q > 0.40) {
            q -= 0.06;
            dataUrl = canvas.toDataURL("image/jpeg", q);
          }
        }
        if (dataUrl.length > MAX_CLOUD_DATA_URL_BYTES) {
          reject(new Error("Gambar terlalu besar setelah kompresi. Coba gambar dengan resolusi lebih kecil."));
          return;
        }
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

  // Production path: one source of truth in Firestore. Do not silently fall
  // back to browser-only media when Firebase is configured, otherwise a
  // published comic can contain an image reference that only exists on the
  // teacher's computer.
  if (firebaseEnabled && db) {
    if (!(await ensureFirebaseAuth())) {
      throw new Error("Autentikasi Firebase belum siap. Silakan coba unggah lagi.");
    }
    const dataUrl = await fileToDataUrl(file);
    const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await setDoc(doc(db, "ecomic_media", id), {
        id,
        dataUrl,
        name: file.name,
        type: file.type,
        size: file.size,
        createdAt: new Date().toISOString(),
        ...meta
      });
      return `cloud-media://${id}`;
    } catch (error) {
      console.error("Cloud media upload failed", error);
      throw new Error("Gambar gagal disimpan ke Firebase. Pastikan login Firebase aktif lalu coba lagi.");
    }
  }

  // Local-only mode is used only when Firebase is not configured.
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
