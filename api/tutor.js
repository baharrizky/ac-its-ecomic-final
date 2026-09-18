const DEFAULT_PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase();
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const DEFAULT_TIMEOUT_MS = Math.max(3000, Number(process.env.AI_TIMEOUT_MS || 15000));
const DEFAULT_RETRIES = Math.min(5, Math.max(0, Number(process.env.AI_MAX_RETRIES || 2)));

const CORRECTION_SCHEMA = {
  type: "object",
  properties: {
    correct: { type: "boolean" },
    misconceptionTag: { type: ["string", "null"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    explanation: { type: "string" },
    hint: { type: "string" },
    nextStep: { type: "string" }
  },
  required: [
    "correct",
    "misconceptionTag",
    "confidence",
    "explanation",
    "hint",
    "nextStep"
  ]
};

function json(res, status, payload) {
  return res.status(status).json(payload);
}

function clampText(value, max = 5000) {
  return String(value ?? "").slice(0, max);
}

function extractGeminiText(data) {
  const parts = [];
  for (const candidate of data?.candidates || []) {
    for (const part of candidate?.content?.parts || []) {
      if (typeof part?.text === "string") parts.push(part.text);
    }
  }
  return parts.join("\n").trim();
}

function parseJsonObject(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const fenced = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(fenced); } catch {}
  const match = fenced.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

function buildContext(context = {}) {
  return {
    comicTitle: clampText(context.comicTitle, 300),
    episodeTitle: clampText(context.episodeTitle, 300),
    panelTitle: clampText(context.panelTitle, 300),
    narration: clampText(context.narration, 2500),
    dialogue: clampText(context.dialogue, 2500),
    equation: clampText(context.equation, 1000),
    conceptId: clampText(context.conceptId, 100),
    conceptName: clampText(context.conceptName, 250),
    studentMastery: context.studentMastery ?? null,
    misconceptions: Array.isArray(context.misconceptions) ? context.misconceptions.slice(0, 8) : [],
    educationLevel: clampText(context.educationLevel, 50),
    grade: clampText(context.grade, 50),
    school: clampText(context.school, 180)
  };
}

function buildTutorPrompt(message, context, history = []) {
  const compact = buildContext(context);
  const recent = (history || [])
    .filter(item => item && (item.role === "user" || item.role === "assistant"))
    .slice(-8)
    .map(item => ({ role: item.role, text: clampText(item.text, 1200) }));

  return [
    "Kamu adalah AI Tutor matematika untuk siswa SMP/SMA Indonesia.",
    "Tugasmu membantu siswa memahami konsep melalui konteks E-Comic.",
    "Gunakan bahasa Indonesia yang ramah, jelas, tidak menghakimi, dan bertahap.",
    "Jangan langsung memberikan jawaban akhir jika siswa sedang mencoba memahami konsep. Gunakan pertanyaan penuntun bila sesuai.",
    "Jangan mengarang isi comic. Gunakan hanya informasi pada konteks yang diberikan.",
    "Jika konteks tidak cukup, nyatakan keterbatasannya dan minta siswa menjelaskan bagian yang dimaksud.",
    `KONTEKS PEMBELAJARAN:\n${JSON.stringify(compact, null, 2)}`,
    `RIWAYAT CHAT TERAKHIR:\n${JSON.stringify(recent, null, 2)}`,
    `PERTANYAAN SISWA:\n${clampText(message, 3000)}`
  ].join("\n\n");
}

function buildCorrectionPrompt(payload) {
  const q = payload?.question || {};
  const context = buildContext(payload?.context || {});
  return [
    "Kamu adalah AI evaluator pembelajaran matematika untuk siswa SMP/SMA Indonesia.",
    "Analisis jawaban siswa berdasarkan soal, jawaban benar, dan konteks belajar.",
    "Fokus pada pemahaman konsep dan kemungkinan miskonsepsi.",
    "Berikan umpan balik yang spesifik, ramah, dan dapat ditindaklanjuti.",
    "Jika jawaban benar, misconceptionTag harus null.",
    "Gunakan tag singkat UPPER_SNAKE_CASE jika ada miskonsepsi.",
    "Kembalikan JSON dengan field: correct (boolean), misconceptionTag (string atau null), confidence (number 0..1), explanation (string), hint (string), nextStep (string).",
    `KONTEKS:\n${JSON.stringify(context, null, 2)}`,
    `SOAL:\n${JSON.stringify(q, null, 2)}`,
    `JAWABAN SISWA:\n${JSON.stringify(payload?.selectedAnswer ?? null)}`,
    `JAWABAN BENAR:\n${JSON.stringify(payload?.correctAnswer ?? null)}`,
    `DIAGNOSIS AWAL SISTEM:\n${JSON.stringify(payload?.baselineDiagnosis || {}, null, 2)}`
  ].join("\n\n");
}

function backoffMs(attempt, retryAfterHeader) {
  const retryAfter = Number(retryAfterHeader);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, 8000);
  }
  const base = 600 * (2 ** attempt);
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(base + jitter, 6000);
}

