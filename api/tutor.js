const DEFAULT_PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase();
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = Math.max(8000, Number(process.env.AI_TIMEOUT_MS || 30000));
const DEFAULT_RETRIES = Math.min(3, Math.max(1, Number(process.env.AI_MAX_RETRIES || 2)));

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
  const clean = String(text).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(clean); } catch {}
  const match = clean.match(/\{[\s\S]*\}/);
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
    school: clampText(context.school, 180),
    currentLevel: context.currentLevel ?? null,
    imageUrl: clampText(context.imageUrl, 2000)
  };
}

function buildTutorPrompt(message, context, history = []) {
  const compact = buildContext(context);
  const recent = (history || [])
    .filter(item => item && (item.role === "user" || item.role === "assistant"))
    .slice(-4)
    .map(item => ({ role: item.role, text: clampText(item.text, 700) }));

  // Keep the multimodal tutor prompt deliberately small. The panel image is
  // the primary visual source; metadata is supporting context only.
  return [
    "Kamu adalah AI Tutor matematika untuk siswa Indonesia.",
    "Jawab sebagai tutor yang hangat, singkat, jelas, dan interaktif.",
    "Jika ada gambar panel, AMATI GAMBAR TERLEBIH DAHULU. Gunakan gambar sebagai konteks utama untuk hal-hal visual.",
    "Jika gambar tidak tersedia, tetap jawab pertanyaan siswa menggunakan konteks materi yang tersedia. Jangan membalas hanya dengan pesan bahwa gambar gagal dibaca.",
    "Jangan menganggap metadata konsep sebagai sesuatu yang pasti terlihat pada gambar.",
    "Jika panel hanya pengantar/cerita, katakan bahwa panel itu berfungsi sebagai konteks dan jangan memaksakan materi matematika ke dalamnya.",
    "Jika siswa meminta jawaban soal secara langsung, beri satu petunjuk dan satu pertanyaan penuntun sebelum jawaban akhir.",
    "Jangan gunakan LaTeX mentah. Gunakan x², a/b, 2 ÷ 3, dan notasi yang mudah dibaca.",
    "Jangan mengarang detail.",
    `KONTEKS: ${JSON.stringify(compact)}`,
    `RIWAYAT: ${JSON.stringify(recent)}`,
    `PERTANYAAN: ${clampText(message, 2000)}`
  ].join("\n\n");
}

function buildCorrectionPrompt(payload) {
  const q = payload?.question || {};
  const context = buildContext(payload?.context || {});
  return [
    "Kamu adalah AI evaluator pembelajaran matematika untuk AC-ITS E-Comic.",
    "Evaluasi jawaban siswa berdasarkan soal, pilihan jawaban, jawaban benar, konteks konsep, dan diagnosis awal.",
    "Tujuan evaluasi adalah memperbarui student model, menemukan miskonsepsi, dan menentukan tindak lanjut belajar.",
    "Jangan hanya mengatakan benar/salah. Jelaskan konsep secara singkat dan berikan langkah berikutnya.",
    "Jika perlu menulis persamaan, gunakan notasi Unicode yang mudah dibaca, bukan LaTeX mentah.",
    "Jika siswa salah, gunakan misconceptionTag UPPER_SNAKE_CASE yang singkat. Jika benar, misconceptionTag harus null.",
    "Balas HANYA dengan JSON valid tanpa markdown dengan struktur: {\"correct\":boolean,\"misconceptionTag\":string|null,\"confidence\":number,\"explanation\":string,\"hint\":string,\"nextStep\":string}",
    `KONTEKS:\n${JSON.stringify(context, null, 2)}`,
    `SOAL:\n${JSON.stringify(q, null, 2)}`,
    `JAWABAN SISWA:\n${JSON.stringify(payload?.selectedAnswer ?? null)}`,
    `JAWABAN BENAR:\n${JSON.stringify(payload?.correctAnswer ?? null)}`,
    `DIAGNOSIS AWAL SISTEM:\n${JSON.stringify(payload?.baselineDiagnosis || {}, null, 2)}`
  ].join("\n\n");
}

