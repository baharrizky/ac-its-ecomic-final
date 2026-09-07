// Contoh endpoint serverless. Sesuaikan dengan provider/deployment.
// Frontend dapat diarahkan ke endpoint ini melalui VITE_AI_TUTOR_ENDPOINT.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message = "", context = {} } = req.body || {};
  const concept = context.conceptName || context.conceptId || "konsep";
  return res.status(200).json({
    reply: `Demo server response: kita sedang membahas ${concept}. Pertanyaanmu: "${message}".`
  });
}
