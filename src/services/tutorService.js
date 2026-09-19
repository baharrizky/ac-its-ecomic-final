const endpoint = "/api/tutor";
import { getLocalMedia } from "./mediaService";

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Gagal membaca gambar panel."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}


async function optimizeDataUrl(dataUrl, mimeType) {
  // Vercel Functions have a 4.5 MB request-body limit. Keep the panel image
  // comfortably below that limit before sending it to /api/tutor.
  if (!dataUrl || dataUrl.length < 3_000_000 || typeof Image === "undefined") return dataUrl;
  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
        canvas.height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = canvas.toDataURL("image/jpeg", 0.78);
        resolve(out.length < dataUrl.length ? out : dataUrl);
      } catch { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function resolveTutorImage(imageRef) {
  const value = String(imageRef || "").trim();
  if (!value) return null;
  if (value.startsWith("data:image/")) {
    const match = value.match(/^data:(image\/[^;]+);base64,(.+)$/s);
    if (!match) throw new Error("Format gambar panel tidak valid.");
    const optimized = await optimizeDataUrl(value, match[1]);
    const optimizedMatch = optimized.match(/^data:(image\/[^;]+);base64,(.+)$/s);
    return { dataUrl: optimized, mimeType: optimizedMatch?.[1] || match[1], base64: optimizedMatch?.[2] || match[2] };
  }
  if (!value.startsWith("local-media://") && !value.startsWith("cloud-media://")) {
    return { imageUrl: value };
  }

  const media = await getLocalMedia(value);
  if (!media) throw new Error("PANEL_IMAGE_NOT_FOUND");
  let dataUrl = "";
  if (typeof media === "string") {
    dataUrl = media;
  } else if (typeof Blob !== "undefined" && media instanceof Blob) {
    dataUrl = await blobToDataUrl(media);
  } else {
    throw new Error("PANEL_IMAGE_UNSUPPORTED");
  }
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/s);
  if (!match) throw new Error("PANEL_IMAGE_INVALID_DATA");
  const optimized = await optimizeDataUrl(dataUrl, match[1]);
  const optimizedMatch = optimized.match(/^data:(image\/[^;]+);base64,(.+)$/s);
  return { dataUrl: optimized, mimeType: optimizedMatch?.[1] || match[1], base64: optimizedMatch?.[2] || match[2] };
}

async function prepareTutorPayload(payload) {
  const context = payload?.context || {};
  const imageRef = context.imageUrl || "";
  if (!imageRef) return payload;

  const image = await resolveTutorImage(imageRef);
  // Keep the media reference in context for UI/debugging, but send the actual
  // image separately so the server never has to interpret cloud-media://.
  if (image?.base64) {
    return {
      ...payload,
      imageData: image.dataUrl,
      imageMime: image.mimeType,
      context: { ...context, imageUrl: image.dataUrl ? "[panel-image-attached]" : context.imageUrl }
    };
  }
  return { ...payload, context: { ...context, imageUrl: image.imageUrl || imageRef } };
}

async function callEndpoint(payload, { retries = 1, timeoutMs = 22000 } = {}) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: "no-store"
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data?.error || data?.message || `AI endpoint error (${response.status})`);
        error.status = response.status;
        error.code = data?.code;
        error.retryable = data?.retryable !== false;
        error.detail = data?.detail;
        throw error;
      }
      return data;
    } catch (error) {
      lastError = error;
      if (error?.name === "AbortError") {
        error.code = "AI_TIMEOUT";
        error.retryable = true;
      }
      if (attempt >= retries || error?.retryable === false) break;
      await new Promise(resolve => setTimeout(resolve, 700 * (2 ** attempt)));
    } finally { clearTimeout(timer); }
  }
  throw lastError || new Error("AI request gagal");
}

export async function getTutorReply({ message, context, history }) {
  try {
    let payload;
    try {
      payload = await prepareTutorPayload({ mode:"tutor", message, context, history });
    } catch (imageError) {
      // Never let a media-resolution problem take the whole Tutor down.
      // Send the normal textual context so the AI remains available, while
      // keeping the media error in the browser console for diagnostics.
      console.warn("Tutor panel image bridge failed; retrying text-only", imageError);
      payload = { mode:"tutor", message, context, history, imageBridgeError:imageError?.message || "unknown" };
    }
    return await callEndpoint(payload, { retries:1 });
  } catch (error) {
    console.error("Tutor AI failed", error);
    const concept = context?.conceptName || context?.conceptId || "konsep yang sedang dipelajari";
    const comic = context?.comicTitle || "comic ini";
    return {
      reply: `Tutor sedang mengalami gangguan sementara. Kamu tetap bisa melanjutkan belajar dari ${comic}. Coba baca kembali bagian ${concept}, lalu tanyakan lagi beberapa saat kemudian.`,
      ai:false, unavailable:true,
      aiError:error?.message || "AI unavailable", code:error?.code || "AI_UNAVAILABLE", status:error?.status || null
    };
  }
}

export async function correctAnswerWithAI({ question, selectedAnswer, correctAnswer, baselineDiagnosis, context = {} }) {
  try {
    return await callEndpoint({ mode:"correct", question, selectedAnswer, correctAnswer, baselineDiagnosis, context }, { retries:1 });
  } catch (error) {
    console.error("AI correction failed", error);
    return { ...baselineDiagnosis, ai:false, unavailable:true, aiError:error?.message || "AI unavailable", code:error?.code || "AI_UNAVAILABLE" };
  }
}

export async function recommendNextQuestion({ studentModel, questions, recentAttempts = [] }) {
  try {
    return await callEndpoint({ mode:"recommend", studentModel, questions, recentAttempts }, { retries:1, timeoutMs:22000 });
  } catch (error) {
    console.error("AI recommendation failed", error);
    return { ai:false, unavailable:true, questionId:null, reason:"Latihan berikut dipilih berdasarkan perkembangan belajarmu." };
  }
}

export async function getTeacherRecommendation({ student, studentModel, attempts = [], events = [] }) {
  try {
    return await callEndpoint({ mode:"teacher_recommend", student, studentModel, attempts, events }, { retries:1, timeoutMs:22000 });
  } catch (error) {
    console.error("AI teacher recommendation failed", error);
    return { ai:false, unavailable:true, summary:"Rekomendasi dibuat berdasarkan data pembelajaran yang tersedia.", priorityConcepts:[], recommendations:[], nextActivity:"Gunakan prioritas konsep dan aktivitas belajar siswa sebagai dasar tindak lanjut.", teacherNote:"" };
  }
}

