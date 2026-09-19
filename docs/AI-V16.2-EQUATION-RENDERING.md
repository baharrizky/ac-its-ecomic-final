# AI v16.2 — Human-readable mathematical responses

- AI Tutor is instructed not to expose raw LaTeX syntax in student-facing responses.
- The UI renders common math delimiters (`$$...$$`, `$...$`, `\\(...\\)`, `\\[...\\]`) with KaTeX so existing model output remains readable.
- Bold markdown is rendered as normal emphasis.
- Stored teacher equations continue to use KaTeX rendering in reader, practice, and exam views.
- This change does not expose or modify the Gemini API key.
