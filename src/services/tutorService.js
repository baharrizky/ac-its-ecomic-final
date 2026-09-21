const endpoint = "/api/tutor";
import { getLocalMedia } from "./mediaService";

const MAX_AI_IMAGE_DATA_URL = 1_350_000;

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
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
        canvas.height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let out = canvas.toDataURL("image/webp", 0.62);
        if (!out.startsWith("data:image/webp")) out = canvas.toDataURL("image/jpeg", 0.68);
        if (out.length > MAX_AI_IMAGE_DATA_URL) out = canvas.toDataURL("image/jpeg", 0.52);
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
  if (/^https?:\/\//i.test(value)) return { imageUrl: value };
  throw new Error("PANEL_IMAGE_UNSUPPORTED_REF");
}

async function prepareTutorPayload({ message, context, history }) {
  const imageRef = context?.imageUrl || "";
  const base = {
    mode: "tutor",
    message: String(message || "").slice(0, 2000),
    context: {
      comicTitle: context?.comicTitle || "",
      episodeTitle: context?.episodeTitle || "",
      panelTitle: context?.panelTitle || "",
      narration: String(context?.narration || "").slice(0, 700),
      dialogue: String(context?.dialogue || "").slice(0, 900),
      equation: String(context?.equation || "").slice(0, 300),
      conceptId: context?.conceptId || "",
      conceptName: context?.conceptName || "",
      educationLevel: context?.educationLevel || "",
      grade: context?.grade || ""
    },
    history: (Array.isArray(history) ? history : []).slice(-4).map(m => ({
      role: m?.role === "user" ? "user" : "assistant",
      text: String(m?.text || "").slice(0, 700)
    }))
  };
  if (!imageRef) return base;
  try {
    const image = await resolveTutorImage(imageRef);
    if (image?.dataUrl) {
      base.imageData = image.dataUrl;
      base.imageMime = image.mimeType;
      base.context.imageAttached = true;
      return base;
    }
    if (image?.imageUrl) {
      base.context.imageUrl = image.imageUrl;
      base.context.imageAttached = true;
      return base;
    }
  } catch (error) {
    // Image is supporting context, not a gate. Keep the student's actual
    // question alive even if media/auth/network retrieval fails.
    console.warn("Tutor image unavailable; continuing without image", error?.code || error?.message || error);
    base.context.imageAttached = false;
    base.context.imageError = String(error?.code || error?.message || "IMAGE_UNAVAILABLE").slice(0,120);
  }
  return base;
}

