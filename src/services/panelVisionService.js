import { getLocalMedia } from "./mediaService";

const endpoint = "/api/panel-ai";
const MAX_DATA_URL = 1_500_000;

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca gambar panel."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}

async function optimize(dataUrl) {
  if (!dataUrl || dataUrl.length <= MAX_DATA_URL || typeof Image === "undefined") return dataUrl;
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
        canvas.height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let out = canvas.toDataURL("image/jpeg", 0.72);
        if (out.length > MAX_DATA_URL) out = canvas.toDataURL("image/jpeg", 0.55);
        resolve(out.length < dataUrl.length ? out : dataUrl);
      } catch { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function askPanelAI({ imageRef, question }) {
  if (!imageRef) throw Object.assign(new Error("Panel tidak memiliki gambar."), { code: "PANEL_IMAGE_MISSING" });

  let dataUrl = "";
  if (String(imageRef).startsWith("data:image/")) {
    dataUrl = String(imageRef);
  } else if (String(imageRef).startsWith("cloud-media://") || String(imageRef).startsWith("local-media://")) {
    const media = await getLocalMedia(imageRef);
    if (!media) throw Object.assign(new Error("Gambar panel tidak ditemukan."), { code: "PANEL_IMAGE_NOT_FOUND" });
    dataUrl = typeof media === "string" ? media : await blobToDataUrl(media);
  } else {
    // For legacy direct image URLs, fetch the bytes in the browser so the
    // vision endpoint always receives the exact image bytes, not a URL.
    const response = await fetch(imageRef, { cache: "no-store" });
    if (!response.ok) throw Object.assign(new Error("Gagal mengambil gambar panel."), { code: "PANEL_IMAGE_FETCH_FAILED" });
    dataUrl = await blobToDataUrl(await response.blob());
  }

  if (!/^data:image\//i.test(dataUrl)) throw Object.assign(new Error("Format gambar panel tidak valid."), { code: "PANEL_IMAGE_INVALID" });
  const mime = dataUrl.match(/^data:(image\/[^;]+);base64,/i)?.[1] || "image/jpeg";
  const optimized = await optimize(dataUrl);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ imageData: optimized, imageMime: mime, question: String(question || "Apa yang kamu lihat pada gambar ini?").slice(0, 2000) }),
    cache: "no-store"
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result?.error || "AI gagal membaca panel.");
    error.code = result?.code || "PANEL_AI_FAILED";
    error.status = response.status;
    throw error;
  }
  return result;
}
