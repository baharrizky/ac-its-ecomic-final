export function canonicalRombel(grade, rombel) {
  const g = String(grade || "").trim();
  const raw = String(rombel ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return g ? `${g} 1` : "1";
  const prefix = g ? `${g} ` : "";
  if (g && raw.toUpperCase() === `${g}`.toUpperCase()) return `${g} 1`;
  if (g && raw.toUpperCase().startsWith(prefix.toUpperCase())) {
    const suffix = raw.slice(prefix.length).trim();
    return suffix ? `${g} ${suffix}` : `${g} 1`;
  }
  if (/^\d+$/.test(raw) && g) return `${g} ${raw}`;
  return raw;
}

export function classLabel(grade, rombel) {
  const value = canonicalRombel(grade, rombel);
  if (value && /^\d+$/.test(String(value))) return `${grade || ""} ${value}`.trim();
  return value || (grade || "-");
}
