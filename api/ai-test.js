const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash";
const timeoutMs = Math.max(5000, Number(process.env.AI_TIMEOUT_MS || 20000));

async function testModel(key, selectedModel) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method:"POST",
      headers:{"Content-Type":"application/json","x-goog-api-key":key},
      body:JSON.stringify({contents:[{role:"user",parts:[{text:"Reply with exactly: AI E-Comic OK"}]}],generationConfig:{maxOutputTokens:80,temperature:0}}),
      signal:controller.signal
    });
    const data = await response.json().catch(()=>({}));
    return {response,data,latencyMs:Date.now()-started};
  } catch(error) {
    return {response:null,data:{error:{message:error?.message||"Network error"}},latencyMs:Date.now()-started,code:error?.name==="AbortError"?"AI_TIMEOUT":"AI_NETWORK_ERROR"};
  } finally { clearTimeout(timer); }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ok:false,error:"Method not allowed"});
  const key=process.env.GEMINI_API_KEY;
  if(!key) return res.status(503).json({ok:false,configured:false,error:"GEMINI_API_KEY belum dikonfigurasi."});
  let result=await testModel(key,model);
  let usedModel=model;
  if(result.response?.status===404 && fallbackModel!==model){result=await testModel(key,fallbackModel);usedModel=fallbackModel;}
  const status=result.response?.status||502;
  const text=(result.data?.candidates||[]).flatMap(c=>c?.content?.parts||[]).map(p=>p?.text||"").join(" ").trim();
  if(!result.response?.ok) return res.status(502).json({ok:false,configured:true,provider:"gemini",model:usedModel,primaryModel:model,fallbackUsed:usedModel!==model,status,message:result.data?.error?.message||"Gemini request failed",code:result.code||null,latencyMs:result.latencyMs});
  return res.status(200).json({ok:Boolean(text),configured:true,provider:"gemini",model:usedModel,primaryModel:model,fallbackUsed:usedModel!==model,status,latencyMs:result.latencyMs,response:text,finishReason:result.data?.candidates?.[0]?.finishReason||null,usage:result.data?.usageMetadata||null});
}
