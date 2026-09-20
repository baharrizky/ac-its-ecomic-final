const DEFAULT_PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase();
const DEFAULT_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";
const DEFAULT_TIMEOUT_MS = Math.max(7000, Number(process.env.AI_TIMEOUT_MS || 12000));
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
    characters: Array.isArray(context.characters) ? context.characters.slice(0, 20).map(x => clampText(x, 80)) : [],
    storyContext: clampText(context.storyContext, 9000),
    episodeDescription: clampText(context.episodeDescription, 1200),
    imageUrl: clampText(context.imageUrl, 2000)
  };
}

function buildTutorPrompt(message, context, history = []) {
  const compact = buildContext(context);
  const recent = (history || [])
    .filter(item => item && (item.role === "user" || item.role === "assistant"))
    .slice(-6)
    .map(item => ({ role: item.role, text: clampText(item.text, 700) }));

  return [
    "Kamu adalah teman belajar sekaligus AI Tutor matematika di AC-ITS E-Comic untuk siswa Indonesia.",
    "Gaya bicaramu santai, hangat, aktif, dan membuat siswa ingin melanjutkan percakapan. Jangan terdengar seperti buku teks atau chatbot layanan pelanggan.",
    "Mulai dari inti pertanyaan siswa. Jika cocok, gunakan nama tokoh, kejadian, atau situasi dari komik agar jawaban terasa seperti bagian dari cerita.",
    "Pahami komik sebagai satu cerita, bukan hanya satu panel. STORY CONTEXT berisi urutan episode, tokoh, narasi, dialog, persamaan, dan konsep yang sudah ditulis guru.",
    "Untuk pertanyaan tentang isi komik, tokoh, hubungan antaradegan, atau alur cerita, gunakan STORY CONTEXT dan gambar panel aktif. Jangan mengarang karakter, kejadian, atau sifat tokoh yang tidak didukung.",
    "Untuk pertanyaan matematika, hubungkan penjelasan dengan adegan atau dialog yang relevan jika memang ada. Jangan memaksakan hubungan yang tidak ada.",
    "Jika ada gambar panel, amati gambar terlebih dahulu. Gunakan gambar untuk membaca visual, teks pada gambar, ekspresi/tindakan tokoh, angka, simbol, dan objek yang terlihat.",
    "Jika siswa bertanya umum seperti 'apa yang ada di komik?', jawab berdasarkan cerita yang benar-benar tersedia dan sebutkan tokoh/kejadian yang relevan.",
    "Jika siswa bingung, ajukan pertanyaan kecil yang mudah dijawab sebelum memberi penjelasan panjang. Gunakan contoh singkat.",
    "Jika siswa meminta jawaban soal secara langsung, jangan langsung membocorkan jawaban. Beri petunjuk dan pertanyaan penuntun.",
    "Jangan mengulang kalimat generik seperti 'Mari kita tetap gunakan konteks belajar...' atau 'Coba jelaskan bagian mana yang membingungkan' jika kamu bisa langsung merespons pertanyaan siswa.",
    "Jangan mengatakan tutor tidak tersedia. Jika informasi tertentu memang tidak ada di komik, katakan dengan jujur lalu bantu dari informasi yang tersedia.",
    "Gunakan Bahasa Indonesia natural. Boleh memakai emoji secukupnya, tetapi jangan berlebihan.",
    "Gunakan x², aⁿ, a/b, dan notasi matematika yang mudah dibaca; jangan keluarkan LaTeX mentah.",
    `KONTEKS PEMBELAJARAN: ${JSON.stringify(compact)}`,
    `RIWAYAT PERCAKAPAN: ${JSON.stringify(recent)}`,
    `PERTANYAAN SISWA: ${clampText(message, 2000)}`
  ].join("\n\n");
}

