import React, { useEffect, useState } from "react";
import { getLocalMedia } from "../../services/mediaService";

export default function MediaImage({ src, alt = "", className = "", style, fallback = null }) {
  const [resolved, setResolved] = useState("");

  useEffect(() => {
    let alive = true;
    let objectUrl = "";
    setResolved("");
    if (!src) return () => {};

    if (!src.startsWith("local-media://") && !src.startsWith("cloud-media://")) {
      setResolved(src);
      return () => {};
    }

    getLocalMedia(src).then((value) => {
      if (!alive || !value) return;
      if (typeof value === "string") setResolved(value);
      else {
        objectUrl = URL.createObjectURL(value);
        setResolved(objectUrl);
      }
    }).catch(() => alive && setResolved(""));

    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src]);

  if (!resolved) return fallback;
  return <img src={resolved} alt={alt} className={className} style={style} />;
}