function buildRecommendationPrompt(payload) {
  const model = payload?.studentModel || {};
  const questions = Array.isArray(payload?.questions) ? payload.questions.slice(0, 80) : [];
  const attempts = Array.isArray(payload?.recentAttempts) ? payload.recentAttempts.slice(0, 20) : [];
  return [
    "Kamu adalah adaptive learning engine untuk AC-ITS E-Comic.",
    "Tentukan satu soal berikutnya yang paling sesuai dengan kemampuan siswa.",
    "Guru tetap menentukan bank soal dan konsep; AI hanya memilih urutan, tingkat kesulitan, dan alasan berdasarkan data siswa.",
    "Prioritaskan prasyarat yang belum dikuasai, konsep dengan mastery rendah, miskonsepsi aktif, dan kenaikan level secara bertahap.",
    "Jangan memilih soal Draft. Jika data kemampuan minim, pilih level 1 dari konsep pertama yang relevan.",
    "Balas HANYA JSON valid: {\"questionId\":string|null,\"conceptId\":string|null,\"targetLevel\":number,\"action\":\"remedial\"|\"practice\"|\"challenge\",\"reason\":string}",
    `STUDENT MODEL:\n${JSON.stringify(model, null, 2)}`,
    `RECENT ATTEMPTS:\n${JSON.stringify(attempts, null, 2)}`,
    `QUESTION BANK:\n${JSON.stringify(questions, null, 2)}`
  ].join("\n\n");
}

function buildTeacherPrompt(payload) {
  const student = payload?.student || {};
  const model = payload?.studentModel || {};
  const attempts = Array.isArray(payload?.attempts) ? payload.attempts.slice(0, 25) : [];
  const events = Array.isArray(payload?.events) ? payload.events.slice(0, 25) : [];
  return [
    "Kamu adalah AI teaching assistant untuk guru pada AC-ITS E-Comic.",
    "Analisis perkembangan satu siswa berdasarkan student model, percobaan soal, dan aktivitas belajar.",
    "Berikan rekomendasi individual yang dapat ditindaklanjuti guru.",
    "Fokus pada konsep yang perlu diperkuat, pola miskonsepsi, kebiasaan belajar, dan intervensi berikutnya.",
    "Jangan membuat klaim yang tidak didukung data.",
    "Balas JSON valid: {\"summary\":string,\"priorityConcepts\":string[],\"recommendations\":string[],\"nextActivity\":string,\"teacherNote\":string}",
    `DATA SISWA:\n${JSON.stringify(student, null, 2)}`,
    `STUDENT MODEL:\n${JSON.stringify(model, null, 2)}`,
    `ATTEMPTS:\n${JSON.stringify(attempts, null, 2)}`,
    `ACTIVITY EVENTS:\n${JSON.stringify(events, null, 2)}`
  ].join("\n\n");
}

function backoffMs(attempt, retryAfterHeader) {
  const retryAfter = Number(retryAfterHeader);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1000, 6000);
  return Math.min(500 * (2 ** attempt) + Math.floor(Math.random() * 200), 5000);
}

function isRetryable(status) {
  return [408, 429, 500, 502, 503, 504].includes(Number(status));
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

function parseInlineImageData(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = raw.match(/^data:(image\/[^;]+);base64,(.+)$/s);
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const data = match[2].replace(/\s+/g, "");
  if (!mimeType.startsWith("image/") || !data) return null;
  const approxBytes = Math.floor((data.length * 3) / 4);
  if (approxBytes <= 0 || approxBytes > 12 * 1024 * 1024) return null;
  return { mimeType, data, bytes: approxBytes };
}

async function imageUrlToInlineData(imageUrl) {
  const value = String(imageUrl || '').trim();
  if (!value) return null;
  const inline = parseInlineImageData(value);
  if (inline) return inline;
  let url;
  try { url = new URL(value); } catch { return null; }
  const host = url.hostname.toLowerCase();
  const allowed = host === 'firebasestorage.googleapis.com' || host === 'storage.googleapis.com' || host.endsWith('.firebasestorage.app');
  if (!allowed) return null;
  const response = await fetchWithTimeout(url.toString(), { method:'GET', headers:{Accept:'image/*'} }, Math.min(DEFAULT_TIMEOUT_MS, 12000));
  if (!response.ok) return null;
  const contentType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  if (!contentType.startsWith('image/')) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > 12 * 1024 * 1024) return null;
  return { mimeType: contentType, data: buffer.toString('base64'), bytes: buffer.length };
}

