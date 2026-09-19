function json(res, status, payload) {
  return res.status(status).json(payload);
}

const MODEL = process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash";
const TIMEOUT_MS = 30000;

function parseDataUrl(dataUrl) {
  const raw = String(dataUrl || "").trim();
  const m = raw.match(/^data:(image\/[\w.+-]+);base64,(.+)$/s);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const data = m[2].replace(/\s+/g, "");
  if (!data) return null;
  return { mime, data, bytes: Math.floor(data.length * 3 / 4) };
}

async function getCloudMedia(mediaRef, firebaseToken) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw Object.assign(new Error("Firebase project belum dikonfigurasi."), { code: "FIREBASE_PROJECT_MISSING" });
  const id = String(mediaRef || "").replace(/^cloud-media:\/\//, "");
  if (!id) throw Object.assign(new Error("Referensi gambar tidak valid."), { code: "IMAGE_REF_INVALID" });
  if (!firebaseToken) throw Object.assign(new Error("Firebase session tidak tersedia."), { code: "FIREBASE_TOKEN_MISSING" });
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/ecomic_media/${encodeURIComponent(id)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${firebaseToken}` }, signal: controller.signal });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data?.error?.message || `Firestore HTTP ${r.status}`), { code: "FIRESTORE_MEDIA_FETCH_FAILED", status: r.status });
    const dataUrl = data?.fields?.dataUrl?.stringValue || "";
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) throw Object.assign(new Error("Media Firestore bukan gambar yang valid."), { code: "IMAGE_DATA_INVALID" });
    return parsed;
  } catch (e) {
    if (e?.name === "AbortError") throw Object.assign(new Error("Mengambil gambar panel timeout."), { code: "IMAGE_FETCH_TIMEOUT" });
    throw e;
  } finally { clearTimeout(timer); }
}

async function callGemini({ image, question }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw Object.assign(new Error("GEMINI_API_KEY belum dikonfigurasi."), { code: "AI_NOT_CONFIGURED" });
  const prompt = [
    "Kamu sedang melihat SATU gambar panel E-Comic yang sedang dibaca siswa.",
    "Amati gambar secara langsung dan gunakan gambar sebagai sumber utama.",
    "Jawab hanya berdasarkan hal yang benar-benar terlihat: tulisan, dialog, tokoh, benda, angka, simbol, diagram, dan situasi.",
    "Jangan memaksakan konsep dari metadata yang tidak terlihat di gambar.",
    "Jika panel adalah pembuka cerita, jelaskan sebagai pembuka cerita.",
    "Jawab Bahasa Indonesia, santai, jelas, dan sesuai siswa SMA.",
    "Pertanyaan siswa:",
    String(question || "Apa yang kamu lihat pada gambar ini?").slice(0, 2000)
  ].join("\n\n");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ inline_data: { mime_type: image.mime, data: image.data } }, { text: prompt }] }], generationConfig: { maxOutputTokens: 700 } }),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data?.error?.message || `Gemini HTTP ${response.status}`), { code: "GEMINI_HTTP_ERROR", status: response.status });
    const text = (data?.candidates || []).flatMap(c => c?.content?.parts || []).map(p => typeof p?.text === "string" ? p.text : "").filter(Boolean).join("\n").trim();
    if (!text) throw Object.assign(new Error("Gemini tidak mengembalikan teks."), { code: "GEMINI_EMPTY", finishReason: data?.candidates?.[0]?.finishReason || null, blockReason: data?.promptFeedback?.blockReason || null });
    return { reply: text, meta: { model: MODEL, imageAttached: true, imageBytes: image.bytes, finishReason: data?.candidates?.[0]?.finishReason || null } };
  } catch (e) {
    if (e?.name === "AbortError") throw Object.assign(new Error("Gemini vision timeout."), { code: "GEMINI_TIMEOUT" });
    throw e;
  } finally { clearTimeout(timer); }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  let body = {};
  try { body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); } catch { return json(res, 400, { error: "Invalid JSON body" }); }
  try {
    let image;
    if (body.imageRef && String(body.imageRef).startsWith("cloud-media://")) {
      image = await getCloudMedia(body.imageRef, req.headers.authorization?.replace(/^Bearer\s+/i, ""));
    } else {
      // Legacy/data-url fallback for existing local media.
      image = parseDataUrl(body.imageData);
    }
    if (!image) return json(res, 400, { error: "Gambar panel tidak diterima.", code: "IMAGE_MISSING" });
    const result = await callGemini({ image, question: body.question });
    return json(res, 200, { ...result, ai: true });
  } catch (error) {
    console.error("PANEL_AI_ERROR", { code: error?.code || "UNKNOWN", status: error?.status || null, finishReason: error?.finishReason || null, blockReason: error?.blockReason || null, message: error?.message || "unknown" });
    return json(res, Number(error?.status) >= 400 && Number(error?.status) < 500 ? error.status : 502, { error: "AI belum dapat membaca panel ini.", code: error?.code || "PANEL_AI_FAILED", providerStatus: error?.status || null });
  }
}
