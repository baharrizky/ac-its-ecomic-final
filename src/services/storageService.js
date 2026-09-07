const KEY = "ac-its-ecomic-state-v1";

export function loadState(fallback) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw);
    return { ...fallback, ...saved };
  } catch {
    return fallback;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}