async function buildGeminiParts(prompt, options = {}) {
  const parts = [];
  let imageAttached = false;
  let imageBytes = 0;
  let imageMimeType = null;

  // Preferred path: the browser already resolved cloud-media:// to actual
  // base64. This avoids asking the Vercel function to understand app-specific
  // media references.
  let image = parseInlineImageData(options.imageData || "");
  if (!image && options.imageData && options.imageMime) {
    const raw = String(options.imageData).replace(/\s+/g, "");
    const mimeType = String(options.imageMime).toLowerCase();
    if (mimeType.startsWith("image/") && raw) {
      const approxBytes = Math.floor((raw.length * 3) / 4);
      if (approxBytes > 0 && approxBytes <= 12 * 1024 * 1024) {
        image = { mimeType, data: raw, bytes: approxBytes };
      }
    }
  }
  if (!image && options.imageUrl) {
    try {
      image = await imageUrlToInlineData(options.imageUrl);
    } catch (error) {
      console.warn("AI_IMAGE_FETCH_ERROR", { message: error?.message || "unknown" });
    }
  }

  if (image) {
    parts.push({ inline_data: { mime_type: image.mimeType, data: image.data } });
    imageAttached = true;
    imageBytes = image.bytes || Math.floor((image.data.length * 3) / 4);
    imageMimeType = image.mimeType;
  } else if (options.imageExpected) {
    const e = new Error("Panel image tidak berhasil dilampirkan ke Gemini.");
    e.code = "AI_IMAGE_NOT_ATTACHED";
    throw e;
  }

  parts.push({ text: prompt });
  return { parts, imageAttached, imageBytes, imageMimeType };
}

