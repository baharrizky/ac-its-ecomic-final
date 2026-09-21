# AI FINAL SETUP — Gemini + GPT failover

AC-ITS E-Comic now supports **multi-provider AI failover**.

## Vercel Environment Variables

Keep the existing Gemini variables:

```text
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODEL=gemini-3.7-flash
GEMINI_TUTOR_MODEL=gemini-3.8-flash
```

Add the OpenAI key:

```text
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-terra
```

`OPENAI_API_KEY` is server-side only. Do **not** use `VITE_OPENAI_API_KEY`.

## Runtime behavior

1. Gemini is the primary provider when `AI_PROVIDER=gemini`.
2. If Gemini is unavailable, times out, is rate-limited, or returns a provider error, the same request is attempted with GPT.
3. If generated content is malformed, the application performs a strict second generation attempt and the second provider also gets a chance.
4. Practice questions after the teacher's starting question are **AI-generated only**. The question bank is not used as a fallback.
5. If both providers fail, the endpoint returns a visible AI-generation failure instead of silently showing a teacher question as if it were AI-generated.
6. Tutor, hint, answer evaluation, adaptive question generation, class analysis, and teacher recommendations all use the same provider failover layer.

The frontend does not need an OpenAI SDK. The server calls the OpenAI Responses API directly, so the secret remains on Vercel.
