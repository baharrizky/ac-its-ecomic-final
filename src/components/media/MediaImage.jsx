import React, { useEffect, useState } from "react";
import { getLocalMedia } from "../../services/mediaService";

const resolvedCache = new Map();
const pendingCache = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveMediaWithRetry(src, attempts = 6) {
  if (!src) return null;
  if (!src.startsWith("local-media://") && !src.startsWith("cloud-media://")) return src;

  if (resolvedCache.has(src)) return resolvedCache.get(src);
  if (pendingCache.has(src)) return pendingCache.get(src);

  const promise = (async () => {
    let lastValue = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        lastValue = await getLocalMedia(src);
        if (lastValue) {
          const resolved = typeof lastValue === "string" ? lastValue : URL.createObjectURL(lastValue);
          resolvedCache.set(src, resolved);
          return resolved;
        }
      } catch (error) {
        // Keep retrying because Firebase auth can finish initializing shortly
        // after the reader itself has already rendered.
        if (import.meta.env?.DEV) console.debug("Media resolve retry", attempt + 1, error);
      }
      await sleep(250 * Math.min(attempt + 1, 4));
    }
    return lastValue;
  })();

  pendingCache.set(src, promise);
  try {
    return await promise;
  } finally {
    pendingCache.delete(src);
  }
}

export default function MediaImage({ src, alt = "", className = "", style, fallback = null, loadingFallback = null }) {
  const [resolved, setResolved] = useState(() => resolvedCache.get(src) || "");
  const [loading, setLoading] = useState(Boolean(src && !resolvedCache.has(src)));

  useEffect(() => {
    let alive = true;
    setLoading(Boolean(src && !resolvedCache.has(src)));
    setResolved(resolvedCache.get(src) || "");

    if (!src) {
      setLoading(false);
      return () => {};
    }

    resolveMediaWithRetry(src).then((value) => {
      if (!alive) return;
      setResolved(value || "");
      setLoading(false);
    }).catch(() => {
      if (!alive) return;
      setResolved("");
      setLoading(false);
    });

    return () => { alive = false; };
  }, [src]);

  if (resolved) return <img src={resolved} alt={alt} className={className} style={style} />;
  if (loading) return loadingFallback || <div className="reader-art-fallback"><span>Memuat komik...</span></div>;
  return fallback;
}
