# AI v16.1 — Multimodal Comic Context

- Tutor can receive the current panel image through `context.imageUrl`.
- Server fetches Firebase Storage images and sends them to Gemini as inline image data.
- Text context remains available as the primary structured learning context.
- If an image cannot be fetched, Tutor gracefully falls back to text-only context.
- Tutor prompt explicitly distinguishes visible image content from supplied narration/dialogue and avoids inventing visual details.

## v16.2 addition
Student-facing AI responses now render mathematical expressions instead of showing raw LaTeX syntax.
