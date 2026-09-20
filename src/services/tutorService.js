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
      grade: context?.grade || "",
      characters: Array.isArray(context?.characters) ? context.characters.slice(0, 20) : [],
      storyContext: String(context?.storyContext || "").slice(0, 9000),
      episodeDescription: String(context?.episodeDescription || "").slice(0, 1200)
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
    const panel = context?.panelTitle ? ` di ${context.panelTitle}` : "";
    const concept = context?.conceptName || "konsep yang sedang kamu pelajari";
    const characters = Array.isArray(context?.characters) && context.characters.length
      ? ` Tokoh yang terlibat: ${context.characters.join(", ")}.`
      : "";
    return {
      reply: `Hehe, kita bahas bareng ya 😄 Aku lagi fokus${panel} dan konsep ${concept}.${characters} Bagian mana yang paling bikin kamu penasaran? Ceritakan saja, nanti kita kupas dari panelnya pelan-pelan.`,
      ai: false,
      unavailable: true,
      fallback: true,
      aiError: error?.message || "AI unavailable",
      code: error?.code || "AI_UNAVAILABLE",
      status: error?.status || null
    };
  }
}



export async function getAIHint({ question, hintIndex = 1, conceptId, conceptName, studentMastery = 0, misconceptionTag = null, context = {} }) {
  try {
    return await callEndpoint({
      mode: "hint",
      question,
      hintIndex,
      conceptId,
      conceptName,
      studentMastery,
      misconceptionTag,
      context
    }, { timeoutMs: 18000 });
  } catch (error) {
    const explanation = String(question?.explanation || "").trim();
    const fallback = hintIndex === 1
      ? `Perhatikan informasi yang diberikan dan tentukan konsep ${conceptName || conceptId || "ini"} yang digunakan.`
      : hintIndex === 2
        ? (explanation ? `Gunakan ide pada pembahasan soal: ${explanation.slice(0, 220)}` : `Pecah soal menjadi satu langkah kecil terlebih dahulu dengan konsep ${conceptName || conceptId || "ini"}.`)
        : `Tuliskan langkah penyelesaianmu satu per satu, lalu periksa kembali operasi pada basis dan pangkat.`;
    return { reply: fallback, ai: false, fallback: true, hintIndex, code: error?.code || "AI_HINT_UNAVAILABLE" };
  }
}

export async function correctAnswerWithAI({ question, selectedAnswer, correctAnswer, baselineDiagnosis, context = {} }) {
  try { return await callEndpoint({ mode:"correct", question, selectedAnswer, correctAnswer, baselineDiagnosis, context }, { timeoutMs: 9000 }); }
  catch (error) { console.error("AI correction failed", error); return { ...baselineDiagnosis, ai:false, unavailable:true, aiError:error?.message || "AI unavailable", code:error?.code || "AI_UNAVAILABLE" }; }
}

export async function recommendNextQuestion({ studentModel, questions, recentAttempts = [] }) {
  try { return await callEndpoint({ mode:"recommend", studentModel, questions, recentAttempts }, { timeoutMs: 12000 }); }
  catch (error) { console.error("AI recommendation failed", error); return { ai:false, unavailable:true, questionId:null, reason:"Latihan berikut dipilih berdasarkan perkembangan belajarmu." }; }
}

export async function generateNextQuestion({ studentModel, currentQuestion, concept, eligibleConcepts = [], recentAttempts = [], hintsUsed = 0, failedAttempts = 0, comicContext = {} }) {
  try {
    return await callEndpoint({
      mode:"generate_next",
      studentModel,
      currentQuestion,
      concept,
      eligibleConcepts,
      recentAttempts,
      hintsUsed,
      failedAttempts,
      comicContext
    }, { timeoutMs: 12000 });
  } catch (error) {
    console.error("AI next-question generation failed", error);
    return { ai:false, unavailable:true, question:null, reason:"Soal berikut akan dipilih dari latihan yang tersedia." };
  }
}

export async function getTeacherRecommendation({ student, studentModel, attempts = [], events = [] }) {
  try { return await callEndpoint({ mode:"teacher_recommend", student, studentModel, attempts, events }); }
  catch (error) { console.error("AI teacher recommendation failed", error); return { ai:false, unavailable:true, summary:"Rekomendasi dibuat berdasarkan data pembelajaran yang tersedia.", priorityConcepts:[], recommendations:[], nextActivity:"Gunakan data pembelajaran siswa sebagai dasar tindak lanjut.", teacherNote:"" }; }
}
