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

async function resolveTutorImage(imageRef) {
  const value = String(imageRef || "").trim();
  if (!value) return "";
  if (value.startsWith("data:image/")) return value;
  if (!value.startsWith("local-media://") && !value.startsWith("cloud-media://")) return value;

  const media = await getLocalMedia(value);
  if (!media) throw new Error("Gambar panel tidak dapat diambil dari penyimpanan.");
  if (typeof media === "string") {
    if (!media.startsWith("data:image/")) throw new Error("Format gambar panel tidak valid.");
    return media;
  }
  if (typeof Blob !== "undefined" && media instanceof Blob) return blobToDataUrl(media);
  throw new Error("Format media panel tidak didukung.");
}

async function prepareTutorPayload(payload) {
  const context = payload?.context || {};
  const imageRef = context.imageUrl || "";
  if (!imageRef || imageRef.startsWith("data:image/")) return payload;
  const imageDataUrl = await resolveTutorImage(imageRef);
  return { ...payload, context: { ...context, imageUrl: imageDataUrl } };
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
    const payload = await prepareTutorPayload({ mode:"tutor", message, context, history });
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