function buildCorrectionPrompt(payload) {
  const q = payload?.question || {};
  const context = buildContext(payload?.context || {});
  return [
    "Kamu adalah AI evaluator pembelajaran matematika untuk AC-ITS E-Comic.",
    "Evaluasi jawaban siswa berdasarkan soal, pilihan jawaban, jawaban benar, konteks konsep, dan diagnosis awal.",
    "Tujuan evaluasi adalah memperbarui student model, menemukan miskonsepsi, dan menentukan tindak lanjut belajar.",
    "Miskonsepsi HARUS ditentukan oleh AI berdasarkan pola jawaban siswa, konsep, jawaban benar, dan konteks soal. Jangan hanya menyalin diagnosis awal sistem.",
    "Bedakan miskonsepsi konseptual dari kesalahan hitung atau salah klik. Jika bukti belum cukup untuk menyimpulkan miskonsepsi, gunakan misconceptionTag null.",
    "Jika jawaban salah, jelaskan secara spesifik apa pola berpikir yang keliru dan bagaimana memperbaikinya tanpa langsung membocorkan seluruh jawaban.",
    "Jangan hanya mengatakan benar/salah. Jelaskan konsep secara singkat dan berikan langkah berikutnya.",
    "Jika perlu menulis persamaan, gunakan notasi Unicode yang mudah dibaca, bukan LaTeX mentah.",
    "Jika siswa salah dan memang ada miskonsepsi, gunakan misconceptionTag UPPER_SNAKE_CASE yang singkat dan konsisten untuk pola yang sama. Jika benar atau bukti belum cukup, misconceptionTag harus null.",
    "Balas HANYA dengan JSON valid tanpa markdown dengan struktur: {\"correct\":boolean,\"misconceptionTag\":string|null,\"confidence\":number,\"explanation\":string,\"hint\":string,\"nextStep\":string}",
    `KONTEKS:\n${JSON.stringify(context, null, 2)}`,
    `SOAL:\n${JSON.stringify(q, null, 2)}`,
    `JAWABAN SISWA:\n${JSON.stringify(payload?.selectedAnswer ?? null)}`,
    `JAWABAN BENAR:\n${JSON.stringify(payload?.correctAnswer ?? null)}`,
    `DIAGNOSIS AWAL SISTEM:\n${JSON.stringify(payload?.baselineDiagnosis || {}, null, 2)}`
  ].join("\n\n");
}

function buildHintPrompt(payload) {
  const q = payload?.question || {};
  const hintIndex = Math.max(1, Math.min(3, Number(payload?.hintIndex || 1)));
  return [
    "Kamu adalah AI Hint Tutor untuk latihan matematika AC-ITS E-Comic.",
    "Berikan HANYA satu hint bertahap, bukan jawaban akhir.",
    "Hint harus membantu siswa bergerak satu langkah dan harus sesuai dengan soal serta konsep yang diberikan.",
    hintIndex === 1 ? "Level 1: berikan arah/hal yang perlu diperhatikan." : hintIndex === 2 ? "Level 2: berikan konsep atau hubungan yang harus digunakan." : "Level 3: berikan langkah penyelesaian berikutnya tanpa menyelesaikan seluruh soal.",
    "Jika ada miskonsepsi, arahkan secara spesifik agar siswa memperbaiki kesalahannya.",
    "Gunakan bahasa Indonesia yang singkat dan jelas. Jangan mengatakan 'baca ulang materi' tanpa petunjuk konkret.",
    "Balas JSON valid: {\"hint\":string,\"focus\":string}",
    `SOAL:\n${JSON.stringify(q, null, 2)}`,
    `KONSEP: ${String(payload?.conceptName || payload?.conceptId || "")}`,
    `MASTERY: ${Number(payload?.studentMastery || 0)}`,
    `MISKONSEPSI: ${String(payload?.misconceptionTag || "")}`,
    `KONTEKS: ${JSON.stringify(payload?.context || {})}`
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
    "Hanya gunakan konsep yang sudah pernah dipelajari atau secara eksplisit diberikan sebagai eligible. Jangan merekomendasikan konsep yang belum dilalui.",
    "Prioritaskan konsep aktif yang mastery-nya belum optimal, miskonsepsi aktif, dan kenaikan level secara bertahap.",
    "Jangan memilih soal Draft. Jika data kemampuan minim, pilih soal dari konsep aktif yang sudah dipelajari.",
    "Balas HANYA JSON valid: {\"questionId\":string|null,\"conceptId\":string|null,\"targetLevel\":number,\"action\":\"remedial\"|\"practice\"|\"challenge\",\"reason\":string}",
    `STUDENT MODEL:\n${JSON.stringify(model, null, 2)}`,
    `RECENT ATTEMPTS:\n${JSON.stringify(attempts, null, 2)}`,
    `QUESTION BANK:\n${JSON.stringify(questions, null, 2)}`
  ].join("\n\n");
}

