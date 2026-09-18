const configured = import.meta.env.VITE_AI_TUTOR_ENDPOINT;
const endpoint = configured || "/api/tutor";

async function callEndpoint(payload, { retries = 1, timeoutMs = 16000 } = {}) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data?.error || "AI endpoint error");
        error.status = response.status;
        error.retryable = data?.retryable !== false;
        throw error;
      }
      return data;
    } catch (error) {
      lastError = error;
      if (attempt >= retries || error?.retryable === false) break;
      await new Promise(resolve => setTimeout(resolve, 500 * (2 ** attempt)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error("AI request gagal");
}

export async function getTutorReply({ message, context, history }) {
  try {
    return await callEndpoint({ mode: "tutor", message, context, history }, { retries: 1 });
  } catch (error) {
    const concept = context?.conceptName || context?.conceptId || "konsep yang sedang dipelajari";
    const comic = context?.comicTitle || "comic ini";
    return {
      reply: `Tutor AI sedang mengalami gangguan sementara. Comic dan aktivitas belajar tetap dapat digunakan. Sementara itu, coba cek kembali narasi, dialog, atau persamaan pada ${comic}, khususnya konsep ${concept}.`,
      ai: false,
      unavailable: true,
      aiError: error?.message || "AI unavailable"
    };
  }
}

export async function correctAnswerWithAI({ question, selectedAnswer, correctAnswer, baselineDiagnosis, context = {} }) {
  try {
    return await callEndpoint({
      mode: "correct",
      question,
      selectedAnswer,
      correctAnswer,
      baselineDiagnosis,
      context
    }, { retries: 1 });
  } catch (error) {
    return {
      ...baselineDiagnosis,
      ai: false,
      unavailable: true,
      aiError: error?.message || "AI unavailable"
    };
  }
}
