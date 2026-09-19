import { getLocalMedia } from "./mediaService";
import { getFirebaseIdToken } from "./firebaseService";

const endpoint = "/api/panel-ai";

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca gambar panel."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}

export async function askPanelAI({ imageRef, question }) {
  if (!imageRef) throw Object.assign(new Error("Panel tidak memiliki gambar."), { code: "PANEL_IMAGE_MISSING" });
  const payload = { question: String(question || "Apa yang kamu lihat pada gambar ini?").slice(0, 2000) };
  if (String(imageRef).startsWith("cloud-media://")) {
    // The browser sends only the media reference. The server retrieves the exact
    // image from Firestore using the Firebase ID token, avoiding base64 transport.
    const token = await getFirebaseIdToken();
    if (!token) throw Object.assign(new Error("Sesi Firebase belum siap."), { code: "FIREBASE_TOKEN_MISSING" });
    payload.imageRef = imageRef;
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload), cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { const e = new Error(result?.error || "AI gagal membaca panel."); e.code=result?.code||"PANEL_AI_FAILED"; e.status=response.status; throw e; }
    return result;
  }
  let dataUrl = String(imageRef);
  if (dataUrl.startsWith("local-media://")) {
    const media = await getLocalMedia(dataUrl);
    if (!media) throw Object.assign(new Error("Gambar panel tidak ditemukan."), { code: "PANEL_IMAGE_NOT_FOUND" });
    dataUrl = typeof media === "string" ? media : await blobToDataUrl(media);
  } else if (/^https?:\/\//i.test(dataUrl)) {
    const r = await fetch(dataUrl, { cache: "no-store" });
    if (!r.ok) throw Object.assign(new Error("Gagal mengambil gambar panel."), { code: "PANEL_IMAGE_FETCH_FAILED" });
    dataUrl = await blobToDataUrl(await r.blob());
  }
  payload.imageData = dataUrl;
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { const e=new Error(result?.error||"AI gagal membaca panel."); e.code=result?.code||"PANEL_AI_FAILED"; e.status=response.status; throw e; }
  return result;
}