function safeThinkingLevel(value, fallback = "low") {
  return ["low", "medium", "high"].includes(value) ? value : fallback;
}

function isRetryable(status) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(contents, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY belum dikonfigurasi di server.");
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }

  const model = options.model || DEFAULT_MODEL;
  const encodedModel = encodeURIComponent(model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodedModel}:generateContent`;
  const generationConfig = {
    maxOutputTokens: options.maxOutputTokens || 900,
    ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
    ...(options.responseSchema ? { responseSchema: options.responseSchema } : {}),
    ...(options.thinkingLevel ? { thinkingConfig: { thinkingLevel: safeThinkingLevel(options.thinkingLevel) } } : {})
  };

  const payload = {
    systemInstruction: {
      parts: [{ text: options.systemInstruction || "" }]
    },
    contents,
    generationConfig
  };

  let lastError = null;
  for (let attempt = 0; attempt <= DEFAULT_RETRIES; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify(payload)
      }, DEFAULT_TIMEOUT_MS);

      const data = await response.json().catch(() => ({}));
      const elapsedMs = Date.now() - startedAt;
      if (!response.ok) {
        const detail = data?.error?.message || `Gemini request gagal (${response.status})`;
        const error = new Error(detail);
        error.status = response.status;
        error.provider = "gemini";
        error.elapsedMs = elapsedMs;
        lastError = error;
        if (!isRetryable(response.status) || attempt >= DEFAULT_RETRIES) throw error;
        await new Promise(resolve => setTimeout(resolve, backoffMs(attempt, response.headers.get("retry-after"))));
        continue;
      }

      const text = extractGeminiText(data);
      if (!text) {
        const finishReason = data?.candidates?.[0]?.finishReason || null;
        const safety = data?.promptFeedback?.blockReason || null;
        const error = new Error(
          safety
            ? `Gemini memblokir respons karena ${safety}.`
            : finishReason
              ? `Gemini tidak mengembalikan teks (finishReason: ${finishReason}).`
              : "Gemini tidak mengembalikan teks."
        );
        error.code = safety ? "AI_BLOCKED" : "AI_EMPTY_RESPONSE";
        error.provider = "gemini";
        error.elapsedMs = elapsedMs;
        lastError = error;
        if (attempt >= DEFAULT_RETRIES) throw error;
        await new Promise(resolve => setTimeout(resolve, backoffMs(attempt)));
        continue;
      }

      return {
        text,
        data,
        meta: {
          provider: "gemini",
          model,
          attempts: attempt + 1,
          latencyMs: elapsedMs,
          usage: data?.usageMetadata || null,
          finishReason: data?.candidates?.[0]?.finishReason || null
        }
      };
    } catch (error) {
      lastError = error;
      const retryable = error?.name === "AbortError" || isRetryable(error?.status);
      if (!retryable || attempt >= DEFAULT_RETRIES) throw error;
      await new Promise(resolve => setTimeout(resolve, backoffMs(attempt)));
    }
  }

  throw lastError || new Error("Gemini request gagal.");
}

async function callOpenAI(contents, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY belum dikonfigurasi di server.");
  const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";
  const input = contents.map(item => `${item.role.toUpperCase()}: ${item.parts?.map(p => p.text || "").join(" ") || ""}`).join("\n\n");
  const response = await fetchWithTimeout(
    process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, input, max_output_tokens: options.maxOutputTokens || 900 })
    },
    DEFAULT_TIMEOUT_MS
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI request gagal (${response.status})`);
  const text = typeof data?.output_text === "string" ? data.output_text.trim() : "";
  return { text, data, meta: { provider: "openai", model, attempts: 1, usage: data?.usage || null } };
}

