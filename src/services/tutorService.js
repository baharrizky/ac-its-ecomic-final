const endpoint = "/api/tutor";
import { getLocalMedia } from "./mediaService";

const MAX_AI_IMAGE_DATA_URL = 2_800_000; // comfortably below Vercel's request limit after JSON overhead

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Gagal membaca gambar panel."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}

async function optimizeDataUrl(dataUrl) {
  if (!dataUrl || dataUrl.length <= MAX_AI_IMAGE_DATA_URL || typeof Image === "undefined") return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxSide = 1500;
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
        canvas.height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // WebP first; JPEG fallback is handled by browsers that do not support it.
        let out = canvas.toDataURL("image/webp", 0.72);
        if (!out.startsWith("data:image/webp")) out = canvas.toDataURL("image/jpeg", 0.72);
        if (out.length > MAX_AI_IMAGE_DATA_URL) out = canvas.toDataURL("image/jpeg", 0.62);
        resolve(out.length < dataUrl.length ? out : dataUrl);
      } catch {
        resolve(dataUrl);
      }
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
    if (!match) throw new Error("PANEL_IMAGE_INVALID_DATA");
    return { dataUrl: await optimizeDataUrl(value), mimeType: match[1].toLowerCase() };
  }

  if (value.startsWith("local-media://") || value.startsWith("cloud-media://")) {
    const media = await getLocalMedia(value);
    if (!media) throw new Error("PANEL_IMAGE_NOT_FOUND");
    const dataUrl = typeof media === "string" ? media : await blobToDataUrl(media);
    if (!/^data:image\//i.test(dataUrl)) throw new Error("PANEL_IMAGE_INVALID_DATA");
    const match = dataUrl.match(/^data:(image\/[^;]+);base64,/i);
    return { dataUrl: await optimizeDataUrl(dataUrl), mimeType: (match?.[1] || "image/jpeg").toLowerCase() };
  }

  // A normal HTTPS image URL is left in context. The server can fetch it directly.
  return { imageUrl: value };
}

async function prepareTutorPayload(payload) {
  const imageRef = payload?.context?.imageUrl || "";
  if (!imageRef) return payload;
  const image = await resolveTutorImage(imageRef);
  if (image?.dataUrl) {
    return {
      ...payload,
      imageData: image.dataUrl,
      imageMime: image.mimeType,
      context: { ...payload.context, imageUrl: "[panel-image-attached]" }
    };
  }
  return payload;
}

async function callEndpoint(payload, { retries = 1, timeoutMs = 25000 } = {}) {
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
        const error = new Error(data?.error || `AI endpoint error (${response.status})`);
        error.status = response.status;
        error.code = data?.code || "AI_ENDPOINT_ERROR";
        error.retryable = data?.retryable !== false;
        throw error;
      }
      return data;
    } catch (error) {
      lastError = error;
      if (error?.name === "AbortError") { error.code = "AI_TIMEOUT"; error.retryable = true; }
      if (attempt >= retries || error?.retryable === false) break;
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error("AI request gagal");
}

export async function getTutorReply({ message, context, history }) {
  try {
    const payload = await prepareTutorPayload({ mode: "tutor", message, context, history });
    return await callEndpoint(payload, { retries: 1 });
  } catch (error) {
    console.error("Tutor AI failed", error);
    const concept = context?.conceptName || context?.conceptId || "konsep yang sedang dipelajari";
    const comic = context?.comicTitle || "komik ini";
    const imageProblem = String(error?.code || "").startsWith("PANEL_IMAGE_");
    return {
      reply: imageProblem
        ? `Gambar panel belum siap dibaca AI. Silakan tunggu sebentar lalu coba lagi. Kamu tetap bisa bertanya tentang ${concept} dari materi teks.`
        : `Tutor sedang mengalami gangguan sementara. Kamu tetap bisa melanjutkan belajar dari ${comic}. Coba tanyakan lagi beberapa saat kemudian.`,
      ai: false,
      unavailable: true,
      aiError: error?.message || "AI unavailable",
      code: error?.code || "AI_UNAVAILABLE",
      status: error?.status || null
    };
  }
}

export async function correctAnswerWithAI({ question, selectedAnswer, correctAnswer, baselineDiagnosis, context = {} }) {
  try { return await callEndpoint({ mode:"correct", question, selectedAnswer, correctAnswer, baselineDiagnosis, context }, { retries:1 }); }
  catch (error) { console.error("AI correction failed", error); return { ...baselineDiagnosis, ai:false, unavailable:true, aiError:error?.message || "AI unavailable", code:error?.code || "AI_UNAVAILABLE" }; }
}

export async function recommendNextQuestion({ studentModel, questions, recentAttempts = [] }) {
  try { return await callEndpoint({ mode:"recommend", studentModel, questions, recentAttempts }, { retries:1, timeoutMs:25000 }); }
  catch (error) { console.error("AI recommendation failed", error); return { ai:false, unavailable:true, questionId:null, reason:"Latihan berikut dipilih berdasarkan perkembangan belajarmu." }; }
}

export async function getTeacherRecommendation({ student, studentModel, attempts = [], events = [] }) {
  try { return await callEndpoint({ mode:"teacher_recommend", student, studentModel, attempts, events }, { retries:1, timeoutMs:25000 }); }
  catch (error) { console.error("AI teacher recommendation failed", error); return { ai:false, unavailable:true, summary:"Rekomendasi dibuat berdasarkan data pembelajaran yang tersedia.", priorityConcepts:[], recommendations:[], nextActivity:"Gunakan data pembelajaran siswa sebagai dasar tindak lanjut.", teacherNote:"" }; }
}
