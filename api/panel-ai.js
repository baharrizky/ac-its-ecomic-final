function json(res, status, payload) {
  return res.status(status).json(payload);
}

const MODEL = process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash";
const TIMEOUT_MS = 30000;

function parseImage(dataUrl, mimeHint) {
  const raw = String(dataUrl || "").trim();
  const m = raw.match(/^data:(image\/[\w.+-]+);base64,(.+)$/s);
  if (!m) return null;
  const mime = (m[1] || mimeHint || "image/jpeg").toLowerCase();
  const data = m[2].replace(/\s+/g, "");
  if (!data) return null;
  const bytes = Math.floor(data.length * 3 / 4);
  if (bytes > 18 * 1024 * 1024) throw Object.assign(new Error("Gambar terlalu besar."), { code: "IMAGE_TOO_LARGE" });
  return { mime, data, bytes };
}

async function callGemini({ image, question }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw Object.assign(new Error("GEMINI_API_KEY belum dikonfigurasi."), { code: "AI_NOT_CONFIGURED" });

  const prompt = [
    "Kamu adalah AI Tutor yang sedang melihat SATU gambar panel E-Comic yang sedang dibaca siswa.",
    "BACA DAN AMATI GAMBAR TERSEBUT SECARA LANGSUNG.",
    "Gunakan isi visual gambar sebagai sumber utama jawaban: teks, dialog, tokoh, benda, diagram, angka, simbol, dan situasi yang benar-benar terlihat.",
    "Jangan mengarang dan jangan menganggap gambar berisi materi tertentu jika memang tidak terlihat.",
    "Jika gambar hanya berupa pembuka cerita atau kata pengantar, katakan demikian.",
    "Jawab dalam Bahasa Indonesia yang santai, jelas, dan sesuai siswa SMA.",
    "Jika siswa bertanya tentang tulisan di gambar, bacakan atau jelaskan tulisan yang terlihat.",
    "Jika siswa bertanya tentang matematika, hubungkan hanya jika memang ada unsur matematika pada gambar.",
    "Jangan gunakan LaTeX mentah.",
    "Pertanyaan siswa:",
    String(question || "Apa yang kamu lihat pada gambar ini?").slice(0, 2000)
  ].join("\n\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { inline_data: { mime_type: image.mime, data: image.data } },
            { text: prompt }
          ]
        }],
        generationConfig: { maxOutputTokens: 700 }
      }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const e = Object.assign(new Error(data?.error?.message || `Gemini HTTP ${response.status}`), {
        code: "GEMINI_HTTP_ERROR",
        status: response.status
      });
      throw e;
    }

    const text = (data?.candidates || [])
      .flatMap(c => c?.content?.parts || [])
      .map(p => typeof p?.text === "string" ? p.text : "")
      .filter(Boolean)
      .join("\n")
      .trim();

    if (!text) {
      throw Object.assign(new Error("Gemini menerima gambar tetapi tidak mengembalikan teks."), {
        code: "GEMINI_EMPTY",
        finishReason: data?.candidates?.[0]?.finishReason || null,
        blockReason: data?.promptFeedback?.blockReason || null
      });
    }

    return {
      reply: text,
      meta: {
        model: MODEL,
        imageAttached: true,
        imageBytes: image.bytes,
        finishReason: data?.candidates?.[0]?.finishReason || null
      }
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw Object.assign(new Error("Gemini vision timeout."), { code: "GEMINI_TIMEOUT" });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  let body = {};
  try { body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); }
  catch { return json(res, 400, { error: "Invalid JSON body" }); }

  try {
    const image = parseImage(body.imageData, body.imageMime);
    if (!image) return json(res, 400, { error: "Gambar panel tidak diterima.", code: "IMAGE_MISSING" });
    const result = await callGemini({ image, question: body.question });
    return json(res, 200, { ...result, ai: true });
  } catch (error) {
    console.error("PANEL_AI_ERROR", {
      code: error?.code || "UNKNOWN",
      status: error?.status || null,
      finishReason: error?.finishReason || null,
      blockReason: error?.blockReason || null,
      message: error?.message || "unknown"
    });
    return json(res, Number(error?.status) >= 400 && Number(error?.status) < 500 ? error.status : 502, {
      error: "AI belum dapat membaca panel ini. Silakan coba sekali lagi.",
      code: error?.code || "PANEL_AI_FAILED",
      providerStatus: error?.status || null
    });
  }
}
