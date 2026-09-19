# AI FINAL FIX

This patch changes the Reader Tutor architecture:

- Every Reader question goes through the normal Tutor endpoint.
- The current panel image is attached when available.
- Failure to retrieve/attach the image no longer blocks the student's question.
- Questions such as “apa yang kamu ketahui tentang eksponensial?” are answered as normal concept questions even if image retrieval fails.
- Tutor defaults to Gemini 2.5 Flash unless `GEMINI_TUTOR_MODEL` is explicitly set.
- The Reader quick action asks for panel + concept explanation instead of forcing an image-only question.

Environment:
- GEMINI_API_KEY: existing key
- Optional GEMINI_TUTOR_MODEL: gemini-2.5-flash

No Firebase Storage change is required.
