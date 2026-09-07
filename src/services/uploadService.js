import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { firebaseEnabled, storage } from "./firebaseService";

const MAX_LOCAL_BYTES = 900 * 1024;

function safeName(name = "image") {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsDataURL(file);
  });
}

async function compressForDemo(file) {
  const dataUrl = await readAsDataUrl(file);
  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error("File gambar tidak dapat diproses."));
  });

  const maxSide = 1280;
  const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * ratio));
  canvas.height = Math.max(1, Math.round(img.height * ratio));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let quality = 0.82;
  let result = canvas.toDataURL("image/webp", quality);
  if (!result.startsWith("data:image/webp")) result = canvas.toDataURL("image/jpeg", quality);

  while (result.length * 0.75 > MAX_LOCAL_BYTES && quality > 0.45) {
    quality -= 0.08;
    result = result.startsWith("data:image/webp")
      ? canvas.toDataURL("image/webp", quality)
      : canvas.toDataURL("image/jpeg", quality);
  }

  if (result.length * 0.75 > MAX_LOCAL_BYTES) {
    throw new Error("Gambar terlalu besar untuk mode demo. Gunakan gambar yang lebih kecil atau aktifkan Firebase Storage.");
  }
  return result;
}

export async function uploadComicImage(file, { comicId, episodeId = "cover", panelId = "cover" } = {}) {
  if (!file) throw new Error("File belum dipilih.");
  if (!file.type?.startsWith("image/")) throw new Error("File harus berupa gambar.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 10 MB.");

  if (firebaseEnabled && storage) {
    const path = `comics/${comicId || "draft"}/${episodeId}/${panelId}-${Date.now()}-${safeName(file.name)}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType: file.type, cacheControl: "public,max-age=31536000" });
    return { url: await getDownloadURL(storageRef), path, source: "firebase" };
  }

  return { url: await compressForDemo(file), path: null, source: "demo" };
}

export async function removeComicImage(path) {
  if (!path || !firebaseEnabled || !storage) return;
  await deleteObject(ref(storage, path));
}
