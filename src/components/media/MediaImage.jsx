import React, { useEffect, useState } from "react";
import { getLocalMedia } from "../../services/mediaService";

export default function MediaImage({ src, alt = "", className = "", style, fallback = null }) {
  const [resolved, setResolved] = useState("");

  useEffect(() => {
    let alive = true;
    let objectUrl = "";

    if (!src) {
      setResolved("");
      return () => {};
    }

    if (!src.startsWith("local-media://")) {
      setResolved(src);
      return () => {};
    }

    getLocalMedia(src)
      .then((blob) => {
        if (!alive || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setResolved(objectUrl);
      })
      .catch(() => alive && setResolved(""));

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!resolved) return fallback;
  return <img src={resolved} alt={alt} className={className} style={style} />;
}