async function callGemini(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const e = new Error("GEMINI_API_KEY belum dikonfigurasi di server.");
    e.code = "AI_NOT_CONFIGURED";
    throw e;
  }

  const model = options.model || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  // Gemini 3.8 uses the Gemini 3 generation contract. In particular,
  // sampling controls such as temperature are not part of the recommended
  // 3.8 configuration. Sending them can turn an otherwise valid multimodal
  // request into a provider 4xx which this API previously surfaced as 502.
  const isGemini3 = /^gemini-3\./i.test(model);
  const generationConfig = {
    maxOutputTokens: options.maxOutputTokens || 1200
  };
  if (!isGemini3 && options.temperature != null) generationConfig.temperature = options.temperature;
  if (options.json) generationConfig.responseMimeType = "application/json";
  if (options.thinkingLevel) {
    generationConfig.thinkingConfig = { thinkingLevel: options.thinkingLevel };
  }

  const builtParts = await buildGeminiParts(prompt, options);
  const payload = {
    contents: [{ role: "user", parts: builtParts.parts }],
    generationConfig
  };
  if (options.systemInstruction) payload.systemInstruction = { parts: [{ text: options.systemInstruction }] };

  let lastError = null;
  for (let attempt = 0; attempt <= DEFAULT_RETRIES; attempt += 1) {
    const started = Date.now();
    try {
      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(payload)
      }, DEFAULT_TIMEOUT_MS);
      const data = await response.json().catch(() => ({}));
      const latencyMs = Date.now() - started;
      if (!response.ok) {
        const e = new Error(data?.error?.message || `Gemini request gagal (${response.status})`);
        e.status = response.status; e.provider = "gemini"; e.latencyMs = latencyMs;
        lastError = e;
        if (!isRetryable(response.status) || attempt >= DEFAULT_RETRIES) throw e;
        await new Promise(r => setTimeout(r, backoffMs(attempt, response.headers.get("retry-after"))));
        continue;
      }
      const text = extractGeminiText(data);
      if (!text) {
        const finishReason = data?.candidates?.[0]?.finishReason || "unknown";
        const blockReason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishMessage || "";
        const e = new Error(`Gemini tidak mengembalikan teks (finishReason: ${finishReason}${blockReason ? `, ${blockReason}` : ""}).`);
        e.code = "AI_EMPTY_RESPONSE"; e.provider = "gemini"; e.latencyMs = latencyMs;
        lastError = e;
        if (attempt >= DEFAULT_RETRIES) throw e;
        await new Promise(r => setTimeout(r, backoffMs(attempt)));
        continue;
      }
      return { text, meta: { provider: "gemini", model, attempts: attempt + 1, latencyMs, usage: data?.usageMetadata || null, finishReason: data?.candidates?.[0]?.finishReason || null, imageAttached: builtParts.imageAttached, imageBytes: builtParts.imageBytes, imageMimeType: builtParts.imageMimeType } };
    } catch (e) {
      lastError = e;
      if (e?.name === "AbortError") e.code = "AI_TIMEOUT";
      if (!(e?.name === "AbortError" || isRetryable(e?.status)) || attempt >= DEFAULT_RETRIES) throw e;
      await new Promise(r => setTimeout(r, backoffMs(attempt)));
    }
  }
  throw lastError || new Error("Gemini request gagal.");
}

async function callAI(prompt, options = {}) {
  if (DEFAULT_PROVIDER !== "gemini") throw Object.assign(new Error(`Provider ${DEFAULT_PROVIDER} belum diaktifkan pada build ini.`), { code: "AI_PROVIDER_UNSUPPORTED" });
  try {
    return await callGemini(prompt, options);
  } catch (error) {
    // Keep Tutor available when the primary model is temporarily unavailable or rate-limited.
    const providerStatus = Number(error?.status);
    const canFallback = providerStatus === 400 || providerStatus === 404 || providerStatus === 429 || [500,502,503,504].includes(providerStatus);
    if (canFallback && DEFAULT_MODEL !== FALLBACK_MODEL) {
      return await callGemini(prompt, { ...options, model:FALLBACK_MODEL, thinkingLevel:undefined });
    }
    throw error;
  }
}

