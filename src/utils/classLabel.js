export function canonicalRombel(grade, rombel) {
  const g = String(grade || "").trim().replace(/\s+/g, " ");
  let raw = String(rombel ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return g ? `${g} 1` : "1";

  // Clean legacy values such as "X X 1", "X X1", "X-1", and "X1".
  // The canonical value is always "<grade> <number>" for numbered rombel.
  if (g) {
    const escaped = g.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const repeated = new RegExp(`^(?:${escaped}\\s*)+(.+)$`, "i");
    const repeatedMatch = raw.match(repeated);
    if (repeatedMatch) raw = repeatedMatch[1].trim();

    const compact = new RegExp(`^${escaped}\\s*[-.]?\\s*(\\d+)$`, "i");
    const compactMatch = raw.match(compact);
    if (compactMatch) return `${g} ${compactMatch[1]}`;

    if (raw.toUpperCase() === g.toUpperCase()) return `${g} 1`;
    if (raw.toUpperCase().startsWith(`${g} `.toUpperCase())) {
      const suffix = raw.slice(g.length).trim().replace(/^[-.]\s*/, "");
      if (/^\d+$/.test(suffix)) return `${g} ${suffix}`;
      raw = suffix || "1";
    }
    if (/^\d+$/.test(raw)) return `${g} ${raw}`;
  }

  return raw;
}

export function classLabel(grade, rombel) {
  return canonicalRombel(grade, rombel) || (grade || "-");
}
