import React, { useEffect, useState } from "react";
import { getLocalMedia } from "../../services/mediaService";

const cache = new Map();
const pending = new Map();

async function resolve(src) {
  if (!src) return null;
  if (!src.startsWith("local-media://") && !src.startsWith("cloud-media://")) return src;
  if (cache.has(src)) return cache.get(src);
  if (pending.has(src)) return pending.get(src);
  const promise = getLocalMedia(src).then((value) => {
    if (!value) return null;
    const resolved = typeof value === "string" ? value : URL.createObjectURL(value);
    cache.set(src, resolved);
    return resolved;
  });
  pending.set(src, promise);
  try { return await promise; }
  finally { pending.delete(src); }
}

export default function MediaImage({ src, alt = "", className = "", style, fallback = null, loadingFallback = null }) {
  const [resolved, setResolved] = useState(() => cache.get(src) || (src && !src.startsWith("local-media://") && !src.startsWith("cloud-media://") ? src : ""));
  const [loading, setLoading] = useState(Boolean(src && (src.startsWith("local-media://") || src.startsWith("cloud-media://")) && !cache.has(src)));

  useEffect(() => {
    let alive = true;
    if (!src) { setResolved(""); setLoading(false); return () => {}; }
    const direct = !src.startsWith("local-media://") && !src.startsWith("cloud-media://");
    if (direct) { setResolved(src); setLoading(false); return () => {}; }
    setLoading(true);
    resolve(src).then(value => {
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
  if (loading) return loadingFallback || <div className="reader-art-fallback"><span>Memuat gambar…</span></div>;
  return fallback;
}
