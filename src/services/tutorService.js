export async function getTutorReply({ message, context, history }) {
  const endpoint = import.meta.env.VITE_AI_TUTOR_ENDPOINT;

  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context, history })
      });
      if (!response.ok) throw new Error("AI endpoint error");
      return await response.json();
    } catch {
      // Fall through to demo tutor.
    }
  }

  const concept = context.conceptName || context.conceptId || "konsep yang sedang dipelajari";
  const comic = context.comicTitle || "comic ini";
  const lower = message.toLowerCase();

  let reply = `Kita sedang membahas ${concept} pada "${comic}". `;
  if (lower.includes("2³") || lower.includes("pangkat")) {
    reply += "Ingat, pangkat menunjukkan berapa kali basis dikalikan dengan dirinya sendiri. Coba hubungkan kembali dengan panel comic yang sedang kamu baca.";
  } else if (lower.includes("salah") || lower.includes("mengapa")) {
    reply += "Mari kita pecah langkahnya. Tunjukkan bagian perhitungan yang menurutmu paling membingungkan, lalu kita periksa satu per satu tanpa langsung melompat ke jawaban.";
  } else {
    reply += "Coba jelaskan dengan kata-katamu sendiri apa yang kamu pahami dari panel tersebut. Dari situ saya bisa membantu menemukan bagian yang perlu diperkuat.";
  }

  return { reply, demo: true };
}