function buildGenerateNextQuestionPrompt(payload) {
  const model = payload?.studentModel || {};
  const current = payload?.currentQuestion || {};
  const concept = payload?.concept || {};
  const eligible = Array.isArray(payload?.eligibleConcepts) ? payload.eligibleConcepts.slice(0, 20) : [];
  const attempts = Array.isArray(payload?.recentAttempts) ? payload.recentAttempts.slice(0, 8) : [];
  const hintsUsed = Number(payload?.hintsUsed || 0);
  const failedAttempts = Number(payload?.failedAttempts || 0);
  const comic = payload?.comicContext || {};

  return [
    "Kamu adalah AI pembuat soal adaptif untuk AC-ITS E-Comic.",
    "Buat SATU soal latihan matematika baru setelah siswa menyelesaikan soal sebelumnya.",
    "Soal harus benar-benar dibuat oleh AI, bukan sekadar memilih questionId dari bank soal.",
    "Soal wajib tetap berada pada konsep yang sedang dipelajari atau konsep berikutnya yang sudah dinyatakan eligible. Jangan melompati konsep yang belum dipelajari.",
    "Gunakan konteks komik jika tersedia agar soal terasa terkait cerita, tetapi jangan mengubah konteks cerita menjadi soal yang tidak masuk akal.",
    "Tingkat kesulitan harus bertahap: tanpa hint dan tanpa kegagalan → naik sedikit; 1–2 hint → tetap/naik sangat kecil; 3 hint atau banyak kegagalan → pertahankan atau turunkan sedikit untuk penguatan.",
    "Jangan mengulang soal sebelumnya. Jangan membuat soal yang jawabannya ambigu.",
    "Untuk siswa SMA, gunakan pilihan ganda 4 opsi dan tepat satu jawaban benar.",
    "Balas HANYA JSON valid dengan struktur:",
    "{\"question\":{\"id\":string,\"question\":string,\"options\":[string,string,string,string],\"answer\":number,\"explanation\":string,\"equation\":string,\"conceptId\":string,\"level\":number,\"assessmentType\":\"practice\"},\"reason\":string,\"targetLevel\":number}",
    "answer adalah indeks 0-3 dari jawaban benar.",
    "equation boleh kosong jika tidak diperlukan.",
    `STUDENT MODEL:\n${JSON.stringify(model)}`,
    `SOAL SEBELUMNYA:\n${JSON.stringify(current)}`,
    `KONSEP SAAT INI:\n${JSON.stringify(concept)}`,
    `KONSEP YANG BOLEH DIGUNAKAN:\n${JSON.stringify(eligible)}`,
    `HINT DIGUNAKAN: ${hintsUsed}`,
    `JUMLAH GAGAL PADA SOAL SEBELUMNYA: ${failedAttempts}`,
    `ATTEMPTS TERBARU:\n${JSON.stringify(attempts)}`,
    `KONTEKS KOMIK:\n${JSON.stringify(comic)}`
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
  const maxRetries = Number.isFinite(Number(options.maxRetries)) ? Math.max(0, Math.min(2, Number(options.maxRetries))) : DEFAULT_RETRIES;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const started = Date.now();
    try {
      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(payload)
      }, Number(options.timeoutMs || DEFAULT_TIMEOUT_MS));
      const data = await response.json().catch(() => ({}));
      const latencyMs = Date.now() - started;
      if (!response.ok) {
        const e = new Error(data?.error?.message || `Gemini request gagal (${response.status})`);
        e.status = response.status; e.provider = "gemini"; e.latencyMs = latencyMs;
        lastError = e;
        if (!isRetryable(response.status) || attempt >= maxRetries) throw e;
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
        if (attempt >= maxRetries) throw e;
        await new Promise(r => setTimeout(r, backoffMs(attempt)));
        continue;
      }
      return { text, meta: { provider: "gemini", model, attempts: attempt + 1, latencyMs, usage: data?.usageMetadata || null, finishReason: data?.candidates?.[0]?.finishReason || null, imageAttached: builtParts.imageAttached, imageBytes: builtParts.imageBytes, imageMimeType: builtParts.imageMimeType } };
    } catch (e) {
      lastError = e;
      if (e?.name === "AbortError") e.code = "AI_TIMEOUT";
      if (!(e?.name === "AbortError" || isRetryable(e?.status)) || attempt >= maxRetries) throw e;
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
    const timedOut = error?.code === "AI_TIMEOUT" || error?.name === "AbortError";
    const canFallback = timedOut || providerStatus === 400 || providerStatus === 404 || providerStatus === 429 || [500,502,503,504].includes(providerStatus);
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
    if (mode === "hint") {
      const response = await callAI(buildHintPrompt(body), { json: true, thinkingLevel: "low", maxOutputTokens: 280, timeoutMs: 12000, maxRetries: 0 });
      const parsed = parseJsonObject(response.text);
      if (!parsed) throw Object.assign(new Error("AI hint mengembalikan JSON tidak valid."), { code: "AI_INVALID_JSON" });
      return json(res, 200, { reply: String(parsed.hint || ""), focus: String(parsed.focus || ""), hintIndex: Math.max(1, Math.min(3, Number(body.hintIndex || 1))), ai: true, meta: response.meta });
    }

    if (mode === "correct") {
      const response = await callAI(buildCorrectionPrompt(body), { json: true, thinkingLevel: process.env.GEMINI_CORRECTION_THINKING || "low", maxOutputTokens: 600, timeoutMs: 9000, maxRetries: 0 });
      const parsed = parseJsonObject(response.text);
      if (!parsed) throw Object.assign(new Error("AI correction mengembalikan JSON tidak valid."), { code: "AI_INVALID_JSON" });
      return json(res, 200, { ...normalizeCorrection(parsed, body.baselineDiagnosis || {}), ai: true });
    }

    if (mode === "generate_next") {
      const response = await callAI(buildGenerateNextQuestionPrompt(body), { json: true, thinkingLevel: "low", maxOutputTokens: 520, timeoutMs: 6500, maxRetries: 0 });
      const parsed = parseJsonObject(response.text);
      if (!parsed?.question || !Array.isArray(parsed.question.options) || parsed.question.options.length !== 4) {
        throw Object.assign(new Error("AI next question mengembalikan format tidak valid."), { code: "AI_INVALID_QUESTION" });
      }
      const q = parsed.question;
      const answer = Math.max(0, Math.min(3, Number(q.answer ?? 0)));
      return json(res, 200, {
        question: {
          id: String(q.id || `ai-q-${Date.now()}`),
          question: String(q.question || ""),
          options: q.options.map(x => String(x)),
          answer,
          explanation: String(q.explanation || ""),
          equation: String(q.equation || ""),
          conceptId: String(q.conceptId || body?.concept?.id || ""),
          level: Math.max(1, Math.min(5, Number(q.level || parsed.targetLevel || 1))),
          assessmentType: "practice",
          generatedByAI: true
        },
        reason: String(parsed.reason || "Soal berikut dibuat berdasarkan perkembangan belajarmu."),
        targetLevel: Math.max(1, Math.min(5, Number(parsed.targetLevel || q.level || 1))),
        ai: true
      });
    }

    if (mode === "recommend") {
      const response = await callAI(buildRecommendationPrompt(body), { json: true, thinkingLevel: "low", maxOutputTokens: 500, timeoutMs: 9000, maxRetries: 0 });
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
    const tutorModel = "gemini-2.5-flash";
    const tutorPrompt = buildTutorPrompt(message, tutorContext, history);
    let response;
    try {
      // Primary multimodal attempt.
      response = await callGemini(tutorPrompt, {
        model: tutorModel,
        imageData: body.imageData || "",
        imageMime: body.imageMime || "",
        imageUrl: tutorContext.imageUrl,
        imageExpected: false,
        maxOutputTokens: 800,
        timeoutMs: 14000,
        maxRetries: 1
      });
    } catch (primaryError) {
      // If the visual request is the problem, retry with the story/text
      // context first. The tutor should not disappear just because a panel
      // image could not be attached.
      try {
        response = await callAI(tutorPrompt, {
          model: DEFAULT_MODEL,
          imageData: "",
          imageMime: "",
          imageUrl: "",
          imageExpected: false,
          maxOutputTokens: 800,
          thinkingLevel: "low",
          timeoutMs: 7000,
          maxRetries: 0
        });
      } catch (secondaryError) {
        // Last deterministic fallback for temporary provider/model issues.
        if (FALLBACK_MODEL !== DEFAULT_MODEL) {
          response = await callGemini(tutorPrompt, {
            model: FALLBACK_MODEL,
            imageData: "",
            imageMime: "",
            imageUrl: "",
            imageExpected: false,
            maxOutputTokens: 700,
            timeoutMs: 10000,
            maxRetries: 0
          });
        } else {
          throw secondaryError || primaryError;
        }
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
