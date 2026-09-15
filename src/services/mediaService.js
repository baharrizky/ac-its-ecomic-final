const DB_NAME = "ac-its-ecomic-media-v1";
const STORE_NAME = "media";
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("Browser tidak mendukung IndexedDB."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Gagal membuka media database."));
  });
}

export async function saveLocalMedia(file, meta = {}) {
  if (!file) throw new Error("File tidak ditemukan.");
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 8 MB.");

  const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({
      id,
      blob: file,
      name: file.name,
      type: file.type,
      size: file.size,
      createdAt: new Date().toISOString(),
      ...meta,
    });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error("Gagal menyimpan gambar."));
  });
  db.close();
  return `local-media://${id}`;
}

export async function getLocalMedia(ref) {
  if (!ref?.startsWith("local-media://")) return null;
  const id = ref.replace("local-media://", "");
  const db = await openDb();
  const item = await new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return item?.blob || null;
}

export async function deleteLocalMedia(ref) {
  if (!ref?.startsWith("local-media://")) return;
  const id = ref.replace("local-media://", "");
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export function isLocalMedia(ref) {
  return typeof ref === "string" && ref.startsWith("local-media://");
}