async function callAI(contents, options = {}) {
  const provider = options.provider || DEFAULT_PROVIDER;
  if (provider === "openai") return callOpenAI(contents, options);
  return callGemini(contents, options);
}

function tutorContents(prompt, history = []) {
  const messages = (history || [])
    .filter(item => item && (item.role === "user" || item.role === "assistant"))
    .slice(-8)
    .map(item => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: clampText(item.text, 1200) }]
    }));
  messages.push({ role: "user", parts: [{ text: prompt }] });
  return messages;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch {
    return json(res, 400, { error: "Invalid JSON body" });
  }
  const mode = body.mode || "tutor";
  const startedAt = Date.now();

  try {
    if (mode === "correct") {
      const prompt = buildCorrectionPrompt(body);
      const response = await callAI(
        [{ role: "user", parts: [{ text: prompt }] }],
        {
          responseMimeType: "application/json",
          responseSchema: CORRECTION_SCHEMA,
          thinkingLevel: safeThinkingLevel(process.env.GEMINI_CORRECTION_THINKING || "medium", "medium"),
          maxOutputTokens: 700
        }
      );
      const parsed = parseJsonObject(response.text);
      if (!parsed) throw Object.assign(new Error("AI mengembalikan format koreksi yang tidak valid."), { code: "AI_INVALID_JSON" });
      return json(res, 200, {
        correct: Boolean(parsed.correct),
        misconceptionTag: parsed.misconceptionTag === "" ? null : (parsed.misconceptionTag ?? null),
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence ?? 0.5))),
        explanation: String(parsed.explanation || "Belum ada umpan balik AI."),
        hint: String(parsed.hint || "Periksa kembali langkah perhitunganmu."),
        nextStep: String(parsed.nextStep || "Coba ulangi dengan menuliskan langkah satu per satu."),
        ai: true,
        meta: { ...response.meta, totalLatencyMs: Date.now() - startedAt }
      });
    }

    const message = clampText(body.message, 3000).trim();
    if (!message) return json(res, 400, { error: "Message is required" });
    const prompt = buildTutorPrompt(message, body.context || {}, body.history || []);
    const response = await callAI(
      tutorContents(prompt, body.history || []),
      {
        thinkingLevel: safeThinkingLevel(process.env.GEMINI_TUTOR_THINKING || "low", "low"),
        maxOutputTokens: 900
      }
    );

    return json(res, 200, {
      reply: response.text || "Maaf, AI belum memberikan respons.",
      ai: true,
      meta: { ...response.meta, totalLatencyMs: Date.now() - startedAt }
    });
  } catch (error) {
    console.error("AI endpoint error:", {
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_PROVIDER === "gemini" ? DEFAULT_MODEL : (process.env.OPENAI_MODEL || ""),
      mode,
      code: error?.code || null,
      status: error?.status || null,
      elapsedMs: Date.now() - startedAt,
      message: error?.message || "unknown"
    });
    const status = error?.code === "AI_NOT_CONFIGURED" ? 503 : 502;
    return json(res, status, {
      error: "AI sedang tidak tersedia. Silakan coba lagi beberapa saat.",
      code: error?.code || "AI_UNAVAILABLE",
      retryable: error?.code !== "AI_NOT_CONFIGURED",
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_PROVIDER === "gemini" ? DEFAULT_MODEL : (process.env.OPENAI_MODEL || "")
    });
  }
}
