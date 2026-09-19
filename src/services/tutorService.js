const endpoint = "/api/tutor";

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
    return await callEndpoint({ mode:"tutor", message, context, history }, { retries:1 });
  } catch (error) {
    console.error("Tutor AI failed", error);
    const concept = context?.conceptName || context?.conceptId || "konsep yang sedang dipelajari";
    const comic = context?.comicTitle || "comic ini";
    return {
      reply: `AI sedang tidak dapat terhubung. Namun sistem belajar tetap berjalan. Coba kembali ke ${comic} dan perhatikan bagian ${concept}, lalu tanyakan lagi.`,
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
    return { ai:false, unavailable:true, questionId:null, reason:"Adaptive engine lokal digunakan karena AI belum tersedia." };
  }
}

export async function getTeacherRecommendation({ student, studentModel, attempts = [], events = [] }) {
  try {
    return await callEndpoint({ mode:"teacher_recommend", student, studentModel, attempts, events }, { retries:1, timeoutMs:22000 });
  } catch (error) {
    console.error("AI teacher recommendation failed", error);
    return { ai:false, unavailable:true, summary:"AI belum tersedia untuk rekomendasi guru.", priorityConcepts:[], recommendations:[], nextActivity:"Gunakan data mastery dan miskonsepsi pada student model.", teacherNote:"" };
  }
}

export async function testAIConnection() {
  const response = await fetch("/api/ai-test", { method:"GET", cache:"no-store" });
  const data = await response.json().catch(()=>({}));
  return { ...data, httpStatus:response.status };
}