async function callEndpoint(payload, { timeoutMs = 35000 } = {}) {
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
      error.providerStatus = data?.providerStatus || null;
      throw error;
    }
    return data;
  } catch (error) {
    if (error?.name === "AbortError") { error.code = "AI_TIMEOUT"; error.retryable = true; }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function getTutorReply({ message, context, history }) {
  try {
    const payload = await prepareTutorPayload({ message, context, history });
    return await callEndpoint(payload);
  } catch (error) {
    console.error("Tutor AI failed", {
      code: error?.code,
      status: error?.status,
      providerStatus: error?.providerStatus,
      message: error?.message
    });
    const concept = context?.conceptName || "konsep yang sedang dipelajari";
    const comic = context?.comicTitle || "komik ini";
    return {
      reply: `Tutor sedang tidak tersedia sementara. Kamu tetap bisa melanjutkan belajar dari ${comic}. Coba kirim pertanyaan sekali lagi.`,
      ai: false,
      unavailable: true,
      aiError: error?.message || "AI unavailable",
      code: error?.code || "AI_UNAVAILABLE",
      status: error?.status || null
    };
  }
}

export async function correctAnswerWithAI({ question, selectedAnswer, correctAnswer, baselineDiagnosis, context = {} }) {
  try { return await callEndpoint({ mode:"correct", question, selectedAnswer, correctAnswer, baselineDiagnosis, context }); }
  catch (error) { console.error("AI correction failed", error); return { ...baselineDiagnosis, ai:false, unavailable:true, aiError:error?.message || "AI unavailable", code:error?.code || "AI_UNAVAILABLE" }; }
}

export async function recommendNextQuestion({ studentModel, questions, recentAttempts = [] }) {
  const all = Array.isArray(questions) ? questions.filter(q => (q.assessmentType || "practice") === "practice" && q.status !== "Draft") : [];
  const profiles = studentModel?.concepts || {};
  const attempted = new Set(Object.entries(profiles).filter(([,p]) => Number(p?.attempts || 0) > 0).map(([id]) => id));
  const attemptedQuestions = attempted.size ? all.filter(q => attempted.has(q.conceptId)) : all.slice(0, Math.max(1, all.findIndex(q => q.conceptId !== all[0]?.conceptId) >= 0 ? all.findIndex(q => q.conceptId !== all[0]?.conceptId) : all.length));
  const allowed = attemptedQuestions.length ? attemptedQuestions : all.slice(0,1);
  try {
    const result = await callEndpoint({ mode:"recommend", studentModel, questions:allowed, recentAttempts });
    const chosen = allowed.find(q => q.id === result?.questionId);
    if (!chosen) {
      const fallback = allowed.slice().sort((a,b) => Number(a.level ?? a.difficulty ?? 1) - Number(b.level ?? b.difficulty ?? 1))[0];
      return { ...result, questionId:fallback?.id||null, conceptId:fallback?.conceptId||null, localGuard:true, reason:result?.reason||"Soal berikut tetap berada pada konsep yang sudah kamu coba." };
    }
    return result;
  } catch (error) {
    console.error("AI recommendation failed", error);
    const fallback=allowed.slice().sort((a,b)=>Number(a.level??a.difficulty??1)-Number(b.level??b.difficulty??1))[0];
    return { ai:false, fallback:true, questionId:fallback?.id||null, conceptId:fallback?.conceptId||null, targetLevel:Number(fallback?.level??1), reason:"Soal berikut tetap berada pada konsep yang sudah kamu coba." };
  }
}

export async function getTeacherRecommendation({ student, studentModel, attempts = [], events = [] }) {
  try { return await callEndpoint({ mode:"teacher_recommend", student, studentModel, attempts, events }); }
  catch (error) { console.error("AI teacher recommendation failed", error); return { ai:false, unavailable:true, summary:"Rekomendasi dibuat berdasarkan data pembelajaran yang tersedia.", priorityConcepts:[], recommendations:[], nextActivity:"Gunakan data pembelajaran siswa sebagai dasar tindak lanjut.", teacherNote:"" }; }
}


export async function getAIHint({ question, context = {}, hintLevel = 1 }) {
  try {
    return await callEndpoint({ mode: "hint", question, context, hintLevel });
  } catch (error) {
    const concept = context?.conceptName || context?.conceptId || question?.conceptId || "konsep ini";
    const level = Math.max(1, Math.min(3, Number(hintLevel || 1)));
    const hint = level === 1
      ? `Fokus pada ${concept}: tentukan operasi atau sifat matematika apa yang digunakan sebelum menghitung hasilnya.`
      : level === 2
        ? "Tuliskan satu langkah antara informasi pada soal dan bentuk matematikanya. Periksa apa yang berubah pada operasi tersebut."
        : "Periksa kembali basis, pangkat, tanda operasi, dan hasil antara sebelum menentukan jawaban akhir.";
    return { hint, focus: "Petunjuk kontekstual", ai: false, fallback: true, code: error?.code || "AI_HINT_FALLBACK" };
  }
}

export async function analyzeClassWithAI({ classData }) {
  try {
    return await callEndpoint({ mode: "class_analyze", classData }, { timeoutMs: 40000 });
  } catch (error) {
    return { ai: false, fallback: true, summary: "Analisis menggunakan data pembelajaran yang tersedia.", topMastery: [], priorityConcepts: [], misconceptions: [], studentNeeds: [], recommendations: ["Prioritaskan konsep dengan mastery terendah."] };
  }
}
