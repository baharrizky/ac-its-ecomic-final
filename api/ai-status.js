function json(res, status, payload) {
  return res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  const model = provider === "gemini"
    ? ("gemini-2.5-flash")
    : (process.env.OPENAI_MODEL || "");
  const configured = provider === "gemini"
    ? Boolean(process.env.GEMINI_API_KEY)
    : Boolean(process.env.OPENAI_API_KEY);

  return json(res, 200, {
    configured,
    provider,
    model,
    environment: process.env.VERCEL ? "vercel" : "server",
    retries: Math.min(5, Math.max(0, Number(process.env.AI_MAX_RETRIES || 2))),
    timeoutMs: Math.max(3000, Number(process.env.AI_TIMEOUT_MS || 15000)),
    projectLabel: "ecomic-its"
  });
}