function normalizeCorrection(parsed, fallback = {}) {
  return {
    correct: Boolean(parsed?.correct ?? fallback.correct),
    misconceptionTag: parsed?.misconceptionTag === "" ? null : (parsed?.misconceptionTag ?? fallback.misconceptionTag ?? null),
    confidence: Math.min(1, Math.max(0, Number(parsed?.confidence ?? fallback.confidence ?? 0.5))),
    explanation: String(parsed?.explanation || fallback.explanation || "Belum ada umpan balik."),
    hint: String(parsed?.hint || "Coba tuliskan langkahmu satu per satu."),
    nextStep: String(parsed?.nextStep || "Kembali ke konsep lalu coba soal berikutnya.")
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  let body = {};
  try { body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); }
  catch { return json(res, 400, { error: "Invalid JSON body" }); }

  const mode = body.mode || "tutor";
  const startedAt = Date.now();
  try {
    if (mode === "correct") {
      const response = await callAI(buildCorrectionPrompt(body), { json: true, thinkingLevel: process.env.GEMINI_CORRECTION_THINKING || "medium", maxOutputTokens: 1200 });
      const parsed = parseJsonObject(response.text);
      if (!parsed) throw Object.assign(new Error("AI correction mengembalikan JSON tidak valid."), { code: "AI_INVALID_JSON" });
      return json(res, 200, { ...normalizeCorrection(parsed, body.baselineDiagnosis || {}), ai: true });
    }

    if (mode === "recommend") {
      const response = await callAI(buildRecommendationPrompt(body), { json: true, thinkingLevel: "low", maxOutputTokens: 900 });
      const parsed = parseJsonObject(response.text);
      if (!parsed) throw Object.assign(new Error("AI recommendation mengembalikan JSON tidak valid."), { code: "AI_INVALID_JSON" });
      return json(res, 200, { questionId: parsed.questionId || null, conceptId: parsed.conceptId || null, targetLevel: Number(parsed.targetLevel || 1), action: parsed.action || "practice", reason: String(parsed.reason || "Latihan dipilih berdasarkan perkembangan belajar siswa."), ai: true });
    }

    if (mode === "teacher_recommend") {
      const response = await callAI(buildTeacherPrompt(body), { json: true, thinkingLevel: "medium", maxOutputTokens: 1100 });
      const parsed = parseJsonObject(response.text);
      if (!parsed) throw Object.assign(new Error("AI teacher recommendation mengembalikan JSON tidak valid."), { code: "AI_INVALID_JSON" });
      return json(res, 200, { summary: String(parsed.summary || ""), priorityConcepts: Array.isArray(parsed.priorityConcepts) ? parsed.priorityConcepts.slice(0, 8) : [], recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 8) : [], nextActivity: String(parsed.nextActivity || ""), teacherNote: String(parsed.teacherNote || ""), ai: true });
    }

    const message = clampText(body.message, 3000).trim();
    if (!message) return json(res, 400, { error: "Message is required" });
    const history = Array.isArray(body.history) ? body.history : [];
    const tutorContext = body.context || {};
    // Tutor uses the proven Gemini generateContent path. The browser sends
    // the actual panel image as a data URL, so the server never needs to
    // understand cloud-media:// references. This keeps Tutor independent
    // from the newer Interactions API while still using Gemini vision.
    // Tutor intentionally uses a separate, conservative model path. This
    // keeps multimodal tutoring independent from the heavier correction /
    // recommendation flows and avoids Gemini 3 thinking/output edge cases.
    const tutorModel = process.env.GEMINI_TUTOR_MODEL || "gemini-2.5-flash";
    let response;
    try {
      response = await callGemini(buildTutorPrompt(message, tutorContext, history), {
        model: tutorModel,
        imageData: body.imageData || "",
        imageMime: body.imageMime || "",
        imageUrl: tutorContext.imageUrl,
        // Image is preferred context, never a hard requirement.
        imageExpected: false,
        maxOutputTokens: 800
      });
    } catch (primaryError) {
      // One deterministic fallback to the configured primary model. No retry
      // storm: the endpoint either returns a reply or a concrete diagnostic.
      if (DEFAULT_MODEL !== tutorModel) {
        response = await callGemini(buildTutorPrompt(message, tutorContext, history), {
          model: DEFAULT_MODEL,
          imageData: body.imageData || "",
          imageMime: body.imageMime || "",
          imageUrl: tutorContext.imageUrl,
          // Image is preferred context, never a hard requirement.
        imageExpected: false,
          maxOutputTokens: 800,
          thinkingLevel: /^gemini-3\./i.test(DEFAULT_MODEL) ? "low" : undefined
        });
      } else {
        throw primaryError;
      }
    }
    return json(res, 200, { reply: response.text, ai: true, meta: { ...response.meta, tutorModel } });
  } catch (error) {
    console.error("AI endpoint error", { mode, provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL, code: error?.code || null, status: error?.status || null, message: error?.message || "unknown", latencyMs: Date.now() - startedAt });
    const status = error?.code === "AI_NOT_CONFIGURED" ? 503 : 502;
    return json(res, status, {
      error: "Tutor sedang mengalami gangguan sementara. Silakan coba lagi beberapa saat.",
      retryable: error?.code !== "AI_NOT_CONFIGURED",
      code: error?.code || "AI_REQUEST_FAILED",
      providerStatus: error?.status || null
    });
  }
}
